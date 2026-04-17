/**
 * EXAMPLE: How to integrate Arcjet Rate Limiting into existing routes
 * 
 * This file shows the updated user.routes.js with Arcjet protection
 * Copy the relevant parts to your actual route files
 */

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
  getUserDetail,
  updateUserProfile,
  deleteUser,
  toggleUserActive,
} from "../controllers/user.controllers.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

// ===== ADD THESE IMPORTS =====
import { rateLimit } from "../middlewares/arcjet.middleware.js";
import { authRateLimiter, generalRateLimiter } from "../utils/arcjet.config.js";
// ==============================

const router = Router();

// ===== PROTECTED AUTH ROUTES WITH STRICT RATE LIMITING =====
// These routes are critical and should have stricter limits
router.route("/register").post(
  rateLimit(authRateLimiter), // 5 requests per minute
  registerUser
);

router.route("/login").post(
  rateLimit(authRateLimiter), // 5 requests per minute
  loginUser
);

router.route("/refresh-token").post(
  rateLimit(generalRateLimiter), // 100 requests per minute
  refreshAccessToken
);

// ===== PROTECTED ROUTES - REQUIRE AUTHENTICATION =====
router.use(verifyJWT);

// Auth related
router.route("/logout").post(logoutUser);
router.route("/me").get(getCurrentUser);
router.route("/change-password").post(
  rateLimit(authRateLimiter), // Password changes should be rate limited
  changePassword
);

// User management
router.route("/").get(verifyRole("admin"), getAllUsers);
router.route("/profile").patch(updateUserProfile);
router.route("/:id/detail").get(verifyRole("admin"), getUserDetail);
router.route("/:id").get(getUserById).delete(verifyRole("admin"), deleteUser);
router.route("/:id/toggle-active").patch(verifyRole("admin"), toggleUserActive);

export default router;
