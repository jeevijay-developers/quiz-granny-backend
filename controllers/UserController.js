import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Create a new user (Admin only)
export async function createUser(req, res) {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User with this email or username already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "user",
    });

    await user.save();

    // Return user without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    res.status(201).json(userResponse);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get all users (Admin only)
export async function getAllUsers(req, res) {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Error in fetching users" });
  }
}

// Get a single user by ID (Admin only)
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Error in fetching user" });
  }
}

// Update a user (Admin only)
export async function updateUser(req, res) {
  try {
    const { username, email, password, role } = req.body;
    const updateData = {};

    // Check if email/username is being changed and already exists
    if (email || username) {
      const existingUser = await User.findOne({
        $or: [
          email ? { email: email.toLowerCase() } : {},
          username ? { username: username.toLowerCase() } : {},
        ],
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "User with this email or username already exists",
        });
      }
    }

    if (username) updateData.username = username.toLowerCase();
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;

    // If password is being updated, hash it
    if (password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Error in updating user" });
  }
}

// Delete a user (Admin only)
export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      user,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Error in deleting user" });
  }
}

// Login user
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Return user without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ error: "Error in logging in" });
  }
}
