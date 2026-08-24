/**
 * One-time fix: Drop excess indexes on tables that hit MySQL's 64-key limit
 * due to Sequelize's alter:true re-running ENUM changes on each restart.
 * Run once with: node fix_indexes.js
 */
require("dotenv").config();
const db = require("./config/db");

async function fixIndexes() {
  const qi = db.getQueryInterface();

  const tables = ["Fees", "Exams", "Hostels", "Admissions", "Students", "Users"];

  for (const table of tables) {
    try {
      const indexes = await qi.showIndex(table);
      console.log(`\n📋 Table: ${table} — ${indexes.length} indexes found`);

      // Keep only PRIMARY and unique constraint indexes; drop all duplicate/extra ones
      const seen = new Set();
      for (const idx of indexes) {
        if (idx.name === "PRIMARY") continue; // always keep primary key

        if (seen.has(idx.name)) continue; // already processed this index name
        seen.add(idx.name);

        // Drop indexes that are plain (non-unique, non-primary) or duplicates of known fields
        if (!idx.unique && idx.name !== "PRIMARY") {
          try {
            await qi.removeIndex(table, idx.name);
            console.log(`  ✅ Dropped index: ${idx.name}`);
          } catch (e) {
            console.log(`  ⚠️  Could not drop ${idx.name}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.log(`  ⚠️  Skipping ${table}: ${e.message}`);
    }
  }

  console.log("\n✅ Done! You can now run npm run dev.");
  process.exit(0);
}

db.authenticate()
  .then(fixIndexes)
  .catch(err => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
