require("dotenv").config();
const db = require("./config/db");

async function dropExtraIndexes(table, keep = ["PRIMARY"]) {
  const qi = db.getQueryInterface();
  try {
    const indexes = await qi.showIndex(table);
    console.log(`📋 ${table}: ${indexes.length} indexes`);

    const seen = new Set();
    for (const idx of indexes) {
      if (keep.includes(idx.name)) continue;
      
      if (seen.has(idx.name)) continue;
      seen.add(idx.name);

      console.log(`  Dropping ${idx.name} from ${table}...`);
      try {
        await db.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idx.name}\``);
        console.log(`    ✅ Dropped: ${idx.name}`);
      } catch (e) {
        console.log(`    ❌ Failed: ${idx.name} - ${e.message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error on ${table}: ${err.message}`);
  }
}

async function run() {
  await dropExtraIndexes("Users", ["PRIMARY", "email"]);
  await dropExtraIndexes("Fees", ["PRIMARY", "studentId", "receiptNo"]);
  await dropExtraIndexes("Students", ["PRIMARY", "student_id"]);
  process.exit(0);
}

db.authenticate().then(run).catch(err => {
  console.error(err);
  process.exit(1);
});
