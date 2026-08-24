require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const { db, Student } = require("./models/index");

const authRoutes = require("./routes/authRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const examRoutes = require("./routes/examRoutes");
const feeRoutes = require("./routes/feeRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const studentRoutes = require("./routes/studentRoutes");
const aiRoutes = require("./routes/aiRoutes");

const startFeeReminderCron = require("./cron/feeReminder");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.JWT_SECRET || "smartcampus_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make session user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/admissions", admissionRoutes);
app.use("/exams", examRoutes);
app.use("/fees", feeRoutes);
app.use("/hostel", hostelRoutes);
app.use("/student", studentRoutes);
app.use("/ai", aiRoutes);

// Home — redirect to login if not authenticated
app.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  
  if (req.session.user.role === "student") {
    return res.redirect("/student/dashboard");
  }
  
  const { Admission, Student, Fee, Hostel, User } = require("./models/index");
  const analyticsService = require("./services/analyticsService");
  
  const admissionsCount = await Admission.count();
  const studentsCount = await Student.count();
  const pendingFeesCount = await Fee.count({ where: { status: ['Unpaid', 'Partial', 'Overdue'] } });
  const hostelCount = await Hostel.count({ where: { status: 'Occupied' } });
  
  const riskStudents = await analyticsService.getRiskStudents();

  // Fetch pending admin accounts for the approval panel
  const pendingAdmins = await User.findAll({ where: { role: "admin", status: "pending" } });
  
  res.render("dashboard", { 
    stats: {
      admissions: admissionsCount,
      students: studentsCount,
      fees: pendingFeesCount,
      hostel: hostelCount,
      riskCount: riskStudents.length
    },
    riskStudents: riskStudents,
    pendingAdmins: pendingAdmins,
    message: req.query.msg || null 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { message: "Something went wrong. Please try again." });
});

// DB sync + start server
const PORT = process.env.PORT || 3000;

db.sync()
  .then(async () => {
    console.log("✅ Database connected and synced");
    
    // Seed initial subjects
    try {
      const { Subject } = require("./models/index");
      const count = await Subject.count();
      if (count === 0) {
        await Subject.bulkCreate([
          { name: "Mathematics I" }, { name: "Physics" }, { name: "Chemistry" },
          { name: "Programming in C" }, { name: "Data Structures" }, { name: "Algorithms" },
          { name: "Database Management" }, { name: "Operating Systems" }, { name: "Computer Networks" },
          { name: "Software Engineering" }, { name: "Machine Learning" }, { name: "Artificial Intelligence" }
        ]);
        console.log("🌱 Subjects seeded");
      }
    } catch (seedErr) {
      console.warn("⚠️ Subject seeding skipped or already exists:", seedErr.message);
    }

    if (!process.env.VERCEL) {
      startFeeReminderCron();
      app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
    }
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
  });

module.exports = app;

