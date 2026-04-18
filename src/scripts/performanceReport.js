/**
 * Performance Report Script for CareNest Therapy Backend
 * 
 * Measures and reports the performance improvements from Redis caching
 * and database query optimizations.
 * 
 * Usage: node -r dotenv/config src/scripts/performanceReport.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { connectRedis, getCache, setCache, deleteCache, isConnected } from "../db/redis.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const timeAsync = async (label, fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return { label, ms: parseFloat(ms.toFixed(2)), result };
};

const formatMs = (ms) => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  return `${ms.toFixed(2)}ms`;
};

const printSection = (title) => {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
};

const printComparison = (label, withoutCache, withCache) => {
  const improvement = withoutCache > 0 ? (((withoutCache - withCache) / withoutCache) * 100) : 0;
  const speedup = withCache > 0 ? (withoutCache / withCache) : 0;
  
  console.log(`\n  📊 ${label}`);
  console.log(`     Without Redis:  ${formatMs(withoutCache)}`);
  console.log(`     With Redis:     ${formatMs(withCache)}`);
  console.log(`     Improvement:    ${improvement.toFixed(1)}% faster (${speedup.toFixed(1)}x speedup)`);
};

// ─── Benchmark Tests ────────────────────────────────────────────────────────

const benchmarkRedisVsMongo = async () => {
  // Import models
  const { User } = await import("../models/user.models.js");
  const { Session } = await import("../models/session.model.js");
  const { Therapist } = await import("../models/therapist.models.js");
  const { Feedback } = await import("../models/feedback.models.js");
  const { Assessment } = await import("../models/assessment.models.js");

  printSection("CARENEST PERFORMANCE REPORT");
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Redis Connected: ${isConnected() ? "✅ Yes" : "❌ No"}`);

  // ── 1. Auth Middleware: User lookup ────────────────────────────────
  printSection("1. AUTH MIDDLEWARE — User Lookup (runs on EVERY request)");
  
  const sampleUser = await User.findOne().select("-password -refreshToken").lean();
  if (sampleUser) {
    const userId = sampleUser._id.toString();
    
    // Without cache: MongoDB lookup
    const mongoTimes = [];
    for (let i = 0; i < 10; i++) {
      const t = await timeAsync("MongoDB", () => 
        User.findById(userId).select("-password -refreshToken").lean()
      );
      mongoTimes.push(t.ms);
    }
    const avgMongo = mongoTimes.reduce((a, b) => a + b, 0) / mongoTimes.length;

    // With cache: Redis lookup
    await setCache(`benchmark:user:${userId}`, sampleUser, 60);
    const redisTimes = [];
    for (let i = 0; i < 10; i++) {
      const t = await timeAsync("Redis", () => getCache(`benchmark:user:${userId}`));
      redisTimes.push(t.ms);
    }
    const avgRedis = redisTimes.reduce((a, b) => a + b, 0) / redisTimes.length;
    await deleteCache(`benchmark:user:${userId}`);

    printComparison("User lookup (avg of 10 requests)", avgMongo, avgRedis);
    
    const reqPerDay = 10000; // estimated daily authenticated requests
    const savedMs = (avgMongo - avgRedis) * reqPerDay;
    console.log(`\n     💡 At ~${reqPerDay.toLocaleString()} requests/day:`);
    console.log(`        Saves ~${(savedMs / 1000).toFixed(1)}s of DB time daily`);
  } else {
    console.log("  ⚠️  No users found in database — skipping");
  }

  // ── 2. Therapist Listings ─────────────────────────────────────────
  printSection("2. THERAPIST LISTINGS — GET /api/v1/therapists");

  const therapistData = await Therapist.find()
    .populate("userId", "fullName email")
    .limit(10)
    .lean();

  // MongoDB query
  const mongoList = await timeAsync("MongoDB", () =>
    Therapist.find().populate("userId", "fullName email").limit(10).lean()
  );

  // Redis cached
  await setCache("benchmark:therapists:list", therapistData, 60);
  const redisList = await timeAsync("Redis", () => getCache("benchmark:therapists:list"));
  await deleteCache("benchmark:therapists:list");

  printComparison("Therapist list query", mongoList.ms, redisList.ms);

  // ── 3. Session Statistics ─────────────────────────────────────────
  printSection("3. SESSION STATISTICS — $facet aggregation vs 6 queries");

  const sampleTherapist = await User.findOne({ role: "therapist" }).lean();
  if (sampleTherapist) {
    const tid = sampleTherapist._id;

    // Old way: 5 countDocuments + 1 aggregate
    const oldWay = await timeAsync("5 counts + 1 agg", async () => {
      const total = await Session.countDocuments({ therapistId: tid });
      const completed = await Session.countDocuments({ therapistId: tid, status: "completed" });
      const cancelled = await Session.countDocuments({ therapistId: tid, status: "cancelled" });
      const scheduled = await Session.countDocuments({ therapistId: tid, status: { $in: ["confirmed", "scheduled"] } });
      const noShow = await Session.countDocuments({ therapistId: tid, status: "no-show" });
      const rev = await Session.aggregate([
        { $match: { therapistId: tid, status: "completed", paymentStatus: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$sessionFee" } } },
      ]);
      return { total, completed, cancelled, scheduled, noShow, rev };
    });

    // New way: Single $facet
    const newWay = await timeAsync("Single $facet", async () => {
      return await Session.aggregate([
        { $match: { therapistId: new mongoose.Types.ObjectId(tid) } },
        {
          $facet: {
            statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            totalRevenue: [
              { $match: { status: "completed", paymentStatus: "paid" } },
              { $group: { _id: null, total: { $sum: "$sessionFee" } } },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]);
    });

    printComparison("Statistics query optimization", oldWay.ms, newWay.ms);

    // Cached statistics
    await setCache("benchmark:stats", newWay.result, 60);
    const cachedStats = await timeAsync("Redis cached", () => getCache("benchmark:stats"));
    await deleteCache("benchmark:stats");

    printComparison("Statistics (DB vs Redis cache)", newWay.ms, cachedStats.ms);
  }

  // ── 4. Feedback Stats Aggregation ─────────────────────────────────
  printSection("4. FEEDBACK STATS — Aggregation vs In-Memory");

  const sampleFeedbackUser = await User.findOne({ role: "therapist" }).lean();
  if (sampleFeedbackUser) {
    const uid = sampleFeedbackUser._id;

    // Old way: Load all into memory
    const oldFeedback = await timeAsync("Load all + filter in JS", async () => {
      const feedbacks = await Feedback.find({ toUser: uid, isVisible: true }).lean();
      const total = feedbacks.length;
      const avg = total > 0 ? feedbacks.reduce((s, f) => s + f.overallRating, 0) / total : 0;
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      feedbacks.forEach((f) => { dist[f.overallRating] = (dist[f.overallRating] || 0) + 1; });
      return { total, avg, dist };
    });

    // New way: MongoDB aggregation
    const newFeedback = await timeAsync("$facet aggregation", async () => {
      return await Feedback.aggregate([
        { $match: { toUser: new mongoose.Types.ObjectId(uid), isVisible: true } },
        {
          $facet: {
            overall: [{ $group: { _id: null, total: { $sum: 1 }, avg: { $avg: "$overallRating" } } }],
            dist: [{ $group: { _id: "$overallRating", count: { $sum: 1 } } }],
          },
        },
      ]);
    });

    printComparison("Feedback stats query optimization", oldFeedback.ms, newFeedback.ms);
  }

  // ── 5. Index Coverage Report ──────────────────────────────────────
  printSection("5. DATABASE INDEX COVERAGE");

  const collections = ["users", "therapists", "sessions", "feedbacks", "assessments", "chatrooms", "messages", "supervisors", "patients", "colleges"];
  
  for (const collName of collections) {
    try {
      const coll = mongoose.connection.db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`\n  📁 ${collName} (${indexes.length} indexes):`);
      indexes.forEach((idx) => {
        const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(", ");
        const flags = [];
        if (idx.unique) flags.push("UNIQUE");
        if (idx.sparse) flags.push("SPARSE");
        console.log(`     ${flags.length ? `[${flags.join(",")}] ` : ""}{ ${keys} }`);
      });
    } catch (e) {
      // Collection may not exist yet
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  printSection("SUMMARY");
  console.log(`
  ✅ Optimizations Applied:
     • Redis caching on auth middleware (60s TTL)
     • Redis caching on therapist listings (2min TTL)
     • Redis caching on session/patient statistics (5min TTL)
     • Redis caching on therapist recommendations (5min TTL)
     • Redis caching on assessment statistics (10min TTL)
     • Redis caching on feedback stats (3min TTL)
     • Redis caching on therapist ratings (5min TTL)
     • Redis caching on booked slots (1min TTL)
     • N+1 query fix in getMyPatientSessions (batch lookup)
     • $facet aggregation for therapist statistics (6→1 queries)
     • $facet aggregation for patient statistics (5→1 queries)
     • $facet aggregation for feedback stats (memory→DB)
     • MongoDB aggregation for therapist rating calculation
     • New indexes on Supervisor.userId, Patient.userId
     • New compound indexes on Therapist (verificationStatus, specializations, sessionRate, experience)
     • New indexes on College.verificationStatus
     • New indexes on Assessment (patientId+createdAt)
     • Default user list limit reduced from 1000 to 50
  `);
};

// ─── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("✅ MongoDB connected");

    console.log("🚀 Connecting to Redis...");
    connectRedis();
    // Give Redis a moment to connect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await benchmarkRedisVsMongo();
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

main();
