import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

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
 * Helper function to generate access and refresh tokens
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Object} { accessToken, refreshToken }
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong while generating tokens"
    );
  }
};

/**
 * Register a new user
 * 
 * @route POST /api/v1/users/register
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

  if (/\d/.test(fullName)) {
    throw new ApiError(400, "Full name cannot contain numbers");
  }

  // Check if user already exists
  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Validate role if provided
  const validRoles = ["patient", "therapist", "supervisor"];
  if (role && !validRoles.includes(role)) {
    throw new ApiError(
      400,
      "Invalid role. Must be patient, therapist, or supervisor"
    );
  }

  // Create user (password will be hashed by pre-save hook)
  const user = await User.create({
    fullName,
    email,
    password,
    role: role || "patient",
  });

  // Get user without sensitive data
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
 * @route POST /api/v1/users/login
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
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

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
 * @route POST /api/v1/users/logout
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
 * @route POST /api/v1/users/refresh-token
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
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

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
 * @route GET /api/v1/users/me
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
 * @route POST /api/v1/users/change-password
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

/**
 * Get all users (admin functionality)
 * @route GET /api/v1/users
 * @access Private (requires authentication and admin role)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 1000, role } = req.query;
  
  // Build query
  const query = {};
  if (role) {
    query.role = role;
  }
  
  const users = await User.find(query)
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));
  
  const total = await User.countDocuments(query);
  
  res
    .status(200)
    .json(new ApiResponse(200, { 
      users, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, "Users fetched successfully"));
});

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 * @access Private (requires authentication)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password -refreshToken");
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

/**
 * Update user profile
 * @route PATCH /api/v1/users/profile
 * @access Private (requires authentication)
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName } = req.body;
  
  if (!fullName || fullName.trim() === "") {
    throw new ApiError(400, "Full name is required");
  }

  if (/\d/.test(fullName)) {
    throw new ApiError(400, "Full name cannot contain numbers");
  }
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullName },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");
  
  res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

/**
 * Delete user by ID (Admin only)
 * @route DELETE /api/v1/users/:id
 * @access Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Prevent admin from deleting themselves
  if (id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete your own account");
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  await User.findByIdAndDelete(id);
  
  res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

/**
 * Toggle user active status (Admin only)
 * @route PATCH /api/v1/users/:id/toggle-active
 * @access Private (Admin only)
 */
const toggleUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Prevent admin from deactivating themselves
  if (id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  
  const updatedUser = await User.findById(id).select("-password -refreshToken");
  
  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`));
});

export { 
  registerUser, 
  loginUser, 
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  getAllUsers, 
  getUserById, 
  updateUserProfile,
  deleteUser,
  toggleUserActive
};
