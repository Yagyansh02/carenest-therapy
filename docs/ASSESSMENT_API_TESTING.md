# Assessment API Testing Guide

This document provides examples for testing the Assessment APIs with the recommendation algorithm.

## Base URL
```
http://localhost:5000/api/v1/assessments
```

## Prerequisites
- Server running on port 5000
- User registered as a patient
- Login to get access token
- At least one verified therapist in the database with specializations

---

## 1. Submit Assessment (Patient)

Submit or update a mental health assessment.

### Request
```http
POST /api/v1/assessments
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

### Body
```json
{
  "ageGroup": "25-34",
  "occupation": "Employed (Full-time)",
  "lifestyle": "High-stress, fast-paced",
  "activityLevel": "Moderately active (exercise 3-4 days a week)",
  "concerns": [
    "Anxiety",
    "Stress",
    "Overthinking"
  ],
  "otherConcern": "Work-life balance issues",
  "duration": "1-6 months",
  "impactLevel": 4
}
```

### cURL Example
```bash
curl -X POST http://localhost:5000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "ageGroup": "25-34",
    "occupation": "Employed (Full-time)",
    "lifestyle": "High-stress, fast-paced",
    "activityLevel": "Moderately active (exercise 3-4 days a week)",
    "concerns": ["Anxiety", "Stress", "Overthinking"],
    "otherConcern": "Work-life balance issues",
    "duration": "1-6 months",
    "impactLevel": 4
  }'
```

### Response (201 Created)
```json
{
  "statusCode": 201,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "patientId": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "answers": {
      "ageGroup": "26-35",
      "occupation": "Working professional",
      "lifestyle": "High-stress, fast-paced",
      "activityLevel": "Somewhat active",
      "concerns": ["Anxiety", "Stress", "Overthinking"],
      "otherConcern": "Work-life balance issues",
      "duration": "3-6 months",
      "impactLevel": 4
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Assessment submitted successfully",
  "success": true
}
```

---

## 2. Get My Assessment (Patient)

Retrieve your own assessment.

### Request
```http
GET /api/v1/assessments/me
Authorization: Bearer <your_access_token>
```

### cURL Example
```bash
curl -X GET http://localhost:5000/api/v1/assessments/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "patientId": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "answers": {
      "ageGroup": "26-35",
      "occupation": "Working professional",
      "lifestyle": "High-stress, fast-paced",
      "activityLevel": "Somewhat active",
      "concerns": ["Anxiety", "Stress", "Overthinking"],
      "otherConcern": "Work-life balance issues",
      "duration": "3-6 months",
      "impactLevel": 4
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Assessment fetched successfully",
  "success": true
}
```

---

## 3. Get Recommended Therapists (Patient) 🎯

Get personalized therapist recommendations based on your assessment using an intelligent scoring algorithm.

### Request
```http
GET /api/v1/assessments/recommendations?limit=10&minRating=4&verifiedOnly=true
Authorization: Bearer <your_access_token>
```

### Query Parameters
- `limit` (optional): Maximum recommendations (default: 10, max: 20)
- `minRating` (optional): Minimum therapist rating (0-5)
- `maxRate` (optional): Maximum session rate
- `verifiedOnly` (optional): Only show verified therapists (true/false)

### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/assessments/recommendations?limit=10&minRating=4&verifiedOnly=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "recommendations": [
      {
        "therapist": {
          "_id": "60d5ec49f1b2c72b8c8e4f20",
          "userId": {
            "_id": "60d5ec49f1b2c72b8c8e4f21",
            "fullName": "Dr. Sarah Johnson",
            "email": "sarah@carenest.com"
          },
          "bio": "Specialized in anxiety and stress management with 8 years of experience",
          "specializations": [
            "Anxiety Disorders",
            "Stress Management",
            "Cognitive Behavioral Therapy",
            "Mindfulness"
          ],
          "yearsOfExperience": 8,
          "sessionRate": 1200,
          "averageRating": 4.7,
          "verificationStatus": "verified",
          "availability": {
            "Monday": ["09:00-12:00", "14:00-17:00"],
            "Wednesday": ["09:00-12:00", "14:00-17:00"],
            "Friday": ["09:00-12:00"]
          }
        },
        "matchScore": 87.5,
        "matchPercentage": 88,
        "matchReasons": [
          "Specializes in: Anxiety, Stress",
          "Experienced (8 years)",
          "Excellent rating (4.7/5)",
          "Verified therapist",
          "Highly available"
        ]
      },
      {
        "therapist": {
          "_id": "60d5ec49f1b2c72b8c8e4f22",
          "userId": {
            "_id": "60d5ec49f1b2c72b8c8e4f23",
            "fullName": "Dr. Michael Chen",
            "email": "michael@carenest.com"
          },
          "bio": "Expert in anxiety disorders and cognitive behavioral therapy",
          "specializations": [
            "Anxiety Disorders",
            "Depression",
            "CBT"
          ],
          "yearsOfExperience": 12,
          "sessionRate": 1500,
          "averageRating": 4.9,
          "verificationStatus": "verified",
          "availability": {
            "Tuesday": ["10:00-13:00"],
            "Thursday": ["10:00-13:00"]
          }
        },
        "matchScore": 85.2,
        "matchPercentage": 85,
        "matchReasons": [
          "Specializes in: Anxiety",
          "Highly experienced (12+ years)",
          "Excellent rating (4.9/5)",
          "Verified therapist"
        ]
      }
    ],
    "totalFound": 15,
    "assessmentSummary": {
      "concerns": ["Anxiety", "Stress", "Overthinking"],
      "impactLevel": 4,
      "duration": "1-6 months",
      "lifestyle": "High-stress, fast-paced"
    }
  },
  "message": "Therapist recommendations generated successfully",
  "success": true
}
```

