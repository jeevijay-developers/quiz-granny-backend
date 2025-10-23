import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/CategoryController.js";

const router = express.Router();

// Create a new category
router.post("/", createCategory);

// Get all categories
router.get("/", getAllCategories);

// Get a single category by ID
router.get("/:id", getCategoryById);

// Update a category
router.put("/:id", updateCategory);

// Delete a category
router.delete("/:id", deleteCategory);

export default router;
