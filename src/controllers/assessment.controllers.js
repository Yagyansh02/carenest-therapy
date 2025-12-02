import { Assessment } from "../models/assessment.models.js";
import { Therapist } from "../models/therapist.models.js";
import { User } from "../models/user.models.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Submit assessment
 * @route POST /api/v1/assessments
 * @access Private (Patient only)
 */
const submitAssessment = asyncHandler(async (req, res) => {
  const {
    ageGroup,
    occupation,
    lifestyle,
    activityLevel,
    concerns,
    otherConcern,
    duration,
    impactLevel,
  } = req.body;

  // Check if user is a patient
  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can submit assessments");
  }

  // Validate required fields
  if (!concerns || concerns.length === 0) {
    throw new ApiError(400, "At least one mental health concern is required");
  }

  if (!impactLevel || impactLevel < 1 || impactLevel > 5) {
    throw new ApiError(400, "Impact level must be between 1 and 5");
  }

  // Check if patient already has an assessment
  const existingAssessment = await Assessment.findOne({
    patientId: req.user._id,
  });

  let assessment;

  if (existingAssessment) {
    // Update existing assessment
    existingAssessment.answers = {
      ageGroup,
      occupation,
      lifestyle,
      activityLevel,
      concerns,
      otherConcern: otherConcern || null,
      duration,
      impactLevel,
    };

    assessment = await existingAssessment.save();
  } else {
    // Create new assessment
    assessment = await Assessment.create({
      patientId: req.user._id,
      answers: {
        ageGroup,
        occupation,
        lifestyle,
        activityLevel,
        concerns,
        otherConcern: otherConcern || null,
        duration,
        impactLevel,
      },
    });
  }

  const populatedAssessment = await Assessment.findById(assessment._id).populate(
    "patientId",
    "fullName email"
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      populatedAssessment,
      existingAssessment
        ? "Assessment updated successfully"
        : "Assessment submitted successfully"
    )
  );
});

/**
 * Get patient's own assessment
 * @route GET /api/v1/assessments/me
 * @access Private (Patient only)
 */
const getMyAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({
    patientId: req.user._id,
  }).populate("patientId", "fullName email");

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

  // Check authorization
  if (!["therapist", "admin"].includes(req.user.role)) {
    throw new ApiError(403, "Only therapists and admins can view patient assessments");
  }

  // If user is a therapist, check if they have a session with this patient
  if (req.user.role === "therapist") {
    const hasSession = await Session.findOne({
      therapistId: req.user._id,
      patientId: patientId,
    });

    if (!hasSession) {
      throw new ApiError(
        403,
        "You can only view assessments of patients you have sessions with"
      );
    }
  }

  const assessment = await Assessment.findOne({ patientId }).populate(
    "patientId",
    "fullName email role"
  );

  if (!assessment) {
    throw new ApiError(404, "Assessment not found for this patient");
  }

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
  // Check if user is admin
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
    new ApiResponse(
      200,
      {
        assessments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalAssessments,
          hasMore: pageNum < totalPages,
        },
      },
      "Assessments fetched successfully"
    )
  );
});

/**
 * Delete assessment
 * @route DELETE /api/v1/assessments/:id
 * @access Private (Patient can delete own, Supervisor can delete any)
 */
const deleteAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assessment = await Assessment.findById(id);

  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }

  // Check authorization
  if (
    req.user.role !== "admin" &&
    assessment.patientId.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "You can only delete your own assessment");
  }

  await Assessment.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Assessment deleted successfully"));
});

/**
 * Recommendation Algorithm
 * Scores therapists based on patient's assessment answers
 */
