import { ExpressPeerServer } from "peer";

// Marker stored in session.meetingLink to indicate built-in video is used
export const BUILTIN_VIDEO_MARKER = "carenest-video";

// Deterministic peer IDs scoped to a session and role
export const getPatientPeerId = (sessionId) =>
  `carenest-${sessionId}-patient`;

export const getTherapistPeerId = (sessionId) =>
  `carenest-${sessionId}-therapist`;

/**
 * Mounts the PeerJS signaling server at /peerjs on the Express app.
 * Must be called with the raw http.Server instance so PeerJS can upgrade
 * WebSocket connections.
 *
 * @param {import("express").Express} app
 * @param {import("http").Server} httpServer
 */
export const setupPeerServer = (app, httpServer) => {
  const peerServer = ExpressPeerServer(httpServer, {
    path: "/",
    allow_discovery: false,
  });

  app.use("/peerjs", peerServer);

  peerServer.on("connection", (client) => {
    console.log(`[PeerJS] client connected: ${client.getId()}`);
  });

  peerServer.on("disconnect", (client) => {
    console.log(`[PeerJS] client disconnected: ${client.getId()}`);
  });
};
