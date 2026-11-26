# CampusCare – Jira Backend Integration Handoff Specification

**Document Version:** 1.0.0  
**Authors:** Member 2 (Backend & Database Architecture)  
**Target Recipient:** Member 3 (Jira Service Management Lead & Workflow Automation)  
**Project:** CampusCare – College Lab IT Support System  
**Last Updated:** November 2026  

---

## 1. Executive Summary & Architectural Scope

The CampusCare backend maintains an institutional PostgreSQL database serving the teacher portal, laboratory inventory, and internal ticket lifecycle. Member 3 owns the Atlassian Jira Service Management (JSM) integration, external customer portals, service desk queues, SLA enforcement, and IT technician resolution workflows.

To prevent architectural coupling, data corruption, and race conditions, the integration follows an **Asynchronous Outbound Queue + Synchronous Inbound Webhook** model:
- **Outbound:** When a ticket is submitted by faculty, the backend records an immutable record in the `sync_events` table within the same atomic PostgreSQL transaction as the ticket creation. A lightweight worker or scheduled trigger managed by Member 3 reads these events and calls Atlassian Jira REST APIs to create the Jira issue.
- **Inbound:** When technicians update status, assign issues, or resolve tickets inside Jira Service Management, Jira Webhooks call the dedicated CampusCare endpoint `PATCH /api/tickets/:id/jira-sync` with an authorization token.

> [!IMPORTANT]
> **Explicit Boundary of Responsibilities:**
> - **Member 2 (Backend Lead) Provides:** Database schema, database transactions, `sync_events` outbound audit/queue table, REST endpoint `PATCH /api/tickets/:id/jira-sync`, duplicate linking schema (`ticket_links`), and state transition validation.
> - **Member 2 Does NOT:** Configure Jira Service Management projects, queues, custom fields inside Atlassian, Jira automation rules, SLA timers, Jira user permissions, or technician email notifications.
> - **Member 3 (Jira Lead) Provides:** Atlassian JSM project setup, custom field creation, sync worker polling `sync_events`, Jira automation webhook dispatch to CampusCare, and IT technician triage flows.

---

## 2. Division of Responsibilities Matrix

| Responsibility Area | Owned by Member 2 (Backend) | Owned by Member 3 (Jira Lead) | Implementation Details |
|---|:---:|:---:|---|
| **Ticket Identifiers** | **Yes** | **Yes** | Member 2 generates internal `LAB-xxxx`. Member 3 returns external `JSM-xxxx`. Both are stored in `tickets`. |
| **PostgreSQL Database** | **Yes** | No | Member 2 maintains tables, foreign keys, triggers, and indices. |
| **Outbound Queue Generation** | **Yes** | No | Member 2 writes payload to `sync_events` during ticket creation. |
| **Outbound Dispatcher / Poller** | No | **Yes** | Member 3 runs script/worker or automation that reads `sync_events` and posts to Jira REST API. |
| **Inbound Webhook Receiver** | **Yes** | No | Member 2 exposes `PATCH /api/tickets/:id/jira-sync`. |
| **Jira Webhook Configuration** | No | **Yes** | Member 3 configures Jira Automation / Webhooks pointing to backend URL. |
| **Jira Project, Queues & SLAs** | No | **Yes** | Member 3 designs queues, agent assignment, and SLA targets. |
| **Ticket Linking & Duplicates** | **Yes** | **Yes** | Member 2 provides `ticket_links` table; Member 3 syncs Jira issue links (`is duplicate of`, `blocks`). |

---

## 3. Ticket Identification & Key Separation

To guarantee data independence and avoid vendor lock-in, internal CampusCare identifiers are completely decoupled from external Jira issue keys:

| Identifier | Format | Generator | Stored In | Description |
|---|---|---|---|---|
| **Internal Ticket ID** | `LAB-1001` | PostgreSQL Sequence / CampusCare | `tickets.id` (Primary Key) | Primary key visible to college faculty and local lab managers. |
| **Internal Ticket Number**| `1001` | `SERIAL` Sequence | `tickets.ticket_number` | Integer counter for fast indexing and institutional reporting. |
| **External Jira Key** | `JSM-1042` | Atlassian Jira Cloud | `tickets.jira_issue_key` (UNIQUE) | Key used by IT support technicians inside Jira Service Management. |
| **External Jira ID** | `10042` | Atlassian Jira Cloud | `tickets.jira_issue_id` | Numeric immutable ID from Atlassian REST API. |

---

## 4. Required Ticket Field Mapping

When translating CampusCare tickets to Jira Service Management issues, use the following field mapping table:

