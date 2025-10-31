# 🚀 Backend Migration Plan - CareNest Therapy

## Overview

This document outlines the comprehensive plan to migrate and refactor the backend logic from **CareNest-Therapy-S4** (old project) to **carenest-therapy** (new clean architecture).

## 📊 Migration Status

| Phase | Feature | Priority | Status | Sprint |
|-------|---------|----------|--------|--------|
| 1 | Authentication & User Management | Critical | ✅ Complete | - |
| 2 | Therapist Profile Management | High | 🔄 Next | Sprint 1 |
| 3 | Session/Appointment Management | High | ⏳ Pending | Sprint 1 |
| 4 | Feedback System | High | ⏳ Pending | Sprint 2 |
| 5 | Dashboard & Analytics | Medium | ⏳ Pending | Sprint 2 |
| 6 | Notifications System | Medium | ⏳ Pending | Sprint 3 |
| 7 | Search & Filter System | Medium | ⏳ Pending | Sprint 2 |
| 8 | File Upload System | Medium | ⏳ Pending | Sprint 3 |
| 9 | Payment Integration | Low | ⏳ Future | Sprint 4 |
| 10 | Chat/Messaging System | Low | ⏳ Future | Sprint 4 |

---

## Phase 1: Authentication & User Management ✅

**Status:** COMPLETE

### Implemented Features
- ✅ User registration with role validation (patient/therapist/supervisor)
- ✅ Secure login with JWT tokens (access + refresh)
- ✅ Logout functionality with token cleanup
- ✅ Token refresh mechanism
- ✅ Change password feature
- ✅ Get current user endpoint
- ✅ Role-based authorization middleware
- ✅ User profile management

### Files Created
- `src/controllers/auth.controller.js`
- `src/controllers/user.controllers.js`
- `src/routes/auth.routes.js`
- `src/routes/user.routes.js`
- `src/middlewares/auth.middleware.js`
- `src/middlewares/error.middleware.js`
- `src/utils/generateTokens.js`
- `src/models/user.models.js` (already existed)

### API Endpoints
```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login user
POST   /api/v1/auth/logout            - Logout user (protected)
POST   /api/v1/auth/refresh-token     - Refresh access token
GET    /api/v1/auth/me                - Get current user (protected)
POST   /api/v1/auth/change-password   - Change password (protected)
GET    /api/v1/users                  - Get all users (supervisor only)
GET    /api/v1/users/:id              - Get user by ID (protected)
PATCH  /api/v1/users/profile          - Update profile (protected)
```

---

## Phase 2: Therapist Profile Management 🔄

**Status:** NEXT - Sprint 1 (Week 1-2)

### Features to Implement

#### 2.1 Therapist Profile CRUD
- Create therapist profile (linked to user)
- Update therapist profile
- Get therapist profile by ID
- Get all therapists (with pagination)
- Delete/Deactivate therapist profile

#### 2.2 Qualifications Management
- Add qualifications (degree, institution, year)
- Update qualifications
- Remove qualifications
- Validate qualification details

#### 2.3 Specializations
- Add/update specializations
- Search by specialization
- Multiple specializations per therapist

#### 2.4 Availability Management
- Set weekly availability schedule
- Update availability slots
- Block specific dates/times
- Get available time slots

#### 2.5 Student-Supervisor Relationship
- Link student therapist to supervisor
- Get students under supervisor
- Update supervisor assignment
- View student performance metrics

#### 2.6 Verification System
- Submit profile for verification
- Supervisor verifies/rejects therapist
- Track verification status (pending/verified/rejected)
- Add rejection reason/notes

### Files to Create
```
src/
├── controllers/
│   └── therapist.controller.js
├── routes/
│   └── therapist.routes.js
└── middlewares/
    └── validation.middleware.js (optional)
```

### Database Schema
Already exists: `src/models/therapist.models.js`

**Fields:**
- userId (ref to User)
- bio
- isStudent
- qualifications []
- licenseNumber
- specializations []
- yearsOfExperience
- sessionRate
- availability {}
- supervisorId (ref to User)
- verificationStatus (pending/verified/rejected)
- averageRating
- feedbacks []

