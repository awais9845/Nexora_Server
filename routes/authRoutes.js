import express from "express";
import { sendOTP, verifyOTP } from "../controllers/authController.js";

const app = express.Router();

app.post("/send-otp", sendOTP);

app.post("/verify-otp", verifyOTP);

export default app;
