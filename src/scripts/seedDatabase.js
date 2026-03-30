/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CareNest Database Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates the database with realistic data so every analytics chart
 * in the Admin Dashboard is fully populated.
 *
 * Run:  npm run seed          (from Carenest-therapy/)
 *   or: node -r dotenv/config src/scripts/seedDatabase.js
 *
 * WARNING: Drops ALL existing collection data. Dev / staging only.
 *
 * All inserts use Model.collection.insertMany() (raw MongoDB driver) so that
 * custom createdAt / updatedAt values are preserved — Mongoose timestamps:true
 * would otherwise overwrite them with new Date().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

import { User }       from "../models/user.models.js";
import { Patient }    from "../models/patient.models.js";
import { Therapist }  from "../models/therapist.models.js";
import { Supervisor } from "../models/supervisor.models.js";
import { College }    from "../models/college.models.js";
import { Session }    from "../models/session.model.js";
import { Feedback }   from "../models/feedback.models.js";
import { Assessment } from "../models/assessment.models.js";
import { ChatRoom }   from "../models/chatRoom.model.js";
import { Message }    from "../models/message.model.js";

const DB_NAME = "CarenestTherapy";
const nid     = () => new mongoose.Types.ObjectId();

const rand      = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick      = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany  = (arr, lo = 1, hi = 3) => [...arr].sort(() => Math.random() - 0.5).slice(0, rand(lo, hi));
const clamp     = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const r1        = (b) => clamp(b + rand(-1, 1), 1, 5);
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
const between   = (a, b) => new Date(a.getTime() + Math.random() * (b.getTime() - a.getTime()));
const slug      = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ".");

const wPick = (opts) => {
  const tot = opts.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * tot;
  for (const o of opts) { r -= o.w; if (r <= 0) return o.v; }
  return opts[opts.length - 1].v;
};

const SPECS = [
  "Anxiety","Depression","Stress Management","Trauma & PTSD",
  "Cognitive Behavioral Therapy","Bipolar Disorder","Addiction Recovery",
  "Grief Counseling","Child & Adolescent Therapy","Couples Therapy",
  "OCD","Sleep Disorders","Anger Management",
];
const CONCERNS     = ["Anxiety","Depression","Overthinking","Stress","Low self-esteem","Self-improvement","Anger issues","Grief/loss","Sleep disturbances","OCD","Bipolar disorder","Addiction"];
const AGE_GROUPS   = ["18-24","25-34","35-44","45-54","55-64","65+"];
const OCCUPATIONS  = ["Student","Employed (Full-time)","Employed (Part-time)","Self-employed","Unemployed","Retired"];
const LIFESTYLES   = ["High-stress, fast-paced","Moderately busy, some downtime","Balanced between work and personal life","Relaxed, low-stress"];
const ACTIVITY_LVL = ["Sedentary (little to no exercise)","Lightly active (walking, yoga, stretching)","Moderately active (exercise 3-4 days a week)","Very active (intense workouts, sports, daily exercise)"];
const DURATIONS    = ["Less than a month","1-6 months","6 months - 1 year","More than 1 year"];
const FEES         = [500,700,800,1000,1200,1500];
const QUARTERS     = ["Q1 2025","Q2 2025","Q3 2025","Q4 2025","Q1 2026"];
const CANCEL_RSNS  = ["Schedule conflict","Feeling better","Personal reasons","Work emergency","Family emergency"];

// Qualification templates for therapists
const DEGREES = [
  { degree: "Ph.D. in Clinical Psychology", institution: "NIMHANS, Bangalore", yearOffset: 8 },
  { degree: "M.Phil in Clinical Psychology", institution: "NIMHANS, Bangalore", yearOffset: 6 },
  { degree: "M.A. in Counseling Psychology", institution: "Delhi University", yearOffset: 5 },
  { degree: "M.Sc. in Psychology", institution: "Mumbai University", yearOffset: 4 },
  { degree: "Psy.D. in Clinical Psychology", institution: "Tata Institute of Social Sciences", yearOffset: 7 },
  { degree: "M.A. in Clinical Psychology", institution: "Christ University, Bangalore", yearOffset: 5 },
  { degree: "Diploma in Psychiatric Social Work", institution: "NIMHANS, Bangalore", yearOffset: 3 },
  { degree: "Certificate in CBT", institution: "Beck Institute", yearOffset: 2 },
  { degree: "M.Phil in Psychiatric Social Work", institution: "TISS Mumbai", yearOffset: 6 },
  { degree: "B.A. in Psychology", institution: "St. Xavier's College, Mumbai", yearOffset: 3 },
];

