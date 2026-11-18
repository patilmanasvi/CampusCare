# College Lab IT Support – Teacher Portal (Frontend)

Teacher-facing web app for reporting and tracking lab PC problems. Teachers scan the QR sticker on a PC (or pick the PC from a list), see its details and any open requests, report a new issue or add to an existing one, follow progress, talk to the technician, verify repairs, and manage their profile.

**Scope:** Member 1 — Teacher Portal frontend only. The backend, PostgreSQL and authentication (Member 2), Jira Service Management integration (Member 3) and the admin dashboard / QR generation (Member 4) are separate. The browser only ever talks to the Express backend, never directly to PostgreSQL or Jira.

## Features

- Login with college email + password (mock for now), show/hide password, validation, session restored after refresh, protected pages, logout with confirmation
- Dashboard: greeting, quick actions, 5 summary cards, recent requests, recent notifications
- QR scanning with camera permission / no-camera / invalid-code handling, manual code entry, and QR links (`/scan-qr?token=…`)
- Manual PC selection: Block → Lab/Room → PC (searchable, loaded from the API)
- PC information screen with status warnings and the PC's active requests
- Issue form: categories and subcategories, urgency (icon + label, not colour alone), remarks, attachments (drag & drop, file picker, camera)
- Duplicate handling: add to an existing request, or submit a separate one
- Double-submit protection (in-flight guard + `Idempotency-Key` header)
- My Requests: search, filters (status, urgency, category, date), sort, pagination, table/card views
- Ticket details: progress timeline built from real events, attachments, technician updates, comments and replies
- **Internal technician notes are never shown** (`src/utils/visibility.js` only shows comments the backend marks as customer-visible)
- Repair verification: "working" / "still not working" (explanation required), optional comment and 1–5 rating, confirmation dialog. The frontend never changes a status itself.
- Notifications: header bell with unread count, notifications page, mark as read / mark all as read
- Profile: only the fields the backend allows can be edited; email is read-only; profile picture upload
- Light/dark mode saved in the browser with no flash on load, responsive down to phones, keyboard and screen-reader friendly

## Tech stack

React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · Axios · Lucide icons · @yudiel/react-qr-scanner

## Folder structure

```
src/
  assets/              college logo
  config/env.js        reads every VITE_ variable (the only file that does)
  constants/           ticket statuses, urgency, PC status, category icons
  context/             Auth, Theme, Toast, Notification providers
  hooks/               useApi, useAttachments, useUploadConfig, usePcDetails, …
  services/            API layer used by the UI (auth, dashboard, pc, ticket, upload, notification, profile, category)
    api.js             axios client
    endpoints.js       ALL backend paths (provisional – confirm with Member 2)
  mock/                mock backend used while the real API isn't ready
  components/
    common/            buttons, badges, dialogs, states, searchable select, …
    layout/            header, sidebar / mobile drawer, profile menu
    dashboard/  pc/  tickets/  notifications/  profile/
  pages/               Login, Dashboard, ScanQR, SelectPC, PcInfo, ReportIssue,
                       MyRequests, TicketDetails, Notifications, Profile, NotFound
  routes/              AppRoutes, ProtectedRoute
```

## Prerequisites

- Node.js 18 or newer (`node -v`)
- npm (comes with Node)

## Install and run

```bash
cd CampusCare/teacher-portal
npm install
cp .env.example .env.local     # then edit if needed
npm run dev                    # opens http://localhost:5173
```

Other commands:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

If you copied `node_modules` from another computer, delete it and run `npm install` again.

## Environment variables

Set these in `.env.local` (never commit it). Anything starting with `VITE_` ends up in the browser, so **never put passwords, API keys or Jira credentials here**.

| Variable | Default | What it does |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base URL of the Express backend. Get the real value from Member 2. |
| `VITE_USE_MOCK_API` | `true` | `true` uses the mock in `src/mock`; `false` calls the real backend. |
| `VITE_MOCK_LATENCY_MS` | `400` | Fake network delay in mock mode. |
| `VITE_NOTIFICATION_POLL_MS` | `60000` | How often the bell refreshes. `0` turns it off. |
| `VITE_COLLEGE_EMAIL_DOMAIN` | *(empty)* | If set (e.g. `college.edu`), login only accepts that email domain. |

