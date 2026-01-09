const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: String,
  sendType: String,
  address: String,
  totalAmount: Number,
});
const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
