const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


router.get("/", verifyToken, examController.getAll);
router.post("/", verifyToken, allowRoles("admin"), examController.create);
router.post("/bulk-upload", verifyToken, allowRoles("admin"), upload.single("bulkFile"), examController.bulkUpload);
router.get("/student/:studentId", verifyToken, examController.getByStudent);

router.put("/:id", verifyToken, allowRoles("admin"), examController.update);
router.post("/delete/:id", verifyToken, allowRoles("admin"), examController.delete);

module.exports = router;
