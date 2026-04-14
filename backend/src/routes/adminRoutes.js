const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const Holiday = require("../models/Holiday");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { processWaitlist } = require("../services/bookingService");
const { emitSeatUpdate } = require("../utils/socket");

const router = express.Router();
router.use(auth, admin);

router.get("/bookings", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Booking.find()
      .populate("user", "name email squad batch")
      .populate("seat", "seatNumber type squad floor")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(),
  ]);
  return res.json({ items, total, page, limit });
});

router.delete("/bookings/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const date = booking.date;
  await booking.deleteOne();
  await processWaitlist(date);
  emitSeatUpdate({ date });
  return res.json({ message: "Booking cancelled by admin" });
});

router.get("/users", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find().select("-password").sort("squad batch name").skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  return res.json({ items, total, page, limit });
});

router.patch("/users/:id", async (req, res) => {
  const { squad, batch, role } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...(squad ? { squad } : {}), ...(batch ? { batch } : {}), ...(role ? { role } : {}) },
    { new: true }
  ).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
});

router.post("/holidays", async (req, res) => {
  const { date, name } = req.body;
  if (!date || !name) return res.status(400).json({ message: "date and name are required" });
  const holiday = await Holiday.findOneAndUpdate({ date }, { date, name }, { upsert: true, new: true });
  return res.status(201).json(holiday);
});

router.delete("/holidays/:date", async (req, res) => {
  await Holiday.deleteOne({ date: req.params.date });
  return res.json({ message: "Holiday removed" });
});

router.get("/analytics", async (req, res) => {
  const byDate = await Booking.aggregate([
    { $group: { _id: "$date", total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 7 },
  ]);
  const total = await Booking.countDocuments();
  const usagePercent = Math.min(100, Number(((total / 50) * 100).toFixed(2)));
  const squadAttendance = await Booking.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    { $group: { _id: "$userDoc.squad", total: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const seatHeatmap = await Booking.aggregate([
    {
      $lookup: {
        from: "seats",
        localField: "seat",
        foreignField: "_id",
        as: "seatDoc",
      },
    },
    { $unwind: "$seatDoc" },
    { $group: { _id: "$seatDoc.seatNumber", total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 20 },
  ]);
  return res.json({ usagePercent, peakDays: byDate, squadAttendance, seatHeatmap });
});

module.exports = router;
