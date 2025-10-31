import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Get all users (admin functionality)
 * @route GET /api/v1/users
 * @access Private (requires authentication and supervisor role)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken");
  
  res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
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
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullName },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");
  
  res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

export { getAllUsers, getUserById, updateUserProfile };
