# CareNest Therapy — Database Schemas

> All models use MongoDB via Mongoose. Every schema automatically includes `createdAt` and `updatedAt` timestamps unless noted.

---

## Table of Contents

1. [User](#1-user)
2. [Assessment](#2-assessment)
3. [Patient](#3-patient)
4. [Therapist](#4-therapist)
5. [Supervisor](#5-supervisor)
6. [College](#6-college)
7. [Session](#7-session)
8. [Feedback](#8-feedback)

---

## 1. User

**Collection:** `users`  
**File:** `src/models/user.models.js`

The central authentication document. Every person on the platform — patient, therapist, supervisor, admin, or college — has exactly one `User` record. Role-specific details live in separate profile collections that reference this document.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `fullName` | String | ✅ | min 2, max 100 chars |
| `email` | String | ✅ | unique, lowercase, indexed |
| `password` | String | ✅ | bcrypt-hashed; min 4 chars |
| `role` | String (enum) | — | `patient` · `therapist` · `supervisor` · `admin` · `college`; default `patient` |
| `isActive` | Boolean | — | default `true` |
| `refreshToken` | String | — | JWT refresh token |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

### Virtual Field

| Virtual | Points To | Description |
|---|---|---|
| `assessment` | `Assessment.patientId` | Populated assessment for this user (patient only) |

### Instance Methods

| Method | Description |
|---|---|
| `isPasswordCorrect(password)` | bcrypt compare — returns `true/false` |
| `generateAccessToken()` | Signs a JWT access token (short-lived) |
| `generateRefreshToken()` | Signs a JWT refresh token (long-lived) |

---

## 2. Assessment

**Collection:** `assessments`  
**File:** `src/models/assessment.models.js`

Stores a patient's onboarding questionnaire answers. Used by the recommendation algorithm to match them with the right therapist.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `patientId` | ObjectId → User | ✅ | indexed |
| `answers.ageGroup` | String (enum) | — | `18-24` · `25-34` · `35-44` · `45-54` · `55-64` · `65+` |
| `answers.occupation` | String (enum) | — | Student · Employed (Full-time) · Employed (Part-time) · Self-employed · Unemployed · Retired |
| `answers.lifestyle` | String (enum) | — | High-stress fast-paced · Moderately busy some downtime · Balanced between work and personal life · Relaxed low-stress |
| `answers.activityLevel` | String (enum) | — | Sedentary · Lightly active · Moderately active · Very active |
| `answers.concerns` | [String] (enum array) | — | Multi-select: Anxiety · Depression · Overthinking · Stress · Low self-esteem · Self-improvement · Anger issues · Grief/loss · Sleep disturbances · OCD · Sexual dysfunction · Bipolar disorder · Addiction · Autism spectrum disorder · None of the above |
| `answers.otherConcern` | String | — | Free-text "other" concern |
| `answers.duration` | String (enum) | — | Less than a month · 1-6 months · 6 months - 1 year · More than 1 year |
| `answers.impactLevel` | Number | — | 1 – 5 scale |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

---

## 3. Patient

**Collection:** `patients`  
**File:** `src/models/patient.models.js`

Extends a `User` with patient-specific data and a history of progress records written by their therapist after each session.

### Patient Document

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → User | ✅ | |
| `dateOfBirth` | Date | ✅ | |
| `progressRecords` | [ProgressRecord] | — | default `[]` |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

### Embedded: ProgressRecord

Each entry is added by a therapist after a session.

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | ObjectId → Patient | ✅ | |
| `therapistId` | ObjectId → Therapist | ✅ | |
| `sessionId` | ObjectId → Session | ✅ | |
| `notes` | String | ✅ | Therapist's session notes |
| `progressScore` | Number | ✅ | Numeric progress indicator |
| `goals` | [String] | ✅ | Goals set for the patient |
| `completedGoals` | [String] | ✅ | Goals marked as completed |
| `nextSteps` | String | ✅ | Planned next actions |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

---

## 4. Therapist

**Collection:** `therapists`  
**File:** `src/models/therapist.models.js`

Profile for either a licensed therapist or a student therapist (intern). Student therapists must be linked to a supervisor.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `userId` | ObjectId → User | ✅ | unique, indexed |
| `bio` | String | — | max 2000 chars |
| `isStudent` | Boolean | — | default `false`; `true` = intern |
| `qualifications` | [Qualification] | — | see embedded schema below |
| `licenseNumber` | String | — | null for students |
| `specializations` | [String] | — | e.g. `["Anxiety", "CBT"]` |
| `yearsOfExperience` | Number | — | min 0, default 0 |
| `sessionRate` | Number | ✅ | min 0; fee per session |
| `availability` | Object (Mixed) | — | flexible schedule object |
| `supervisorId` | ObjectId → Supervisor | — | required when `isStudent = true` |
| `verificationStatus` | String (enum) | — | `pending` · `verified` · `rejected`; default `pending` |
| `averageRating` | Number | — | 0 – 5; default 0 |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

### Embedded: Qualification

| Field | Type | Required |
|---|---|---|
| `degree` | String | ✅ |
| `institution` | String | ✅ |
| `year` | Number | — |

---

## 5. Supervisor

**Collection:** `supervisors`  
**File:** `src/models/supervisor.models.js`

Licensed professionals who oversee intern/student therapists.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `userId` | ObjectId → User | ✅ | unique |
| `professionalLicenseNumber` | String | ✅ | unique |
| `supervisedStudents` | [ObjectId → User] | — | list of student therapist user IDs |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

---

## 6. College

**Collection:** `colleges`  
**File:** `src/models/college.models.js`

Represents an affiliated educational institution whose psychiatry students intern on the platform.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `userId` | ObjectId → User | ✅ | unique, indexed |
| `institutionName` | String | ✅ | min 2, max 200 chars |
| `affiliationNumber` | String | ✅ | unique; official registration number |
| `address` | String | — | default `""` |
| `contactPhone` | String | — | default `""` |
| `website` | String | — | default `""` |
| `contactPersonName` | String | — | HOD / coordinator name |
| `contactPersonEmail` | String | — | lowercase, default `""` |
| `department` | String | — | internship-managing department |
| `affiliatedStudents` | [ObjectId → User] | — | student therapist user IDs |
| `agreementStartDate` | Date | — | MOU start date |
| `agreementEndDate` | Date | — | MOU end date |
| `verificationStatus` | String (enum) | — | `pending` · `verified` · `rejected`; default `pending` |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

---

## 7. Session

**Collection:** `sessions`  
**File:** `src/models/session.model.js`

Represents a scheduled (or past) therapy session between a patient and a therapist.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `patientId` | ObjectId → User | ✅ | indexed |
| `therapistId` | ObjectId → User | ✅ | indexed |
| `scheduledAt` | Date | ✅ | indexed |
| `duration` | Number | ✅ | minutes; min 15, default 60 |
| `status` | String (enum) | — | `pending` · `confirmed` · `scheduled` · `completed` · `cancelled` · `rejected` · `no-show`; default `pending` |
| `sessionType` | String | — | default `"video"` |
| `meetingLink` | String | — | video call URL |
| `therapistNotes` | String | — | max 5000 chars |
| `sessionFee` | Number | ✅ | min 0 |
| `paymentStatus` | String (enum) | — | `pending` · `paid` · `refunded`; default `pending` |
| `cancellationReason` | String | — | max 500 chars |
| `cancelledBy` | ObjectId → User | — | who cancelled |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

### Compound Indexes

| Index | Purpose |
|---|---|
| `{ patientId: 1, scheduledAt: -1 }` | Patient's session history |
| `{ therapistId: 1, scheduledAt: -1 }` | Therapist's schedule |
| `{ status: 1, scheduledAt: -1 }` | Status-based filtering |

---

## 8. Feedback

**Collection:** `feedbacks`  
**File:** `src/models/feedback.models.js`

360-degree feedback system supporting three directions of review.

| Feedback Type | From → To |
|---|---|
| `patient-to-therapist` | Patient reviews the therapist after a session |
| `therapist-to-patient` | Therapist notes patient progress after a session |
| `supervisor-to-therapist` | Supervisor reviews an intern's performance |

### Core Fields

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `feedbackType` | String (enum) | ✅ | see table above; indexed |
| `fromUser` | ObjectId → User | ✅ | indexed |
| `toUser` | ObjectId → User | ✅ | indexed |
| `sessionId` | ObjectId → Session | — | required for patient↔therapist types; indexed |
| `overallRating` | Number | ✅ | 1 – 5 scale |
| `comment` | String | — | max 2000 chars |
| `strengths` | [String] | — | default `[]` |
| `areasForImprovement` | [String] | — | default `[]` |
| `recommendations` | String | — | max 1000 chars |
| `isAnonymous` | Boolean | — | default `false` (patient → therapist only) |
| `isVisible` | Boolean | — | default `true` |
| `isFlagged` | Boolean | — | admin flag for inappropriate feedback |
| `response.text` | String | — | recipient's reply; max 1000 chars |
| `response.respondedAt` | Date | — | timestamp of reply |
| `reviewPeriod` | String | — | e.g. `"Q1 2024"` (supervisor feedback) |
| `createdAt` | Date | — | auto |
| `updatedAt` | Date | — | auto |

### Category Ratings (all optional, 1–5)

| Rating Field | Applies To |
|---|---|
| `professionalism` | patient-to-therapist |
| `communication` | patient-to-therapist |
| `effectiveness` | patient-to-therapist |
| `empathy` | patient-to-therapist |
| `engagement` | therapist-to-patient |
| `progress` | therapist-to-patient |
| `homework_completion` | therapist-to-patient |
| `openness` | therapist-to-patient |
| `clinical_skills` | supervisor-to-therapist |
| `documentation` | supervisor-to-therapist |
| `ethical_practice` | supervisor-to-therapist |
| `professional_development` | supervisor-to-therapist |

### Virtual Field

| Virtual | Description |
|---|---|
| `averageCategoryRating` | Mean of all non-null category ratings (2 decimal places) |

### Compound Indexes

| Index | Purpose |
|---|---|
| `{ feedbackType: 1, fromUser: 1 }` | Feedback given by a user |
| `{ feedbackType: 1, toUser: 1 }` | Feedback received by a user |
| `{ sessionId: 1, feedbackType: 1 }` | All feedback for a session |
| `{ toUser: 1, overallRating: -1 }` | Top-rated users |
| `{ createdAt: -1 }` | Chronological listing |

---

## Relationships Overview

```
User (1) ──────────────────────────────────── (1) Patient
User (1) ──────────────────────────────────── (1) Therapist
User (1) ──────────────────────────────────── (1) Supervisor
User (1) ──────────────────────────────────── (1) College
User (1) ──────────────────────────────────── (1) Assessment

Therapist (many) ──── supervisorId ────────── (1) Supervisor
College   (many) ──── affiliatedStudents ──── (many) User[therapist]
Supervisor (1)   ──── supervisedStudents ──── (many) User[therapist]

Session   (1) ──── patientId ──────────────── (1) User[patient]
Session   (1) ──── therapistId ─────────────── (1) User[therapist]

Feedback  (1) ──── fromUser / toUser ────────── (1) User
Feedback  (1) ──── sessionId ───────────────── (1) Session

Patient.progressRecords[] ── sessionId ──────── (1) Session
Patient.progressRecords[] ── therapistId ─────── (1) Therapist
```