// Therapist goals and progress tracking
const THERAPY_GOALS = [
  "Reduce anxiety symptoms",
  "Improve sleep quality",
  "Develop coping strategies",
  "Build self-esteem",
  "Manage stress effectively",
  "Process grief and loss",
  "Improve relationship patterns",
  "Reduce depressive symptoms",
  "Develop emotional regulation",
  "Address trauma responses",
  "Build social connections",
  "Improve communication skills",
];

const NEXT_STEPS = [
  "Continue practicing breathing exercises daily",
  "Complete the thought record journal before next session",
  "Practice the grounding techniques when feeling overwhelmed",
  "Work on identifying and challenging negative thought patterns",
  "Try the progressive muscle relaxation before sleep",
  "Schedule at least one social activity this week",
  "Continue with the mindfulness meditation practice",
  "Read the recommended chapter on CBT techniques",
];

// Chat message templates for realistic conversations
const PATIENT_MESSAGES = [
  "Hi, I wanted to follow up on what we discussed in our last session.",
  "I've been practicing the breathing exercises you recommended.",
  "Thank you for the session today, it was really helpful!",
  "I have a quick question about the homework assignment.",
  "I've been feeling much better since our last session.",
  "Could we discuss my anxiety triggers in our next session?",
  "I noticed some improvements in my sleep patterns this week.",
  "The journaling exercise has been really eye-opening.",
  "I'm looking forward to our next session.",
  "I wanted to share that I had a small breakthrough today.",
  "Is it normal to feel a bit emotional after sessions?",
  "I've been trying the CBT techniques and they're helping.",
  "Can you recommend any books on managing stress?",
  "I appreciate your patience and support.",
  "I had a challenging day but used the coping strategies we discussed.",
];

const THERAPIST_MESSAGES = [
  "Thank you for sharing that with me. How are you feeling now?",
  "That's wonderful progress! Keep up the great work.",
  "I'm glad to hear the exercises are helping.",
  "Remember, it's okay to take things one step at a time.",
  "Let's explore that further in our next session.",
  "How have you been sleeping since our last session?",
  "That's a very insightful observation about yourself.",
  "I'm proud of the progress you're making.",
  "Please don't hesitate to reach out if you need support.",
  "Let's continue working on those coping strategies.",
  "It's completely normal to experience those feelings.",
  "You're doing great work on your mental health journey.",
  "I'd recommend continuing with the daily journaling.",
  "See you in our next session. Take care!",
  "Remember the grounding technique we practiced if you feel overwhelmed.",
];

const PT_CMTS = [
  "The session was incredibly helpful. I feel much more confident managing my anxiety.",
  "Great therapist — very empathetic and professional throughout.",
  "I have seen real improvement in my thought patterns after just a few sessions.",
  "The therapist really listened and offered practical techniques I can use daily.",
  "Excellent communication. I never felt judged and was comfortable opening up.",
  "Very insightful session. I now have a clearer understanding of my triggers.",
  "The therapist helped me address issues I had avoided for years.",
  "Helpful and supportive. Looking forward to continued progress.",
  "The CBT techniques shared were very practical and immediately applicable.",
];

