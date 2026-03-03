import { Router } from "express";
import {
  createCollegeProfile,
  updateCollegeProfile,
  getCollegeById,
  getAllColleges,
  getMyProfile,
  addStudentToCollege,
  removeStudentFromCollege,
  deleteCollegeProfile,
} from "../controllers/college.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllColleges);

// Protected routes - require authentication
router.use(verifyJWT);

// IMPORTANT: /me route MUST come before /:id route to avoid conflicts
router.route("/me").get(getMyProfile);

// College profile management
router.route("/profile").post(createCollegeProfile);
router.route("/profile").put(updateCollegeProfile);
router.route("/profile").delete(deleteCollegeProfile);

// Public college by ID (moved after protected routes to avoid conflict with /me)
router.route("/:id").get(getCollegeById);

// Student affiliation management
router.route("/students/:studentId").post(addStudentToCollege);
router.route("/students/:studentId").delete(removeStudentFromCollege);

export default router;
