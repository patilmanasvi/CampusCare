# CampusCare Database Data Dictionary

**Database Name:** `campuscare_db`  
**RDBMS:** PostgreSQL 14+ (Compatible with PostgreSQL 19)  
**Author:** Member 2 (Backend & Database Engineer)  
**Encoding:** UTF-8

---

## 1. `roles` Table
Defines system-wide user roles and authorization tiers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | PK, NOT NULL | Unique sequential role identifier |
| `name` | `VARCHAR(50)` | UNIQUE, NOT NULL | Role name (`TEACHER`, `TECHNICIAN`, `ADMIN`, `LAB_ASSISTANT`) |
| `description` | `TEXT` | Nullable | Detailed description of role responsibilities |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Record creation timestamp |

---

## 2. `users` Table
Stores faculty, technical staff, and administrative users. Passwords are encrypted with bcrypt (never plain text).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Universally unique user identifier |
| `role_id` | `INT` | FK (`roles.id`), NOT NULL, ON DELETE RESTRICT | Assigned role; cannot delete role if users exist |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | College email address used for sign-in |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Salted bcrypt password hash |
| `full_name` | `VARCHAR(150)` | NOT NULL | User's full institutional name |
| `phone` | `VARCHAR(25)` | Nullable | Contact mobile number |
| `department` | `VARCHAR(100)` | Nullable | Academic department (e.g., Computer Engineering) |
| `designation` | `VARCHAR(100)` | Nullable | Academic designation (e.g., Assistant Professor) |
| `avatar_url` | `TEXT` | Nullable | URL to user's uploaded avatar image |
| `account_status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'ACTIVE'`, CHECK | `'ACTIVE'`, `'PENDING'`, `'SUSPENDED'`, `'DEACTIVATED'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Auto-updated on record changes |

---

## 3. `blocks` Table
Campus buildings housing laboratories.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK, NOT NULL | Unique slug ID (e.g. `blk-a`, `blk-b`) |
| `name` | `VARCHAR(100)` | UNIQUE, NOT NULL | Human-readable building name (e.g. `Block A`) |
| `description` | `TEXT` | Nullable | Building description and department mapping |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Record creation timestamp |

---

## 4. `labs` Table
Laboratory rooms situated within campus blocks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK, NOT NULL | Unique lab ID (e.g. `room-522`) |
| `block_id` | `VARCHAR(50)` | FK (`blocks.id`), NOT NULL, ON DELETE RESTRICT | Parent block reference |
| `lab_name` | `VARCHAR(100)` | NOT NULL | Laboratory display title (e.g. `Computer Lab 1`) |
| `room_number` | `VARCHAR(20)` | NOT NULL | Physical room number (e.g. `522`) |
| `code` | `VARCHAR(10)` | NOT NULL | Single-letter code used in PC display (e.g. `A`, `B`, `N`) |
| `pc_count` | `INT` | NOT NULL, DEFAULT 0, CHECK (`>= 0`) | Total number of installed workstations |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Record creation timestamp |

*Composite Unique Key:* `(block_id, room_number)` ensures unique room numbering per block.

---

## 5. `pcs` Table
Individual computer workstations in laboratories. Coordinated with Member 4 (Admin Dashboard / Inventory).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique workstation UUID |
| `lab_id` | `VARCHAR(50)` | FK (`labs.id`), NOT NULL, ON DELETE RESTRICT | Laboratory room reference |
| `pc_number` | `INT` | NOT NULL, CHECK (`> 0`) | Workstation number in room (e.g., 1 to 20) |
| `asset_id` | `VARCHAR(64)` | UNIQUE, Nullable | Institutional physical barcode asset tag (Member 4) |
| `qr_token` | `VARCHAR(128)` | UNIQUE, NOT NULL | Cryptographic token encoded on QR code sticker |
| `display_code` | `VARCHAR(50)` | NOT NULL | Human-readable label (e.g. `522/A/12`) |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'WORKING'`, CHECK | `'WORKING'`, `'UNDER_MAINTENANCE'`, `'NOT_IN_SERVICE'` |
| `notice` | `TEXT` | Nullable | Maintenance announcement or status explanation |
| `can_report` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Allows/disallows teachers reporting issues on this PC |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Soft-deletion flag preserving historical ticket links |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Workstation registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Auto-updated on record changes |

*Composite Unique Key:* `(lab_id, pc_number)` prevents duplicate PC numbers inside the same lab.

---

