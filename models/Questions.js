import mongoose from "mongoose";
import { validateQuestion } from "../util/validation.js";

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
    tags: { type: [String], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Delegate validation to util/validation.js
questionSchema.pre("validate", function (next) {
  try {
    validateQuestion(this);
    next();
  } catch (err) {
    next(err);
  }
});

const Question = mongoose.model("Question", questionSchema);
export default Question;
