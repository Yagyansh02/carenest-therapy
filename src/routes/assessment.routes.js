import { Router } from "express";
import {
  submitAssessment,
  getMyAssessment,
  getAssessmentByPatientId,
  getAllAssessments,
  deleteAssessment,
  getRecommendedTherapists,
  getAssessmentStatistics,
} from "../controllers/assessment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes
router.use(verifyJWT);

// Patient routes
router.route("/").post(submitAssessment); // Submit or update assessment
router.route("/me").get(getMyAssessment); // Get own assessment
router.route("/recommendations").get(getRecommendedTherapists); // Get recommended therapists

// Therapist/Supervisor routes
router.route("/patient/:patientId").get(getAssessmentByPatientId); // Get assessment by patient ID

// Supervisor only routes
router.route("/all").get(getAllAssessments); // Get all assessments (paginated)
router.route("/statistics").get(getAssessmentStatistics); // Get assessment statistics

// Delete route (Patient can delete own, Supervisor can delete any)
router.route("/:id").delete(deleteAssessment);

export default router;
