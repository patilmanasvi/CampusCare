-- ==============================================================================
-- CampusCare â€“ College Lab IT Support System
-- PostgreSQL Database Schema: campuscare_db
-- Author: Member 2 (Backend & Database Engineer)
-- ==============================================================================

-- Enable UUID extension for secure, distributed identifier generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ROLES TABLE
-- Defines user permissions and roles within the institution
-- ==============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. USERS TABLE
-- Institutional users (Teachers, Technicians, Lab Assistants, Administrators)
-- Passwords MUST be stored hashed using bcrypt (never in plain text)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25),
    department VARCHAR(100),
    designation VARCHAR(100),
    avatar_url TEXT,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (account_status IN ('ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. BLOCKS TABLE
-- Campus buildings/blocks housing computer laboratories
-- ==============================================================================
CREATE TABLE IF NOT EXISTS blocks (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'blk-a', 'blk-b'
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. LABS TABLE (Rooms)
-- Specific laboratories situated inside college blocks
-- ==============================================================================
CREATE TABLE IF NOT EXISTS labs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'room-522', 'room-523'
    block_id VARCHAR(50) NOT NULL REFERENCES blocks(id) ON DELETE RESTRICT,
    lab_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL, -- Short code e.g. 'A', 'B', 'N', 'D'
    pc_count INT NOT NULL DEFAULT 0 CHECK (pc_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_block_room UNIQUE (block_id, room_number)
);

-- ==============================================================================
-- 5. PCS TABLE
-- Individual computers in laboratories. Coordinated with Member 4 (Admin Dashboard).
-- Includes unique QR token for teacher QR scanner and institutional asset tag.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id VARCHAR(50) NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
    pc_number INT NOT NULL CHECK (pc_number > 0),
    asset_id VARCHAR(64) UNIQUE, -- Member 4 Institutional Asset ID (e.g. 'ENG-LAB-A-012')
    qr_token VARCHAR(128) UNIQUE NOT NULL, -- Secure token encoded in QR sticker
    display_code VARCHAR(50) NOT NULL, -- e.g. '522/A/1'
    status VARCHAR(30) NOT NULL DEFAULT 'WORKING' 
        CHECK (status IN ('WORKING', 'UNDER_MAINTENANCE', 'NOT_IN_SERVICE')),
    notice TEXT,
    can_report BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true, -- Soft deletion flag: historical tickets remain intact
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lab_pc_number UNIQUE (lab_id, pc_number)
);

-- ==============================================================================
-- 6. TICKET CATEGORIES TABLE
-- Issue categories and subcategories (hierarchical parent-child relationship)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_categories (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'cat-power', 'sub-not-starting'
    parent_id VARCHAR(50) REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL, -- e.g. 'POWER', 'DISPLAY', 'INPUT', 'NETWORK', 'SOFTWARE', 'PERIPHERAL', 'OTHER'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. TICKETS TABLE
-- Support requests submitted by teachers. 
-- Historical tickets are preserved even if teacher or PC is deactivated (RESTRICT FK).
-- Jira Service Management issue identifiers are stored separately from internal IDs.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'LAB-1001'
    ticket_number SERIAL UNIQUE, -- Internal sequential number
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pc_id UUID NOT NULL REFERENCES pcs(id) ON DELETE RESTRICT,
    category_id VARCHAR(50) NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    subcategory_id VARCHAR(50) REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    urgency VARCHAR(20) NOT NULL DEFAULT 'LOW' 
        CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' 
        CHECK (status IN ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'FIXED', 'AWAITING_VERIFICATION', 'CLOSED', 'REOPENED')),
    description TEXT NOT NULL,
    remarks TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Jira Integration fields (Member 3) - kept distinct from internal id
    jira_issue_key VARCHAR(50) UNIQUE, -- e.g. 'JSM-1042'
    jira_issue_id VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. TICKET EVENTS TABLE
-- Immutable lifecycle timeline events preserving full audit and progress history
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO',
        'FIXED', 'AWAITING_VERIFICATION', 'VERIFIED', 'CLOSED', 'REOPENED',
        'COMMENT_ADDED', 'INFO_PROVIDED', 'ASSIGNED', 'SYNC_SUCCESS', 'SYNC_FAILED'
    )),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. TICKET COMMENTS TABLE
