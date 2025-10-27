import { populate } from "dotenv";
import mongoose from "mongoose";

const mediaTextSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" }, // store URL or base64
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: { type: mediaTextSchema, required: true },
    options: { type: [optionSchema], required: true },
    correctAnswer: { type: Number, required: true },
    explanation: { type: mediaTextSchema, default: () => ({}) },
    categories: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      default: [],
    },
    difficulty: { type: Number, required: true, enum: [1, 2, 3, 4, 5] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Validation is now handled in route middleware (validateQuestionMiddleware)

const Question = mongoose.model("Question", questionSchema);
export default Question;
