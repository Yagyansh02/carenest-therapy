import { Supervisor } from "../models/supervisor.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create supervisor profile
 * @route POST /api/v1/supervisors/profile
 * @access Private (Supervisor only)
 */
const createSupervisorProfile = asyncHandler(async (req, res) => {
  const { professionalLicenseNumber } = req.body;

  // Check if user has supervisor role
  if (req.user.role !== "supervisor") {
    throw new ApiError(403, "Only supervisors can create supervisor profiles");
  }

  // Check if profile already exists
  const existingProfile = await Supervisor.findOne({ userId: req.user._id });
  if (existingProfile) {
    throw new ApiError(409, "Supervisor profile already exists. Use update endpoint.");
  }

  // Validate required fields
  if (!professionalLicenseNumber || professionalLicenseNumber.trim() === "") {
    throw new ApiError(400, "Professional license number is required");
  }

  // Check if license number already exists
  const existingLicense = await Supervisor.findOne({ professionalLicenseNumber });
  if (existingLicense) {
    throw new ApiError(409, "This license number is already registered");
  }

  // Create supervisor profile
  const supervisorProfile = await Supervisor.create({
    userId: req.user._id,
    professionalLicenseNumber: professionalLicenseNumber.trim(),
    supervisedStudents: [],
  });

  const createdProfile = await Supervisor.findById(supervisorProfile._id)
    .populate("userId", "fullName email role")
    .populate("supervisedStudents", "fullName email");

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdProfile, "Supervisor profile created successfully")
    );
});

/**
 * Update supervisor profile
 * @route PUT /api/v1/supervisors/profile
 * @access Private (Supervisor only)
 */
const updateSupervisorProfile = asyncHandler(async (req, res) => {
  const { professionalLicenseNumber } = req.body;

  // Find supervisor profile
  const supervisorProfile = await Supervisor.findOne({ userId: req.user._id });
  if (!supervisorProfile) {
    throw new ApiError(404, "Supervisor profile not found. Please create one first.");
  }

  // Update professional license number if provided
  if (professionalLicenseNumber !== undefined) {
    if (!professionalLicenseNumber || professionalLicenseNumber.trim() === "") {
      throw new ApiError(400, "Professional license number cannot be empty");
    }

    // Check if new license number already exists (excluding current supervisor)
    const existingLicense = await Supervisor.findOne({ 
      professionalLicenseNumber: professionalLicenseNumber.trim(),
      _id: { $ne: supervisorProfile._id }
    });
    
    if (existingLicense) {
      throw new ApiError(409, "This license number is already registered");
    }

    supervisorProfile.professionalLicenseNumber = professionalLicenseNumber.trim();
  }

  await supervisorProfile.save();

  const updatedProfile = await Supervisor.findById(supervisorProfile._id)
    .populate("userId", "fullName email role")
    .populate("supervisedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Supervisor profile updated successfully")
    );
});

/**
 * Get supervisor by ID
 * @route GET /api/v1/supervisors/:id
 * @access Public
 */
const getSupervisorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const supervisor = await Supervisor.findById(id)
    .populate("userId", "fullName email role createdAt")
    .populate("supervisedStudents", "fullName email");

  if (!supervisor) {
    throw new ApiError(404, "Supervisor not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, supervisor, "Supervisor fetched successfully"));
});

/**
 * Get all supervisors with optional pagination
 * @route GET /api/v1/supervisors
 * @access Public
 */
