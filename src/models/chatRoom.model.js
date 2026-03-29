import mongoose, { Schema } from "mongoose";

/**
 * ChatRoom schema for managing chat rooms between patients and therapists
 * A chat room is created when a patient has a valid booking with a therapist
 */
const chatRoomSchema = new Schema(
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
     * Reference to the session that created this chat room
     */
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    /**
     * Chat room status
     */
    status: {
      type: String,
      enum: ["active", "archived", "closed"],
      default: "active",
      index: true,
    },

    /**
     * Last message timestamp for sorting
     */
    lastMessageAt: {
      type: Date,
      default: null,
    },

    /**
     * Last message preview for display
     */
    lastMessagePreview: {
      type: String,
      maxlength: 100,
      default: null,
    },

    /**
     * Unread count for patient
     */
    patientUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Unread count for therapist
     */
    therapistUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Chat expiry date (30 days after last session)
     */
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding chat room between patient and therapist
chatRoomSchema.index({ patientId: 1, therapistId: 1 });
chatRoomSchema.index({ status: 1, lastMessageAt: -1 });

// Ensure unique chat room per patient-therapist pair
chatRoomSchema.index(
  { patientId: 1, therapistId: 1 },
  { unique: true }
);

export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
