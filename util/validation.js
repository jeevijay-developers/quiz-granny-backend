/**
 * Validation helpers for Question model.
 * Keep logic here so schema file stays clean.
 */

/**
 * Ensure mediaText has at least text or image (non-empty string).
 */
export function validateMediaText(media) {
  if (!media) return false;
  const hasText = typeof media.text === "string" && media.text.trim() !== "";
  const hasImage = typeof media.image === "string" && media.image.trim() !== "";
  return hasText || hasImage;
}

/**
 * Ensure options is an array of length 4 and each option has text or image.
 */
export function validateOptionsArray(options) {
  if (!Array.isArray(options) || options.length !== 4) return false;
  for (const opt of options) {
    const hasText = typeof opt?.text === "string" && opt.text.trim() !== "";
    const hasImage = typeof opt?.image === "string" && opt.image.trim() !== "";
    if (!hasText && !hasImage) return false;
  }
  return true;
}

/**
 * Ensure correctAnswer is an integer index pointing to one of the 4 options (0..3).
 */
export function validateCorrectAnswerIndex(index, options) {
  if (typeof index !== "number") return false;
  if (!Number.isInteger(index)) return false;
  if (!Array.isArray(options)) return false;
  return index >= 0 && index < options.length;
}

/**
 * Full-question validator throws Error when invalid (used in pre-validate hook).
 */
export function validateQuestion(doc) {
  if (!validateMediaText(doc.title)) {
    throw new Error("Question title must have text or image");
  }
  if (!validateOptionsArray(doc.options)) {
    throw new Error(
      "There must be exactly 4 options and each must have text or image"
    );
  }
  if (!validateCorrectAnswerIndex(doc.correctAnswer, doc.options)) {
    throw new Error(
      "correctAnswer must be an integer index (0-3) of the options array"
    );
  }
}
