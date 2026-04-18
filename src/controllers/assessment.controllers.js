import { Assessment } from "../models/assessment.models.js";
import { Therapist } from "../models/therapist.models.js";
import { User } from "../models/user.models.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCache, setCache, deleteCache, deleteCachePattern } from "../db/redis.js";
import { hashQuery } from "../middlewares/cache.middleware.js";

/**
 * Submit assessment
 * @route POST /api/v1/assessments
 * @access Private (Patient only)
 */
const submitAssessment = asyncHandler(async (req, res) => {
  const {
    ageGroup, occupation, lifestyle, activityLevel,
    concerns, otherConcern, duration, impactLevel,
  } = req.body;

  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can submit assessments");
  }

  if (!concerns || concerns.length === 0) {
    throw new ApiError(400, "At least one mental health concern is required");
  }

  if (!impactLevel || impactLevel < 1 || impactLevel > 5) {
    throw new ApiError(400, "Impact level must be between 1 and 5");
  }

  const existingAssessment = await Assessment.findOne({ patientId: req.user._id });

  let assessment;
  const answers = {
    ageGroup, occupation, lifestyle, activityLevel,
    concerns, otherConcern: otherConcern || null,
    duration, impactLevel,
  };

  if (existingAssessment) {
    existingAssessment.answers = answers;
    assessment = await existingAssessment.save();
  } else {
    assessment = await Assessment.create({ patientId: req.user._id, answers });
  }

  const populatedAssessment = await Assessment.findById(assessment._id)
    .populate("patientId", "fullName email");

  // Invalidate caches
  await Promise.all([
    deleteCachePattern(`recommendations:${req.user._id}*`),
    deleteCache("stats:assessments"),
  ]);

  return res.status(201).json(
    new ApiResponse(201, populatedAssessment,
      existingAssessment ? "Assessment updated successfully" : "Assessment submitted successfully")
  );
});

/**
 * Get patient's own assessment
 * @route GET /api/v1/assessments/me
 * @access Private (Patient only)
 */
const getMyAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({ patientId: req.user._id })
    .populate("patientId", "fullName email");

  if (!assessment) {
    throw new ApiError(404, "Assessment not found. Please submit an assessment first.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, assessment, "Assessment fetched successfully"));
});

/**
 * Get assessment by patient ID
 * @route GET /api/v1/assessments/:patientId
 * @access Private (Therapist/Admin only)
 */
const getAssessmentByPatientId = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!["therapist", "admin"].includes(req.user.role)) {
    throw new ApiError(403, "Only therapists and admins can view patient assessments");
  }

  if (req.user.role === "therapist") {
    const hasSession = await Session.findOne({
      therapistId: req.user._id,
      patientId: patientId,
    });
    if (!hasSession) {
      throw new ApiError(403, "You can only view assessments of patients you have sessions with");
    }
  }

  const assessment = await Assessment.findOne({ patientId })
    .populate("patientId", "fullName email role");

  if (!assessment) throw new ApiError(404, "Assessment not found for this patient");

  return res
    .status(200)
    .json(new ApiResponse(200, assessment, "Assessment fetched successfully"));
});

/**
 * Get all assessments
 * @route GET /api/v1/assessments
 * @access Private (Admin only)
 */
const getAllAssessments = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can view all assessments");
  }

  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit) > 50 ? 50 : parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const assessments = await Assessment.find()
    .populate("patientId", "fullName email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalAssessments = await Assessment.countDocuments();
  const totalPages = Math.ceil(totalAssessments / limitNum);

  return res.status(200).json(
    new ApiResponse(200, {
      assessments,
      pagination: { currentPage: pageNum, totalPages, totalAssessments, hasMore: pageNum < totalPages },
    }, "Assessments fetched successfully")
  );
});

/**
 * Delete assessment
 */
const deleteAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assessment = await Assessment.findById(id);
  if (!assessment) throw new ApiError(404, "Assessment not found");

  if (req.user.role !== "admin" && assessment.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own assessment");
  }

  await Assessment.findByIdAndDelete(id);

  await Promise.all([
    deleteCachePattern(`recommendations:${assessment.patientId}*`),
    deleteCache("stats:assessments"),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Assessment deleted successfully"));
});

/**
 * Recommendation Algorithm
 */