Restart `npm run dev` after changing env values.

## Mock mode

With `VITE_USE_MOCK_API=true` (the default) the whole app works without a backend. Mock data is stored in the browser's localStorage, so it survives a refresh.

Demo accounts (mock only):

| Email | Password | Result |
|---|---|---|
| `teacher@college.edu` | `password123` | Main teacher with sample requests |
| `other.teacher@college.edu` | `password123` | A second teacher (to test privacy) |
| `pending.teacher@college.edu` | `password123` | "Waiting for administrator approval" |

Sample QR codes for manual entry on the Scan QR page:

| Code | PC | Notes |
|---|---|---|
| `qr-4a4t` | 522/A/12 | Has open requests from both teachers |
| `qr-6bgh` | 523/B/4 | Under maintenance (warning shown) |
| `qr-97c0` | 610/N/5 | Has a request waiting for verification |
| `qr-9vrw` | 610/N/9 | Reporting blocked by backend rule |
| `qr-doesnotexist` | — | Invalid QR message |

Good things to try: verify **LAB-1010**, reply on **LAB-1011** (technician asked for info), open **LAB-1013** to see the "no access" page, and submit a new ticket on 522/A/12 to see the duplicate dialog. About 20 seconds after you submit, the mock "acknowledges" the request and a notification appears.

To reset the mock data, run `campuscareResetMock()` in the browser console.

## Connecting to the real backend

1. Agree the API contract with Member 2 (and Member 3 for ticket and Jira behaviour).
2. Update paths in `src/services/endpoints.js`. The paths in it now are **placeholders, not the agreed API**.
3. If the response shapes differ, adjust only the matching `real…Service` object in `src/services/*Service.js`. Pages and components don't need to change.
4. Set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL` in `.env.local`, then restart.

Things to confirm with Member 2:

- **Auth:** httpOnly cookie or bearer token? The client supports both (`withCredentials` plus an optional `token` in the login response). Login error codes for pending or inactive accounts. A `/me`-style endpoint for restoring the session.
- **Error format:** the client reads `message`, `code` and `details` from error responses (`src/utils/errors.js`).
- **Lists:** `{ items, total, page, pageSize }` for My Requests and notifications.
- **Ticket shape:** `status`, `urgency`, `events[]` (`type`, `at`, `note`), `comments[]` with an explicit **customer-visible** flag (`visibility: 'PUBLIC'`), `canVerify`, `canComment`.
- **Uploads:** an upload-config endpoint (max size, max files, allowed types). Upload files first and send `attachmentIds`, or use multipart on create?
- **Duplicates:** the response of the duplicate check, and how much of another teacher's ticket may be shown (the UI shows no description or name).
- **Idempotency:** whether the backend honours the `Idempotency-Key` header.
- **Profile:** `editableFields` list and the avatar upload endpoint.
- **Status values:** the UI understands `SUBMITTED, ACKNOWLEDGED, IN_PROGRESS, WAITING_FOR_INFO, FIXED, AWAITING_VERIFICATION, CLOSED, REOPENED`. Unknown values still display safely.

## QR scanning notes

- Browsers only allow the camera on **HTTPS** or **localhost**. On a phone over your Wi-Fi (`npm run dev -- --host`), the camera will be blocked unless you serve over HTTPS. Manual code entry still works.
- The QR should hold a stable token or a URL containing it. The app reads the token from `?token=`, `?t=`, `?qr=` or the last part of the URL path (`src/utils/qr.js`). It never reads a display code like `522/A/12`, which can change. Confirm the exact format with Member 4.
- A QR URL like `https://<portal>/scan-qr?token=abc` opens straight to that PC (after login if needed).

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera doesn't start | Use localhost or HTTPS. Check the browser's site camera permission. Close other apps using the camera. |
| Blank page or build errors after pulling | Delete `node_modules`, then run `npm install`. |
| Changes to `.env.local` ignored | Restart `npm run dev`. |
| Strange mock data | Run `campuscareResetMock()` in the browser console. |
| "Can't reach the server" in real mode | Check `VITE_API_BASE_URL`, that the backend is running, and CORS (allow the portal origin with credentials). |
| Logged out immediately in real mode | The backend returned 401. Check the cookie or token setup with Member 2. |