| CampusCare DB Field | Source Table / Expression | Jira Service Management Target | Jira Data Type | Required | Notes |
|---|---|---|---|:---:|---|
| `id` | `tickets.id` | Custom Field: `[CampusCare-ID]` or Summary | Text Field (Single Line) | Yes | e.g. `LAB-1001` |
| Summary | `'[' || pcs.display_code || '] ' || cat.name` | `summary` | Text | Yes | e.g. `[522/A/1] Power Issues` |
| `description` | `tickets.description` | `description` | ADF / Rich Text | Yes | Detailed problem report from teacher |
| `urgency` | `tickets.urgency` | `priority` | Priority Picker | Yes | Mapping: `LOW` → Low, `MEDIUM` → Medium, `HIGH` → High, `CRITICAL` → Highest |
| Reporter Name | `users.full_name` | Custom Field: `Faculty Name` | Text | Yes | Teacher name |
| Reporter Email | `users.email` | `reporter` or `Customer Request Email` | User / Email | Yes | Institutional email |
| PC Display Code | `pcs.display_code` | Custom Field: `PC Position` | Text | Yes | e.g. `522/A/1` |
| Asset ID | `pcs.asset_id` | Custom Field: `Asset Tag` | Text | No | e.g. `ENG-LAB-A-012` |
| Lab Name | `labs.lab_name` | Custom Field: `Laboratory` | Text / Select | Yes | e.g. `Advanced Computing Lab` |
| Room Number | `labs.room_number` | Custom Field: `Room Number` | Text | Yes | e.g. `522` |
| Block | `blocks.name` | Custom Field: `Campus Block` | Text | Yes | e.g. `Block A (Engineering)` |
| Category | `ticket_categories.name` | `components` or Request Type | Component / Category | Yes | e.g. `Power Issues` |
| Subcategory | Subcategory category name | Custom Field: `Subcategory` | Text | No | e.g. `PC Not Powering On` |
| Created At | `tickets.created_at` | `created` (custom audit field) | DateTime | Yes | ISO 8601 Timestamp |

---

## 5. Ticket Status Transition Mapping

Both systems must reflect the current state of repair accurately. The state transition lifecycle is defined as follows:

```
[Teacher Submits]
       │
       ▼
  SUBMITTED  ─────────► [Outbound to Jira] ─────────► Jira: "Waiting for Triage"
       │
       ▼ (Technician accepts)
 ACKNOWLEDGED ◄─────── [Inbound from Jira] ◄──────── Jira: "Assigned"
       │
       ▼ (Repair started)
  IN_PROGRESS ◄─────── [Inbound from Jira] ◄──────── Jira: "Work In Progress"
       │
       ├─────────────────────────────────┐
       ▼ (Tech asks question)            │
WAITING_FOR_INFO                         ▼ (Hardware fixed)
       │                           FIXED / AWAITING_VERIFICATION
       │ (Teacher answers)               │
       └──────────► IN_PROGRESS          ├────────────────────────┐
                                         ▼ (Teacher confirms OK)  ▼ (Teacher reports FAIL)
                                       CLOSED                  REOPENED
```

### Detailed Status Conversion Table

| Jira Service Management Status | CampusCare Status (`tickets.status`) | Event Logged in `ticket_events` | Meaning & Action |
|---|---|---|---|
| *Waiting for support* / *Open* | `SUBMITTED` | `SUBMITTED` | Ticket newly lodged by faculty; waiting for IT assignment. |
| *Assigned* / *Triage* | `ACKNOWLEDGED` | `ACKNOWLEDGED` | Support technician assigned to issue. |
| *In Progress* / *Investigating* | `IN_PROGRESS` | `IN_PROGRESS` | Technician is inspecting hardware/software on-site or remotely. |
| *Pending Customer* / *Waiting on Info* | `WAITING_FOR_INFO` | `WAITING_FOR_INFO` | IT requires additional information from the teacher. |
| *Resolved* / *Work Complete* | `AWAITING_VERIFICATION` | `FIXED`, `AWAITING_VERIFICATION` | Hardware/software repaired; teacher receives prompt to verify PC functionality. |
| *Closed* / *Done* | `CLOSED` | `CLOSED` | Teacher verified working, or auto-closed after 7 days of inactivity. |
| *Reopened* | `REOPENED` | `REOPENED` | Teacher clicked "Still Not Working" during verification; ticket returns to urgent queue. |

---

## 6. Outbound Data Exchange: The `sync_events` Queue

When a teacher submits an issue, the backend performs ticket creation and sync event queuing in a single atomic transaction.