const calculateTherapistScore = (assessment, therapist) => {
  let score = 0;
  const weights = {
    specialization: 40, // Most important - therapist specializes in patient's concerns
    experience: 20, // Years of experience
    rating: 20, // Average rating
    verification: 10, // Verified status
    availability: 10, // Has availability slots
  };

  const { concerns, impactLevel, lifestyle, activityLevel } = assessment.answers;

  // 1. SPECIALIZATION MATCHING (40 points)
  if (therapist.specializations && therapist.specializations.length > 0) {
    // Map concerns to specialization keywords
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

    concerns.forEach((concern) => {
      const keywords = concernKeywords[concern] || [];
      const therapistSpecsLower = therapist.specializations.map((s) =>
        s.toLowerCase()
      );

      // Check if any keyword matches therapist's specializations
      const hasMatch = keywords.some((keyword) =>
        therapistSpecsLower.some((spec) => spec.includes(keyword))
      );

      if (hasMatch) {
        matchCount++;
      }
    });

    // Calculate specialization score based on match percentage
    const matchPercentage = totalConcerns > 0 ? matchCount / totalConcerns : 0;
    score += matchPercentage * weights.specialization;

    // Bonus for therapists with multiple relevant specializations
    if (matchCount > 1) {
      score += 5;
    }
  }

  // 2. EXPERIENCE SCORE (20 points)
  if (therapist.yearsOfExperience) {
    if (impactLevel >= 4) {
      // High impact - prefer more experienced therapists
      if (therapist.yearsOfExperience >= 10) {
        score += weights.experience;
      } else if (therapist.yearsOfExperience >= 5) {
        score += weights.experience * 0.7;
      } else if (therapist.yearsOfExperience >= 2) {
        score += weights.experience * 0.4;
      }
    } else {
      // Lower impact - experience still valuable but less critical
      if (therapist.yearsOfExperience >= 5) {
        score += weights.experience;
      } else if (therapist.yearsOfExperience >= 2) {
        score += weights.experience * 0.7;
      } else if (therapist.yearsOfExperience >= 1) {
        score += weights.experience * 0.4;
      }
    }
  }

  // 3. RATING SCORE (20 points)
  if (therapist.averageRating) {
    const ratingScore = (therapist.averageRating / 5) * weights.rating;
    score += ratingScore;

    // Bonus for highly rated therapists (4.5+)
    if (therapist.averageRating >= 4.5) {
      score += 3;
    }
  }

  // 4. VERIFICATION STATUS (10 points)
  if (therapist.verificationStatus === "verified") {
    score += weights.verification;
  } else if (therapist.verificationStatus === "pending") {
    score += weights.verification * 0.5;
  }

  // 5. AVAILABILITY (10 points)
  if (therapist.availability && Object.keys(therapist.availability).length > 0) {
    let availableDays = 0;
    Object.values(therapist.availability).forEach((daySlots) => {
      if (Array.isArray(daySlots) && daySlots.length > 0) {
        availableDays++;
      }
    });

    if (availableDays >= 5) {
      score += weights.availability;
    } else if (availableDays >= 3) {
      score += weights.availability * 0.7;
    } else if (availableDays >= 1) {
      score += weights.availability * 0.4;
    }
  }

  // 6. LIFESTYLE COMPATIBILITY BONUS (5 points)
  if (lifestyle === "High-stress, fast-paced") {
    // Prefer experienced therapists who can handle complex cases
    if (therapist.yearsOfExperience >= 5) {
      score += 3;
    }
  } else if (lifestyle === "Relaxed, low-stress") {
    // Any therapist is suitable, slight bonus for student therapists (more affordable)
    if (therapist.isStudent) {
      score += 2;
    }
  }

  // 7. CHRONIC CONDITION BONUS (5 points)
  if (assessment.answers.duration === "More than 1 year") {
    // Prefer experienced therapists for chronic conditions
    if (therapist.yearsOfExperience >= 7) {
      score += 5;
    }
  }

  return Math.round(score * 100) / 100; // Round to 2 decimal places
};

/**
 * Get recommended therapists based on patient's assessment
 * @route GET /api/v1/assessments/recommendations
 * @access Private (Patient only)
 */
