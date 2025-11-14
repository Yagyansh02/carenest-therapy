import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * User schema defines the structure of user documents in MongoDB.
 * Includes basic fields, validation rules, and authentication helpers.
 */
const userSchema = new Schema(
    {
        // User's full name
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true, // remove leading/trailing whitespace
            minlength: [2, "Full name must be at least 2 characters"],
            maxlength: [100, "Full name too long"],
        },

        // Email address used for login/communication (unique, indexed)
        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true, // normalize to lower-case for consistent lookups
        },

        // Hashed password (never store plaintext)
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [4, "Password must be at least 4 characters long"],
        },

        // Role controls access/permissions within the system
        role: {
            type: String,
            enum: ["patient", "therapist", "supervisor"],
            default: "patient",
        },

        // Optional refresh token for issuing new access tokens without re-login
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true } // automatically add createdAt and updatedAt fields
);

/**
 * Pre-save middleware:
 * - Only runs when the password field has been created/modified.
 * - Hashes the password before saving to the database.
 */
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    // Use bcrypt to hash the password with a salt rounds of 10
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

/**
 * Instance method to verify a candidate password against the stored hash.
 * Returns a boolean indicating whether the provided password matches.
 */
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

/**
 * Instance method to generate JWT access token.
 * Contains user identification and basic info for authorization.
 */
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

/**
 * Instance method to generate JWT refresh token.
 * Contains only user ID for refreshing access tokens.
 */
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

// Export the model for use elsewhere in the application
export const User = mongoose.model("User", userSchema);