### Database Table: `sync_events`

```sql
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('OUTBOUND_TO_JIRA', 'INBOUND_FROM_JIRA')),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRY')),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Outbound Payload Written by Member 2

```json
{
  "id": "e8a93df1-1234-4567-89ab-cdef01234567",
  "ticket_id": "LAB-1001",
  "direction": "OUTBOUND_TO_JIRA",
  "event_type": "TICKET_CREATED",
  "payload": {
    "ticketId": "LAB-1001",
    "reporter": {
      "fullName": "Prof. Anjali Deshmukh",
      "email": "teacher@college.edu",
      "department": "Computer Engineering"
    },
    "pc": {
      "displayCode": "522/A/1",
      "assetId": "ENG-LAB-A-012",
      "labName": "Advanced Software Engineering Lab",
      "roomNumber": "522",
      "block": "Block A"
    },
    "category": "Power Issues",
    "subcategory": "PC Shuts Down Abruptly",
    "urgency": "HIGH",
    "description": "System turns off unexpectedly within 10 minutes of booting during practical batch A.",
    "createdAt": "2026-11-25T14:30:00.000Z"
  },
  "status": "PENDING",
  "retry_count": 0
}
```

### Member 3 Worker Retrieval Query

Member 3's synchronization script or background poller queries pending outbound events with:

```sql
SELECT id, ticket_id, event_type, payload, retry_count
FROM sync_events
WHERE direction = 'OUTBOUND_TO_JIRA' 
  AND status IN ('PENDING', 'RETRY')
ORDER BY created_at ASC
LIMIT 50;
```

Upon successful creation of the issue in Jira:
```sql
UPDATE sync_events 
SET status = 'SUCCESS', 
    synced_at = CURRENT_TIMESTAMP 
WHERE id = $1;

UPDATE tickets 
SET jira_issue_key = $2, 
    jira_issue_id = $3 
WHERE id = $4;
```

---

## 7. Inbound Data Exchange: Webhook Sync Endpoint

Member 3's Jira Automation rule or webhook dispatcher calls the CampusCare backend whenever an event occurs inside Jira.

### Endpoint Specification

- **HTTP Method:** `PATCH`
- **Endpoint URL:** `/api/tickets/:id/jira-sync` (also accessible as `/api/tickets/:id/sync`)
- **Authentication:** `Bearer <TOKEN>` (Admin or Service JWT) or `X-Sync-Secret: <ConfiguredSecret>`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  ```

### Request Body Schema

```json
{
  "jiraIssueKey": "JSM-1042",
  "jiraIssueId": "10042",
  "status": "IN_PROGRESS",
  "technicianName": "Suresh Patil",
  "comment": "Inspected power supply unit. Replacing 450W SMPS.",
  "action": "STATUS_UPDATE"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|---|---|:---:|---|
| `jiraIssueKey` | String | Yes | External Jira key (e.g. `JSM-1042`). Saved to `tickets.jira_issue_key`. |
| `jiraIssueId` | String | No | Atlassian internal numeric ID (e.g. `10042`). |
| `status` | String | No | New CampusCare status (e.g. `ACKNOWLEDGED`, `IN_PROGRESS`, `AWAITING_VERIFICATION`, `CLOSED`, `REOPENED`). |
| `technicianName`| String | No | Technician name from Jira to record in timeline audit events. |
| `comment` | String | No | Public comment from technician posted to `ticket_comments`. |
| `action` | String | No | Action type: `STATUS_UPDATE`, `COMMENT_ADDED`, `ASSIGNED`. Default: `STATUS_UPDATE`. |

### Successful Response (HTTP 200 OK)

```json
{
  "success": true,
  "message": "Jira synchronization applied successfully.",
  "data": {
    "ticketId": "LAB-1001",
    "newStatus": "IN_PROGRESS",
    "jiraIssueKey": "JSM-1042",
    "syncedAt": "2026-11-25T14:35:10.123Z"
  }
}
```

### Error Responses

- **400 Bad Request:** Missing required fields or invalid status enum value.
  ```json
  {
    "success": false,
    "message": "Invalid status transition provided.",
    "code": "INVALID_STATUS"
  }
  ```
- **401 Unauthorized:** Missing or invalid service token.
- **404 Not Found:** Ticket ID not found in database.

---

## 8. Webhook Handling Architecture

When Jira Service Management detects a status transition, it fires a Webhook to the integration gateway:

```
┌─────────────────────────────────┐
│ Jira Service Management         │
│ (Technician updates ticket)     │
└───────────────┬─────────────────┘
                │ Webhook POST (JSON)
                ▼
