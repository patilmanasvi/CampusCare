# CampusCare - Complete API Contract Specification

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api`  
**Authentication Scheme:** Dual Support — Bearer Token (`Authorization: Bearer <JWT>`) and Secure HTTP-Only Cookie (`campuscare_token`).  
**CORS Configuration:** Enabled with `credentials: true` for origin `http://localhost:5173`.

---

## 1. Global Response Standards

### Standard Success Structure
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### Standard Error Structure
```json
{
  "success": false,
  "message": "A descriptive explanation of the error",
  "code": "ERROR_CODE_IDENTIFIER",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific validation failure message"
    }
  ]
}
```

---

## 2. Authentication Service (`authService.js`)

### 2.1 Login
- **Method & URL**: `POST /api/auth/login`
- **Auth**: Public (Rate limited: 10 attempts / 15 minutes)
- **Role**: Any valid user (`TEACHER`, `ADMIN`, `TECHNICIAN`)
- **Request Body**:
  ```json
  {
    "email": "teacher@college.edu",
    "password": "password123"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "5b2f8c1e-4d3a-4c6b-9e7f-000000000001",
      "fullName": "Prof. Anjali Deshmukh",
      "name": "Prof. Anjali Deshmukh",
      "email": "teacher@college.edu",
      "phone": "9820012345",
      "department": "Computer Engineering",
      "designation": "Assistant Professor",
      "role": "TEACHER",
      "accountStatus": "ACTIVE"
    },
    "teacher": { ... }
  }
  ```
  *Cookie Header*: Sets `campuscare_token=<jwt>; HttpOnly; SameSite=Lax; Path=/`
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Missing or malformed email/password.
  - `401 INVALID_CREDENTIALS`: Password does not match or email not found.
  - `403 ACCOUNT_PENDING`: Account pending admin approval.
  - `403 ACCOUNT_INACTIVE`: Account suspended or deactivated.
  - `429 TOO_MANY_REQUESTS`: Rate limit exceeded.

### 2.2 Logout
- **Method & URL**: `POST /api/auth/logout`
- **Auth**: Public / Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```
  *Cookie Header*: Clears `campuscare_token` with `Expires=Thu, 01 Jan 1970 00:00:00 GMT`.

### 2.3 Get Current User
- **Method & URL**: `GET /api/auth/me`
- **Auth**: Bearer Token or HTTP-only cookie
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "5b2f8c1e-4d3a-4c6b-9e7f-000000000001",
      "fullName": "Prof. Anjali Deshmukh",
      "email": "teacher@college.edu",
      "role": "TEACHER"
    },
    "teacher": { ... }
  }
  ```
- **Error Codes**:
  - `401 AUTH_REQUIRED`: Missing token.
  - `401 TOKEN_EXPIRED`: JWT token has expired.
  - `401 INVALID_TOKEN`: Token signature or structure is invalid.

---

## 3. PC & Location Service (`pcService.js`)

### 3.1 Fetch Campus Blocks
- **Method & URL**: `GET /api/blocks` (Alias: `GET /api/locations/blocks`)
- **Auth**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "blk-a",
        "name": "Block A",
        "description": "Engineering Academic Wing"
      }
    ]
  }
  ```

### 3.2 Fetch Laboratories
- **Method & URL**: `GET /api/labs` (Alias: `GET /api/locations/blocks/:blockId/rooms`)
- **Auth**: Authenticated
- **Query Params**: `blockId` (optional string)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "room-522",
        "blockId": "blk-a",
        "blockName": "Block A",
        "lab": "Computer Lab 1",
        "room": "522",
        "label": "Computer Lab 1 · Room 522",
        "code": "A",
        "pcCount": 20
      }
    ]
  }
  ```

### 3.3 Fetch PCs
- **Method & URL**: `GET /api/pcs` (Alias: `GET /api/locations/rooms/:roomId/pcs`)
- **Auth**: Authenticated
- **Query Params**: `labId` / `roomId`, `blockId`, `status`
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "5b2f8c1e-4d3a-4c6b-9e7f-000000000101",
        "displayCode": "522/A/1",
        "block": "Block A",
        "lab": "Computer Lab 1",
        "room": "522",
        "pcNumber": 1,
        "status": "WORKING",
        "notice": null,
        "canReport": true,
        "assetId": "ENG-522-PC-01"
      }
    ]
  }
  ```
  *Security Note*: `qr_token` is never exposed in bulk inventory listings.

### 3.4 Get PC Details
- **Method & URL**: `GET /api/pcs/:id`
- **Auth**: Authenticated
- **Path Params**: `id` (UUID)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "pc": {
      "id": "5b2f8c1e-4d3a-4c6b-9e7f-000000000101",
      "displayCode": "522/A/1",
      "block": "Block A",
      "lab": "Computer Lab 1",
      "room": "522",
      "status": "WORKING",
      "canReport": true
    }
  }
  ```
