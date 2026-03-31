import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs (append mode)
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, `access-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

// Create a write stream for error logs (append mode)
const errorLogStream = fs.createWriteStream(
  path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);


app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
));

// Helmet with custom CSP - allow Scalar docs to work
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Scalar inline scripts
        "https://cdn.jsdelivr.net", // Scalar CDN
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Scalar inline styles
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true,limit : "16kb"}))
app.use(express.static("public"));
app.use(cookieParser());

// Morgan logging - console for development
app.use(morgan("dev"));

// Morgan logging - file for production/records
app.use(morgan("combined", { stream: accessLogStream }));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "CareNest Therapy API is running",
    timestamp: new Date().toISOString()
  });
});

// routes import
import userRouter from './routes/user.routes.js';
import therapistRouter from './routes/therapist.routes.js';
import supervisorRouter from './routes/supervisor.routes.js';
import assessmentRouter from './routes/assessment.routes.js';
import sessionRouter from './routes/session.routes.js';
import feedbackRouter from './routes/feedback.routes.js';
import collegeRouter from './routes/college.routes.js';
import docsRouter from './routes/docs.routes.js';
import videoCallRouter from './routes/videoCall.routes.js';
import chatRouter from './routes/chat.routes.js';

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/therapists", therapistRouter);
app.use("/api/v1/supervisors", supervisorRouter);
app.use("/api/v1/assessments", assessmentRouter);
app.use("/api/v1/sessions", sessionRouter);
app.use("/api/v1/video", videoCallRouter);
app.use("/api/v1/chat", chatRouter);

app.use("/api/v1/feedbacks", feedbackRouter);
app.use("/api/v1/colleges", collegeRouter);

// API Documentation route (Scalar)
app.use("/docs", docsRouter);

// error handling middleware
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

app.use(notFound);
app.use((err, req, res, next) => errorHandler(err, req, res, next, errorLogStream));

export { app };
