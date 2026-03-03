import { College } from "../models/college.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create college profile
 * @route POST /api/v1/colleges/profile
 * @access Private (College only)
 */
const createCollegeProfile = asyncHandler(async (req, res) => {
  const {
    institutionName,
    affiliationNumber,
    address,
    contactPhone,
    website,
    contactPersonName,
    contactPersonEmail,
    department,
    agreementStartDate,
    agreementEndDate,
  } = req.body;

  // Check if user has college role
  if (req.user.role !== "college") {
    throw new ApiError(403, "Only college users can create college profiles");
  }

  // Check if profile already exists
  const existingProfile = await College.findOne({ userId: req.user._id });
  if (existingProfile) {
    throw new ApiError(409, "College profile already exists. Use update endpoint.");
  }

  // Validate required fields
  if (!institutionName || institutionName.trim() === "") {
    throw new ApiError(400, "Institution name is required");
  }

  if (!affiliationNumber || affiliationNumber.trim() === "") {
    throw new ApiError(400, "Affiliation number is required");
  }

  // Check if affiliation number already exists
  const existingAffiliation = await College.findOne({ affiliationNumber: affiliationNumber.trim() });
  if (existingAffiliation) {
    throw new ApiError(409, "This affiliation number is already registered");
  }

  // Create college profile
  const collegeProfile = await College.create({
    userId: req.user._id,
    institutionName: institutionName.trim(),
    affiliationNumber: affiliationNumber.trim(),
    address: address?.trim() || "",
    contactPhone: contactPhone?.trim() || "",
    website: website?.trim() || "",
    contactPersonName: contactPersonName?.trim() || "",
    contactPersonEmail: contactPersonEmail?.trim() || "",
    department: department?.trim() || "",
    affiliatedStudents: [],
    agreementStartDate: agreementStartDate || null,
    agreementEndDate: agreementEndDate || null,
  });

  const createdProfile = await College.findById(collegeProfile._id)
    .populate("userId", "fullName email role")
    .populate("affiliatedStudents", "fullName email");

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdProfile, "College profile created successfully")
    );
});

/**
 * Update college profile
 * @route PUT /api/v1/colleges/profile
 * @access Private (College only)
 */
const updateCollegeProfile = asyncHandler(async (req, res) => {
  const {
    institutionName,
    affiliationNumber,
    address,
    contactPhone,
    website,
    contactPersonName,
    contactPersonEmail,
    department,
    agreementStartDate,
    agreementEndDate,
  } = req.body;

  // Find college profile
  const collegeProfile = await College.findOne({ userId: req.user._id });
  if (!collegeProfile) {
    throw new ApiError(404, "College profile not found. Please create one first.");
  }

  // Update institution name if provided
  if (institutionName !== undefined) {
    if (!institutionName || institutionName.trim() === "") {
      throw new ApiError(400, "Institution name cannot be empty");
    }
    collegeProfile.institutionName = institutionName.trim();
  }

  // Update affiliation number if provided
  if (affiliationNumber !== undefined) {
    if (!affiliationNumber || affiliationNumber.trim() === "") {
      throw new ApiError(400, "Affiliation number cannot be empty");
    }

    // Check if new affiliation number already exists (excluding current college)
    const existingAffiliation = await College.findOne({
      affiliationNumber: affiliationNumber.trim(),
      _id: { $ne: collegeProfile._id },
    });

    if (existingAffiliation) {
      throw new ApiError(409, "This affiliation number is already registered");
    }

    collegeProfile.affiliationNumber = affiliationNumber.trim();
  }

  // Update optional fields
  if (address !== undefined) collegeProfile.address = address.trim();
  if (contactPhone !== undefined) collegeProfile.contactPhone = contactPhone.trim();
  if (website !== undefined) collegeProfile.website = website.trim();
  if (contactPersonName !== undefined) collegeProfile.contactPersonName = contactPersonName.trim();
  if (contactPersonEmail !== undefined) collegeProfile.contactPersonEmail = contactPersonEmail.trim();
  if (department !== undefined) collegeProfile.department = department.trim();
  if (agreementStartDate !== undefined) collegeProfile.agreementStartDate = agreementStartDate;
  if (agreementEndDate !== undefined) collegeProfile.agreementEndDate = agreementEndDate;

  await collegeProfile.save();

  const updatedProfile = await College.findById(collegeProfile._id)
    .populate("userId", "fullName email role")
    .populate("affiliatedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "College profile updated successfully")
    );
});

/**
 * Get college by ID
 * @route GET /api/v1/colleges/:id
 * @access Public
 */
const getCollegeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const college = await College.findById(id)
    .populate("userId", "fullName email role createdAt")
    .populate("affiliatedStudents", "fullName email");

  if (!college) {
    throw new ApiError(404, "College not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, college, "College fetched successfully"));
});

/**
 * Get all colleges with optional pagination
 * @route GET /api/v1/colleges
 * @access Public
 */