### API Endpoints to Create
```
GET    /api/v1/therapists                    - Get all therapists (public, with filters)
GET    /api/v1/therapists/:id                - Get therapist by ID (public)
POST   /api/v1/therapists/profile            - Create therapist profile (therapist only)
PUT    /api/v1/therapists/profile            - Update therapist profile (therapist only)
PUT    /api/v1/therapists/availability       - Update availability (therapist only)
PUT    /api/v1/therapists/qualifications     - Update qualifications (therapist only)
PUT    /api/v1/therapists/specializations    - Update specializations (therapist only)
GET    /api/v1/therapists/students           - Get students (supervisor only)
PUT    /api/v1/therapists/verify/:id         - Verify therapist (supervisor only)
DELETE /api/v1/therapists/profile            - Deactivate profile (therapist only)
```

### Business Logic
1. **Profile Creation:**
   - Only users with role "therapist" can create profile
   - Auto-link to authenticated user
   - Set initial verificationStatus to "pending"

2. **Availability:**
   - Store as object: `{ monday: [{start: "09:00", end: "17:00"}], ... }`
   - Validate time format
   - Check for overlapping slots

3. **Verification:**
   - Only supervisors can verify
   - If isStudent=true, only their assigned supervisor can verify
   - Send notification on status change

4. **Search/Filter:**
   - Filter by specialization, rating, sessionRate
   - Sort by rating, experience, rate
   - Pagination support

---

## Phase 3: Session/Appointment Management 📅

**Status:** PENDING - Sprint 1 (Week 1-2)

### Features to Implement

#### 3.1 Session Booking
- Patient books session with therapist
- Check therapist availability
- Validate no time conflicts
- Auto-calculate session fee
- Set initial status as "scheduled"

#### 3.2 Session Management
- View upcoming sessions
- View past sessions
- Filter by status, date, therapist/patient
- Pagination support

#### 3.3 Session Updates
- Update session status (scheduled → completed/cancelled/no-show)
- Add therapist notes (after session)
- Update payment status
- Cancel session with reason

#### 3.4 Session Details
- Get session by ID
- Include patient and therapist details
- Show session history/timeline

### Files to Create
```
src/
├── controllers/
│   └── session.controller.js
└── routes/
    └── session.routes.js
```

### Database Schema
Already exists: `src/models/session.model.js`

**Fields:**
- patientId (ref to User)
- therapistId (ref to User)
- scheduledAt
- duration (default: 60 minutes)
- status (scheduled/completed/cancelled/no-show)
- sessionType (video/audio/chat/in-person)
- meetingLink
- therapistNotes
- sessionFee
- paymentStatus (pending/paid/refunded)
- cancellationReason
- cancelledBy (ref to User)

### API Endpoints to Create
```
POST   /api/v1/sessions/book                 - Book a session (patient only)
GET    /api/v1/sessions                      - Get user's sessions (protected)
GET    /api/v1/sessions/:id                  - Get session details (protected)
PUT    /api/v1/sessions/:id/status           - Update status (therapist only)
PUT    /api/v1/sessions/:id/cancel           - Cancel session (patient/therapist)
POST   /api/v1/sessions/:id/notes            - Add therapist notes (therapist only)
GET    /api/v1/sessions/upcoming             - Get upcoming sessions (protected)
GET    /api/v1/sessions/history              - Get past sessions (protected)
GET    /api/v1/sessions/therapist/:id        - Get therapist's sessions (protected)
```

### Business Logic
1. **Booking Validation:**
   - Check therapist exists and is verified
   - Validate requested time is in therapist's availability
   - Check no overlapping sessions for therapist
   - Patient cannot book with same therapist at same time
   - Booking must be at least 2 hours in future

2. **Cancellation Policy:**
   - Can cancel up to 24 hours before session
   - Auto-refund if cancelled within policy
   - Mark as "no-show" if patient doesn't join within 15 min

3. **Session Completion:**
   - Only therapist can mark as completed
   - Must add session notes when marking complete
   - Update payment status to "paid" if not already

4. **Notifications:**
   - Booking confirmation to both parties
   - Reminder 24h before session
   - Cancellation notification
   - Session completion notification

---

## Phase 4: Feedback System ⭐

**Status:** PENDING - Sprint 2 (Week 3-4)

### Features to Implement

#### 4.1 Feedback Submission
- Patient submits feedback after session
- Rating (1-5 stars)
- Written comment (optional)
- Link to specific session

#### 4.2 Feedback Management
- View feedback by therapist
- View feedback by session
- Update feedback (within timeframe)
- Delete feedback (own feedback only)

#### 4.3 Rating Calculation
- Auto-calculate therapist's average rating
- Update on new feedback
- Display total feedback count

#### 4.4 Supervisor Access
- Supervisors can view student therapist feedbacks
- Track student performance

### Files to Create
```
src/
├── controllers/
│   └── feedback.controller.js
└── routes/
    └── feedback.routes.js
```

