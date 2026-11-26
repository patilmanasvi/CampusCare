# CampusCare – College Lab IT Support System

CampusCare provides a teacher portal for reporting lab computer issues and an Express API backed by PostgreSQL. The current checked-in implementation contains the teacher portal and backend; Jira integration and the admin dashboard are planned member-owned components, not folders in this checkout.

## Project folders

| Path | Purpose |
|---|---|
| `teacher-portal/` | React + Vite teacher portal |
| `backend/` | Express API, PostgreSQL schema and seed data |
| `docs/` | Setup, API, database and handover documentation |

## Start locally

Open separate PowerShell terminals:

```powershell
cd .\backend
npm install
npm run dev
```

```powershell
cd .\teacher-portal
npm install
npm run dev
```

The backend defaults to `http://localhost:5000`; the Vite frontend defaults to `http://localhost:5173`. Configure PostgreSQL and the frontend real API mode as described in [the project handover](docs/PROJECT_HANDOVER.md).

## Documentation

- [Project handover: setup, API, database and requirements checklist](docs/PROJECT_HANDOVER.md)
- [Backend setup guide](docs/BACKEND_SETUP.md)
- [API contract](docs/API_CONTRACT.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Teacher portal guide](docs/TEACHER_PORTAL_README.md)
- [Backend guide](docs/BACKEND_README.md)
