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
     */
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
      index: true,
    },
    /**
     * Session type
     */
    sessionType: {
      type: String,
      enum: ["video", "audio", "chat", "in-person"],
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
// Compound index for efficient queries
sessionSchema.index({ patientId: 1, scheduledAt: -1 });
sessionSchema.index({ therapistId: 1, scheduledAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);