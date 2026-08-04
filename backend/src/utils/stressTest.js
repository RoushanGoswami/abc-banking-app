const { pool } = require("../config/db");

const runStressTest = async () => {
  console.log("=================================================");
  console.log("  ABC BANK - 10X CONCURRENCY STRESS-TEST SUITE   ");
  console.log("=================================================");

  // Pick a target test account from the database
  const acctRes = await pool.query(
    "SELECT account_number, balance FROM accounts LIMIT 1",
  );
  if (acctRes.rows.length === 0) {
    console.log("No accounts found to test.");
    pool.end();
    return;
  }

  const testAccount = acctRes.rows[0].account_number;
  console.log(
    `Targeting Account: ${testAccount} | Initial Balance: ₹${acctRes.rows[0].balance}`,
  );
  console.log("Dispatching 50 concurrent atomic transactions...");

  const startTime = Date.now();
  const promises = [];

  // Fire 50 simultaneous deposit requests
  for (let i = 0; i < 50; i++) {
    const amount = (i + 1) * 10;
    const p = pool
      .query(
        "UPDATE accounts SET balance = balance + $1 WHERE account_number = $2 RETURNING balance",
        [amount, testAccount],
      )
      .catch((err) => ({ error: err.message }));
    promises.push(p);
  }

  const results = await Promise.all(promises);
  const successCount = results.filter((r) => !r.error).length;
  const duration = Date.now() - startTime;

  console.log("=================================================");
  console.log(` STRESS TEST COMPLETE:`);
  console.log(` - Total Concurrent Operations: 50`);
  console.log(` - Successful ACID Commits: ${successCount}`);
  console.log(` - Execution Time: ${duration}ms`);
  console.log("=================================================");
  pool.end();
};

runStressTest();