const P_NAMES = [
  "Aarav Kumar","Priya Sharma","Rohit Patel","Ananya Singh",
  "Vikram Nair","Meera Joshi","Arjun Verma","Kavya Menon",
  "Siddharth Das","Pooja Iyer","Nikhil Reddy","Riya Choudhary",
  "Tanvir Ahmed","Shreya Gupta","Aditya Rao","Neha Pillai",
  "Kiran Mishra","Divya Nambiar","Rahul Khanna","Sunita Bose",
  "Manish Tiwari","Lakshmi Varma","Deepak Sood","Anjali Trivedi",
  "Suresh Pandey","Nandita Bansal","Vishal Mathur","Swati Kapoor",
  "Gaurav Sinha","Poonam Sharma","Akash Jain","Isha Dubey",
  "Rajesh Chauhan","Smita Patil","Arun Hegde","Tara Bhushan",
];
const T_NAMES = [
  "Dr. Priyanka Mehta","Dr. Suresh Rao","Dr. Amrita Ghosh",
  "Dr. Karan Malhotra","Dr. Sunita Iyer","Dr. Vivek Sharma",
  "Dr. Rekha Pillai","Dr. Aryan Kapoor","Dr. Nalini Bose",
  "Dr. Shivam Trivedi","Dr. Anjali Srivastava","Dr. Rajeev Nair",
];
const SV_NAMES = [
  "Prof. Dr. Ramesh Agarwal",
  "Prof. Dr. Devika Krishnan",
  "Prof. Dr. Harish Menon",
];
const COL_ROWS = [
  { institutionName:"National Institute of Mental Health Studies", affiliationNumber:"NIMHS-2021-001", address:"12 Wellness Avenue, New Delhi - 110001", contactPhone:"+91-11-2345-6789", website:"https://nimhs.edu.in", contactPersonName:"Dr. Shalini Verma",  contactPersonEmail:"contact@nimhs.edu.in", department:"Department of Clinical Psychology" },
  { institutionName:"Bangalore School of Psychiatry",              affiliationNumber:"BSP-2022-004",  address:"45 Healing Street, Bengaluru - 560001",  contactPhone:"+91-80-9876-5432", website:"https://bsp.ac.in",    contactPersonName:"Dr. Chetan Nagaraj", contactPersonEmail:"info@bsp.ac.in",      department:"Psychiatry & Behavioral Sciences" },
  { institutionName:"Mumbai Centre for Psychology",                 affiliationNumber:"MCP-2023-007",  address:"7 Mindful Lane, Mumbai - 400001",         contactPhone:"+91-22-6543-2198", website:"https://mcp.edu.in",   contactPersonName:"Dr. Priti Desai",    contactPersonEmail:"admin@mcp.edu.in",    department:"Applied Psychology" },
];

