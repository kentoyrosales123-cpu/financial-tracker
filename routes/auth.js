const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const protect = require("./middleware");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: true,
    });

    sendEmail({
      to: user.email,
      subject: "Your FinanceFlow OTP Code",
      html: `
    <h2>FinanceFlow Verification Code</h2>
    <p>Hello ${user.name},</p>
    <p>Your OTP code is:</p>
    <h1 style="letter-spacing:4px;">${otpCode}</h1>
    <p>This code expires in 10 minutes.</p>
  `,
    }).catch((error) => {
      console.error("OTP email failed:", error.message);
    });

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please enter the OTP sent to your email.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

// RESEND OTP
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified.",
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    user.otpCode = otpCode;
    user.otpExpires = Date.now() + 1000 * 60 * 10;

    await user.save();

    sendEmail({
      to: user.email,
      subject: "Your FinanceFlow OTP Code",
      html: `
    <h2>FinanceFlow Verification Code</h2>
    <p>Hello ${user.name},</p>
    <p>Your OTP code is:</p>
    <h1 style="letter-spacing:4px;">${otpCode}</h1>
    <p>This code expires in 10 minutes.</p>
  `,
    }).catch((error) => {
      console.error("OTP email failed:", error.message);
    });

    res.json({
      success: true,
      message: "OTP resent successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP.",
    });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      otpCode: otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Account verified successfully. You may now login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "OTP verification failed.",
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;

    await user.save();

    const resetLink = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;

    sendEmail({
      to: user.email,
      subject: "Reset Your Password - Financial Tracker",
      html: `
    <h2>Password Reset</h2>
    <p>Hello ${user.name || "User"},</p>
    <p>You requested to reset your password.</p>
    <p>This link will expire in 15 minutes.</p>
    <a href="${resetLink}" 
       style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;">
       Reset Password
    </a>
    <p>${resetLink}</p>
  `,
    }).catch((error) => {
      console.error("Reset email failed:", error.message);
    });

    res.json({
      success: true,
      message: "Password reset link sent. Please check your email.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send reset password email.",
    });
  }
});

// RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You may now login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Password reset failed.",
    });
  }
});

// UPDATE PROFILE
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.name = name || user.name;
    user.email = email ? email.toLowerCase() : user.email;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Profile update failed.",
    });
  }
});

// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Password change failed.",
    });
  }
});

module.exports = router;
