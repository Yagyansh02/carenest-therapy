import { Feedback } from "../models/feedback.models.js";
import { User } from "../models/user.models.js";
import { Session } from "../models/session.model.js";
import { Therapist } from "../models/therapist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCache, setCache, deleteCache, deleteCachePattern } from "../db/redis.js";
import mongoose from "mongoose";

/**
 * Helper: Invalidate feedback-related caches
 */
const invalidateFeedbackCaches = async (toUserId) => {
  await Promise.all([
    deleteCache(`feedbackStats:${toUserId}`),
    deleteCache(`therapistRating:${toUserId}`),
  ]);
};

/**
 * Helper function to update therapist's average rating
 */
const updateTherapistAverageRating = async (therapistUserId) => {
  try {
    const therapistProfile = await Therapist.findOne({ userId: therapistUserId });
    if (!therapistProfile) {
      console.log(`Therapist profile not found for user ${therapistUserId}`);
      return;
    }

    // Use aggregation instead of loading all feedbacks into memory
    const result = await Feedback.aggregate([
      {
        $match: {
          toUser: new mongoose.Types.ObjectId(therapistUserId),
          feedbackType: "patient-to-therapist",
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$overallRating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      therapistProfile.averageRating = 0;
    } else {
      therapistProfile.averageRating = parseFloat(result[0].averageRating.toFixed(2));
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
 * @access Private
 */
const createFeedback = asyncHandler(async (req, res) => {
  const {
    feedbackType, toUserId, sessionId, overallRating,
    categoryRatings, comment, strengths, areasForImprovement,
    recommendations, isAnonymous, reviewPeriod,
  } = req.body;

  if (!feedbackType || !toUserId || !overallRating) {
    throw new ApiError(400, "Feedback type, recipient, and overall rating are required");
  }

  const recipient = await User.findById(toUserId);
  if (!recipient) throw new ApiError(404, "Recipient user not found");

  // Type-specific validations
  switch (feedbackType) {
    case "patient-to-therapist": {
      if (req.user.role !== "patient") throw new ApiError(403, "Only patients can provide therapist feedback");
      if (recipient.role !== "therapist") throw new ApiError(400, "Recipient must be a therapist");
      if (!sessionId) throw new ApiError(400, "Session ID is required for patient-to-therapist feedback");
      const patientSession = await Session.findOne({
        _id: sessionId, patientId: req.user._id, therapistId: toUserId, status: "completed",
      });
      if (!patientSession) throw new ApiError(404, "Completed session not found or you are not part of this session");
      const existingPatientFeedback = await Feedback.findOne({
        sessionId, fromUser: req.user._id, feedbackType: "patient-to-therapist",
      });
      if (existingPatientFeedback) throw new ApiError(409, "Feedback already exists for this session");
      break;
    }
    case "therapist-to-patient": {
      if (req.user.role !== "therapist") throw new ApiError(403, "Only therapists can provide patient feedback");
      if (recipient.role !== "patient") throw new ApiError(400, "Recipient must be a patient");
      if (!sessionId) throw new ApiError(400, "Session ID is required for therapist-to-patient feedback");
      const therapistSession = await Session.findOne({
        _id: sessionId, therapistId: req.user._id, patientId: toUserId, status: "completed",
      });
      if (!therapistSession) throw new ApiError(404, "Completed session not found or you are not part of this session");
      break;
    }
    case "supervisor-to-therapist": {
      if (req.user.role !== "supervisor") throw new ApiError(403, "Only supervisors can provide therapist performance feedback");
      if (recipient.role !== "therapist") throw new ApiError(400, "Recipient must be a therapist");
      if (sessionId) {
        const supervisorSession = await Session.findById(sessionId);
        if (!supervisorSession || supervisorSession.therapistId.toString() !== toUserId)
          throw new ApiError(404, "Session not found or does not belong to the therapist");
      }
      break;
    }
    default:
      throw new ApiError(400, "Invalid feedback type");
  }

  const feedback = await Feedback.create({
    feedbackType, fromUser: req.user._id, toUser: toUserId,
    sessionId: sessionId || null, overallRating,
    categoryRatings: categoryRatings || {}, comment: comment || null,
    strengths: strengths || [], areasForImprovement: areasForImprovement || [],
    recommendations: recommendations || null,
    isAnonymous: isAnonymous || false, reviewPeriod: reviewPeriod || null,
  });

  const createdFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  if (feedbackType === "patient-to-therapist") {
    await updateTherapistAverageRating(toUserId);
    await deleteCachePattern("therapists:list:*");
  }

  await invalidateFeedbackCaches(toUserId);

  return res
    .status(201)
    .json(new ApiResponse(201, createdFeedback, "Feedback created successfully"));
});

/**
 * Get feedback by ID
 */
const getFeedbackById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feedback = await Feedback.findById(id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status")
    .lean();

  if (!feedback) throw new ApiError(404, "Feedback not found");

  const isAuthorized =
    req.user._id.toString() === feedback.fromUser._id.toString() ||
    req.user._id.toString() === feedback.toUser._id.toString() ||
    req.user.role === "admin";
  if (!isAuthorized) throw new ApiError(403, "You are not authorized to view this feedback");

  if (
    feedback.isAnonymous &&
    req.user._id.toString() !== feedback.fromUser._id.toString() &&
    req.user.role !== "admin"
  ) {
    feedback.fromUser = { fullName: "Anonymous", email: "anonymous@example.com", role: feedback.fromUser.role };
  }

  return res.status(200).json(new ApiResponse(200, feedback, "Feedback retrieved successfully"));
});

/**
 * Get all feedbacks with filters
 */
const getAllFeedbacks = asyncHandler(async (req, res) => {
  const {
    feedbackType, fromUserId, toUserId, sessionId,
    minRating, maxRating, isVisible, isFlagged,
    startDate, endDate, sortBy = "-createdAt",
    page = 1, limit = 20,
  } = req.query;

  const filter = {};

  if (req.user.role === "patient") {
    filter.$or = [{ fromUser: req.user._id }, { toUser: req.user._id }];
  } else if (req.user.role === "therapist") {
    filter.$or = [{ fromUser: req.user._id }, { toUser: req.user._id }];
  } else if (req.user.role === "supervisor") {
    filter.$or = [
      { fromUser: req.user._id },
      { feedbackType: { $in: ["patient-to-therapist", "therapist-to-patient"] } },
    ];
  }

  if (feedbackType) filter.feedbackType = feedbackType;
  if (fromUserId && req.user.role === "admin") filter.fromUser = fromUserId;
  if (toUserId && req.user.role === "admin") filter.toUser = toUserId;
  if (sessionId) filter.sessionId = sessionId;
  if (minRating || maxRating) {
    filter.overallRating = {};
    if (minRating) filter.overallRating.$gte = parseInt(minRating);
    if (maxRating) filter.overallRating.$lte = parseInt(maxRating);
  }
  if (isVisible !== undefined) filter.isVisible = isVisible === "true";
  if (isFlagged !== undefined) filter.isFlagged = isFlagged === "true";

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const feedbacks = await Feedback.find(filter)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status")
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const totalFeedbacks = await Feedback.countDocuments(filter);

  const processedFeedbacks = feedbacks.map((feedback) => {
    if (
      feedback.isAnonymous &&
      req.user._id.toString() !== feedback.fromUser._id.toString() &&
      req.user.role !== "admin"
    ) {
      const feedbackObj = { ...feedback };
      feedbackObj.fromUser = { fullName: "Anonymous", email: "anonymous@example.com", role: feedback.fromUser.role };
      return feedbackObj;
    }
    return feedback;
  });

  return res.status(200).json(
    new ApiResponse(200, {
      feedbacks: processedFeedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFeedbacks / parseInt(limit)),
        totalFeedbacks,
        limit: parseInt(limit),
      },
    }, "Feedbacks retrieved successfully")
  );
});

/**
 * Update feedback
 */
const updateFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { overallRating, categoryRatings, comment, strengths, areasForImprovement, recommendations, isVisible } = req.body;

  const feedback = await Feedback.findById(id);
  if (!feedback) throw new ApiError(404, "Feedback not found");
  if (req.user._id.toString() !== feedback.fromUser.toString())
    throw new ApiError(403, "You can only update your own feedback");

  if (overallRating !== undefined) {
    if (overallRating < 1 || overallRating > 5) throw new ApiError(400, "Overall rating must be between 1 and 5");
    feedback.overallRating = overallRating;
  }
  if (categoryRatings) feedback.categoryRatings = { ...feedback.categoryRatings, ...categoryRatings };
  if (comment !== undefined) feedback.comment = comment;
  if (strengths) feedback.strengths = strengths;
  if (areasForImprovement) feedback.areasForImprovement = areasForImprovement;
  if (recommendations !== undefined) feedback.recommendations = recommendations;
  if (isVisible !== undefined) feedback.isVisible = isVisible;

  await feedback.save();

  const updatedFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  if (feedback.feedbackType === "patient-to-therapist" && overallRating !== undefined) {
    await updateTherapistAverageRating(feedback.toUser);
    await deleteCachePattern("therapists:list:*");
  }

  await invalidateFeedbackCaches(feedback.toUser.toString());

  return res.status(200).json(new ApiResponse(200, updatedFeedback, "Feedback updated successfully"));
});

/**
 * Delete feedback
 */
const deleteFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const feedback = await Feedback.findById(id);
  if (!feedback) throw new ApiError(404, "Feedback not found");

  const isAuthorized = req.user._id.toString() === feedback.fromUser.toString() || req.user.role === "admin";
  if (!isAuthorized) throw new ApiError(403, "You are not authorized to delete this feedback");

  const toUserId = feedback.toUser.toString();
  const wasPTT = feedback.feedbackType === "patient-to-therapist";

  await Feedback.findByIdAndDelete(id);

  if (wasPTT) {
    await updateTherapistAverageRating(toUserId);
    await deleteCachePattern("therapists:list:*");
  }

  await invalidateFeedbackCaches(toUserId);

  return res.status(200).json(new ApiResponse(200, null, "Feedback deleted successfully"));
});

