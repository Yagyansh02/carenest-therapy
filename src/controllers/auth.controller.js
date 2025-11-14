import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTokens } from "../utils/generateTokens.js";

/**
 * Cookie options for secure token storage
 */
const cookieOptions = {
  httpOnly: true, // prevents client-side JS from accessing cookies
  secure: process.env.NODE_ENV === "production", // only send over HTTPS in production
  sameSite: "strict", // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

/**
 * Register a new user
 * 
 * @route POST /api/v1/auth/register
 * @access Public
 * 
 * @body {string} fullName - User's full name
 * @body {string} email - User's email address
 * @body {string} password - User's password (will be hashed)
 * @body {string} [role=patient] - User role: "patient", "therapist", or "supervisor"
 * 
 * @returns {201} User registered successfully
 * @throws {400} All fields are required / Invalid role
 * @throws {409} User already exists
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  // Validation
  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Validate role if provided
  const validRoles = ["patient", "therapist", "supervisor"];
  if (role && !validRoles.includes(role)) {
    throw new ApiError(400, "Invalid role. Must be patient, therapist, or supervisor");
  }

  // Create user (password will be hashed by pre-save hook)
  const user = await User.create({
    fullName,
    email,
    password,
    role: role || "patient",
  });

  // Remove sensitive fields from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

/**
 * Login user and issue access & refresh tokens
 * 
 * @route POST /api/v1/auth/login
 * @access Public
 * 
 * @body {string} email - User's email
 * @body {string} password - User's password
 * 
 * @returns {200} Login successful with user data and tokens
 * @throws {400} Email and password are required
 * @throws {401} Invalid credentials
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Verify password using method defined in user model
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Get user without sensitive data
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Send response with cookies and tokens
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

/**
 * Logout user by clearing tokens
 * 
 * @route POST /api/v1/auth/logout
 * @access Private (requires authentication)
 * 
 * @returns {200} Logout successful
 */
const logoutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // removes field from document
      },
    },
    {
      new: true,
    }
  );

  // Clear cookies and send response
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/**
 * Refresh access token using refresh token
 * 
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 * 
 * @body {string} [refreshToken] - Refresh token (can also be in cookies)
 * 
 * @returns {200} New access token issued
 * @throws {401} Refresh token missing, invalid, or expired
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Check if refresh token matches the one stored in database
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

/**
 * Get current authenticated user's information
 * 
 * @route GET /api/v1/auth/me
 * @access Private (requires authentication)
 * 
 * @returns {200} Current user data
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

/**
 * Change user password
 * 
 * @route POST /api/v1/auth/change-password
 * @access Private (requires authentication)
 * 
 * @body {string} oldPassword - Current password
 * @body {string} newPassword - New password
 * 
 * @returns {200} Password changed successfully
 * @throws {400} All fields required / Incorrect old password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
};
