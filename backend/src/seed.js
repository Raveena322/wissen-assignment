const bcrypt = require("bcryptjs");
const Seat = require("./models/Seat");
const User = require("./models/User");
const Holiday = require("./models/Holiday");

const seedSeats = async () => {
  const count = await Seat.countDocuments();
  if (count > 0) return;

  const seats = [];
  for (let i = 1; i <= 40; i += 1) {
    seats.push({
      seatNumber: i,
      type: "fixed",
      squad: Math.ceil(i / 4),
      floor: i <= 25 ? 1 : 2,
    });
  }
  for (let i = 41; i <= 50; i += 1) {
    seats.push({
      seatNumber: i,
      type: "floater",
      floor: i <= 45 ? 1 : 2,
    });
  }
  await Seat.insertMany(seats);
};

const seedUsers = async () => {
  const count = await User.countDocuments();
  if (count > 0) return;

  const password = await bcrypt.hash("password123", 10);
  const users = [];

  for (let squad = 1; squad <= 10; squad += 1) {
    for (let i = 1; i <= 8; i += 1) {
      users.push({
        name: `Squad${squad} User${i}`,
        email: `s${squad}u${i}@demo.com`,
        password,
        squad,
        batch: i <= 4 ? 1 : 2,
      });
    }
  }
  users.push({
    name: "System Admin",
    email: "admin@demo.com",
    password,
    squad: 1,
    batch: 1,
    role: "admin",
  });

  await User.insertMany(users);
};

const seedHolidays = async () => {
  const count = await Holiday.countDocuments();
  if (count > 0) return;
  await Holiday.insertMany([
    { date: "2026-01-26", name: "Republic Day" },
    { date: "2026-08-15", name: "Independence Day" },
  ]);
};

const runSeed = async () => {
  await seedSeats();
  await seedUsers();
  await seedHolidays();
};

module.exports = runSeed;
