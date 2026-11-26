# CampusCare – PostgreSQL Database Data Dictionary

**Database Name:** `campuscare_db`  
**Schema:** `public`  
**Specification Version:** 1.0.0  
**Author:** Member 2 (Backend & Database Architecture)  
**Last Updated:** November 2026  

---

## Table of Contents
1. [roles](#1-roles)
2. [users](#2-users)
3. [blocks](#3-blocks)
4. [labs](#4-labs)
5. [pcs](#5-pcs)
6. [ticket_categories](#6-ticket_categories)
7. [tickets](#7-tickets)
8. [ticket_events](#8-ticket_events)
9. [ticket_comments](#9-ticket_comments)
10. [ticket_information](#10-ticket_information)
11. [ticket_links](#11-ticket_links)
12. [repair_records](#12-repair_records)
13. [sync_events](#13-sync_events)
14. [attachments](#14-attachments)
15. [notifications](#15-notifications)

---

## 1. `roles`
Stores institutional role definitions governing access permissions across the system.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `SERIAL` | No | Auto-increment | `PRIMARY KEY` | Unique role identifier |
| `name` | `VARCHAR(50)` | No | — | `UNIQUE` | Role name (`TEACHER`, `ADMIN`, `TECHNICIAN`) |
| `description` | `TEXT` | Yes | `NULL` | — | Human-readable explanation of role responsibilities |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Timestamp when the role was created |

### Sample Data
| id | name | description |
|---|---|---|
| 1 | `TEACHER` | Faculty member reporting laboratory computer defects |
| 2 | `ADMIN` | IT administrator overseeing labs, inventory, and users |
| 3 | `TECHNICIAN` | Hardware/network technician assigned to resolve tickets |

---

## 2. `users`
Registered institutional users including faculty, administrators, and lab assistants.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Globally unique user identifier |
| `role_id` | `INT` | No | — | `REFERENCES roles(id) ON DELETE RESTRICT` | Assigned institutional role |
| `email` | `VARCHAR(255)` | No | — | `UNIQUE` | Institutional email address (login credential) |
| `password_hash`| `VARCHAR(255)` | No | — | — | Bcrypt salted password hash (never stored plain) |
| `full_name` | `VARCHAR(150)` | No | — | — | Full display name with title (e.g. Prof. Anjali Deshmukh) |
| `phone` | `VARCHAR(25)` | Yes | `NULL` | — | Institutional or mobile contact number |
| `department` | `VARCHAR(100)` | Yes | `NULL` | — | Academic or administrative department |
| `designation` | `VARCHAR(100)` | Yes | `NULL` | — | Faculty/staff designation (e.g. Assistant Professor) |
| `avatar_url` | `TEXT` | Yes | `NULL` | — | Optional profile picture URL |
| `account_status`| `VARCHAR(20)`| No | `'ACTIVE'` | `CHECK (ACTIVE, PENDING, SUSPENDED, DEACTIVATED)` | Account lifecycle status |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Registration audit timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Managed by trigger | Last update audit timestamp |

### Sample Data
| id | email | full_name | department | account_status |
|---|---|---|---|---|
| `5b2f8c1e-4d3a-4c6b-9e7f-000000000001` | `teacher@college.edu` | Prof. Anjali Deshmukh | Computer Engineering | `ACTIVE` |
| `5b2f8c1e-4d3a-4c6b-9e7f-000000000002` | `admin@college.edu` | Admin Rajesh Sharma | IT Infrastructure | `ACTIVE` |

---

## 3. `blocks`
Physical campus buildings housing laboratories and lecture facilities.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `VARCHAR(50)` | No | — | `PRIMARY KEY` | Short slug identifier (e.g. `blk-a`, `blk-b`) |
| `name` | `VARCHAR(100)` | No | — | `UNIQUE` | Full building name (e.g. "Block A - Engineering") |
| `description` | `TEXT` | Yes | `NULL` | — | Geographical or departmental details |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Timestamp of building addition |

### Sample Data
| id | name | description |
|---|---|---|
| `blk-a` | Block A (Engineering Wing) | Houses CSE, IT, and AI/DS laboratories |
| `blk-b` | Block B (Science Wing) | Houses Physics, Chemistry, and Electronics labs |

---

## 4. `labs`
Specific computer laboratories and rooms situated within campus blocks.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `VARCHAR(50)` | No | — | `PRIMARY KEY` | Unique lab identifier (e.g. `room-522`) |
| `block_id` | `VARCHAR(50)` | No | — | `REFERENCES blocks(id) ON DELETE RESTRICT` | Parent campus block |
| `lab_name` | `VARCHAR(100)` | No | — | — | Descriptive name (e.g. Software Engineering Lab) |
| `room_number` | `VARCHAR(20)` | No | — | `UNIQUE (block_id, room_number)` | Door/room number within the building |
| `code` | `VARCHAR(10)` | No | — | — | Short identifier code (e.g. `A`, `B`, `N`) |
| `pc_count` | `INT` | No | `0` | `CHECK (pc_count >= 0)` | Total number of installed workstations |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Timestamp of record creation |

### Sample Data
| id | block_id | lab_name | room_number | code | pc_count |
|---|---|---|---|---|---|
| `room-522` | `blk-a` | Advanced Software Engineering Lab | 522 | A | 35 |
| `room-523` | `blk-a` | Network & Security Lab | 523 | B | 30 |

---

## 5. `pcs`
Individual desktop workstations in laboratories. Coordinated with Member 4 (Admin Dashboard).

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Unique workstation identifier |
| `lab_id` | `VARCHAR(50)` | No | — | `REFERENCES labs(id) ON DELETE RESTRICT` | Laboratory containing the PC |
| `pc_number` | `INT` | No | — | `CHECK (pc_number > 0)`, `UNIQUE(lab_id, pc_number)` | Physical desk number |
| `asset_id` | `VARCHAR(64)` | Yes | `NULL` | `UNIQUE` | Institutional barcode asset tag (Member 4) |
| `qr_token` | `VARCHAR(128)`| No | — | `UNIQUE` | Cryptographic token encoded on QR sticker |
| `display_code`| `VARCHAR(50)` | No | — | — | Human-readable label (e.g. `522/A/1`) |
| `status` | `VARCHAR(30)` | No | `'WORKING'` | `CHECK (WORKING, UNDER_MAINTENANCE, NOT_IN_SERVICE)` | Operational condition |
| `notice` | `TEXT` | Yes | `NULL` | — | Maintenance advisory banner for teachers |
| `can_report` | `BOOLEAN` | No | `true` | — | Flag allowing new defect submissions |
| `is_active` | `BOOLEAN` | No | `true` | — | Soft-deletion flag to preserve historical tickets |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Commissioning timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Managed by trigger | Last status update timestamp |

### Sample Data
| id | display_code | qr_token | status | can_report |
|---|---|---|---|---|
| `a0000000-0000-0000-0000-000000000001` | `522/A/1` | `QR-ROOM522-PC01-TOKEN` | `WORKING` | `true` |
| `a0000000-0000-0000-0000-000000000002` | `522/A/2` | `QR-ROOM522-PC02-TOKEN` | `UNDER_MAINTENANCE` | `false` |

---

## 6. `ticket_categories`
Hierarchical taxonomy of laboratory hardware, network, and software defects.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `VARCHAR(50)` | No | — | `PRIMARY KEY` | Category identifier (e.g. `cat-power`, `sub-smps`) |
| `parent_id` | `VARCHAR(50)` | Yes | `NULL` | `REFERENCES ticket_categories(id) ON DELETE RESTRICT` | Self-referencing FK for subcategories |
| `code` | `VARCHAR(50)` | No | — | — | System classification code (e.g. `POWER`) |
| `name` | `VARCHAR(100)` | No | — | — | Descriptive display name (e.g. "Power Issues") |
| `description` | `TEXT` | Yes | `NULL` | — | Diagnostic guidelines for faculty |
| `is_active` | `BOOLEAN` | No | `true` | — | Active in dropdown selectors |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Timestamp of creation |

### Sample Data
| id | parent_id | code | name |
|---|---|---|---|
| `cat-power` | `NULL` | `POWER` | Power & Electrical Issues |
| `sub-no-boot` | `cat-power` | `POWER_NO_BOOT` | PC Does Not Power On |
| `cat-display` | `NULL` | `DISPLAY` | Monitor & Display Problems |

---

## 7. `tickets`
Defect reports submitted by teachers. Integrates with Member 3's Jira Service Management.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `VARCHAR(50)` | No | — | `PRIMARY KEY` | Human-friendly ticket ID (e.g. `LAB-1001`) |
| `ticket_number`| `SERIAL` | No | Auto-increment | `UNIQUE` | Sequential integer for fast lookup |
| `reporter_id` | `UUID` | No | — | `REFERENCES users(id) ON DELETE RESTRICT` | Reporting faculty member |
| `pc_id` | `UUID` | No | — | `REFERENCES pcs(id) ON DELETE RESTRICT` | Defective workstation |
| `category_id` | `VARCHAR(50)` | No | — | `REFERENCES ticket_categories(id) ON DELETE RESTRICT` | Primary defect category |
| `subcategory_id`| `VARCHAR(50)`| Yes | `NULL` | `REFERENCES ticket_categories(id) ON DELETE RESTRICT`| Specific defect subcategory |
| `urgency` | `VARCHAR(20)` | No | `'LOW'` | `CHECK (LOW, MEDIUM, HIGH, CRITICAL)` | Prioritization level |
| `status` | `VARCHAR(30)` | No | `'SUBMITTED'` | `CHECK (SUBMITTED, ACKNOWLEDGED, IN_PROGRESS, WAITING_FOR_INFO, FIXED, AWAITING_VERIFICATION, CLOSED, REOPENED)` | Current lifecycle state |
| `description` | `TEXT` | No | — | — | Problem narrative submitted by teacher |
| `remarks` | `TEXT` | Yes | `NULL` | — | Optional internal triage notes |
| `assigned_to` | `UUID` | Yes | `NULL` | `REFERENCES users(id) ON DELETE SET NULL` | Assigned support technician |
| `jira_issue_key`| `VARCHAR(50)`| Yes | `NULL` | `UNIQUE` | External Jira Issue Key (e.g. `JSM-1042`) |
| `jira_issue_id` | `VARCHAR(100)`| Yes | `NULL` | — | Atlassian internal numeric ID |
| `resolved_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Timestamp when technician marked fixed |
| `closed_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Timestamp when faculty confirmed repair |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Managed by trigger | Timestamp of last modification |

### Sample Data
| id | reporter_id | pc_id | urgency | status | jira_issue_key |
|---|---|---|---|---|---|
| `LAB-1001` | `5b2f8c1e-...-0001` | `a0000000-...-0001` | `HIGH` | `SUBMITTED` | `JSM-1042` |

---

## 8. `ticket_events`
Immutable audit log recording every state transition, assignment, and sync outcome.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Event identifier |
| `ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Associated ticket |
| `event_type` | `VARCHAR(50)` | No | — | `CHECK (SUBMITTED, ACKNOWLEDGED, IN_PROGRESS, ...)` | Action type identifier |
| `actor_id` | `UUID` | Yes | `NULL` | `REFERENCES users(id) ON DELETE SET NULL` | User who triggered the action |
| `note` | `TEXT` | Yes | `NULL` | — | Audit comment or automated system note |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Event timestamp |

---

## 9. `ticket_comments`
Communication thread between faculty and IT support personnel.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Comment identifier |
| `ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Associated ticket |
| `author_id` | `UUID` | No | — | `REFERENCES users(id) ON DELETE RESTRICT` | Comment author |
| `body` | `TEXT` | No | — | — | Message content |
| `visibility` | `VARCHAR(20)` | No | `'PUBLIC'` | `CHECK (PUBLIC, INTERNAL)` | Scope: visible to teacher or internal IT only |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Posting timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Managed by trigger | Modification timestamp |

---

## 10. `ticket_information`
Structured clarification dialogue when a technician marks an issue `WAITING_FOR_INFO`.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Request identifier |
| `ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Associated ticket |
| `requested_by`| `UUID` | No | — | `REFERENCES users(id) ON DELETE RESTRICT` | Technician requesting details |
| `question` | `TEXT` | No | — | — | Question prompt displayed to teacher |
| `provided_by` | `UUID` | Yes | `NULL` | `REFERENCES users(id) ON DELETE SET NULL` | Teacher providing answer |
| `response` | `TEXT` | Yes | `NULL` | — | Response text submitted by teacher |
| `requested_at`| `TIMESTAMPTZ`| No | `CURRENT_TIMESTAMP` | — | Inquiry timestamp |
| `responded_at`| `TIMESTAMPTZ`| Yes | `NULL` | — | Answer timestamp |

---

## 11. `ticket_links`
Bidirectional relationship tracking for duplicate reports and issue dependencies.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Link identifier |
| `source_ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Origin ticket |
| `target_ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Target ticket |
| `link_type` | `VARCHAR(30)` | No | — | `CHECK (DUPLICATE_OF, RELATES_TO, BLOCKS, DEPENDS_ON)` | Relationship classification |
| `created_by` | `UUID` | Yes | `NULL` | `REFERENCES users(id) ON DELETE SET NULL` | Administrator/technician who created link |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | `UNIQUE(source_ticket_id, target_ticket_id, link_type)` | Creation timestamp |

---

## 12. `repair_records`
Servicing log capturing spare parts replaced, labor hours, and maintenance costs.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Repair log identifier |
| `ticket_id` | `VARCHAR(50)` | Yes | `NULL` | `REFERENCES tickets(id) ON DELETE SET NULL` | Optional associated ticket |
| `pc_id` | `UUID` | No | — | `REFERENCES pcs(id) ON DELETE RESTRICT` | Repaired workstation |
| `technician_id`| `UUID` | No | — | `REFERENCES users(id) ON DELETE RESTRICT` | Servicing technician |
| `action_taken`| `TEXT` | No | — | — | Description of repair performed |
| `parts_replaced`| `TEXT` | Yes | `NULL` | — | Spare parts replaced (e.g. "SMPS 450W") |
| `cost` | `NUMERIC(10,2)`| No | `0.00` | `CHECK (cost >= 0)` | Repair/replacement expense in INR |
| `repair_date` | `DATE` | No | `CURRENT_DATE` | — | Date of physical repair |
| `notes` | `TEXT` | Yes | `NULL` | — | Warranty/vendor notes |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Logging timestamp |

---

## 13. `sync_events`
Transactional outbound queue and audit trail for Atlassian Jira Service Management sync.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Sync event identifier |
| `ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Associated ticket |
| `direction` | `VARCHAR(20)` | No | — | `CHECK (OUTBOUND_TO_JIRA, INBOUND_FROM_JIRA)` | Transmission direction |
| `event_type` | `VARCHAR(50)` | No | — | — | Event name (`TICKET_CREATED`, `STATUS_UPDATE`) |
| `payload` | `JSONB` | No | `'{}'` | — | Full JSON serialized transmission payload |
| `status` | `VARCHAR(20)` | No | `'PENDING'` | `CHECK (PENDING, SUCCESS, FAILED, RETRY)` | Processing queue status |
| `error_message`| `TEXT` | Yes | `NULL` | — | Last error trace returned from API |
| `retry_count` | `INT` | No | `0` | `CHECK (retry_count >= 0)` | Number of dispatch attempts made |
| `synced_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Timestamp of successful transmission |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Enqueue timestamp |

---

## 14. `attachments`
Metadata for uploaded diagnostic photos, error screenshots, and log files.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `VARCHAR(50)` | No | — | `PRIMARY KEY` | Attachment identifier (e.g. `att-1` or UUID) |
| `ticket_id` | `VARCHAR(50)` | No | — | `REFERENCES tickets(id) ON DELETE RESTRICT` | Parent ticket |
| `comment_id` | `UUID` | Yes | `NULL` | `REFERENCES ticket_comments(id) ON DELETE SET NULL` | Optional parent comment |
| `uploader_id` | `UUID` | No | — | `REFERENCES users(id) ON DELETE RESTRICT` | User who uploaded the file |
| `file_name` | `VARCHAR(255)`| No | — | — | Cryptographically randomized server filename |
| `original_name`| `VARCHAR(255)`| No | — | — | Original client filename |
| `mime_type` | `VARCHAR(100)`| No | — | — | Verified MIME type (`image/png`, `application/pdf`) |
| `file_size` | `BIGINT` | No | — | `CHECK (file_size > 0)` | File size in bytes (max 10MB) |
| `file_path` | `TEXT` | No | — | — | Absolute server storage path (outside web root) |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Upload timestamp |

---

## 15. `notifications`
In-app notification messages delivered to faculty members and technicians.

| Column Name | Data Type | Nullable | Default | Constraints / References | Description |
|---|---|:---:|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | `PRIMARY KEY` | Notification identifier |
| `recipient_id`| `UUID` | No | — | `REFERENCES users(id) ON DELETE CASCADE` | Target user |
| `ticket_id` | `VARCHAR(50)` | Yes | `NULL` | `REFERENCES tickets(id) ON DELETE CASCADE` | Optional related ticket |
| `type` | `VARCHAR(50)` | No | — | `CHECK (TICKET_SUBMITTED, TICKET_ACKNOWLEDGED, ...)` | Notification category |
| `title` | `VARCHAR(200)`| No | — | — | Headline summary |
| `message` | `TEXT` | No | — | — | Full notification body text |
| `is_read` | `BOOLEAN` | No | `false` | — | Read status toggle |
| `read_at` | `TIMESTAMPTZ` | Yes | `NULL` | — | Timestamp when user marked read |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Dispatch timestamp |
