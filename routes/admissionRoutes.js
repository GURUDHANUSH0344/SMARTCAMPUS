const express = require("express");
const router = express.Router();
const multer = require("multer");
const admissionController = require("../controllers/admissionController");
const studentDashboardController = require("../controllers/studentDashboardController");
const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

router.get("/", verifyToken, admissionController.getAll);
router.post("/", verifyToken, upload.single("document"), admissionController.create);
router.post("/bulk-upload", verifyToken, allowRoles("admin"), upload.single("bulkFile"), admissionController.bulkUploadAdmissions);
router.post("/approve/:id", verifyToken, allowRoles("admin"), admissionController.approve);

router.post("/reject/:id", verifyToken, allowRoles("admin"), admissionController.reject);
router.delete("/:id", verifyToken, allowRoles("admin"), admissionController.delete);

// Student Management (Admin)
router.get("/students", verifyToken, allowRoles("admin"), admissionController.getStudents);
router.post("/students", verifyToken, allowRoles("admin"), admissionController.createStudent);
router.post("/students/bulk-upload", verifyToken, allowRoles("admin"), upload.single("bulkFile"), admissionController.bulkUploadStudents);
router.post("/students/delete/:id", verifyToken, allowRoles("admin"), admissionController.deleteStudent);
router.post("/students/bulk-delete", verifyToken, allowRoles("admin"), admissionController.bulkDeleteStudents);

router.get("/students/:id/dashboard", verifyToken, allowRoles("admin"), studentDashboardController.getAdminView);

module.exports = router;
