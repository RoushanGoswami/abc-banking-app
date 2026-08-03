const { pool } = require("../config/db");

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
        COALESCE(SUM(CASE WHEN type = 'FEE_DEBIT' THEN amount ELSE 0 END), 0) AS total_fee_income,
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) AS total_withdrawals
      FROM transactions
      WHERE created_at BETWEEN $1 AND $2 ${branchFilter}
    `;

    const { rows } = await pool.query(query, params);
    const data = rows[0];

    const totalIncome = parseFloat(data.total_fee_income);
    const totalExpense = parseFloat(data.total_interest_expense);
    const netProfitLoss = totalIncome - totalExpense;

    res.json({
      period: { startDate, endDate },
      branchId: targetBranch || "ALL_BRANCHES",
      income: { feeIncome: totalIncome },
      expenses: { interestPaid: totalExpense },
      netProfitLoss,
      volume: {
        deposits: parseFloat(data.total_deposits),
        withdrawals: parseFloat(data.total_withdrawals),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate P&L statement" });
  }
};

module.exports = { getProfitLossReport };
