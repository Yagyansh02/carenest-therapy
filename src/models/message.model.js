import mongoose, { Schema } from "mongoose";

/**
 * Message schema for storing chat messages between patients and therapists
 */
const messageSchema = new Schema(
  {
    /**
     * Reference to the chat room this message belongs to
     */
    chatRoomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },

    /**
     * Reference to the sender (User)
     */
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * Message content
     */
    content: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },

    /**
     * Message type (text, system notification, etc.)
     */
    messageType: {
      type: String,
      enum: ["text", "system", "file"],
      default: "text",
    },

    /**
     * Read status - tracks if recipient has read the message
     */
    isRead: {
      type: Boolean,
      default: false,
    },

    /**
     * Timestamp when message was read
     */
    readAt: {
      type: Date,
      default: null,
    },

    /**
     * Soft delete flag
     */
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
