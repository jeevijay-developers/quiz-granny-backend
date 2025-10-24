import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getQuestionsByTag,
  getQuestionsByCategory,
} from "../controllers/QuestionsController.js";
import express from "express";
import { uploadMemory } from "../util/multerConfig.js";
import { validateQuestionMiddleware } from "../middleware/validateQuestion.js";

const router = express.Router();

// Define multer fields for image uploads
const uploadFields = uploadMemory.fields([
  { name: "titleImage", maxCount: 1 },
  { name: "optionImage0", maxCount: 1 },
  { name: "optionImage1", maxCount: 1 },
  { name: "optionImage2", maxCount: 1 },
  { name: "optionImage3", maxCount: 1 },
  { name: "explanationImage", maxCount: 1 },
]);

// Conditional multer middleware - only applies to multipart/form-data
const conditionalMulter = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    uploadFields(req, res, next);
  } else {
    next();
  }
};

// Routes with conditional multer middleware and validation for create and update
router.post("/", conditionalMulter, validateQuestionMiddleware, createQuestion);
router.get("/", getQuestions);
router.get("/tag/:tag", getQuestionsByTag);
router.get("/category/:categoryId", getQuestionsByCategory);
router.get("/:id", getQuestionById);
router.put("/:id", conditionalMulter, updateQuestion); // Update doesn't need full validation
router.delete("/:id", deleteQuestion);

export default router;
