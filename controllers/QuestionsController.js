import Question from "../models/Questions";
import multer from "multer";
import { uploadBufferToCloudinary } from "../util/uploadToCloudinary.js";

const storage = multer.memoryStorage();
export const uploadMemory = multer({ storage });

export async function createQuestion(req, res) {
  try {
    const {
      titleText,
      optionText0,
      optionText1,
      optionText2,
      optionText3,
      correctAnswer,
    } = req.body;

    // Build title object
    const title = { text: titleText || "" };
    if (req.files?.titleImage?.length) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.titleImage[0].buffer,
        "questions/title"
      );
      title.image = uploaded.secure_url;
    }

    // Build options
    const options = [];
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

    const q = new Question({
      title,
      options,
      correctAnswer: parseInt(correctAnswer, 10),
    });

    await q.save();
    res.status(201).json(q);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    return res.status(200).json(questions);
  } catch (error) {
    return res.status(500).json({ error: "Error in fetching questions" });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    return res.status(200).json(question);
  } catch (error) {
    return res.status(500).json({ error: "Error in fetching question" });
  }
};

exports.updateQuestion = async(req, res)=> {
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

    if (req.body.correctAnswer !== undefined) {
      existing.correctAnswer = parseInt(req.body.correctAnswer, 10);
    }

    await existing.save();
    res.json(existing);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

exports.deleteQuestion = async(req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }
    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Error in deleting question" });
  }
};

exports.getQuestionsByTag = async(req, res) => {
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
};
