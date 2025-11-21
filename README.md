# 🏥 CareNest Therapy - Backend API

A professional, secure, and scalable therapy management platform built with Node.js, Express, and MongoDB.

## 🌟 Overview

CareNest Therapy is a comprehensive mental health and wellness platform that connects patients with therapists and provides supervision capabilities. This repository contains the backend API with robust authentication, role-based access control, and session management.

## 🎯 Features

- ✅ **User Authentication** - Secure JWT-based authentication with access & refresh tokens
- ✅ **Role-Based Access Control** - Four user roles: Patient, Therapist, Supervisor, Admin
- ✅ **User Management** - Complete CRUD operations for users
- ✅ **Therapist Profile Management** - Complete profile system with qualifications, specializations, and availability
- ✅ **Supervisor System** - Complete supervisor profile management with student supervision
- ✅ **Assessment Flow** - Mental health assessment with intelligent scoring
- ✅ **Recommendation Algorithm** - AI-powered therapist matching based on patient needs
- ✅ **Search & Filter** - Advanced therapist search with multiple filters and sorting
- ✅ **API Documentation** - Interactive Scalar API docs with 28 endpoints
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
   GET http://localhost:5000/health
   ```

📖 **For detailed setup instructions, see [Quick Start Guide](./docs/QUICK_START.md)**

## 📚 Documentation

- 📖 [Quick Start Guide](./docs/QUICK_START.md) - Step-by-step setup instructions
- 🔐 [Authentication API](./docs/AUTH_README.md) - Complete auth documentation
- 🎯 [Assessment API Testing](./docs/ASSESSMENT_API_TESTING.md) - Assessment & recommendations guide
- 🧠 [Recommendation Algorithm](./docs/RECOMMENDATION_ALGORITHM.md) - Algorithm deep dive
- 🏗️ [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - What was built & why
- 📊 [Assessment Implementation](./docs/ASSESSMENT_IMPLEMENTATION_SUMMARY.md) - Assessment flow details
- 🗺️ [Migration Plan](./docs/MIGRATION_PLAN.md) - Complete backend migration roadmap
- 🧪 [API Examples](./docs/api-examples.js) - Test the endpoints
- 🌐 [API Documentation](http://localhost:5000/docs) - Interactive Scalar API docs

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
- `GET /docs` - Interactive API documentation (Scalar)

### User Management (9 endpoints)
- `POST /api/v1/users/register` - Register new user
- `POST /api/v1/users/login` - Login user
- `POST /api/v1/users/logout` - Logout user
- `POST /api/v1/users/refresh-token` - Refresh access token
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/users/change-password` - Change password
- `GET /api/v1/users` - Get all users (Supervisor only)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/profile` - Update profile

### Therapist Management (7 endpoints)
- `GET /api/v1/therapists` - Get all therapists (with filters)
- `GET /api/v1/therapists/:id` - Get therapist by ID
- `POST /api/v1/therapists/profile` - Create profile (Therapist only)
- `PUT /api/v1/therapists/profile` - Update profile (Therapist only)
- `GET /api/v1/therapists/me` - Get own profile (Therapist only)
- `PUT /api/v1/therapists/verify/:id` - Verify therapist (Supervisor only)
- `DELETE /api/v1/therapists/profile` - Delete profile (Therapist only)

### Supervisor Management (8 endpoints)
- `POST /api/v1/supervisors/profile` - Create supervisor profile
- `PUT /api/v1/supervisors/profile` - Update supervisor profile
- `GET /api/v1/supervisors/:id` - Get supervisor by ID
- `GET /api/v1/supervisors` - Get all supervisors
- `GET /api/v1/supervisors/me` - Get own supervisor profile
- `POST /api/v1/supervisors/students` - Add student to supervision
- `DELETE /api/v1/supervisors/students/:studentId` - Remove student
- `DELETE /api/v1/supervisors/profile` - Delete supervisor profile

### Assessment & Recommendations (7 endpoints) 🎯
- `POST /api/v1/assessments` - Submit/update assessment (Patient only)
- `GET /api/v1/assessments/me` - Get own assessment (Patient only)
- `GET /api/v1/assessments/recommendations` - Get recommended therapists (Patient only)
- `GET /api/v1/assessments/patient/:patientId` - Get assessment by patient ID (Therapist/Supervisor)
- `GET /api/v1/assessments/all` - Get all assessments (Supervisor only)
- `GET /api/v1/assessments/statistics` - Get assessment statistics (Supervisor only)
- `DELETE /api/v1/assessments/:id` - Delete assessment

**Total: 28 endpoints across 4 modules**

📖 **[View complete API documentation at http://localhost:5000/docs](http://localhost:5000/docs)**

## 👥 User Roles

- **Patient** - Submit assessments, get therapist recommendations, book sessions, provide feedback
- **Therapist** - Conduct sessions, manage patient notes, view patient assessments, receive feedback
- **Supervisor** - Oversee therapists, view all data, manage users, view assessment statistics
- **Admin** - Full system access and management capabilities

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
curl -X POST http://localhost:5000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"test123","role":"patient"}'

# Login
curl -X POST http://localhost:5000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Submit assessment (requires auth token)
curl -X POST http://localhost:5000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"concerns":["Anxiety","Stress"],"impactLevel":4,"duration":"3-6 months"}'

# Get therapist recommendations
curl -X GET http://localhost:5000/api/v1/assessments/recommendations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

📖 **[More examples in ASSESSMENT_API_TESTING.md](./docs/ASSESSMENT_API_TESTING.md)**

## 🤝 Contributing

This is a semester project being actively developed. Contributions, issues, and feature requests are welcome!

## 📝 Environment Variables

Required environment variables (see `.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000
ACCESS_TOKEN_SECRET=your_generated_secret
REFRESH_TOKEN_SECRET=your_generated_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
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
