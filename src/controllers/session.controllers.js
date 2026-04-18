import { Session } from "../models/session.model.js";
import { User } from "../models/user.models.js";
import { Therapist } from "../models/therapist.models.js";
import { Supervisor } from "../models/supervisor.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { BUILTIN_VIDEO_MARKER } from "../services/videoService.js";
import { getCache, setCache, deleteCachePattern } from "../db/redis.js";
import mongoose from "mongoose";

/**
 * Helper: Invalidate session-related caches after mutations
 */
const invalidateSessionCaches = async (patientId, therapistId) => {
  await Promise.all([
    deleteCachePattern(`stats:therapist:${therapistId}*`),
    deleteCachePattern(`stats:patient:${patientId}*`),
    deleteCachePattern(`bookedSlots:${therapistId}*`),
  ]);
};

/**
 * Create a new session
 * @route POST /api/v1/sessions
 * @access Private (Patient or Therapist)
 */
const createSession = asyncHandler(async (req, res) => {
  const { patientId, therapistId, scheduledAt, duration, sessionFee } = req.body;

  if (!patientId || !therapistId || !scheduledAt) {
    throw new ApiError(400, "Patient ID, Therapist ID, and scheduled time are required");
  }

  const patient = await User.findById(patientId);
  if (!patient || patient.role !== "patient") {
    throw new ApiError(400, "Invalid patient ID");
  }

  const therapist = await User.findById(therapistId);
  if (!therapist || therapist.role !== "therapist") {
    throw new ApiError(400, "Invalid therapist ID");
  }

  const therapistProfile = await Therapist.findOne({ userId: therapistId });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  if (req.user.role === "patient" && req.user._id.toString() !== patientId) {
    throw new ApiError(403, "Patients can only book sessions for themselves");
  }

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    throw new ApiError(400, "Scheduled time must be in the future");
  }

  const previousSession = await Session.findOne({
    patientId,
    therapistId,
    status: { $in: ["confirmed", "completed"] },
  });

  const isFreeTrial = !previousSession;
  const finalSessionFee = isFreeTrial ? 0 : (sessionFee || therapistProfile.sessionRate);

  const durationMs = (duration || 60) * 60 * 1000;

  const conflictingSession = await Session.findOne({
    therapistId,
    status: { $in: ["pending", "confirmed", "scheduled"] },
    scheduledAt: {
      $gt: new Date(scheduledDate.getTime() - durationMs),
      $lt: new Date(scheduledDate.getTime() + durationMs),
    },
  });

  if (conflictingSession) {
    throw new ApiError(409, "Therapist has a conflicting session at this time");
  }

  const session = await Session.create({
    patientId,
    therapistId,
    scheduledAt: scheduledDate,
    duration: duration || 60,
    sessionType: "video",
    sessionFee: finalSessionFee,
    status: "pending",
    paymentStatus: "paid",
  });

  const createdSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(patientId, therapistId);

  return res
    .status(201)
    .json(new ApiResponse(201, createdSession, "Session created successfully"));
});

/**
 * Get session by ID
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
 */
const getAllSessions = asyncHandler(async (req, res) => {
  const {
    patientId, therapistId, status, paymentStatus,
    startDate, endDate, sortBy = "-scheduledAt",
    page = 1, limit = 10,
  } = req.query;

  const filter = {};

  if (req.user.role === "patient") {
    filter.patientId = req.user._id;
  } else if (req.user.role === "therapist") {
    filter.therapistId = req.user._id;
  } else if (req.user.role === "supervisor") {
    // allowed
  } else if (req.user.role !== "admin") {
    throw new ApiError(403, "You are not authorized to view sessions");
  }

  if (patientId && req.user.role === "admin") filter.patientId = patientId;
  if (therapistId && req.user.role === "admin") filter.therapistId = therapistId;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) filter.scheduledAt.$gte = new Date(startDate);
    if (endDate) filter.scheduledAt.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sessions = await Session.find(filter)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email")
    .populate("cancelledBy", "fullName email")
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      sessions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalSessions / limitNum),
        totalSessions,
        hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
        hasPrevPage: pageNum > 1,
      },
    }, "Sessions fetched successfully")
  );
});

/**
 * Get sessions for logged-in patient
 * OPTIMIZED: Replaced N+1 loop query with a batch lookup
 */
const getMyPatientSessions = asyncHandler(async (req, res) => {
  const {
    status, startDate, endDate,
    sortBy = "-scheduledAt", page = 1, limit = 10,
  } = req.query;

  const filter = { patientId: req.user._id };
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) filter.scheduledAt.$gte = new Date(startDate);
    if (endDate) filter.scheduledAt.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sessions = await Session.find(filter)
    .populate("therapistId", "fullName email")
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // OPTIMIZATION: Batch fetch therapist profiles instead of N+1 loop
  const therapistUserIds = [
    ...new Set(sessions.filter(s => s.therapistId).map(s => s.therapistId._id.toString())),
  ];

  if (therapistUserIds.length > 0) {
    const therapistProfiles = await Therapist.find({
      userId: { $in: therapistUserIds },
    }).lean();

    const profileMap = {};
    therapistProfiles.forEach((tp) => {
      profileMap[tp.userId.toString()] = tp;
    });

    sessions.forEach((session) => {
      if (session.therapistId) {
        session.therapistId.therapistProfile =
          profileMap[session.therapistId._id.toString()] || null;
      }
    });
  }

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      sessions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalSessions / limitNum),
        totalSessions,
        hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
        hasPrevPage: pageNum > 1,
      },
    }, "Patient sessions fetched successfully")
  );
});

