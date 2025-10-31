# CareNest Therapy - Authentication System

## Overview

This authentication system provides secure user registration, login, and session management using JWT (JSON Web Tokens).

## Features

- ✅ User registration with role-based access (patient, therapist, supervisor)
- ✅ Secure login with bcrypt password hashing
- ✅ JWT-based authentication with access and refresh tokens
- ✅ Protected routes with role-based authorization
- ✅ Password change functionality
- ✅ Automatic token refresh
- ✅ HTTP-only cookies for enhanced security

## API Endpoints

### Public Routes

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "patient"  // optional: patient (default), therapist, or supervisor
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "message": "User registered successfully",
  "success": true
}
```

#### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "patient"
    },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "User logged in successfully",
  "success": true
}
```

**Note:** Tokens are also set as HTTP-only cookies.

#### 3. Refresh Access Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Protected Routes (Require Authentication)

#### 4. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

#### 5. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

#### 6. Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "currentpassword",
  "newPassword": "newpassword123"
}
```

### User Management Routes

#### 7. Get All Users (Supervisor Only)
```http
GET /api/v1/users
Authorization: Bearer <access_token>
```

#### 8. Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer <access_token>
```

#### 9. Update Profile
```http
PATCH /api/v1/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Updated Name"
}
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
CORS_ORIGIN=http://localhost:3000

# Generate these using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ACCESS_TOKEN_SECRET=your_access_token_secret_min_32_characters
REFRESH_TOKEN_SECRET=your_refresh_token_secret_min_32_characters

ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### 3. Generate Secure Secrets
Run this command to generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start the Server
```bash
npm run dev
```

## Authentication Flow

1. **Registration**: User registers → Password is hashed → User saved to DB
2. **Login**: User logs in → Credentials verified → Access & refresh tokens generated → Tokens sent in response & cookies
3. **Access Protected Routes**: Client sends access token → Server verifies token → Grants access
4. **Token Refresh**: Access token expires → Client sends refresh token → New access token issued
5. **Logout**: User logs out → Refresh token removed from DB → Cookies cleared

## Security Features

- **Password Hashing**: Bcrypt with 10 salt rounds
- **HTTP-only Cookies**: Prevents XSS attacks
- **CSRF Protection**: SameSite cookie attribute
- **Role-based Access Control**: Middleware to restrict routes by role
- **Token Expiry**: Short-lived access tokens (15 min), longer refresh tokens (7 days)
- **Secure Flag**: Cookies only sent over HTTPS in production

## Middleware

### `verifyJWT`
Validates JWT token and attaches user to `req.user`

### `verifyRole(...roles)`
Ensures authenticated user has one of the specified roles

**Example:**
```javascript
router.get("/admin", verifyJWT, verifyRole("supervisor"), controller);
```

## Error Handling

All errors are standardized using the `ApiError` class:

```javascript
throw new ApiError(statusCode, message, errors);
```

Global error handler catches and formats all errors consistently.

## Testing with Postman/Thunder Client

1. Register a user
2. Login to get tokens
3. Copy the `accessToken` from response
4. Add to Authorization header: `Bearer <token>`
5. Test protected routes

## Next Steps

- [ ] Add email verification
- [ ] Add password reset via email
- [ ] Add rate limiting for login attempts
- [ ] Add session management (track active sessions)
- [ ] Add OAuth integration (Google, GitHub)
- [ ] Add two-factor authentication (2FA)

## File Structure

```
src/
├── controllers/
│   ├── auth.controller.js    # Authentication logic
│   └── user.controllers.js   # User management logic
├── middlewares/
│   ├── auth.middleware.js    # JWT verification & role checking
│   └── error.middleware.js   # Global error handling
├── models/
│   └── user.models.js        # User schema with password hashing
├── routes/
│   ├── auth.routes.js        # Auth endpoints
│   └── user.routes.js        # User endpoints
└── utils/
    ├── ApiError.js           # Custom error class
    ├── ApiResponse.js        # Standardized response class
    ├── asyncHandler.js       # Async error wrapper
    └── generateTokens.js     # JWT token generation
```

## Support

For issues or questions, please refer to the project documentation or contact the development team.
