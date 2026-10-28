import express from "express";
import authRoutes from "./authRoutes.js";

const app = express.Router();

app.use("/auth", authRoutes);

export default app;
