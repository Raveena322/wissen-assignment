const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const { port, mongoUri } = require("./config");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const metaRoutes = require("./routes/metaRoutes");
const adminRoutes = require("./routes/adminRoutes");
const runSeed = require("./seed");
const { setIo } = require("./utils/socket");

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
setIo(io);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/admin", adminRoutes);

const start = async () => {
  try {
    await mongoose.connect(mongoUri);
    await runSeed();
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
};

start();
