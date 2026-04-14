const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["pending", "assigned", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

waitlistSchema.index({ user: 1, date: 1 }, { unique: true });
waitlistSchema.index({ date: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("Waitlist", waitlistSchema);
