const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/seat-booking",
  jwtSecret: process.env.JWT_SECRET || "super-secret-key",
};
