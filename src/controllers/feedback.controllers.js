import { Feedback } from "../models/feedback.models.js";
import { User } from "../models/user.models.js";
import { Session } from "../models/session.model.js";
import { Therapist } from "../models/therapist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Helper function to update therapist's average rating
 */
const updateTherapistAverageRating = async (therapistUserId) => {
  try {
    // Find the therapist profile
    const therapistProfile = await Therapist.findOne({ userId: therapistUserId });
    if (!therapistProfile) {
      console.log(`Therapist profile not found for user ${therapistUserId}`);
      return;
    }

    // Calculate average from all patient-to-therapist feedbacks
    const feedbacks = await Feedback.find({
      toUser: therapistUserId,
      feedbackType: "patient-to-therapist",
      isVisible: true,
    });

    if (feedbacks.length === 0) {
      therapistProfile.averageRating = 0;
    } else {
      const totalRating = feedbacks.reduce((sum, f) => sum + f.overallRating, 0);
      therapistProfile.averageRating = parseFloat((totalRating / feedbacks.length).toFixed(2));
    }

    await therapistProfile.save();
    console.log(`Updated average rating for therapist ${therapistUserId}: ${therapistProfile.averageRating}`);
  } catch (error) {
    console.error(`Error updating therapist average rating:`, error);
  }
};

/**
 * Create feedback
 * @route POST /api/v1/feedbacks
 * @access Private (Patient, Therapist, or Supervisor based on feedback type)
 */
const createFeedback = asyncHandler(async (req, res) => {
  const {
    feedbackType,
    toUserId,
    sessionId,
    overallRating,
    categoryRatings,
    comment,
    strengths,
    areasForImprovement,
    recommendations,
    isAnonymous,
    reviewPeriod,
  } = req.body;

  // Validation
  if (!feedbackType || !toUserId || !overallRating) {
    throw new ApiError(400, "Feedback type, recipient, and overall rating are required");
  }

  // Verify recipient exists
  const recipient = await User.findById(toUserId);
  if (!recipient) {
    throw new ApiError(404, "Recipient user not found");
  }

  // Type-specific validations
  switch (feedbackType) {
    case "patient-to-therapist":
      // Only patients can give this feedback
      if (req.user.role !== "patient") {
        throw new ApiError(403, "Only patients can provide therapist feedback");
      }
      // Recipient must be a therapist
      if (recipient.role !== "therapist") {
        throw new ApiError(400, "Recipient must be a therapist");
      }
      // Session is required
      if (!sessionId) {
        throw new ApiError(400, "Session ID is required for patient-to-therapist feedback");
      }
      // Verify session exists and involves both users
      const patientSession = await Session.findOne({
        _id: sessionId,
        patientId: req.user._id,
        therapistId: toUserId,
        status: "completed",
      });
      if (!patientSession) {
        throw new ApiError(404, "Completed session not found or you are not part of this session");
      }
      // Check if feedback already exists for this session
      const existingPatientFeedback = await Feedback.findOne({
        sessionId,
        fromUser: req.user._id,
        feedbackType: "patient-to-therapist",
      });
      if (existingPatientFeedback) {
        throw new ApiError(409, "Feedback already exists for this session");
      }
      break;

    case "therapist-to-patient":
      // Only therapists can give this feedback
      if (req.user.role !== "therapist") {
        throw new ApiError(403, "Only therapists can provide patient feedback");
      }
      // Recipient must be a patient
      if (recipient.role !== "patient") {
        throw new ApiError(400, "Recipient must be a patient");
      }
      // Session is required
      if (!sessionId) {
        throw new ApiError(400, "Session ID is required for therapist-to-patient feedback");
      }
      // Verify session exists and involves both users
      const therapistSession = await Session.findOne({
        _id: sessionId,
        therapistId: req.user._id,
        patientId: toUserId,
        status: "completed",
      });
      if (!therapistSession) {
        throw new ApiError(404, "Completed session not found or you are not part of this session");
      }
      break;

    case "supervisor-to-therapist":
      // Only supervisors can give this feedback
      if (req.user.role !== "supervisor") {
        throw new ApiError(403, "Only supervisors can provide therapist performance feedback");
      }
      // Recipient must be a therapist
      if (recipient.role !== "therapist") {
        throw new ApiError(400, "Recipient must be a therapist");
      }
      // Session is optional for supervisor feedback
      if (sessionId) {
        const supervisorSession = await Session.findById(sessionId);
        if (!supervisorSession || supervisorSession.therapistId.toString() !== toUserId) {
          throw new ApiError(404, "Session not found or does not belong to the therapist");
        }
      }
      break;

    default:
      throw new ApiError(400, "Invalid feedback type");
  }

  // Create feedback
  const feedback = await Feedback.create({
    feedbackType,
    fromUser: req.user._id,
    toUser: toUserId,
    sessionId: sessionId || null,
    overallRating,
    categoryRatings: categoryRatings || {},
    comment: comment || null,
    strengths: strengths || [],
    areasForImprovement: areasForImprovement || [],
    recommendations: recommendations || null,
    isAnonymous: isAnonymous || false,
    reviewPeriod: reviewPeriod || null,
  });

  const createdFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  // Update therapist's average rating if this is patient-to-therapist feedback
  if (feedbackType === "patient-to-therapist") {
    await updateTherapistAverageRating(toUserId);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdFeedback, "Feedback created successfully"));
});

