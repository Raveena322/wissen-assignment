import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { io } from "socket.io-client";
import api from "./api";

const today = dayjs().format("YYYY-MM-DD");
const buttonBase = "rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60";
const inputBase = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const cardBase = "rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:shadow-md";

function formatDate(value) {
  return dayjs(value).format("ddd, DD MMM YYYY");
}

function monthDays(dateStr) {
  const base = dayjs(dateStr).startOf("month");
  const total = base.daysInMonth();
  return Array.from({ length: total }, (_, i) => base.add(i, "day").format("YYYY-MM-DD"));
}

function getStatusTone(text) {
  if (text.includes("Booked")) return "blue";
  if (text.includes("leave")) return "amber";
  return "slate";
}

function Badge({ label, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}

function StatCard({ title, value, tone = "slate", hint }) {
  const tones = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    red: "text-rose-600",
    blue: "text-blue-700",
    indigo: "text-indigo-700",
  };
  return (
    <div className={cardBase}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="mb-3 border-b border-slate-100 pb-2">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
          <p className="font-semibold text-slate-800">{t.title}</p>
          <p className="text-slate-600">{t.message}</p>
        </div>
      ))}
    </div>
  );
}

function AdminPanel() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [holiday, setHoliday] = useState({ date: today, name: "" });

  const load = async () => {
    const [b, u, a] = await Promise.all([
      api.get("/admin/bookings"),
      api.get("/admin/users"),
      api.get("/admin/analytics"),
    ]);
    setBookings(b.data.items || []);
    setUsers(u.data.items || []);
    setAnalytics(a.data);
  };

  useEffect(() => {
    load();
  }, []);

  const addHoliday = async () => {
    await api.post("/admin/holidays", holiday);
    setHoliday({ date: today, name: "" });
  };

  const cancelAnyBooking = async (id) => {
    await api.delete(`/admin/bookings/${id}`);
    await load();
  };

  return (
    <div className="mt-6 space-y-4">
      <div className={cardBase}>
        <PanelTitle title="Admin Panel" subtitle="Control holidays, users, bookings, and analytics." />
        <p className="text-sm text-slate-600">Manage holidays, users, and all bookings.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cardBase}>
          <h3 className="mb-2 font-semibold text-slate-800">Add Holiday</h3>
          <input className={`${inputBase} mb-2`} type="date" value={holiday.date} onChange={(e) => setHoliday((p) => ({ ...p, date: e.target.value }))} />
          <input className={`${inputBase} mb-2`} placeholder="Holiday name" value={holiday.name} onChange={(e) => setHoliday((p) => ({ ...p, name: e.target.value }))} />
          <button className={`${buttonBase} w-full bg-indigo-600 hover:bg-indigo-700`} onClick={addHoliday}>Save Holiday</button>
        </div>

        <div className={cardBase}>
          <h3 className="mb-2 font-semibold text-slate-800">Analytics</h3>
          <p className="text-sm">Seat usage: <span className="font-semibold">{analytics?.usagePercent ?? 0}%</span></p>
          <div className="mt-2 space-y-1 text-xs">
            {analytics?.peakDays?.map((d) => (
              <p key={d._id}>{d._id}: {d.total} bookings</p>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {analytics?.squadAttendance?.map((s) => (
              <div key={s._id} className="rounded bg-slate-50 px-2 py-1">Squad {s._id}: {s.total}</div>
            ))}
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-slate-600">Seat Heatmap (top)</p>
            <div className="flex flex-wrap gap-1">
              {analytics?.seatHeatmap?.slice(0, 12).map((h) => (
                <span key={h._id} className="rounded bg-rose-100 px-2 py-1 text-[11px] text-rose-700">S{h._id}: {h.total}</span>
              ))}
            </div>
          </div>
        </div>

        <div className={cardBase}>
          <h3 className="mb-2 font-semibold text-slate-800">Users ({users.length})</h3>
          <div className="max-h-44 space-y-1 overflow-auto text-xs">
            {users.map((u) => (
              <p key={u._id}>{u.name} - Squad {u.squad} Batch {u.batch} ({u.role})</p>
            ))}
          </div>
        </div>
      </div>

      <div className={cardBase}>
        <h3 className="mb-2 font-semibold text-slate-800">All Bookings</h3>
        <div className="max-h-72 space-y-2 overflow-auto text-sm">
          {bookings.map((b) => (
            <div key={b._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
              <span>{b.date} - {b.user?.name} - Seat {b.seat?.seatNumber}</span>
              <button className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => cancelAnyBooking(b._id)}>Cancel</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthForm({ setSession }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "s1u1@demo.com",
    password: "password123",
    squad: 1,
    batch: 1,
  });
  const [authError, setAuthError] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (!isLogin) {
        await api.post("/auth/register", {
          ...form,
          squad: Number(form.squad),
          batch: Number(form.batch),
        });
      }
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);
      setSession(res.data.user);
    } catch (error) {
      setAuthError(error.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-4 p-4 md:grid-cols-2 md:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg">
        <p className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Seat Booking System</p>
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-200">Book your designated or floater seat, track your weekly schedule, and manage leaves from one dashboard.</p>
        <div className="mt-6 space-y-2 text-sm text-slate-100">
          <p>- 50 seat visual map with live availability</p>
          <p>- Batch-based designated day allocation</p>
          <p>- 3 PM cutoff and holiday-aware rules</p>
          <p>- 5 bookings cap per 2-week cycle</p>
        </div>
        <div className="mt-6 rounded-lg bg-white/10 p-3 text-xs">
          <p>
            User demo: <span className="font-semibold">s1u1@demo.com</span> / <span className="font-semibold">password123</span>
          </p>
          <p className="mt-1">
            Admin demo: <span className="font-semibold">admin@demo.com</span> / <span className="font-semibold">password123</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{isLogin ? "Login" : "Create Account"}</h2>
          <Badge label={isLogin ? "Sign In" : "Sign Up"} tone="blue" />
        </div>
        <p className="mb-4 text-sm text-slate-500">{isLogin ? "Use your credentials to continue." : "Register with squad and batch details."}</p>
        <form className="space-y-3" onSubmit={submit}>
          {!isLogin && (
            <>
              <input className={inputBase} placeholder="Name" name="name" onChange={onChange} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputBase} placeholder="Squad 1-10" name="squad" type="number" min="1" max="10" onChange={onChange} />
                <input className={inputBase} placeholder="Batch 1-2" name="batch" type="number" min="1" max="2" onChange={onChange} />
              </div>
            </>
          )}
          <input className={inputBase} placeholder="Email" name="email" value={form.email} onChange={onChange} />
          <input className={inputBase} placeholder="Password" name="password" type="password" value={form.password} onChange={onChange} />
          <button className={`w-full bg-blue-600 hover:bg-blue-700 ${buttonBase}`}>{isLogin ? "Login to Dashboard" : "Register and Continue"}</button>
          {authError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{authError}</p>}
        </form>
        <button className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700" onClick={() => setIsLogin((v) => !v)}>
          {isLogin ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(today);
  const [availability, setAvailability] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [week, setWeek] = useState([]);
  const [cycleSummary, setCycleSummary] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [leave, setLeave] = useState({ fromDate: today, toDate: today });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [calendarView, setCalendarView] = useState("week");
  const [liveStamp, setLiveStamp] = useState(null);

  const ownSeatIds = useMemo(() => new Set(myBookings.map((b) => b.seat?._id)), [myBookings]);
  const myBookingForDate = myBookings.find((b) => b.date === date);
  const selectedDaySchedule = week.find((d) => d.date === date);
  const fixedAvailable = availability?.seats?.filter((s) => !s.isBooked && s.type === "fixed").length ?? 0;
  const floaterAvailable = availability?.seats?.filter((s) => !s.isBooked && s.type === "floater").length ?? 0;
  const fixedBySquad = useMemo(() => {
    const grouped = {};
    (availability?.seats || [])
      .filter((s) => s.type === "fixed")
      .forEach((seat) => {
        const key = seat.squad || 0;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(seat);
      });
    return grouped;
  }, [availability]);

  const notify = (title, msg) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((p) => [...p, { id, title, message: msg }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  };

  const loadAll = async (targetDate = date) => {
    setLoading(true);
    try {
      const [meRes, availabilityRes, myRes, weekRes] = await Promise.all([
        api.get("/meta/me"),
        api.get("/bookings/availability", { params: { date: targetDate } }),
        api.get("/bookings/my"),
        api.get("/bookings/week"),
      ]);
      const cycleRes = await api.get("/bookings/cycle-summary", { params: { date: targetDate } });
      const waitlistRes = await api.get("/bookings/waitlist/my");
      setUser(meRes.data);
      setAvailability(availabilityRes.data);
      setMyBookings(myRes.data);
      setWeek(weekRes.data);
      setCycleSummary(cycleRes.data);
      setWaitlist(waitlistRes.data);
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      notify("Session", error.response?.data?.message || "Session expired. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    loadAll();
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .get("/bookings/availability", { params: { date } })
      .then((res) => setAvailability(res.data))
      .catch(() => notify("Error", "Failed to refresh seat map"));

    api
      .get("/bookings/cycle-summary", { params: { date } })
      .then((res) => setCycleSummary(res.data))
      .catch(() => notify("Error", "Failed to refresh cycle summary"));
  }, [date, user]);

  useEffect(() => {
    if (!user) return undefined;
    const socket = io("http://localhost:5000");
    socket.on("seat:update", (payload) => {
      if (payload?.date === date) {
        loadAll(date);
        setLiveStamp(dayjs().format("HH:mm:ss"));
      }
    });
    return () => socket.disconnect();
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    loadAll(date);
  }, [user?._id]);

  useEffect(() => {
    setSelectedSeatId(null);
  }, [date]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const doBooking = async () => {
    setActionLoading(true);
    try {
      await api.post("/bookings", { date, seatId: selectedSeatId || undefined });
      notify("Booking", "Seat booked successfully");
      setSelectedSeatId(null);
      await loadAll(date);
    } catch (e) {
      notify("Booking Failed", e.response?.data?.message || "Booking failed");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    setActionLoading(true);
    try {
      await api.delete(`/bookings/${id}`);
      notify("Cancellation", "Booking cancelled");
      await loadAll(date);
    } catch (error) {
      notify("Cancellation Failed", error.response?.data?.message || "Failed to cancel booking");
    } finally {
      setActionLoading(false);
    }
  };

  const editBooking = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/bookings/${id}`, { date, seatId: selectedSeatId || undefined });
      notify("Booking Updated", "Your booking was updated");
      setSelectedSeatId(null);
      await loadAll(date);
    } catch (error) {
      notify("Edit Failed", error.response?.data?.message || "Failed to update booking");
    } finally {
      setActionLoading(false);
    }
  };

  const lockSeatForDate = async (seatId) => {
    try {
      await api.post("/bookings/lock", { seatId, date });
      setSelectedSeatId(seatId);
      notify("Seat Locked", "Seat locked for 3 minutes");
      await loadAll(date);
    } catch (error) {
      notify("Lock Failed", error.response?.data?.message || "Unable to lock seat");
    }
  };

  const markLeave = async () => {
    setActionLoading(true);
    try {
      await api.post("/meta/leaves", leave);
      notify("Leave Saved", "Leave request saved");
      await loadAll(date);
    } catch (error) {
      notify("Leave Failed", error.response?.data?.message || "Failed to save leave");
    } finally {
      setActionLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setAvailability(null);
    setMyBookings([]);
  };

  if (!user) return <AuthForm setSession={setUser} />;

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-900 text-slate-100" : "bg-gradient-to-b from-slate-50 to-slate-100"}`}>
      <ToastStack toasts={toasts} />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Seat Booking Dashboard</h1>
            <p className="mt-1 text-sm text-slate-200">Manage designated and floater seat bookings in one place.</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-sm backdrop-blur-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-slate-200">Squad {user.squad} | Batch {user.batch}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30" onClick={() => setDarkMode((v) => !v)}>
                {darkMode ? "Light" : "Dark"} Mode
              </button>
              <button className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30" onClick={logout}>Logout</button>
            </div>
            {liveStamp && <p className="mt-1 text-[11px] text-slate-200">Live synced at {liveStamp}</p>}
          </div>
        </div>
      </div>
      {loading && <p className="mb-3 text-sm text-slate-600">Loading latest data...</p>}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Selected Date" value={formatDate(date)} hint="Current working context" />
        <StatCard title="Total Seats" value="50" />
        <StatCard title="Available" value={availability?.available ?? "-"} tone="green" />
        <StatCard title="Booked" value={availability?.booked ?? "-"} tone="red" />
        <StatCard
          title="Cycle Usage"
          value={cycleSummary ? `${cycleSummary.used}/${cycleSummary.limit}` : "-"}
          tone="indigo"
          hint={cycleSummary ? `${cycleSummary.cycleStart} to ${cycleSummary.cycleEnd}` : ""}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className={cardBase}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <PanelTitle title="Book Seat" subtitle="Pick a date and confirm one seat." />
              {selectedDaySchedule && (
                <Badge
                  label={
                    selectedDaySchedule.designated
                      ? "Selected day is designated"
                      : "Selected day is non-designated"
                  }
                  tone={selectedDaySchedule.designated ? "green" : "amber"}
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Date</label>
                <input type="date" className={inputBase} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setDate(today)}
                disabled={actionLoading}
              >
                Today
              </button>
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"))}
                disabled={actionLoading}
              >
                Prev
              </button>
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"))}
                disabled={actionLoading}
              >
                Next
              </button>
              <button className={`${buttonBase} bg-emerald-600 hover:bg-emerald-700`} onClick={doBooking} disabled={actionLoading || !!myBookingForDate}>
                {myBookingForDate ? "Already Booked" : "Book Seat"}
              </button>
              {!!myBookingForDate && (
                <button className={`${buttonBase} bg-indigo-600 hover:bg-indigo-700`} onClick={() => editBooking(myBookingForDate._id)} disabled={actionLoading}>
                  Edit
                </button>
              )}
              {myBookingForDate && (
                <button
                  className={`${buttonBase} bg-rose-600 hover:bg-rose-700`}
                  onClick={() => cancelBooking(myBookingForDate._id)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              )}
            </div>
            {myBookingForDate && (
              <p className="mt-3 text-sm text-slate-600">
                You have seat <span className="font-semibold">{myBookingForDate.seat?.seatNumber}</span> on {formatDate(date)}.
              </p>
            )}
            {!myBookingForDate && (
              <p className="mt-3 text-xs text-slate-500">
                Tip: Non-designated days try floater first, then free fixed seats.
              </p>
            )}
          </div>

          <div className={cardBase}>
            <div className="mb-3 flex items-center justify-between">
              <PanelTitle title={`Seat Map (${formatDate(date)})`} subtitle="Select a green seat to lock for 3 minutes." />
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Available</span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Booked</span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Your Seat</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Floater</span>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={`Fixed available: ${fixedAvailable}`} tone="green" />
              <Badge label={`Floater available: ${floaterAvailable}`} tone="blue" />
            </div>
            <div className="mb-3 flex gap-2 text-xs">
              <button className={`rounded px-2 py-1 ${calendarView === "week" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setCalendarView("week")}>Week</button>
              <button className={`rounded px-2 py-1 ${calendarView === "month" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setCalendarView("month")}>Month</button>
            </div>
            {calendarView === "month" && (
              <div className="mb-4 grid grid-cols-7 gap-1">
                {monthDays(date).map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`rounded px-2 py-1 text-xs ${d === date ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}
                    onClick={() => setDate(d)}
                  >
                    {dayjs(d).date()}
                  </button>
                ))}
              </div>
            )}

            {Object.keys(fixedBySquad).sort((a, b) => Number(a) - Number(b)).map((squad) => (
              <div key={squad} className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Squad {squad}</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8">
                  {fixedBySquad[squad].map((seat) => {
                    const isMine = ownSeatIds.has(seat._id);
                    const isSelected = selectedSeatId === seat._id;
                    const color = isMine
                      ? "border-blue-600 bg-blue-600 text-white"
                      : seat.isBooked || seat.isLocked
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-emerald-500 bg-emerald-500 text-white";
                    return (
                      <button
                        type="button"
                        key={seat._id}
                        onClick={() => !seat.isBooked && !seat.isLocked && lockSeatForDate(seat._id)}
                        className={`rounded-xl border p-2 text-center text-xs font-medium transition hover:scale-[1.02] ${color} ${isSelected ? "ring-2 ring-offset-1 ring-slate-700" : ""}`}
                        disabled={seat.isBooked || seat.isLocked}
                      >
                        <p>#{seat.seatNumber}</p>
                        <p className="opacity-80">F{seat.floor || 1}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Floater Seats</p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
              {(availability?.seats || []).filter((s) => s.type === "floater").map((seat) => {
                const isMine = ownSeatIds.has(seat._id);
                const isSelected = selectedSeatId === seat._id;
                const color = isMine
                  ? "border-blue-600 bg-blue-600 text-white"
                  : seat.isBooked || seat.isLocked
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-amber-500 bg-amber-500 text-white";
                return (
                  <button
                    type="button"
                    key={seat._id}
                    onClick={() => !seat.isBooked && !seat.isLocked && lockSeatForDate(seat._id)}
                    className={`rounded-xl border p-2 text-center text-xs font-medium transition hover:scale-[1.02] ${color} ${isSelected ? "ring-2 ring-offset-1 ring-slate-700" : ""}`}
                    disabled={seat.isBooked || seat.isLocked}
                  >
                    <p>#{seat.seatNumber}</p>
                    <p className="opacity-90">floater</p>
                    <p className="opacity-80">F{seat.floor || 1}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cardBase}>
            <PanelTitle title="Mark Leave" subtitle="Bookings in leave range are auto released." />
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
            <input type="date" className={`${inputBase} mb-2`} value={leave.fromDate} onChange={(e) => setLeave((p) => ({ ...p, fromDate: e.target.value }))} />
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
            <input type="date" className={`${inputBase} mb-3`} value={leave.toDate} onChange={(e) => setLeave((p) => ({ ...p, toDate: e.target.value }))} />
            <button className={`${buttonBase} w-full bg-amber-600 hover:bg-amber-700`} onClick={markLeave} disabled={actionLoading}>
              Save Leave
            </button>
          </div>

          <div className={cardBase}>
            <PanelTitle title="Week Schedule" subtitle="Quick view of designated days and status." />
            <div className="space-y-2 text-sm">
              {week.map((d) => (
                <div key={d.date} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{formatDate(d.date)}</p>
                    <Badge label={d.designated ? "Designated" : "Non-designated"} tone={d.designated ? "green" : "amber"} />
                  </div>
                  <p className="text-slate-600">
                    Status: {d.booking ? `Booked seat ${d.booking.seat?.seatNumber}` : d.onLeave ? "On leave" : "Not booked"}
                  </p>
                  <div className="mt-1">
                    <Badge
                      label={d.booking ? `Booked seat ${d.booking.seat?.seatNumber}` : d.onLeave ? "On leave" : "Not booked"}
                      tone={getStatusTone(d.booking ? `Booked seat ${d.booking.seat?.seatNumber}` : d.onLeave ? "On leave" : "Not booked")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardBase}>
            <div className="mb-3 flex items-center justify-between">
              <PanelTitle title="My Bookings" subtitle="Upcoming reservations and quick cancel." />
              <Badge label={`${myBookings.length} upcoming`} tone="slate" />
            </div>
            <div className="max-h-72 space-y-2 overflow-auto text-sm">
              {myBookings.length === 0 && <p className="text-slate-500">No bookings yet.</p>}
              {myBookings.map((b) => (
                <div key={b._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                  <span className="text-slate-700">
                    {formatDate(b.date)} - Seat {b.seat?.seatNumber}
                  </span>
                  <button
                    className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                    onClick={() => cancelBooking(b._id)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={cardBase}>
            <PanelTitle title="Waitlist" subtitle="Pending requests when all seats are full." />
            {waitlist.length === 0 && <p className="text-sm text-slate-500">No pending waitlist entries.</p>}
            <div className="space-y-1 text-sm">
              {waitlist.map((w) => (
                <p key={w._id}>{w.date} - Pending</p>
              ))}
            </div>
          </div>
        </div>
      </div>
      {user.role === "admin" && <AdminPanel />}
      </div>
    </div>
  );
}

export default App;