/**
 * Add response to feedback
 */
const addResponseToFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responseText } = req.body;
  if (!responseText) throw new ApiError(400, "Response text is required");

  const feedback = await Feedback.findById(id);
  if (!feedback) throw new ApiError(404, "Feedback not found");
  if (req.user._id.toString() !== feedback.toUser.toString())
    throw new ApiError(403, "Only the feedback recipient can respond");

  feedback.response = { text: responseText, respondedAt: new Date() };
  await feedback.save();

  const updatedFeedback = await Feedback.findById(feedback._id)
    .populate("fromUser", "fullName email role")
    .populate("toUser", "fullName email role")
    .populate("sessionId", "scheduledAt duration status");

  return res.status(200).json(new ApiResponse(200, updatedFeedback, "Response added successfully"));
});

/**
 * Flag feedback (admin only)
 */
const flagFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isFlagged } = req.body;
  if (req.user.role !== "admin") throw new ApiError(403, "Only admins can flag feedback");

  const feedback = await Feedback.findById(id);
  if (!feedback) throw new ApiError(404, "Feedback not found");

  feedback.isFlagged = isFlagged !== undefined ? isFlagged : true;
  await feedback.save();

  return res.status(200).json(new ApiResponse(200, feedback, "Feedback flag status updated"));
});

