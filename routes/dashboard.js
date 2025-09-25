const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const authorizeRoles = require("../middleware/role");

router.get("/dashboard", authMiddleware, authorizeRoles("Admin"), (req, res) => {
  res.json({ msg: `Welcome to the admin dashboard, ${req.user.username}!` });
});

// For User role validation
router.get("/profile", authMiddleware, authorizeRoles("User", "Admin"), (req, res) => {
  res.json({ msg: `Welcome, ${req.user.username}!`, role: req.user.role });
});

module.exports = router;