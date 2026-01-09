const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  name: {
    type: String,
  },
  registrationDate: {
    type: Number,
    default: Date.now(),
  },
  links: [{ type: String, default: "" }],
});
const User = mongoose.model("User", userSchema);

module.exports = User;
