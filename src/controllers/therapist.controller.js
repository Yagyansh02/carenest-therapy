import { Therapist } from "../models/therapist.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create therapist profile
 * @route POST /api/v1/therapists/profile
 * @access Private (Therapist only)
 */
const createTherapistProfile = asyncHandler(async (req, res) => {
  const {
    bio,
    isStudent,
    licenseNumber,
    specializations,
    yearsOfExperience,
    sessionRate,
    qualifications,
    availability,
    supervisorId,
  } = req.body;

  // Check if user has therapist role
  if (req.user.role !== "therapist") {
    throw new ApiError(403, "Only therapists can create therapist profiles");
  }

  // Check if profile already exists
  const existingProfile = await Therapist.findOne({ userId: req.user._id });
  if (existingProfile) {
    throw new ApiError(409, "Therapist profile already exists. Use update endpoint.");
  }

  // Validate required fields
  if (!sessionRate || sessionRate <= 0) {
    throw new ApiError(400, "Valid session rate is required");
  }

  // If student, supervisor is required
  if (isStudent && !supervisorId) {
    throw new ApiError(400, "Supervisor ID is required for student therapists");
  }

  // Verify supervisor exists and has supervisor role
  if (supervisorId) {
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== "supervisor") {
      throw new ApiError(400, "Invalid supervisor ID");
    }
  }

  // Create therapist profile
  const therapistProfile = await Therapist.create({
    userId: req.user._id,
    bio,
    isStudent: isStudent || false,
    licenseNumber,
    specializations: specializations || [],
    yearsOfExperience: yearsOfExperience || 0,
    sessionRate,
    qualifications: qualifications || [],
    availability: availability || {},
    supervisorId: supervisorId || null,
    verificationStatus: "pending",
  });

  const createdProfile = await Therapist.findById(therapistProfile._id)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email");

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdProfile, "Therapist profile created successfully")
    );
});

/**
 * Update therapist profile
 * @route PUT /api/v1/therapists/profile
 * @access Private (Therapist only)
 */
const updateTherapistProfile = asyncHandler(async (req, res) => {
  const {
    bio,
    licenseNumber,
    specializations,
    yearsOfExperience,
    sessionRate,
    qualifications,
    supervisorId,
  } = req.body;

  // Find therapist profile
  const therapistProfile = await Therapist.findOne({ userId: req.user._id });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found. Please create one first.");
  }

  // Update fields if provided
  if (bio !== undefined) therapistProfile.bio = bio;
  if (licenseNumber !== undefined) therapistProfile.licenseNumber = licenseNumber;
  if (specializations !== undefined) therapistProfile.specializations = specializations;
  if (yearsOfExperience !== undefined) therapistProfile.yearsOfExperience = yearsOfExperience;
  if (sessionRate !== undefined) {
    if (sessionRate <= 0) {
      throw new ApiError(400, "Session rate must be greater than 0");
    }
    therapistProfile.sessionRate = sessionRate;
  }
  if (qualifications !== undefined) therapistProfile.qualifications = qualifications;
  
  // Verify supervisor if provided
  if (supervisorId !== undefined) {
    if (supervisorId) {
      const supervisor = await User.findById(supervisorId);
      if (!supervisor || supervisor.role !== "supervisor") {
        throw new ApiError(400, "Invalid supervisor ID");
      }
    }
    therapistProfile.supervisorId = supervisorId;
  }

  await therapistProfile.save();

  const updatedProfile = await Therapist.findById(therapistProfile._id)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Therapist profile updated successfully")
    );
});

/**
 * Get therapist by ID
 * @route GET /api/v1/therapists/:id
 * @access Public
 */
const getTherapistById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const therapist = await Therapist.findById(id)
    .populate("userId", "fullName email role")
    .populate("supervisorId", "fullName email");

  if (!therapist) {
    throw new ApiError(404, "Therapist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, therapist, "Therapist fetched successfully"));
});

/**
 * Get all therapists with filters and pagination
 * @route GET /api/v1/therapists
 * @access Public
 */
const getAllTherapists = asyncHandler(async (req, res) => {
  const {
    specialization,
    minRating,
    maxRate,
    minRate,
    minExperience,
    verifiedOnly,
    sortBy,
    page = 1,
    limit = 10,
  } = req.query;

  // Build filter query
  const filter = {};

  if (specialization) {
    filter.specializations = { $in: [specialization] };
  }

  if (minRating) {
    filter.averageRating = { $gte: parseFloat(minRating) };
  }

  if (minRate || maxRate) {
    filter.sessionRate = {};
    if (minRate) filter.sessionRate.$gte = parseFloat(minRate);
    if (maxRate) filter.sessionRate.$lte = parseFloat(maxRate);
  }

  if (minExperience) {
    filter.yearsOfExperience = { $gte: parseInt(minExperience) };
  }

  if (verifiedOnly === "true") {
    filter.verificationStatus = "verified";
  }

  // Build sort query
  let sort = {};
  if (sortBy === "rating") {
    sort.averageRating = -1;
  } else if (sortBy === "experience") {
    sort.yearsOfExperience = -1;
  } else if (sortBy === "rate-asc") {
    sort.sessionRate = 1;
  } else if (sortBy === "rate-desc") {
    sort.sessionRate = -1;
  } else {
    sort.createdAt = -1; // default sort by newest
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit) > 50 ? 50 : parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const therapists = await Therapist.find(filter)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalTherapists = await Therapist.countDocuments(filter);
  const totalPages = Math.ceil(totalTherapists / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        therapists,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalTherapists,
          hasMore: pageNum < totalPages,
        },
      },
      "Therapists fetched successfully"
    )
  );
});

