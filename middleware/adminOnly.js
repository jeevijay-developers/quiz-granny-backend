import User from "../models/User.js";

export default async function adminOnly(req, res, next) {
  try {
    if (req.user && req.user.role === "admin") return next();

    const headerUserId = req.headers["x-user-id"] || req.headers["x-userid"];
    if (!headerUserId) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    // Validate ObjectId format loosely
    if (!headerUserId || typeof headerUserId !== "string") {
      return res.status(401).json({ error: "Invalid user id header" });
    }

    const user = await User.findById(headerUserId).select(
      "username email role"
    );
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });

    req.user = user;
    return next();
  } catch (err) {
    console.error("adminOnly middleware error:", err);
    return res.status(500).json({ error: "Server error during authorization" });
  }
}
