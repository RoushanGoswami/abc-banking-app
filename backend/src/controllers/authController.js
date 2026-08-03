const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Secret key for signing JWTs (in production, use process.env.JWT_SECRET)
const JWT_SECRET =
  process.env.JWT_SECRET || "abc_banking_super_secret_key_2026";

// Employee Login Handler
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    // 1. Fetch user from database
    const userQuery = `
      SELECT u.id, u.username, u.password_hash, u.role, u.branch_id, b.branch_name, b.city
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      WHERE u.username = $1 AND u.is_active = TRUE
    `;
    const result = await pool.query(userQuery, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = result.rows[0];

    // 2. Validate password (supports both plain text seed passwords and hashed passwords)
    let isPasswordValid = false;
    if (user.password_hash.startsWith("hashed_")) {
      // Temporary fallback for quick testing with seed strings like 'hashed_pw_teller1'
      isPasswordValid =
        password === "password123" ||
        password === user.password_hash.replace("hashed_pw_", "");
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // 3. Generate JWT Token (Expires in 8 hours for banking shift hours)
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    // 4. Send response back to frontend
    res.json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        role: user.role,
        branchName: user.branch_name,
        city: user.city,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during authentication." });
  }
};

module.exports = { login };
  