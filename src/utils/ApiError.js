/**
 * Custom error class for API errors.
 * Extends the built-in Error class to include HTTP status codes, error details, and stack trace handling.
 *
 * @class
 * @extends Error
 *
 * @param {number} statusCode - The HTTP status code associated with the error.
 * @param {string} [message="Something went wrong"] - A descriptive error message.
 * @param {Array} [errors=[]] - An array of additional error details or validation errors.
 * @param {string} [stack=""] - Optional stack trace. If not provided, it will be captured automatically.
 *
 * @property {number} statusCode - The HTTP status code for the error.
 * @property {null} data - Reserved for additional data (currently always null).
 * @property {boolean} success - Indicates the request was not successful (always false).
 * @property {Array} errors - Additional error details.
 */
class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
