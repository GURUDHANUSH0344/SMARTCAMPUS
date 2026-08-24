const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", authController.getLogin);
router.get("/register", authController.getRegister);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/approve/:id", authController.approveAdmin);
router.post("/reject/:id", authController.rejectAdmin);

module.exports = router;
