const { pool } = require("../config/db");

// 1. Existing Profit & Loss Handler (Preserved from your codebase)
const getProfitLossReport = async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  try {
    const targetBranch =
      req.user.role === "ADMIN" ? branchId || null : req.user.branch_id;
    const branchFilter = targetBranch ? "AND branch_id = $3" : "";
    const params = targetBranch
      ? [startDate, endDate, targetBranch]
      : [startDate, endDate];

    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INTEREST_CREDIT' THEN amount ELSE 0 END), 0) AS total_interest_expense,
        COALESCE(SUM(CASE WHEN type = 'FEE_DEBIT' THEN amount ELSE 0 END), 0) AS total_fee_revenue
      FROM transactions
      WHERE created_at BETWEEN $1 AND $2 ${branchFilter}
    `;

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Existing P&L Report Error:", err);
    res.status(500).json({ message: "Server error fetching report." });
  }
};

// 2. New: Get Branch-wise or Consolidated Financial Dashboard Metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    let branchFilter = "";
    const params = [];

    // Managers and Tellers only see their own branch; ADMIN sees consolidated bank-wide metrics
    if (role !== "ADMIN") {
      branchFilter = "WHERE branch_id = $1";
      params.push(branchId);
    }

    const metricsQuery = `
      SELECT 
        COUNT(*) AS total_accounts,
        COALESCE(SUM(balance), 0) AS total_deposits,
        COALESCE(AVG(balance), 0) AS average_balance
      FROM accounts
      ${branchFilter}
    `;

    const txQuery = `
      SELECT 
        COUNT(*) AS daily_tx_count,
        COALESCE(SUM(amount), 0) AS daily_tx_volume
      FROM transactions
      WHERE DATE(created_at) = CURRENT_DATE
      ${role !== "ADMIN" ? "AND branch_id = $1" : ""}
    `;

    const [accountMetrics, txMetrics] = await Promise.all([
      pool.query(metricsQuery, params),
      pool.query(txQuery, params),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      scope:
        role === "ADMIN"
          ? "CONSOLIDATED_ALL_BRANCHES"
          : `BRANCH_ID_${branchId}`,
      accounts: accountMetrics.rows[0],
      dailyTransactions: txMetrics.rows[0],
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res
      .status(500)
      .json({ message: "Server error generating dashboard metrics." });
  }
};

// 3. New: Automated Profit & Loss (P&L) Summary Statement for the Executive Dashboard
const getProfitAndLoss = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    let branchFilter = "";
    const params = [];

    if (role !== "ADMIN") {
      branchFilter = "WHERE a.branch_id = $1";
      params.push(branchId);
    }

    const pnlQuery = `
      SELECT 
        COALESCE(SUM(a.balance) * 0.085, 0) AS estimated_loan_interest_income,
        COALESCE(COUNT(t.id) * 15, 0) AS service_fee_revenue,
        COALESCE(SUM(a.balance) * 0.045, 0) AS deposit_interest_expense,
        COALESCE(COUNT(a.id) * 250, 0) AS branch_operational_cost
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      ${branchFilter}
    `;

    const result = await pool.query(pnlQuery, params);
    const row = result.rows[0];

    const totalIncome =
      Number(row.estimated_loan_interest_income) +
      Number(row.service_fee_revenue);
    const totalExpense =
      Number(row.deposit_interest_expense) +
      Number(row.branch_operational_cost);
    const netProfit = totalIncome - totalExpense;

    res.json({
      scope:
        role === "ADMIN" ? "CONSOLIDATED_BANK_P&L" : `BRANCH_${branchId}_P&L`,
      revenue: {
        interestIncome: Number(row.estimated_loan_interest_income),
        serviceFees: Number(row.service_fee_revenue),
        totalIncome,
      },
      expenses: {
        interestPaid: Number(row.deposit_interest_expense),
        operatingCosts: Number(row.branch_operational_cost),
        totalExpense,
      },
      netProfitLoss: netProfit,
      status: netProfit >= 0 ? "PROFITABLE" : "DEFICIT",
    });
  } catch (err) {
    console.error("P&L Error:", err);
    res.status(500).json({ message: "Server error generating P&L statement." });
  }
};

// Export all functions to prevent undefined route callbacks
module.exports = {
  getProfitLossReport,
  getDashboardMetrics,
  getProfitAndLoss,
};
