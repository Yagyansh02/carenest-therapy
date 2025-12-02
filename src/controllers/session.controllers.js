import { Session } from "../models/session.model.js";
import { User } from "../models/user.models.js";
import { Therapist } from "../models/therapist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create a new session
 * @route POST /api/v1/sessions
 * @access Private (Patient or Therapist)
 */
const createSession = asyncHandler(async (req, res) => {
  const {
    patientId,
    therapistId,
    scheduledAt,
    duration,
    sessionFee,
  } = req.body;

  // Validation
  if (!patientId || !therapistId || !scheduledAt) {
    throw new ApiError(400, "Patient ID, Therapist ID, and scheduled time are required");
  }

  // Verify patient exists and has patient role
  const patient = await User.findById(patientId);
  if (!patient || patient.role !== "patient") {
    throw new ApiError(400, "Invalid patient ID");
  }

  // Verify therapist exists and has therapist role
  const therapist = await User.findById(therapistId);
  if (!therapist || therapist.role !== "therapist") {
    throw new ApiError(400, "Invalid therapist ID");
  }

  // Get therapist profile for session rate
  const therapistProfile = await Therapist.findOne({ userId: therapistId });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  // If user is patient, they can only book for themselves
  if (req.user.role === "patient" && req.user._id.toString() !== patientId) {
    throw new ApiError(403, "Patients can only book sessions for themselves");
  }

  // Verify scheduled time is in the future
  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    throw new ApiError(400, "Scheduled time must be in the future");
  }

  // Check if patient has previous confirmed/completed sessions with this therapist (for free trial)
  const previousSession = await Session.findOne({
    patientId,
    therapistId,
    status: { $in: ["confirmed", "completed"] },
  });

  const isFreeTrial = !previousSession;
  const finalSessionFee = isFreeTrial ? 0 : (sessionFee || therapistProfile.sessionRate);

  // Check for scheduling conflicts (only with confirmed/scheduled sessions)
  const conflictingSession = await Session.findOne({
    therapistId,
    scheduledAt: {
      $gte: new Date(scheduledDate.getTime() - (duration || 60) * 60 * 1000),
      $lte: new Date(scheduledDate.getTime() + (duration || 60) * 60 * 1000),
    },
    status: { $in: ["confirmed", "scheduled", "completed"] },
  });

  if (conflictingSession) {
    throw new ApiError(409, "Therapist has a conflicting session at this time");
  }

  // Create session with pending status (requires therapist approval)
  // Payment is always marked as paid since patient pays before booking
  const session = await Session.create({
    patientId,
    therapistId,
    scheduledAt: scheduledDate,
    duration: duration || 60,
    sessionType: "video",
    sessionFee: finalSessionFee,
    status: "pending",
    paymentStatus: "paid", // Payment done by patient before booking
  });

  const createdSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(201)
    .json(new ApiResponse(201, createdSession, "Session created successfully"));
});

/**
 * Get session by ID
 * @route GET /api/v1/sessions/:id
 * @access Private (Patient, Therapist, or Admin)
 */
const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id)
    .populate("patientId", "fullName email phoneNumber")
    .populate("therapistId", "fullName email phoneNumber")
    .populate("cancelledBy", "fullName email");

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Check authorization - only patient, therapist, or admin can view
  const isAuthorized =
    req.user.role === "admin" ||
    req.user._id.toString() === session.patientId._id.toString() ||
    req.user._id.toString() === session.therapistId._id.toString();

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to view this session");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, session, "Session fetched successfully"));
});

/**
 * Get all sessions with filters and pagination
 * @route GET /api/v1/sessions
 * @access Private (Admin, or filtered by user role)
 */
const getAllSessions = asyncHandler(async (req, res) => {
  const {
    patientId,
    therapistId,
    status,
    paymentStatus,
    startDate,
    endDate,
    sortBy = "-scheduledAt",
    page = 1,
    limit = 10,
  } = req.query;

  // Build filter query
  const filter = {};

  // Role-based filtering
  if (req.user.role === "patient") {
    filter.patientId = req.user._id;
  } else if (req.user.role === "therapist") {
    filter.therapistId = req.user._id;
  } else if (req.user.role !== "admin") {
    throw new ApiError(403, "You are not authorized to view sessions");
  }

  // Apply additional filters
  if (patientId && req.user.role === "admin") {
    filter.patientId = patientId;
  }
  if (therapistId && req.user.role === "admin") {
    filter.therapistId = therapistId;
  }
  if (status) {
    filter.status = status;
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  // Date range filter
  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) {
      filter.scheduledAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.scheduledAt.$lte = new Date(endDate);
    }
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const sessions = await Session.find(filter)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email")
    .populate("cancelledBy", "fullName email")
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalSessions / limitNum),
          totalSessions,
          hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
      "Sessions fetched successfully"
    )
  );
});