const calculateTherapistScore = (assessment, therapist) => {
  let score = 0;
  const weights = {
    specialization: 40, experience: 20, rating: 20,
    verification: 10, availability: 10,
  };

  const { concerns, impactLevel, lifestyle } = assessment.answers;

  // 1. SPECIALIZATION MATCHING (40 points)
  if (therapist.specializations && therapist.specializations.length > 0) {
    const concernKeywords = {
      Anxiety: ["anxiety", "stress", "panic", "worry", "cognitive behavioral therapy", "cbt"],
      Depression: ["depression", "mood", "sadness", "bipolar", "major depressive disorder"],
      Overthinking: ["anxiety", "cognitive behavioral therapy", "cbt", "mindfulness"],
      Stress: ["stress", "anxiety", "burnout", "work-life balance"],
      "Low self-esteem": ["self-esteem", "confidence", "self-worth", "identity"],
      "Self-improvement": ["personal growth", "self-improvement", "coaching", "positive psychology"],
      "Anger issues": ["anger management", "emotional regulation", "impulse control"],
      "Grief/loss": ["grief", "loss", "bereavement", "trauma"],
      "Sleep disturbances": ["sleep", "insomnia", "sleep disorders"],
      OCD: ["ocd", "obsessive compulsive", "anxiety", "exposure therapy"],
      "Sexual dysfunction": ["sexual health", "intimacy", "relationships", "sex therapy"],
      "Bipolar disorder": ["bipolar", "mood disorders", "depression", "mania"],
      Addiction: ["addiction", "substance abuse", "recovery", "12-step"],
      "Autism spectrum disorder": ["autism", "asd", "developmental", "neurodevelopmental"],
    };

    let matchCount = 0;
    const totalConcerns = concerns.length;
    const therapistSpecsLower = therapist.specializations.map((s) => s.toLowerCase());

    concerns.forEach((concern) => {
      const keywords = concernKeywords[concern] || [];
      const hasMatch = keywords.some((keyword) =>
        therapistSpecsLower.some((spec) => spec.includes(keyword))
      );
      if (hasMatch) matchCount++;
    });

    const matchPercentage = totalConcerns > 0 ? matchCount / totalConcerns : 0;
    score += matchPercentage * weights.specialization;
    if (matchCount > 1) score += 5;
  }

  // 2. EXPERIENCE SCORE (20 points)
  if (therapist.yearsOfExperience) {
    if (impactLevel >= 4) {
      if (therapist.yearsOfExperience >= 10) score += weights.experience;
      else if (therapist.yearsOfExperience >= 5) score += weights.experience * 0.7;
      else if (therapist.yearsOfExperience >= 2) score += weights.experience * 0.4;
    } else {
      if (therapist.yearsOfExperience >= 5) score += weights.experience;
      else if (therapist.yearsOfExperience >= 2) score += weights.experience * 0.7;
      else if (therapist.yearsOfExperience >= 1) score += weights.experience * 0.4;
    }
  }

  // 3. RATING SCORE (20 points)
  if (therapist.averageRating) {
    score += (therapist.averageRating / 5) * weights.rating;
    if (therapist.averageRating >= 4.5) score += 3;
  }

  // 4. VERIFICATION STATUS (10 points)
  if (therapist.verificationStatus === "verified") score += weights.verification;
  else if (therapist.verificationStatus === "pending") score += weights.verification * 0.5;

  // 5. AVAILABILITY (10 points)
  if (therapist.availability && Object.keys(therapist.availability).length > 0) {
    let availableDays = 0;
    Object.values(therapist.availability).forEach((daySlots) => {
      if (Array.isArray(daySlots) && daySlots.length > 0) availableDays++;
    });
    if (availableDays >= 5) score += weights.availability;
    else if (availableDays >= 3) score += weights.availability * 0.7;
    else if (availableDays >= 1) score += weights.availability * 0.4;
  }

  // 6. LIFESTYLE COMPATIBILITY BONUS
  if (lifestyle === "High-stress, fast-paced" && therapist.yearsOfExperience >= 5) score += 3;
  else if (lifestyle === "Relaxed, low-stress" && therapist.isStudent) score += 2;

  // 7. CHRONIC CONDITION BONUS
  if (assessment.answers.duration === "More than 1 year" && therapist.yearsOfExperience >= 7) score += 5;

  return Math.round(score * 100) / 100;
};

/**
 * Get recommended therapists (cached 5 min)
 * @route GET /api/v1/assessments/recommendations
 * @access Private (Patient only)
 */
