const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const studentDashboardController = require("../controllers/studentDashboardController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/profile", verifyToken, studentController.getProfile);
router.post("/profile", verifyToken, studentController.updateProfile);
router.get("/export", verifyToken, studentController.exportMyData);
router.get("/dashboard", verifyToken, studentDashboardController.getDashboard);

module.exports = router;
