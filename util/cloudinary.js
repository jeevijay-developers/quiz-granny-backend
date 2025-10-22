import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load .env when present
dotenv.config();

const { CLOUDINARY_NAME, CLOUDINARY_CLOUD_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_NAME || !CLOUDINARY_CLOUD_KEY || !CLOUDINARY_API_SECRET) {
  // Keep this as console.warn so app can still run in environments without cloudinary
  console.warn(
    "Cloudinary credentials are not fully set. Set CLOUDINARY_NAME, CLOUDINARY_CLOUD_KEY and CLOUDINARY_API_SECRET in your environment to enable uploads."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_CLOUD_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export default cloudinary;
