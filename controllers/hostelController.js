const { Hostel, Student } = require("../models/index");
const { sendEmail } = require("../services/emailService");

// GET /hostel
exports.getAll = async (req, res) => {
  try {
    let whereClause = {};
    const user = req.user || req.session.user;

    if (user && user.role === 'student') {
      const userEmail = user.email || (req.session.user ? req.session.user.email : null);
      if (userEmail) {
        const student = await Student.findOne({ where: { email: userEmail }});
        if (student) {
          whereClause.studentId = student.id;
        } else {
          whereClause.studentId = -1;
        }
      } else {
        whereClause.studentId = -1;
      }
    }

    const allocations = await Hostel.findAll({
      where: whereClause,
      include: [{ model: Student, as: "student" }],
      order: [["createdAt", "DESC"]],
    });
    const students = await Student.findAll();
    res.render("hostel", { allocations, students, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// POST /hostel/allocate
exports.allocate = async (req, res) => {
  try {
    let { studentId, roomNo, block, bedNo, checkInDate, monthlyRent, remarks } = req.body;
    
    // Security: If student, use their own ID
    if (req.session.user && req.session.user.role === 'student') {
        const student = await Student.findOne({ where: { email: req.session.user.email }});
        if (student) studentId = student.id;
    }

    if (!studentId || !roomNo || !block) {
      return res.status(400).send("Student, Room No, and Block are required");
    }

    const existing = await Hostel.findOne({ where: { studentId, status: "Active" } });
    if (existing) {
      return res.status(400).send("Student already has an active hostel allocation");
    }

    const allocation = await Hostel.create({ 
      studentId, 
      roomNo, 
      block, 
      bedNo, 
      checkInDate, 
      monthlyRent, 
      remarks, 
      status: "Active" 
    });

    // Notify Student
    const student = await Student.findByPk(studentId);
    if (student && student.email) {
      const subject = "Hostel Accommodation Allocated – SmartCampus ERP";
      const text = `Dear ${student.name},\n\nYou have been allocated a room in the hostel.\n\nRoom No: ${roomNo}\nBlock: ${block}\nBed No: ${bedNo || "N/A"}\nCheck-in Date: ${checkInDate}\n\nRegards,\nHostel Management`;
      
      sendEmail(student.email, subject, text).catch(err => console.error("Allocation email failed:", err.message));
    }

    res.redirect("/hostel?toastCustom=Room_allocated_successfully_to_" + (student ? student.name.split(' ')[0] : 'Occupant'));
  } catch (err) {
    console.error(err);
    res.status(500).send("Allocation failed");
  }
};

// POST /hostel/vacate/:id
exports.vacate = async (req, res) => {
  try {
    const record = await Hostel.findByPk(req.params.id, {
      include: [{ model: Student, as: "student" }]
    });
    if (!record) return res.status(404).send("Record not found");

    // Security check for Students
    if (req.session.user && req.session.user.role === 'student') {
        if (!record.student || record.student.email !== req.session.user.email) {
            return res.status(403).send("Unauthorized: You can only check out of your own allocation.");
        }
    }
    
    record.status = "Vacated";
    record.checkOutDate = new Date().toISOString().split("T")[0];
    await record.save();

    // Notify Student
    if (record.student && record.student.email) {
      sendEmail(
        record.student.email,
        "Hostel Vacated – SmartCampus ERP",
        `Dear ${record.student.name},\n\nYour hostel room (${record.roomNo}) has been marked as Vacated on ${record.checkOutDate}.\n\nRegards,\nHostel Management`
      ).catch(err => console.error("Vacate email failed:", err.message));
    }

    res.redirect("/hostel?toastCustom=Room_" + record.roomNo + "_Checked_Out_successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Vacate failed");
  }
};

// DELETE /hostel/:id
exports.delete = async (req, res) => {
  try {
    await Hostel.destroy({ where: { id: req.params.id } });
    res.redirect("/hostel?toastCustom=Allocation_record_deleted");
  } catch (err) {
    res.status(500).send("Delete failed");
  }
};
