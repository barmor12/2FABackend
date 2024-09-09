const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  twoFactorSecret: {
    type: String,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorVerified: {
    type: Boolean,
    default: false, // נתחיל בכך שהמשתמש לא עבר אימות 2FA עד שיעשה זאת
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
