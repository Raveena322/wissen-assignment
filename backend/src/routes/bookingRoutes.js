const express = require("express");
const dayjs = require("dayjs");
const auth = require("../middleware/auth");
const Booking = require("../models/Booking");
const Seat = require("../models/Seat");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const Waitlist = require("../models/Waitlist");
const SeatLock = require("../models/SeatLock");
const { createBooking, lockSeat, processWaitlist } = require("../services/bookingService");
const { isDesignatedDay, getCycleRange } = require("../utils/schedule");
const { emitSeatUpdate } = require("../utils/socket");

const router = express.Router();

router.use(auth);

router.post("/", async (req, res) => {
  try {
    const booking = await createBooking(req.user, req.body.date, req.body.seatId || null);
    return res.status(201).json(booking);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/lock", async (req, res) => {
  try {
    const result = await lockSeat(req.user, req.body.seatId, req.body.date);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/waitlist/my", async (req, res) => {
  const items = await Waitlist.find({ user: req.user._id, status: "pending" }).sort("date");
  return res.json(items);
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return res.status(404).json({ message: "Booking not found" });
    await existing.deleteOne();
    const booking = await createBooking(req.user, req.body.date, req.body.seatId || null);
    await processWaitlist(existing.date);
    emitSeatUpdate({ date: existing.date });
    return res.json(booking);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const oldDate = booking.date;
  await booking.deleteOne();
  await processWaitlist(oldDate);
  emitSeatUpdate({ date: oldDate });
  return res.json({ message: "Booking cancelled" });
});

router.get("/my", async (req, res) => {
  const start = req.query.start || dayjs().startOf("week").format("YYYY-MM-DD");
  const end = req.query.end || dayjs().add(14, "day").format("YYYY-MM-DD");
  const bookings = await Booking.find({
    user: req.user._id,
    date: { $gte: start, $lte: end },
  })
    .populate("seat")
    .sort("date");
  return res.json(bookings);
});

router.get("/availability", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "date is required" });

  const seats = await Seat.find().sort("seatNumber");
  const bookings = await Booking.find({ date }).select("seat");
  const locks = await SeatLock.find({ date, expiresAt: { $gt: new Date() } }).select("seat user");
  const bookedSet = new Set(bookings.map((b) => b.seat.toString()));
  const lockSet = new Set(locks.filter((l) => l.user.toString() !== req.user._id.toString()).map((l) => l.seat.toString()));

  const data = seats.map((seat) => ({
    ...seat.toObject(),
    isBooked: bookedSet.has(seat._id.toString()),
    isLocked: lockSet.has(seat._id.toString()),
  }));

  return res.json({
    date,
    designatedForUser: isDesignatedDay(req.user.batch, date),
    available: data.filter((s) => !s.isBooked && !s.isLocked).length,
    booked: data.filter((s) => s.isBooked).length,
    locked: data.filter((s) => s.isLocked).length,
    seats: data,
  });
});

router.get("/week", async (req, res) => {
  const start = dayjs(req.query.start || dayjs()).startOf("week").add(1, "day");
  const dates = [];
  for (let i = 0; i < 5; i += 1) dates.push(start.add(i, "day").format("YYYY-MM-DD"));

  const bookings = await Booking.find({ date: { $in: dates } }).populate("seat");
  const holidays = await Holiday.find({ date: { $in: dates } });
  const leaves = await Leave.find({ user: req.user._id });

  const schedule = dates.map((date) => {
    const dayBookings = bookings.filter((b) => b.date === date);
    const own = dayBookings.find((b) => b.user.toString() === req.user._id.toString());
    const leave = leaves.some((l) => date >= l.fromDate && date <= l.toDate);

    return {
      date,
      holiday: holidays.find((h) => h.date === date) || null,
      designated: isDesignatedDay(req.user.batch, date),
      totalBooked: dayBookings.length,
      booking: own || null,
      onLeave: leave,
    };
  });

  return res.json(schedule);
});

router.get("/cycle-summary", async (req, res) => {
  const date = req.query.date || dayjs().format("YYYY-MM-DD");
  const cycle = getCycleRange(date);
  const used = await Booking.countDocuments({
    user: req.user._id,
    date: { $gte: cycle.start, $lte: cycle.end },
  });

  return res.json({
    date,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    used,
    limit: 5,
    remaining: Math.max(0, 5 - used),
  });
});

module.exports = router;
