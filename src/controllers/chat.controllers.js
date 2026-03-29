import { ChatRoom } from "../models/chatRoom.model.js";
import { Message } from "../models/message.model.js";
import { Session } from "../models/session.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Valid session statuses that allow chat access
const VALID_CHAT_STATUSES = ["confirmed", "scheduled", "completed"];

// Days after session completion when chat expires
const CHAT_EXPIRY_DAYS = 30;

/**
 * Verify user has chat access with the other party
 * Returns the valid session if access is granted
 */
const verifyChatAccess = async (userId, userRole, otherUserId) => {
  let query = {};
  
  if (userRole === "patient") {
    query = { patientId: userId, therapistId: otherUserId };
  } else if (userRole === "therapist") {
    query = { patientId: otherUserId, therapistId: userId };
  } else {
    throw new ApiError(403, "Only patients and therapists can access chat");
  }

  // Find a valid session between the two users
  const session = await Session.findOne({
    ...query,
    status: { $in: VALID_CHAT_STATUSES },
  }).sort({ scheduledAt: -1 });

  if (!session) {
    throw new ApiError(403, "No valid booking found. Chat access denied.");
  }

  // Check if chat has expired (30 days after completed session)
  if (session.status === "completed") {
    const expiryDate = new Date(session.updatedAt);
    expiryDate.setDate(expiryDate.getDate() + CHAT_EXPIRY_DAYS);
    
    if (new Date() > expiryDate) {
      throw new ApiError(403, "Chat access has expired for this session.");
    }
  }

  return session;
};

/**
 * Get or create chat room between patient and therapist
 * @route GET /api/v1/chat/room/:otherUserId
 * @access Private (Patient or Therapist with valid booking)
 */
const getOrCreateChatRoom = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Verify other user exists
  const otherUser = await User.findById(otherUserId).select("fullName role");
  if (!otherUser) {
    throw new ApiError(404, "User not found");
  }

  // Verify chat access
  const session = await verifyChatAccess(userId, userRole, otherUserId);

  // Determine patient and therapist IDs
  const patientId = userRole === "patient" ? userId : otherUserId;
  const therapistId = userRole === "therapist" ? userId : otherUserId;

  // Find or create chat room
  let chatRoom = await ChatRoom.findOne({ patientId, therapistId });

  if (!chatRoom) {
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CHAT_EXPIRY_DAYS);

    chatRoom = await ChatRoom.create({
      patientId,
      therapistId,
      sessionId: session._id,
      status: "active",
      expiresAt,
    });
  }

  // Populate user info
  const populatedRoom = await ChatRoom.findById(chatRoom._id)
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email");

  res.status(200).json(
    new ApiResponse(200, populatedRoom, "Chat room retrieved successfully")
  );
});

/**
 * Get all chat rooms for current user
 * @route GET /api/v1/chat/rooms
 * @access Private (Patient or Therapist)
 */
const getChatRooms = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  let query = {};
  if (userRole === "patient") {
    query.patientId = userId;
  } else if (userRole === "therapist") {
    query.therapistId = userId;
  } else {
    throw new ApiError(403, "Only patients and therapists can access chat");
  }

  const chatRooms = await ChatRoom.find({ ...query, status: "active" })
    .populate("patientId", "fullName email")
    .populate("therapistId", "fullName email")
    .sort({ lastMessageAt: -1 });

  res.status(200).json(
    new ApiResponse(200, chatRooms, "Chat rooms retrieved successfully")
  );
});

/**
 * Get messages for a chat room
 * @route GET /api/v1/chat/room/:roomId/messages
 * @access Private (Room participant only)
 */
const getMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user._id;

  // Find and verify room access
  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new ApiError(404, "Chat room not found");
  }

  // Verify user is a participant
  const isParticipant = 
    chatRoom.patientId.toString() === userId.toString() ||
    chatRoom.therapistId.toString() === userId.toString();

  if (!isParticipant) {
    throw new ApiError(403, "Access denied to this chat room");
  }

  // Get messages with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const messages = await Message.find({ 
    chatRoomId: roomId, 
    isDeleted: false 
  })
    .populate("senderId", "fullName role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Message.countDocuments({ 
    chatRoomId: roomId, 
    isDeleted: false 
  });

  // Mark messages as read
  const userRole = req.user.role;
  if (userRole === "patient") {
    await ChatRoom.findByIdAndUpdate(roomId, { patientUnreadCount: 0 });
  } else {
    await ChatRoom.findByIdAndUpdate(roomId, { therapistUnreadCount: 0 });
  }

  // Mark messages from other user as read
  await Message.updateMany(
    { 
      chatRoomId: roomId, 
      senderId: { $ne: userId },
      isRead: false 
    },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json(
    new ApiResponse(200, {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, "Messages retrieved successfully")
  );
});

