import { Router } from "express";
import {
  createTherapistProfile,
  updateTherapistProfile,
  getTherapistById,
  getAllTherapists,
  updateAvailability,
  updateQualifications,
  updateSpecializations,
  getStudentsUnderSupervisor,
  verifyTherapist,
  deleteTherapistProfile,
  getMyProfile,
} from "../controllers/therapist.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes - Therapist only (must be before /:id route)
router.route("/me").get(verifyJWT, verifyRole("therapist"), getMyProfile);

router.route("/profile").post(verifyJWT, verifyRole("therapist"), createTherapistProfile);
router.route("/profile").put(verifyJWT, verifyRole("therapist"), updateTherapistProfile);
router.route("/profile").delete(verifyJWT, verifyRole("therapist"), deleteTherapistProfile);

router.route("/availability").put(verifyJWT, verifyRole("therapist"), updateAvailability);
router.route("/qualifications").put(verifyJWT, verifyRole("therapist"), updateQualifications);
router.route("/specializations").put(verifyJWT, verifyRole("therapist"), updateSpecializations);

// Protected routes - Supervisor only
router.route("/students").get(verifyJWT, verifyRole("supervisor"), getStudentsUnderSupervisor);
router.route("/verify/:id").put(verifyJWT, verifyRole("supervisor"), verifyTherapist);

// Public routes (no authentication required) - must be after specific routes
router.route("/").get(getAllTherapists);
router.route("/:id").get(getTherapistById);

export default router;
