require("dotenv").config();
const db = require("./config/db");

async function run() {
  const qi = db.getQueryInterface();
  const tables = ["Fees", "Exams", "Hostels", "Admissions", "Students", "Users"];
  
  for (const table of tables) {
    try {
      const indexes = await qi.showIndex(table);
      console.log(`📋 ${table}: ${indexes.length} indexes`);
    } catch (e) {
      console.log(`❌ Error on ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}

db.authenticate().then(run).catch(err => {
  console.error(err);
  process.exit(1);
});
