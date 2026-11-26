# CampusCare – Complete Backend & Frontend Setup Guide

**System:** CampusCare – College Lab IT Support System  
**Target Environment:** Windows 10 / 11 (PowerShell 5.1 / 7+)  
**Architecture:** Node.js Express Backend (Port 5000) + React Vite Frontend (Port 5173) + PostgreSQL Database  
**Author:** Member 2 (Backend & Database Architecture)  
**Last Updated:** November 2026  

---

## 1. System Requirements & Prerequisites

Ensure the following runtimes and tools are installed before setting up the application:

| Tool | Minimum Version | Verification Command | Purpose |
|---|---|---|---|
| **Node.js** | v18.0.0+ | `node -v` | JavaScript runtime environment |
| **npm** | v9.0.0+ | `npm -v` | Package manager |
| **PostgreSQL** | v14.0+ (14 to 19) | `psql -V` | Relational database management system |
| **Git** | v2.30+ | `git --version` | Version control |

> [!TIP]
> If running in Windows PowerShell, execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` if script execution warnings appear.

---

## 2. Directory Structure Overview

The project is structured into distinct, modular directories:

```text
C:\Users\...\CampusCare\
├── backend\                 <-- Express.js REST API & Database migrations (Member 2)
│   ├── src\
│   │   ├── config\          <-- Environment & database pool configurations
│   │   ├── controllers\     <-- Request orchestration & HTTP handlers
│   │   ├── database\        <-- schema.sql, seeds.sql
│   │   ├── middleware\      <-- Auth, role, validation, upload middleware
│   │   ├── repositories\    <-- PostgreSQL parameterized SQL queries
│   │   ├── routes\          <-- Express route definitions
│   │   ├── services\        <-- Core business logic & transactions
│   │   └── validators\      <-- Express-validator rules
│   ├── tests\               <-- PowerShell and HTTP API verification files
│   ├── uploads\             <-- Secure diagnostic attachments storage
│   ├── .env                 <-- Backend environment configuration
│   └── package.json
├── teacher-portal\          <-- React + Vite Teacher Portal (Member 1)
│   ├── src\                 <-- UI components, contexts, and API services
│   ├── .env.local           <-- Frontend local environment configuration
│   └── package.json
└── docs\                    <-- Architecture, contracts & setup specifications
```

---

## 3. Step-by-Step Installation & Setup

### Step 3.1: Configure Backend Environment Variables

1. Open PowerShell and navigate to the backend folder:
   ```powershell
   cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
   ```

2. Confirm that `.env` exists (or copy from `.env.example`):
   ```powershell
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   ```

3. Review the environment configuration inside `.env`:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   CLIENT_URL=http://localhost:5173

   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=campuscare_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_SSL=false
   DB_MAX_CONNECTIONS=20
   DB_IDLE_TIMEOUT_MS=30000
   DB_CONNECTION_TIMEOUT_MS=5000

   # JWT & Cookie Session Security
   JWT_SECRET=super_secret_jwt_campuscare_key_change_in_production
   JWT_EXPIRES_IN=24h
   COOKIE_NAME=campuscare_token
   COOKIE_SECRET=super_secret_cookie_signing_key_change_in_production
   COOKIE_SECURE=false
   COOKIE_SAME_SITE=lax

   # Rate Limiting & Storage
   LOGIN_RATE_LIMIT_WINDOW_MS=900000
   LOGIN_RATE_LIMIT_MAX=10
   UPLOAD_DIR=uploads/
   MAX_FILE_SIZE_BYTES=10485760
   ```

---

### Step 3.2: Initialize the PostgreSQL Database

1. Ensure the PostgreSQL Windows service is running:
   ```powershell
   Get-Service -Name postgresql* | Start-Service
   ```

2. Create the `campuscare_db` database using `createdb` or `psql`:
   ```powershell
   # Using PostgreSQL createdb command
   createdb -U postgres -h localhost -p 5432 campuscare_db
   ```
   *(Enter your PostgreSQL password when prompted)*

3. Run the DDL schema migration:
   ```powershell
   psql -U postgres -d campuscare_db -f "src/database/schema.sql"
   ```

4. Populate initial seeds (roles, users, blocks, labs, PCs, issue categories):
   ```powershell
   psql -U postgres -d campuscare_db -f "src/database/seeds.sql"
   ```

5. Verify that tables and records exist:
   ```powershell
   psql -U postgres -d campuscare_db -c "SELECT count(*) AS total_users FROM users;"
   psql -U postgres -d campuscare_db -c "SELECT count(*) AS total_pcs FROM pcs;"
   ```

---

### Step 3.3: Install Backend Dependencies & Start Server

