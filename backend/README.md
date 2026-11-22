# CampusCare Backend API (Node.js + Express + PostgreSQL)

**Author:** Member 2 (Backend & Database Engineer)  
**System:** CampusCare – College Lab IT Support System  

This service is the centralized REST API for CampusCare. It coordinates authentication, laboratory computer management, issue ticketing, Jira Service Management synchronization, and in-app notifications.

---

## 1. Directory Structure

```
backend/
├── .env.example                # Template for environment configuration
├── .env                        # Local active configuration (credentials)
├── .gitignore                  # Git ignore rules for node_modules, logs, .env
├── package.json                # Project dependencies, scripts, and metadata
├── README.md                   # Backend documentation and developer manual
└── src/
    ├── app.js                  # Express app setup (middleware, CORS, routes)
    ├── server.js               # HTTP server entrypoint & graceful shutdown
    ├── config/
    │   ├── db.js               # PostgreSQL connection pool & health checks
    │   └── env.js              # Environment variable loader and defaults
    ├── controllers/
    │   └── healthController.js # Health check & system diagnostics handler
    ├── database/
    │   ├── schema.sql          # Complete DDL SQL schema (15 tables, constraints, indexes)
    │   ├── seeds.sql           # Master institutional and development seed data
    │   ├── DATA_DICTIONARY.md  # Detailed column-by-column database reference
    │   └── ER_DIAGRAM.md       # Visual Entity-Relationship diagram (Mermaid)
    ├── middleware/
    │   ├── errorHandler.js     # Centralized error handler
    │   └── notFoundHandler.js  # 404 resource not found handler
    ├── routes/
    │   ├── apiRoutes.js        # Main API router (/api)
    │   └── healthRoutes.js     # Health check router (/api/health)
    └── services/
        └── index.js            # Services module registry
```

---

## 2. Dependencies & Purpose

### Production Dependencies
| Package | Version | Purpose in CampusCare |
|---|---|---|
| `express` | `^4.19.2` | Core web framework for building RESTful endpoints and routing HTTP requests. |
| `pg` | `^8.11.5` | Official PostgreSQL client for Node.js, providing connection pooling, parameterized queries, and transaction management. |
| `dotenv` | `^16.4.5` | Loads environment variables from `.env` into `process.env` to keep secrets secure. |
| `cors` | `^2.8.5` | Configures Cross-Origin Resource Sharing so React frontends (Teacher Portal :5173, Admin Dashboard) can call the API securely. |
| `bcryptjs` | `^2.4.3` | High-security, pure-JavaScript password hashing library. Ensures user passwords are encrypted with salt rounds and never stored as plain text. |
| `jsonwebtoken` | `^9.0.2` | Issues and verifies JSON Web Tokens (JWT) for stateless authentication and role-based authorization headers. |
| `express-validator` | `^7.0.1` | Middleware for strict validation and sanitization of incoming JSON payloads (e.g. ticket submissions, user logins). |
| `multer` | `^1.4.5-lts.1` | Multipart form-data parser for processing diagnostic screenshot and video file uploads. |
| `helmet` | `^7.1.0` | Security middleware that sets essential HTTP security headers (CSP, HSTS, X-Content-Type-Options) to protect against common web vulnerabilities. |

### Development & Testing Dependencies
| Package | Version | Purpose |
|---|---|---|
| `nodemon` | `^3.1.0` | Automatically restarts the Node server upon code changes during local development. |
| `jest` | `^29.7.0` | Testing framework for unit and integration testing. |
| `supertest` | `^6.3.4` | HTTP assertion library for testing Express endpoints without manual requests. |

---

## 3. Quick Start Guide (Windows / PowerShell)

### Step 1: Open Terminal in the `backend` folder
```powershell
cd "C:\Users\Riya G\Desktop\CampusCare\CampusCare\backend"
```

### Step 2: Install Node.js Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` (if not already done) and configure your PostgreSQL superuser password:
```powershell
# Open .env in VS Code
code .env
```
Ensure `DB_PASSWORD` matches the password specified during PostgreSQL installation.

### Step 4: Run Database Migration and Seed
Using PostgreSQL's `psql`:
```powershell
& "C:\Program Files\PostgreSQL\19\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE campuscare_db;"
& "C:\Program Files\PostgreSQL\19\bin\psql.exe" -U postgres -h localhost -d campuscare_db -f src\database\schema.sql
& "C:\Program Files\PostgreSQL\19\bin\psql.exe" -U postgres -h localhost -d campuscare_db -f src\database\seeds.sql
```

### Step 5: Start the Development Server
```powershell
npm run dev
```

### Step 6: Test the Health Check
Open your browser or run:
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/health
```
You should see:
```json
{
  "status": "UP",
  "service": "CampusCare Backend API",
  "checks": {
    "server": { "status": "UP" },
    "database": {
      "status": "UP",
      "engine": "PostgreSQL",
      "databaseName": "campuscare_db"
    }
  }
}
```
