require("dotenv").config();
const { Student, Exam } = require("./models/index");

async function checkExams() {
  try {
    const allStudents = await Student.findAll({
      include: [{ model: Exam, as: "exams" }]
    });
    
    console.log("Registered Students & Exams:");
    allStudents.forEach(s => {
      console.log(`- ${s.name} (${s.email}) [#${s.student_id}] - Exams: ${s.exams.length}`);
      s.exams.forEach(e => {
        console.log(`  * ${e.subject}: ${e.marksObtained}/${e.maxMarks} (Sem: ${e.semester})`);
      });
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkExams();
