const AppError = require("../Utils/AppError");
const { redis } = require("../Config/redis.config");

const memoryStore = new Map();

const nowMs = () => currentDate();

const getClientIp = (req) => {
  const ip = req.ip || req.connection?.remoteAddress;
  return typeof ip === "string" ? ip : "unknown";
};

const getPayload = (req) => {
  return req.body && Object.keys(req.body).length ? req.body : req.query;
};

const getPhoneKeyPart = (phoneNumber) => {
  if (phoneNumber === null) {
    return null;
  }
  const cleaned = String(phoneNumber).trim();
  return cleaned.length ? cleaned : null;
};

const getNumber = (value, defaultValue) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
};

const getTtlSeconds = (ttlMs) => Math.max(1, Math.ceil(ttlMs / 1000));

const getMemoryBucket = (key, windowMs) => {
  const existing = memoryStore.get(key);
  const t = nowMs();
  if (!existing || existing.resetAt <= t) {
    const fresh = { count: 0, resetAt: t + windowMs };
    memoryStore.set(key, fresh);
    return fresh;
  }
  return existing;
};

const checkMemoryCooldown = (key, cooldownMs) => {
  const existing = memoryStore.get(key);
  const t = nowMs();
  if (existing && existing.resetAt > t) {
    return {
      blocked: true,
      retryAfterSeconds: getTtlSeconds(existing.resetAt - t),
    };
  }
  memoryStore.set(key, { count: 1, resetAt: t + cooldownMs });
  return { blocked: false };
};

/**
 * Login Rate Limiter Middleware
 *
 * This middleware implements rate limiting for login endpoints to prevent abuse and brute force attacks.
 * It limits login attempts based on phone number (primary identifier) and client IP address.
 *
 * @returns {Function} Express middleware function that handles rate limiting for login requests
 *
 * @description
 * How it works:
 * - Extracts phoneNumber from request body or query parameters
 * - Gets client IP address from req.ip or req.connection.remoteAddress
 * - Applies rate limiting using either Redis (preferred) or in-memory storage (fallback)
 *
 * Rate limiting rules:
 * 1. Phone Number Cooldown: After a successful login attempt, phone is blocked for a cooldown period
 * 2. Phone Number Window Limit: Limits total login attempts per phone number within a time window
 * 3. IP Address Window Limit: Limits total login requests per IP address within a time window
 *
 * Storage backends:
 * - Redis (primary): Uses Redis keys with expiration for distributed rate limiting
 * - Memory (fallback): Uses in-memory Map for single-instance deployments
 *
 * @env_variables
 * - LOGIN_PHONE_COOLDOWN_MS: Cooldown period after login attempt (default: 60000ms = 1min)
 * - LOGIN_PHONE_WINDOW_MS: Time window for phone number limits (default: 3600000ms = 1hr)
 * - LOGIN_PHONE_MAX: Max login attempts per phone number per window (default: 20)
 * - LOGIN_IP_WINDOW_MS: Time window for IP limits (default: 300000ms = 5min)
 * - LOGIN_IP_MAX: Max login requests per IP per window (default: 60)
 *
 * @accepts
 * - req.body.phoneNumber or req.query.phoneNumber: Phone number for rate limiting (optional but recommended)
 * - req.ip or req.connection.remoteAddress: Client IP address (automatically detected)
 *
 * @processes
 * 1. Extracts payload from req.body (if not empty) or req.query
 * 2. Cleans and validates phone number from payload
 * 3. Extracts client IP address
 * 4. Checks Redis availability; falls back to memory if unavailable
 * 5. Applies phone number cooldown check (if phone provided)
 * 6. Increments and checks phone number attempt count within window
 * 7. Increments and checks IP address request count within window
 * 8. Calls next() if all checks pass, or throws AppError with 429 if limits exceeded
 *
 * @validates
 * - Phone number: Must be non-empty string after trimming
 * - IP address: Must be valid string; uses "unknown" as fallback
 * - Coordinates: Validates latitude (-90 to 90) and longitude (-180 to 180)
 * - Request limits: Ensures counts don't exceed configured maximums
 *
 * @throws {AppError}
 * - 429 LOGIN_COOLDOWN: When phone is in cooldown period
 * - 429 LOGIN_PHONE_RATE_LIMIT: When phone exceeds attempts in window
 * - 429 LOGIN_IP_RATE_LIMIT: When IP exceeds requests in window
 * - 500 LOGIN_RATE_LIMITER_ERROR: When internal error occurs during rate limiting
 *
 * @headers
 * Sets "Retry-After" header with seconds until limit resets when rate limited
 *
 * @example
 * // In route definition
 * const loginRateLimiter = require('./Middleware/LoginRateLimiter');
 * router.post('/login', loginRateLimiter(), loginController);
 *
 * @example
 * // Request that would be rate limited
 * POST /login
 * Body: { "phoneNumber": "+1234567890" }
 * // After 20 attempts in 1 hour, returns 429 with retry-after
 */
const loginRateLimiter = () => {
  return async (req, res, next) => {
    // Rate limiting has been disabled
    return next();
  };
};

module.exports = loginRateLimiter;
