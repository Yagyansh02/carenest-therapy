import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
  // Step 1:  Get user details from frontend
  // Step 2 : validation logic -not empty
  // Check if user already exists :: username and email
  // check if avatar and images : compulsory
  // if yes then upload them to cloudinary , check avatar is uploaded on cloudinary
  // Create user object - create entry in DB
  // remove password and refresh token field from response
  // check for user creation
  // return response else send error

  const { fullName, email, password } = req.body;
  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  const user = await User.create({ fullName, email, password });

  const createdUser = user.toObject();
  delete createdUser.password;
  delete createdUser.refreshtoken;

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
