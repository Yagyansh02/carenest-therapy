import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ChatRoom } from "../models/chatRoom.model.js";
import { Message } from "../models/message.model.js";
import { Session } from "../models/session.model.js";
import { verifyChatAccess, VALID_CHAT_STATUSES } from "../controllers/chat.controllers.js";

// Store active connections
const activeConnections = new Map();

/**
 * Setup Socket.IO server for real-time chat
 * @param {import("http").Server} httpServer
 */
export const setupChatServer = (httpServer) => {
  // Parse CORS origins - support comma-separated list or single origin
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  console.log('[Chat] CORS origins:', corsOrigins);

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
    // Allow both transports
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      console.log('[Chat] Auth attempt from:', socket.handshake.address);
      console.log('[Chat] Transport:', socket.conn.transport.name);
      
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        console.log('[Chat] No token provided');
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select("-password -refreshToken");

      if (!user) {
        console.log('[Chat] User not found');
        return next(new Error("User not found"));
      }

      if (!["patient", "therapist"].includes(user.role)) {
        console.log('[Chat] Invalid role:', user.role);
        return next(new Error("Only patients and therapists can access chat"));
      }

      socket.user = user;
      console.log('[Chat] Auth successful for:', user.fullName);
      next();
    } catch (error) {
      console.error("[Chat] Socket auth error:", error.message);
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Chat] User connected: ${socket.user.fullName} (${userId})`);

    // Store connection
    activeConnections.set(userId, socket.id);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Handle joining a chat room
    socket.on("join_room", async (data) => {
      try {
        const { roomId } = data;
        
        // Verify room exists and user is a participant
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit("error", { message: "Chat room not found" });
          return;
        }

        const isParticipant = 
          chatRoom.patientId.toString() === userId ||
          chatRoom.therapistId.toString() === userId;

        if (!isParticipant) {
          socket.emit("error", { message: "Access denied to this chat room" });
          return;
        }

        // Verify booking status
        const otherUserId = socket.user.role === "patient" 
          ? chatRoom.therapistId 
          : chatRoom.patientId;

        try {
          await verifyChatAccess(socket.user._id, socket.user.role, otherUserId);
        } catch (err) {
          socket.emit("error", { message: err.message });
          return;
        }

        // Join the room
        socket.join(`room:${roomId}`);
        console.log(`[Chat] ${socket.user.fullName} joined room ${roomId}`);

        // Notify room that user joined
        socket.to(`room:${roomId}`).emit("user_joined", {
          userId,
          fullName: socket.user.fullName,
          timestamp: new Date(),
        });

        socket.emit("joined_room", { roomId, success: true });
      } catch (error) {
        console.error("[Chat] Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle leaving a chat room
    socket.on("leave_room", (data) => {
      const { roomId } = data;
      socket.leave(`room:${roomId}`);
      console.log(`[Chat] ${socket.user.fullName} left room ${roomId}`);

      socket.to(`room:${roomId}`).emit("user_left", {
        userId,
        fullName: socket.user.fullName,
        timestamp: new Date(),
      });
    });

    // Handle sending a message
    socket.on("send_message", async (data) => {
      try {
        const { roomId, content, messageType = "text" } = data;

        if (!content || content.trim().length === 0) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        // Verify room access
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit("error", { message: "Chat room not found" });
          return;
        }

        const isParticipant = 
          chatRoom.patientId.toString() === userId ||
          chatRoom.therapistId.toString() === userId;

        if (!isParticipant) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Verify booking status
        const otherUserId = socket.user.role === "patient" 
          ? chatRoom.therapistId 
          : chatRoom.patientId;

        try {
          await verifyChatAccess(socket.user._id, socket.user.role, otherUserId);
        } catch (err) {
          socket.emit("error", { message: err.message });
          return;
        }

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
        if (socket.user.role === "patient") {
          await ChatRoom.findByIdAndUpdate(roomId, {
            ...updateData,
            $inc: { therapistUnreadCount: 1 },
          });
        } else {
          await ChatRoom.findByIdAndUpdate(roomId, {
            ...updateData,
            $inc: { patientUnreadCount: 1 },
          });
        }

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
          .populate("senderId", "fullName role");

        // Emit to room
        io.to(`room:${roomId}`).emit("new_message", {
          message: populatedMessage,
          roomId,
        });

        // Send notification to other user if not in room
        const otherUserSocketId = activeConnections.get(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(`user:${otherUserId}`).emit("message_notification", {
            roomId,
            senderName: socket.user.fullName,
            preview: content.substring(0, 50),
          });
        }

        console.log(`[Chat] Message sent in room ${roomId} by ${socket.user.fullName}`);
      } catch (error) {
        console.error("[Chat] Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicator
    socket.on("typing_start", (data) => {
      const { roomId } = data;
      socket.to(`room:${roomId}`).emit("user_typing", {
        userId,
        fullName: socket.user.fullName,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { roomId } = data;
      socket.to(`room:${roomId}`).emit("user_typing", {
        userId,
        fullName: socket.user.fullName,
        isTyping: false,
      });
    });

    // Handle marking messages as read
    socket.on("mark_read", async (data) => {
      try {
        const { roomId } = data;

        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) return;

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
        if (socket.user.role === "patient") {
          await ChatRoom.findByIdAndUpdate(roomId, { patientUnreadCount: 0 });
        } else {
          await ChatRoom.findByIdAndUpdate(roomId, { therapistUnreadCount: 0 });
        }

        // Notify sender that messages were read
        socket.to(`room:${roomId}`).emit("messages_read", {
          roomId,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("[Chat] Mark read error:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`[Chat] User disconnected: ${socket.user.fullName} (${reason})`);
      activeConnections.delete(userId);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`[Chat] Socket error for ${socket.user.fullName}:`, error);
    });
  });

  console.log("[Chat] Socket.IO server initialized");
  return io;
};

/**
 * Get active connection count
 */
export const getActiveConnectionCount = () => activeConnections.size;

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => activeConnections.has(userId.toString());
