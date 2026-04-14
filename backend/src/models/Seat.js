const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    seatNumber: { type: Number, required: true, unique: true, min: 1 },
    type: { type: String, required: true, enum: ["fixed", "floater"] },
    squad: { type: Number, min: 1, max: 10 },
    floor: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seat", seatSchema);
