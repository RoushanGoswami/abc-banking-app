const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log("Starting Seed Process...");
    await client.query("BEGIN");

    // 1. Seed Branches
    const branches = [
      ["BR-001", "Ahmedabad Main Branch", "Ahmedabad", "ABCB0000001"],
      ["BR-002", "Surat Commercial Branch", "Surat", "ABCB0000002"],
      ["BR-003", "Vadodara Express Branch", "Vadodara", "ABCB0000003"],
    ];
    for (const b of branches) {
      await client.query(
        `INSERT INTO branches (branch_code, branch_name, city, ifsc_code)
         VALUES ($1, $2, $3, $4) ON CONFLICT (branch_code) DO NOTHING`,
        b,
      );
    }

    // Dynamically fetch actual branch IDs to avoid sequence gap errors
    const branchRes = await client.query(
      `SELECT id FROM branches ORDER BY id ASC`,
    );
    const branchIds = branchRes.rows.map((r) => r.id);
    const mainBranchId = branchIds[0];

    // 2. Seed Admin and Teller Users
    const pwdHash = await bcrypt.hash("BankAdmin@123", 10);
    const tellerHash = await bcrypt.hash("Teller@123", 10);

    await client.query(
      `INSERT INTO users (branch_id, username, password_hash, role)
       VALUES ($1, 'system_admin', $2, 'ADMIN') ON CONFLICT (username) DO NOTHING`,
      [mainBranchId, pwdHash],
    );

    await client.query(
      `INSERT INTO users (branch_id, username, password_hash, role)
       VALUES ($1, 'ahmedabad_teller', $2, 'TELLER') ON CONFLICT (username) DO NOTHING`,
      [mainBranchId, tellerHash],
    );

    // 3. Batch Seed 20,000 Accounts
    const checkRes = await client.query(`SELECT COUNT(*) FROM accounts`);
    if (parseInt(checkRes.rows[0].count) === 0) {
      console.log("Generating 20,000 Accounts for Load Testing...");

      for (let i = 1; i <= 20000; i++) {
        const branchId = branchIds[i % branchIds.length];
        const acctNum = `1000${String(i).padStart(8, "0")}`;

        // Generate unique 10-char PAN (e.g., ABCDE0001F -> ABCDE0000G after 10k)
        const panDigits = String(i % 10000).padStart(4, "0");
        const panLetter = String.fromCharCode(70 + Math.floor(i / 10000));
        const validPan = `ABCDE${panDigits}${panLetter}`;

        const custRes = await client.query(
          `INSERT INTO customers (branch_id, first_name, last_name, email, phone, pan_number, national_id_encrypted, address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            branchId,
            `Customer_${i}`,
            `Patel`,
            `cust_${i}@abcb.co.in`,
            `98${String(i).padStart(8, "0")}`,
            validPan,
            `[Aadhaar Redacted]`,
            `Gujarat, India`,
          ],
        );

        const initialBal = (Math.floor(Math.random() * 49000) + 1000) * 10;
        await client.query(
          `INSERT INTO accounts (account_number, customer_id, branch_id, account_type, balance)
           VALUES ($1, $2, $3, 'SAVINGS', $4)`,
          [acctNum, custRes.rows[0].id, branchId, initialBal],
        );

        if (i % 5000 === 0) console.log(`...Seeded ${i} accounts`);
      }
    }

    await client.query("COMMIT");
    console.log("Database Seeding Complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding Error:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedDatabase();
