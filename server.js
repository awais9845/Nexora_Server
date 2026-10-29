import express from "express";
import { config } from "dotenv";
import cors from "cors";
import indexRoutes from "./routes/indexRoute.js";
import connectDB from "./config/connectDB.js";

const app = express();
config();
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());
app.use("/api", indexRoutes);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "working correctly",
  });
});

app.listen(3000, () => {
  console.log(`server is running on http://localhost${3000}`);
});
