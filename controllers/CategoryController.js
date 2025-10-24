import Category from "../models/Category.js";
import Questions from "../models/Questions.js";

// Create a new category
export async function createCategory(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get all categories
export async function getAllCategories(req, res) {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Error in fetching categories" });
  }
}

// Get a single category by ID
export async function getCategoryById(req, res) {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    return res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({ error: "Error in fetching category" });
  }
}

// Update a category
export async function updateCategory(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if another category with the same name exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category name already exists" });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    return res.status(200).json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: "Error in updating category" });
  }
}

// Delete a category
export async function deleteCategory(req, res) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Remove this category from all questions that reference it
    await Questions.updateMany(
      { categories: req.params.id },
      { $pull: { categories: req.params.id } }
    );

    return res.status(200).json({
      message: "Category deleted successfully",
      category,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: "Error in deleting category" });
  }
}