const getRecommendedTherapists = asyncHandler(async (req, res) => {
  // Check if user is a patient
  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can get therapist recommendations");
  }

  // Get patient's assessment
  const assessment = await Assessment.findOne({ patientId: req.user._id });

  if (!assessment) {
    throw new ApiError(
      404,
      "Please complete an assessment first to get therapist recommendations"
    );
  }

  // Get query parameters
  const {
    limit = 10,
    minRating,
    maxRate,
    verifiedOnly,
  } = req.query;

  // Build filter for therapists
  const filter = {
    verificationStatus: verifiedOnly === "true" ? "verified" : { $ne: "rejected" },
  };

  if (minRating) {
    filter.averageRating = { $gte: parseFloat(minRating) };
  }

  if (maxRate) {
    filter.sessionRate = { $lte: parseFloat(maxRate) };
  }

  // Get all therapists matching filters
  const therapists = await Therapist.find(filter)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email");

  if (therapists.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          recommendations: [],
          assessmentSummary: {
            concerns: assessment.answers.concerns,
            impactLevel: assessment.answers.impactLevel,
            duration: assessment.answers.duration,
          },
        },
        "No therapists found matching your criteria"
      )
    );
  }

  // Calculate scores for all therapists
  const scoredTherapists = therapists.map((therapist) => {
    const score = calculateTherapistScore(assessment, therapist);
    return {
      therapist: therapist.toObject(),
      matchScore: score,
      matchPercentage: Math.round((score / 100) * 100), // Convert to percentage
    };
  });

  // Sort by score (highest first)
  scoredTherapists.sort((a, b) => b.matchScore - a.matchScore);

  // Limit results
  const limitNum = parseInt(limit) > 20 ? 20 : parseInt(limit);
  const recommendations = scoredTherapists.slice(0, limitNum);

  // Add match reasons for top recommendations
  const recommendationsWithReasons = recommendations.map((rec) => {
    const reasons = [];
    const therapist = rec.therapist;

    // Check specialization matches
    const concernMatches = assessment.answers.concerns.filter((concern) => {
      const concernLower = concern.toLowerCase();
      return therapist.specializations.some((spec) =>
        spec.toLowerCase().includes(concernLower) ||
        concernLower.includes(spec.toLowerCase())
      );
    });

    if (concernMatches.length > 0) {
      reasons.push(
        `Specializes in: ${concernMatches.join(", ")}`
      );
    }

    // Experience
    if (therapist.yearsOfExperience >= 10) {
      reasons.push(`Highly experienced (${therapist.yearsOfExperience}+ years)`);
    } else if (therapist.yearsOfExperience >= 5) {
      reasons.push(`Experienced (${therapist.yearsOfExperience} years)`);
    }

    // Rating
    if (therapist.averageRating >= 4.5) {
      reasons.push(`Excellent rating (${therapist.averageRating}/5)`);
    } else if (therapist.averageRating >= 4.0) {
      reasons.push(`High rating (${therapist.averageRating}/5)`);
    }

    // Verification
    if (therapist.verificationStatus === "verified") {
      reasons.push("Verified therapist");
    }

    // Availability
    const availableDays = Object.values(therapist.availability || {}).filter(
      (slots) => Array.isArray(slots) && slots.length > 0
    ).length;
    
    if (availableDays >= 5) {
      reasons.push("Highly available");
    }

    return {
      ...rec,
      matchReasons: reasons,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recommendations: recommendationsWithReasons,
        totalFound: scoredTherapists.length,
        assessmentSummary: {
          concerns: assessment.answers.concerns,
          impactLevel: assessment.answers.impactLevel,
          duration: assessment.answers.duration,
          lifestyle: assessment.answers.lifestyle,
        },
      },
      "Therapist recommendations generated successfully"
    )
  );
});

/**
 * Get assessment statistics (for admins)
 * @route GET /api/v1/assessments/statistics
 * @access Private (Admin only)
 */
const getAssessmentStatistics = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admins can view assessment statistics");
  }

  const totalAssessments = await Assessment.countDocuments();

  // Get concern distribution
  const concernStats = await Assessment.aggregate([
    { $unwind: "$answers.concerns" },
    {
      $group: {
        _id: "$answers.concerns",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get impact level distribution
  const impactStats = await Assessment.aggregate([
    {
      $group: {
        _id: "$answers.impactLevel",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get duration distribution
  const durationStats = await Assessment.aggregate([
    {
      $group: {
        _id: "$answers.duration",
        count: { $sum: 1 },
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalAssessments,
        concernDistribution: concernStats,
        impactLevelDistribution: impactStats,
        durationDistribution: durationStats,
      },
      "Assessment statistics fetched successfully"
    )
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
