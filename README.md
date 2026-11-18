# CampusCare – College Lab IT Support System

Teachers report problems with lab computers by scanning a QR code on the PC. Requests are tracked through Jira Service Management, and the lab team manages PCs from an admin dashboard.

## Repository layout

| Folder | What it is | Owner |
|---|---|---|
| [`teacher-portal/`](teacher-portal/) | Teacher Portal frontend (React + Vite + Tailwind) | Member 1 |
| `backend/` | Node.js + Express API, PostgreSQL, authentication | Member 2 |
| `jira-integration/` | Jira Service Management setup and sync | Member 3 |
| `admin-dashboard/` | Admin dashboard, PC inventory, QR generation | Member 4 |

Folders other than `teacher-portal/` will be added by their owners. Each folder has its own README with setup steps.

## Architecture

```
Teacher Portal / Admin Dashboard  →  Express backend  →  PostgreSQL
                                                     →  Jira Service Management
```

The frontends talk only to the Express backend, never directly to the database or Jira.

## Quick start (Teacher Portal)

```bash
cd teacher-portal
npm install
cp .env.example .env.local
npm run dev
```

See [`teacher-portal/README.md`](teacher-portal/README.md) for details.
