# Therapist API Testing Guide

## Base URL
```
http://localhost:8000/api/v1
```

## Test Flow

### 1. Register as Therapist
```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "Dr. Sarah Johnson",
  "email": "sarah@therapist.com",
  "password": "therapist123",
  "role": "therapist"
}
```

### 2. Login as Therapist
```http
POST /auth/login
Content-Type: application/json

{
  "email": "sarah@therapist.com",
  "password": "therapist123"
}
```
**Save the accessToken from response!**

### 3. Create Therapist Profile
```http
POST /therapists/profile
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "bio": "Experienced therapist specializing in anxiety and depression with over 5 years of practice",
  "isStudent": false,
  "licenseNumber": "TH123456",
  "specializations": ["anxiety", "depression", "trauma", "stress-management"],
  "yearsOfExperience": 5,
  "sessionRate": 1500,
  "qualifications": [
    {
      "degree": "Master of Psychology",
      "institution": "University of Mumbai",
      "year": 2018
    },
    {
      "degree": "Bachelor of Psychology",
      "institution": "Delhi University",
      "year": 2015
    }
  ],
  "availability": {
    "monday": [
      { "start": "09:00", "end": "12:00" },
      { "start": "14:00", "end": "17:00" }
    ],
    "wednesday": [
      { "start": "09:00", "end": "17:00" }
    ],
    "friday": [
      { "start": "10:00", "end": "16:00" }
    ]
  }
}
```

### 4. Get My Profile
```http
GET /therapists/me
Authorization: Bearer <your_access_token>
```

### 5. Update Profile
```http
PUT /therapists/profile
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "bio": "Updated bio text",
  "sessionRate": 2000,
  "yearsOfExperience": 6
}
```

### 6. Update Availability
```http
PUT /therapists/availability
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "availability": {
    "monday": [
      { "start": "10:00", "end": "18:00" }
    ],
    "tuesday": [
      { "start": "10:00", "end": "18:00" }
    ],
    "thursday": [
      { "start": "09:00", "end": "17:00" }
    ]
  }
}
```

### 7. Update Qualifications
```http
PUT /therapists/qualifications
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "qualifications": [
    {
      "degree": "PhD in Clinical Psychology",
      "institution": "Harvard University",
      "year": 2020
    },
    {
      "degree": "Master of Psychology",
      "institution": "University of Mumbai",
      "year": 2018
    }
  ]
}
```

### 8. Update Specializations
```http
PUT /therapists/specializations
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "specializations": ["anxiety", "depression", "PTSD", "couples-therapy", "child-psychology"]
}
```

### 9. Get All Therapists (Public)
```http
GET /therapists
```

### 10. Get Therapists with Filters
```http
GET /therapists?specialization=anxiety&minRating=4&verifiedOnly=true&page=1&limit=10
```

Query Parameters:
- `specialization` - Filter by specialization
- `minRating` - Minimum average rating
- `minRate` - Minimum session rate
- `maxRate` - Maximum session rate
- `minExperience` - Minimum years of experience
- `verifiedOnly` - Show only verified therapists (true/false)
- `sortBy` - Sort by: rating, experience, rate-asc, rate-desc
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)

### 11. Get Therapist by ID
```http
GET /therapists/<therapist_id>
```

### 12. Delete Profile
```http
DELETE /therapists/profile
Authorization: Bearer <your_access_token>
```

---

## Supervisor Endpoints

### 1. Register as Supervisor
```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "Dr. Michael Brown",
  "email": "michael@supervisor.com",
  "password": "supervisor123",
  "role": "supervisor"
}
```

### 2. Login as Supervisor
```http
POST /auth/login
Content-Type: application/json

{
  "email": "michael@supervisor.com",
  "password": "supervisor123"
}
```

### 3. Get My Students
```http
GET /therapists/students
Authorization: Bearer <supervisor_access_token>
```

### 4. Verify Therapist
```http
PUT /therapists/verify/<therapist_id>
Authorization: Bearer <supervisor_access_token>
Content-Type: application/json

{
  "status": "verified",
  "notes": "All credentials verified. Approved for practice."
}
```

Or reject:
```json
{
  "status": "rejected",
  "notes": "Missing required certifications."
}
```

---

## Student Therapist Flow

### 1. Register as Therapist (Student)
```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "Emily Davis",
  "email": "emily@student.com",
  "password": "student123",
  "role": "therapist"
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "emily@student.com",
  "password": "student123"
}
```

### 3. Create Profile with Supervisor
```http
POST /therapists/profile
Authorization: Bearer <student_access_token>
Content-Type: application/json

{
  "bio": "Student therapist under supervision",
  "isStudent": true,
  "specializations": ["anxiety", "depression"],
  "yearsOfExperience": 1,
  "sessionRate": 800,
  "supervisorId": "<supervisor_user_id>",
  "qualifications": [
    {
      "degree": "Bachelor of Psychology",
      "institution": "Delhi University",
      "year": 2023
    }
  ]
}
```

---

## Testing Tips

1. **Get Supervisor ID:**
   - Login as supervisor
   - Use `GET /auth/me` to get user ID
   - Use this ID as `supervisorId` for student therapists

2. **Test Verification Flow:**
   - Create student therapist profile
   - Login as their supervisor
   - Verify the student using `PUT /therapists/verify/:id`

3. **Test Filters:**
   - Create multiple therapist profiles with different specializations and rates
   - Test various filter combinations

4. **Test Pagination:**
   - Create 15+ therapist profiles
   - Test different page numbers and limits

---

## Expected Responses

### Success Response
```json
{
  "statusCode": 200,
  "data": { /* response data */ },
  "message": "Success message",
  "success": true
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "success": false,
  "errors": []
}
```

---

## Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 403 | Only therapists can create profiles | Make sure user role is "therapist" |
| 404 | Therapist profile not found | Create profile first using POST /therapists/profile |
| 409 | Profile already exists | Use PUT endpoint to update existing profile |
| 400 | Invalid supervisor ID | Verify supervisor exists and has "supervisor" role |
| 401 | Unauthorized request | Include valid access token in Authorization header |

---

## Postman Collection Structure

```
CareNest Therapy
├── Auth
│   ├── Register Therapist
│   ├── Register Supervisor
│   ├── Login
│   └── Get Current User
├── Therapist Profile
│   ├── Create Profile
│   ├── Get My Profile
│   ├── Update Profile
│   ├── Update Availability
│   ├── Update Qualifications
│   ├── Update Specializations
│   └── Delete Profile
├── Public Therapists
│   ├── Get All Therapists
│   ├── Get Therapists (Filtered)
│   └── Get Therapist by ID
└── Supervisor
    ├── Get My Students
    └── Verify Therapist
```

Save tokens in Postman environment variables for easier testing!
