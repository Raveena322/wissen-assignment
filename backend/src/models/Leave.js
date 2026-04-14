const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);
