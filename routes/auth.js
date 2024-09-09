const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// רישום משתמשים
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // בדיקה אם המשתמש כבר קיים
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);

    // יצירת משתמש חדש ושמירתו
    user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// התחברות משתמשים
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // בדיקה אם המשתמש קיים
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // בדיקת סיסמה
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // אם 2FA מופעל, נדרוש אימות 2FA
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
      // אם 2FA לא מופעל, המשך כרגיל
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token, user: { id: user._id, email: user.email } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// אימות 2FA
router.post("/2fa/verify", async (req, res) => {
  try {
    const { userId, token } = req.body; // הטוקן מהגוף של הבקשה הוא טוקן ה-2FA, לא ה-JWT
    console.log("Verifying 2FA for user:", userId, "with token:", token);

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ msg: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, // סוד ה-2FA שנשמר בבסיס הנתונים
      encoding: "base32",
      token, // הקוד שהוזן מאפליקציית Google Authenticator
    });

    if (verified) {
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

// החזרת פרטי המשתמש
router.get("/user", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("email"); // מחזיר רק את כתובת הדוא"ל של המשתמש

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/2fa/setup", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // יצירת סוד חדש וקוד QR
    const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    // החזרת קוד QR לסריקה
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ qrCode: data_url });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

module.exports = router;
