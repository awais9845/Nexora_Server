import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OTP } from "../models/OTP.js";
import { User } from "../models/user.js";

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

// 1. Send OTP to user's phone number
export const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Find an existing user with this phone number
    const existingUser = await User.findOne({ phone: phoneNumber });

    // Generate OTP
    const otp = generateOTP();

    // Remove previous OTP records for this phone number
    await OTP.deleteMany({ phone: phoneNumber });

    // Save hashed OTP with a 5-minute expiration
    await OTP.create({
      phone: phoneNumber,
      otpHash: hashOTP(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`Development OTP for ${phoneNumber}: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: "OTP request processed. Check your phone if SMS is configured.",
      isExistingUser: Boolean(existingUser),
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process OTP request",
    });
  }
};

// 2. Verify OTP and authenticate the user
export const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const otpRecord = await OTP.findOne({ phone: phoneNumber });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already used. Request a new OTP.",
      });
    }

    if (otpRecord.expiresAt <= new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Limit verification attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new OTP.",
      });
    }

    if (hashOTP(String(otp)) !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
      });
    }

    // OTP is valid; consume it before establishing authentication
    await OTP.deleteOne({ _id: otpRecord._id });

    // Find existing user or create a new customer
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      user = await User.create({
        phone: phoneNumber,
        role: "user",
      });
    }

    // Create a JWT session token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Store token in an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    user.isPhoneVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};
