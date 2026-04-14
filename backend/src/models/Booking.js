const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, date: 1 }, { unique: true });
bookingSchema.index({ seat: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