async function seed() {
  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
  console.log("Connected to MongoDB:", DB_NAME);

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}), Patient.deleteMany({}), Therapist.deleteMany({}),
    Supervisor.deleteMany({}), College.deleteMany({}),
    Session.deleteMany({}), Feedback.deleteMany({}), Assessment.deleteMany({}),
    ChatRoom.deleteMany({}), Message.deleteMany({}),
  ]);

  const pw  = await bcrypt.hash("Password@123", 10);
  const now = new Date();

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminId = nid();
  const adminAt = monthsAgo(8);
  await User.collection.insertMany([{
    _id: adminId, fullName: "Admin CareNest", email: "admin@carenest.dev",
    password: pw, role: "admin", isActive: true, createdAt: adminAt, updatedAt: adminAt,
  }]);
  console.log("Admin created");

  // ── Supervisors ────────────────────────────────────────────────────────────
  const svUserDocs = SV_NAMES.map((name, i) => {
    const at = between(monthsAgo(7), monthsAgo(5));
    return { _id: nid(), fullName: name, email: `${slug(name)}.sv${i}@carenest.dev`, password: pw, role: "supervisor", isActive: true, createdAt: at, updatedAt: at };
  });
  await User.collection.insertMany(svUserDocs);

  const svProfDocs = svUserDocs.map((u, i) => ({
    _id: nid(), userId: u._id,
    professionalLicenseNumber: `SUP-LIC-${2020 + i}-${rand(1000,9999)}`,
    supervisedStudents: [],
    createdAt: u.createdAt, updatedAt: u.createdAt,
  }));
  await Supervisor.collection.insertMany(svProfDocs);
  console.log(`${svUserDocs.length} supervisors`);

  // ── Colleges ───────────────────────────────────────────────────────────────
  const colUserDocs = COL_ROWS.map((c, i) => {
    const at = between(monthsAgo(6), monthsAgo(3));
    return { _id: nid(), fullName: c.institutionName, email: c.contactPersonEmail, password: pw, role: "college", isActive: true, createdAt: at, updatedAt: at };
  });
  await User.collection.insertMany(colUserDocs);

  const colProfDocs = COL_ROWS.map((c, i) => ({
    _id: nid(), userId: colUserDocs[i]._id, ...c,
    affiliatedStudents: [],
    agreementStartDate: monthsAgo(6),
    agreementEndDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    verificationStatus: i === 0 ? "verified" : "pending",
    createdAt: colUserDocs[i].createdAt, updatedAt: colUserDocs[i].createdAt,
  }));
  await College.collection.insertMany(colProfDocs);
  console.log(`${colUserDocs.length} colleges`);

  // ── Therapists ─────────────────────────────────────────────────────────────
  const tFees  = T_NAMES.map(() => pick(FEES));
  const tSpecs = T_NAMES.map(() => pickMany(SPECS, 2, 4));

  const tUserDocs = T_NAMES.map((name, i) => {
    const frac = i / T_NAMES.length;
    const moBack = Math.round(6 - frac * 5);
    const at = between(monthsAgo(moBack + 1), monthsAgo(moBack));
    return { _id: nid(), fullName: name, email: `${slug(name)}.t${i}@carenest.dev`, password: pw, role: "therapist", isActive: i < 11, createdAt: at, updatedAt: at };
  });
  await User.collection.insertMany(tUserDocs);

  const tProfDocs = tUserDocs.map((u, i) => {
    const isStudent = i >= 7;
    const sv = isStudent ? svProfDocs[i % svProfDocs.length] : null;
    const yearsExp = isStudent ? rand(0, 2) : rand(3, 18);
    const currentYear = new Date().getFullYear();
    
    // Generate 1-3 qualifications for each therapist
    const qualCount = isStudent ? rand(1, 2) : rand(2, 3);
    const qualifications = pickMany(DEGREES, qualCount, qualCount).map(deg => ({
      degree: deg.degree,
      institution: deg.institution,
      year: currentYear - yearsExp - deg.yearOffset,
    }));
    
    return {
      _id: nid(), userId: u._id,
      bio: `${T_NAMES[i]} specialises in ${tSpecs[i].slice(0,2).join(" and ")}. With ${yearsExp} years of experience, ${T_NAMES[i].includes("Dr.") ? "Dr." : ""} ${T_NAMES[i].split(" ").pop()} provides compassionate care to help clients achieve their mental health goals.`,
      isStudent,
      qualifications,
      licenseNumber: isStudent ? null : `LIC-${2016+i}-${rand(1000,9999)}`,
      specializations: tSpecs[i],
      yearsOfExperience: yearsExp,
      sessionRate: tFees[i],
      availability: { 
        monday: ["09:00","11:00","14:00","16:00"], 
        tuesday: ["10:00","13:00","15:00"], 
        wednesday: ["09:00","12:00","15:00"], 
        thursday: ["10:00","14:00","16:00"],
        friday: ["11:00","14:00","16:00"] 
      },
      supervisorId: sv?._id || null,
      verificationStatus: isStudent ? "pending" : i === 0 ? "rejected" : "verified",
      averageRating: 0,
      createdAt: u.createdAt, updatedAt: u.createdAt,
    };
  });
  await Therapist.collection.insertMany(tProfDocs);

  // Link student therapists to supervisors & colleges
  for (let i = 7; i < tUserDocs.length; i++) {
    await Supervisor.collection.updateOne(
      { _id: svProfDocs[i % svProfDocs.length]._id },
      { $addToSet: { supervisedStudents: tUserDocs[i]._id } }
    );
    await College.collection.updateOne(
      { _id: colProfDocs[i % colProfDocs.length]._id },
      { $addToSet: { affiliatedStudents: tUserDocs[i]._id } }
    );
  }
  console.log(`${tUserDocs.length} therapists`);

  const verifiedTUsers = tUserDocs.filter((_, i) => tProfDocs[i].verificationStatus === "verified");

  // ── Patients ───────────────────────────────────────────────────────────────
  const pUserDocs = P_NAMES.map((name, i) => {
    const frac = i / P_NAMES.length;
    const moBack = Math.round((1 - frac ** 0.6) * 6);
    const at = between(monthsAgo(moBack + 1), monthsAgo(Math.max(0, moBack)));
    return { _id: nid(), fullName: name, email: `${slug(name)}.p${i}@carenest.dev`, password: pw, role: "patient", isActive: i < 33, createdAt: at, updatedAt: at };
  });
  await User.collection.insertMany(pUserDocs);

  const pProfDocs = pUserDocs.map(u => ({
    _id: nid(), userId: u._id,
    dateOfBirth: between(new Date("1975-01-01"), new Date("2004-12-31")),
    progressRecords: [],
    createdAt: u.createdAt, updatedAt: u.createdAt,
  }));
  await Patient.collection.insertMany(pProfDocs);
  console.log(`${pUserDocs.length} patients`);

  // ── Assessments ────────────────────────────────────────────────────────────
  const assmDocs = pUserDocs.map(u => ({
    _id: nid(), patientId: u._id,
    answers: {
      ageGroup: pick(AGE_GROUPS), occupation: pick(OCCUPATIONS),
      lifestyle: pick(LIFESTYLES), activityLevel: pick(ACTIVITY_LVL),
      concerns: pickMany(CONCERNS, 1, 4), duration: pick(DURATIONS),
      impactLevel: rand(1, 5),
    },
    createdAt: u.createdAt, updatedAt: u.createdAt,
  }));
  await Assessment.collection.insertMany(assmDocs);
  console.log(`${assmDocs.length} assessments`);

  // ── Sessions ───────────────────────────────────────────────────────────────
  const STATUS_W = [
    { v:"completed", w:48 }, { v:"confirmed", w:12 }, { v:"scheduled", w:8 },
    { v:"pending", w:10 }, { v:"cancelled", w:12 }, { v:"no-show", w:5 }, { v:"rejected", w:5 },
  ];

  // Helper for generating mock meeting links
  const genMeetingLink = (sessionId) => `https://carenest.dev/meet/${sessionId.toString().slice(-8)}`;
  
  // Therapist session notes templates
  const SESSION_NOTES = [
    "Patient discussed ongoing challenges with anxiety. Introduced breathing techniques and grounding exercises. Good engagement throughout the session.",
    "Reviewed progress on previous homework. Patient reported improvement in sleep patterns. Discussed CBT techniques for managing negative thoughts.",
    "Explored childhood experiences and their impact on current relationships. Patient showed insight and willingness to examine patterns.",
    "Focused on stress management strategies. Patient practiced progressive muscle relaxation during session with positive response.",
    "Discussed workplace stressors and boundary-setting. Role-played difficult conversations. Patient expressed increased confidence.",
    "Reviewed mood journal entries. Identified triggers and patterns. Introduced thought challenging techniques.",
    "Addressed grief processing. Patient shared memories and expressed emotions appropriately. Discussed healthy coping mechanisms.",
    "Worked on communication skills and assertiveness. Patient practiced using I-statements. Homework: apply techniques in one real situation.",
    "Explored self-esteem issues and negative self-talk. Introduced cognitive restructuring exercises. Patient receptive to new perspectives.",
    "Follow-up on trauma processing work. Patient demonstrated improved coping strategies. Continuing EMDR-informed techniques next session.",
  ];

  const sessDocs = [];

  // Historical sessions spread over 6 months
  for (const patient of pUserDocs) {
    const count = rand(3, 8);
    for (let s = 0; s < count; s++) {
      const tu   = pick(verifiedTUsers);
      const tIdx = tUserDocs.indexOf(tu);
      const mo   = rand(1, 6);
      const scheduledAt = between(monthsAgo(mo + 0.5), monthsAgo(Math.max(0, mo - 0.5)));
      const status = wPick(STATUS_W);
      const sessId = nid();
      sessDocs.push({
        _id: sessId,
        patientId: patient._id, therapistId: tu._id,
        scheduledAt,
        duration: pick([45,60,60,60,90]),
        status, sessionType: "video",
        meetingLink: ["confirmed", "scheduled", "completed"].includes(status) ? genMeetingLink(sessId) : null,
        therapistNotes: status === "completed" ? pick(SESSION_NOTES) : null,
        sessionFee: tFees[tIdx],
        paymentStatus: status === "completed" ? "paid" : status === "cancelled" ? "refunded" : "pending",
        cancellationReason: status === "cancelled" ? pick(CANCEL_RSNS) : null,
        cancelledBy: status === "cancelled" ? (Math.random() < .5 ? patient._id : tu._id) : null,
        createdAt: scheduledAt, updatedAt: scheduledAt,
      });
    }
  }

  // Recent 14-day sessions (fills the activity chart)
  for (let d = 0; d < 14; d++) {
    const ds = new Date(); ds.setDate(ds.getDate() - d); ds.setHours(8,0,0,0);
    const de = new Date(ds); de.setHours(21,0,0,0);
    for (let i = 0; i < rand(3, 8); i++) {
      const tu   = pick(verifiedTUsers);
      const tIdx = tUserDocs.indexOf(tu);
      const scheduledAt = between(ds, de);
      const status = d <= 1
        ? pick(["pending","confirmed","scheduled"])
        : wPick([{ v:"completed", w:6 }, { v:"cancelled", w:2 }, { v:"no-show", w:1 }]);
      const sessId = nid();
      sessDocs.push({
        _id: sessId,
        patientId: pick(pUserDocs)._id, therapistId: tu._id,
        scheduledAt,
        duration: pick([45,60,90]),
        status, sessionType:"video",
        meetingLink: ["confirmed", "scheduled", "completed"].includes(status) ? genMeetingLink(sessId) : null,
        therapistNotes: status === "completed" ? pick(SESSION_NOTES) : null,
        sessionFee: tFees[tIdx],
        paymentStatus: status === "completed" ? "paid" : "pending",
        cancellationReason: null, cancelledBy: null,
        createdAt: scheduledAt, updatedAt: scheduledAt,
      });
    }
  }

  await Session.collection.insertMany(sessDocs);
  console.log(`${sessDocs.length} sessions`);

  // ── Progress Records for Patients ─────────────────────────────────────────
  // Add progress records for completed sessions
  const completedSessions = sessDocs.filter(s => s.status === "completed");
  const progressRecordUpdates = new Map(); // patientId -> progress records array
  
  for (const session of completedSessions) {
    const patientIdStr = session.patientId.toString();
    if (!progressRecordUpdates.has(patientIdStr)) {
      progressRecordUpdates.set(patientIdStr, []);
    }
    
    // Get corresponding patient and therapist profile IDs
    const patientProf = pProfDocs.find(p => p.userId.toString() === patientIdStr);
    const therapistProf = tProfDocs.find(t => t.userId.toString() === session.therapistId.toString());
    
    if (patientProf && therapistProf) {
      const goals = pickMany(THERAPY_GOALS, 2, 4);
      const completedGoalsCount = Math.floor(goals.length * Math.random() * 0.8);
      const completedGoals = goals.slice(0, completedGoalsCount);
      
      progressRecordUpdates.get(patientIdStr).push({
        _id: nid(),
        patientId: patientProf._id,
        therapistId: therapistProf._id,
        sessionId: session._id,
        notes: `Session focused on ${goals[0].toLowerCase()} and ${goals[1]?.toLowerCase() || 'overall progress'}. Patient showed good engagement and willingness to practice techniques discussed.`,
        progressScore: rand(3, 10),
        goals,
        completedGoals,
        nextSteps: pick(NEXT_STEPS),
        createdAt: session.scheduledAt,
        updatedAt: session.scheduledAt,
      });
    }
  }
  
  // Update patient documents with progress records
  let totalProgressRecords = 0;
  for (const [patientIdStr, records] of progressRecordUpdates) {
    if (records.length > 0) {
      const patientProf = pProfDocs.find(p => p.userId.toString() === patientIdStr);
      if (patientProf) {
        await Patient.collection.updateOne(
          { _id: patientProf._id },
          { $set: { progressRecords: records } }
        );
        totalProgressRecords += records.length;
      }
    }
  }
  console.log(`${totalProgressRecords} progress records added to patients`);

  // ── Chat Rooms & Messages ──────────────────────────────────────────────────
  // Create chat rooms for sessions that are confirmed, scheduled, or completed
  const chatEligibleSessions = sessDocs.filter(s => 
    ["confirmed", "scheduled", "completed"].includes(s.status)
  );
  
  // Group sessions by patient-therapist pair to create unique chat rooms
  const patientTherapistPairs = new Map();
  for (const s of chatEligibleSessions) {
    const key = `${s.patientId.toString()}-${s.therapistId.toString()}`;
    if (!patientTherapistPairs.has(key)) {
      patientTherapistPairs.set(key, { 
        patientId: s.patientId, 
        therapistId: s.therapistId, 
        sessions: [] 
      });
    }
    patientTherapistPairs.get(key).sessions.push(s);
  }

  const chatRoomDocs = [];
  const messageDocs = [];

  for (const [key, pair] of patientTherapistPairs) {
    // Use the earliest session for this pair
    const earliestSession = pair.sessions.sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
    const latestSession = pair.sessions.sort((a, b) => b.scheduledAt - a.scheduledAt)[0];
    
    const roomCreatedAt = earliestSession.scheduledAt;
    const hasCompletedSession = pair.sessions.some(s => s.status === "completed");
    const expiresAt = hasCompletedSession 
      ? new Date(latestSession.scheduledAt.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after last session
      : null;

    // Determine room status
    let roomStatus = "active";
    if (expiresAt && expiresAt < now) {
      roomStatus = "archived";
    }

    const chatRoomId = nid();
    
    // Generate messages for this chat room (between 3-12 messages)
    const messageCount = rand(3, 12);
    const roomMessages = [];
    let lastMessageAt = null;
    let lastMessagePreview = null;

    // Add a system message at the start
    roomMessages.push({
      _id: nid(),
      chatRoomId,
      senderId: pair.therapistId, // System messages attributed to therapist
      content: "Chat room created. You can now communicate with your therapist.",
      messageType: "system",
      isRead: true,
      readAt: new Date(roomCreatedAt.getTime() + 60000),
      isDeleted: false,
      createdAt: roomCreatedAt,
      updatedAt: roomCreatedAt,
    });

    for (let m = 0; m < messageCount; m++) {
      // Alternate between patient and therapist messages
      const isPatient = m % 2 === 0;
      const senderId = isPatient ? pair.patientId : pair.therapistId;
      const content = isPatient ? pick(PATIENT_MESSAGES) : pick(THERAPIST_MESSAGES);
      
      // Message created sometime between room creation and now
      const msgCreatedAt = between(new Date(roomCreatedAt.getTime() + 3600000), now);
      
      const msgDoc = {
        _id: nid(),
        chatRoomId,
        senderId,
        content,
        messageType: "text",
        isRead: Math.random() < 0.85, // 85% chance message is read
        readAt: Math.random() < 0.85 ? new Date(msgCreatedAt.getTime() + rand(60000, 3600000)) : null,
        isDeleted: false,
        createdAt: msgCreatedAt,
        updatedAt: msgCreatedAt,
      };
      
      roomMessages.push(msgDoc);
    }

    // Sort messages by createdAt
    roomMessages.sort((a, b) => a.createdAt - b.createdAt);
    
    if (roomMessages.length > 0) {
      const lastMsg = roomMessages[roomMessages.length - 1];
      lastMessageAt = lastMsg.createdAt;
      lastMessagePreview = lastMsg.content.substring(0, 100);
    }

    // Calculate unread counts
    const patientUnreadCount = roomMessages.filter(m => 
      m.senderId.toString() !== pair.patientId.toString() && !m.isRead
    ).length;
    const therapistUnreadCount = roomMessages.filter(m => 
      m.senderId.toString() !== pair.therapistId.toString() && !m.isRead
    ).length;

    chatRoomDocs.push({
      _id: chatRoomId,
      patientId: pair.patientId,
      therapistId: pair.therapistId,
      sessionId: earliestSession._id,
      status: roomStatus,
      lastMessageAt,
      lastMessagePreview,
      patientUnreadCount,
      therapistUnreadCount,
      expiresAt,
      createdAt: roomCreatedAt,
      updatedAt: lastMessageAt || roomCreatedAt,
    });

    messageDocs.push(...roomMessages);
  }

  if (chatRoomDocs.length > 0) {
    await ChatRoom.collection.insertMany(chatRoomDocs);
  }
  if (messageDocs.length > 0) {
    await Message.collection.insertMany(messageDocs);
  }
  console.log(`${chatRoomDocs.length} chat rooms with ${messageDocs.length} messages`);

  // ── Feedbacks ──────────────────────────────────────────────────────────────
  const RATING_W = [{ v:5,w:38 },{ v:4,w:30 },{ v:3,w:18 },{ v:2,w:9 },{ v:1,w:5 }];

  const fbDocs = [];
  const completed = sessDocs.filter(s => s.status === "completed");

  for (const s of completed) {
    const rating = wPick(RATING_W);
    // Patient → Therapist
    fbDocs.push({
      _id: nid(), feedbackType: "patient-to-therapist",
      fromUser: s.patientId, toUser: s.therapistId, sessionId: s._id,
      overallRating: rating,
      categoryRatings: { professionalism: r1(rating), communication: r1(rating), effectiveness: r1(rating), empathy: r1(rating) },
      comment: rating >= 4 ? pick(PT_CMTS) : "The session was okay but could be improved.",
      strengths: [], areasForImprovement: [],
      isAnonymous: Math.random() < .1, isVisible: true, isFlagged: false,
      createdAt: new Date(s.scheduledAt.getTime() + 3_600_000),
      updatedAt: new Date(s.scheduledAt.getTime() + 3_600_000),
    });

    // Therapist → Patient (55%)
    if (Math.random() < .55) {
      const tr = rand(3, 5);
      fbDocs.push({
        _id: nid(), feedbackType: "therapist-to-patient",
        fromUser: s.therapistId, toUser: s.patientId, sessionId: s._id,
        overallRating: tr,
        categoryRatings: { engagement: r1(tr), progress: r1(tr), homework_completion: r1(tr), openness: r1(tr) },
        comment: "Patient showed good engagement and is making measurable progress.",
        strengths: [], areasForImprovement: [],
        isAnonymous: false, isVisible: true, isFlagged: false,
        createdAt: new Date(s.scheduledAt.getTime() + 7_200_000),
        updatedAt: new Date(s.scheduledAt.getTime() + 7_200_000),
      });
    }
  }

  // Supervisor → Therapist (1-2 per verified therapist)
  for (const tu of verifiedTUsers) {
    for (let i = 0; i < rand(1, 2); i++) {
      const sv = pick(svUserDocs);
      const sr = rand(3, 5);
      const at = between(monthsAgo(5), monthsAgo(1));
      fbDocs.push({
        _id: nid(), feedbackType: "supervisor-to-therapist",
        fromUser: sv._id, toUser: tu._id, sessionId: null,
        overallRating: sr,
        categoryRatings: { clinical_skills: r1(sr), documentation: r1(sr), ethical_practice: r1(sr), professional_development: r1(sr) },
        comment: "Shows consistent professional growth and strong therapeutic practice.",
        strengths: pickMany(["Communication","Empathy","Documentation","Punctuality","Clinical skills"], 2, 3),
        areasForImprovement: pickMany(["Time management","Session structuring","Case notes"], 1, 2),
        recommendations: "Continue current approach. Consider advanced CBT training.",
        reviewPeriod: pick(QUARTERS),
        isAnonymous: false, isVisible: true, isFlagged: false,
        createdAt: at, updatedAt: at,
      });
    }
  }

  await Feedback.collection.insertMany(fbDocs);
  console.log(`${fbDocs.length} feedbacks`);

  // ── Update therapist averageRating ─────────────────────────────────────────
  for (const tu of tUserDocs) {
    const ptFbs = fbDocs.filter(f => f.feedbackType === "patient-to-therapist" && f.toUser.toString() === tu._id.toString());
    if (!ptFbs.length) continue;
    const avg = ptFbs.reduce((s, f) => s + f.overallRating, 0) / ptFbs.length;
    await Therapist.collection.updateOne(
      { userId: tu._id },
      { $set: { averageRating: Math.round(avg * 10) / 10 } }
    );
  }
  console.log("Therapist average ratings updated");

  const revenue = completed.reduce((s, c) => s + c.sessionFee, 0);
  console.log(`
=========================================
  SEED COMPLETE
=========================================
  Admin       : 1
  Supervisors : ${svUserDocs.length}
  Colleges    : ${colUserDocs.length}  (1 verified, 2 pending)
  Therapists  : ${tUserDocs.length}  (7 verified, 5 student)
  Patients    : ${pUserDocs.length}  (33 active, 3 inactive)
  Sessions    : ${sessDocs.length}  (${completed.length} completed)
  Chat Rooms  : ${chatRoomDocs.length}
  Messages    : ${messageDocs.length}
  Progress Recs: ${totalProgressRecords}
  Revenue     : Rs ${revenue.toLocaleString()}
  Feedbacks   : ${fbDocs.length}
  Assessments : ${assmDocs.length}
=========================================
  Password for all accounts : Password@123
  Admin login               : admin@carenest.dev
=========================================
`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