/**
 * Get feedback by ID
 * @route GET /api/v1/feedbacks/:id
 * @access Private (Feedback giver, receiver, or admin)
 */
const getFeedbackById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feedback = await Feedback.findById(id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  // Authorization: Only the giver, receiver, or admin can view
  const isAuthorized =
    req.user._id.toString() === feedback.fromUser._id.toString() ||
    req.user._id.toString() === feedback.toUser._id.toString() ||
    req.user.role === "admin";

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to view this feedback");
  }

  // Hide sender info if anonymous (unless viewer is admin or the sender)
  if (
    feedback.isAnonymous &&
    req.user._id.toString() !== feedback.fromUser._id.toString() &&
    req.user.role !== "admin"
  ) {
    feedback.fromUser = {
      fullName: "Anonymous",
      email: "anonymous@example.com",
      role: feedback.fromUser.role,
    };
  }

  return res
    .status(200)
    .json(new ApiResponse(200, feedback, "Feedback retrieved successfully"));
});

/**
 * Get all feedbacks with filters
 * @route GET /api/v1/feedbacks
 * @access Private
 */
const getAllFeedbacks = asyncHandler(async (req, res) => {
  const {
    feedbackType,
    fromUserId,
    toUserId,
    sessionId,
    minRating,
    maxRating,
    isVisible,
    isFlagged,
    startDate,
    endDate,
    sortBy = "-createdAt",
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  // Role-based filtering
  if (req.user.role === "patient") {
    // Patients can only see their own given/received feedback
    filter.$or = [{ fromUser: req.user._id }, { toUser: req.user._id }];
  } else if (req.user.role === "therapist") {
    // Therapists can see feedback they gave or received
    filter.$or = [{ fromUser: req.user._id }, { toUser: req.user._id }];
  } else if (req.user.role === "supervisor") {
    // Supervisors can see feedback they gave or all therapist feedback
    filter.$or = [
      { fromUser: req.user._id },
      { feedbackType: { $in: ["patient-to-therapist", "therapist-to-patient"] } },
    ];
  }
  // Admin can see all feedback (no additional filter)

  // Apply query filters
  if (feedbackType) {
    filter.feedbackType = feedbackType;
  }
  if (fromUserId && req.user.role === "admin") {
    filter.fromUser = fromUserId;
  }
  if (toUserId && req.user.role === "admin") {
    filter.toUser = toUserId;
  }
  if (sessionId) {
    filter.sessionId = sessionId;
  }
  if (minRating || maxRating) {
    filter.overallRating = {};
    if (minRating) filter.overallRating.$gte = parseInt(minRating);
    if (maxRating) filter.overallRating.$lte = parseInt(maxRating);
  }
  if (isVisible !== undefined) {
    filter.isVisible = isVisible === "true";
  }
  if (isFlagged !== undefined) {
    filter.isFlagged = isFlagged === "true";
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const feedbacks = await Feedback.find(filter)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status")
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit));

  const totalFeedbacks = await Feedback.countDocuments(filter);

  // Hide sender info for anonymous feedback
  const processedFeedbacks = feedbacks.map((feedback) => {
    if (
      feedback.isAnonymous &&
      req.user._id.toString() !== feedback.fromUser._id.toString() &&
      req.user.role !== "admin"
    ) {
      const feedbackObj = feedback.toObject();
      feedbackObj.fromUser = {
        fullName: "Anonymous",
        email: "anonymous@example.com",
        role: feedback.fromUser.role,
      };
      return feedbackObj;
    }
    return feedback;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        feedbacks: processedFeedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedbacks / parseInt(limit)),
          totalFeedbacks,
          limit: parseInt(limit),
        },
      },
      "Feedbacks retrieved successfully"
    )
  );
});

