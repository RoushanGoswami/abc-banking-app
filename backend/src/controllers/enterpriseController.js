const { pool } = require("../config/db");

// 1. ATOMIC ACCOUNT & CUSTOMER ONBOARDING
const createCustomerAccount = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      firstName,
      lastName,
      phone,
      panNumber,
      branchId,
      accountType,
      initialDeposit,
    } = req.body;

    if (!firstName || !lastName || !panNumber || !branchId || !initialDeposit) {
      return res
        .status(400)
        .json({ message: "Missing required onboarding fields." });
    }

    await client.query("BEGIN");

    // Insert Customer KYC Record
    const customerRes = await client.query(
      `INSERT INTO customers (first_name, last_name, phone, pan_number, branch_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [firstName, lastName, phone, panNumber, branchId],
    );
    const customerId = customerRes.rows[0].id;

    // Generate unique 12-digit account number
    const acctNumRes = await client.query(
      "SELECT COALESCE(MAX(account_number::bigint), 100000000000) + 1 AS next_acct FROM accounts",
    );
    const nextAccountNumber = String(acctNumRes.rows[0].next_acct);

    // Fetch branch IFSC code
    const branchRes = await client.query(
      "SELECT ifsc_code FROM branches WHERE id = $1",
      [branchId],
    );
    const ifscCode = branchRes.rows[0]?.ifsc_code || "ABCB0000001";

    // Insert Bank Account
    const accountRes = await client.query(
      `INSERT INTO accounts (account_number, customer_id, branch_id, account_type, balance, ifsc_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') RETURNING account_number, balance`,
      [
        nextAccountNumber,
        customerId,
        branchId,
        accountType || "SAVINGS",
        initialDeposit,
        ifscCode,
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Account onboarded successfully!",
      accountNumber: accountRes.rows[0].account_number,
      balance: accountRes.rows[0].balance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Onboarding Error:", err);
    res
      .status(500)
      .json({ message: err.detail || "Failed to onboard customer account." });
  } finally {
    client.release();
  }
};

// 2. GET ALL BRANCHES WITH ANALYTICS
const getBranches = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id, b.branch_name, b.city, b.ifsc_code,
        COUNT(a.account_number) AS total_accounts,
        COALESCE(SUM(a.balance), 0) AS total_deposits
      FROM branches b
      LEFT JOIN accounts a ON b.id = a.branch_id
      GROUP BY b.id, b.branch_name, b.city, b.ifsc_code
      ORDER BY b.id ASC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Branch Fetch Error:", err);
    res.status(500).json({ message: "Failed to load branches." });
  }
};

// 3. CREATE NEW BRANCH (ADMIN ONLY) - WITH REAL SQL ERROR REPORTING
const createBranch = async (req, res) => {
  try {
    const { branchName, city, ifscCode } = req.body;
    if (!branchName || !city || !ifscCode) {
      return res
        .status(400)
        .json({ message: "All branch fields are required." });
    }

    // 1. Calculate next ID automatically
    const maxIdRes = await pool.query(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM branches",
    );
    const nextId = maxIdRes.rows[0].next_id;

    // 2. Generate required Branch Code (e.g., BR005)
    const branchCode = `BR${String(nextId).padStart(3, "0")}`;

    // 3. Insert into database including branch_code
    const result = await pool.query(
      `INSERT INTO branches (id, branch_code, branch_name, city, ifsc_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nextId, branchCode, branchName, city, ifscCode],
    );

    res
      .status(201)
      .json({ message: "Branch added successfully!", branch: result.rows[0] });
  } catch (err) {
    console.error("Branch Create Error:", err);
    // This sends the EXACT PostgreSQL error straight to your webpage banner!
    res.status(500).json({
      message: `SQL Error: ${err.message || err.detail || "Unknown Database Error"}`,
    });
  }
};

module.exports = { createCustomerAccount, getBranches, createBranch };
// 4. UPDATE BRANCH DETAILS (ADMIN ONLY)
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchName, city, ifscCode } = req.body;

    const result = await pool.query(
      `UPDATE branches 
       SET branch_name = $1, city = $2, ifsc_code = $3 
       WHERE id = $4 RETURNING *`,
      [branchName, city, ifscCode, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Branch not found." });
    }

    res.status(200).json({
      message: "Branch updated successfully!",
      branch: result.rows[0],
    });
  } catch (err) {
    console.error("Update Branch Error:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to update branch." });
  }
};

// 5. DELETE EMPTY BRANCH (ADMIN ONLY)
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    // Safety check: Prevent deleting branches that still have active customer accounts
    const checkRes = await pool.query(
      "SELECT COUNT(*) FROM accounts WHERE branch_id = $1",
      [id],
    );
    if (Number(checkRes.rows[0].count) > 0) {
      return res.status(400).json({
        message: "Cannot delete a branch that has active customer accounts!",
      });
    }

    const result = await pool.query(
      "DELETE FROM branches WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Branch not found." });
    }

    res.status(200).json({ message: "Branch deleted successfully!" });
  } catch (err) {
    console.error("Delete Branch Error:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to delete branch." });
  }
};

// UPDATE YOUR EXPORT LINE AT THE VERY BOTTOM TO INCLUDE ALL 5 FUNCTIONS:
module.exports = {
  createCustomerAccount,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
