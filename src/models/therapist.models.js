import mongoose, { Schema } from "mongoose";

const qualificationSchema = new Schema(
  {
    degree: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
    },
  },
  { _id: false }
); // Using _id: false prevents MongoDB from creating ObjectIds for subdocuments

/**
 * Main schema for the Therapist Profile.
 */
const therapistProfileSchema = new Schema(
  {
    /**
     * Link to the main User document for authentication and basic info.
     * Indexed and unique to ensure one profile per user.
     */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    bio: {
      type: String,
      maxlength: 2000,
    },

    isStudent: {
      type: Boolean,
      default: false,
    },

    qualifications: {
      type: [qualificationSchema],
      default: [],
    },

    licenseNumber: {
      type: String,
      default: null,
    },

    specializations: {
      type: [String],
      default: [],
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    sessionRate: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * A structured object for availability is better for validation,
     * but mongoose.Schema.Types.Mixed can be used for more flexibility.
     */
    availability: {
      type: Object,
      default: {},
    },

    /**
     * Link to the supervisor's User document.
     * Only applicable if isStudent is true.
     */
    supervisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

export const Therapist = mongoose.model("Therapist", therapistSchema);