## 6. `ticket_categories` Table
Hierarchical issue classification tree (categories & subcategories).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK, NOT NULL | Category code slug (e.g. `cat-power`, `sub-not-starting`) |
| `parent_id` | `VARCHAR(50)` | FK (`ticket_categories.id`), Nullable | Parent category ID; `NULL` for top-level categories |
| `code` | `VARCHAR(50)` | NOT NULL | Category uppercase code (`POWER`, `DISPLAY`, etc.) |
| `name` | `VARCHAR(100)` | NOT NULL | Display title for frontend UI |
| `description` | `TEXT` | Nullable | Explanatory description |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Active status toggle |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Record creation timestamp |

---

## 7. `tickets` Table
IT support requests submitted by teachers. Historical records are preserved on user/PC deactivation (`RESTRICT`).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK, NOT NULL | Human-friendly ticket ID (e.g. `LAB-1012`) |
| `ticket_number` | `SERIAL` | UNIQUE, NOT NULL | Sequential internal integer |
| `reporter_id` | `UUID` | FK (`users.id`), NOT NULL, ON DELETE RESTRICT | Faculty member who reported the problem |
| `pc_id` | `UUID` | FK (`pcs.id`), NOT NULL, ON DELETE RESTRICT | Target laboratory computer |
| `category_id` | `VARCHAR(50)` | FK (`ticket_categories.id`), NOT NULL | Primary issue category |
| `subcategory_id` | `VARCHAR(50)` | FK (`ticket_categories.id`), Nullable | Specific issue subcategory |
| `urgency` | `VARCHAR(20)` | NOT NULL, DEFAULT `'LOW'`, CHECK | `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'` |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'SUBMITTED'`, CHECK | `'SUBMITTED'`, `'ACKNOWLEDGED'`, `'IN_PROGRESS'`, `'WAITING_FOR_INFO'`, `'FIXED'`, `'AWAITING_VERIFICATION'`, `'CLOSED'`, `'REOPENED'` |
| `description` | `TEXT` | NOT NULL | Teacher's detailed problem description |
| `remarks` | `TEXT` | Nullable | Additional context (e.g. room temperature, error frequency) |
| `assigned_to` | `UUID` | FK (`users.id`), Nullable, ON DELETE SET NULL | Assigned technician |
| `jira_issue_key`| `VARCHAR(50)` | UNIQUE, Nullable | Jira Service Management key (e.g. `JSM-1042`, Member 3) |
| `jira_issue_id` | `VARCHAR(100)`| Nullable | Jira internal issue ID |
| `resolved_at` | `TIMESTAMPTZ` | Nullable | Timestamp when marked as `FIXED` |
| `closed_at` | `TIMESTAMPTZ` | Nullable | Timestamp when verified and `CLOSED` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Auto-updated on record changes |

---

## 8. `ticket_events` Table
Immutable audit log recording every transition in the ticket lifecycle.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique event ID |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL, ON DELETE RESTRICT | Associated ticket |
| `event_type` | `VARCHAR(50)` | NOT NULL, CHECK | Lifecycle status or action event |
| `actor_id` | `UUID` | FK (`users.id`), Nullable, ON DELETE SET NULL | User who initiated this event (`NULL` for automated sync) |
| `note` | `TEXT` | Nullable | Event note, repair explanation, or sync details |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Event timestamp |

---

## 9. `ticket_comments` Table
Communication thread on tickets. Supports public comments for faculty and internal notes for technicians.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique comment ID |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL, ON DELETE RESTRICT | Ticket reference |
| `author_id` | `UUID` | FK (`users.id`), NOT NULL, ON DELETE RESTRICT | Author user ID |
| `body` | `TEXT` | NOT NULL | Comment message content |
| `visibility` | `VARCHAR(20)` | NOT NULL, DEFAULT `'PUBLIC'`, CHECK | `'PUBLIC'` (visible to teacher) or `'INTERNAL'` (technicians only) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Edit timestamp |

---

## 10. `ticket_information` Table
Stores structured Q&A threads when technicians place a ticket in `WAITING_FOR_INFO`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique information request ID |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL, ON DELETE RESTRICT | Ticket reference |
| `requested_by` | `UUID` | FK (`users.id`), NOT NULL, ON DELETE RESTRICT | Technician asking the question |
| `question` | `TEXT` | NOT NULL | Question or information requested |
| `provided_by` | `UUID` | FK (`users.id`), Nullable, ON DELETE SET NULL | Teacher answering the question |
| `response` | `TEXT` | Nullable | Teacher's response |
| `requested_at`| `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Question timestamp |
| `responded_at`| `TIMESTAMPTZ` | Nullable | Response timestamp |

---