1. Install npm packages:
   ```powershell
   cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
   npm install
   ```

2. Start the Express backend in development mode (with automatic reload):
   ```powershell
   npm run dev
   ```

   **Expected Output:**
   ```text
   [nodemon] starting `node src/server.js`
   ╔═══════════════════════════════════════════════════════════╗
   ║  CampusCare IT Support Backend Server Started Successfully ║
   ║  Port: 5000 | Environment: development                   ║
   ║  Database: campuscare_db (Connected)                      ║
   ║  Frontend URL: http://localhost:5173                      ║
   ╚═══════════════════════════════════════════════════════════╝
   ```

3. Test backend health check from another PowerShell window:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/health"
   ```
   **Expected Response:**
   ```json
   {
     "status": "UP",
     "timestamp": "2026-11-25T...",
     "database": "CONNECTED"
   }
   ```

---

### Step 3.4: Configure & Start Frontend (Teacher Portal)

1. Open a new PowerShell terminal and navigate to the frontend directory:
   ```powershell
   cd "C:\Users\Riya G\Desktop\cc\CampusCare\teacher-portal"
   ```

2. Configure `.env.local` to connect to the real Express backend:
   ```powershell
   @"
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_USE_MOCK_API=false
   VITE_NOTIFICATION_POLL_MS=60000
   VITE_COLLEGE_EMAIL_DOMAIN=
   "@ | Out-File -FilePath .env.local -Encoding utf8
   ```

3. Install frontend dependencies (if not already installed):
   ```powershell
   npm install
   ```

4. Launch the Vite development server:
   ```powershell
   npm run dev
   ```

   **Expected Output:**
   ```text
     VITE v5.x.x  ready in 320 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
     ➜  press h + enter to show help
   ```

5. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

---

## 4. Pre-Seeded Institutional Test Accounts

The database comes pre-seeded with verified test accounts:

| Role | Email Address | Password | Account Purpose |
|---|---|---|---|
| **Teacher (Faculty)** | `teacher@college.edu` | `password123` | Report defective lab PCs, scan QR codes, verify repairs |
| **Teacher (Faculty)** | `sharma@college.edu` | `password123` | Secondary faculty member for isolation testing |
| **IT Administrator** | `admin@college.edu` | `password123` | Lab inventory management, user profiles, Jira sync |
| **Lab Technician** | `tech@college.edu` | `password123` | Inspect hardware, service computers, resolve tickets |

---

## 5. End-to-End Verification Flow

Follow this 5-minute smoke test to verify full end-to-end integration:

1. **Faculty Login:**
   - Go to `http://localhost:5173`.
   - Enter `teacher@college.edu` / `password123`.
   - Click **Log In**.
   - Confirm successful redirection to the Teacher Dashboard.

2. **Verify Database Dashboard Statistics:**
   - Confirm the dashboard displays actual statistics from PostgreSQL:
     - Total Requests: dynamically calculated.
     - Recent Tickets list loaded from database.

3. **QR Code PC Lookup:**
   - Click **Report Defect**.
   - Test QR scanner with token: `QR-ROOM522-PC01-TOKEN`.
   - Notice immediate auto-fill of:
     - Building: **Block A (Engineering Wing)**
     - Lab: **Advanced Software Engineering Lab (Room 522)**
     - PC Position: **522/A/1**

4. **Submit Support Ticket:**
   - Select Category: **Power Issues**.
   - Select Subcategory: **PC Not Powering On**.
   - Urgency: **High**.
   - Description: *"Power indicator LED blinks once then PC fails to boot."*
   - Click **Submit Ticket**.
   - Observe immediate generation of ticket ID (e.g. `LAB-1001`).

5. **Verify Lifecycle & Database Persistence:**
   - Go to **My Tickets**.
   - Click on `LAB-1001`.
   - Post a comment: *"Please inspect SMPS."*
   - Verify timeline event is appended and visible immediately.
   - Run in PowerShell:
     ```powershell
     psql -U postgres -d campuscare_db -c "SELECT id, status, urgency, description FROM tickets WHERE id = 'LAB-1001';"
     ```
     Confirm the database record exists with exact content.

---

## 6. Switching Between Mock and Real API Modes

The frontend architecture allows seamless switching:

- **Real Backend Mode:** Set `VITE_USE_MOCK_API=false` in `teacher-portal/.env.local`. Requests hit `http://localhost:5000/api`.
- **Mock Demo Mode:** Set `VITE_USE_MOCK_API=true` in `teacher-portal/.env.local`. Useful for offline presentations when PostgreSQL is not running.
- **Important:** Restart the Vite development server (`Ctrl+C` then `npm run dev`) whenever `.env.local` is modified.