---

## 4. Get Assessment by Patient ID (Therapist/Supervisor)

Therapists and supervisors can view a specific patient's assessment.

### Request
```http
GET /api/v1/assessments/patient/:patientId
Authorization: Bearer <therapist_or_supervisor_token>
```

### cURL Example
```bash
curl -X GET http://localhost:5000/api/v1/assessments/patient/60d5ec49f1b2c72b8c8e4f1b \
  -H "Authorization: Bearer THERAPIST_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "patientId": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "patient"
    },
    "answers": {
      "ageGroup": "26-35",
      "occupation": "Working professional",
      "lifestyle": "High-stress, fast-paced",
      "activityLevel": "Somewhat active",
      "concerns": ["Anxiety", "Stress", "Overthinking"],
      "duration": "3-6 months",
      "impactLevel": 4
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Assessment fetched successfully",
  "success": true
}
```

---

## 5. Get All Assessments (Supervisor Only)

Supervisors can view all assessments with pagination.

### Request
```http
GET /api/v1/assessments/all?page=1&limit=10
Authorization: Bearer <supervisor_token>
```

### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

### cURL Example
```bash
curl -X GET "http://localhost:5000/api/v1/assessments/all?page=1&limit=10" \
  -H "Authorization: Bearer SUPERVISOR_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "assessments": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4f1a",
        "patientId": {
          "_id": "60d5ec49f1b2c72b8c8e4f1b",
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "answers": {
          "concerns": ["Anxiety", "Stress"],
          "impactLevel": 4
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalAssessments": 48,
      "hasMore": true
    }
  },
  "message": "Assessments fetched successfully",
  "success": true
}
```

---

## 6. Get Assessment Statistics (Supervisor Only)

Get aggregated statistics about all assessments.

### Request
```http
GET /api/v1/assessments/statistics
Authorization: Bearer <supervisor_token>
```

### cURL Example
```bash
curl -X GET http://localhost:5000/api/v1/assessments/statistics \
  -H "Authorization: Bearer SUPERVISOR_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "totalAssessments": 48,
    "concernDistribution": [
      { "_id": "Anxiety", "count": 32 },
      { "_id": "Stress", "count": 28 },
      { "_id": "Depression", "count": 20 },
      { "_id": "Overthinking", "count": 18 }
    ],
    "impactLevelDistribution": [
      { "_id": 1, "count": 5 },
      { "_id": 2, "count": 8 },
      { "_id": 3, "count": 12 },
      { "_id": 4, "count": 15 },
      { "_id": 5, "count": 8 }
    ],
    "durationDistribution": [
      { "_id": "Less than a month", "count": 6 },
      { "_id": "1-6 months", "count": 28 },
      { "_id": "6 months - 1 year", "count": 9 },
      { "_id": "More than 1 year", "count": 5 }
    ]
  },
  "message": "Assessment statistics fetched successfully",
  "success": true
}
```

---

## 7. Delete Assessment

