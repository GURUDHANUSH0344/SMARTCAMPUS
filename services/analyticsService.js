const { Student, Fee, Exam } = require("../models");

class AnalyticsService {
  async getRiskStudents() {
    try {
      const students = await Student.findAll();
      const riskResults = [];

      for (const student of students) {
        let academicRisk = false;
        let financialRisk = false;
        let dropoutRisk = false;
        const flags = [];
        let riskLevel = "Low";
        let score = 100;

        // 1. Exam Failure Risk (IF attendance < 75% OR previous marks < 40%)
        // Note: Attendance not in Schema yet, using Marks < 40%
        const exams = await Exam.findAll({ where: { studentId: student.id } });
        if (exams.length > 0) {
          const failCount = exams.filter(e => e.grade === "F" || (e.marksObtained / e.maxMarks < 0.4)).length;
          if (failCount > 0) {
            academicRisk = true;
            score -= failCount * 25;
            flags.push("High Risk of Failure");
          }
        }

        // 2. Fee Delay Risk (IF due_amount > 0 AND due_date is near/passed)
        const fees = await Fee.findAll({ where: { studentId: student.id } });
        const unpaidFees = fees.filter(f => (f.amount - f.amountPaid) > 0);
        const overdue = unpaidFees.filter(f => f.status === "Overdue" || (f.dueDate && new Date(f.dueDate) < new Date()));
        
        if (overdue.length > 0) {
          financialRisk = true;
          score -= 30;
          flags.push("Payment Risk");
        }

        // 3. Dropout Risk (IF low attendance AND unpaid fees AND poor performance)
        // Simplified: IF academicRisk AND financialRisk
        if (academicRisk && financialRisk) {
          dropoutRisk = true;
          score -= 20;
          flags.push("Potential Dropout");
        }

        if (score < 50) riskLevel = "High";
        else if (score < 80) riskLevel = "Medium";

        if (academicRisk || financialRisk || dropoutRisk) {
          riskResults.push({
            id: student.id,
            student_id: student.student_id,
            name: student.name,
            score: score,
            status: riskLevel + " Risk",
            flags: flags
          });
        }
      }

      return riskResults.sort((a, b) => a.score - b.score);
    } catch (error) {
      console.error("Analytics Service Error:", error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();
