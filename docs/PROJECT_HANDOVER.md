# CampusCare Project Handover

This guide describes the files currently checked in. The active implementation is a React teacher portal plus an Express/PostgreSQL API. The admin dashboard and Jira integration are referenced as other members' work, but their folders are not in this project checkout.

## 1. Folder map

| Path | Purpose |
|---|---|
| `teacher-portal/src/pages/` | Portal screens such as login, dashboard, PC lookup and issue reporting |
| `teacher-portal/src/components/` | Reusable UI, ticket, PC, profile and notification components |
| `teacher-portal/src/services/` | API client and feature service modules |
| `teacher-portal/src/mock/` | Local mock data and mock service implementations |
| `teacher-portal/src/config/env.js` | API URL and mock/real mode settings |
| `backend/src/server.js`, `backend/src/app.js` | HTTP server startup and Express middleware setup |
| `backend/src/routes/` | API route definitions |
| `backend/src/controllers/` | HTTP request handlers |
| `backend/src/services/`, `repositories/` | Business logic and PostgreSQL queries |
| `backend/src/middleware/`, `validators/` | Authentication, role checks, uploads and input validation |
| `backend/src/config/db.js`, `env.js` | PostgreSQL pool and environment configuration |
| `backend/src/database/schema.sql`, `seeds.sql` | Database table definitions and initial/sample data |
| `backend/tests/` | PowerShell verification scripts, HTTP request examples and Thunder Client collections |

## 2. PostgreSQL and schema

PostgreSQL stores the database in its configured server data directory (managed by PostgreSQL). This application connects to database `campuscare_db` by default; it does not store database files inside this repository. Connection values are read from `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). Defaults are in `backend/src/config/env.js`.

The SQL files are `backend/src/database/schema.sql` and `backend/src/database/seeds.sql`. Create the database and run the files from PowerShell:

```powershell
cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
createdb -U postgres -h localhost -p 5432 campuscare_db
psql -U postgres -d campuscare_db -f .\src\database\schema.sql
psql -U postgres -d campuscare_db -f .\src\database\seeds.sql
```

In pgAdmin, register/connect to the local PostgreSQL server, right-click **Databases → Create → Database**, name it `campuscare_db`, then select it and use **Tools → Query Tool** to open and execute `schema.sql`, followed by `seeds.sql`. Expand **Schemas → public → Tables** and refresh to view the created tables. You can inspect rows with **View/Edit Data → All Rows** or run a `SELECT` in Query Tool.

The checked-in schema defines: `roles`, `users`, `blocks`, `labs`, `pcs`, `ticket_categories`, `tickets`, `ticket_events`, `ticket_comments`, `ticket_information`, `ticket_links`, `repair_records`, `sync_events`, `attachments`, and `notifications`. It includes foreign keys, uniqueness/check constraints, indexes, and timestamp triggers. No live database connection was available during this documentation review, so this verifies the checked-in SQL structure rather than a running database instance.

For a database created before the attachment change, run the migration after the schema exists:

```powershell
psql -U postgres -d campuscare_db -f .\src\database\migrations\001_allow_unlinked_attachments.sql
```

## 3. Run both servers

Prepare `backend/.env` with PostgreSQL credentials (or use the defaults in `backend/src/config/env.js`) and ensure PostgreSQL is running. In two PowerShell terminals:

```powershell
cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
npm install
npm run dev
```

```powershell
cd "C:\Users\Riya G\Desktop\cc\CampusCare\teacher-portal"
npm install
npm run dev
```

The backend listens on port `5000` by default. Vite listens on `5173`. Backend configuration accepts `PORT` and `CLIENT_URL`/`FRONTEND_URL`.

## 4. Frontend to backend flow

The shared Axios client is `teacher-portal/src/services/api.js`. Its base URL comes from `VITE_API_BASE_URL`; the default is `http://localhost:5000/api`. To override it for local setup, set these values in `teacher-portal/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_API=false
```

Restart Vite after changing environment settings. `VITE_USE_MOCK_API` defaults to `false`; when true, feature services use `teacher-portal/src/mock/`. The default base URL is `http://localhost:5000/api`. In real mode, services call the shared client, which attaches a stored bearer token and sends credentials. The request flow is browser → Vite frontend service → Express `/api` route → controller/service/repository → PostgreSQL; JSON response returns through the same path. The frontend does not connect directly to PostgreSQL.

## 5. Health and API verification

Check server and database connectivity:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

`200` with status `UP` means both API and database check passed; `503` means the API is up but database connectivity failed. A basic API response is available at `http://localhost:5000/api/`.

PowerShell test scripts (run while the server and database are available):

```powershell
cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
.\tests\verify-auth.ps1
.\tests\verify-core-apis.ps1
.\tests\verify-phase4.ps1
```

For a single endpoint request, for example health, use `Invoke-RestMethod` as above. The `.http` request examples and Thunder Client collections live under `backend/tests/`. In Thunder Client, import a `thunder-collection_*.json` file, set the base URL to `http://localhost:5000/api`, and log in first for protected routes.

To confirm a ticket was persisted, submit a real-mode ticket in the portal and query PostgreSQL:

```powershell
psql -U postgres -d campuscare_db -c "SELECT id, status, urgency, description FROM tickets ORDER BY created_at DESC LIMIT 5;"
```

## 6. Implemented API routes

Protected routes require a bearer token or configured session cookie unless noted. Teacher-compatible aliases are mounted under `/api/teacher/...` for tickets, dashboard, profile and notifications.

