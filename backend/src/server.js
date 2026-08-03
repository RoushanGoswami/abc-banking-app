const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { pool } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ status: "HEALTHY", timestamp: new Date().toISOString() });
});

// 2. Enterprise Customer & Account Lookup Endpoint (Multi-Branch)
app.get("/api/accounts/:accountNumber", async (req, res) => {
  const { accountNumber } = req.params;
  try {
    const query = `
      SELECT a.account_number, a.account_type, a.balance, a.status,
             c.first_name, c.last_name, c.email, c.phone, c.pan_number,
             b.branch_name, b.branch_code, b.ifsc_code, b.city
      FROM accounts a
      JOIN customers c ON a.customer_id = c.id
      JOIN branches b ON a.branch_id = b.id
      WHERE a.account_number = $1
    `;
    const result = await pool.query(query, [accountNumber]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Account not found. Check the account number." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database query error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching account details." });
  }
});

// 3. ACID Teller Transaction Engine with Audit Logging
app.post("/api/transactions", async (req, res) => {
  const {
    accountNumber,
    type,
    amount,
    username = "teller_ahmedabad",
  } = req.body;
  const numericAmount = Number(amount);

  if (!accountNumber || !type || !numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: "Invalid transaction details." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check account existence and lock row for ACID consistency
    const acctRes = await client.query(
      `SELECT a.id, a.balance, a.branch_id 
       FROM accounts a 
       WHERE a.account_number = $1 FOR UPDATE`,
      [accountNumber],
    );

    if (acctRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Account not found." });
    }

    const account = acctRes.rows[0];
    const currentBalance = Number(account.balance);
    let newBalance = currentBalance;

    if (type === "DEPOSIT") {
      newBalance = currentBalance + numericAmount;
    } else if (type === "WITHDRAW") {
      if (currentBalance < numericAmount) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Insufficient funds for withdrawal." });
      }
      newBalance = currentBalance - numericAmount;
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid transaction type." });
    }

    // Update account balance
    await client.query(
      "UPDATE accounts SET balance = $1 WHERE account_number = $2",
      [newBalance, accountNumber],
    );

    // Look up employee user_id for audit trail
    const userRes = await client.query(
      "SELECT id, branch_id FROM users WHERE username = $1",
      [username],
    );
    const userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;
    const branchId =
      userRes.rows.length > 0 ? userRes.rows[0].branch_id : account.branch_id;

    // Log immutable compliance record to audit_logs
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    await client.query(
      `INSERT INTO audit_logs (user_id, branch_id, action_type, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        branchId,
        `TELLER_${type}_₹${numericAmount}_ACCT_${accountNumber}`,
        ipAddress,
      ],
    );

    await client.query("COMMIT");
    res.json({
      message: `${type} successful!`,
      accountNumber,
      newBalance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction Error:", err);
    res.status(500).json({ message: `Database Error: ${err.message}` });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`ABC Banking Core Backend online at port ${PORT}`);
});
