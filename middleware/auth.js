const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // אחזור הטוקן מה-Authorization header
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // אימות ה-JWT
    req.user = decoded; // שמירת המידע של המשתמש ב-req
    const user = await User.findById(req.user.id);

    // אם 2FA מופעל, נוודא שהמשתמש עבר את האימות
    if (user.twoFactorEnabled && !user.twoFactorVerified) {
      return res.status(403).json({ msg: "2FA required, access denied" }); // המשתמש נדרש לעבור אימות 2FA
    }

    next(); // ממשיך אם הכל תקין
  } catch (err) {
    res.status(400).json({ msg: "Token is not valid" });
  }
};

module.exports = authMiddleware;
