const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const Seat = require("../models/Seat");
const Booking = require("../models/Booking");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const SeatLock = require("../models/SeatLock");
const Waitlist = require("../models/Waitlist");
const User = require("../models/User");
const { isDesignatedDay, isWorkingDay, getCycleRange } = require("../utils/schedule");
const { emitSeatUpdate } = require("../utils/socket");

dayjs.extend(utc);

const LOCK_MINUTES = 3;
const afterCutoff = () => dayjs.utc().hour() >= 15;

const getNextBookableWorkingDay = async (fromDate = dayjs.utc()) => {
  let cursor = fromDate.add(1, "day").startOf("day");
  while (true) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const holiday = await Holiday.findOne({ date: dateStr }).lean();
    if (isWorkingDay(dateStr) && !holiday) return dateStr;
    cursor = cursor.add(1, "day");
  }
};

const validateDateRules = async (date) => {
  if (!isWorkingDay(date)) {
    throw new Error("Only Monday-Friday bookings are allowed");
  }

  const holiday = await Holiday.findOne({ date });
  if (holiday) {
    throw new Error("Booking not allowed on holidays");
  }

  if (afterCutoff()) {
    const nextDay = await getNextBookableWorkingDay(dayjs.utc());
    if (date !== nextDay) {
      throw new Error(`After 3 PM you can only book for next working day (${nextDay})`);
    }
  }
};

const findSeatForBooking = async (user, date, blockedSeatIds = []) => {
  const designated = isDesignatedDay(user.batch, date);
  const bookedSeatIds = (await Booking.find({ date }).select("seat")).map((b) => b.seat.toString());
  const blockedSet = new Set([...bookedSeatIds, ...blockedSeatIds]);

  if (designated) {
    const squadSeats = await Seat.find({ type: "fixed", squad: user.squad }).sort("seatNumber");
    const squadSeat = squadSeats.find((seat) => !blockedSet.has(seat._id.toString()));
    if (squadSeat) return squadSeat;

    const floater = await Seat.findOne({ type: "floater", _id: { $nin: [...blockedSet] } }).sort("seatNumber");
    if (floater) return floater;
    return null;
  }

  const floater = await Seat.findOne({ type: "floater", _id: { $nin: [...blockedSet] } }).sort("seatNumber");
  if (floater) return floater;

  const fixed = await Seat.findOne({ type: "fixed", _id: { $nin: [...blockedSet] } }).sort("seatNumber");
  return fixed || null;
};

const hasLeaveOnDate = async (userId, date) => {
  const leaves = await Leave.find({ user: userId });
  return leaves.some((l) => date >= l.fromDate && date <= l.toDate);
};

const createBooking = async (user, date, selectedSeatId = null) => {
  await validateDateRules(date);

  const leaveExists = await hasLeaveOnDate(user._id, date);
  if (leaveExists) {
    throw new Error("You are marked on leave for this date");
  }

  const existing = await Booking.findOne({ user: user._id, date });
  if (existing) {
    throw new Error("Booking already exists for this date");
  }

  const cycle = getCycleRange(date);
  const cycleBookings = await Booking.countDocuments({
    user: user._id,
    date: { $gte: cycle.start, $lte: cycle.end },
  });
  if (cycleBookings >= 5) {
    throw new Error("You already have 5 bookings in this 2-week cycle");
  }

  const bookedSeatIds = (await Booking.find({ date }).select("seat")).map((b) => b.seat.toString());
  const activeLocks = await SeatLock.find({
    date,
    expiresAt: { $gt: new Date() },
    user: { $ne: user._id },
  }).select("seat");
  const lockSeatIds = activeLocks.map((l) => l.seat.toString());
  const blockedSeatIds = [...new Set([...bookedSeatIds, ...lockSeatIds])];

  let seat = null;
  if (selectedSeatId && !blockedSeatIds.includes(selectedSeatId)) {
    seat = await Seat.findById(selectedSeatId);
  }

  if (!seat && user.preferredSeat && !blockedSeatIds.includes(user.preferredSeat.toString())) {
    seat = await Seat.findById(user.preferredSeat);
  }

  if (!seat) seat = await findSeatForBooking(user, date, blockedSeatIds);
  if (!seat) {
    await Waitlist.updateOne(
      { user: user._id, date },
      { $setOnInsert: { user: user._id, date, status: "pending" } },
      { upsert: true }
    );
    throw new Error("No seat available. Added to waitlist.");
  }

  let booking;
  try {
    booking = await Booking.create({
      user: user._id,
      seat: seat._id,
      date,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Seat just got booked by another user. Please retry.");
    }
    throw error;
  }

  await SeatLock.deleteMany({ user: user._id, date });
  await Waitlist.updateMany({ user: user._id, date, status: "pending" }, { status: "assigned" });
  await User.updateOne({ _id: user._id }, { preferredSeat: seat._id });
  emitSeatUpdate({ date });

  return Booking.findById(booking._id).populate("seat").populate("user", "name squad batch");
};

const lockSeat = async (user, seatId, date) => {
  await validateDateRules(date);
  const seat = await Seat.findById(seatId);
  if (!seat) throw new Error("Seat not found");
  const booking = await Booking.findOne({ seat: seatId, date });
  if (booking) throw new Error("Seat already booked");
  await SeatLock.deleteMany({ expiresAt: { $lte: new Date() } });
  const existingLock = await SeatLock.findOne({ seat: seatId, date, expiresAt: { $gt: new Date() } });
  if (existingLock && existingLock.user.toString() !== user._id.toString()) {
    throw new Error("Seat is currently locked by another user");
  }

  const expiresAt = dayjs().add(LOCK_MINUTES, "minute").toDate();
  await SeatLock.findOneAndUpdate(
    { seat: seatId, date },
    { user: user._id, seat: seatId, date, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  emitSeatUpdate({ date });
  return { message: `Seat locked for ${LOCK_MINUTES} minutes`, expiresAt };
};

const processWaitlist = async (date) => {
  const next = await Waitlist.findOne({ date, status: "pending" }).sort("createdAt").populate("user");
  if (!next || !next.user) return;
  try {
    await createBooking(next.user, date);
    next.status = "assigned";
    await next.save();
  } catch (error) {
    // keep pending if still full
  }
};

module.exports = {
  createBooking,
  validateDateRules,
  lockSeat,
  processWaitlist,
};
