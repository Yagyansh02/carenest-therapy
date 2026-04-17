/**
 * EXAMPLE: How to integrate Arcjet Rate Limiting into session routes
 * 
 * This shows session.routes.js with Arcjet protection for booking operations
 */

import { Router } from "express";
import {
  createSession,
  getSessionById,
  getAllSessions,
  getMyPatientSessions,
  getMyTherapistSessions,
  updateSession,
  cancelSession,
  completeSession,
  markNoShow,
  addTherapistNotes,
  updatePaymentStatus,
  deleteSession,
  getTherapistStatistics,
  getPatientStatistics,
  acceptSession,
  rejectSession,
  getPendingSessions,
  getTherapistBookedSlots,
} from "../controllers/session.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

// ===== ADD THESE IMPORTS =====
import { rateLimit } from "../middlewares/arcjet.middleware.js";
import { 
  bookingRateLimiter, 
  sessionRateLimiter 
} from "../utils/arcjet.config.js";
// ==============================

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// ===== SESSION CRUD WITH RATE LIMITING =====
// Creating sessions (booking) should be heavily rate limited
router.route("/").post(
  rateLimit(bookingRateLimiter), // 10 bookings per hour
  createSession
);

// Viewing sessions - moderate rate limit
router.route("/").get(
  rateLimit(sessionRateLimiter), // 30 requests per minute
  getAllSessions
);

// Get specific session
router.route("/:id").get(getSessionById);
router.route("/:id").put(updateSession);
router.route("/:id").delete(verifyRole("admin"), deleteSession);

// ===== PATIENT-SPECIFIC ROUTES =====
router.route("/patient/my-sessions").get(
  verifyRole("patient"), 
  getMyPatientSessions
);

router.route("/patient/statistics").get(
  verifyRole("patient"), 
  getPatientStatistics
);

// ===== THERAPIST-SPECIFIC ROUTES =====
router.route("/therapist/my-sessions").get(
  verifyRole("therapist"),
  getMyTherapistSessions
);

router.route("/therapist/statistics").get(
  verifyRole("therapist"),
  getTherapistStatistics
);

router.route("/therapist/:therapistId/booked-slots").get(
  getTherapistBookedSlots
);

// ===== SESSION MANAGEMENT =====
router.route("/:id/accept").put(
  verifyRole("therapist"),
  acceptSession
);

router.route("/:id/reject").put(
  verifyRole("therapist"),
  rejectSession
);

router.route("/:id/cancel").put(cancelSession);

router.route("/:id/complete").put(
  verifyRole("therapist"),
  completeSession
);

router.route("/:id/no-show").put(
  verifyRole("therapist"),
  markNoShow
);

router.route("/:id/notes").put(
  verifyRole("therapist"),
  addTherapistNotes
);

router.route("/:id/payment-status").put(
  verifyRole("admin"),
  updatePaymentStatus
);

// Pending sessions for therapist approval
router.route("/pending").get(
  verifyRole("therapist"),
  getPendingSessions
);

export default router;
