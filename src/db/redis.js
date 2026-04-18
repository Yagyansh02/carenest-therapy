import Redis from "ioredis";

/**
 * Redis client for caching.
 * Falls back gracefully if Redis is not available — the app still works,
 * just without caching benefits.
 */

let redisClient = null;
let isRedisConnected = false;

const connectRedis = () => {
  try {
    const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("Redis: Max retries reached. Giving up.");
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("✅ Redis connected successfully");
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      console.warn("⚠️  Redis connection error (caching disabled):", err.message);
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });

    return redisClient;
  } catch (error) {
    console.warn("⚠️  Redis initialization failed (caching disabled):", error.message);
    return null;
  }
};

/**
 * Get a cached value by key.
 * Returns parsed JSON or null if not found / Redis unavailable.
 */
const getCache = async (key) => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn("Redis GET error:", error.message);
    return null;
  }
};

/**
 * Set a cached value with TTL (in seconds).
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  } catch (error) {
    console.warn("Redis SET error:", error.message);
    return false;
  }
};

/**
 * Delete a specific cached key.
 */
const deleteCache = async (key) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn("Redis DEL error:", error.message);
    return false;
  }
};

/**
 * Delete all keys matching a pattern (e.g., "therapists:*").
 * Uses SCAN to avoid blocking Redis.
 */
const deleteCachePattern = async (pattern) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
    return true;
  } catch (error) {
    console.warn("Redis pattern DEL error:", error.message);
    return false;
  }
};

/**
 * Check if Redis is currently connected.
 */
const isConnected = () => isRedisConnected;

export {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  isConnected,
  redisClient,
};