Patients can delete their own assessment, supervisors can delete any assessment.

### Request
```http
DELETE /api/v1/assessments/:id
Authorization: Bearer <your_access_token>
```

### cURL Example
```bash
curl -X DELETE http://localhost:5000/api/v1/assessments/60d5ec49f1b2c72b8c8e4f1a \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Assessment deleted successfully",
  "success": true
}
```

---

## Recommendation Algorithm Explained 🧠

The recommendation algorithm scores therapists based on multiple factors:

### Scoring Weights
1. **Specialization Match (40 points)** - Most important
   - Maps patient concerns to therapist specializations
   - Uses keyword matching (e.g., "Anxiety" → "anxiety disorders", "CBT")
   - Bonus points for multiple matching specializations

2. **Experience (20 points)**
   - High impact cases (impactLevel >= 4): Prefer 10+ years
   - Lower impact cases: 5+ years experience valued
   - Scales based on severity

3. **Rating (20 points)**
   - Based on averageRating (0-5 scale)
   - Bonus for highly rated therapists (4.5+)

4. **Verification Status (10 points)**
   - Full points for verified therapists
   - Half points for pending verification

5. **Availability (10 points)**
   - More available days = higher score
   - 5+ days: full points
   - 3-4 days: 70% points
   - 1-2 days: 40% points

### Additional Bonuses
- **Lifestyle Compatibility (+3-5 points)**: High-stress patients matched with experienced therapists
- **Chronic Condition (+5 points)**: Duration > 1 year prefers 7+ years experience

### Concern → Specialization Mapping
- **Anxiety**: "anxiety", "stress", "panic", "CBT"
- **Depression**: "depression", "mood", "bipolar"
- **Stress**: "stress", "anxiety", "burnout"
- **Low self-esteem**: "self-esteem", "confidence", "identity"
- **OCD**: "ocd", "obsessive compulsive", "exposure therapy"
- And more...

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "At least one mental health concern is required",
  "success": false
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized request",
  "success": false
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Only patients can submit assessments",
  "success": false
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Please complete an assessment first to get therapist recommendations",
  "success": false
}
```

---

## Testing Flow

1. **Register as Patient**
   ```bash
   POST /api/v1/users/register
   ```

2. **Login to Get Token**
   ```bash
   POST /api/v1/users/login
   ```

3. **Submit Assessment**
   ```bash
   POST /api/v1/assessments
   ```

4. **Get Recommendations**
   ```bash
   GET /api/v1/assessments/recommendations
   ```

5. **View Own Assessment**
   ```bash
   GET /api/v1/assessments/me
   ```

---

## Available Options for Assessment

### Age Groups
- 18-24
- 25-34
- 35-44
- 45-54
- 55-64
- 65+

### Occupation
- Student
- Employed (Full-time)
- Employed (Part-time)
- Self-employed
- Unemployed
- Retired

### Lifestyle
- High-stress, fast-paced
- Moderately busy, some downtime
- Balanced between work and personal life
- Relaxed, low-stress

### Activity Level
- Sedentary (little to no exercise)
- Lightly active (walking, yoga, stretching)
- Moderately active (exercise 3-4 days a week)
- Very active (intense workouts, sports, daily exercise)

### Duration
- Less than a month
- 1-6 months
- 6 months - 1 year
- More than 1 year

### Concerns

When submitting an assessment, you can choose from these concerns:

- Anxiety
- Depression
- Overthinking
- Stress
- Low self-esteem
- Self-improvement
- Anger issues
- Grief/loss
- Sleep disturbances
- OCD
- Sexual dysfunction
- Bipolar disorder
- Addiction
- Autism spectrum disorder
- None of the above

---

## Tips for Testing

1. **Create Multiple Therapists**: Create therapists with different specializations to see varied recommendations
2. **Vary Impact Levels**: Test with different impactLevel values (1-5) to see how experience weighting changes
3. **Test Filters**: Use query parameters (minRating, maxRate, verifiedOnly) to test filtering
4. **Check Match Reasons**: The matchReasons array explains why each therapist was recommended
5. **Monitor Scores**: matchScore shows the exact calculated score out of 100

---

## Need Help?

- API Documentation: http://localhost:5000/docs
- Total Endpoints: 28 (Users: 9, Therapists: 7, Supervisors: 8, Assessments: 7)
- All endpoints use JWT authentication via Bearer tokens
