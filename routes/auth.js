const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const User = require("../models/User");

const router = express.Router();

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This account is already verified.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    await user.save();

    const verifyLink = `${process.env.APP_URL}/api/auth/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: "Resend Verification - Financial Tracker",
      html: `
        <h2>Email Verification</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>Please verify your account by clicking the button below:</p>
        <a href="${verifyLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
          Verify Email
        </a>
        <p>Or copy this link:</p>
        <p>${verifyLink}</p>
      `,
    });

    res.json({
      success: true,
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email.",
    });
  }
});

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
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    const resetLink = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password - Financial Tracker",
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>You requested to reset your password.</p>
        <p>This link will expire in 15 minutes.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
        <p>Or copy this link:</p>
        <p>${resetLink}</p>
      `,
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

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    });

    const verifyLink = `${process.env.APP_URL}/api/auth/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your Financial Tracker account",
      html: `
        <h2>Email Verification</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>Thank you for registering. Please verify your email by clicking the button below:</p>
        <a href="${verifyLink}" 
           style="display:inline-block;padding:12px 18px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;">
           Verify Email
        </a>
        <p>If the button does not work, copy this link:</p>
        <p>${verifyLink}</p>
      `,
    });

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

// VERIFY EMAIL
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
    });

    if (!user) {
      return res.send(`
        <h2>Invalid or expired verification link.</h2>
        <a href="/">Go back to login</a>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <h2>Email verified successfully!</h2>
      <p>You can now login to your account.</p>
      <a href="/">Go to Login</a>
    `);
  } catch (error) {
    res.status(500).send("Email verification failed.");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
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

const protect = require("./middleware");

// UPDATE PROFILE
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
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
    res.status(500).json({ success: false, message: "Profile update failed." });
  }
});

// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
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
    res
      .status(500)
      .json({ success: false, message: "Password change failed." });
  }
});

module.exports = router;
