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
} from "../controllers/therapist.controller.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.route("/").get(getAllTherapists);
router.route("/:id").get(getTherapistById);

// Protected routes - Therapist only
router.route("/profile").post(verifyJWT, verifyRole("therapist"), createTherapistProfile);
router.route("/profile").put(verifyJWT, verifyRole("therapist"), updateTherapistProfile);
router.route("/profile").delete(verifyJWT, verifyRole("therapist"), deleteTherapistProfile);

router.route("/me").get(verifyJWT, verifyRole("therapist"), getMyProfile);

router.route("/availability").put(verifyJWT, verifyRole("therapist"), updateAvailability);
router.route("/qualifications").put(verifyJWT, verifyRole("therapist"), updateQualifications);
router.route("/specializations").put(verifyJWT, verifyRole("therapist"), updateSpecializations);

// Protected routes - Supervisor only
router.route("/students").get(verifyJWT, verifyRole("supervisor"), getStudentsUnderSupervisor);
router.route("/verify/:id").put(verifyJWT, verifyRole("supervisor"), verifyTherapist);

export default router;
