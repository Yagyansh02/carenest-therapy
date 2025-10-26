import mongoose, { Schema } from "mongoose";

const ProgressRecordSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    progressScore: {
      type: Number,
      required: true,
    },
    goals: {
      type: [String],
      required: true,
    },
    completedGoals: {
      type: [String],
      required: true,
    },
    nextSteps: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const patientSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    progressRecords: {
      type: [ProgressRecordSchema],
      default: [],
    },
  },
  { timestamps: true }
);


export const Patient = mongoose.model("Patient", patientSchema);
