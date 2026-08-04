const { pool } = require("../config/db");

// Export Branch Accounts & Balances as a Downloadable CSV Report
const exportBranchReportCSV = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    let branchFilter = "";
    const params = [];

    if (role !== "ADMIN") {
      branchFilter = "WHERE a.branch_id = $1";
      params.push(branchId);
    }

    const query = `
      SELECT 
        a.account_number, c.first_name || ' ' || c.last_name AS customer_name, 
        a.account_type, a.balance, a.status, b.branch_name
      FROM accounts a
      JOIN customers c ON a.customer_id = c.id
      JOIN branches b ON a.branch_id = b.id
      ${branchFilter}
      LIMIT 5000
    `;

    const result = await pool.query(query, params);

    // Build CSV Header & Rows
    let csv =
      "Account Number,Customer Name,Account Type,Balance (INR),Status,Branch Name\n";
    result.rows.forEach((row) => {
      csv += `"${row.account_number}","${row.customer_name}","${row.account_type}",${row.balance},"${row.status}","${row.branch_name}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ABC_Bank_Report_${Date.now()}.csv`,
    );
    res.status(200).send(csv);
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ message: "Failed to generate CSV export report." });
  }
};

module.exports = { exportBranchReportCSV };