/**
 * Send a message (REST fallback - main messaging via WebSocket)
 * @route POST /api/v1/chat/room/:roomId/messages
 * @access Private (Room participant only)
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { content, messageType = "text" } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (!content || content.trim().length === 0) {
    throw new ApiError(400, "Message content is required");
  }

  // Find and verify room access
  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new ApiError(404, "Chat room not found");
  }

  // Verify user is a participant
  const isParticipant = 
    chatRoom.patientId.toString() === userId.toString() ||
    chatRoom.therapistId.toString() === userId.toString();

  if (!isParticipant) {
    throw new ApiError(403, "Access denied to this chat room");
  }

  // Verify chat access is still valid
  const otherUserId = userRole === "patient" 
    ? chatRoom.therapistId 
    : chatRoom.patientId;
  await verifyChatAccess(userId, userRole, otherUserId);

  // Create message
  const message = await Message.create({
    chatRoomId: roomId,
    senderId: userId,
    content: content.trim(),
    messageType,
  });

  // Update chat room
  const updateData = {
    lastMessageAt: new Date(),
    lastMessagePreview: content.substring(0, 100),
  };

  // Increment unread count for the other user
  if (userRole === "patient") {
    updateData.$inc = { therapistUnreadCount: 1 };
  } else {
    updateData.$inc = { patientUnreadCount: 1 };
  }

  await ChatRoom.findByIdAndUpdate(roomId, updateData);

  // Populate sender info
  const populatedMessage = await Message.findById(message._id)
    .populate("senderId", "fullName role");

  res.status(201).json(
    new ApiResponse(201, populatedMessage, "Message sent successfully")
  );
});

/**
 * Mark messages as read
 * @route PUT /api/v1/chat/room/:roomId/read
 * @access Private (Room participant only)
 */
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new ApiError(404, "Chat room not found");
  }

  // Verify user is a participant
  const isParticipant = 
    chatRoom.patientId.toString() === userId.toString() ||
    chatRoom.therapistId.toString() === userId.toString();

  if (!isParticipant) {
    throw new ApiError(403, "Access denied to this chat room");
  }

  // Mark messages as read
  await Message.updateMany(
    { 
      chatRoomId: roomId, 
      senderId: { $ne: userId },
      isRead: false 
    },
    { isRead: true, readAt: new Date() }
  );

  // Reset unread count
  if (userRole === "patient") {
    await ChatRoom.findByIdAndUpdate(roomId, { patientUnreadCount: 0 });
  } else {
    await ChatRoom.findByIdAndUpdate(roomId, { therapistUnreadCount: 0 });
  }

  res.status(200).json(
    new ApiResponse(200, null, "Messages marked as read")
  );
});

/**
 * Get unread message count for current user
 * @route GET /api/v1/chat/unread-count
 * @access Private (Patient or Therapist)
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  let query = {};
  let countField = "";

  if (userRole === "patient") {
    query.patientId = userId;
    countField = "patientUnreadCount";
  } else if (userRole === "therapist") {
    query.therapistId = userId;
    countField = "therapistUnreadCount";
  } else {
    throw new ApiError(403, "Only patients and therapists can access chat");
  }

  const chatRooms = await ChatRoom.find({ ...query, status: "active" });
  const totalUnread = chatRooms.reduce((sum, room) => sum + (room[countField] || 0), 0);

  res.status(200).json(
    new ApiResponse(200, { totalUnread }, "Unread count retrieved successfully")
  );
});

/**
 * Validate chat access (for WebSocket authentication)
 * @route POST /api/v1/chat/validate-access
 * @access Private
 */
const validateChatAccess = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new ApiError(404, "Chat room not found");
  }

  // Verify user is a participant
  const isParticipant = 
    chatRoom.patientId.toString() === userId.toString() ||
    chatRoom.therapistId.toString() === userId.toString();

  if (!isParticipant) {
    throw new ApiError(403, "Access denied to this chat room");
  }

  // Verify booking status
  const otherUserId = userRole === "patient" 
    ? chatRoom.therapistId 
    : chatRoom.patientId;
  
  await verifyChatAccess(userId, userRole, otherUserId);

  res.status(200).json(
    new ApiResponse(200, { valid: true }, "Chat access validated")
  );
});

export {
  getOrCreateChatRoom,
  getChatRooms,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  validateChatAccess,
  verifyChatAccess,
  VALID_CHAT_STATUSES,
  CHAT_EXPIRY_DAYS,
};
