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
} from "../controllers/session.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Session CRUD operations
router.route("/").post(createSession); // Patient or Therapist can create
router.route("/").get(getAllSessions); // Admin sees all, patients/therapists see their own

// Get specific session
router.route("/:id").get(getSessionById);
router.route("/:id").put(updateSession);
router.route("/:id").delete(verifyRole("admin"), deleteSession);

// Patient-specific routes
router.route("/patient/my-sessions").get(verifyRole("patient"), getMyPatientSessions);
router.route("/patient/statistics").get(verifyRole("patient"), getPatientStatistics);

// Therapist-specific routes
router.route("/therapist/my-sessions").get(verifyRole("therapist"), getMyTherapistSessions);
router.route("/therapist/statistics").get(verifyRole("therapist"), getTherapistStatistics);

// Session status updates
router.route("/:id/cancel").post(cancelSession);
router.route("/:id/complete").post(verifyRole("therapist"), completeSession);
router.route("/:id/no-show").post(verifyRole("therapist"), markNoShow);

// Therapist notes
router.route("/:id/notes").put(verifyRole("therapist"), addTherapistNotes);

// Payment status
router.route("/:id/payment").put(updatePaymentStatus);

export default router;
