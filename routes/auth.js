const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// User registration
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user and save
    user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Reset 2FA verified status on every login
    user.twoFactorVerified = false;
    await user.save();

    // If 2FA is enabled, require 2FA verification
    if (user.twoFactorEnabled) {
      const secret = speakeasy.generateSecret({
        name: `MyApp (${user.email})`,
      });
      user.twoFactorSecret = secret.base32;
      await user.save();

      qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ requires2FA: true, qrCode: data_url, userId: user._id });
      });
    } else {
      // If 2FA is not enabled, generate JWT token and return
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token, user: { id: user._id, email: user.email } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2FA verification
router.post("/2fa/verify", async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ msg: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, // Use the 2FA secret stored in DB
      encoding: "base32",
      token, // 2FA code entered by the user
    });

    if (verified) {
      // Mark the user as 2FA verified
      user.twoFactorVerified = true;
      await user.save();

      const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      return res.json({ verified: true, token: authToken });
    } else {
      return res
        .status(400)
        .json({ verified: false, msg: "Invalid 2FA token" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enable 2FA
router.post("/2fa/setup", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate new secret and QR code
    const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    // Return QR code for scanning
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ qrCode: data_url });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disable 2FA
router.post("/2fa/disable", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({ msg: "2FA disabled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return user details
router.get("/user", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "email twoFactorEnabled"
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
