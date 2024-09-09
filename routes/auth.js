const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const multer = require("multer");

// רישום משתמש חדש
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // בדוק אם המשתמש כבר קיים
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);

    // יצירת משתמש חדש ושמירתו במסד הנתונים
    user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// התחברות משתמש
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      // יצירת סוד חדש בכל התחברות
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
      // אם 2FA לא מופעל, מבצעים התחברות רגילה
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ token, user: { id: user._id, email: user.email } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// אימות טוקן 2FA
router.post("/2fa/verify", async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ msg: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (verified) {
      // יצירת טוקן JWT חדש ושמירתו
      const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      return res.json({ verified: true, token: authToken });
    } else {
      return res.json({ verified: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ביטול 2FA
router.post("/2fa/disable", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.twoFactorSecret = "";
    user.twoFactorEnabled = false;
    await user.save();

    res.json({ msg: "2FA disabled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// הגדרת multer להעלאת קבצים
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // התיקייה בה הקבצים יישמרו
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // שם הקובץ
  },
});

const upload = multer({ storage });

// נקודת קצה להעלאת תמונת פרופיל
router.post(
  "/upload-profile-image",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      user.profileImage = `/uploads/${req.file.filename}`;
      await user.save();

      res.json({ profileImageUrl: user.profileImage });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
