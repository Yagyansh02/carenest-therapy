import mongoose, { Schema } from "mongoose";

const assessmentSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    

    answers: {
      // Q1: Age Group (from name="age")
      ageGroup: {
        type: String,
        enum: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
      },
      
      // Q2: Occupation (from name="occupation")
      occupation: {
        type: String,
        enum: [
          "Student",
          "Employed (Full-time)",
          "Employed (Part-time)",
          "Self-employed",
          "Unemployed",
          "Retired",
        ],
      },
      
      // Q3: Lifestyle (from name="lifestyle")
      lifestyle: {
        type: String,
        enum: [
          "High-stress, fast-paced",
          "Moderately busy, some downtime",
          "Balanced between work and personal life",
          "Relaxed, low-stress",
        ],
      },
      
      // Q4: Physical Activity (from name="activity")
      activityLevel: {
        type: String,
        enum: [
          "Sedentary (little to no exercise)",
          "Lightly active (walking, yoga, stretching)",
          "Moderately active (exercise 3-4 days a week)",
          "Very active (intense workouts, sports, daily exercise)",
        ],
      },
      
      // Q5: Mental Health Concerns (from name="concerns")
      concerns: {
        type: [String],
        enum: [
          "Anxiety",
          "Depression",
          "Overthinking",
          "Stress",
          "Low self-esteem",
          "Self-improvement",
          "Anger issues",
          "Grief/loss",
          "Sleep disturbances",
          "OCD",
          "Sexual dysfunction",
          "Bipolar disorder",
          "Addiction",
          "Autism spectrum disorder",
          "None of the above"
        ]
      },
      
      // Q5: "Other concerns" text input
      otherConcern: {
        type: String,
        trim: true,
      },
      
      // Q6: Duration (from name="duration")
      duration: {
        type: String,
        enum: [
          "Less than a month",
          "1-6 months",
          "6 months - 1 year",
          "More than 1 year",
        ],
      },
      
      // Q7: Impact Level (from name="impact")
      impactLevel: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
  },
  { timestamps: true }
);

export const Assessment = mongoose.model("Assessment", assessmentSchema);