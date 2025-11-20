# Therapist Recommendation Algorithm 🎯

## Overview

The recommendation algorithm intelligently matches patients with therapists based on their assessment responses. It uses a weighted scoring system that considers multiple factors to generate personalized recommendations.

## Algorithm Components

### 1. Scoring System (100 Points Maximum)

The algorithm assigns scores based on five key factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Specialization Match** | 40 points | Therapist specializes in patient's concerns |
| **Experience** | 20 points | Years of professional experience |
| **Rating** | 20 points | Average patient rating (0-5) |
| **Verification Status** | 10 points | Verified by platform |
| **Availability** | 10 points | Number of available time slots |

---

## Detailed Scoring Logic

### 1. Specialization Matching (40 points) 🎯

**Most Critical Factor** - Matches patient concerns with therapist specializations.

#### Concern-to-Specialization Mapping

```javascript
const concernKeywords = {
  Anxiety: [
    "anxiety", "stress", "panic", "worry", 
    "cognitive behavioral therapy", "cbt"
  ],
  Depression: [
    "depression", "mood", "sadness", 
    "bipolar", "major depressive disorder"
  ],
  Overthinking: [
    "anxiety", "cognitive behavioral therapy", 
    "cbt", "mindfulness"
  ],
  Stress: [
    "stress", "anxiety", "burnout", 
    "work-life balance"
  ],
  "Low self-esteem": [
    "self-esteem", "confidence", 
    "self-worth", "identity"
  ],
  "Self-improvement": [
    "personal growth", "self-improvement", 
    "coaching", "positive psychology"
  ],
  "Anger issues": [
    "anger management", "emotional regulation", 
    "impulse control"
  ],
  "Grief/loss": [
    "grief", "loss", "bereavement", "trauma"
  ],
  "Sleep disturbances": [
    "sleep", "insomnia", "sleep disorders"
  ],
  OCD: [
    "ocd", "obsessive compulsive", 
    "anxiety", "exposure therapy"
  ],
  "Sexual dysfunction": [
    "sexual health", "intimacy", 
    "relationships", "sex therapy"
  ],
  "Bipolar disorder": [
    "bipolar", "mood disorders", 
    "depression", "mania"
  ],
  Addiction: [
    "addiction", "substance abuse", 
    "recovery", "12-step"
  ],
  "Autism spectrum disorder": [
    "autism", "asd", "developmental", 
    "neurodevelopmental"
  ]
};
```

#### Scoring Logic

1. **Match Percentage Calculation**
   ```javascript
   matchPercentage = matchCount / totalConcerns
   score += matchPercentage * 40
   ```

2. **Example**:
   - Patient concerns: ["Anxiety", "Stress", "Overthinking"] (3 concerns)
   - Therapist specializations: ["Anxiety Disorders", "CBT", "Stress Management"]
   - Matches: Anxiety ✓, Stress ✓, Overthinking ✓ (via CBT keyword)
   - Match percentage: 3/3 = 100%
   - Score: 100% × 40 = **40 points**

3. **Bonus for Multiple Matches**
   - If matchCount > 1: Add **+5 bonus points**
   - Total possible: 45 points (40 + 5 bonus)

---

### 2. Experience Scoring (20 points) 📚

