import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import questionsRouter from "./routes/QuestionsRoute.js";
import categoryRouter from "./routes/CategoryRoute.js";
import userRouter from "./routes/UserRoute.js";

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.NEXT_PUBLIC_ADMIN_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Basic routes
app.get("/health", (req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api/questions", questionsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/users", userRouter);

// Config
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const server = app.listen(PORT, () =>
      console.log(`Server listening on port ${PORT}`)
    );

    // Graceful shutdown
    const shutdown = () => {
      console.log("Shutting down server...");
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0);
        });
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