/**
 * Update feedback
 * @route PUT /api/v1/feedbacks/:id
 * @access Private (Feedback creator only)
 */
const updateFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    overallRating,
    categoryRatings,
    comment,
    strengths,
    areasForImprovement,
    recommendations,
    isVisible,
  } = req.body;

  const feedback = await Feedback.findById(id);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  // Only the creator can update their feedback
  if (req.user._id.toString() !== feedback.fromUser.toString()) {
    throw new ApiError(403, "You can only update your own feedback");
  }

  // Update fields if provided
  if (overallRating !== undefined) {
    if (overallRating < 1 || overallRating > 5) {
      throw new ApiError(400, "Overall rating must be between 1 and 5");
    }
    feedback.overallRating = overallRating;
  }

  if (categoryRatings) {
    feedback.categoryRatings = { ...feedback.categoryRatings, ...categoryRatings };
  }

  if (comment !== undefined) {
    feedback.comment = comment;
  }

  if (strengths) {
    feedback.strengths = strengths;
  }

  if (areasForImprovement) {
    feedback.areasForImprovement = areasForImprovement;
  }

  if (recommendations !== undefined) {
    feedback.recommendations = recommendations;
  }

  if (isVisible !== undefined) {
    feedback.isVisible = isVisible;
  }

  await feedback.save();

  const updatedFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  // Update therapist's average rating if this is patient-to-therapist feedback and rating was changed
  if (feedback.feedbackType === "patient-to-therapist" && overallRating !== undefined) {
    await updateTherapistAverageRating(feedback.toUser);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedFeedback, "Feedback updated successfully"));
});

/**
 * Delete feedback
 * @route DELETE /api/v1/feedbacks/:id
 * @access Private (Feedback creator or admin)
 */
const deleteFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feedback = await Feedback.findById(id);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  // Only creator or admin can delete
  const isAuthorized =
    req.user._id.toString() === feedback.fromUser.toString() ||
    req.user.role === "admin";

  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to delete this feedback");
  }

  await Feedback.findByIdAndDelete(id);

  // Update therapist's average rating if this was patient-to-therapist feedback
  if (feedback.feedbackType === "patient-to-therapist") {
    await updateTherapistAverageRating(feedback.toUser);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Feedback deleted successfully"));
});

/**
 * Add response to feedback
 * @route POST /api/v1/feedbacks/:id/response
 * @access Private (Feedback recipient only)
 */
const addResponseToFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responseText } = req.body;

  if (!responseText) {
    throw new ApiError(400, "Response text is required");
  }

  const feedback = await Feedback.findById(id);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  // Only the recipient can respond
  if (req.user._id.toString() !== feedback.toUser.toString()) {
    throw new ApiError(403, "Only the feedback recipient can respond");
  }

  feedback.response = {
    text: responseText,
    respondedAt: new Date(),
  };

  await feedback.save();

  const updatedFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedFeedback, "Response added successfully"));
});

/**
 * Flag feedback (admin only)
 * @route POST /api/v1/feedbacks/:id/flag
 * @access Private (Admin only)
 */
const flagFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isFlagged } = req.body;

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can flag feedback");
  }

  const feedback = await Feedback.findById(id);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found");
  }

  feedback.isFlagged = isFlagged !== undefined ? isFlagged : true;
  await feedback.save();

  return res
    .status(200)
    .json(new ApiResponse(200, feedback, "Feedback flag status updated"));
});

/**
 * Get feedback statistics for a user
 * @route GET /api/v1/feedbacks/stats/:userId
 * @access Private (User themselves or admin)
 */
const getFeedbackStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Authorization: User can only see their own stats, unless admin
  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    throw new ApiError(403, "You can only view your own feedback statistics");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get received feedback stats
  const receivedFeedbacks = await Feedback.find({
    toUser: userId,
    isVisible: true,
  });

  const totalReceived = receivedFeedbacks.length;
  const averageRating =
    totalReceived > 0
      ? (
          receivedFeedbacks.reduce((sum, f) => sum + f.overallRating, 0) / totalReceived
        ).toFixed(2)
      : 0;

  // Rating distribution
  const ratingDistribution = {
    1: receivedFeedbacks.filter((f) => f.overallRating === 1).length,
    2: receivedFeedbacks.filter((f) => f.overallRating === 2).length,
    3: receivedFeedbacks.filter((f) => f.overallRating === 3).length,
    4: receivedFeedbacks.filter((f) => f.overallRating === 4).length,
    5: receivedFeedbacks.filter((f) => f.overallRating === 5).length,
  };

  // Category averages
  const categoryAverages = {};
  const categoryKeys = [
    "professionalism",
    "communication",
    "effectiveness",
    "empathy",
    "engagement",
    "progress",
    "homework_completion",
    "openness",
    "clinical_skills",
    "documentation",
    "ethical_practice",
    "professional_development",
  ];

  categoryKeys.forEach((key) => {
    const ratings = receivedFeedbacks
      .map((f) => f.categoryRatings[key])
      .filter((r) => r !== null && r !== undefined);
    if (ratings.length > 0) {
      categoryAverages[key] = (
        ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      ).toFixed(2);
    }
  });

  // Feedback by type
  const feedbackByType = {
    "patient-to-therapist": receivedFeedbacks.filter(
      (f) => f.feedbackType === "patient-to-therapist"
    ).length,
    "therapist-to-patient": receivedFeedbacks.filter(
      (f) => f.feedbackType === "therapist-to-patient"
    ).length,
    "supervisor-to-therapist": receivedFeedbacks.filter(
      (f) => f.feedbackType === "supervisor-to-therapist"
    ).length,
  };

  // Recent feedback (last 5)
  const recentFeedback = await Feedback.find({
    toUser: userId,
    isVisible: true,
  })
    .sort("-createdAt")
    .limit(5)
    .populate("fromUser", "fullName role")
    .populate("sessionId", "scheduledAt");

  const stats = {
    userId,
    userName: user.fullName,
    userRole: user.role,
    totalFeedbackReceived: totalReceived,
    averageRating: parseFloat(averageRating),
    ratingDistribution,
    categoryAverages,
    feedbackByType,
    recentFeedback,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Feedback statistics retrieved successfully"));
});

/**
 * Get therapist's average rating (public endpoint for matching)
 * @route GET /api/v1/feedbacks/therapist/:therapistId/rating
 * @access Public
 */
const getTherapistRating = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const therapist = await User.findById(therapistId);
  if (!therapist || therapist.role !== "therapist") {
    throw new ApiError(404, "Therapist not found");
  }

  const feedbacks = await Feedback.find({
    toUser: therapistId,
    feedbackType: "patient-to-therapist",
    isVisible: true,
  });

  const totalFeedbacks = feedbacks.length;
  const averageRating =
    totalFeedbacks > 0
      ? (feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / totalFeedbacks).toFixed(2)
      : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        therapistId,
        totalFeedbacks,
        averageRating: parseFloat(averageRating),
      },
      "Therapist rating retrieved successfully"
    )
  );
});

export {
  createFeedback,
  getFeedbackById,
  getAllFeedbacks,
  updateFeedback,
  deleteFeedback,
  addResponseToFeedback,
  flagFeedback,
  getFeedbackStats,
  getTherapistRating,
};
