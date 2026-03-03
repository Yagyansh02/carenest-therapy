import mongoose, { Schema } from "mongoose";

/**
 * College schema for affiliated educational institutions.
 * Colleges affiliate with the platform so their psychiatry students
 * can work as interns under supervisors.
 */
const collegeSchema = new Schema(
  {
    // Link to the main User document for authentication and basic info
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Official name of the institution
    institutionName: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      minlength: [2, "Institution name must be at least 2 characters"],
      maxlength: [200, "Institution name too long"],
    },

    // Official registration / affiliation number of the institution
    affiliationNumber: {
      type: String,
      required: [true, "Affiliation number is required"],
      unique: true,
      trim: true,
    },

    // Full address of the institution
    address: {
      type: String,
      trim: true,
      default: "",
    },

    // Contact phone number for the institution
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    // Official website of the institution
    website: {
      type: String,
      trim: true,
      default: "",
    },

    // Name of the designated contact person (e.g., HOD / coordinator)
    contactPersonName: {
      type: String,
      trim: true,
      default: "",
    },

    // Email of the designated contact person
    contactPersonEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Department that manages the internship programme
    department: {
      type: String,
      trim: true,
      default: "",
    },

    // List of student therapist user IDs affiliated with this college
    affiliatedStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // MOU / agreement details
    agreementStartDate: {
      type: Date,
      default: null,
    },

    agreementEndDate: {
      type: Date,
      default: null,
    },

    // Verification status of the college affiliation
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const College = mongoose.model("College", collegeSchema);
