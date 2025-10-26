import mongoose, { Schema } from "mongoose";

const supervisorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    professionalLicenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supervisedStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export const Supervisor = mongoose.model("Supervisor", supervisorSchema);
