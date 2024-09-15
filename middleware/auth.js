const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the JWT token
    req.user = decoded; // Store the decoded user information in req
    const user = await User.findById(req.user.id);

    // If 2FA is enabled, ensure the user has passed 2FA verification
    if (user.twoFactorEnabled && !user.twoFactorVerified) {
      return res.status(403).json({ msg: "2FA required, access denied" }); // User must complete 2FA verification
    }

    next(); // Proceed if everything is valid
  } catch (err) {
    res.status(400).json({ msg: "Token is not valid" });
  }
};

module.exports = authMiddleware;
