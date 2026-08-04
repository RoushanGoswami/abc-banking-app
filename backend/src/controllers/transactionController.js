const { pool } = require("../config/db");

// 1. Sub-2-Second Enterprise Customer Search (< 2 Second SLA)
const searchAccounts = async (req, res) => {
  const { query } = req.query;
  const { role, branch_id, branchId } = req.user || {};
  const currentBranchId = branchId || branch_id;

  if (!query || query.trim().length < 2) {
    return res
      .status(400)
      .json({ message: "Search term must be at least 2 characters." });
  }

  try {
    let branchFilter = "";
    const params = [`%${query.trim()}%`];

    // Managers and Tellers only search within their own branch; ADMIN searches bank-wide
    if (role !== "ADMIN" && currentBranchId) {
      branchFilter = "AND a.branch_id = $2";
      params.push(currentBranchId);
    }

    const searchQuery = `
      SELECT 
        a.account_number, a.account_type, a.balance, a.status,
        c.first_name, c.last_name, c.phone, c.pan_number,
        b.branch_name, b.ifsc_code
      FROM accounts a
      JOIN customers c ON a.customer_id = c.id
      JOIN branches b ON a.branch_id = b.id
      WHERE (
        a.account_number ILIKE $1 OR
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1 OR
        c.phone ILIKE $1 OR
        c.pan_number ILIKE $1
      )
      ${branchFilter}
      LIMIT 25
    `;

    const result = await pool.query(searchQuery, params);
    res.json({ count: result.rows.length, results: result.rows });
  } catch (err) {
    console.error("Search Error:", err);
    res
      .status(500)
      .json({ message: "Error performing high-speed account search." });
  }
};

// 2. ACID Fund Transfer Engine (NEFT/RTGS Simulation)
const transferFunds = async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;
  const numericAmount = Number(amount);

  if (!fromAccount || !toAccount || !numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: "Invalid transfer parameters." });
  }

  if (fromAccount === toAccount) {
    return res
      .status(400)
      .json({ message: "Cannot transfer to the same account." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock both accounts in alphabetical order to prevent deadlocks
    const accountsOrder = [fromAccount, toAccount].sort();
    const acctQuery = `
      SELECT id, account_number, balance, branch_id, status 
      FROM accounts 
      WHERE account_number = ANY($1) 
      FOR UPDATE
    `;
    const acctRes = await client.query(acctQuery, [accountsOrder]);

    if (acctRes.rows.length !== 2) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "One or both accounts not found." });
    }

    const source = acctRes.rows.find((r) => r.account_number === fromAccount);
    const target = acctRes.rows.find((r) => r.account_number === toAccount);

    if (Number(source.balance) < numericAmount) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Insufficient funds in source account." });
    }

    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE account_number = $2",
      [numericAmount, fromAccount],
    );
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE account_number = $2",
      [numericAmount, toAccount],
    );

    await client.query("COMMIT");
    res.json({
      message: "Fund transfer completed successfully.",
      transfer: { fromAccount, toAccount, amount: numericAmount },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transfer Error:", err);
    res.status(500).json({ message: `Transfer failed: ${err.message}` });
  } finally {
    client.release();
  }
};

module.exports = { searchAccounts, transferFunds };
  