const express = require("express");
const { Signup, Login, Logout, checkAuth, getProfile } = require("../controllers/authController");
const { protectRoutes } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", protectRoutes, Logout);
router.get("/check", protectRoutes, checkAuth);
router.get("/profile", protectRoutes, getProfile);

module.exports = router;
