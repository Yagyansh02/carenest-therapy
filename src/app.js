import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();


app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
));
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true,limit : "16kb"}))
app.use(express.static("public"));
app.use(cookieParser());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "CareNest Therapy API is running",
    timestamp: new Date().toISOString()
  });
});

// routes import
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import therapistRouter from './routes/therapist.routes.js';
import docsRouter from './routes/docs.routes.js';

//routes declaration
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/therapists", therapistRouter);

// API Documentation route (Scalar)
app.use("/docs", docsRouter);

// error handling middleware
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

app.use(notFound);
app.use(errorHandler);

export { app };
