const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ msg: "Welcome to the dashboard" });
});

module.exports = router;
