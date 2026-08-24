/**
 * Targeted fix: Drop ALL non-essential indexes from Students and Users tables
 * (keeps PRIMARY and foreign key indexes only)
 * Run once: node fix_indexes2.js
 */
require("dotenv").config();
const db = require("./config/db");

async function fixTable(qi, table, keepIndexes = []) {
  try {
    const indexes = await qi.showIndex(table);
    console.log(`\n📋 ${table}: ${indexes.length} indexes`);

    // Get unique index names
    const seen = new Set();
    for (const idx of indexes) {
      if (idx.name === "PRIMARY") continue;
      if (seen.has(idx.name)) continue;
      seen.add(idx.name);

      if (keepIndexes.includes(idx.name)) {
        console.log(`  ⏭️  Keeping: ${idx.name}`);
        continue;
      }

      try {
        await db.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idx.name}\``);
        console.log(`  ✅ Dropped: ${idx.name}`);
      } catch (e) {
        console.log(`  ⚠️  Kept (needed): ${idx.name}`);
      }
    }
  } catch (e) {
    console.log(`  ❌ Error on ${table}: ${e.message}`);
  }
}

async function run() {
  const qi = db.getQueryInterface();

  // Drop all non-essential indexes from the problem tables
  await fixTable(qi, "Students", ["student_id"]);
  await fixTable(qi, "Users", ["email"]);
  await fixTable(qi, "Fees", ["studentId", "receiptNo"]);
  await fixTable(qi, "Exams", ["studentId"]);
  await fixTable(qi, "Hostels", ["studentId"]);
  await fixTable(qi, "Admissions", []);

  console.log("\n✅ All done! Run: npm run dev");
  process.exit(0);
}

db.authenticate()
  .then(run)
  .catch(err => {
    console.error("DB error:", err.message);
    process.exit(1);
  });
