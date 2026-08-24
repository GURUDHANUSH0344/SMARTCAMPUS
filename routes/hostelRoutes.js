const express = require("express");
const router = express.Router();
const hostelController = require("../controllers/hostelController");
const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

router.get("/", verifyToken, hostelController.getAll);
router.post("/allocate", verifyToken, allowRoles("admin"), hostelController.allocate);
router.post("/vacate/:id", verifyToken, allowRoles("admin"), hostelController.vacate);
router.post("/delete/:id", verifyToken, allowRoles("admin"), hostelController.delete);

module.exports = router;