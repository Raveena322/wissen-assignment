const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    squad: { type: Number, required: true, min: 1, max: 10 },
    batch: { type: Number, required: true, enum: [1, 2] },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    preferredSeat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
