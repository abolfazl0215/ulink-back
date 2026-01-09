const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const router = express.Router();

// مطمئن شو که این متغیر محیطی را ست کردی
// process.env.JWT_SECRET = "کلید_مخفی_خودت";

router.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({
        loggedIn: false,
        message: "ایمیل ارسال نشده است",
        status: 400,
      });
  }

  try {
    // بررسی وجود کاربر
    let user = await User.findOne({ email });
    if (!user) {
      // اگر وجود ندارد، ایجاد کاربر جدید
      user = new User({ email });
      await user.save();
    }

    // ایجاد JWT
    const token = jwt.sign(
      { userId: user._id }, // می‌توانی ایمیل یا شناسه دیگر هم اضافه کنی
      process.env.JWT_SECRET,
      { expiresIn: "30d" }, // زمان اعتبار توکن
    );

    // ست کردن کوکی HttpOnly
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production", 
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .json({ loggedIn: true, message: "ورود موفق", status: 200 });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ loggedIn: false, message: "خطا در سرور", status: 500 });
  }
});

module.exports = router;
