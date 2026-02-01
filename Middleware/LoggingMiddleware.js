// loggingMiddleware.js
// This middleware is currently inactive and all console overrides have been removed.
function loggingMiddleware(req, res, next) {
  next();
}

module.exports = loggingMiddleware;
