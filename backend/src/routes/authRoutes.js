const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, squad, batch } = req.body;
    if (!name || !email || !password || !squad || !batch) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const squadCount = await User.countDocuments({ squad: Number(squad) });
    if (squadCount >= 8) {
      return res.status(400).json({ message: "This squad already has 8 members" });
    }

    const batchCount = await User.countDocuments({
      squad: Number(squad),
      batch: Number(batch),
    });
    if (batchCount >= 4) {
      return res.status(400).json({ message: "This squad batch is already full" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hash,
      squad,
      batch,
      role: "user",
    });

    return res.status(201).json({ message: "Registered", userId: user._id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "7d" });
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        squad: user.squad,
        batch: user.batch,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