- **Error Codes**: `400 VALIDATION_ERROR` (Invalid UUID), `404 PC_NOT_FOUND`.

### 3.5 QR Token Lookup
- **Method & URL**: `GET /api/pcs/qr/:token` (Alias: `GET /api/pcs/lookup/:token`)
- **Auth**: Authenticated
- **Path Params**: `token` (String from scanned QR sticker)
- **Success (200 OK)**: Same structure as Get PC Details (token itself is omitted).
- **Error Codes**: `404 QR_NOT_FOUND`.

### 3.6 Active Tickets on a PC
- **Method & URL**: `GET /api/pcs/:id/active-tickets`
- **Auth**: Authenticated
- **Privacy Rule**: Tickets submitted by another teacher have their `description` and `reporter` masked (`isOwn: false`, `canView: false`).
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "LAB-1001",
        "status": "IN_PROGRESS",
        "urgency": "HIGH",
        "category": { "id": "cat-display", "name": "Display / Monitor" },
        "isOwn": true,
        "canView": true,
        "summary": "Screen flickers periodically"
      }
    ]
  }
  ```

---

## 4. Category Service (`categoryService.js`)

### 4.1 Fetch Categories & Subcategories
- **Method & URL**: `GET /api/categories` (Alias: `GET /api/issue-categories`)
- **Auth**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "cat-power",
        "code": "POWER",
        "name": "Power Issues",
        "subcategories": [
          { "id": "sub-not-starting", "name": "PC not starting" },
          { "id": "sub-sudden-shutdown", "name": "Sudden shutdown" }
        ]
      }
    ]
  }
  ```

---

## 5. Ticket Service (`ticketService.js`)

### 5.1 Check Potential Duplicate Tickets
- **Method & URL**: `GET /api/tickets/check-duplicate` (Alias: `POST /api/tickets/duplicate-check`)
- **Auth**: Authenticated
- **Params**: `pcId` (UUID), `categoryId` (optional)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "matches": [
      {
        "id": "LAB-1001",
        "status": "SUBMITTED",
        "urgency": "HIGH",
        "sameCategory": true,
        "isOwn": true,
        "canView": true
      }
    ]
  }
  ```

### 5.2 Create Support Ticket
- **Method & URL**: `POST /api/tickets` (Alias: `POST /api/teacher/tickets`)
- **Auth**: Authenticated (`TEACHER` or `ADMIN`)
- **Headers**: `Idempotency-Key: <unique-client-guid>` (optional but recommended)
- **Request Body**:
  ```json
  {
    "pcId": "5b2f8c1e-4d3a-4c6b-9e7f-000000000101",
    "categoryId": "cat-display",
    "subcategoryId": "sub-no-display",
    "urgency": "HIGH",
    "description": "Monitor power LED blinks blue but display remains black during lecture.",
    "remarks": "Tried power cycling and reseating HDMI cable.",
    "attachmentIds": ["att-uuid-1"]
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Support ticket submitted successfully.",
    "ticket": {
      "id": "LAB-1001",
      "status": "SUBMITTED",
      "urgency": "HIGH",
      "description": "...",
      "pc": { "displayCode": "522/A/1" },
      "category": { "name": "Display / Monitor" },
      "createdAt": "2026-11-25T14:30:00.000Z",
      "events": [{ "type": "SUBMITTED", "note": "Issue reported by faculty member" }]
    }
  }
  ```
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Missing description, pcId, or categoryId.
  - `404 PC_NOT_FOUND`: Specified PC does not exist.
  - `409 PC_NOT_REPORTABLE`: PC is flagged `can_report = false`.
  - `409 DUPLICATE_TICKET_EXISTS`: An identical active issue has already been reported on this PC.

### 5.3 List Teacher's Personal Requests
- **Method & URL**: `GET /api/tickets/my` (Alias: `GET /api/teacher/tickets`)
- **Auth**: Authenticated
- **Query Params**:
  - `page`: default `1`
  - `pageSize`: default `10`
  - `status`: filter by status (comma-separated, e.g. `IN_PROGRESS,SUBMITTED`)
  - `urgency`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
  - `search`: search term across ticket ID, PC display code, and description
  - `sort`: `newest` or `oldest`
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "LAB-1001",
        "status": "SUBMITTED",
        "urgency": "HIGH",
        "summary": "Monitor power LED blinks blue...",
        "pc": { "displayCode": "522/A/1" }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
  ```

