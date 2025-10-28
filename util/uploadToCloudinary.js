import cloudinary from "./cloudinary.js";
import streamifier from "streamifier";

export function uploadBufferToCloudinary(buffer, folder = "quiz-granny") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        // Image optimization settings
        transformation: [
          { width: 1000, height: 1000, crop: "fill", gravity: "auto" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        flags: "progressive",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
