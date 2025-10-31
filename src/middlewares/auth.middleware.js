import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to verify JWT token and attach authenticated user to request object.
 * 
 * Extracts token from:
 * 1. Authorization header (Bearer token)
 * 2. Cookies (accessToken)
 * 
 * @throws {ApiError} 401 - If token is missing or invalid
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

/**
 * Middleware to verify user has one of the specified roles.
 * Must be used after verifyJWT middleware.
 * 
 * @param {...string} roles - One or more allowed roles (e.g., "patient", "therapist", "supervisor")
 * @returns {Function} Express middleware function
 * @throws {ApiError} 403 - If user doesn't have required role
 * 
 * @example
 * router.get("/admin", verifyJWT, verifyRole("supervisor"), controller);
 */
export const verifyRole = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized request");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role: ${roles.join(" or ")}`
      );
    }

    next();
  });
};