const getRecommendedTherapists = asyncHandler(async (req, res) => {
  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can get therapist recommendations");
  }

  const assessment = await Assessment.findOne({ patientId: req.user._id });
  if (!assessment) {
    throw new ApiError(404, "Please complete an assessment first to get therapist recommendations");
  }

  const { limit = 10, minRating, maxRate, verifiedOnly } = req.query;

  const cacheKey = `recommendations:${req.user._id}:${hashQuery(req.query)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Therapist recommendations generated successfully (cached)"));
  }

  const filter = {
    verificationStatus: verifiedOnly === "true" ? "verified" : { $ne: "rejected" },
  };
  if (minRating) filter.averageRating = { $gte: parseFloat(minRating) };
  if (maxRate) filter.sessionRate = { $lte: parseFloat(maxRate) };

  const therapists = await Therapist.find(filter)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email");

  if (therapists.length === 0) {
    const emptyData = {
      recommendations: [],
      assessmentSummary: {
        concerns: assessment.answers.concerns,
        impactLevel: assessment.answers.impactLevel,
        duration: assessment.answers.duration,
      },
    };
    return res.status(200).json(new ApiResponse(200, emptyData, "No therapists found matching your criteria"));
  }

  const scoredTherapists = therapists.map((therapist) => ({
    therapist: therapist.toObject(),
    matchScore: calculateTherapistScore(assessment, therapist),
    matchPercentage: Math.round((calculateTherapistScore(assessment, therapist) / 100) * 100),
  }));

  scoredTherapists.sort((a, b) => b.matchScore - a.matchScore);

  const limitNum = parseInt(limit) > 20 ? 20 : parseInt(limit);
  const recommendations = scoredTherapists.slice(0, limitNum);

  const recommendationsWithReasons = recommendations.map((rec) => {
    const reasons = [];
    const therapist = rec.therapist;

    const concernMatches = assessment.answers.concerns.filter((concern) => {
      const concernLower = concern.toLowerCase();
      return therapist.specializations.some((spec) =>
        spec.toLowerCase().includes(concernLower) || concernLower.includes(spec.toLowerCase())
      );
    });

    if (concernMatches.length > 0) reasons.push(`Specializes in: ${concernMatches.join(", ")}`);
    if (therapist.yearsOfExperience >= 10) reasons.push(`Highly experienced (${therapist.yearsOfExperience}+ years)`);
    else if (therapist.yearsOfExperience >= 5) reasons.push(`Experienced (${therapist.yearsOfExperience} years)`);
    if (therapist.averageRating >= 4.5) reasons.push(`Excellent rating (${therapist.averageRating}/5)`);
    else if (therapist.averageRating >= 4.0) reasons.push(`High rating (${therapist.averageRating}/5)`);
    if (therapist.verificationStatus === "verified") reasons.push("Verified therapist");

    const availableDays = Object.values(therapist.availability || {}).filter(
      (slots) => Array.isArray(slots) && slots.length > 0
    ).length;
    if (availableDays >= 5) reasons.push("Highly available");

    return { ...rec, matchReasons: reasons };
  });

  const data = {
    recommendations: recommendationsWithReasons,
    totalFound: scoredTherapists.length,
    assessmentSummary: {
      concerns: assessment.answers.concerns,
      impactLevel: assessment.answers.impactLevel,
      duration: assessment.answers.duration,
      lifestyle: assessment.answers.lifestyle,
    },
  };

  await setCache(cacheKey, data, 300);

  return res.status(200).json(
    new ApiResponse(200, data, "Therapist recommendations generated successfully")
  );
});

/**
 * Get assessment statistics (cached 10 min)
 * @route GET /api/v1/assessments/statistics
 * @access Private (Admin only)
 */
const getAssessmentStatistics = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can view assessment statistics");
  }

  const cacheKey = "stats:assessments";
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Assessment statistics fetched successfully (cached)"));
  }

  const totalAssessments = await Assessment.countDocuments();

  const concernStats = await Assessment.aggregate([
    { $unwind: "$answers.concerns" },
    { $group: { _id: "$answers.concerns", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const impactStats = await Assessment.aggregate([
    { $group: { _id: "$answers.impactLevel", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const durationStats = await Assessment.aggregate([
    { $group: { _id: "$answers.duration", count: { $sum: 1 } } },
  ]);

  const data = {
    totalAssessments,
    concernDistribution: concernStats,
    impactLevelDistribution: impactStats,
    durationDistribution: durationStats,
  };

  await setCache(cacheKey, data, 600);

  return res.status(200).json(
    new ApiResponse(200, data, "Assessment statistics fetched successfully")
  );
});

export {
  submitAssessment,
  getMyAssessment,
  getAssessmentByPatientId,
  getAllAssessments,
  deleteAssessment,
  getRecommendedTherapists,
  getAssessmentStatistics,
};
