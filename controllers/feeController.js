const { Fee, Student } = require("../models/index");
const { generatePDF } = require("../services/pdfService");
const { sendEmail, sendEmailWithAttachment } = require("../services/emailService");
const path = require("path");
const fs = require("fs");
const bulkUploadService = require("../services/bulkUploadService");


const generateReceiptNo = () => "REC" + Date.now();

// GET /fees
exports.getAll = async (req, res) => {
  try {
    let whereClause = {};
    const user = req.user || req.session.user;
    if (user && user.role === 'student') {
        const userEmail = user.email || (req.session.user ? req.session.user.email : null);
        if (userEmail) {
            const currentStudent = await Student.findOne({ where: { email: userEmail }});
            if (currentStudent) {
                whereClause = { studentId: currentStudent.id };
            } else {
                whereClause = { studentId: -1 };
            }
        } else {
            whereClause = { studentId: -1 };
        }
    }
    const fees = await Fee.findAll({
      where: whereClause,
      include: [{ model: Student, as: "student" }],
      order: [["createdAt", "DESC"]],
    });
    const students = await Student.findAll();
    res.render("fees", { fees, students, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /fees
exports.create = async (req, res) => {
  try {
    const { studentName, studentIdStr, email, department, program, year, semester, session, feeType, feeId, amount, discount, amountPaid, paymentMethod, transactionId, dueDate, paidDate, remarks } = req.body;

    let [student, created] = await Student.findOrCreate({
      where: { 
        student_id: (req.session.user && req.session.user.role === 'student' && studentIdStr) ? studentIdStr : (studentIdStr || "UNKNOWN") 
      },
      defaults: {
        name: studentName || "Unknown Student",
        course: department || "General",
        year: year || "1",
        email: email || ((studentIdStr || "student") + "@smartcampus.edu"),
        phone: "0000000000",
        address: "Campus"
      }
    });

    // If student already exists but they have a placeholder email, update it with the new one
    if (!created && email && student.email.includes("@smartcampus.edu")) {
      await student.update({ email });
    }

    // Security: If current user is student, override studentId with their own
    if (req.session.user && req.session.user.role === 'student') {
        const myProfile = await Student.findOne({ where: { email: req.session.user.email }});
        if (myProfile) student = myProfile;
    }

    const netAmount = Math.max(0, (parseFloat(amount) || 0) - (parseFloat(discount) || 0));
    const paid = parseFloat(amountPaid) || 0;

    let status = "Unpaid";
    if (paid >= netAmount && netAmount > 0) status = "Paid";
    else if (paid > 0) status = "Partial";

    const currentFeeStudentId = (req.session.user && req.session.user.role === 'student' && student) ? student.id : (student ? student.id : 1);
    
    const fee = await Fee.create({ 
      studentId: currentFeeStudentId, 
      feeType: feeType || "Tuition Fee", 
      amount: netAmount, 
      amountPaid: paid,
      dueDate: dueDate || new Date().toISOString().split("T")[0], 
      remarks: (remarks || "").substring(0, 250) || `${department || 'Gen'} | Sem ${semester || '1'}`, 
      status: status 
    });

    if (paid > 0) {
      fee.paidDate = paidDate || new Date().toISOString().split("T")[0];
      fee.paymentMethod = paymentMethod || "Cash";
      fee.receiptNo = feeId || generateReceiptNo();
      await fee.save();
    }
    
    // Auto-generate PDF if payment made
    if (paid > 0) {
        const student = await Student.findByPk(fee.studentId);
        const receiptPath = path.join(__dirname, "../uploads", `${fee.receiptNo}.pdf`);
        const { generatePDF } = require("../services/pdfService");
        await generatePDF({
            receiptNo: fee.receiptNo,
            name: student ? student.name : "Student",
            studentId: student ? student.student_id : "ID",
            course: student ? student.course : "Course",
            feeType: fee.feeType,
            totalAmount: fee.amount,
            paidAmount: fee.amountPaid,
            date: fee.paidDate,
            paymentMethod: fee.paymentMethod,
            status: fee.status
        }, receiptPath);
    }

    const smStr = semester ? semester.replace('Semester ', '') : '1';
    const deptStr = department || 'General';
    const nameStr = studentName ? studentName.split(' ')[0] : 'Student';
    
    res.redirect(`/fees?toastCustom=Fee_record_saved_for_${nameStr}_|_${deptStr}_|_Sem_${smStr}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create fee record");
  }
};

// POST /fees/pay/:id
exports.pay = async (req, res) => {
  try {
    const fee = await Fee.findByPk(req.params.id, {
      include: [{ model: Student, as: "student" }],
    });
    if (!fee) return res.status(404).send("Fee record not found");

    fee.status = "Paid";
    fee.paidDate = new Date().toISOString().split("T")[0];
    fee.receiptNo = generateReceiptNo();
    fee.paymentMethod = req.body.paymentMethod || "Cash";
    fee.amountPaid = fee.amount; // Mark as fully paid
    await fee.save();

    // Generate PDF receipt with detailed info
    const receiptPath = path.join(__dirname, "../uploads", `${fee.receiptNo}.pdf`);
    const { generatePDF } = require("../services/pdfService");
    await generatePDF(
      {
        receiptNo: fee.receiptNo,
        name: fee.student ? fee.student.name : "Student",
        studentId: fee.student ? fee.student.student_id : "ID",
        course: fee.student ? fee.student.course : "Course",
        feeType: fee.feeType,
        totalAmount: fee.amount,
        paidAmount: fee.amountPaid,
        date: fee.paidDate,
        paymentMethod: fee.paymentMethod,
        status: fee.status
      },
      receiptPath
    );

    // Send Receipt via Email
    if (fee.student && fee.student.email) {
      sendEmailWithAttachment(
        fee.student.email,
        `Fee Payment Receipt – ${fee.receiptNo}`,
        `Dear ${fee.student.name},\n\nPlease find attached the receipt for your ${fee.feeType} payment of ₹${fee.amount}.\n\nRegards,\nAccounts Department`,
        [
          {
            filename: `${fee.receiptNo}.pdf`,
            path: receiptPath,
          },
        ]
      ).then(() => console.log("✅ Receipt email sent"))
       .catch(err => {
         console.error("❌ Receipt email failed:", err.message);
         if (err.message.includes("535") || err.message.includes("Username and Password not accepted")) {
           console.error("⚠️ REQUIRED: Please update your Google App Password in .env file");
         }
       });
    }

    res.redirect("/fees?toast=pay_success");
  } catch (err) {
    console.error(err);
    res.status(500).send("Payment failed");
  }
};

// GET /fees/receipt/:receiptNo
exports.downloadReceipt = async (req, res) => {
  try {
    const fee = await Fee.findOne({ 
      where: { receiptNo: req.params.receiptNo },
      include: [{ model: Student, as: 'student' }]
    });

    if (!fee) return res.status(404).send("Receipt not found");

    const filePath = path.join(__dirname, "../uploads", `${fee.receiptNo}.pdf`);
    
    // Always regenerate to ensure required details are up-to-date
    const { generatePDF } = require("../services/pdfService");
    await generatePDF({
        receiptNo: fee.receiptNo,
        name: fee.student ? fee.student.name : "Student",
        studentId: fee.student ? fee.student.student_id : "ID",
        course: fee.student ? fee.student.course : "Course",
        feeType: fee.feeType,
        totalAmount: fee.amount,
        paidAmount: fee.amountPaid,
        date: fee.paidDate || fee.createdAt.toISOString().split('T')[0],
        paymentMethod: fee.paymentMethod,
        status: fee.status
    }, filePath);

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to download receipt");
  }
};

// POST /fees/remind/:id  — send overdue reminder
exports.sendReminder = async (req, res) => {
  try {
    const fee = await Fee.findByPk(req.params.id, {
      include: [{ model: Student, as: "student" }],
    });
    if (!fee || !fee.student) return res.status(404).send("Not found");

    await sendEmail(
      fee.student.email,
      "Fee Payment Reminder – SmartCampus ERP",
      `Dear ${fee.student.name},\n\nThis is a reminder that your ${fee.feeType} fee of ₹${fee.amount} is due on ${fee.dueDate}.\n\nPlease pay at the earliest to avoid penalties.\n\nRegards,\nAccounts Department`
    );

    res.redirect("/fees?toast=remind_success");
  } catch (err) {
    console.error("Reminder failed:", err.message);
    let errMsg = err.message;
    if (errMsg.includes("535") || errMsg.includes("Username and Password not accepted")) {
        errMsg = "Check_Google_App_Password_in_.env";
    } else {
        errMsg = encodeURIComponent(errMsg.substring(0, 50));
    }
    res.redirect(`/fees?toastCustom=❌_Reminder_Failed:_${errMsg}`);
  }
};

// DELETE /fees/:id
exports.delete = async (req, res) => {
  try {
    await Fee.destroy({ where: { id: req.params.id } });
    res.redirect("/fees?toast=delete_success");
  } catch (err) {
    res.status(500).send("Delete failed");
  }
};

// POST /fees/bulk-delete
exports.bulkDelete = async (req, res) => {
  try {
    const { feeIds } = req.body;
    if (!feeIds || !Array.isArray(feeIds) || feeIds.length === 0) {
      return res.redirect("/fees?toastCustom=No_fees_selected");
    }
    const { Op } = require("sequelize");
    await Fee.destroy({
      where: {
        id: { [Op.in]: feeIds }
      }
    });
    res.redirect(`/fees?toastCustom=Successfully_deleted_${feeIds.length}_records`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Bulk deletion failed");
  }
};

// POST /fees/edit/:id
exports.edit = async (req, res) => {
  try {
    const feeId = req.params.id;
    const { feeType, amount, amountPaid, dueDate } = req.body;
    
    let feeQuery = { id: feeId };
    if (req.session.user && req.session.user.role === 'student') {
        const currentStudent = await Student.findOne({ where: { email: req.session.user.email }});
        if (currentStudent) feeQuery.studentId = currentStudent.id;
    }
    
    const fee = await Fee.findOne({ 
        where: feeQuery,
        include: [{ model: Student, as: 'student' }] 
    });
    if (!fee) return res.status(404).send("Fee not found or access denied");

    const netAmount = parseFloat(amount) || 0;
    const paid = parseFloat(amountPaid) || 0;

    let status = "Unpaid";
    if (paid >= netAmount && netAmount > 0) status = "Paid";
    else if (paid > 0) status = "Partial";
    else if (dueDate && new Date(dueDate) < new Date(new Date().toISOString().split("T")[0])) status = "Overdue";

    if (feeType) fee.feeType = feeType; // Use the feeType from body if provided
    fee.amount = netAmount;
    fee.amountPaid = paid;
    if (dueDate) fee.dueDate = dueDate;
    fee.status = status;

    if (paid > 0) {
        if (!fee.paidDate) fee.paidDate = new Date().toISOString().split('T')[0];
        if (!fee.receiptNo) fee.receiptNo = generateReceiptNo();
        
        // Generate/Update PDF
        const receiptPath = path.join(__dirname, "../uploads", `${fee.receiptNo}.pdf`);
        const { generatePDF } = require("../services/pdfService");
        await generatePDF({
            receiptNo: fee.receiptNo,
            name: fee.student ? fee.student.name : "Student",
            studentId: fee.student ? fee.student.student_id : "ID",
            course: fee.student ? fee.student.course : "Course",
            feeType: fee.feeType,
            totalAmount: fee.amount,
            paidAmount: fee.amountPaid,
            date: fee.paidDate,
            paymentMethod: fee.paymentMethod || 'Cash',
            status: fee.status
        }, receiptPath);
    }

    await fee.save();
    res.redirect("/fees?toastCustom=Fee_record_updated_successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update fee");
  }
};

// POST /fees/bulk-upload
exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const rawData = bulkUploadService.parseFile(req.file.path);
    const mappedData = bulkUploadService.mapFeeData(rawData);

    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];

    for (let i = 0; i < mappedData.length; i++) {
      const data = mappedData[i];
      try {
        if (!data.studentIdStr) {
          errorCount++;
          errorMessages.push(`Row ${i + 2}: Missing Student ID`);
          continue;
        }

        let student = await Student.findOne({ where: { student_id: data.studentIdStr } });
        if (!student) {
          student = await Student.create({
            student_id: data.studentIdStr,
            name: data.studentName || "Unknown Student",
            course: data.department || "General",
            year: "1",
            email: data.studentIdStr.toLowerCase() + "@smartcampus.edu",
            phone: "0000000000",
            address: "Campus"
          });
        }

        const netAmount = Math.max(0, (data.amount || 0) - (data.discount || 0));
        const paid = data.amountPaid || 0;

        let status = "Unpaid";
        if (paid >= netAmount && netAmount > 0) status = "Paid";
        else if (paid > 0) status = "Partial";
        else if (data.dueDate && new Date(data.dueDate) < new Date()) status = "Overdue";

        const fee = await Fee.create({
          studentId: student.id,
          feeType: data.feeType,
          amount: netAmount,
          amountPaid: paid,
          dueDate: data.dueDate || new Date().toISOString().split("T")[0],
          remarks: data.remarks || `${data.department || 'Gen'} | Bulk Import`,
          status: status,
          paymentMethod: data.paymentMethod,
          paidDate: data.paidDate,
          receiptNo: data.amountPaid > 0 ? "REC" + Date.now() + Math.floor(Math.random() * 1000) : null
        });

        if (fee.receiptNo) {
            const receiptPath = path.join(__dirname, "../uploads", `${fee.receiptNo}.pdf`);
            const { generatePDF } = require("../services/pdfService");
            await generatePDF({
                receiptNo: fee.receiptNo,
                name: student.name,
                studentId: student.student_id,
                course: student.course,
                feeType: fee.feeType,
                totalAmount: fee.amount,
                paidAmount: fee.amountPaid,
                date: fee.paidDate || new Date(),
                paymentMethod: fee.paymentMethod,
                status: fee.status
            }, receiptPath).catch(pdfErr => console.error("PDF generation failed for bulk row:", pdfErr));
        }

        successCount++;
      } catch (innerErr) {
        console.error("[BULK FEE ERROR]:", innerErr);
        errorCount++;
        errorMessages.push(`Row ${i + 2}: ${innerErr.message || 'Unknown error'}`);
      }
    }

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    let toastMsg = `Bulk_upload_completed._Success:_${successCount},_Errors:_${errorCount}`;
    if (errorCount > 0) {
      // Limit error message length for URL
      const detailedErrors = errorMessages.slice(0, 3).join(", ");
      console.log("Bulk Upload Errors:", errorMessages);
    }

    res.redirect(`/fees?toastCustom=${toastMsg}`);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).send("Bulk upload failed: " + err.message);
  }
};

