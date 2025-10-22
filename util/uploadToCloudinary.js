import cloudinary from "./cloudinary.js";
import streamifier from "streamifier";

export function uploadBufferToCloudinary(buffer, folder = "quiz-granny") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
