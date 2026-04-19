import { ApiError } from "../utils/ApiError.js";

/**
 * Arcjet Rate Limiting Middleware
 * Wraps Arcjet rules for use as Express middleware
 */

/**
 * Creates an Express middleware from an Arcjet rule
 * @param {Object} arcjetRule - The Arcjet rule to apply
 * @returns {Function} Express middleware function
 */
export const arcjetMiddleware = (arcjetRule) => {
  return async (req, res, next) => {
    // Bypass arcjet totally during tests to avoid failed APIs, rate limiting or unhandled exceptions.
    if (process.env.NODE_ENV === "test") {
      return next();
    }
    
    try {
      // Get user identifier (IP address or user ID if authenticated)
      const userId = req.user?._id?.toString() || req.ip || "anonymous";
      
      // Get IP address from various possible headers
      const ip = 
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip;

      // In development, use userId only if IP is not available
      const protectOptions = {
        userId,
        requested: 1, // Number of tokens requested (for token bucket)
      };

      // Only add IP if it's available (in production or when proxied)
      if (ip && ip !== "::1" && ip !== "127.0.0.1") {
        protectOptions.ip = ip;
      }

      // Make the Arcjet decision
      const decision = await arcjetRule.protect(req, protectOptions);

      // Log the decision in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Arcjet] ${req.method} ${req.path}:`, {
          id: decision.id,
          conclusion: decision.conclusion,
          reason: decision.reason,
          userId,
          ip,
        });
      }

      // Handle rate limit denial
      if (decision.isDenied()) {
        // Get reason for denial
        const reason = decision.reason;
        let message = "Too many requests. Please try again later.";
        let retryAfter = 60; // Default retry after 60 seconds

        if (reason.isRateLimit()) {
          message = `Rate limit exceeded. Please try again in ${Math.ceil(reason.reset / 1000)} seconds.`;
          retryAfter = Math.ceil(reason.reset / 1000);
        } else if (reason.isBot()) {
          message = "Suspicious bot-like behavior detected.";
        } else if (reason.isShield()) {
          message = "Request blocked for security reasons.";
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', reason.max || 100);
        res.setHeader('X-RateLimit-Remaining', reason.remaining || 0);
        res.setHeader('X-RateLimit-Reset', reason.reset || Date.now() + 60000);
        res.setHeader('Retry-After', retryAfter);

        throw new ApiError(429, message);
      }

      // Add rate limit info to response headers
      if (decision.reason?.max) {
        res.setHeader('X-RateLimit-Limit', decision.reason.max);
        res.setHeader('X-RateLimit-Remaining', decision.reason.remaining || 0);
        res.setHeader('X-RateLimit-Reset', decision.reason.reset || 0);
      }

      next();
    } catch (error) {
      // If Arcjet fails, log the error but don't block the request in development
      if (process.env.NODE_ENV === "development") {
        console.error('[Arcjet] Error:', error.message);
        return next(); // Allow request to proceed in development
      }
      
      // In production, if it's not a rate limit error, pass it along
      if (error.statusCode === 429) {
        next(error);
      } else {
        console.error('[Arcjet] Unexpected error:', error);
        next(); // Don't block on unexpected errors
      }
    }
  };
};

/**
 * Helper to apply rate limiting to specific routes
 * @param {Object} arcjetRule - The Arcjet rule to apply
 */
export const rateLimit = (arcjetRule) => arcjetMiddleware(arcjetRule);
