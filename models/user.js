const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ["User", "Admin"], default: "User" },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null }
});

module.exports = mongoose.model("User", UserSchema);