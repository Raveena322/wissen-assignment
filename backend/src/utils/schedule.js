const dayjs = require("dayjs");

const CYCLE_START = dayjs("2026-01-05"); // Monday

const isWorkingDay = (dateStr) => {
  const day = dayjs(dateStr).day();
  return day >= 1 && day <= 5;
};

const getCycleWeek = (dateStr) => {
  const diffDays = dayjs(dateStr).startOf("day").diff(CYCLE_START.startOf("day"), "day");
  const absoluteWeeks = Math.floor(diffDays / 7);
  const mod = ((absoluteWeeks % 2) + 2) % 2;
  return mod; // 0 => week1, 1 => week2
};

const isDesignatedDay = (batch, dateStr) => {
  const week = getCycleWeek(dateStr);
  const day = dayjs(dateStr).day();

  if (batch === 1) {
    return week === 0 ? day >= 1 && day <= 3 : day >= 4 && day <= 5;
  }
  return week === 0 ? day >= 4 && day <= 5 : day >= 1 && day <= 3;
};

const getNextWorkingDay = (fromDate = dayjs()) => {
  let cursor = fromDate.add(1, "day").startOf("day");
  while (cursor.day() === 0 || cursor.day() === 6) {
    cursor = cursor.add(1, "day");
  }
  return cursor.format("YYYY-MM-DD");
};

const getCycleRange = (dateStr) => {
  const date = dayjs(dateStr).startOf("day");
  const diffDays = date.diff(CYCLE_START.startOf("day"), "day");
  const cycleIndex = Math.floor(diffDays / 14);
  const cycleStart = CYCLE_START.add(cycleIndex * 14, "day").startOf("day");
  const cycleEnd = cycleStart.add(13, "day").endOf("day");
  return {
    start: cycleStart.format("YYYY-MM-DD"),
    end: cycleEnd.format("YYYY-MM-DD"),
  };
};

module.exports = {
  isWorkingDay,
  getCycleWeek,
  isDesignatedDay,
  getNextWorkingDay,
  getCycleRange,
};
