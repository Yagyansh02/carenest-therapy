import crypto from "crypto";
import { getCache, setCache } from "../db/redis.js";

/**
 * Generates a deterministic hash from query parameters for cache keys.
 */
const hashQuery = (query) => {
  const sorted = JSON.stringify(query, Object.keys(query).sort());
  return crypto.createHash("md5").update(sorted).digest("hex").slice(0, 12);
};

/**
 * Express middleware for route-level caching.
 *
 * @param {string} keyPrefix - Cache key prefix (e.g., "therapists:list")
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @param {Function} [keyFn] - Optional function to generate custom key from req
 *
 * Usage:
 *   router.get("/", cacheResponse("therapists:list", 120), getAllTherapists);
 */
const cacheResponse = (keyPrefix, ttlSeconds = 300, keyFn = null) => {
  return async (req, res, next) => {
    try {
      const cacheKey = keyFn
        ? keyFn(req)
        : `${keyPrefix}:${hashQuery(req.query)}`;

      const cached = await getCache(cacheKey);

      if (cached) {
        // Attach header so client/devs know this was a cache hit
        res.set("X-Cache", "HIT");
        return res.status(200).json(cached);
      }

      // Store original res.json so we can intercept the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttlSeconds).catch(() => {});
        }
        res.set("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    } catch (error) {
      // If caching fails, just proceed without it
      next();
    }
  };
};

/**
 * Middleware to measure and log response times.
 * Adds X-Response-Time header and logs slow requests (>500ms).
 */
const performanceTimer = () => {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;

      // Log slow requests
      if (durationMs > 500) {
        console.warn(
          `⚠️  Slow request: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(2)}ms`
        );
      }
    });

    next();
  };
};

export { cacheResponse, performanceTimer, hashQuery };