/**
 * Get sessions for logged-in patient
 * @route GET /api/v1/sessions/patient/my-sessions
 * @access Private (Patient only)
 */
const getMyPatientSessions = asyncHandler(async (req, res) => {
  const {
    status,
    startDate,
    endDate,
    sortBy = "-scheduledAt",
    page = 1,
    limit = 10,
  } = req.query;

  const filter = { patientId: req.user._id };

  if (status) {
    filter.status = status;
  }

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) {
      filter.scheduledAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.scheduledAt.$lte = new Date(endDate);
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sessions = await Session.find(filter)
    .populate("therapistId", "fullName email")
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  // Populate therapist profile for each session to get specializations
  for (let session of sessions) {
    if (session.therapistId) {
      const therapistProfile = await Therapist.findOne({ userId: session.therapistId._id });
      if (therapistProfile) {
        session.therapistId.therapistProfile = therapistProfile;
      }
    }
  }

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalSessions / limitNum),
          totalSessions,
          hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
      "Patient sessions fetched successfully"
    )
  );
});

/**
 * Get sessions for logged-in therapist
 * @route GET /api/v1/sessions/therapist/my-sessions
 * @access Private (Therapist only)
 */
const getMyTherapistSessions = asyncHandler(async (req, res) => {
  const {
    status,
    startDate,
    endDate,
    sortBy = "-scheduledAt",
    page = 1,
    limit = 10,
  } = req.query;

  const filter = { therapistId: req.user._id };

  if (status) {
    filter.status = status;
  }

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) {
      filter.scheduledAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.scheduledAt.$lte = new Date(endDate);
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sessions = await Session.find(filter)
    .populate("patientId", "fullName email phoneNumber")
    .populate({
      path: 'patientId',
      populate: {
        path: 'assessment',
        select: 'answers'
      }
    })
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalSessions / limitNum),
          totalSessions,
          hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
      "Therapist sessions fetched successfully"
    )
  );
});

/**
 * Update session details
 * @route PUT /api/v1/sessions/:id
 * @access Private (Patient or Therapist who owns the session)
 */
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledAt, duration, meetingLink } = req.body;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Check if session is still scheduled (not completed or cancelled)
  if (session.status !== "scheduled") {
    throw new ApiError(400, "Can only update scheduled sessions");
  }

  // Authorization check
  const isAuthorized =
    req.user._id.toString() === session.patientId.toString() ||
    req.user._id.toString() === session.therapistId.toString();

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to update this session");
  }

  // Update fields if provided
  if (scheduledAt) {
    const newScheduledDate = new Date(scheduledAt);
    if (newScheduledDate <= new Date()) {
      throw new ApiError(400, "Scheduled time must be in the future");
    }

    // Check for conflicts with new time
    const conflictingSession = await Session.findOne({
      _id: { $ne: id },
      therapistId: session.therapistId,
      scheduledAt: {
        $gte: new Date(newScheduledDate.getTime() - (duration || session.duration) * 60 * 1000),
        $lte: new Date(newScheduledDate.getTime() + (duration || session.duration) * 60 * 1000),
      },
      status: { $in: ["scheduled", "completed"] },
    });

    if (conflictingSession) {
      throw new ApiError(409, "Therapist has a conflicting session at this time");
    }

    session.scheduledAt = newScheduledDate;
  }

  if (duration !== undefined) {
    if (duration < 15) {
      throw new ApiError(400, "Session duration must be at least 15 minutes");
    }
    session.duration = duration;
  }

  if (meetingLink !== undefined) {
    session.meetingLink = meetingLink;
  }

  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session updated successfully"));
});

