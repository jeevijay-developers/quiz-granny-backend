import Question from "../models/Questions.js";
import { uploadBufferToCloudinary } from "../util/uploadToCloudinary.js";

export async function createQuestion(req, res) {
  try {
    // Check if request is JSON format (nested objects) or form-data format (flat fields)
    const isJsonFormat = req.body.title && typeof req.body.title === "object";

    let title, options, explanation, parsedTags, correctAnswer, createdBy;

    if (isJsonFormat) {
      // Handle JSON body format (application/json)
      title = req.body.title || { text: "", image: "" };
      options = req.body.options || [];
      explanation = req.body.explanation || { text: "", image: "" };
      parsedTags = req.body.tags || [];
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
        tags,
        createdBy: formCreatedBy,
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

      // Parse tags (can be sent as comma-separated string or JSON array)
      parsedTags = [];
      if (tags) {
        try {
          parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
        } catch {
          // If not valid JSON, treat as comma-separated string
          parsedTags = tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
      }

      correctAnswer = req.body.correctAnswer;
      createdBy = formCreatedBy || null;
    }

    const q = new Question({
      title,
      options,
      correctAnswer: parseInt(correctAnswer, 10),
      explanation,
      tags: parsedTags,
      category: req.body.category || "General",
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

    // Update tags if provided
    if (req.body.tags !== undefined) {
      try {
        existing.tags =
          typeof req.body.tags === "string"
            ? JSON.parse(req.body.tags)
            : req.body.tags;
      } catch {
        // If not valid JSON, treat as comma-separated string
        existing.tags = req.body.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    // Update createdBy if provided
    if (req.body.createdBy !== undefined) {
      existing.createdBy = req.body.createdBy || null;
    }

    // Update category if provided
    if (req.body.category !== undefined) {
      existing.category = req.body.category;
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

export async function getQuestionsByTag(req, res) {
  try {
    const tag = req.params.tag;
    const questions = await Question.find({ tags: tag });

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ error: "No questions found with the specified tag" });
    }

    return res.status(200).json(questions);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error in fetching questions by tag" });
  }
}
