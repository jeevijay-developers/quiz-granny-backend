import {
  validateMediaText,
  validateOptionsArray,
  validateCorrectAnswerIndex,
} from "../util/validation.js";

/**
 * Middleware to validate question data before saving.
 * Works with both form-data (from multer) and JSON bodies.
 */
export function validateQuestionMiddleware(req, res, next) {
  try {
    // Build the question object from form-data fields
    const questionData = buildQuestionFromRequest(req);

    // Validate title
    if (!validateMediaText(questionData.title)) {
      return res
        .status(400)
        .json({ error: "Question title must have text or image" });
    }

    // Validate options
    if (!validateOptionsArray(questionData.options)) {
      return res.status(400).json({
        error:
          "There must be exactly 4 options and each must have text or image",
      });
    }

    // Validate correctAnswer
    if (
      !validateCorrectAnswerIndex(
        questionData.correctAnswer,
        questionData.options
      )
    ) {
      return res.status(400).json({
        error:
          "correctAnswer must be an integer index (0-3) of the options array",
      });
    }

    // Validation passed
    next();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Build question object from request (handles both form-data and JSON)
 */
function buildQuestionFromRequest(req) {
  const { body, files } = req;

  // Check if data is coming as JSON (application/json)
  if (body.title && typeof body.title === "object") {
    return {
      title: body.title,
      options: body.options || [],
      correctAnswer: body.correctAnswer,
    };
  }

  // Otherwise, assume form-data format
  const title = {
    text: body.titleText || "",
    image: files?.titleImage?.[0] ? "uploaded" : "", // just check presence for validation
  };

  const options = [];
  for (let i = 0; i < 4; i++) {
    options.push({
      text: body[`optionText${i}`] || "",
      image: files?.[`optionImage${i}`]?.[0] ? "uploaded" : "",
    });
  }

  return {
    title,
    options,
    correctAnswer: body.correctAnswer ? parseInt(body.correctAnswer, 10) : null,
  };
}
