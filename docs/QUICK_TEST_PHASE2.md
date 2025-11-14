# 🚀 Quick Start - Phase 2 Testing

## Prerequisites
- MongoDB running
- Server started (`npm run dev`)
- Postman or Thunder Client installed

## 5-Minute Test Flow

### 1️⃣ Register & Login as Therapist (2 min)

```bash
# Register
POST http://localhost:8000/api/v1/auth/register
{
  "fullName": "Dr. Sarah Johnson",
  "email": "sarah@therapist.com",
  "password": "test123",
  "role": "therapist"
}

# Login
POST http://localhost:8000/api/v1/auth/login
{
  "email": "sarah@therapist.com",
  "password": "test123"
}

# 📋 COPY THE ACCESS TOKEN!
```

### 2️⃣ Create Therapist Profile (1 min)

```bash
POST http://localhost:8000/api/v1/therapists/profile
Authorization: Bearer <YOUR_TOKEN>

{
  "bio": "Experienced therapist specializing in anxiety",
  "specializations": ["anxiety", "depression"],
  "yearsOfExperience": 5,
  "sessionRate": 1500,
  "qualifications": [{
    "degree": "Master of Psychology",
    "institution": "University of Mumbai",
    "year": 2018
  }],
  "availability": {
    "monday": [{"start": "09:00", "end": "17:00"}]
  }
}
```

### 3️⃣ View Your Profile (30 sec)

```bash
GET http://localhost:8000/api/v1/therapists/me
Authorization: Bearer <YOUR_TOKEN>
```

### 4️⃣ Test Public Endpoint (30 sec)

```bash
# Get all therapists (no auth needed)
GET http://localhost:8000/api/v1/therapists
```

### 5️⃣ Update Profile (1 min)

```bash
PUT http://localhost:8000/api/v1/therapists/profile
Authorization: Bearer <YOUR_TOKEN>

{
  "bio": "Updated bio!",
  "sessionRate": 2000
}
```

## ✅ Success Indicators

- ✅ Profile created with status 201
- ✅ Profile returned with `verificationStatus: "pending"`
- ✅ Public endpoint returns therapist list
- ✅ Updates work correctly
- ✅ All responses use ApiResponse format

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token is correct and in Bearer format |
| 403 Forbidden | Make sure user role is "therapist" |
| 409 Conflict | Profile already exists, use PUT to update |
| 404 Not Found | Create profile first before updates |

## 📊 Test All Features Checklist

- [ ] Create profile
- [ ] Get own profile
- [ ] Update profile
- [ ] Update availability
- [ ] Update qualifications
- [ ] Update specializations
- [ ] Get all therapists (public)
- [ ] Get therapist by ID
- [ ] Filter therapists by specialization
- [ ] Delete profile

## 🎯 Next: Test Supervisor Flow

1. Register as supervisor
2. Get supervisor user ID
3. Register student therapist with supervisorId
4. Login as supervisor
5. Get students
6. Verify student

---

**Ready?** Start with step 1️⃣ and you'll have Phase 2 tested in 5 minutes! 🚀
