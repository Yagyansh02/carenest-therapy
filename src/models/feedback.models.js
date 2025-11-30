import mongoose, { Schema } from "mongoose";

/**
 * Feedback Model - 360-degree feedback system
 * 
 * This model supports multiple types of feedback:
 * 1. Patient → Therapist (session feedback, ratings)
 * 2. Therapist → Patient (progress notes, session effectiveness)
 * 3. Supervisor → Therapist (performance review, guidance)
 * 
 * This creates a comprehensive feedback loop for continuous improvement
 */
const feedbackSchema = new Schema(
  {
    /**
     * Type of feedback determines the relationship between giver and receiver
     */
    feedbackType: {
      type: String,
      enum: ["patient-to-therapist", "therapist-to-patient", "supervisor-to-therapist"],
      required: true,
      index: true,
    },

    /**
     * User giving the feedback
     */
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * User receiving the feedback
     */
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * Related session (required for patient-to-therapist and therapist-to-patient)
     */
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      default: null,
      index: true,
    },

    /**
     * Overall rating (1-5 scale)
     */
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    /**
     * Category-specific ratings for detailed feedback
     * Different categories apply based on feedback type
     */
    categoryRatings: {
      // For patient-to-therapist feedback
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      effectiveness: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      empathy: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      
      // For therapist-to-patient feedback
      engagement: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      progress: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      homework_completion: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      openness: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      // For supervisor-to-therapist feedback
      clinical_skills: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      documentation: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      ethical_practice: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      professional_development: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },

    /**
     * Detailed textual feedback
     */
    comment: {
      type: String,
      maxlength: 2000,
      trim: true,
    },

    /**
     * Areas of strength (optional, primarily for supervisor feedback)
     */
    strengths: {
      type: [String],
      default: [],
    },

    /**
     * Areas for improvement (optional, primarily for supervisor feedback)
     */
    areasForImprovement: {
      type: [String],
      default: [],
    },

    /**
     * Action items or recommendations
     */
    recommendations: {
      type: String,
      maxlength: 1000,
      default: null,
    },

    /**
     * Whether the feedback is anonymous (only applicable for patient-to-therapist)
     */
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    /**
     * Visibility status - whether feedback is visible to the recipient
     */
    isVisible: {
      type: Boolean,
      default: true,
    },

    /**
     * Admin can flag inappropriate feedback
     */
    isFlagged: {
      type: Boolean,
      default: false,
    },

    /**
     * Response from the recipient (optional)
     */
    response: {
      text: {
        type: String,
        maxlength: 1000,
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },

    /**
     * Review period (for supervisor feedback - e.g., "Q1 2024", "Monthly Review")
     */
    reviewPeriod: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
feedbackSchema.index({ feedbackType: 1, fromUser: 1 });
feedbackSchema.index({ feedbackType: 1, toUser: 1 });
feedbackSchema.index({ sessionId: 1, feedbackType: 1 });
feedbackSchema.index({ toUser: 1, overallRating: -1 });
feedbackSchema.index({ createdAt: -1 });

// Validation: Ensure session is provided for session-related feedback
feedbackSchema.pre("save", function (next) {
  if (
    (this.feedbackType === "patient-to-therapist" ||
      this.feedbackType === "therapist-to-patient") &&
    !this.sessionId
  ) {
    return next(new Error("Session ID is required for session-related feedback"));
  }
  next();
});

// Virtual for calculating average category rating
feedbackSchema.virtual("averageCategoryRating").get(function () {
  const ratings = Object.values(this.categoryRatings).filter(
    (rating) => rating !== null && rating !== undefined
  );
  if (ratings.length === 0) return null;
  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2);
});

// Ensure virtuals are included in JSON output
feedbackSchema.set("toJSON", { virtuals: true });
feedbackSchema.set("toObject", { virtuals: true });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