/**
 * Cancel a session
 * @route POST /api/v1/sessions/:id/cancel
 * @access Private (Patient or Therapist who owns the session)
 */
const cancelSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Check if session is already cancelled or completed
  if (session.status === "cancelled") {
    throw new ApiError(400, "Session is already cancelled");
  }

  if (session.status === "completed") {
    throw new ApiError(400, "Cannot cancel a completed session");
  }

  // Authorization check
  const isAuthorized =
    req.user._id.toString() === session.patientId.toString() ||
    req.user._id.toString() === session.therapistId.toString();

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to cancel this session");
  }

  // Update session status
  session.status = "cancelled";
  session.cancellationReason = cancellationReason || "No reason provided";
  session.cancelledBy = req.user._id;

  // Update payment status if it was pending
  if (session.paymentStatus === "pending") {
    session.paymentStatus = "refunded";
  }

  await session.save();

  const cancelledSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email")
    .populate("cancelledBy", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, cancelledSession, "Session cancelled successfully"));
});

/**
 * Mark session as completed
 * @route POST /api/v1/sessions/:id/complete
 * @access Private (Therapist only)
 */
const completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Only therapist can mark session as completed
  if (req.user._id.toString() !== session.therapistId.toString()) {
    throw new ApiError(403, "Only the therapist can mark session as completed");
  }

  // Check if session is scheduled
  if (session.status !== "scheduled") {
    throw new ApiError(400, "Can only complete scheduled sessions");
  }

  // Update session status
  session.status = "completed";

  await session.save();

  const completedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, completedSession, "Session marked as completed"));
});

/**
 * Mark session as no-show
 * @route POST /api/v1/sessions/:id/no-show
 * @access Private (Therapist only)
 */
const markNoShow = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Only therapist can mark session as no-show
  if (req.user._id.toString() !== session.therapistId.toString()) {
    throw new ApiError(403, "Only the therapist can mark session as no-show");
  }

  // Check if session is scheduled
  if (session.status !== "scheduled") {
    throw new ApiError(400, "Can only mark scheduled sessions as no-show");
  }

  // Update session status
  session.status = "no-show";

  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session marked as no-show"));
});

/**
 * Add or update therapist notes
 * @route PUT /api/v1/sessions/:id/notes
 * @access Private (Therapist only)
 */
const addTherapistNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { therapistNotes } = req.body;

  if (!therapistNotes) {
    throw new ApiError(400, "Therapist notes are required");
  }

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Only the assigned therapist can add notes
  if (req.user._id.toString() !== session.therapistId.toString()) {
    throw new ApiError(403, "Only the assigned therapist can add notes");
  }

  // Update therapist notes
  session.therapistNotes = therapistNotes;

  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Therapist notes added successfully"));
});

/**
 * Update payment status
 * @route PUT /api/v1/sessions/:id/payment
 * @access Private (Admin or Patient who owns the session)
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus || !["pending", "paid", "refunded"].includes(paymentStatus)) {
    throw new ApiError(400, "Valid payment status is required (pending, paid, refunded)");
  }

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Authorization check - admin or patient who owns the session
  const isAuthorized =
    req.user.role === "admin" ||
    req.user._id.toString() === session.patientId.toString();

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to update payment status");
  }

  // Update payment status
  session.paymentStatus = paymentStatus;

  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Payment status updated successfully"));
});

/**
 * Delete a session
 * @route DELETE /api/v1/sessions/:id
 * @access Private (Admin only)
 */
const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  await Session.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Session deleted successfully"));
});

/**
 * Get session statistics for therapist
 * @route GET /api/v1/sessions/therapist/statistics
 * @access Private (Therapist only)
 */
const getTherapistStatistics = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;

  const totalSessions = await Session.countDocuments({ therapistId });
  const completedSessions = await Session.countDocuments({
    therapistId,
    status: "completed",
  });
  const cancelledSessions = await Session.countDocuments({
    therapistId,
    status: "cancelled",
  });
  const scheduledSessions = await Session.countDocuments({
    therapistId,
    status: { $in: ["confirmed", "scheduled"] },
  });
  const noShowSessions = await Session.countDocuments({
    therapistId,
    status: "no-show",
  });

  // Calculate total revenue from completed and paid sessions
  const revenueResult = await Session.aggregate([
    {
      $match: {
        therapistId: therapistId,
        status: "completed",
        paymentStatus: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$sessionFee" },
      },
    },
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

  const statistics = {
    totalSessions,
    completedSessions,
    cancelledSessions,
    scheduledSessions,
    noShowSessions,
    totalRevenue,
    completionRate:
      totalSessions > 0
        ? ((completedSessions / totalSessions) * 100).toFixed(2)
        : 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, statistics, "Statistics fetched successfully"));
});

