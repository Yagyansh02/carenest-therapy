
/**
 * Wraps an asynchronous route handler to catch errors and pass them to Express error handlers.
 *
 * @param {Function} requestHandler - The async function to handle the request, with signature (req, res, next).
 * @returns {Function} A function that executes the handler and forwards any errors to next().
 *
 * @example
 * router.get('/route', asyncHandler(async (req, res) => {
 *   // Your async code here
 * }));
 */


const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
      .catch((err) => next(err));
  };
};

export { asyncHandler };