### Database Schema
Embedded in `src/models/therapist.models.js`

**Feedback Schema:**
- patientId (ref to User)
- rating (1-5, required)
- comment (max 1000 chars)
- sessionId (ref to Session)
- timestamps

### API Endpoints to Create
```
POST   /api/v1/feedback                      - Submit feedback (patient only)
GET    /api/v1/feedback/therapist/:id        - Get therapist's feedback (public)
GET    /api/v1/feedback/session/:id          - Get session feedback (protected)
PUT    /api/v1/feedback/:id                  - Update feedback (patient only)
DELETE /api/v1/feedback/:id                  - Delete feedback (patient/admin)
GET    /api/v1/feedback/my-feedback          - Get own feedback (patient)
```

### Business Logic
1. **Feedback Validation:**
   - Only patient can give feedback
   - Session must be completed
   - One feedback per session
   - Cannot feedback future/cancelled sessions
   - Can edit within 48 hours

2. **Rating Calculation:**
   ```javascript
   averageRating = totalRatings / feedbackCount
   // Update therapist.averageRating on each new/updated feedback
   ```

3. **Supervisor Visibility:**
   - Supervisors see all feedbacks for their students
   - Can filter by rating, date
   - Performance metrics dashboard

---

## Phase 5: Dashboard & Analytics 📊

**Status:** PENDING - Sprint 2 (Week 3-4)

### Features to Implement

#### 5.1 Patient Dashboard
- Total sessions count
- Upcoming sessions
- Past sessions summary
- Favorite therapists
- Feedback given count

#### 5.2 Therapist Dashboard
- Total patients served
- Upcoming sessions
- Total earnings
- Average rating
- Feedback summary
- Session completion rate

#### 5.3 Supervisor Dashboard
- Total students count
- Students pending verification
- Students performance metrics
- Overall statistics

### Files to Create
```
src/
├── controllers/
│   └── dashboard.controller.js
└── routes/
    └── dashboard.routes.js
```

### API Endpoints to Create
```
GET    /api/v1/dashboard/patient             - Patient dashboard (patient only)
GET    /api/v1/dashboard/therapist           - Therapist dashboard (therapist only)
GET    /api/v1/dashboard/supervisor          - Supervisor dashboard (supervisor only)
GET    /api/v1/dashboard/stats               - General stats (admin)
```

### Data to Return

**Patient Dashboard:**
```json
{
  "totalSessions": 10,
  "upcomingSessions": [...],
  "completedSessions": 8,
  "cancelledSessions": 2,
  "totalSpent": 5000,
  "favoriteTherapists": [...]
}
```

**Therapist Dashboard:**
```json
{
  "totalPatients": 25,
  "totalSessions": 100,
  "upcomingSessions": [...],
  "completedSessions": 95,
  "averageRating": 4.5,
  "totalEarnings": 50000,
  "feedbackCount": 30,
  "verificationStatus": "verified"
}
```

**Supervisor Dashboard:**
```json
{
  "totalStudents": 5,
  "pendingVerification": 2,
  "verifiedStudents": 3,
  "studentsPerformance": [...],
  "totalSessionsByStudents": 250
}
```

---

## Phase 6: Notifications System 🔔

**Status:** PENDING - Sprint 3 (Week 5-6)

### Features to Implement

#### 6.1 Notification Types
- Session booking confirmation
- Session reminder (24h before)
- Session cancellation
- Feedback received
- Profile verification status
- Payment status updates
- New message received

#### 6.2 Notification Management
- Create notifications
- Get user notifications
- Mark as read/unread
- Mark all as read
- Delete notifications
- Get unread count

### Files to Create
```
src/
├── models/
│   └── notification.model.js
├── controllers/
│   └── notification.controller.js
├── routes/
│   └── notification.routes.js
└── utils/
    └── notificationService.js
```

### Database Schema
```javascript
{
  userId: ObjectId,
  type: String, // 'booking', 'reminder', 'cancellation', 'feedback', etc.
  title: String,
  message: String,
  relatedId: ObjectId, // session/feedback/user ID
  relatedModel: String, // 'Session', 'Feedback', 'User'
  isRead: Boolean,
  createdAt: Date
}
```

### API Endpoints to Create
```
GET    /api/v1/notifications                 - Get user notifications (protected)
GET    /api/v1/notifications/unread-count    - Get unread count (protected)
PUT    /api/v1/notifications/:id/read        - Mark as read (protected)
PUT    /api/v1/notifications/read-all        - Mark all as read (protected)
DELETE /api/v1/notifications/:id             - Delete notification (protected)
DELETE /api/v1/notifications/clear-all       - Clear all notifications (protected)
```