┌─────────────────────────────────┐
│ Member 3 Integration Gateway /  │
│ Dispatcher Script               │
│ - Validates Jira signature      │
│ - Translates status values      │
└───────────────┬─────────────────┘
                │ PATCH /api/tickets/:id/jira-sync
                ▼
┌─────────────────────────────────┐
│ CampusCare Express Backend      │
│ - Validates JWT / Secret        │
│ - Updates tickets table         │
│ - Inserts ticket_events row     │
│ - Dispatches user notification  │
│ - Emits WebSocket/SSE event     │
└─────────────────────────────────┘
```

---

## 9. Error Handling, Retry Strategy & Dead-Letter Handling

Network disruptions or Atlassian API downtime must never compromise data integrity:

### Outbound Retry Logic (Member 3 Poller)
1. **Exponential Backoff:** If Jira API returns `429 Too Many Requests` or `5xx Server Error`, the worker increments `retry_count` and updates `status = 'RETRY'`:
   $$\text{Delay} = 2^{\text{retry\_count}} \times 10 \text{ seconds}$$
2. **Maximum Retries:** After 5 failed attempts (`retry_count >= 5`), the record is transitioned to `status = 'FAILED'`.
3. **Dead-Letter Notification:** A failed sync triggers an institutional notification to the IT Administrator dashboard to ensure no ticket is lost.

### Idempotency Guarantee
The endpoint `PATCH /api/tickets/:id/jira-sync` is **fully idempotent**. If Jira sends duplicate webhooks for the same status transition:
- The backend checks whether `tickets.status` is already identical to the incoming status.
- If identical, the status update is skipped, no duplicate `ticket_events` row is written, and HTTP `200 OK` is returned immediately.

---

## 10. Duplicate Ticket Linking Representation

When a faculty member reports a PC that already has an unresolved ticket, or when an administrator flags related issues, records are maintained in `ticket_links`:

### Database Table: `ticket_links`

```sql
CREATE TABLE IF NOT EXISTS ticket_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    target_ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    link_type VARCHAR(30) NOT NULL CHECK (link_type IN ('DUPLICATE_OF', 'RELATES_TO', 'BLOCKS', 'DEPENDS_ON')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_no_self_link CHECK (source_ticket_id <> target_ticket_id),
    CONSTRAINT uq_ticket_link UNIQUE (source_ticket_id, target_ticket_id, link_type)
);
```

### Jira Mapping for Links

When Member 3 syncs linked tickets to Jira Service Management:
- `DUPLICATE_OF`: Create Jira Issue Link with type `Duplicate` (`This issue duplicates...`).
- `RELATES_TO`: Create Jira Issue Link with type `Relates` (`This issue relates to...`).
- `BLOCKS`: Create Jira Issue Link with type `Blocks` (`This issue blocks...`).
- `DEPENDS_ON`: Create Jira Issue Link with type `Depended` (`This issue is blocked by...`).

---

## 11. Testing and Verification Checklist for Member 3

Before initiating live production sync, execute the following smoke tests:

- [ ] **Test 1: Outbound Creation Verification**
  - Create a ticket via teacher portal (`POST /api/tickets`).
  - Query `SELECT * FROM sync_events WHERE ticket_id = 'LAB-xxxx'`.
  - Confirm payload JSON matches the schema in Section 6.
- [ ] **Test 2: Jira Issue Key Storage**
  - Call `PATCH /api/tickets/LAB-1001/jira-sync` with `jiraIssueKey: "JSM-9999"`.
  - Verify `SELECT jira_issue_key FROM tickets WHERE id = 'LAB-1001'` returns `JSM-9999`.
- [ ] **Test 3: Technician Status Transition**
  - Send status update `IN_PROGRESS` via webhook.
  - Verify ticket timeline reflects `IN_PROGRESS` in `GET /api/tickets/LAB-1001/timeline`.
- [ ] **Test 4: Resolution & Verification Flow**
  - Send status update `AWAITING_VERIFICATION` via webhook.
  - Verify teacher portal displays verification card ("Is your PC working now?").
- [ ] **Test 5: Idempotency Verification**
  - Send identical payload twice.
  - Verify HTTP 200 returned both times with no duplicate event entries in `ticket_events`.

---

## 12. Sign-Off & Approvals

| Role | Name | Status | Date |
|---|---|---|---|
| **Member 2 (Backend & Database)** | *Signed* | Completed & Verified | 25-Nov-2026 |
| **Member 3 (Jira Service Management)** | *Pending Review* | Specification Delivered | — |