const getAllColleges = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  // Build aggregation pipeline
  let pipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: "$userDetails",
    },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "userDetails.fullName": { $regex: search, $options: "i" } },
          { "userDetails.email": { $regex: search, $options: "i" } },
          { institutionName: { $regex: search, $options: "i" } },
          { affiliationNumber: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
        ],
      },
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
        localField: "affiliatedStudents",
        foreignField: "_id",
        as: "affiliatedStudentsDetails",
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        institutionName: 1,
        affiliationNumber: 1,
        address: 1,
        contactPhone: 1,
        website: 1,
        contactPersonName: 1,
        contactPersonEmail: 1,
        department: 1,
        affiliatedStudents: 1,
        agreementStartDate: 1,
        agreementEndDate: 1,
        verificationStatus: 1,
        createdAt: 1,
        updatedAt: 1,
        userDetails: {
          _id: 1,
          fullName: 1,
          email: 1,
          role: 1,
          createdAt: 1,
        },
        affiliatedStudentsDetails: {
          _id: 1,
          fullName: 1,
          email: 1,
        },
      },
    }
  );

  // Execute aggregation
  const colleges = await College.aggregate(pipeline);

  // Count total documents for pagination
  let countPipeline = [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: "$userDetails",
    },
  ];

  if (search) {
    countPipeline.push({
      $match: {
        $or: [
          { "userDetails.fullName": { $regex: search, $options: "i" } },
          { "userDetails.email": { $regex: search, $options: "i" } },
          { institutionName: { $regex: search, $options: "i" } },
          { affiliationNumber: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  countPipeline.push({ $count: "total" });
  const countResult = await College.aggregate(countPipeline);
  const totalColleges = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalColleges / limitNum);

  // Transform data to match populate format
  const transformedColleges = colleges.map((college) => ({
    _id: college._id,
    userId: college.userDetails,
    institutionName: college.institutionName,
    affiliationNumber: college.affiliationNumber,
    address: college.address,
    contactPhone: college.contactPhone,
    website: college.website,
    contactPersonName: college.contactPersonName,
    contactPersonEmail: college.contactPersonEmail,
    department: college.department,
    affiliatedStudents: college.affiliatedStudentsDetails,
    agreementStartDate: college.agreementStartDate,
    agreementEndDate: college.agreementEndDate,
    verificationStatus: college.verificationStatus,
    createdAt: college.createdAt,
    updatedAt: college.updatedAt,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        colleges: transformedColleges,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalColleges,
          hasMore: pageNum < totalPages,
        },
      },
      "Colleges fetched successfully"
    )
  );
});

/**
 * Get current college's profile
 * @route GET /api/v1/colleges/me
 * @access Private (College only)
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const collegeProfile = await College.findOne({ userId: req.user._id })
    .populate("userId", "fullName email role")
    .populate("affiliatedStudents", "fullName email");

  if (!collegeProfile) {
    throw new ApiError(404, "College profile not found. Please create one first.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, collegeProfile, "Profile fetched successfully"));
});

/**
 * Add student to college's affiliated list
 * @route POST /api/v1/colleges/students/:studentId
 * @access Private (College only)
 */
const addStudentToCollege = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Find college profile
  const collegeProfile = await College.findOne({ userId: req.user._id });
  if (!collegeProfile) {
    throw new ApiError(404, "College profile not found");
  }

  // Check if student exists and has therapist role (interns are therapists with isStudent=true)
  const student = await User.findById(studentId);
  if (!student || student.role !== "therapist") {
    throw new ApiError(404, "Student therapist not found");
  }

  // Check if student is already affiliated
  if (collegeProfile.affiliatedStudents.includes(studentId)) {
    throw new ApiError(409, "Student is already affiliated with your college");
  }

  // Add student to affiliated list
  collegeProfile.affiliatedStudents.push(studentId);
  await collegeProfile.save();

  const updatedProfile = await College.findById(collegeProfile._id)
    .populate("userId", "fullName email role")
    .populate("affiliatedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Student added to college successfully")
    );
});

/**
 * Remove student from college's affiliated list
 * @route DELETE /api/v1/colleges/students/:studentId
 * @access Private (College only)
 */
const removeStudentFromCollege = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Find college profile
  const collegeProfile = await College.findOne({ userId: req.user._id });
  if (!collegeProfile) {
    throw new ApiError(404, "College profile not found");
  }

  // Check if student is in affiliated list
  const studentIndex = collegeProfile.affiliatedStudents.indexOf(studentId);
  if (studentIndex === -1) {
    throw new ApiError(404, "Student is not affiliated with your college");
  }

  // Remove student from affiliated list
  collegeProfile.affiliatedStudents.splice(studentIndex, 1);
  await collegeProfile.save();

  const updatedProfile = await College.findById(collegeProfile._id)
    .populate("userId", "fullName email role")
    .populate("affiliatedStudents", "fullName email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProfile, "Student removed from college successfully")
    );
});

/**
 * Delete college profile
 * @route DELETE /api/v1/colleges/profile
 * @access Private (College only)
 */
const deleteCollegeProfile = asyncHandler(async (req, res) => {
  const collegeProfile = await College.findOneAndDelete({ userId: req.user._id });

  if (!collegeProfile) {
    throw new ApiError(404, "College profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "College profile deleted successfully"));
});

export {
  createCollegeProfile,
  updateCollegeProfile,
  getCollegeById,
  getAllColleges,
  getMyProfile,
  addStudentToCollege,
  removeStudentFromCollege,
  deleteCollegeProfile,
};