/**
 * Update therapist availability
 * @route PUT /api/v1/therapists/availability
 * @access Private (Therapist only)
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;

  if (!availability || typeof availability !== "object") {
    throw new ApiError(400, "Valid availability object is required");
  }

  // Validate availability structure
  const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  for (const day in availability) {
    if (!validDays.includes(day.toLowerCase())) {
      throw new ApiError(400, `Invalid day: ${day}`);
    }

    if (!Array.isArray(availability[day])) {
      throw new ApiError(400, `Availability for ${day} must be an array`);
    }

    for (const slot of availability[day]) {
      if (!slot.start || !slot.end) {
        throw new ApiError(400, "Each time slot must have start and end time");
      }

      if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
        throw new ApiError(400, "Time must be in HH:MM format (24-hour)");
      }

      // Check start time is before end time
      const [startHour, startMin] = slot.start.split(":").map(Number);
      const [endHour, endMin] = slot.end.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        throw new ApiError(400, "Start time must be before end time");
      }
    }
  }

  // Find and update therapist profile
  const therapistProfile = await Therapist.findOne({ userId: req.user._id });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  therapistProfile.availability = availability;
  await therapistProfile.save();

  const updatedProfile = await Therapist.findById(therapistProfile._id)
    .populate("userId", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Availability updated successfully")
    );
});

/**
 * Update therapist qualifications
 * @route PUT /api/v1/therapists/qualifications
 * @access Private (Therapist only)
 */
const updateQualifications = asyncHandler(async (req, res) => {
  const { qualifications } = req.body;

  if (!Array.isArray(qualifications)) {
    throw new ApiError(400, "Qualifications must be an array");
  }

  // Validate each qualification
  const currentYear = new Date().getFullYear();
  for (const qual of qualifications) {
    if (!qual.degree || !qual.institution) {
      throw new ApiError(400, "Each qualification must have degree and institution");
    }

    if (qual.year && (qual.year < 1950 || qual.year > currentYear)) {
      throw new ApiError(400, `Invalid year: ${qual.year}`);
    }
  }

  // Find and update therapist profile
  const therapistProfile = await Therapist.findOne({ userId: req.user._id });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  therapistProfile.qualifications = qualifications;
  await therapistProfile.save();

  const updatedProfile = await Therapist.findById(therapistProfile._id)
    .populate("userId", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Qualifications updated successfully")
    );
});

/**
 * Update therapist specializations
 * @route PUT /api/v1/therapists/specializations
 * @access Private (Therapist only)
 */
const updateSpecializations = asyncHandler(async (req, res) => {
  const { specializations } = req.body;

  if (!Array.isArray(specializations)) {
    throw new ApiError(400, "Specializations must be an array");
  }

  // Validate specializations are not empty strings
  for (const spec of specializations) {
    if (typeof spec !== "string" || spec.trim() === "") {
      throw new ApiError(400, "Each specialization must be a non-empty string");
    }
  }

  // Find and update therapist profile
  const therapistProfile = await Therapist.findOne({ userId: req.user._id });
  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  therapistProfile.specializations = specializations;
  await therapistProfile.save();

  const updatedProfile = await Therapist.findById(therapistProfile._id)
    .populate("userId", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Specializations updated successfully")
    );
});

/**
 * Get students under supervisor
 * @route GET /api/v1/therapists/students
 * @access Private (Supervisor only)
 */
const getStudentsUnderSupervisor = asyncHandler(async (req, res) => {
  // Find all student therapists under this supervisor
  const students = await Therapist.find({
    supervisorId: req.user._id,
    isStudent: true,
  })
    .populate("userId", "fullName email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { students, count: students.length },
        "Students fetched successfully"
      )
    );
});

/**
 * Verify therapist profile
 * @route PUT /api/v1/therapists/verify/:id
 * @access Private (Supervisor only)
 */
const verifyTherapist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  // Validate status
  if (!["verified", "rejected"].includes(status)) {
    throw new ApiError(400, "Status must be either 'verified' or 'rejected'");
  }

  // Find therapist profile
  const therapist = await Therapist.findById(id).populate("userId");
  if (!therapist) {
    throw new ApiError(404, "Therapist not found");
  }

  // Check authorization
  // If student therapist, only their supervisor can verify
  if (therapist.isStudent) {
    if (!therapist.supervisorId || therapist.supervisorId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You can only verify your own students");
    }
  }
  // For non-student therapists, any supervisor can verify

  // Update verification status
  therapist.verificationStatus = status;
  await therapist.save();

  const updatedTherapist = await Therapist.findById(therapist._id)
    .populate("userId", "fullName email")
    .populate("supervisorId", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedTherapist,
        `Therapist ${status === "verified" ? "verified" : "rejected"} successfully`
      )
    );
});

/**
 * Delete therapist profile (soft delete)
 * @route DELETE /api/v1/therapists/profile
 * @access Private (Therapist only)
 */
const deleteTherapistProfile = asyncHandler(async (req, res) => {
  const therapistProfile = await Therapist.findOneAndDelete({ userId: req.user._id });

  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Therapist profile deleted successfully"));
});

/**
 * Get current therapist's profile
 * @route GET /api/v1/therapists/me
 * @access Private (Therapist only)
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const therapistProfile = await Therapist.findOne({ userId: req.user._id })
    .populate("userId", "fullName email role")
    .populate("supervisorId", "fullName email");

  if (!therapistProfile) {
    throw new ApiError(404, "Therapist profile not found. Please create one first.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, therapistProfile, "Profile fetched successfully"));
});

export {
  createTherapistProfile,
  updateTherapistProfile,
  getTherapistById,
  getAllTherapists,
  updateAvailability,
  updateQualifications,
  updateSpecializations,
  getStudentsUnderSupervisor,
  verifyTherapist,
  deleteTherapistProfile,
  getMyProfile,
};
