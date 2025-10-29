import multer from "multer";

// Use memory storage so files are available as buffers
const storage = multer.memoryStorage();

// Basic file filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Export configured multer instance
export const uploadMemory = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

export const uploadCSV = multer({ dest: "uploads/" });