/**
 * Get feedback statistics for a user (cached 3 min)
 * OPTIMIZED: Uses MongoDB aggregation instead of loading all docs into JS memory
 */
const getFeedbackStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (req.user._id.toString() !== userId && req.user.role !== "admin") {
    throw new ApiError(403, "You can only view your own feedback statistics");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const cacheKey = `feedbackStats:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Feedback statistics retrieved successfully (cached)"));
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Single aggregation with $facet replaces multiple in-memory filter operations
  const result = await Feedback.aggregate([
    { $match: { toUser: userObjectId, isVisible: true } },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalReceived: { $sum: 1 },
              averageRating: { $avg: "$overallRating" },
            },
          },
        ],
        ratingDistribution: [
          { $group: { _id: "$overallRating", count: { $sum: 1 } } },
        ],
        feedbackByType: [
          { $group: { _id: "$feedbackType", count: { $sum: 1 } } },
        ],
        categoryAverages: [
          {
            $group: {
              _id: null,
              professionalism: { $avg: "$categoryRatings.professionalism" },
              communication: { $avg: "$categoryRatings.communication" },
              effectiveness: { $avg: "$categoryRatings.effectiveness" },
              empathy: { $avg: "$categoryRatings.empathy" },
              engagement: { $avg: "$categoryRatings.engagement" },
              progress: { $avg: "$categoryRatings.progress" },
              homework_completion: { $avg: "$categoryRatings.homework_completion" },
              openness: { $avg: "$categoryRatings.openness" },
              clinical_skills: { $avg: "$categoryRatings.clinical_skills" },
              documentation: { $avg: "$categoryRatings.documentation" },
              ethical_practice: { $avg: "$categoryRatings.ethical_practice" },
              professional_development: { $avg: "$categoryRatings.professional_development" },
            },
          },
        ],
      },
    },
  ]);

  const facet = result[0];
  const overallData = facet.overall[0] || { totalReceived: 0, averageRating: 0 };

  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  facet.ratingDistribution.forEach((r) => { ratingDist[r._id] = r.count; });

  const feedbackByType = {
    "patient-to-therapist": 0, "therapist-to-patient": 0, "supervisor-to-therapist": 0,
  };
  facet.feedbackByType.forEach((f) => { feedbackByType[f._id] = f.count; });

  const categoryAverages = {};
  if (facet.categoryAverages[0]) {
    const cats = facet.categoryAverages[0];
    const categoryKeys = [
      "professionalism", "communication", "effectiveness", "empathy",
      "engagement", "progress", "homework_completion", "openness",
      "clinical_skills", "documentation", "ethical_practice", "professional_development",
    ];
    categoryKeys.forEach((key) => {
      if (cats[key] !== null && cats[key] !== undefined) {
        categoryAverages[key] = parseFloat(cats[key].toFixed(2));
      }
    });
  }

  // Recent feedback — separate lightweight query
  const recentFeedback = await Feedback.find({ toUser: userId, isVisible: true })
    .sort("-createdAt")
    .limit(5)
    .populate("fromUser", "fullName role")
    .populate("sessionId", "scheduledAt");

  const stats = {
    userId,
    userName: user.fullName,
    userRole: user.role,
    totalFeedbackReceived: overallData.totalReceived,
    averageRating: overallData.averageRating ? parseFloat(overallData.averageRating.toFixed(2)) : 0,
    ratingDistribution: ratingDist,
    categoryAverages,
    feedbackByType,
    recentFeedback,
  };

  await setCache(cacheKey, stats, 180);

  return res.status(200).json(new ApiResponse(200, stats, "Feedback statistics retrieved successfully"));
});

/**
 * Get therapist's average rating (cached 5 min)
 * @route GET /api/v1/feedbacks/therapist/:therapistId/rating
 * @access Public
 */
const getTherapistRating = asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const cacheKey = `therapistRating:${therapistId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Therapist rating retrieved successfully (cached)"));
  }

  const therapist = await User.findById(therapistId);
  if (!therapist || therapist.role !== "therapist") throw new ApiError(404, "Therapist not found");

  // Use aggregation instead of loading all feedbacks
  const result = await Feedback.aggregate([
    {
      $match: {
        toUser: new mongoose.Types.ObjectId(therapistId),
        feedbackType: "patient-to-therapist",
        isVisible: true,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$overallRating" },
        totalFeedbacks: { $sum: 1 },
      },
    },
  ]);

  const data = {
    therapistId,
    totalFeedbacks: result[0]?.totalFeedbacks || 0,
    averageRating: result[0] ? parseFloat(result[0].averageRating.toFixed(2)) : 0,
  };

  await setCache(cacheKey, data, 300);

  return res.status(200).json(new ApiResponse(200, data, "Therapist rating retrieved successfully"));
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
