// One-time script: sets status='active' for all existing users who have NULL status
// Run: node fix_admin_status.js
require("dotenv").config();
const { User } = require("./models/index");
const { db } = require("./models/index");

(async () => {
  try {
    await db.sync({ alter: true });
    const [affected] = await db.query(
      "UPDATE Users SET status = 'active' WHERE status IS NULL"
    );
    console.log(`✅ Updated ${typeof affected === 'number' ? affected : JSON.stringify(affected)} existing user records to status='active'.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
