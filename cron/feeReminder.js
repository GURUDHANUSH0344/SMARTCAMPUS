const cron = require("node-cron");
const { Op } = require("sequelize");
const { Fee, Student } = require("../models/index");
const { sendEmail } = require("../services/emailService");

// Runs every day at 9 AM
const startFeeReminderCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("[CRON] Running fee reminder job...");
    try {
      const today = new Date().toISOString().split("T")[0];
      const overdueFees = await Fee.findAll({
        where: {
          status: { [Op.in]: ["Unpaid", "Partial", "Overdue", "Pending"] },
          dueDate: { [Op.lte]: today },
        },
        include: [{ model: Student, as: "student" }],
      });

      for (const fee of overdueFees) {
        if (!fee.student?.email) continue;
        try {
          await sendEmail(
            fee.student.email,
            "Overdue Fee Reminder – SmartCampus ERP",
            `Dear ${fee.student.name},\n\nYour ${fee.feeType} fee of Rs.${fee.amount} was due on ${fee.dueDate} and is now overdue.\n\nPlease pay immediately to avoid penalties.\n\nRegards,\nAccounts Department`
          );
          // Mark as overdue
          fee.status = "Overdue";
          await fee.save();
          console.log(`[CRON] Reminder sent to ${fee.student.email}`);
        } catch (e) {
          console.warn("[CRON] Email failed for", fee.student.email, e.message);
        }
      }
      console.log(`[CRON] Done. Processed ${overdueFees.length} overdue fees.`);

      // --- NEW FEATURE: 3-Days in Advance Reminder ---
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 3);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const upcomingFees = await Fee.findAll({
        where: {
          status: { [Op.in]: ["Unpaid", "Partial", "Pending"] },
          dueDate: targetDateStr,
        },
        include: [{ model: Student, as: "student" }],
      });

      for (const fee of upcomingFees) {
        if (!fee.student?.email) continue;
        const remainingAmount = fee.amount - fee.amountPaid;
        if (remainingAmount <= 0) continue; // Safety check in case of status mismatches

        try {
          await sendEmail(
            fee.student.email,
            "Upcoming Fee Due Reminder – SmartCampus ERP",
            `Dear ${fee.student.name},\n\nThis is a friendly reminder that your ${fee.feeType} fee is due on ${fee.dueDate} (in 3 days).\n\nThe total fee is Rs.${fee.amount} and you have a remaining balance of Rs.${remainingAmount} left to pay.\n\nPlease pay the remaining amount before the due date to avoid any penalties.\n\nRegards,\nAccounts Department`
          );
          console.log(`[CRON] 3-Day Reminder sent to ${fee.student.email}`);
        } catch (e) {
          console.warn("[CRON] 3-Day Email failed for", fee.student.email, e.message);
        }
      }
      console.log(`[CRON] Done. Processed ${upcomingFees.length} upcoming fees.`);
    } catch (err) {
      console.error("[CRON] Fee reminder error:", err.message);
    }
  });
};

module.exports = startFeeReminderCron;
