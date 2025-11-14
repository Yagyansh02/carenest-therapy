// HTTP Testing Examples for CareNest Therapy Auth System
// You can use these with REST clients like Postman, Thunder Client, or curl

/**
 * BASE URL
 */
const BASE_URL = "http://localhost:8000/api/v1";

/**
 * 1. REGISTER USER
 * POST /auth/register
 */
const registerExample = {
  method: "POST",
  url: `${BASE_URL}/auth/register`,
  headers: {
    "Content-Type": "application/json"
  },
  body: {
    fullName: "John Doe",
    email: "john@example.com",
    password: "password123",
    role: "patient" // optional: patient, therapist, supervisor
  }
};

/**
 * 2. LOGIN USER
 * POST /auth/login
 */
const loginExample = {
  method: "POST",
  url: `${BASE_URL}/auth/login`,
  headers: {
    "Content-Type": "application/json"
  },
  body: {
    email: "john@example.com",
    password: "password123"
  }
};

/**
 * 3. GET CURRENT USER
 * GET /auth/me
 */
const getCurrentUserExample = {
  method: "GET",
  url: `${BASE_URL}/auth/me`,
  headers: {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
  }
};

/**
 * 4. LOGOUT
 * POST /auth/logout
 */
const logoutExample = {
  method: "POST",
  url: `${BASE_URL}/auth/logout`,
  headers: {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
  }
};

/**
 * 5. REFRESH TOKEN
 * POST /auth/refresh-token
 */
const refreshTokenExample = {
  method: "POST",
  url: `${BASE_URL}/auth/refresh-token`,
  headers: {
    "Content-Type": "application/json"
  },
  body: {
    refreshToken: "YOUR_REFRESH_TOKEN_HERE"
  }
};

/**
 * 6. CHANGE PASSWORD
 * POST /auth/change-password
 */
const changePasswordExample = {
  method: "POST",
  url: `${BASE_URL}/auth/change-password`,
  headers: {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE",
    "Content-Type": "application/json"
  },
  body: {
    oldPassword: "password123",
    newPassword: "newpassword456"
  }
};

/**
 * 7. UPDATE PROFILE
 * PATCH /users/profile
 */
const updateProfileExample = {
  method: "PATCH",
  url: `${BASE_URL}/users/profile`,
  headers: {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE",
    "Content-Type": "application/json"
  },
  body: {
    fullName: "John Smith"
  }
};

/**
 * 8. GET ALL USERS (Supervisor only)
 * GET /users
 */
const getAllUsersExample = {
  method: "GET",
  url: `${BASE_URL}/users`,
  headers: {
    "Authorization": "Bearer YOUR_SUPERVISOR_ACCESS_TOKEN_HERE"
  }
};

/**
 * 9. GET USER BY ID
 * GET /users/:id
 */
const getUserByIdExample = {
  method: "GET",
  url: `${BASE_URL}/users/USER_ID_HERE`,
  headers: {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
  }
};

// CURL Examples

/*
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"password123","role":"patient"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get Current User
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Change Password
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"password123","newPassword":"newpassword456"}'
*/

console.log("API Testing Examples loaded. Use with your preferred REST client.");
