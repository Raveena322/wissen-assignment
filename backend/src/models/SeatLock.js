const mongoose = require("mongoose");

const seatLockSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
    date: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
seatLockSchema.index({ seat: 1, date: 1 }, { unique: true });
seatLockSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model("SeatLock", seatLockSchema);
