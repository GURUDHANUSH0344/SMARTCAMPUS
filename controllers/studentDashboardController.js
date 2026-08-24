const { Student, Fee, Hostel, Exam } = require("../models/index");

const gradeToGP = (grade) => {
  const mapping = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "F": 0 };
  return mapping[grade] || 0;
};

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user || req.session.user;
    if (!user) return res.redirect("/auth/login");
    
    // Defensive check for email
    const userEmail = user.email || (req.session.user ? req.session.user.email : null);
    
    if (!userEmail) {
      console.warn("User email is undefined in session/token:", user);
      return res.redirect("/auth/login");
    }
    
    // Find student by email and include all associations
    const student = await Student.findOne({
      where: { email: userEmail },
      include: [
        { model: Fee, as: "fees" },
        { model: Hostel, as: "hostel" },
        { model: Exam, as: "exams" }
      ]
    });

    if (!student) {
      return res.status(404).render("error", { 
        message: "Student record not found. Please contact admin to link your account.",
        user: req.session.user
      });
    }

    // Calculate Stats
    const fees = student.fees || [];
    const exams = student.exams || [];
    
    const feeStats = {
      total: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
      paid: fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0),
      balance: fees.reduce((sum, f) => sum + ((f.amount || 0) - (f.amountPaid || 0)), 0)
    };

    // Group Exams by Semester and Calculate SGPA
    const semesterGroups = {};
    exams.forEach(e => {
      const sem = e.semester || 1;
      if (!semesterGroups[sem]) {
        semesterGroups[sem] = { exams: [], totalCredits: 0, totalGP: 0, sgpa: 0 };
      }
      semesterGroups[sem].exams.push(e);
      const gp = gradeToGP(e.grade);
      const creds = e.credits || 0;
      semesterGroups[sem].totalCredits += creds;
      semesterGroups[sem].totalGP += (gp * creds);
    });

    // Calculate SGPA for each semester
    Object.keys(semesterGroups).forEach(sem => {
      if (semesterGroups[sem].totalCredits > 0) {
        semesterGroups[sem].sgpa = (semesterGroups[sem].totalGP / semesterGroups[sem].totalCredits).toFixed(2);
      }
    });

    // Calculate CGPA
    const totalCreditsAll = exams.reduce((sum, e) => sum + (e.credits || 0), 0);
    const totalGPAll = exams.reduce((sum, e) => sum + (gradeToGP(e.grade) * (e.credits || 0)), 0);
    const cgpa = totalCreditsAll > 0 ? (totalGPAll / totalCreditsAll).toFixed(2) : "0.00";

    const examStats = {
      total: exams.length,
      passed: exams.filter(e => e.grade !== "F").length,
      cgpa: cgpa
    };

    res.render("student/dashboard", {
      student,
      fees,
      hostel: student.hostel || null,
      exams,
      semesterGroups, // New grouped data
      feeStats,
      examStats,
      user: req.session.user
    });
  } catch (err) {
    console.error("Error fetching student dashboard:", err);
    res.status(500).render("error", { 
      message: "An error occurred while loading your dashboard.",
      user: req.session.user
    });
  }
};

exports.getAdminView = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const student = await Student.findByPk(studentId, {
      include: [
        { model: Fee, as: "fees" },
        { model: Hostel, as: "hostel" },
        { model: Exam, as: "exams" }
      ]
    });

    if (!student) {
      return res.status(404).render("error", { 
        message: "Student record not found.",
        user: req.session.user
      });
    }

    // Calculate Stats
    const fees = student.fees || [];
    const exams = student.exams || [];
    
    const feeStats = {
      total: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
      paid: fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0),
      balance: fees.reduce((sum, f) => sum + ((f.amount || 0) - (f.amountPaid || 0)), 0)
    };

    // Group Exams by Semester and Calculate SGPA
    const semesterGroups = {};
    exams.forEach(e => {
      const sem = e.semester || 1;
      if (!semesterGroups[sem]) {
        semesterGroups[sem] = { exams: [], totalCredits: 0, totalGP: 0, sgpa: 0 };
      }
      semesterGroups[sem].exams.push(e);
      const gp = gradeToGP(e.grade);
      const creds = e.credits || 0;
      semesterGroups[sem].totalCredits += creds;
      semesterGroups[sem].totalGP += (gp * creds);
    });

    // Calculate SGPA for each semester
    Object.keys(semesterGroups).forEach(sem => {
      if (semesterGroups[sem].totalCredits > 0) {
        semesterGroups[sem].sgpa = (semesterGroups[sem].totalGP / semesterGroups[sem].totalCredits).toFixed(2);
      }
    });

    // Calculate CGPA
    const totalCreditsAll = exams.reduce((sum, e) => sum + (e.credits || 0), 0);
    const totalGPAll = exams.reduce((sum, e) => sum + (gradeToGP(e.grade) * (e.credits || 0)), 0);
    const cgpa = totalCreditsAll > 0 ? (totalGPAll / totalCreditsAll).toFixed(2) : "0.00";

    const examStats = {
      total: exams.length,
      passed: exams.filter(e => e.grade !== "F").length,
      cgpa: cgpa
    };

    const { Subject } = require("../models/index");
    const subjects = await Subject.findAll({ order: [['name', 'ASC']] });

    res.render("student/dashboard", {
      student,
      fees,
      hostel: student.hostel || null,
      exams,
      semesterGroups, 
      subjects, // New data
      feeStats,
      examStats,
      user: req.session.user 
    });
  } catch (err) {
    console.error("Error fetching admin view of student dashboard:", err);
    res.status(500).render("error", { 
      message: "An error occurred while loading the student dashboard.",
      user: req.session.user
    });
  }
};