| Method and path | Purpose |
|---|---|
| `GET /api/health` | API and PostgreSQL health check (public) |
| `GET /api/` | API route overview (public) |
| `POST /api/auth/login` | Validate credentials, rate limited login |
| `POST /api/auth/logout`, `GET /api/auth/me` | End session; get current user |
| `GET /api/blocks`, `/api/labs` | List locations |
| `GET /api/locations/blocks`, `/api/locations/blocks/:blockId/rooms`, `/api/locations/rooms/:roomId/pcs` | Frontend-compatible location and PC lookup |
| `GET /api/pcs`, `/api/pcs/:id`, `/api/pcs/qr/:token`, `/api/pcs/lookup/:token` | List/detail/QR lookup for computers |
| `GET /api/pcs/:id/active-tickets` | Active tickets for a computer |
| `GET /api/categories`, `/api/issue-categories` | Issue categories and subcategories |
| `GET /api/tickets`, `/api/tickets/my` | Current user's ticket list |
| `POST /api/tickets` | Report an issue/create a ticket |
| `GET /api/tickets/check-duplicate`, `POST /api/tickets/duplicate-check` | Check for similar active issues |
| `GET /api/tickets/:id`, `GET /api/tickets/:id/timeline` | Ticket details and history |
| `POST /api/tickets/:id/comments`, `/information`, `/verification`, `/feedback` | Add comment/info or submit repair verification/feedback |
| `PATCH /api/tickets/:id/jira-sync` | Staff-only inbound ticket sync handler |
| `GET /api/dashboard/summary`, `/recent-requests` | Dashboard totals and recent requests |
| `GET /api/profile`, `PATCH /api/profile`, `POST /api/profile/avatar` | Read/update profile and upload avatar |
| `GET /api/notifications`, `/unread-count`; `PATCH` or `POST /api/notifications/read-all`; `PATCH` or `POST /api/notifications/:id/read` | List and mark notifications read |
| `GET /api/uploads/config`, `POST /api/uploads`, `GET /api/uploads/:id` | Upload configuration, authenticated upload and download |

Route definitions are in `backend/src/routes/`; `backend/src/routes/apiRoutes.js` also defines the aliases. The exact request/response contract is in [API_CONTRACT.md](API_CONTRACT.md).

## 7. Member 2 requirements checklist

Assessment is based on `backend/src/`, `backend/src/database/schema.sql`, and the frontend service configuration. “Completed” means the implementation is present in the checked-in code; it does not imply production deployment.

| Requirement | Status | Evidence and limits |
|---|---|---|
| Express.js and PostgreSQL setup | **Completed** | Express app/server and `pg` pool with environment-based config are present. |
| Tables for users, labs, PCs, reports/tickets, ticket links, repair records and sync events | **Completed** | `schema.sql` defines all named tables (`tickets` is the report/ticket record) with related roles/blocks/categories and other support tables. |
| APIs for authentication, PC lookup, issue reporting and ticket history | **Completed** | Auth, QR/PC, ticket create/list/detail/timeline routes are implemented. |
| Validation, role-based access and security | **Completed** | Route validators cover ticket/profile/PC/dashboard/notification inputs; owner/staff checks protect ticket mutations; CORS is allowlisted, private attachments require authenticated ownership, and production requires configured signing secrets. |
| Data consistency and secure file handling | **Completed** | SQL constraints/FKs/indexes and parameterized queries are present. Uploads verify declared type against file signatures, use server filenames, prevent path traversal, and clean up failed writes. Attachment IDs must belong to the uploader and are linked in the same transaction as the ticket/comment. Existing databases need the included nullable-ticket migration. |
| Frontend-backend integration | **Completed** | The default calls `http://localhost:5000/api`; endpoint paths match backend routes/aliases, and attachment/avatar URLs resolve to the backend origin. Set environment overrides only for another deployment. |

## 8. Troubleshooting and team follow-up

- **Health returns `503`:** confirm the PostgreSQL service is running, database exists, and `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `backend/.env` match it. Run the schema and seeds if needed.
- **Frontend cannot reach API:** check backend is on port `5000`, set `VITE_API_BASE_URL=http://localhost:5000/api`, and restart Vite. Check `CLIENT_URL`/`FRONTEND_URL` when changing browser origin.
- **401 responses:** log in first; check that the stored bearer token is sent and that the user exists and is active.
- **Protected endpoint returns 403:** check the user role and route authorization.
- **Upload rejected:** supported types are JPEG, PNG, WebP, PDF and text/log; max size defaults to 10 MB and max count is 5. Check that runtime `UPLOAD_DIR` is writable.
- **Port already in use:** stop the existing process or set `PORT` for backend. Vite's port is configured in `teacher-portal/vite.config.js`.
- **Seed/demo credentials fail:** confirm `seeds.sql` has been run and check its current seed data; avoid assuming local database contents match the example accounts in older guides.

### Pending coordination

- **Member 1 (frontend):** align `teacher-portal/src/services/endpoints.js` paths, payloads and response shapes with Member 2's API contract; verify each real-mode workflow.
- **Member 2 (backend):** confirm role policy for each protected route, validate SQL setup against the team's target PostgreSQL instance, and maintain the API contract and verification scripts.
- **Member 2 (backend):** apply `backend/src/database/migrations/001_allow_unlinked_attachments.sql` to databases created before the attachment flow change.
- **Member 3 (Jira integration):** coordinate Jira credentials/configuration, sync ownership and behavior for `jira_issue_*` and `sync_events`; integration implementation is not present in this checkout.
- **Member 4 (admin dashboard):** coordinate PC inventory/asset fields and administrator workflows; dashboard implementation is not present in this checkout.
