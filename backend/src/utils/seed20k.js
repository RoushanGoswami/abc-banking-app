const { pool } = require("../config/db");

// Indian first and last name sample pools for realistic customer generation
const firstNames = [
  "Aarav",
  "Vihaan",
  "Aditya",
  "Sai",
  "Arjun",
  "Reyansh",
  "Anya",
  "Diya",
  "Ananya",
  "Saanvi",
  "Rohan",
  "Karan",
  "Pooja",
  "Nehea",
  "Vikram",
  "Rahul",
  "Priya",
  "Sneha",
  "Amit",
  "Rajesh",
  "Sunita",
  "Kavita",
  "Manish",
  "Deepak",
];
const lastNames = [
  "Patel",
  "Shah",
  "Mehta",
  "Desai",
  "Joshi",
  "Parikh",
  "Bhatt",
  "Modi",
  "Trivedi",
  "Amin",
  "Vyas",
  "Chauhan",
  "Rathod",
  "Solanki",
  "Gajjar",
  "Panchal",
];

// Strictly matches standard banking CHECK constraints ('SAVINGS', 'CURRENT')
const accountTypes = ["SAVINGS", "CURRENT"];

// Indian street & city pools for realistic KYC addresses
const streets = [
  "M.G. Road",
  "Sardar Patel Ring Road",
  "C.G. Road",
  "Ashram Road",
  "Relief Road",
  "Satellite Road",
  "Ring Road",
  "VIP Road",
];
const cities = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"];

// STRICT 10-CHARACTER PAN GENERATOR (5 Letters + 4 Numbers + 1 Letter)
const generatePAN = (index) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Rotate the 5th letter every 10,000 accounts to guarantee uniqueness
  const block = Math.floor(index / 10000);
  const prefix = "ABCD" + letters[block % 26];
  // Strictly clamp numeric part to exactly 4 digits (0000 to 9999)
  const num = String(index % 10000).padStart(4, "0");
  const suffix = letters[index % 26];
  return `${prefix}${num}${suffix}`; // Exactly 10 characters!
};

// Generate a simulated encrypted ID token
const generateEncryptedID = (index) => {
  return `ENC_NAT_ID_HASH_${String(90000000 + index)}`;
};

// Generate a realistic Indian address string
const generateAddress = (index) => {
  const street = streets[index % streets.length];
  const city = cities[(index * 2) % cities.length];
  const pin = `38000${(index % 9) + 1}`;
  return `${index + 10}, ${street}, ${city}, Gujarat - ${pin}`;
};

const runLegacyMigration = async () => {
  const client = await pool.connect();
  const TOTAL_ACCOUNTS = 20000;
  const BATCH_SIZE = 1000; // Insert 1,000 rows per SQL query to prevent memory overflow

  try {
    console.log("=================================================");
    console.log("  ABC CO-OPERATIVE BANK - LEGACY MIGRATION TOOL  ");
    console.log("=================================================");
    console.log(
      `Starting bulk import of ${TOTAL_ACCOUNTS.toLocaleString("en-IN")} legacy accounts...`,
    );

    const startTime = Date.now();
    await client.query("BEGIN");

    // 1. Fetch valid branches from database
    const branchRes = await client.query(
      "SELECT id, branch_code FROM branches",
    );
    if (branchRes.rows.length === 0) {
      throw new Error(
        "No branches found in database. Please run schema.sql first.",
      );
    }
    const branches = branchRes.rows;

    let totalInserted = 0;

    // 2. Batch Processing Loop
    for (let i = 0; i < TOTAL_ACCOUNTS; i += BATCH_SIZE) {
      const customerValues = [];
      const customerParams = [];
      let paramIndex = 1;

      for (let j = 0; j < BATCH_SIZE && i + j < TOTAL_ACCOUNTS; j++) {
        const idx = i + j + 1;
        const fName = firstNames[idx % firstNames.length];
        const lName = lastNames[(idx * 3) % lastNames.length];
        const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${idx}@abcbank.test`;
        // Strictly 10-digit Indian mobile number
        const phone = `98${String(10000000 + idx).slice(-8)}`;
        const pan = generatePAN(idx);
        const encryptedId = generateEncryptedID(idx);
        const address = generateAddress(idx);

        customerValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
        );
        customerParams.push(
          fName,
          lName,
          email,
          phone,
          pan,
          encryptedId,
          address,
        );
      }

      // Insert 1,000 customers in a single query
      const customerQuery = `
        INSERT INTO customers (first_name, last_name, email, phone, pan_number, national_id_encrypted, address)
        VALUES ${customerValues.join(", ")}
        RETURNING id
      `;
      const customerInsertRes = await client.query(
        customerQuery,
        customerParams,
      );
      const insertedCustomerIds = customerInsertRes.rows.map((r) => r.id);

      // Prepare matching 1,000 accounts for those customers
      const accountValues = [];
      const accountParams = [];
      paramIndex = 1;

      for (let j = 0; j < insertedCustomerIds.length; j++) {
        const customerId = insertedCustomerIds[j];
        const branch = branches[j % branches.length];
        // Generate unique 12-digit account number starting with 1000...
        const accountNumber = String(100000000000 + i + j + 10);
        const acctType = accountTypes[j % accountTypes.length];
        const balance = Math.floor(Math.random() * 450000) + 10000; // ₹10,000 to ₹4,60,000

        accountValues.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'ACTIVE')`,
        );
        accountParams.push(
          accountNumber,
          customerId,
          branch.id,
          acctType,
          balance,
        );
      }

      const accountQuery = `
        INSERT INTO accounts (account_number, customer_id, branch_id, account_type, balance, status)
        VALUES ${accountValues.join(", ")}
      `;
      await client.query(accountQuery, accountParams);

      totalInserted += insertedCustomerIds.length;
      console.log(
        `  -> Successfully migrated ${totalInserted.toLocaleString("en-IN")} / ${TOTAL_ACCOUNTS.toLocaleString("en-IN")} accounts...`,
      );
    }

    await client.query("COMMIT");
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=================================================");
    console.log(
      ` MIGRATION SUCCESSFUL! (${totalInserted.toLocaleString("en-IN")} accounts created in ${duration}s)`,
    );
    console.log("=================================================");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration Error:", err.message);
  } finally {
    client.release();
    pool.end();
  }
};

runLegacyMigration();
