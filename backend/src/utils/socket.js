let io;

const setIo = (instance) => {
  io = instance;
};

const emitSeatUpdate = (payload) => {
  if (io) io.emit("seat:update", payload);
};

module.exports = {
  setIo,
  emitSeatUpdate,
};