### 5.4 Get Ticket Details
- **Method & URL**: `GET /api/tickets/:id` (Alias: `GET /api/teacher/tickets/:id`)
- **Auth**: Authenticated (Owner Teacher or Admin)
- **Path Params**: `id` (e.g. `LAB-1001`)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "ticket": {
      "id": "LAB-1001",
      "status": "SUBMITTED",
      "description": "...",
      "events": [...],
      "comments": [...],
      "canVerify": false,
      "canComment": true
    }
  }
  ```
- **Error Codes**: `403 FORBIDDEN_TICKET_ACCESS` (Another teacher's ticket), `404 TICKET_NOT_FOUND`.

### 5.5 Get Ticket Timeline
- **Method & URL**: `GET /api/tickets/:id/timeline`
- **Auth**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "timeline": [
      { "id": "ev-1", "type": "SUBMITTED", "at": "...", "note": null, "actor": { "name": "Prof. Anjali Deshmukh" } }
    ]
  }
  ```

### 5.6 Add Comment
- **Method & URL**: `POST /api/tickets/:id/comments` (Alias: `POST /api/teacher/tickets/:id/comments`)
- **Auth**: Authenticated
- **Headers**: `Idempotency-Key` (optional)
- **Request Body**:
  ```json
  {
    "body": "Technician tested display adapter; replacing cable."
  }
  ```
- **Success (201 Created)**: Returns updated ticket object.
- **Error Codes**: `409 TICKET_CLOSED` (Comments are locked once closed).

### 5.7 Add Additional Diagnostic Information
- **Method & URL**: `POST /api/tickets/:id/information` (Alias: `POST /api/teacher/tickets/:id/information`)
- **Auth**: Authenticated
- **Request Body**:
  ```json
  {
    "message": "Graphics card fan is making a buzzing sound as well."
  }
  ```
- **Success (200 OK)**: Returns updated ticket object (transitions status from `WAITING_FOR_INFO` back to `IN_PROGRESS`).

### 5.8 Submit Repair Verification
- **Method & URL**: `POST /api/tickets/:id/verification` (Alias: `POST /api/teacher/tickets/:id/verification`)
- **Auth**: Authenticated (Reporting Teacher only)
- **Request Body**:
  ```json
  {
    "result": "WORKING",
    "rating": 5,
    "comment": "Screen is displaying clearly now. Thank you!"
  }
  ```
  *Or if persistent issue*:
  ```json
  {
    "result": "NOT_WORKING",
    "explanation": "PC still shuts down after 5 minutes of continuous use."
  }
  ```
- **Success (200 OK)**: Returns updated ticket object (transitions to `CLOSED` on `WORKING`, or `REOPENED` on `NOT_WORKING`).
- **Error Codes**: `409 INVALID_STATUS_FOR_VERIFICATION` (Ticket not in `AWAITING_VERIFICATION`).

### 5.9 Inbound Jira Status Synchronization (Member 3 Interface)
- **Method & URL**: `PATCH /api/tickets/:id/jira-sync`
- **Auth**: Admin or Technician Bearer Token
- **Request Body**:
  ```json
  {
    "jiraIssueKey": "JSM-1042",
    "jiraIssueId": "10042",
    "status": "IN_PROGRESS",
    "technicianName": "Suresh Patil",
    "comment": "Assigned technician on-site."
  }
  ```
- **Success (200 OK)**: Returns `{ success: true, ticketId, jiraIssueKey, status }`.

---

## 6. Dashboard Service (`dashboardService.js`)

### 6.1 Get Dashboard Summary
- **Method & URL**: `GET /api/dashboard/summary` (Alias: `GET /api/teacher/dashboard/summary`)
- **Auth**: Authenticated (Teacher sees personal stats; Admin sees institutional stats)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "total": 5,
    "pending": 1,
    "inProgress": 2,
    "awaitingVerification": 1,
    "resolved": 1,
    "open": 4
  }
  ```

### 6.2 Get Recent Requests
- **Method & URL**: `GET /api/dashboard/recent-requests` (Alias: `GET /api/teacher/dashboard/recent-requests`)
- **Auth**: Authenticated
- **Query Params**: `limit` (default `5`, max `50`)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "LAB-1001",
        "status": "SUBMITTED",
        "urgency": "HIGH",
        "summary": "Screen flickering",
        "pc": { "displayCode": "522/A/1" }
      }
    ]
  }
  ```

---

## 7. Profile Service (`profileService.js`)

