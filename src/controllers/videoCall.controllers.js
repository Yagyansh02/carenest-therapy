import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  BUILTIN_VIDEO_MARKER,
  getPatientPeerId,
  getTherapistPeerId,
} from "../services/videoService.js";

/**
 * Returns the PeerJS peer-ID pair for a session so the frontend knows
 * which ID to register with and which ID to call.
 *
 * @route GET /api/v1/video/:sessionId/token
 * @access Private (session patient or therapist only)
 */
const getVideoCallToken = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findById(sessionId)
    .populate("patientId", "fullName")
    .populate("therapistId", "fullName");

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  const userId = req.user._id.toString();
  const isPatient = userId === session.patientId._id.toString();
  const isTherapist = userId === session.therapistId._id.toString();

  if (!isPatient && !isTherapist) {
    throw new ApiError(403, "You are not a participant in this session");
  }

  if (session.meetingLink !== BUILTIN_VIDEO_MARKER) {
    throw new ApiError(400, "This session does not use the built-in video call");
  }

  if (!["confirmed", "scheduled"].includes(session.status)) {
    throw new ApiError(400, `Session cannot be joined in its current state: ${session.status}`);
  }

  const role = isTherapist ? "therapist" : "patient";
  const myPeerId =
    role === "therapist"
      ? getTherapistPeerId(session._id.toString())
      : getPatientPeerId(session._id.toString());
  const otherPeerId =
    role === "therapist"
      ? getPatientPeerId(session._id.toString())
      : getTherapistPeerId(session._id.toString());

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessionId: session._id,
        role,
        myPeerId,
        otherPeerId,
        sessionInfo: {
          scheduledAt: session.scheduledAt,
          duration: session.duration,
          patientName: session.patientId.fullName,
          therapistName: session.therapistId.fullName,
        },
      },
      "Video call token fetched successfully"
    )
  );
});

export { getVideoCallToken };