-- Public communication between teacher & technician, plus internal technician notes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' 
        CHECK (visibility IN ('PUBLIC', 'INTERNAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. TICKET INFORMATION TABLE
-- Structured request/response records when technician requests more info (WAITING_FOR_INFO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    question TEXT NOT NULL,
    provided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    response TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ
);

-- ==============================================================================
-- 11. TICKET LINKS TABLE
-- Relationship linking between tickets (e.g. duplicates, related issues, dependencies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    target_ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    link_type VARCHAR(30) NOT NULL 
        CHECK (link_type IN ('DUPLICATE_OF', 'RELATES_TO', 'BLOCKS', 'DEPENDS_ON')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_no_self_link CHECK (source_ticket_id <> target_ticket_id),
    CONSTRAINT uq_ticket_link UNIQUE (source_ticket_id, target_ticket_id, link_type)
);

-- ==============================================================================
-- 12. REPAIR RECORDS TABLE
-- Hardware & software servicing logs, spare parts replaced, and maintenance costs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS repair_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE SET NULL,
    pc_id UUID NOT NULL REFERENCES pcs(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_taken TEXT NOT NULL,
    parts_replaced TEXT, -- e.g. 'SMPS 450W, DDR4 8GB RAM'
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    repair_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 13. SYNC EVENTS TABLE
-- Audit log and retry queue for Jira Service Management synchronization (Member 3)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    direction VARCHAR(20) NOT NULL 
        CHECK (direction IN ('OUTBOUND_TO_JIRA', 'INBOUND_FROM_JIRA')),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRY')),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 14. ATTACHMENTS TABLE
-- Uploaded diagnostic screenshots, photos, and log files
-- ==============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'att-1' or UUID
    ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE RESTRICT,
    comment_id UUID REFERENCES ticket_comments(id) ON DELETE SET NULL,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 15. NOTIFICATIONS TABLE
-- Real-time notifications for teachers and technicians
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'TICKET_SUBMITTED', 'TICKET_ACKNOWLEDGED', 'INFO_REQUESTED',
        'TICKET_FIXED', 'VERIFICATION_PENDING', 'TICKET_CLOSED',
        'TICKET_REOPENED', 'SYSTEM'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- PERFORMANCE & INTEGRITY INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_labs_block_id ON labs(block_id);
CREATE INDEX IF NOT EXISTS idx_pcs_lab_id ON pcs(lab_id);
CREATE INDEX IF NOT EXISTS idx_pcs_qr_token ON pcs(qr_token);
CREATE INDEX IF NOT EXISTS idx_pcs_asset_id ON pcs(asset_id);
CREATE INDEX IF NOT EXISTS idx_tickets_reporter_id ON tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_pc_id ON tickets(pc_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_jira_issue_key ON tickets(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_info_ticket_id ON ticket_information(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_links_source ON ticket_links(source_ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_links_target ON ticket_links(target_ticket_id);
CREATE INDEX IF NOT EXISTS idx_repair_records_pc_id ON repair_records(pc_id);
CREATE INDEX IF NOT EXISTS idx_repair_records_ticket_id ON repair_records(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_ticket_id ON sync_events(ticket_id, status);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER FUNCTION
-- Automatically updates timestamp whenever a record is modified
-- ==============================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to mutable tables
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_pcs ON pcs;
CREATE TRIGGER set_timestamp_pcs
BEFORE UPDATE ON pcs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_tickets ON tickets;
CREATE TRIGGER set_timestamp_tickets
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_ticket_comments ON ticket_comments;
CREATE TRIGGER set_timestamp_ticket_comments
BEFORE UPDATE ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
