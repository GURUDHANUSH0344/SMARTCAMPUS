    const { Admission, Student, Fee, Exam, Hostel } = require("../models");
    const aiService = require("../services/aiService");

    exports.chat = async (req, res) => {
      try {
        const { message } = req.body;
        const userRole = req.session.user ? req.session.user.role : null;
        const studentId = req.session.user ? req.session.user.studentId : null;
        const userEmail = req.session.user ? req.session.user.email : null;

        if (!userEmail || userRole !== 'student') {
            return res.status(403).json({ error: "Only students can chat with the assistant." });
        }

        // Fetch student context by email
        const student = await Student.findOne({ where: { email: userEmail } });
        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        const fees = await Fee.findAll({ where: { studentId: student.id } });
        const exams = await Exam.findAll({ where: { studentId: student.id } });
        const hostel = await Hostel.findOne({ where: { studentId: student.id } });
        const admission = await Admission.findOne({ where: { email: userEmail } });

        const studentContext = {
          profile: student,
          fees: fees,
          exams: exams,
          hostel: hostel,
          admission: admission
        };

        console.log(`🤖 Chat request from student ${studentId}: "${message}"`);
        const response = await aiService.getChatResponse(studentContext, message);
        console.log(`✅ AI Response generated`);
        res.json({ response });

      } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
      }
};
