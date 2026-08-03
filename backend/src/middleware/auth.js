const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

// Verify JWT token from incoming requests
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Check if user role is allowed to access an endpoint
const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };

// Log financial actions to audit_logs table
const auditLogger = (action, entity) => async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user?.id || null,
            action,
            entity,
            req.body?.accountId || null,
            ip,
          ],
        );
      } catch (err) {
        console.error("Audit Log Error:", err.message);
      }
    }
  });
  next();
};

module.exports = { authenticate, authorizeRoles, auditLogger };
