import arcjet, { shield, tokenBucket, fixedWindow } from "@arcjet/node";

/**
 * Arcjet Rate Limiting Configuration
 * Provides protection against:
 * - Brute force attacks
 * - DDoS attacks
 * - API abuse
 * - Suspicious requests
 */

// Initialize Arcjet with your API key
const aj = arcjet({
  key: process.env.ARCJET_KEY || "", // Get your key from https://app.arcjet.com
  
  // In development, use userId as the primary characteristic instead of IP
  characteristics: process.env.ARCJET_ENV === "development" ? ["userId"] : undefined,
  
  // Global rules that apply to all requests
  rules: [
    // Shield protects against common attacks (SQL injection, XSS, etc.)
    shield({
      mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    }),
  ],
});

/**
 * General API Rate Limiter
 * Limits: 100 requests per minute per IP
 */
export const generalRateLimiter = aj.withRule(
  fixedWindow({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    window: "60s", // 1 minute window
    max: 100, // 100 requests per window
  })
);

/**
 * Authentication Rate Limiter (for login/register)
 * Limits: 5 requests per minute per IP (stricter)
 */
export const authRateLimiter = aj.withRule(
  tokenBucket({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    interval: "60s",
    capacity: 5, // Maximum 5 tokens
    refillRate: 1, // Refill 1 token per minute
  })
);

/**
 * Booking Rate Limiter (for session bookings)
 * Limits: 10 bookings per hour per user
 */
export const bookingRateLimiter = aj.withRule(
  fixedWindow({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    window: "3600s", // 1 hour window
    max: 10, // 10 bookings per hour
  })
);

/**
 * Session Management Rate Limiter
 * Limits: 30 requests per minute per user
 */
export const sessionRateLimiter = aj.withRule(
  fixedWindow({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    window: "60s",
    max: 30,
  })
);

/**
 * Chat/Message Rate Limiter
 * Limits: 60 messages per minute per user
 */
export const chatRateLimiter = aj.withRule(
  fixedWindow({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    window: "60s",
    max: 60,
  })
);

/**
 * File Upload Rate Limiter
 * Limits: 5 uploads per hour per user
 */
export const uploadRateLimiter = aj.withRule(
  fixedWindow({
    mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
    window: "3600s",
    max: 5,
  })
);

export default aj;
