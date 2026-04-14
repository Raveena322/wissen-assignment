# Seat Booking System (MERN)

Hybrid-office seat booking platform with fixed + floater seats, squad rotation rules, leave handling, realtime availability, waitlist, and admin operations.

## Tech Stack

- Frontend: React, Tailwind CSS, Axios, Socket.IO Client
- Backend: Node.js, Express.js, JWT, Socket.IO
- Database: MongoDB Atlas + Mongoose

## Key Business Logic Implemented

- 50 total seats:
  - 40 fixed (squad mapped)
  - 10 floater
- 10 squads, 8 users per squad (batch split 4/4)
- 2-week designated-day rotation:
  - Batch 1: Week 1 Mon-Wed, Week 2 Thu-Fri
  - Batch 2: Week 1 Thu-Fri, Week 2 Mon-Wed
- Booking rules:
  - only Mon-Fri
  - holiday blocked
  - after 3 PM -> only next valid non-holiday working day
  - designated day: squad fixed seat first
  - non-designated day: floater first, then unused fixed
  - max 5 bookings per 2-week cycle
- Leave rules:
  - leave range allowed
  - overlapping leave rejected
  - existing bookings in leave range auto-cancelled

## Priority Enhancements Added

### 1) Concurrency Control
- Unique booking constraints on:
  - `user + date`
  - `seat + date`
- Race-safe duplicate booking handling (`E11000`) in service layer.

### 2) Seat Locking
- Seat lock API with TTL lock expiration (3 minutes).
- Locked seat is unavailable for other users.
- Auto-release via MongoDB TTL index.

### 3) Admin Panel (API + UI)
- Add/remove holidays
- View all bookings (paginated)
- Cancel any booking
- View/manage users and roles
- Basic analytics

### 4) Proper Time Handling
- 3 PM cutoff handled in UTC-based server logic to reduce timezone bugs.

### 5) Notifications
- In-app action feedback for book/cancel/edit/leave/lock flows.

### 6) Realtime Updates
- Socket.IO event `seat:update`
- Frontend auto-refreshes seat availability when bookings/locks change.

### 7) Waitlist
- Auto-add to waitlist when no seats available.
- Waitlist re-processing after cancellations and leave-triggered releases.

### 8) Booking Edit
- User can modify booking via update API and dashboard action.

### 9) Better Seat Map UI
- Seat selection + lock
- Fixed/floater availability badges
- Floor labels on seats
- Squad-wise grouped fixed seats
- Monthly/weekly navigation in booking area

### 10) Mobile Responsive
- Responsive dashboard cards and booking controls.

### 10.1) Dark Mode
- Dashboard light/dark toggle in header

### 11) Seat Preference
- Last-used seat stored as preferred seat and reused if available.

### 12) Analytics
- Usage percentage and peak booking days endpoint in admin APIs.
- Squad attendance
- Seat heatmap (top used seats)

### 13) API Optimization
- Pagination for admin list APIs.

### 14) Multi-floor Support (Base)
- `floor` field added to seats and exposed in UI/API.

## Not Yet Implemented

- Email booking confirmations
- QR check-in flow

## Project Structure

- `backend/` - APIs, auth, scheduling engine, realtime server
- `frontend/` - React dashboard + admin UI

## Setup

### Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Set in `backend/.env`:
- `MONGO_URI`
- `JWT_SECRET`
- `PORT` (default 5000)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Demo Accounts

- User: `s1u1@demo.com` / `password123`
- Admin: `admin@demo.com` / `password123`

## Seeded Data

Seed runs on backend startup and creates:
- 50 seats (`1-40` fixed, `41-50` floater)
- floor allocation sample (floor 1 and 2)
- users for all squads + one admin user
- sample holidays

> Note: requirement mentions both 8 members and 5-5 split. Since that is inconsistent, implementation uses 8 members with 4-4 batch split.

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Booking
- `POST /api/bookings` - create booking (supports optional `seatId`)
- `POST /api/bookings/lock` - lock seat for 3 minutes
- `PUT /api/bookings/:id` - edit booking
- `DELETE /api/bookings/:id` - cancel own booking
- `GET /api/bookings/my`
- `GET /api/bookings/waitlist/my`
- `GET /api/bookings/availability?date=YYYY-MM-DD`
- `GET /api/bookings/week`
- `GET /api/bookings/cycle-summary?date=YYYY-MM-DD`

### Meta
- `GET /api/meta/me`
- `GET /api/meta/holidays`
- `POST /api/meta/leaves`
- `GET /api/meta/leaves`

### Admin
- `GET /api/admin/bookings?page=1&limit=20`
- `DELETE /api/admin/bookings/:id`
- `GET /api/admin/users?page=1&limit=20`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/holidays`
- `DELETE /api/admin/holidays/:date`
- `GET /api/admin/analytics`

## Realtime Contract

- Event: `seat:update`
- Payload example:
  - `{ "date": "2026-04-15" }`

## Verification (Smoke Test)

Verified via API/build checks:

- Backend health: `GET /api/health` returns `{"ok":true}`
- User login works (`s1u1@demo.com`)
- Admin login works (`admin@demo.com`)
- Seat lock works (`POST /api/bookings/lock` -> "Seat locked for 3 minutes")
- Waitlist API reachable (`GET /api/bookings/waitlist/my`)
- Admin analytics returns:
  - `usagePercent`
  - `peakDays`
  - `squadAttendance`
  - `seatHeatmap`
- Frontend build passes: `npm run build`

If your database existed before admin seeding was added, ensure admin account exists with role `admin`:

- Email: `admin@demo.com`
- Password: `password123`

## Build

```bash
cd frontend
npm run build
```
