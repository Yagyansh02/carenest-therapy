import { Router } from "express";
import { getVideoCallToken } from "../controllers/videoCall.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// Get peer IDs + session info needed to join a video call
router.route("/:sessionId/token").get(getVideoCallToken);

export default router;
