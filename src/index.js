import dotenv from "dotenv";
import http from "http";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { setupPeerServer } from "./services/videoService.js";
import { setupChatServer } from "./services/chatService.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    const httpServer = http.createServer(app);

    // Attach PeerJS signaling server (needs raw http.Server for WebSocket)
    setupPeerServer(app, httpServer);

    // Attach Socket.IO chat server
    setupChatServer(httpServer);

    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection failed", err);
  });
