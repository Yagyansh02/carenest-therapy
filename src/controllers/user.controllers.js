import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
/*
    Register user workflow (high-level):

    1. Read user input from req.body (expect fullName, email, password).
    2. Validate required fields are present and not empty.
    3. Verify no existing user has the same email.
    4. (If avatar/images are supported) upload them to Cloudinary and confirm uploads succeed.
    5. Create the new user record in the database.
    6. Remove sensitive fields (password, refreshtoken) from the object returned to the client.
    7. On success respond with HTTP 201 and the created user; on failure throw an ApiError with an appropriate status and message.
*/

  const { fullName, email, password } = req.body;
  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  const user = await User.create({ fullName, email, password });

  const createdUser = user.toObject();
  delete createdUser.password;
  delete createdUser.refreshToken;

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