/**
 * Get sessions for logged-in therapist
 */
const getMyTherapistSessions = asyncHandler(async (req, res) => {
  const {
    status, startDate, endDate,
    sortBy = "-scheduledAt", page = 1, limit = 10,
  } = req.query;

  const filter = { therapistId: req.user._id };
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) filter.scheduledAt.$gte = new Date(startDate);
    if (endDate) filter.scheduledAt.$lte = new Date(endDate);
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
        select: 'answers',
      },
    })
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const totalSessions = await Session.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      sessions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalSessions / limitNum),
        totalSessions,
        hasNextPage: pageNum < Math.ceil(totalSessions / limitNum),
        hasPrevPage: pageNum > 1,
      },
    }, "Therapist sessions fetched successfully")
  );
});

/**
 * Update session details
 */
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledAt, duration, meetingLink } = req.body;

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");

  if (session.status !== "scheduled") {
    throw new ApiError(400, "Can only update scheduled sessions");
  }

  const isAuthorized =
    req.user._id.toString() === session.patientId.toString() ||
    req.user._id.toString() === session.therapistId.toString();
  if (!isAuthorized) throw new ApiError(403, "You are not authorized to update this session");

  if (scheduledAt) {
    const newScheduledDate = new Date(scheduledAt);
    if (newScheduledDate <= new Date()) throw new ApiError(400, "Scheduled time must be in the future");

    const conflictingSession = await Session.findOne({
      _id: { $ne: id },
      therapistId: session.therapistId,
      scheduledAt: {
        $gte: new Date(newScheduledDate.getTime() - (duration || session.duration) * 60 * 1000),
        $lte: new Date(newScheduledDate.getTime() + (duration || session.duration) * 60 * 1000),
      },
      status: { $in: ["scheduled", "completed"] },
    });

    if (conflictingSession) throw new ApiError(409, "Therapist has a conflicting session at this time");
    session.scheduledAt = newScheduledDate;
  }

  if (duration !== undefined) {
    if (duration < 15) throw new ApiError(400, "Session duration must be at least 15 minutes");
    session.duration = duration;
  }

  if (meetingLink !== undefined) session.meetingLink = meetingLink;

  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session updated successfully"));
});

/**
 * Cancel a session
 */
const cancelSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (session.status === "cancelled") throw new ApiError(400, "Session is already cancelled");
  if (session.status === "completed") throw new ApiError(400, "Cannot cancel a completed session");

  const isAuthorized =
    req.user._id.toString() === session.patientId.toString() ||
    req.user._id.toString() === session.therapistId.toString();
  if (!isAuthorized) throw new ApiError(403, "You are not authorized to cancel this session");

  session.status = "cancelled";
  session.cancellationReason = cancellationReason || "No reason provided";
  session.cancelledBy = req.user._id;
  if (session.paymentStatus === "pending") session.paymentStatus = "refunded";

  await session.save();

  const cancelledSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email")
    .populate("cancelledBy", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, cancelledSession, "Session cancelled successfully"));
});

/**
 * Mark session as completed
 */
const completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user._id.toString() !== session.therapistId.toString())
    throw new ApiError(403, "Only the therapist can mark session as completed");
  if (session.status !== "scheduled")
    throw new ApiError(400, "Can only complete scheduled sessions");

  session.status = "completed";
  await session.save();

  const completedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, completedSession, "Session marked as completed"));
});

/**
 * Mark session as no-show
 */
const markNoShow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user._id.toString() !== session.therapistId.toString())
    throw new ApiError(403, "Only the therapist can mark session as no-show");
  if (session.status !== "scheduled")
    throw new ApiError(400, "Can only mark scheduled sessions as no-show");

  session.status = "no-show";
  await session.save();

  const updatedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session marked as no-show"));
});

/**
 * Add or update therapist notes
 */
const addTherapistNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { therapistNotes } = req.body;
  if (!therapistNotes) throw new ApiError(400, "Therapist notes are required");

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user._id.toString() !== session.therapistId.toString())
    throw new ApiError(403, "Only the assigned therapist can add notes");

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
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus || !["pending", "paid", "refunded"].includes(paymentStatus))
    throw new ApiError(400, "Valid payment status is required (pending, paid, refunded)");

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");

  const isAuthorized =
    req.user.role === "admin" || req.user._id.toString() === session.patientId.toString();
  if (!isAuthorized) throw new ApiError(403, "You are not authorized to update payment status");

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
 */
