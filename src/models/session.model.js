import mongoose, { Schema } from "mongoose";
const sessionSchema = new Schema(
  {
    /**
     * Reference to the patient (User)
     */
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /**
     * Reference to the therapist (User)
     */
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * Scheduled date and time for the session
     */
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * Duration in minutes
     */
    duration: {
      type: Number,
      required: true,
      default: 60,
      min: 15,
    },
    /**
     * Session status
     * pending: Waiting for therapist approval
     * confirmed: Therapist accepted, session scheduled
     * completed: Session finished
     * cancelled: Session cancelled by patient/therapist
     * rejected: Therapist rejected the request
     * no-show: Patient didn't attend
     */
    status: {
      type: String,
      enum: ["pending", "confirmed", "scheduled", "completed", "cancelled", "rejected", "no-show"],
      default: "pending",
      index: true,
    },
    /**
     * Session type (only video sessions supported)
     */
    sessionType: {
      type: String,
      default: "video",
    },

    /**
     * Meeting link for online sessions
     */
    meetingLink: {
      type: String,
      default: null,
    },

    /**
     * Notes taken by therapist during/after session
     */
    therapistNotes: {
      type: String,
      maxlength: 5000,
      default: null,
    },
    /**
     * Session fee charged
     */
    sessionFee: {
      type: Number,
      required: true,
      min: 0,
    },
    /**
     * Payment status
     */
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    /**
     * Cancellation reason if applicable
     */
    cancellationReason: {
      type: String,
      maxlength: 500,
      default: null,
    },
    /**
     * Who cancelled the session
     */
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
// Compound indexes for efficient queries
sessionSchema.index({ patientId: 1, scheduledAt: -1 });
sessionSchema.index({ therapistId: 1, scheduledAt: -1 });
sessionSchema.index({ status: 1, scheduledAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);