### 7.1 Fetch Profile
- **Method & URL**: `GET /api/profile` (Alias: `GET /api/teacher/profile`)
- **Auth**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "profile": {
      "id": "5b2f8c1e-4d3a-4c6b-9e7f-000000000001",
      "fullName": "Prof. Anjali Deshmukh",
      "email": "teacher@college.edu",
      "phone": "9820012345",
      "department": "Computer Engineering",
      "designation": "Assistant Professor",
      "avatarUrl": null,
      "role": "TEACHER",
      "editableFields": ["phone", "avatarUrl", "department", "designation"]
    }
  }
  ```

### 7.2 Update Permitted Profile Fields
- **Method & URL**: `PATCH /api/profile` (Alias: `PATCH /api/teacher/profile`)
- **Auth**: Authenticated
- **Permitted Fields**: `phone`, `avatarUrl`, `department`, `designation`
- **Forbidden Protected Fields**: `id`, `role`, `email`, `password`, `account_status`
- **Request Body**:
  ```json
  {
    "phone": "9820099999",
    "designation": "Associate Professor"
  }
  ```
- **Success (200 OK)**: Returns updated profile.
- **Error Codes**: `403 PROTECTED_FIELD_MODIFICATION` (Attempting to modify role or ID).

### 7.3 Upload Avatar
- **Method & URL**: `POST /api/profile/avatar` (Alias: `POST /api/teacher/profile/avatar`)
- **Auth**: Authenticated
- **Format**: `multipart/form-data` with field `avatar`
- **Success (200 OK)**: Returns updated profile with new `avatarUrl`.

---

## 8. Notification Service (`notificationService.js`)

### 8.1 List Notifications
- **Method & URL**: `GET /api/notifications` (Alias: `GET /api/teacher/notifications`)
- **Auth**: Authenticated
- **Query Params**: `unreadOnly=true`, `page=1`, `pageSize=15`
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "items": [
      {
        "id": "notif-uuid",
        "ticketId": "LAB-1001",
        "type": "TICKET_ACKNOWLEDGED",
        "title": "Request acknowledged",
        "message": "LAB-1001 has been acknowledged by the lab team.",
        "isRead": false,
        "createdAt": "2026-11-25T14:35:00.000Z"
      }
    ],
    "total": 1,
    "unreadCount": 1
  }
  ```

### 8.2 Get Unread Count
- **Method & URL**: `GET /api/notifications/unread-count` (Alias: `GET /api/teacher/notifications/unread-count`)
- **Auth**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1
  }
  ```

### 8.3 Mark Single Notification Read
- **Method & URL**: `PATCH /api/notifications/:id/read` (Alias: `POST ...`)
- **Auth**: Authenticated (Enforces ownership: `recipient_id = currentUserId`)
- **Success (200 OK)**: Returns `{ success: true, message: "Notification marked as read." }`.

### 8.4 Mark All Notifications Read
- **Method & URL**: `PATCH /api/notifications/read-all` (Alias: `POST ...`)
- **Auth**: Authenticated
- **Success (200 OK)**: Returns `{ success: true, updatedCount: 3 }`.

---

## 9. Upload Service (`uploadService.js`)

### 9.1 Get Upload Configuration
- **Method & URL**: `GET /api/uploads/config`
- **Auth**: Public / Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "maxFileSizeBytes": 10485760,
    "maxFiles": 5,
    "acceptedMimeTypes": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain"
    ],
    "acceptedExtensions": [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt", ".log"]
  }
  ```

### 9.2 Upload Diagnostic Attachment
- **Method & URL**: `POST /api/uploads`
- **Auth**: Authenticated
- **Format**: `multipart/form-data` with field `file` (optional `ticketId` in form body)
- **Success (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Attachment uploaded successfully.",
    "attachment": {
      "id": "att-464a8996-51d8-4f18-bbce-13833b3a3d5e",
      "name": "screenshot.png",
      "originalName": "screenshot.png",
      "mimeType": "image/png",
      "size": 245120,
      "url": "/api/uploads/att-464a8996-51d8-4f18-bbce-13833b3a3d5e"
    }
  }
  ```
- **Error Codes**:
  - `400 UNSUPPORTED_FILE_TYPE`: Executable, HTML, or script files rejected.
  - `400 INVALID_FILENAME`: Path traversal attempt (`..`, `/`, `\`).

### 9.3 Secure Download / Streaming
- **Method & URL**: `GET /api/uploads/:id`
- **Auth**: Authenticated (Uploader, Ticket Reporter, or Admin)
- **Headers Returned**:
  - `Content-Type`: Matching attachment MIME type
  - `X-Content-Type-Options: nosniff`
  - `Content-Disposition: inline; filename="original_name.png"`
- **Error Codes**: `403 FORBIDDEN_ATTACHMENT_ACCESS`, `404 ATTACHMENT_NOT_FOUND`.
