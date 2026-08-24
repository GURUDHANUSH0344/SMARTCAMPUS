const { Exam, Student, Subject } = require("../models/index");
const bulkUploadService = require("../services/bulkUploadService");
const fs = require("fs");

const calculateGrade = (marks, max) => {
  const pct = (marks / max) * 100;
  if (pct >= 90) return "O";
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "B+";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  return "F";
};

// GET /exams
exports.getAll = async (req, res) => {
  try {
    let whereClause = {};
    const user = req.user || req.session.user;

    // If user is a student, only show their own results
    if (user && user.role === "student") {
      const userEmail = user.email || (req.session.user ? req.session.user.email : null);
      if (!userEmail) {
        whereClause.studentId = -1;
      } else {
        const student = await Student.findOne({ where: { email: userEmail } });
        if (student) {
          whereClause.studentId = student.id;
        } else {
          whereClause.studentId = -1; 
        }
      }
    }

    const exams = await Exam.findAll({
      where: whereClause,
      include: [
        { model: Student, as: "student" },
        { model: Subject, as: "subjectRef" }
      ],
      order: [["createdAt", "DESC"]],
    });
    const students = await Student.findAll();
    const subjects = await Subject.findAll({ order: [['name', 'ASC']] });
    res.render("exams", { exams, students, subjects, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /exams
exports.create = async (req, res) => {
  try {
    let { studentId, semester, examDate, remarks } = req.body;
    let { subject, examType, maxMarks, marksObtained, credits } = req.body;

    // Ensure inputs are arrays
    const subArr = Array.isArray(subject) ? subject : (subject ? [subject] : []);
    const typeArr = Array.isArray(examType) ? examType : (examType ? [examType] : []);
    const maxArr = Array.isArray(maxMarks) ? maxMarks : (maxMarks ? [maxMarks] : []);
    const marksArr = Array.isArray(marksObtained) ? marksObtained : (marksObtained ? [marksObtained] : []);
    const credArr = Array.isArray(credits) ? credits : (credits ? [credits] : []);

    const sem = parseInt(semester) || 1;

    for (let i = 0; i < subArr.length; i++) {
      let finalSubjectName = subArr[i].trim();
      if (!finalSubjectName) continue;

      const [subRef] = await Subject.findOrCreate({ where: { name: finalSubjectName } });

      const max = parseFloat(maxArr[i]) || 100;
      const obtained = parseFloat(marksArr[i]) || 0;
      const creds = parseFloat(credArr[i]) || 3.0;
      const grade = calculateGrade(obtained, max);

      await Exam.create({
        studentId,
        subjectId: subRef.id,
        semester: sem,
        subject: finalSubjectName,
        examType: typeArr[i] || "Theory",
        maxMarks: max,
        marksObtained: obtained,
        credits: creds,
        grade,
        examDate,
        remarks
      });
    }

    // Try to notify the student
    try {
      const student = await Student.findByPk(studentId);
      if (student && student.email) {
        const { sendEmail } = require("../services/emailService");
        const subjectLine = `New Exam Results Posted – SmartCampus ERP`;
        const text = `Dear ${student.name},\n\nYour results for Semester ${sem} have been updated with ${subArr.length} new records.\n\nLog in to your dashboard to view your grades.\n\nRegards,\nExamination Department`;
        await sendEmail(student.email, subjectLine, text);
      }
    } catch (e) { console.error("Exam email failed"); }

    const backURL = req.header('Referer') || '/exams';
    res.redirect(backURL);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to add exam result");
  }
};

// GET /exams/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    const exams = await Exam.findAll({
      where: { studentId: req.params.studentId },
      order: [["examDate", "DESC"]],
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /exams/:id  (API)
exports.update = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ error: "Not found" });

    const { marksObtained, maxMarks } = req.body;
    const grade = calculateGrade(parseFloat(marksObtained), parseFloat(maxMarks || exam.maxMarks));

    await exam.update({ ...req.body, grade });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /exams/:id
exports.delete = async (req, res) => {
  try {
    await Exam.destroy({ where: { id: req.params.id } });
    res.redirect("/exams");
  } catch (err) {
    res.status(500).send("Delete failed");
  }
};

// POST /exams/bulk-upload
exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const rawData = bulkUploadService.parseFile(req.file.path);
    const mappedData = bulkUploadService.mapExamData(rawData);

    let successCount = 0;
    let errorCount = 0;

    for (const data of mappedData) {
      try {
        if (!data.studentIdStr) {
          errorCount++;
          continue;
        }

        const student = await Student.findOne({ where: { student_id: data.studentIdStr } });
        if (!student) {
          errorCount++;
          continue;
        }

        const [subjectRef] = await Subject.findOrCreate({
          where: { name: data.subject.trim() }
        });

        const max = data.maxMarks || 100;
        const obtained = data.marksObtained || 0;
        const grade = calculateGrade(obtained, max);

        const exam = await Exam.create({
          studentId: student.id,
          subjectId: subjectRef.id,
          semester: data.semester || 1,
          subject: subjectRef.name,
          examType: data.examType || "Internal",
          maxMarks: max,
          marksObtained: obtained,
          credits: data.credits || 3.0,
          grade: grade,
          examDate: data.examDate,
          remarks: data.remarks
        });

        // Notify Student via Email
        if (student.email) {
          const { sendEmail } = require("../services/emailService");
          const subjectLine = `New Exam Result: ${exam.subject} – SmartCampus ERP`;
          const text = `Dear ${student.name},\n\nYour result for the ${exam.examType} exam in ${exam.subject} has been posted.
          
Semester: ${exam.semester}
Marks Obtained: ${exam.marksObtained} / ${exam.maxMarks}
Grade: ${exam.grade}
Exam Date: ${exam.examDate}

Regards,
Examination Department`;
          
          sendEmail(student.email, subjectLine, text).catch(err => console.error("Exam result bulk email failed:", err.message));
        }

        successCount++;
      } catch (innerErr) {
        console.error(innerErr);
        errorCount++;
      }
    }

    fs.unlinkSync(req.file.path);
    res.redirect(`/exams?toastCustom=Bulk_upload_completed._Success:_${successCount},_Errors:_${errorCount}`);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).send("Bulk upload failed");
  }
};

