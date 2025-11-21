import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserProfile,
} from "../controllers/user.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Protected routes - require authentication
router.use(verifyJWT);

// Auth related
router.route("/logout").post(logoutUser);
router.route("/me").get(getCurrentUser);
router.route("/change-password").post(changePassword);

// User management
router.route("/").get(getAllUsers);
router.route("/profile").patch(updateUserProfile);
router.route("/:id").get(getUserById);

export default router;