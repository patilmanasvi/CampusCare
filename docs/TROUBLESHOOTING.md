# CampusCare – Troubleshooting & Resolution Manual

**System:** CampusCare – College Lab IT Support System  
**Target Environment:** Windows 10 / 11 (PowerShell & Command Line)  
**Author:** Member 2 (Backend & Database Architecture)  
**Last Updated:** November 2026  

---

## 1. Quick Diagnostic Decision Tree

```text
Problem: Application fails to start or communicate
  │
  ├──► Backend crashes with "ECONNREFUSED 127.0.0.1:5432"
  │     └──► Solution: PostgreSQL service is stopped. (See Issue 1)
  │
  ├──► Backend crashes with "password authentication failed for user 'postgres'"
  │     └──► Solution: Mismatched password in backend/.env. (See Issue 2)
  │
  ├──► Error: "listen EADDRINUSE: address already in use :::5000"
  │     └──► Solution: Port 5000 is occupied by an orphaned process. (See Issue 3)
  │
  ├──► Browser console: "Cross-Origin Request Blocked (CORS)"
  │     └──► Solution: Check CLIENT_URL / FRONTEND_URL and withCredentials. (See Issue 4)
  │
  ├──► API requests return "401 Unauthorized"
  │     └──► Solution: Expired token or missing Bearer header. (See Issue 5)
  │
  ├──► File upload returns "400 Bad Request" or "413 Payload Too Large"
  │     └──► Solution: Multer limits or invalid MIME type. (See Issue 6)
  │
  └──► Frontend displays demo mock data instead of real database records
        └──► Solution: Set VITE_USE_MOCK_API=false in teacher-portal/.env.local. (See Issue 7)
```

---

## 2. Detailed Problem Resolutions

### Issue 1: PostgreSQL Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)
- **Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432` during backend startup or tests.
- **Root Cause:** The PostgreSQL Windows background service is not running or port 5432 is blocked.
- **Resolution Steps (PowerShell):**
  1. Check the status of the PostgreSQL service:
     ```powershell
     Get-Service -Name postgresql*
     ```
  2. If status is `Stopped`, start the service:
     ```powershell
     Get-Service -Name postgresql* | Start-Service
     ```
  3. Verify port 5432 is actively listening:
     ```powershell
     Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
     ```

---

### Issue 2: Password Authentication Failed for User "postgres"
- **Symptom:** `error: password authentication failed for user "postgres"`.
- **Root Cause:** The password in `CampusCare/backend/.env` (`DB_PASSWORD`) does not match the local PostgreSQL master password configured during installation.
- **Resolution Steps:**
  1. Open `CampusCare/backend/.env` in an editor.
  2. Update `DB_PASSWORD` to match your local PostgreSQL password:
     ```env
     DB_PASSWORD=your_actual_postgres_password
     ```
  3. If you forgot the password, open `pg_hba.conf` in your PostgreSQL data directory (e.g., `C:\Program Files\PostgreSQL\19\data\pg_hba.conf`), temporarily set local IPv4 connection method from `scram-sha-256` or `md5` to `trust`, reload the service, and reset the password with `ALTER USER postgres PASSWORD 'newpassword';`.

---

### Issue 3: Port 5000 or 5173 Already in Use (`EADDRINUSE`)
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::5000` or Vite warning `Port 5173 is in use, trying another one...`.
- **Root Cause:** A previous instance of Node.js did not terminate cleanly.
- **Resolution Steps (PowerShell):**
  1. Identify the process ID (PID) locking port 5000:
     ```powershell
     Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
     ```
  2. Terminate the blocking process:
     ```powershell
     Stop-Process -Id <PID> -Force
     ```
  3. For Vite (Port 5173):
     ```powershell
     Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object OwningProcess
     Stop-Process -Id <PID> -Force
     ```

---