const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());
  await Session.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Session deleted successfully"));
});

/**
 * Get session statistics for therapist
 * OPTIMIZED: Single $facet aggregation instead of 5 separate countDocuments + 1 aggregate
 */
const getTherapistStatistics = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;

  // Check Redis cache first
  const cacheKey = `stats:therapist:${therapistId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Statistics fetched successfully (cached)"));
  }

  const result = await Session.aggregate([
    { $match: { therapistId: new mongoose.Types.ObjectId(therapistId) } },
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],
        totalRevenue: [
          { $match: { status: "completed", paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$sessionFee" } } },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const facet = result[0];
  const statusMap = {};
  facet.statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

  const totalSessions = facet.totalCount[0]?.count || 0;
  const completedSessions = statusMap["completed"] || 0;

  const statistics = {
    totalSessions,
    completedSessions,
    cancelledSessions: statusMap["cancelled"] || 0,
    scheduledSessions: (statusMap["confirmed"] || 0) + (statusMap["scheduled"] || 0),
    noShowSessions: statusMap["no-show"] || 0,
    totalRevenue: facet.totalRevenue[0]?.total || 0,
    completionRate: totalSessions > 0
      ? ((completedSessions / totalSessions) * 100).toFixed(2)
      : 0,
  };

  // Cache for 5 minutes
  await setCache(cacheKey, statistics, 300);

  return res
    .status(200)
    .json(new ApiResponse(200, statistics, "Statistics fetched successfully"));
});

/**
 * Get session statistics for patient
 * OPTIMIZED: Single $facet aggregation instead of 4 separate countDocuments + 1 aggregate
 */
const getPatientStatistics = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const cacheKey = `stats:patient:${patientId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Statistics fetched successfully (cached)"));
  }

  const result = await Session.aggregate([
    { $match: { patientId: new mongoose.Types.ObjectId(patientId) } },
    {
      $facet: {
        statusCounts: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        totalSpending: [
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$sessionFee" } } },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const facet = result[0];
  const statusMap = {};
  facet.statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

  const totalSessions = facet.totalCount[0]?.count || 0;
  const completedSessions = statusMap["completed"] || 0;

  const statistics = {
    totalSessions,
    completedSessions,
    cancelledSessions: statusMap["cancelled"] || 0,
    scheduledSessions: (statusMap["confirmed"] || 0) + (statusMap["scheduled"] || 0),
    totalSpending: facet.totalSpending[0]?.total || 0,
    attendanceRate: totalSessions > 0
      ? ((completedSessions / totalSessions) * 100).toFixed(2)
      : 0,
  };

  await setCache(cacheKey, statistics, 300);

  return res
    .status(200)
    .json(new ApiResponse(200, statistics, "Statistics fetched successfully"));
});

/**
 * Accept session request (Therapist)
 */
const acceptSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { therapistNotes } = req.body;

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user._id.toString() !== session.therapistId.toString())
    throw new ApiError(403, "Only the assigned therapist can accept this session");
  if (session.status !== "pending")
    throw new ApiError(400, `Cannot accept session with status: ${session.status}`);

  session.status = "confirmed";
  session.meetingLink = BUILTIN_VIDEO_MARKER;
  if (therapistNotes) session.therapistNotes = therapistNotes;
  await session.save();

  const acceptedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, acceptedSession, "Session accepted successfully"));
});

/**
 * Reject session request (Therapist)
 */
const rejectSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user._id.toString() !== session.therapistId.toString())
    throw new ApiError(403, "Only the assigned therapist can reject this session");
  if (session.status !== "pending")
    throw new ApiError(400, `Cannot reject session with status: ${session.status}`);

  session.status = "rejected";
  session.cancellationReason = reason || "Therapist rejected the request";
  session.cancelledBy = req.user._id;
  await session.save();

  const rejectedSession = await Session.findById(session._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  await invalidateSessionCaches(session.patientId.toString(), session.therapistId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, rejectedSession, "Session rejected successfully"));
});

/**
 * Get pending sessions for therapist
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

/**
 * Get booked slots for a specific therapist (cached 1 min)
 */
const getTherapistBookedSlots = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const date = req.query.date ? new Date(req.query.date) : new Date();
  const startDate = new Date(date.setHours(0, 0, 0, 0));

  const cacheKey = `bookedSlots:${therapistId}:${startDate.toISOString().split("T")[0]}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(
      new ApiResponse(200, cached, "Therapist booked slots fetched successfully (cached)")
    );
  }

  const bookedSessions = await Session.find({
    therapistId,
    status: { $in: ["pending", "confirmed", "scheduled"] },
    scheduledAt: { $gte: startDate },
  }).select("scheduledAt duration status");

  const data = { bookedSessions };
  await setCache(cacheKey, data, 60);

  return res.status(200).json(
    new ApiResponse(200, data, "Therapist booked slots fetched successfully")
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
  getTherapistBookedSlots,
};
