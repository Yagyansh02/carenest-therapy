# 🏥 CareNest Therapy - Backend API

A professional, secure, and scalable therapy management platform built with Node.js, Express, and MongoDB.

## 🌟 Overview

CareNest Therapy is a comprehensive mental health and wellness platform that connects patients with therapists and provides supervision capabilities. This repository contains the backend API with robust authentication, role-based access control, and session management.

## 🎯 Features

- ✅ **User Authentication** - Secure JWT-based authentication with access & refresh tokens
- ✅ **Role-Based Access Control** - Three user roles: Patient, Therapist, Supervisor
- ✅ **User Management** - Complete CRUD operations for users
- ✅ **Therapist Profile Management** - Complete profile system with qualifications, specializations, and availability
- ✅ **Student-Supervisor System** - Link students to supervisors with verification workflow
- ✅ **Search & Filter** - Advanced therapist search with multiple filters and sorting
- ✅ **Security** - Password hashing, HTTP-only cookies, CORS protection, input validation
- 🔜 **Session Management** - Therapy session scheduling and tracking
- 🔜 **Feedback System** - Patient feedback for therapists and supervisors
- 🔜 **Appointment Booking** - Schedule and manage therapy sessions
- 🔜 **Payment Integration** - Session payment processing

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vedant00Maske/CareNest-Therapy.git
   cd carenest-therapy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate JWT secrets**
   ```bash
   node generate-secrets.js
   ```

4. **Create .env file**
   ```bash
   copy .env.example .env
   ```
   Update with your MongoDB URI and generated secrets.

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Test the API**
   ```
   GET http://localhost:8000/health
   ```

📖 **For detailed setup instructions, see [Quick Start Guide](./docs/QUICK_START.md)**

## 📚 Documentation

- 📖 [Quick Start Guide](./docs/QUICK_START.md) - Step-by-step setup instructions
- 🔐 [Authentication API](./docs/AUTH_README.md) - Complete auth documentation
- 🏗️ [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - What was built & why
- 🗺️ [Migration Plan](./docs/MIGRATION_PLAN.md) - Complete backend migration roadmap
- 🧪 [API Examples](./docs/api-examples.js) - Test the endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcrypt
- **Environment**: dotenv
- **Security**: CORS, cookie-parser

## 📁 Project Structure

```
carenest-therapy/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Database schemas
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middleware
│   ├── utils/           # Helper functions
│   ├── db/              # Database connection
│   ├── app.js           # Express app setup
│   └── index.js         # Server entry point
├── docs/                # Documentation
├── .env.example         # Environment template
├── generate-secrets.js  # JWT secret generator
└── package.json         # Dependencies
```

## 🔌 API Endpoints

### Public Routes
- `GET /health` - API health check
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Protected Routes (Authentication Required)
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/change-password` - Change password
- `PATCH /api/v1/users/profile` - Update profile
- `GET /api/v1/users/:id` - Get user by ID

### Supervisor Only
- `GET /api/v1/users` - Get all users

### Therapist Management (Public)
- `GET /api/v1/therapists` - Get all therapists (with filters)
- `GET /api/v1/therapists/:id` - Get therapist by ID

### Therapist Profile (Therapist Only)
- `POST /api/v1/therapists/profile` - Create profile
- `PUT /api/v1/therapists/profile` - Update profile
- `GET /api/v1/therapists/me` - Get own profile
- `PUT /api/v1/therapists/availability` - Update availability
- `PUT /api/v1/therapists/qualifications` - Update qualifications
- `PUT /api/v1/therapists/specializations` - Update specializations
- `DELETE /api/v1/therapists/profile` - Delete profile

### Supervisor Operations
- `GET /api/v1/therapists/students` - Get students
- `PUT /api/v1/therapists/verify/:id` - Verify therapist

📖 **[View complete API documentation](./docs/AUTH_README.md)**

## 👥 User Roles

- **Patient** - Book sessions, provide feedback, manage appointments
- **Therapist** - Conduct sessions, manage patient notes, receive feedback
- **Supervisor** - Oversee therapists, view all data, manage users

## 🔒 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT access tokens (15-minute expiry)
- JWT refresh tokens (7-day expiry)
- HTTP-only cookies for token storage
- CORS protection
- Role-based authorization middleware
- Input validation and sanitization

## 🧪 Testing

Use Postman, Thunder Client, or curl to test endpoints:

```bash
# Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

📖 **[More examples in api-examples.js](./docs/api-examples.js)**

## 🤝 Contributing

This is a semester project being actively developed. Contributions, issues, and feature requests are welcome!

## 📝 Environment Variables

Required environment variables (see `.env.example`):

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000
ACCESS_TOKEN_SECRET=your_generated_secret
REFRESH_TOKEN_SECRET=your_generated_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

## 📌 Project Links

- **Design**: [Eraser.io Workspace](https://app.eraser.io/workspace/YaeMUicjorUIjVXZNrVJ?origin=share)
- **Repository**: [GitHub](https://github.com/Vedant00Maske/CareNest-Therapy)

## 🎓 About

This is a Full Stack Development (FSD) semester 5 project. We're refactoring and improving the previous semester's implementation with clean code, proper architecture, and modern best practices.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ by the CareNest Team**
