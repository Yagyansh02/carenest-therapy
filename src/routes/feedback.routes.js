import { Router } from "express";
import {
  createFeedback,
  getFeedbackById,
  getAllFeedbacks,
  updateFeedback,
  deleteFeedback,
  addResponseToFeedback,
  flagFeedback,
  getFeedbackStats,
  getTherapistRating,
} from "../controllers/feedback.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Public routes
 */
// Get therapist's average rating (for matching/search)
router.route("/therapist/:therapistId/rating").get(getTherapistRating);

/**
 * Protected routes - require authentication
 */
router.use(verifyJWT); // All routes below require authentication

// Create feedback
router.route("/").post(createFeedback);

// Get all feedbacks (with role-based filtering)
router.route("/").get(getAllFeedbacks);

// Get feedback statistics for a user
router.route("/stats/:userId").get(getFeedbackStats);

// Get feedback by ID
router.route("/:id").get(getFeedbackById);

// Update feedback (creator only)
router.route("/:id").put(updateFeedback);

// Delete feedback (creator or admin)
router.route("/:id").delete(deleteFeedback);

// Add response to feedback (recipient only)
router.route("/:id/response").post(addResponseToFeedback);

// Flag feedback (admin only)
router.route("/:id/flag").post(flagFeedback);

export default router;
