require("dotenv").config();
const { db, Fee } = require("./models/index");

async function check() {
  try {
    await db.authenticate();
    const columns = await db.getQueryInterface().describeTable("Fees");
    if (columns.amountPaid) {
      console.log("SUCCESS: amountPaid column found!");
      process.exit(0);
    } else {
      console.error("FAIL: amountPaid column still missing!");
      process.exit(1);
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

check();
