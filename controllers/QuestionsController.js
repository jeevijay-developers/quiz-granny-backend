import Question from "../models/Questions.js";
import Category from "../models/Category.js";
import { uploadBufferToCloudinary } from "../util/uploadToCloudinary.js";

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
        correctAnswer,
        createdBy,
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
      correctAnswer = req.body.correctAnswer;
      createdBy = formCreatedBy || null;
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

    const q = new Question({
      title,
      options,
      correctAnswer: parseInt(correctAnswer, 10),
      explanation,
      categories: categoryIds,
      difficulty: parseInt(req.body.difficulty, 10) || 3,
      createdBy: createdBy || null,
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
    const questions = await Question.find();
    return res.status(200).json(questions);
  } catch (error) {
    return res.status(500).json({ error: "Error in fetching questions" });
  }
}

export async function getQuestionById(req, res) {
  try {
    const question = await Question.findById(req.params.id);
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
      existing.createdBy = req.body.createdBy || null;
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
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }
    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Error in deleting question" });
  }
}

export async function getQuestionsByCategory(req, res) {
  try {
    const categoryId = req.params.categoryId;
    const questions = await Question.find({ categories: categoryId }).populate(
      "categories"
    );

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
