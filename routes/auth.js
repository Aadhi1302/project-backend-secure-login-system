const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const verifyCaptcha = require("../utils/verifyCaptcha");

// Zod schema for registration
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["User", "Admin"]).optional().default("User"),
});

// Register
router.post("/register", async (req, res) => {
  try {
    // CAPTCHA verification
    const captcha = req.body.captcha;
    if (!captcha) return res.status(400).json({ msg: "CAPTCHA required" });
    const captchaValid = await verifyCaptcha(captcha);
    if (!captchaValid) return res.status(400).json({ msg: "CAPTCHA verification failed" });

    // Validate request body
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ msg: "Validation error", errors: parsed.error.errors });
    }
    const { username, email, password, role } = parsed.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "Email already registered" });

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ msg: "Error registering user", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    // CAPTCHA verification
    const captcha = req.body.captcha;
    if (!captcha) return res.status(400).json({ msg: "CAPTCHA required" });
    const captchaValid = await verifyCaptcha(captcha);
    if (!captchaValid) return res.status(400).json({ msg: "CAPTCHA verification failed" });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    // Check for account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ msg: `Account locked. Try again in ${minutes} minute(s).` });
    }

    // Compare the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        return res.status(403).json({ msg: "Account locked due to too many failed login attempts. Try again in 15 minutes." });
      } else {
        await user.save();
      }
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Reset failed attempts and lock on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      "your_jwt_secret",
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;