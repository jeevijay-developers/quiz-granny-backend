import Question from "../models/Questions.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import { uploadBufferToCloudinary } from "../util/uploadToCloudinary.js";
import cloudinary from "../util/cloudinary.js";
import mongoose from "mongoose";
import fs from "fs";
import csv from "csvtojson";
import XLSX from "xlsx";

// Helper function to extract public_id from Cloudinary URL
function getPublicIdFromUrl(url) {
  if (!url) return null;
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Get everything after 'upload' and the version
    const pathParts = parts.slice(uploadIndex + 2);
    const publicIdWithExt = pathParts.join("/");

    // Remove file extension
    const publicId = publicIdWithExt.substring(
      0,
      publicIdWithExt.lastIndexOf(".")
    );
    return publicId;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
}

// Helper function to delete image from Cloudinary
async function deleteImageFromCloudinary(imageUrl) {
  if (!imageUrl) return;

  const publicId = getPublicIdFromUrl(imageUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete image from Cloudinary: ${publicId}`, error);
  }
}

// Helper function to resolve createdBy to a valid ObjectId
async function resolveCreatedBy(createdByValue) {
  if (!createdByValue) return null;

  // If it's already a valid ObjectId, return it
  if (
    mongoose.Types.ObjectId.isValid(createdByValue) &&
    /^[0-9a-fA-F]{24}$/.test(createdByValue)
  ) {
    // Verify the user exists
    try {
      const user = await User.findById(createdByValue);
      if (user) {
        return createdByValue;
      }
      console.warn(`User with ID "${createdByValue}" not found`);
      return null;
    } catch (error) {
      console.error("Error verifying user:", error);
      return null;
    }
  }

  // Otherwise, try to find user by username (for backward compatibility)
  try {
    const user = await User.findOne({ username: createdByValue });
    if (user) {
      return user._id;
    }
    // If user not found, return null
    console.warn(`User with username "${createdByValue}" not found`);
    return null;
  } catch (error) {
    console.error("Error resolving createdBy:", error);
    return null;
  }
}

export async function createQuestion(req, res) {
  try {
    // Check if request is JSON format (nested objects) or form-data format (flat fields)
    const isJsonFormat = req.body.title && typeof req.body.title === "object";

    let title, options, explanation, correctAnswer, createdBy;

    if (isJsonFormat) {
      // Handle JSON body format (application/json)
      title = req.body.title || { text: "", image: "" };
      options = req.body.options || [];
      explanation = req.body.explanation || { text: "", image: "" };
      correctAnswer = req.body.correctAnswer;
      createdBy = req.body.createdBy || null;
    } else {
      // Handle form-data format (multipart/form-data)
      const {
        titleText,
        optionText0,
        optionText1,
        optionText2,
        optionText3,
        explanationText,
        correctAnswer: correctAnswerValue,
        createdBy: createdByValue,
      } = req.body;

      // Build title object
      title = { text: titleText || "" };
      if (req.files?.titleImage?.length) {
        const uploaded = await uploadBufferToCloudinary(
          req.files.titleImage[0].buffer,
          "questions/title"
        );
        title.image = uploaded.secure_url;
      }

      // Build options
      options = [];
      for (let i = 0; i < 4; i++) {
        const text = req.body[`optionText${i}`] || "";
        const fileArray = req.files?.[`optionImage${i}`];
        const option = { text };
        if (fileArray?.length) {
          const uploaded = await uploadBufferToCloudinary(
            fileArray[0].buffer,
            `questions/options`
          );
          option.image = uploaded.secure_url;
        }
        options.push(option);
      }

      // Build explanation object (optional)
      explanation = { text: explanationText || "" };
      if (req.files?.explanationImage?.length) {
        const uploaded = await uploadBufferToCloudinary(
          req.files.explanationImage[0].buffer,
          "questions/explanations"
        );
        explanation.image = uploaded.secure_url;
      }
      correctAnswer = correctAnswerValue;
      createdBy = createdByValue || null;
    }

    // Validate categories if provided
    let categoryIds = [];
    if (req.body.categories) {
      try {
        categoryIds =
          typeof req.body.categories === "string"
            ? JSON.parse(req.body.categories)
            : req.body.categories;

        // Ensure it's an array
        if (!Array.isArray(categoryIds)) {
          categoryIds = [categoryIds];
        }

        // Validate that all category IDs exist in the database
        if (categoryIds.length > 0) {
          const existingCategories = await Category.find({
            _id: { $in: categoryIds },
          });

          if (existingCategories.length !== categoryIds.length) {
            return res.status(400).json({
              error: "One or more category IDs are invalid or do not exist",
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          error: "Invalid categories format",
        });
      }
    }

    // Resolve createdBy to a valid ObjectId
    const resolvedCreatedBy = await resolveCreatedBy(createdBy);

    const q = new Question({
      title,
      options,
      correctAnswer: parseInt(correctAnswer, 10),
      explanation,
      categories: categoryIds,
      difficulty: parseInt(req.body.difficulty, 10) || 3,
      createdBy: resolvedCreatedBy,
    });

    await q.save();
    res.status(201).json(q);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

export async function getQuestions(req, res) {
  try {
    const questions = await Question.find()
      .populate("createdBy", "username email")
      .populate("approvedBy", "username email");
    return res.status(200).json(questions);
  } catch (error) {
    return res.status(500).json({ error: "Error in fetching questions" });
  }
}

export async function getQuestionById(req, res) {
  try {
    const question = await Question.findById(req.params.id).populate(
      "createdBy",
      "username email"
    );
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    return res.status(200).json(question);
  } catch (error) {
    return res.status(500).json({ error: "Error in fetching question" });
  }
}

export async function updateQuestion(req, res) {
  try {
    const id = req.params.id;
    const existing = await Question.findById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    // Update title text if provided
    if (req.body.titleText !== undefined)
      existing.title.text = req.body.titleText;

    // Replace title image if provided
    if (req.files?.titleImage?.length) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.titleImage[0].buffer,
        "questions/title"
      );
      existing.title.image = uploaded.secure_url;
    }

    // Update options individually
    for (let i = 0; i < 4; i++) {
      const txt = req.body[`optionText${i}`];
      if (txt !== undefined) existing.options[i].text = txt;

      if (req.files?.[`optionImage${i}`]?.length) {
        const uploaded = await uploadBufferToCloudinary(
          req.files[`optionImage${i}`][0].buffer,
          "questions/options"
        );
        existing.options[i].image = uploaded.secure_url;
      }
    }

    // Update explanation text if provided
    if (req.body.explanationText !== undefined) {
      if (!existing.explanation) existing.explanation = {};
      existing.explanation.text = req.body.explanationText;
    }

    // Replace explanation image if provided
    if (req.files?.explanationImage?.length) {
      if (!existing.explanation) existing.explanation = {};
      const uploaded = await uploadBufferToCloudinary(
        req.files.explanationImage[0].buffer,
        "questions/explanations"
      );
      existing.explanation.image = uploaded.secure_url;
    }

    // Update correctAnswer if provided
    if (req.body.correctAnswer !== undefined) {
      existing.correctAnswer = parseInt(req.body.correctAnswer, 10);
    }

    // Update createdBy if provided
    if (req.body.createdBy !== undefined) {
      const resolvedCreatedBy = await resolveCreatedBy(req.body.createdBy);
      existing.createdBy = resolvedCreatedBy;
    }

    // Update categories if provided
    if (req.body.categories !== undefined) {
      try {
        let categoryIds =
          typeof req.body.categories === "string"
            ? JSON.parse(req.body.categories)
            : req.body.categories;

        // Ensure it's an array
        if (!Array.isArray(categoryIds)) {
          categoryIds = [categoryIds];
        }

        // Validate that all category IDs exist in the database
        if (categoryIds.length > 0) {
          const existingCategories = await Category.find({
            _id: { $in: categoryIds },
          });

          if (existingCategories.length !== categoryIds.length) {
            return res.status(400).json({
              error: "One or more category IDs are invalid or do not exist",
            });
          }
        }

        existing.categories = categoryIds;
      } catch (error) {
        return res.status(400).json({
          error: "Invalid categories format",
        });
      }
    }

    // Update difficulty if provided
    if (req.body.difficulty !== undefined) {
      existing.difficulty = parseInt(req.body.difficulty, 10);
    }

    await existing.save();
    res.json(existing);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

export async function deleteQuestion(req, res) {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Delete all associated images from Cloudinary
    const imagesToDelete = [];

    // Add title image
    if (question.title?.image) {
      imagesToDelete.push(question.title.image);
    }

    // Add option images
    if (question.options && Array.isArray(question.options)) {
      question.options.forEach((option) => {
        if (option.image) {
          imagesToDelete.push(option.image);
        }
      });
    }

    // Add explanation image
    if (question.explanation?.image) {
      imagesToDelete.push(question.explanation.image);
    }

    // Delete all images from Cloudinary
    await Promise.all(
      imagesToDelete.map((imageUrl) => deleteImageFromCloudinary(imageUrl))
    );

    // Delete the question from database
    await Question.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Question and associated images deleted successfully",
      deletedImagesCount: imagesToDelete.length,
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ error: "Error in deleting question" });
  }
}

export async function getQuestionsByCategory(req, res) {
  try {
    const categoryId = req.params.categoryId;
    const questions = await Question.find({ categories: categoryId })
      .populate("categories")
      .populate("createdBy", "username email");

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found with the specified category" });
    }

    return res.status(200).json(questions);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error in fetching questions by category" });
  }
}

export async function getQuestionsByDateRange(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    // Validate that both dates are provided
    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "Both fromDate and toDate are required query parameters",
      });
    }

    // Parse and validate dates
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error:
          "Invalid date format. Please use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
      });
    }

    // Ensure fromDate is not after toDate
    if (startDate > endDate) {
      return res.status(400).json({
        error: "fromDate cannot be after toDate",
      });
    }

    // Set endDate to end of day to include all questions created on that day
    endDate.setHours(23, 59, 59, 999);

    // Query questions within the date range
    const questions = await Question.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("categories")
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      count: questions.length,
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      questions,
    });
  } catch (error) {
    console.error("Error fetching questions by date range:", error);
    return res.status(500).json({
      error: "Error in fetching questions by date range",
    });
  }
}

export async function toggleQuestionApproval(req, res) {
  try {
    const questionId = req.params.id;
    const { isApproved, approvedBy } = req.body;

    // Validate required fields
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        error: "isApproved field is required and must be a boolean",
      });
    }

    if (isApproved && !approvedBy) {
      return res.status(400).json({
        error: "approvedBy is required when approving a question",
      });
    }

    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Resolve approvedBy to valid ObjectId if approving
    let resolvedApprovedBy = null;
    if (isApproved) {
      resolvedApprovedBy = await resolveCreatedBy(approvedBy);
      if (!resolvedApprovedBy) {
        return res.status(400).json({
          error: "Invalid approvedBy user ID",
        });
      }
    }

    // Update approval status
    question.isApproved = isApproved;
    question.approvedBy = isApproved ? resolvedApprovedBy : null;

    await question.save();

    // Populate the response
    await question.populate("createdBy", "username email");
    await question.populate("approvedBy", "username email");
    await question.populate("categories");

    return res.status(200).json({
      message: isApproved
        ? "Question approved successfully"
        : "Question disapproved successfully",
      question,
    });
  } catch (error) {
    console.error("Error toggling question approval:", error);
    return res.status(500).json({
      error: "Error in toggling question approval",
    });
  }
}

export async function BulkUploadQuestionsController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    let questionsData = [];

    // Handle both CSV and Excel
    if (req.file.originalname.endsWith(".csv")) {
      questionsData = await csv().fromFile(filePath);
    } else if (
      req.file.originalname.endsWith(".xls") ||
      req.file.originalname.endsWith(".xlsx")
    ) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      questionsData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Unsupported file format" });
    }

    // Deleting the temp file from /uploads folder
    fs.unlinkSync(filePath);

    if (questionsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "File is empty. No questions to import.",
      });
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // Process each question
    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      const rowNumber = i + 2; // +2 because row 1 is header and arrays are 0-indexed

      try {
        // Validate mandatory fields
        if (!q["title_text"] || q["title_text"].trim() === "") {
          results.failed.push({
            row: rowNumber,
            data: q,
            reason: "Question title text is required",
          });
          continue;
        }

        // Validate options (at least 2 required, max 4)
        const options = [];
        for (let optNum = 1; optNum <= 4; optNum++) {
          const text = q[`option${optNum}_text`];
          const image = q[`option${optNum}_image`] || "";

          if (text && text.trim() !== "") {
            options.push({
              text: text.trim(),
              image: image.trim(),
            });
          }
        }

        if (options.length < 2) {
          results.failed.push({
            row: rowNumber,
            data: q,
            reason: "At least 2 options are required",
          });
          continue;
        }

        // Validate correctAnswer
        const correctAnswerIndex = parseInt(q["correctAnswer_index"], 10);
        if (
          isNaN(correctAnswerIndex) ||
          correctAnswerIndex < 0 ||
          correctAnswerIndex >= options.length
        ) {
          results.failed.push({
            row: rowNumber,
            data: q,
            reason: `Invalid correct answer index. Must be between 0 and ${options.length - 1}`,
          });
          continue;
        }

        // Validate difficulty
        let difficulty = parseInt(q["difficulty"], 10);
        if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
          difficulty = 3; // Default to medium
        }

        // Parse and validate categories (optional but strict)
        let categoryIds = [];
        if (q["categories"] && q["categories"].trim() !== "") {
          const categoryNames = q["categories"]
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name !== ""); // Remove empty strings

          if (categoryNames.length > 0) {
            const invalidCategories = [];

            // Find categories by name and validate all exist
            for (const catName of categoryNames) {
              const category = await Category.findOne({ name: catName });
              if (category) {
                categoryIds.push(category._id);
              } else {
                // Try as ObjectId if name lookup fails
                if (mongoose.Types.ObjectId.isValid(catName)) {
                  const catById = await Category.findById(catName);
                  if (catById) {
                    categoryIds.push(catById._id);
                  } else {
                    invalidCategories.push(catName);
                  }
                } else {
                  invalidCategories.push(catName);
                }
              }
            }

            // If any category is invalid, fail this row
            if (invalidCategories.length > 0) {
              results.failed.push({
                row: rowNumber,
                data: q,
                reason: `Invalid category name(s): ${invalidCategories.join(", ")}. Categories must exist in the database.`,
              });
              continue;
            }
          }
        }

        // Check if question with same title already exists
        const existingQuestion = await Question.findOne({
          "title.text": q["title_text"].trim(),
        });

        if (existingQuestion) {
          results.skipped.push({
            row: rowNumber,
            title: q["title_text"].trim(),
            reason: "Question with same title already exists",
          });
          continue;
        }

        // Resolve createdBy (optional)
        let resolvedCreatedBy = null;
        if (q["createdBy_username"] && q["createdBy_username"].trim() !== "") {
          const creator = await User.findOne({
            username: q["createdBy_username"].trim(),
          });
          if (creator) {
            resolvedCreatedBy = creator._id;
          }
        } else if (req.user?._id) {
          resolvedCreatedBy = req.user._id;
        }

        // Create the question
        const newQuestion = new Question({
          title: {
            text: q["title_text"].trim(),
            image: q["title_image"] ? q["title_image"].trim() : "",
          },
          options: options,
          correctAnswer: correctAnswerIndex,
          explanation: {
            text: q["explanation_text"] ? q["explanation_text"].trim() : "",
            image: q["explanation_image"] ? q["explanation_image"].trim() : "",
          },
          difficulty: difficulty,
          categories: categoryIds,
          createdBy: resolvedCreatedBy,
          isApproved: false, // New imports default to not approved
          approvedBy: null,
        });

        await newQuestion.save();

        // Populate for response
        await newQuestion.populate("categories", "name");
        await newQuestion.populate("createdBy", "username email");

        results.successful.push({
          row: rowNumber,
          question: newQuestion,
        });
      } catch (error) {
        results.failed.push({
          row: rowNumber,
          data: q,
          reason: error.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Bulk import completed",
      summary: {
        total: questionsData.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      results,
    });
  } catch (error) {
    console.error("Error during bulk upload:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

export async function ExportQuestions(req, res) {
  try {
    // Fetch all questions with useful related data
    const questions = await Question.find()
      .populate("createdBy", "username email")
      .populate("approvedBy", "username email")
      .populate("categories", "name")
      .sort({ createdAt: -1 });

    // Helper to safely escape CSV fields
    const escape = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      // Escape double quotes by doubling them, wrap field in double quotes
      return `"${str.replace(/"/g, '""')}"`;
    };

    // Build CSV header
    const headers = [
      "_id",
      "title_text",
      "title_image",
      "option1_text",
      "option1_image",
      "option2_text",
      "option2_image",
      "option3_text",
      "option3_image",
      "option4_text",
      "option4_image",
      "correctAnswer_index",
      "correctAnswer_text",
      "explanation_text",
      "explanation_image",
      "difficulty",
      "categories",
      "isApproved",
      "approvedBy_username",
      "approvedBy_email",
      "createdBy_username",
      "createdBy_email",
      "createdAt",
      "updatedAt",
    ];

    const rows = questions.map((q) => {
      // Ensure options array has 4 entries
      const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      while (opts.length < 4) opts.push({ text: "", image: "" });

      const correctIndex = q.correctAnswer;
      let correctText = "";
      // If stored as 0-based or 1-based number, try to pick a matching option
      if (typeof correctIndex === "number") {
        if (opts[correctIndex]) correctText = opts[correctIndex].text || "";
        else if (opts[correctIndex - 1])
          correctText = opts[correctIndex - 1].text || "";
      }

      const categoryNames = Array.isArray(q.categories)
        ? q.categories
            .map((c) =>
              c && c.name ? c.name : c && c._id ? String(c._id) : ""
            )
            .join(", ")
        : "";

      const row = [
        q._id,
        q.title?.text || "",
        q.title?.image || "",
        opts[0].text || "",
        opts[0].image || "",
        opts[1].text || "",
        opts[1].image || "",
        opts[2].text || "",
        opts[2].image || "",
        opts[3].text || "",
        opts[3].image || "",
        correctIndex !== undefined && correctIndex !== null ? correctIndex : "",
        correctText,
        q.explanation?.text || "",
        q.explanation?.image || "",
        q.difficulty != null ? q.difficulty : "",
        categoryNames,
        q.isApproved === true ? "true" : "false",
        q.approvedBy?.username || "",
        q.approvedBy?.email || "",
        q.createdBy?.username || "",
        q.createdBy?.email || "",
        q.createdAt ? q.createdAt.toISOString() : "",
        q.updatedAt ? q.updatedAt.toISOString() : "",
      ];

      return row.map(escape).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    // Send as downloadable CSV
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=questions_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting questions:", error);
    return res.status(500).json({ error: "Error exporting questions" });
  }
}
