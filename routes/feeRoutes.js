const express = require("express");
const router = express.Router();
const feeController = require("../controllers/feeController");
const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


router.get("/", verifyToken, feeController.getAll);
router.post("/", verifyToken, allowRoles("admin"), feeController.create);
router.post("/pay/:id", verifyToken, allowRoles("admin"), feeController.pay);
router.get("/receipt/:receiptNo", verifyToken, feeController.downloadReceipt);
router.post("/remind/:id", verifyToken, allowRoles("admin"), feeController.sendReminder);
router.post("/delete/:id", verifyToken, allowRoles("admin"), feeController.delete);
router.post("/edit/:id", verifyToken, allowRoles("admin"), feeController.edit);
router.post("/bulk-upload", verifyToken, allowRoles("admin"), upload.single("bulkFile"), feeController.bulkUpload);
router.post("/bulk-delete", verifyToken, allowRoles("admin"), feeController.bulkDelete);


module.exports = router;
