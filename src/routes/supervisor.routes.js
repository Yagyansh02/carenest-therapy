import { Router } from "express";
import {
  createSupervisorProfile,
  updateSupervisorProfile,
  getSupervisorById,
  getAllSupervisors,
  getMyProfile,
  addStudentToSupervision,
  removeStudentFromSupervision,
  deleteSupervisorProfile,
  getStudentSessionsWithFeedback,
} from "../controllers/supervisor.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllSupervisors);

// Protected routes - require authentication
router.use(verifyJWT);

// IMPORTANT: /me route MUST come before /:id route to avoid conflicts
router.route("/me").get(getMyProfile);

// Supervisor profile management
router.route("/profile").post(createSupervisorProfile);
router.route("/profile").put(updateSupervisorProfile);
router.route("/profile").delete(deleteSupervisorProfile);

// Public supervisor by ID (moved after protected routes to avoid conflict with /me)
router.route("/:id").get(getSupervisorById);

// Student supervision management
router.route("/students/:studentId").post(verifyRole("supervisor", "admin"), addStudentToSupervision);
router.route("/students/:studentId").delete(verifyRole("supervisor", "admin"), removeStudentFromSupervision);
router.route("/students/:studentId/sessions").get(verifyRole("supervisor", "admin"), getStudentSessionsWithFeedback);

export default router;