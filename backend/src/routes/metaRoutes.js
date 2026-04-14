const express = require("express");
const dayjs = require("dayjs");
const auth = require("../middleware/auth");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const Booking = require("../models/Booking");
const { processWaitlist } = require("../services/bookingService");
const { emitSeatUpdate } = require("../utils/socket");

const router = express.Router();

router.use(auth);

router.get("/me", (req, res) => {
  return res.json(req.user);
});

router.get("/holidays", async (req, res) => {
  const holidays = await Holiday.find({
    date: { $gte: dayjs().startOf("year").format("YYYY-MM-DD") },
  }).sort("date");
  return res.json(holidays);
});

router.post("/leaves", async (req, res) => {
  const { fromDate, toDate } = req.body;
  if (!fromDate || !toDate || toDate < fromDate) {
    return res.status(400).json({ message: "Invalid leave range" });
  }

  const alreadyExists = await Leave.findOne({
    user: req.user._id,
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  });
  if (alreadyExists) {
    return res.status(400).json({ message: "Leave overlaps with existing leave range" });
  }

  const leave = await Leave.create({
    user: req.user._id,
    fromDate,
    toDate,
  });

  const cancelled = await Booking.deleteMany({
    user: req.user._id,
    date: { $gte: fromDate, $lte: toDate },
  });
  let cursor = dayjs(fromDate);
  const end = dayjs(toDate);
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    const date = cursor.format("YYYY-MM-DD");
    await processWaitlist(date);
    emitSeatUpdate({ date });
    cursor = cursor.add(1, "day");
  }

  return res.status(201).json({
    leave,
    cancelledBookings: cancelled.deletedCount || 0,
  });
});

router.get("/leaves", async (req, res) => {
  const leaves = await Leave.find({ user: req.user._id }).sort("-fromDate");
  return res.json(leaves);
});

module.exports = router;
