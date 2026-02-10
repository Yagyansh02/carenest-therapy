import { ApiError } from "../utils/ApiError.js";

/**
 * Global error handling middleware
 * Catches all errors thrown in the application and formats them consistently.
 * 
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {WriteStream} errorLogStream - Optional write stream for logging errors to file
 */
export const errorHandler = (err, req, res, next, errorLogStream) => {
  let error = err;

  // If error is not an instance of ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Log error to file if stream is provided
  if (errorLogStream) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      userAgent: req.get('user-agent'),
      stack: error.stack
    };
    
    errorLogStream.write(JSON.stringify(errorLog) + '\n');
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

/**
 * Middleware to handle 404 Not Found errors
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found - ${req.originalUrl}`);
  next(error);
};
