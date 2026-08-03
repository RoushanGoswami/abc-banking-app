const { executeTransaction } = require("../config/db");
const crypto = require("crypto");

const createTransaction = async (req, res) => {
  const { accountId, type, amount, description } = req.body;
  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Invalid transaction amount" });
  }

  try {
    const transactionRecord = await executeTransaction(async (client) => {
      // Lock account row FOR UPDATE to prevent race conditions
      const accountRes = await client.query(
        `SELECT id, branch_id, balance, status FROM accounts WHERE id = $1 FOR UPDATE`,
        [accountId],
      );

      if (accountRes.rows.length === 0) throw new Error("Account not found");
      const account = accountRes.rows[0];

      if (
        req.user.role !== "ADMIN" &&
        account.branch_id !== req.user.branch_id
      ) {
        throw new Error("Branch permission mismatch");
      }

      if (account.status !== "ACTIVE") {
        throw new Error(`Account is currently ${account.status}`);
      }

      const currentBalance = parseFloat(account.balance);
      let newBalance = currentBalance;

      if (["WITHDRAWAL", "FEE_DEBIT"].includes(type)) {
        if (currentBalance < numericAmount)
          throw new Error("Insufficient funds");
        newBalance -= numericAmount;
      } else if (["DEPOSIT", "INTEREST_CREDIT"].includes(type)) {
        newBalance += numericAmount;
      }

      await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
        newBalance,
        accountId,
      ]);

      const txRef = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const txnRes = await client.query(
        `INSERT INTO transactions (transaction_reference, account_id, branch_id, user_id, type, amount, balance_after, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          txRef,
          accountId,
          account.branch_id,
          req.user.id,
          type,
          numericAmount,
          newBalance,
          description,
        ],
      );

      return txnRes.rows[0];
    });

    return res.status(201).json(transactionRecord);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = { createTransaction };