Experience weight adjusts based on **impact level** (severity of patient's condition).

#### High Impact Cases (impactLevel >= 4)

```javascript
if (yearsOfExperience >= 10) {
  score += 20;  // Full points
} else if (yearsOfExperience >= 5) {
  score += 14;  // 70% of points
} else if (yearsOfExperience >= 2) {
  score += 8;   // 40% of points
}
```

**Rationale**: Severe cases require highly experienced therapists.

#### Lower Impact Cases (impactLevel < 4)

```javascript
if (yearsOfExperience >= 5) {
  score += 20;  // Full points
} else if (yearsOfExperience >= 2) {
  score += 14;  // 70% of points
} else if (yearsOfExperience >= 1) {
  score += 8;   // 40% of points
}
```

**Rationale**: Lower severity cases can be handled by less experienced therapists.

#### Example

- **High Impact Patient** (impactLevel = 5):
  - Therapist with 12 years: 20 points ✓
  - Therapist with 4 years: 8 points
  - Therapist with 1 year: 0 points

- **Low Impact Patient** (impactLevel = 2):
  - Therapist with 6 years: 20 points ✓
  - Therapist with 3 years: 14 points
  - Therapist with 1 year: 8 points

---

### 3. Rating Score (20 points) ⭐

Based on therapist's average rating from patient feedback.

```javascript
ratingScore = (averageRating / 5) * 20
score += ratingScore

// Bonus for highly rated therapists
if (averageRating >= 4.5) {
  score += 3;  // Excellence bonus
}
```

#### Example

| Average Rating | Base Score | Bonus | Total |
|---------------|------------|-------|-------|
| 5.0 | 20 | +3 | **23** |
| 4.7 | 18.8 | +3 | **21.8** |
| 4.5 | 18 | +3 | **21** |
| 4.0 | 16 | 0 | **16** |
| 3.5 | 14 | 0 | **14** |

---

### 4. Verification Status (10 points) ✓

```javascript
if (verificationStatus === "verified") {
  score += 10;  // Full points
} else if (verificationStatus === "pending") {
  score += 5;   // Half points
} else {
  score += 0;   // Rejected therapists
}
```

**Importance**: Ensures patient safety and therapist credibility.

---

### 5. Availability Score (10 points) 📅

Based on number of days with available time slots.

```javascript
let availableDays = 0;
Object.values(availability).forEach((daySlots) => {
  if (Array.isArray(daySlots) && daySlots.length > 0) {
    availableDays++;
  }
});

if (availableDays >= 5) {
  score += 10;  // Full points
} else if (availableDays >= 3) {
  score += 7;   // 70% of points
} else if (availableDays >= 1) {
  score += 4;   // 40% of points
}
```

#### Example

| Available Days | Score |
|---------------|-------|
| 5-7 days | 10 points |
| 3-4 days | 7 points |
| 1-2 days | 4 points |
| 0 days | 0 points |

---

## Additional Scoring Factors

### 6. Lifestyle Compatibility Bonus (+2 to +3 points)

```javascript
if (lifestyle === "High-stress, fast-paced") {
  if (yearsOfExperience >= 5) {
    score += 3;
  }
} else if (lifestyle === "Relaxed, low-stress") {
  if (isStudent) {
    score += 2;  // Student therapists are more affordable
  }
}
```

**Rationale**: 
- High-stress patients need experienced therapists who can handle complex cases
- Low-stress patients can benefit from student therapists (cost-effective)

### 7. Chronic Condition Bonus (+5 points)

```javascript
if (duration === "More than 1 year") {
  if (yearsOfExperience >= 7) {
    score += 5;
  }
}
```

**Rationale**: Long-term conditions require sustained therapeutic relationships with experienced professionals.

---

## Complete Scoring Example

### Patient Profile

```json
{
  "concerns": ["Anxiety", "Stress", "Overthinking"],
  "impactLevel": 4,
  "duration": "1-6 months",
  "lifestyle": "High-stress, fast-paced"
}
```

### Therapist Profile

```json
{
  "specializations": ["Anxiety Disorders", "CBT", "Stress Management"],
  "yearsOfExperience": 8,
  "averageRating": 4.7,
  "verificationStatus": "verified",
  "availability": {
    "Monday": ["09:00-12:00"],
    "Wednesday": ["14:00-17:00"],
    "Friday": ["09:00-12:00"]
  }
}
```

### Score Breakdown

| Factor | Calculation | Points |
|--------|------------|--------|
| **Specialization Match** | 3/3 matches × 40 | 40 |
| **Bonus (multiple matches)** | 3 matches > 1 | +5 |
| **Experience** | 8 years (impactLevel=4) | 14 |
| **Rating** | 4.7/5 × 20 | 18.8 |
| **Rating Bonus** | 4.7 >= 4.5 | +3 |
| **Verification** | Verified | 10 |
| **Availability** | 3 days | 7 |
| **Lifestyle Bonus** | High-stress + 8yr exp | +3 |
| **TOTAL SCORE** | | **100.8** |

**Match Percentage**: 100.8% ≈ **101%** (capped display at 100%)

---

## Filtering Options

Before scoring, therapists can be filtered by:

1. **Verification Status**
   ```javascript
   verifiedOnly=true → Only "verified" therapists
   verifiedOnly=false → Exclude "rejected" only
   ```

2. **Minimum Rating**
   ```javascript
   minRating=4.0 → averageRating >= 4.0
   ```

3. **Maximum Session Rate**
   ```javascript
   maxRate=1500 → sessionRate <= 1500
   ```

---

## Output Format

### Recommendation Object

```json
{
  "therapist": {
    "_id": "...",
    "userId": {...},
    "bio": "...",
    "specializations": ["..."],
    "yearsOfExperience": 8,
    "sessionRate": 1200,
    "averageRating": 4.7,
    "verificationStatus": "verified",
    "availability": {...}
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
}
```

### Match Reasons Generation

```javascript
// Specialization matches
if (concernMatches.length > 0) {
  reasons.push(`Specializes in: ${concernMatches.join(", ")}`);
}

// Experience
if (yearsOfExperience >= 10) {
  reasons.push(`Highly experienced (${yearsOfExperience}+ years)`);
} else if (yearsOfExperience >= 5) {
  reasons.push(`Experienced (${yearsOfExperience} years)`);
}

// Rating
if (averageRating >= 4.5) {
  reasons.push(`Excellent rating (${averageRating}/5)`);
} else if (averageRating >= 4.0) {
  reasons.push(`High rating (${averageRating}/5)`);
}

// Verification
if (verificationStatus === "verified") {
  reasons.push("Verified therapist");
}

// Availability
if (availableDays >= 5) {
  reasons.push("Highly available");
}
```

---

## Algorithm Strengths

1. **Personalized Matching**: Considers patient's specific concerns and severity
2. **Multi-Factor Analysis**: Balances specialization, experience, ratings, and availability
3. **Safety First**: Prioritizes verified therapists and matches severe cases with experienced professionals
4. **Transparent Scoring**: Provides match reasons to explain recommendations
5. **Flexible Filtering**: Allows patients to set their own criteria (budget, ratings, verification)

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning Integration**
   - Train model on successful patient-therapist matches
   - Learn from session outcomes and ratings

2. **Geographic Distance**
   - Consider location for in-person sessions
   - Add distance-based scoring

3. **Schedule Compatibility**
   - Match patient's preferred times with therapist availability
   - Time zone considerations

4. **Cultural Compatibility**
   - Language preferences
   - Cultural background matching

5. **Treatment History**
   - Previous therapist ratings
   - Treatment approach preferences

6. **Insurance Coverage**
   - Filter by accepted insurance providers
   - Cost-based recommendations

---

## Testing Recommendations

### Test Scenarios

1. **High Severity Case**
   ```json
   {
     "concerns": ["Depression", "Anxiety", "Addiction"],
     "impactLevel": 5,
     "duration": "More than 1 year"
   }
   ```
   **Expected**: Highly experienced (10+ years), verified therapists

2. **Low Severity Case**
   ```json
   {
     "concerns": ["Self-improvement"],
     "impactLevel": 2,
     "duration": "Less than a month"
   }
   ```
   **Expected**: Mix of experienced and student therapists

3. **Specific Concern**
   ```json
   {
     "concerns": ["OCD"],
     "impactLevel": 4
   }
   ```
   **Expected**: Therapists specializing in OCD, exposure therapy

4. **Multiple Concerns**
   ```json
   {
     "concerns": ["Anxiety", "Depression", "Sleep disturbances", "Stress"],
     "impactLevel": 4
   }
   ```
   **Expected**: Generalist therapists with multiple specializations

---

## Performance Considerations

- **Database Indexing**: Ensure indexes on `verificationStatus`, `averageRating`, `sessionRate`
- **Caching**: Cache therapist list for repeated queries
- **Pagination**: Limit results to prevent performance issues
- **Async Operations**: Use async/await for database queries

---

## Code Location

**File**: `src/controllers/assessment.controllers.js`

**Function**: `calculateTherapistScore(assessment, therapist)`

**Main Endpoint**: `GET /api/v1/assessments/recommendations`

---

## Summary

The recommendation algorithm provides intelligent, personalized therapist matching by:

1. ✓ Matching patient concerns with therapist specializations (40%)
2. ✓ Weighting experience based on case severity (20%)
3. ✓ Considering patient ratings and feedback (20%)
4. ✓ Ensuring therapist verification (10%)
5. ✓ Checking availability for scheduling (10%)
6. ✓ Adding lifestyle and duration bonuses

**Result**: Patients receive ranked, personalized therapist recommendations with transparent scoring and match explanations.