## 11. `ticket_links` Table
Maintains relationships between tickets (e.g. duplicate reports, blocking issues).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique link ID |
| `source_ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL | Primary ticket |
| `target_ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL | Linked ticket |
| `link_type` | `VARCHAR(30)` | NOT NULL, CHECK | `'DUPLICATE_OF'`, `'RELATES_TO'`, `'BLOCKS'`, `'DEPENDS_ON'` |
| `created_by` | `UUID` | FK (`users.id`), Nullable | User who created the link |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Link timestamp |

*Integrity Constraints:*
- `source_ticket_id <> target_ticket_id` (No self-linking)
- `UNIQUE (source_ticket_id, target_ticket_id, link_type)` (No duplicate relationship types)

---

## 12. `repair_records` Table
Tracks physical repairs, component replacements, and financial costs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique repair log ID |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), Nullable, ON DELETE SET NULL | Originating support ticket |
| `pc_id` | `UUID` | FK (`pcs.id`), NOT NULL, ON DELETE RESTRICT | Serviced PC |
| `technician_id`| `UUID` | FK (`users.id`), NOT NULL, ON DELETE RESTRICT | Servicing technician |
| `action_taken` | `TEXT` | NOT NULL | Service actions performed |
| `parts_replaced`| `TEXT` | Nullable | Replaced components (e.g. `SMPS 450W`, `DDR4 8GB`) |
| `cost` | `NUMERIC(10,2)` | NOT NULL, DEFAULT `0.00`, CHECK (`>= 0`) | Repair expenditure in INR |
| `repair_date` | `DATE` | NOT NULL, DEFAULT `CURRENT_DATE` | Date of service |
| `notes` | `TEXT` | Nullable | Warranty or vendor reference notes |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Entry creation timestamp |

---

## 13. `sync_events` Table
Maintains an audit log and retry queue for Jira Service Management integration (Member 3).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique sync event ID |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL, ON DELETE RESTRICT | Synchronized ticket |
| `direction` | `VARCHAR(20)` | NOT NULL, CHECK | `'OUTBOUND_TO_JIRA'`, `'INBOUND_FROM_JIRA'` |
| `event_type` | `VARCHAR(50)` | NOT NULL | Trigger event (`CREATE_ISSUE`, `UPDATE_STATUS`, etc.) |
| `payload` | `JSONB` | NOT NULL, DEFAULT `'{}'` | JSON payload transmitted or received |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'PENDING'`, CHECK | `'PENDING'`, `'SUCCESS'`, `'FAILED'`, `'RETRY'` |
| `error_message`| `TEXT` | Nullable | Error log message if sync failed |
| `retry_count` | `INT` | NOT NULL, DEFAULT 0, CHECK (`>= 0`) | Retries attempted |
| `synced_at` | `TIMESTAMPTZ` | Nullable | Successful sync timestamp |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Event creation timestamp |

---

## 14. `attachments` Table
File attachments uploaded by teachers or technicians (photos, logs, video clips).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK, NOT NULL | Attachment ID (e.g. `att-1` or UUID) |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), NOT NULL, ON DELETE RESTRICT | Ticket reference |
| `comment_id` | `UUID` | FK (`ticket_comments.id`), Nullable | Attached comment (if added within comment) |
| `uploader_id`| `UUID` | FK (`users.id`), NOT NULL, ON DELETE RESTRICT | User who uploaded the file |
| `file_name` | `VARCHAR(255)` | NOT NULL | Sanitized storage file name on disk |
| `original_name`| `VARCHAR(255)`| NOT NULL | Original client-side file name |
| `mime_type` | `VARCHAR(100)` | NOT NULL | Standard MIME type (e.g. `image/png`, `video/mp4`) |
| `file_size` | `BIGINT` | NOT NULL, CHECK (`> 0`) | Size in bytes |
| `file_path` | `TEXT` | NOT NULL | Server filesystem path / storage bucket path |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Upload timestamp |

---

## 15. `notifications` Table
In-app notification messages delivered to users.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Unique notification UUID |
| `recipient_id`| `UUID` | FK (`users.id`), NOT NULL, ON DELETE CASCADE | Target recipient |
| `ticket_id` | `VARCHAR(50)` | FK (`tickets.id`), Nullable, ON DELETE CASCADE | Relevant ticket |
| `type` | `VARCHAR(50)` | NOT NULL, CHECK | Notification category code |
| `title` | `VARCHAR(200)` | NOT NULL | Notification title |
| `message` | `TEXT` | NOT NULL | Notification body text |
| `is_read` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Read receipt toggle |
| `read_at` | `TIMESTAMPTZ` | Nullable | Timestamp when user marked as read |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP` | Delivery timestamp |
