import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../controllers/user.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);


router.route("/").get(verifyRole("admin"), getAllUsers);

// Update current user's profile
router.route("/profile").patch(updateUserProfile);

// Get user by ID
router.route("/:id").get(getUserById);

export default router;