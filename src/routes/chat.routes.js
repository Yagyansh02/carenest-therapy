import { Router } from "express";
import {
  getOrCreateChatRoom,
  getChatRooms,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  validateChatAccess,
} from "../controllers/chat.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Only patients and therapists can access chat
router.use(verifyRole("patient", "therapist"));

// Get all chat rooms for current user
router.route("/rooms").get(getChatRooms);

// Get unread message count
router.route("/unread-count").get(getUnreadCount);

// Validate chat access (for WebSocket)
router.route("/validate-access").post(validateChatAccess);

// Get or create chat room with another user
router.route("/room/:otherUserId").get(getOrCreateChatRoom);

// Get messages for a room
router.route("/room/:roomId/messages").get(getMessages);

// Send message to a room (REST fallback)
router.route("/room/:roomId/messages").post(sendMessage);

// Mark messages as read
router.route("/room/:roomId/read").put(markMessagesAsRead);

export default router;
