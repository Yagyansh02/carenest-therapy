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
} from "../controllers/supervisor.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllSupervisors);
router.route("/:id").get(getSupervisorById);

// Protected routes - require authentication
router.use(verifyJWT);

// Supervisor profile management
router.route("/profile").post(createSupervisorProfile);
router.route("/profile").put(updateSupervisorProfile);
router.route("/profile").delete(deleteSupervisorProfile);
router.route("/me").get(getMyProfile);

// Student supervision management
router.route("/students/:studentId").post(addStudentToSupervision);
router.route("/students/:studentId").delete(removeStudentFromSupervision);

export default router;