/**
 * Get session statistics for patient
 * @route GET /api/v1/sessions/patient/statistics
 * @access Private (Patient only)
 */
const getPatientStatistics = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const totalSessions = await Session.countDocuments({ patientId });
  const completedSessions = await Session.countDocuments({
    patientId,
    status: "completed",
  });
  const cancelledSessions = await Session.countDocuments({
    patientId,
    status: "cancelled",
  });
  const scheduledSessions = await Session.countDocuments({
    patientId,
    status: { $in: ["confirmed", "scheduled"] },
  });

  // Calculate total spending
  const spendingResult = await Session.aggregate([
    {
      $match: {
        patientId: patientId,
        paymentStatus: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalSpending: { $sum: "$sessionFee" },
      },
    },
  ]);

  const totalSpending = spendingResult.length > 0 ? spendingResult[0].totalSpending : 0;

  const statistics = {
    totalSessions,
    completedSessions,
    cancelledSessions,
    scheduledSessions,
    totalSpending,
    attendanceRate:
      totalSessions > 0
        ? ((completedSessions / totalSessions) * 100).toFixed(2)
        : 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, statistics, "Statistics fetched successfully"));
});

/**
 * Accept session request (Therapist)
 * @route POST /api/v1/sessions/:id/accept
 * @access Private (Therapist only)
 */
const acceptSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { meetingLink, therapistNotes } = req.body;

  // Validate meeting link
  if (!meetingLink || !meetingLink.trim()) {
    throw new ApiError(400, "Meeting link is required to accept session");
  }

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Only therapist can accept their sessions
  if (req.user._id.toString() !== session.therapistId.toString()) {
    throw new ApiError(403, "Only the assigned therapist can accept this session");
  }

  // Check if session is in pending status
  if (session.status !== "pending") {
    throw new ApiError(400, `Cannot accept session with status: ${session.status}`);
  }

  // Update session
  session.status = "confirmed";
  session.meetingLink = meetingLink.trim();
  if (therapistNotes) {
    session.therapistNotes = therapistNotes;
  }

  await session.save();

  const acceptedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, acceptedSession, "Session accepted successfully"));
});

/**
 * Reject session request (Therapist)
 * @route POST /api/v1/sessions/:id/reject
 * @access Private (Therapist only)
 */
const rejectSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const session = await Session.findById(id);

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Only therapist can reject their sessions
  if (req.user._id.toString() !== session.therapistId.toString()) {
    throw new ApiError(403, "Only the assigned therapist can reject this session");
  }

  // Check if session is in pending status
  if (session.status !== "pending") {
    throw new ApiError(400, `Cannot reject session with status: ${session.status}`);
  }

  // Update session
  session.status = "rejected";
  session.cancellationReason = reason || "Therapist rejected the request";
  session.cancelledBy = req.user._id;

  await session.save();

  const rejectedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  return res
    .status(200)
    .json(new ApiResponse(200, rejectedSession, "Session rejected successfully"));
});

/**
 * Get pending sessions for therapist
 * @route GET /api/v1/sessions/therapist/pending
 * @access Private (Therapist only)
 */
const getPendingSessions = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;

  const pendingSessions = await Session.find({
    therapistId,
    status: "pending",
  })
    .populate("patientId", "fullName email phone")
    .sort({ scheduledAt: 1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { sessions: pendingSessions, count: pendingSessions.length },
        "Pending sessions fetched successfully"
      )
    );
});

export {
  createSession,
  getSessionById,
  getAllSessions,
  getMyPatientSessions,
  getMyTherapistSessions,
  updateSession,
  cancelSession,
  completeSession,
  markNoShow,
  addTherapistNotes,
  updatePaymentStatus,
  deleteSession,
  getTherapistStatistics,
  getPatientStatistics,
  acceptSession,
  rejectSession,
  getPendingSessions,
};