### Issue 4: Cross-Origin Resource Sharing (CORS) Blocked
- **Symptom:** Browser console displays `Access to XMLHttpRequest at 'http://localhost:5000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy`.
- **Root Cause:**
  1. The backend `.env` has an incorrect `FRONTEND_URL` or `CLIENT_URL`.
  2. The frontend is running on an unexpected port (e.g. `5174` instead of `5173`).
  3. Axios was dispatched without `withCredentials: true`.
- **Resolution Steps:**
  1. Check the Vite console to confirm the exact frontend port (typically `http://localhost:5173`).
  2. In `CampusCare/backend/.env`, ensure:
     ```env
     FRONTEND_URL=http://localhost:5173
     CLIENT_URL=http://localhost:5173
     ```
  3. In `CampusCare/teacher-portal/src/services/api.js`, verify `withCredentials: true` is enabled.
  4. Restart the backend server.

---

### Issue 5: 401 Unauthorized / Expired JWT Session
- **Symptom:** API returns `{"success": false, "message": "Authentication required. Please log in.", "code": "UNAUTHORIZED"}`.
- **Root Cause:**
  1. The JWT token has expired (default: 24h).
  2. The client is sending requests without the `Authorization: Bearer <TOKEN>` header or HTTP-only cookie.
  3. `JWT_SECRET` was changed in `.env` while existing tokens remained in localStorage.
- **Resolution Steps:**
  1. Log out from the Teacher Portal and log in again with `teacher@college.edu` / `password123`.
  2. Clear browser `localStorage` and cookies:
     - In Chrome/Edge DevTools (F12) → Application → Storage → **Clear site data**.
  3. Confirm the login response returns a fresh `token`.

---

### Issue 6: Multer File Upload Failures
- **Symptom:** File upload fails with `400 Bad Request` or `413 Payload Too Large`.
- **Root Cause:**
  1. File exceeds the 10MB institutional size limit (`MAX_FILE_SIZE_BYTES=10485760`).
  2. File extension or MIME type is not permitted (e.g. `.exe`, `.bat`, `.sh`). Permitted formats: `.jpg`, `.jpeg`, `.png`, `.pdf`, `.txt`, `.log`.
  3. The `uploads/` folder does not exist or lacks write permissions.
- **Resolution Steps:**
  1. Ensure the upload file is under 10MB and is a diagnostic screenshot (`.png`, `.jpg`) or log (`.txt`, `.log`, `.pdf`).
  2. Confirm the directory exists:
     ```powershell
     if (!(Test-Path "C:\Users\Riya G\Desktop\cc\CampusCare\backend\uploads")) {
         New-Item -ItemType Directory -Path "C:\Users\Riya G\Desktop\cc\CampusCare\backend\uploads"
     }
     ```

---

### Issue 7: Frontend Displays Mock Data Instead of Real PostgreSQL Data
- **Symptom:** Submitting a ticket succeeds on screen, but no new record appears in the PostgreSQL database.
- **Root Cause:** `VITE_USE_MOCK_API` is set to `true` in `CampusCare/teacher-portal/.env.local`.
- **Resolution Steps:**
  1. Open `CampusCare/teacher-portal/.env.local`.
  2. Change line 7:
     ```env
     VITE_USE_MOCK_API=false
     ```
  3. Restart Vite (`Ctrl+C` in the frontend terminal, then run `npm run dev`).

---

### Issue 8: PowerShell Script Execution Policy Error
- **Symptom:** `File ...\verify-auth.ps1 cannot be loaded because running scripts is disabled on this system`.
- **Root Cause:** Windows PowerShell default execution policy is `Restricted`.
- **Resolution Steps:**
  Run the following command in your current PowerShell session (requires no admin privileges):
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
  ```

---

### Issue 9: Complete Database Reset & Reseed
If data becomes inconsistent during testing, execute this one-liner in PowerShell to completely reset and reseed the database:

```powershell
cd "C:\Users\Riya G\Desktop\cc\CampusCare\backend"
psql -U postgres -d campuscare_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -U postgres -d campuscare_db -f "src/database/schema.sql"
psql -U postgres -d campuscare_db -f "src/database/seeds.sql"
```
