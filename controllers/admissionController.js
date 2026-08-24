const { Admission, Student } = require("../models/index");
const generateStudentId = require("../utils/studentIdGenerator");
const { sendEmail } = require("../services/emailService");
const bulkUploadService = require("../services/bulkUploadService");
const fs = require("fs");


// GET /admissions
exports.getAll = async (req, res) => {
  try {
    const admissions = await Admission.findAll({ order: [["createdAt", "DESC"]] });
    res.render("admissions", { admissions, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /admissions
exports.create = async (req, res) => {
  try {
    const { name, email, phone, course } = req.body;
    const document = req.file ? req.file.filename : null;

    await Admission.create({ name, email, phone, course, document });
    res.redirect("/admissions");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create admission");
  }
};

// POST /admissions/approve/:id
exports.approve = async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).send("Admission not found");

    admission.status = "Approved";
    await admission.save();

    const studentId = await generateStudentId();
    await Student.create({
      student_id: studentId,
      name: admission.name,
      email: admission.email,
      phone: admission.phone,
      course: admission.course || "General",
      year: "1",
    });

    // Send approval email
    try {
      await sendEmail(
        admission.email,
        "Admission Approved – SmartCampus ERP",
        `Dear ${admission.name},\n\nYour admission has been approved.\nYour Student ID is: ${studentId}\n\nWelcome to SmartCampus!\n\nRegards,\nAdmin`
      );
    } catch (emailErr) {
      console.warn("Email sending failed:", emailErr.message);
    }

    res.redirect("/admissions");
  } catch (err) {
    console.error(err);
    res.status(500).send("Approval failed");
  }
};

// POST /admissions/reject/:id
exports.reject = async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).send("Admission not found");

    admission.status = "Rejected";
    await admission.save();

    try {
      await sendEmail(
        admission.email,
        "Admission Status Update – SmartCampus ERP",
        `Dear ${admission.name},\n\nWe regret to inform you that your admission application has not been approved at this time.\n\nRegards,\nAdmin`
      );
    } catch (emailErr) {
      console.warn("Email sending failed:", emailErr.message);
    }

    res.redirect("/admissions");
  } catch (err) {
    console.error(err);
    res.status(500).send("Rejection failed");
  }
};

// DELETE /admissions/:id  (API)
exports.delete = async (req, res) => {
  try {
    await Admission.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Student Management (Admin) ---

// GET /admissions/students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.findAll({ order: [["createdAt", "DESC"]] });
    res.render("students", { students, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /admissions/students
exports.createStudent = async (req, res) => {
  try {
    const { name, email, phone, course, year } = req.body;
    const studentId = await generateStudentId();
    
    await Student.create({
      student_id: studentId,
      name,
      email,
      phone,
      course: course || "General",
      year: year || "1",
    });
    
    res.redirect("/admissions/students");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create student record");
  }
};

// POST /admissions/students/delete/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).send("Student not found");
    
    await student.destroy();
    res.redirect("/admissions/students");
  } catch (err) {
    console.error(err);
    res.status(500).send("Deletion failed");
  }
};

// POST /admissions/students/bulk-delete
exports.bulkDeleteStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.redirect("/admissions/students?toastCustom=" + encodeURIComponent("No_students_selected"));
    }
    const { Op } = require("sequelize");
    await Student.destroy({
      where: {
        id: { [Op.in]: studentIds }
      }
    });
    res.redirect(`/admissions/students?toastCustom=Successfully_deleted_${studentIds.length}_records`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Bulk deletion failed");
  }
};

// POST /admissions/bulk-upload
exports.bulkUploadAdmissions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const rawData = bulkUploadService.parseFile(req.file.path);
    const mappedData = bulkUploadService.mapAdmissionData(rawData);

    let successCount = 0;
    let errorCount = 0;

    for (const data of mappedData) {
      try {
        if (!data.name || !data.email) {
          errorCount++;
          continue;
        }
        await Admission.create({
          name: data.name,
          email: data.email,
          phone: data.phone,
          course: data.course,
          status: "Pending"
        });
        successCount++;
      } catch (innerErr) {
        console.error(innerErr);
        errorCount++;
      }
    }

    fs.unlinkSync(req.file.path);
    res.redirect(`/admissions?toastCustom=Bulk_upload_completed._Success:_${successCount},_Errors:_${errorCount}`);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).send("Bulk upload failed");
  }
};

// POST /admissions/students/bulk-upload
exports.bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const rawData = bulkUploadService.parseFile(req.file.path);
    const mappedData = bulkUploadService.mapStudentData(rawData);

    let successCount = 0;
    let errorCount = 0;

    for (const data of mappedData) {
      try {
        if (!data.name || !data.email) {
          errorCount++;
          continue;
        }
        const studentId = await generateStudentId();
        await Student.create({
          student_id: studentId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          course: data.course || "General",
          year: data.year || "1",
          address: data.address || "Campus"
        });
        successCount++;
      } catch (innerErr) {
        console.error(innerErr);
        errorCount++;
      }
    }

    fs.unlinkSync(req.file.path);
    res.redirect(`/admissions/students?toastCustom=Bulk_upload_completed._Success:_${successCount},_Errors:_${errorCount}`);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).send("Bulk upload failed");
  }
};

