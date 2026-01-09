const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  price: { type: Number },
  total: { type: Number, default: 1 },
  options: [
    {
      option: { type: String },
      value: { type: String },
    },
  ],
});
const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