### Notification Triggers
```javascript
// Create notifications on these events:
- Session booked → notify patient & therapist
- 24h before session → remind both parties
- Session cancelled → notify both parties
- Feedback received → notify therapist
- Profile verified/rejected → notify therapist
- Payment received → notify therapist
- New message → notify recipient
```

---

## Phase 7: Search & Filter System 🔍

**Status:** PENDING - Sprint 2 (Week 3-4)

### Features to Implement

#### 7.1 Therapist Search
- Search by name
- Filter by specializations
- Filter by rating (min rating)
- Filter by session rate (price range)
- Filter by availability
- Filter by experience years
- Sort by rating, experience, price

#### 7.2 Advanced Filters
- Verified therapists only
- Student therapists only
- Available on specific date/time
- Accepts specific payment methods

### Files to Create
```
src/
├── controllers/
│   └── search.controller.js
└── routes/
    └── search.routes.js
```

### API Endpoints to Create
```
GET    /api/v1/search/therapists             - Search therapists (public)
       Query params:
       - q (search term)
       - specialization
       - minRating
       - maxRate, minRate
       - minExperience
       - verifiedOnly
       - sortBy (rating, experience, rate)
       - page, limit
```

### Implementation
```javascript
// Example query
GET /api/v1/search/therapists?
    specialization=anxiety&
    minRating=4&
    maxRate=2000&
    verifiedOnly=true&
    sortBy=rating&
    page=1&
    limit=10
```

---

## Phase 8: File Upload System 📁

**Status:** PENDING - Sprint 3 (Week 5-6)

### Features to Implement

#### 8.1 Profile Pictures
- Upload user avatar
- Update avatar
- Delete avatar
- Image validation (size, format)

#### 8.2 Document Uploads
- Upload verification documents (therapists)
- Multiple document types (license, certificates)
- Document approval workflow

#### 8.3 Session Files
- Upload session-related files
- Share files between patient & therapist
- File access control

### Files to Create
```
src/
├── middlewares/
│   └── upload.middleware.js
├── controllers/
│   └── upload.controller.js
├── routes/
│   └── upload.routes.js
└── utils/
    └── cloudinary.js
```

### API Endpoints to Create
```
POST   /api/v1/upload/avatar                 - Upload avatar (protected)
POST   /api/v1/upload/documents              - Upload documents (therapist)
POST   /api/v1/upload/session-files          - Upload session files (protected)
DELETE /api/v1/upload/:fileId                - Delete file (protected)
GET    /api/v1/upload/documents/:userId      - Get user documents (supervisor)
```

### Implementation
- Use Cloudinary for cloud storage
- Multer for file handling
- Validate file types and sizes
- Generate unique file names
- Store file URLs in database

---

## Phase 9: Payment Integration 💳

**Status:** FUTURE - Sprint 4 (Week 7+)

### Features to Implement

#### 9.1 Payment Processing
- Create payment intent
- Process payment
- Verify payment
- Handle webhooks

#### 9.2 Payment History
- View payment history
- Download invoices
- Refund processing
- Payment analytics

### Files to Create
```
src/
├── models/
│   └── payment.model.js
├── controllers/
│   └── payment.controller.js
├── routes/
│   └── payment.routes.js
└── utils/
    └── paymentGateway.js
```

### API Endpoints to Create
```
POST   /api/v1/payments/create               - Create payment (patient)
POST   /api/v1/payments/verify               - Verify payment (patient)
GET    /api/v1/payments/history              - Payment history (protected)
POST   /api/v1/payments/refund               - Process refund (admin)
GET    /api/v1/payments/earnings             - Therapist earnings (therapist)
POST   /api/v1/payments/webhook              - Payment gateway webhook
```

### Payment Gateway Options
- Razorpay (India)
- Stripe (International)
- PayPal

---

## Phase 10: Chat/Messaging System 💬

**Status:** FUTURE - Sprint 4 (Week 7+)

### Features to Implement

#### 10.1 Real-time Chat
- Socket.io integration
- One-on-one messaging
- Message history
- Typing indicators
- Online/offline status

#### 10.2 Message Management
- Send text messages
- Send files/images
- Edit messages
- Delete messages
- Read receipts

### Files to Create
```
src/
├── models/
│   ├── conversation.model.js
│   └── message.model.js
├── controllers/
│   └── message.controller.js
├── routes/
│   └── message.routes.js
└── utils/
    └── socket.js
```

