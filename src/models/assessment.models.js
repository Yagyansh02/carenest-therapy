import mongoose, { Schema } from "mongoose";

const assessmentSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    // The 'answers' object maps directly to the questions
    answers: {
      // Section 1: Primary Concerns

      primaryConcern: { type: String, trim: true }, // Q1
      symptoms: [{ type: String }], // Q2

      // Section 2: Mood & Feelings (Quantifiable scores)

      feelingLow: { type: Number, min: 0, max: 3 }, // Q3
      noInterest: { type: Number, min: 0, max: 3 }, // Q4
      feelingAnxious: { type: Number, min: 0, max: 3 }, // Q5
      worrying: { type: Number, min: 0, max: 3 }, // Q6

      // Section 3: Daily Life & Functioning
      sleepHours: { type: Number }, // Q7
      sleepQuality: { type: String, enum: ["Good", "Fair", "Poor"] }, // Q8
      energyLevel: {
        type: String,
        enum: ["High", "Moderate", "Low", "Very Low"],
      }, // Q9

      // Section 4: Goals & Preferences (For matching algorithm)

      hasHadTherapy: { type: Boolean }, // Q10
      therapistPreferences: {
        gender: {
          type: String,
          enum: ["Male", "Female", "Non-binary", "No Preference"],
        },
        // Add other preferences from Q11 as needed
      },
      goals: [{ type: String }], // Q12

      // Section 5: Safety Information
      
      safety: {
        hasThoughtsOfSelfHarm: { type: Boolean }, // Q13
      },
    },
  },
  { timestamps: true }
);

export const Assessment = mongoose.model("Assessment", assessmentSchema);