const getAllSupervisors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  // Build filter query
  const filter = {};

  // If search term provided, search in user's fullName and email
  let pipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    {
      $unwind: "$userDetails"
    }
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "userDetails.fullName": { $regex: search, $options: "i" } },
          { "userDetails.email": { $regex: search, $options: "i" } },
          { "professionalLicenseNumber": { $regex: search, $options: "i" } }
        ]
      }
    });
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit) > 50 ? 50 : parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Add pagination to pipeline
  pipeline.push(
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: "users",
        localField: "supervisedStudents",
        foreignField: "_id",
        as: "supervisedStudentsDetails"
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        professionalLicenseNumber: 1,
        supervisedStudents: 1,
        createdAt: 1,
        updatedAt: 1,
        userDetails: {
          _id: 1,
          fullName: 1,
          email: 1,
          role: 1,
          createdAt: 1
        },
        supervisedStudentsDetails: {
          _id: 1,
          fullName: 1,
          email: 1
        }
      }
    }
  );

  // Execute aggregation
  const supervisors = await Supervisor.aggregate(pipeline);

  // Count total documents for pagination
  let countPipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    {
      $unwind: "$userDetails"
    }
  ];

  if (search) {
    countPipeline.push({
      $match: {
        $or: [
          { "userDetails.fullName": { $regex: search, $options: "i" } },
          { "userDetails.email": { $regex: search, $options: "i" } },
          { "professionalLicenseNumber": { $regex: search, $options: "i" } }
        ]
      }
    });
  }

  countPipeline.push({ $count: "total" });
  const countResult = await Supervisor.aggregate(countPipeline);
  const totalSupervisors = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalSupervisors / limitNum);

  // Transform data to match populate format
  const transformedSupervisors = supervisors.map(supervisor => ({
    _id: supervisor._id,
    userId: supervisor.userDetails,
    professionalLicenseNumber: supervisor.professionalLicenseNumber,
    supervisedStudents: supervisor.supervisedStudentsDetails,
    createdAt: supervisor.createdAt,
    updatedAt: supervisor.updatedAt
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        supervisors: transformedSupervisors,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalSupervisors,
          hasMore: pageNum < totalPages,
        },
      },
      "Supervisors fetched successfully"
    )
  );
});

/**
 * Get current supervisor's profile
 * @route GET /api/v1/supervisors/me
 * @access Private (Supervisor only)
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const supervisorProfile = await Supervisor.findOne({ userId: req.user._id })
    .populate("userId", "fullName email role")
    .populate("supervisedStudents", "fullName email");

  if (!supervisorProfile) {
    throw new ApiError(404, "Supervisor profile not found. Please create one first.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, supervisorProfile, "Profile fetched successfully"));
});

/**
 * Add student to supervisor's list
 * @route POST /api/v1/supervisors/students/:studentId
 * @access Private (Supervisor only)
 */
const addStudentToSupervision = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Find supervisor profile
  const supervisorProfile = await Supervisor.findOne({ userId: req.user._id });
  if (!supervisorProfile) {
    throw new ApiError(404, "Supervisor profile not found");
  }

  // Check if student exists and has therapist role
  const student = await User.findById(studentId);
  if (!student || student.role !== "therapist") {
    throw new ApiError(404, "Student therapist not found");
  }

  // Check if student is already supervised
  if (supervisorProfile.supervisedStudents.includes(studentId)) {
    throw new ApiError(409, "Student is already under your supervision");
  }

  // Add student to supervision list
  supervisorProfile.supervisedStudents.push(studentId);
  await supervisorProfile.save();

  const updatedProfile = await Supervisor.findById(supervisorProfile._id)
    .populate("userId", "fullName email role")
    .populate("supervisedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Student added to supervision successfully")
    );
});

/**
 * Remove student from supervisor's list
 * @route DELETE /api/v1/supervisors/students/:studentId
 * @access Private (Supervisor only)
 */
const removeStudentFromSupervision = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Find supervisor profile
  const supervisorProfile = await Supervisor.findOne({ userId: req.user._id });
  if (!supervisorProfile) {
    throw new ApiError(404, "Supervisor profile not found");
  }

  // Check if student is in supervision list
  const studentIndex = supervisorProfile.supervisedStudents.indexOf(studentId);
  if (studentIndex === -1) {
    throw new ApiError(404, "Student is not under your supervision");
  }

  // Remove student from supervision list
  supervisorProfile.supervisedStudents.splice(studentIndex, 1);
  await supervisorProfile.save();

  const updatedProfile = await Supervisor.findById(supervisorProfile._id)
    .populate("userId", "fullName email role")
    .populate("supervisedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Student removed from supervision successfully")
    );
});

/**
 * Delete supervisor profile
 * @route DELETE /api/v1/supervisors/profile
 * @access Private (Supervisor only)
 */
const deleteSupervisorProfile = asyncHandler(async (req, res) => {
  const supervisorProfile = await Supervisor.findOneAndDelete({ userId: req.user._id });

  if (!supervisorProfile) {
    throw new ApiError(404, "Supervisor profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Supervisor profile deleted successfully"));
});

export {
  createSupervisorProfile,
  updateSupervisorProfile,
  getSupervisorById,
  getAllSupervisors,
  getMyProfile,
  addStudentToSupervision,
  removeStudentFromSupervision,
  deleteSupervisorProfile,
};