### API Endpoints to Create
```
GET    /api/v1/conversations                 - Get user conversations (protected)
GET    /api/v1/conversations/:id             - Get conversation (protected)
POST   /api/v1/messages                      - Send message (protected)
GET    /api/v1/messages/:conversationId      - Get messages (protected)
PUT    /api/v1/messages/:id                  - Edit message (protected)
DELETE /api/v1/messages/:id                  - Delete message (protected)
PUT    /api/v1/messages/:id/read             - Mark as read (protected)
```

### Socket Events
```javascript
// Client → Server
socket.emit('send_message', messageData);
socket.emit('typing', { conversationId, userId });
socket.emit('stop_typing', { conversationId, userId });

// Server → Client
socket.on('receive_message', (message) => {});
socket.on('user_typing', (data) => {});
socket.on('user_stop_typing', (data) => {});
socket.on('message_read', (messageId) => {});
```

---

## 🎯 Implementation Checklist

### For Each Phase:

1. **Planning**
   - [ ] Review old project logic
   - [ ] Define database schema
   - [ ] List API endpoints
   - [ ] Define business rules
   - [ ] Identify edge cases

2. **Development**
   - [ ] Create/update models
   - [ ] Create controllers
   - [ ] Create routes
   - [ ] Add middleware
   - [ ] Add validation
   - [ ] Handle errors

3. **Testing**
   - [ ] Test happy path
   - [ ] Test edge cases
   - [ ] Test error scenarios
   - [ ] Test authentication
   - [ ] Test authorization

4. **Documentation**
   - [ ] Add JSDoc comments
   - [ ] Update API documentation
   - [ ] Add usage examples
   - [ ] Document business logic

5. **Review**
   - [ ] Code review
   - [ ] Performance check
   - [ ] Security audit
   - [ ] Refactor if needed

---

## 📝 Code Quality Standards

### Naming Conventions
```javascript
// Controllers: descriptive action names
getAllTherapists
getTherapistById
createTherapistProfile
updateTherapistProfile
deleteTherapistProfile

// Routes: RESTful naming
GET    /api/v1/therapists
POST   /api/v1/therapists
PUT    /api/v1/therapists/:id
DELETE /api/v1/therapists/:id

// Models: singular, PascalCase
User, Therapist, Session, Feedback, Notification

// Middleware: verb + noun
verifyJWT, verifyRole, validateSession, uploadFile

// Utils: descriptive function names
generateTokens, sendEmail, uploadToCloudinary, formatDate
```

### File Structure
```javascript
// Controller structure
import Model from '../models/model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getItems = asyncHandler(async (req, res) => {
  // 1. Extract data from request
  // 2. Validate data
  // 3. Business logic
  // 4. Database operations
  // 5. Send response
});
```

### Error Handling
```javascript
// Always use asyncHandler
export const someController = asyncHandler(async (req, res) => {
  // Throw ApiError for expected errors
  if (!data) {
    throw new ApiError(404, "Resource not found");
  }
  
  // Business logic
  
  // Return ApiResponse for success
  return res.status(200).json(
    new ApiResponse(200, data, "Success message")
  );
});
```

### Validation
```javascript
// Always validate inputs
if (!requiredField || requiredField.trim() === "") {
  throw new ApiError(400, "Field is required");
}

// Use schema validation for complex objects
if (role && !["patient", "therapist", "supervisor"].includes(role)) {
  throw new ApiError(400, "Invalid role");
}
```

---

## 🚀 Getting Started

### Start with Phase 2

1. **Create branch:**
   ```bash
   git checkout -b feature/therapist-profile
   ```

2. **Create files:**
   ```bash
   # Create controller
   touch src/controllers/therapist.controller.js
   
   # Create routes
   touch src/routes/therapist.routes.js
   ```

3. **Implement features in order:**
   - Basic CRUD operations
   - Availability management
   - Verification system
   - Search and filters

4. **Test thoroughly:**
   - Use Postman/Thunder Client
   - Test all endpoints
   - Test edge cases
   - Test authentication

5. **Commit and merge:**
   ```bash
   git add .
   git commit -m "feat: implement therapist profile management"
   git push origin feature/therapist-profile
   # Create PR and merge
   ```

---

## 📞 Support

If you need help implementing any phase:
1. Review the phase documentation above
2. Check the old project code for reference
3. Review existing implemented code (Phase 1)
4. Ask specific questions about implementation

---

**Last Updated:** November 1, 2025
**Version:** 1.0
**Status:** Phase 1 Complete, Phase 2 In Progress
