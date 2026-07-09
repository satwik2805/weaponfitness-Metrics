const crypto = require("crypto");

// Constant-time string comparison to avoid timing attacks
const safeEqual = (a, b) => {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

// Shared-secret auth for /api/email/* routes.
// Requests must carry an "x-api-key" header matching process.env.EMAIL_API_KEY.
const requireApiKey = (req, res, next) => {
  // Fail closed — startup validation in index.js enforces this, but guard anyway
  if (!process.env.EMAIL_API_KEY) {
    console.error("❌ EMAIL_API_KEY is not set — rejecting request");
    return res.status(503).json({ error: "Email service not configured" });
  }

  const providedKey = req.headers["x-api-key"];

  if (!providedKey || !safeEqual(providedKey, process.env.EMAIL_API_KEY)) {
    return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
  }

  next();
};

module.exports = requireApiKey;
