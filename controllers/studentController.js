const { Student, Exam, Fee, Hostel } = require("../models/index");
const { sendEmail } = require("../services/emailService");
const { generateExcelBuffer } = require("../services/exportService");

// GET /student/profile
exports.getProfile = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/auth/login");

    let student = await Student.findOne({ where: { email: user.email } });
    
    if (!student) {
      student = { name: user.name, email: user.email };
    }

    res.render("profile", { student, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /student/profile
exports.updateProfile = async (req, res) => {
  try {
    const user = req.session.user;
    const { name, phone, address, course, year } = req.body;

    let student = await Student.findOne({ where: { email: user.email } });

    if (student) {
      await student.update({ name, phone, address, course, year });
    } else {
      student = await Student.create({
        name,
        email: user.email,
        phone,
        address,
        course,
        year,
        student_id: "STUD" + Date.now().toString().slice(-6)
      });
    }

    try {
      await sendEmail(
        user.email,
        "Profile Updated – SmartCampus ERP",
        `Dear ${name},\n\nYour profile details have been successfully updated.\n\nRegards,\nAdmin`
      );
    } catch (e) {}

    res.redirect("/student/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
};

// GET /student/export
exports.exportMyData = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== "student") return res.status(403).send("Unauthorized");

    const student = await Student.findOne({
      where: { email: user.email },
      include: [
        { model: Exam, as: "exams" },
        { model: Fee, as: "fees" },
        { model: Hostel, as: "hostel" },
      ],
    });

    if (!student) return res.status(404).send("Student data not found");

    const summaryRows = [];
    
    // Admission / Profile
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Student ID", Details: student.student_id });
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Full Name", Details: student.name });
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Course & Year", Details: `${student.course} - Year ${student.year}` });
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Email", Details: student.email });
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Phone", Details: student.phone || "N/A" });
    summaryRows.push({ Category: "ADMISSION & PROFILE", Title: "Address", Details: student.address || "N/A" });
    summaryRows.push({ Category: "---", Title: "---", Details: "---" });

    // Fees
    if (student.fees && student.fees.length > 0) {
      student.fees.forEach((f, i) => {
        summaryRows.push({ Category: "FEES", Title: `Fee Invoice #${i+1} (${f.feeType})`, Details: `Amount: ₹${f.amount} | Paid: ₹${f.amountPaid || 0} | Status: ${f.status} | Due: ${f.dueDate || 'N/A'}` });
      });
    } else {
      summaryRows.push({ Category: "FEES", Title: "Status", Details: "No fee records found" });
    }
    summaryRows.push({ Category: "---", Title: "---", Details: "---" });

    // Exams
    if (student.exams && student.exams.length > 0) {
      student.exams.forEach((e, i) => {
        summaryRows.push({ Category: "EXAMINATIONS", Title: `Subject: ${e.subject} (${e.examType})`, Details: `Marks: ${e.marksObtained}/${e.maxMarks} | Grade: ${e.grade} | Semester: ${e.semester || 1}` });
      });
    } else {
      summaryRows.push({ Category: "EXAMINATIONS", Title: "Status", Details: "No exam records found" });
    }
    summaryRows.push({ Category: "---", Title: "---", Details: "---" });

    // Hostel
    if (student.hostel) {
      summaryRows.push({ Category: "HOSTEL", Title: "Allocated Room", Details: `Block ${student.hostel.block}, Room ${student.hostel.roomNo}` });
      summaryRows.push({ Category: "HOSTEL", Title: "Monthly Rent", Details: `₹${student.hostel.monthlyRent || 0}` });
      summaryRows.push({ Category: "HOSTEL", Title: "Check-in Date", Details: student.hostel.checkInDate || "N/A" });
      summaryRows.push({ Category: "HOSTEL", Title: "Status", Details: student.hostel.status });
    } else {
      summaryRows.push({ Category: "HOSTEL", Title: "Status", Details: "No hostel room allocated" });
    }

    const excelData = {
      Overview: summaryRows,
      Profile: [{
        ID: student.student_id,
        Name: student.name,
        Email: student.email,
        Phone: student.phone,
        Course: student.course,
        Year: student.year,
        Address: student.address
      }],
      Exams: student.exams.map(e => ({
        Subject: e.subject,
        Type: e.examType,
        Marks: `${e.marksObtained}/${e.maxMarks}`,
        Grade: e.grade,
        Date: e.examDate
      })),
      Fees: student.fees.map(f => ({
        Type: f.feeType,
        Amount: f.amount,
        Paid: f.amountPaid,
        Status: f.status,
        PaidDate: f.paidDate,
        Receipt: f.receiptNo
      })),
      Hostel: student.hostel ? [{
        Room: student.hostel.roomNo,
        Block: student.hostel.block,
        Rent: student.hostel.monthlyRent,
        CheckIn: student.hostel.checkInDate,
        Status: student.hostel.status
      }] : []
    };

    const buffer = generateExcelBuffer(excelData);

    if (req.query.type === "download") {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=SmartCampus_Export_${student.student_id}.xlsx`);
      return res.send(buffer);
    }

    const { sendEmailWithAttachment } = require("../services/emailService");
    
    await sendEmailWithAttachment(
      user.email,
      "Your Student Data Export – SmartCampus ERP",
      `Dear ${student.name},\n\nPlease find attached your complete data export.\n\nRegards,\nAdmin`,
      [{
        filename: `SmartCampus_Export_${student.student_id}.xlsx`,
        content: buffer
      }]
    );

    res.redirect("/?msg=Export sent to your email!");
  } catch (err) {
    console.error("[EXPORT ERROR]:", err);
    res.status(500).render("error", { 
      message: "Export failed. If you haven't configured your email in .env yet, try the 'Direct Download' option instead." 
    });
  }
};
