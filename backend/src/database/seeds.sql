-- ==============================================================================
-- CampusCare â€“ College Lab IT Support System
-- PostgreSQL Seed Data: seeds.sql
-- ==============================================================================
-- NOTE:
-- SECTION A: INSTITUTIONAL MASTER DATA (Required in all environments)
-- SECTION B: DEVELOPMENT SAMPLE DATA (For local development & testing only)
-- ==============================================================================

-- ==============================================================================
-- SECTION A: INSTITUTIONAL MASTER DATA
-- ==============================================================================

-- 1. Institutional Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'TEACHER', 'College faculty reporting computer laboratory hardware and software issues'),
(2, 'TECHNICIAN', 'Laboratory technical staff responsible for resolving issues and maintaining PCs'),
(3, 'ADMIN', 'College IT Administrator overseeing all laboratories, users, and ticket workflows'),
(4, 'LAB_ASSISTANT', 'Assistant staff performing daily checks and preliminary PC inspections')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Reset roles sequence
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Master Ticket Categories & Subcategories
-- Primary Categories
INSERT INTO ticket_categories (id, parent_id, code, name, description) VALUES
('cat-power', NULL, 'POWER', 'Power Issues', 'Problems related to PC power supply, startup, or unexpected shutdowns'),
('cat-display', NULL, 'DISPLAY', 'Display / Monitor', 'Issues involving monitor display, flickering, blank screens, or cable connections'),
('cat-input', NULL, 'INPUT', 'Keyboard / Mouse', 'Malfunctioning keyboards, unresponsive mice, or USB connectivity issues'),
('cat-network', NULL, 'NETWORK', 'Network / Internet', 'LAN connectivity loss, IP configuration issues, or slow laboratory network'),
('cat-software', NULL, 'SOFTWARE', 'Software Issues', 'Installed software crashes, license validation errors, or operating system issues'),
('cat-peripheral', NULL, 'PERIPHERAL', 'Peripheral Issues', 'External lab hardware including lab printers, projectors, and speakers'),
('cat-other', NULL, 'OTHER', 'Other', 'General or miscellaneous laboratory hardware/environmental issues')
ON CONFLICT (id) DO NOTHING;

-- Subcategories
INSERT INTO ticket_categories (id, parent_id, code, name, description) VALUES
('sub-not-starting', 'cat-power', 'POWER', 'PC not starting', 'PC does not power on or lights do not turn on'),
('sub-sudden-shutdown', 'cat-power', 'POWER', 'Sudden shutdown', 'PC turns off unexpectedly during lab sessions'),
('sub-power-other', 'cat-power', 'POWER', 'Other Power Issue', 'Other power supply or adapter related issues'),

('sub-no-display', 'cat-display', 'DISPLAY', 'No display', 'Monitor indicates No Signal or remains completely blank'),
('sub-flickering', 'cat-display', 'DISPLAY', 'Flickering', 'Screen flickers or shows lines intermittently'),
('sub-distorted', 'cat-display', 'DISPLAY', 'Distorted screen', 'Resolution issues or abnormal colors on monitor'),
('sub-display-other', 'cat-display', 'DISPLAY', 'Other Display Issue', 'Other monitor, HDMI, or VGA cable defects'),

('sub-keyboard', 'cat-input', 'INPUT', 'Keyboard not working', 'Specific keys or entire keyboard unresponsive'),
('sub-mouse', 'cat-input', 'INPUT', 'Mouse not responding', 'Mouse pointer jumps, clicks do not register, or scroll wheel broken'),
('sub-input-other', 'cat-input', 'INPUT', 'Other Input Issue', 'Other input devices or port issues'),

('sub-no-internet', 'cat-network', 'NETWORK', 'No internet', 'PC cannot reach external internet or campus intranet'),
('sub-lan', 'cat-network', 'NETWORK', 'LAN disconnected', 'Network cable unplugged status or damaged RJ45 jack'),
('sub-network-other', 'cat-network', 'NETWORK', 'Other Network Issue', 'DNS, proxy, or lab switch failure'),

('sub-app-not-opening', 'cat-software', 'SOFTWARE', 'Application not opening', 'Required IDE or software crashes immediately on open'),
('sub-software-error', 'cat-software', 'SOFTWARE', 'Software error', 'Runtime errors, missing libraries, or compiler setup errors'),
('sub-software-other', 'cat-software', 'SOFTWARE', 'Other Software Issue', 'Operating system updates or antivirus blocking'),

('sub-printer', 'cat-peripheral', 'PERIPHERAL', 'Printer', 'Lab shared printer offline, paper jam, or driver issue'),
('sub-speakers', 'cat-peripheral', 'PERIPHERAL', 'Speakers', 'No audio or distorted audio output during practical sessions'),
('sub-usb', 'cat-peripheral', 'PERIPHERAL', 'USB ports', 'Front or rear USB ports not detecting flash drives'),
('sub-peripheral-other', 'cat-peripheral', 'PERIPHERAL', 'Other Peripheral', 'Miscellaneous external device failures')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- SECTION B: DEVELOPMENT SAMPLE DATA (MOCK / TEST RECORDS)
-- ==============================================================================

-- 3. Institutional Campus Blocks
INSERT INTO blocks (id, name, description) VALUES
('blk-a', 'Block A', 'Engineering Academic Wing - Computer Engineering & IT'),
('blk-b', 'Block B', 'Science & Research Wing - Networking & AI Labs')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Laboratories
INSERT INTO labs (id, block_id, lab_name, room_number, code, pc_count) VALUES
('room-522', 'blk-a', 'Computer Lab 1', '522', 'A', 20),
('room-523', 'blk-a', 'Computer Lab 2', '523', 'B', 16),
('room-610', 'blk-b', 'Networking Lab', '610', 'N', 12),
('room-614', 'blk-b', 'AI & Data Science Lab', '614', 'D', 12)
ON CONFLICT (id) DO NOTHING;

-- 5. Sample Users
-- Password for all sample users is: password123 (hashed with bcrypt 10 rounds)
-- Hash: $2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO
INSERT INTO users (id, role_id, email, password_hash, full_name, phone, department, designation, account_status) VALUES
('5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 1, 'teacher@college.edu', '$2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO', 'Prof. Anjali Deshmukh', '9820012345', 'Computer Engineering', 'Assistant Professor', 'ACTIVE'),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000002', 1, 'other.teacher@college.edu', '$2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO', 'Prof. Rahul Mehta', '9819098765', 'Information Technology', 'Associate Professor', 'ACTIVE'),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000003', 1, 'pending.teacher@college.edu', '$2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO', 'Prof. Sneha Kulkarni', '9833011223', 'Electronics & Telecommunication', 'Assistant Professor', 'PENDING'),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 2, 'tech@college.edu', '$2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO', 'Suresh Patil', '9821054321', 'Campus IT Support', 'Senior Lab Technician', 'ACTIVE'),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000005', 3, 'admin@college.edu', '$2a$10$gyyYt8.Fhz8DGJsgbNG1uuptm6U0NrC5PcyjHLtbowq21j88l/bjO', 'Dr. Arvind Sharma', '9820099887', 'Information Technology', 'Head of IT Infrastructure', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Sample PCs (Synchronized with Member 1 & Member 4 Asset IDs)
INSERT INTO pcs (id, lab_id, pc_number, asset_id, qr_token, display_code, status, notice, can_report) VALUES
-- Room 522 (Computer Lab 1)
('5b2f8c1e-4d3a-4c6b-9e7f-000000000101', 'room-522', 1, 'ENG-522-PC-01', 'qr-campuscare-522-01', '522/A/1', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000102', 'room-522', 2, 'ENG-522-PC-02', 'qr-campuscare-522-02', '522/A/2', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000103', 'room-522', 3, 'ENG-522-PC-03', 'qr-campuscare-522-03', '522/A/3', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000107', 'room-522', 7, 'ENG-522-PC-07', 'qr-campuscare-522-07', '522/A/7', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000112', 'room-522', 12, 'ENG-522-PC-12', 'qr-campuscare-522-12', '522/A/12', 'WORKING', NULL, true),

-- Room 523 (Computer Lab 2)
('5b2f8c1e-4d3a-4c6b-9e7f-000000000202', 'room-523', 2, 'ENG-523-PC-02', 'qr-campuscare-523-02', '523/B/2', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000204', 'room-523', 4, 'ENG-523-PC-04', 'qr-campuscare-523-04', '523/B/4', 'UNDER_MAINTENANCE', 'RAM upgrade scheduled this week.', true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000207', 'room-523', 7, 'ENG-523-PC-07', 'qr-campuscare-523-07', '523/B/7', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000211', 'room-523', 11, 'ENG-523-PC-11', 'qr-campuscare-523-11', '523/B/11', 'WORKING', NULL, true),

-- Room 610 (Networking Lab)
('5b2f8c1e-4d3a-4c6b-9e7f-000000000302', 'room-610', 2, 'ENG-610-PC-02', 'qr-campuscare-610-02', '610/N/2', 'NOT_IN_SERVICE', 'Awaiting replacement motherboard.', true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000305', 'room-610', 5, 'ENG-610-PC-05', 'qr-campuscare-610-05', '610/N/5', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000307', 'room-610', 7, 'ENG-610-PC-07', 'qr-campuscare-610-07', '610/N/7', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000309', 'room-610', 9, 'ENG-610-PC-09', 'qr-campuscare-610-09', '610/N/9', 'NOT_IN_SERVICE', 'This PC has been removed from the lab. Please speak to the lab technician directly.', false),

-- Room 614 (AI & Data Science Lab)
('5b2f8c1e-4d3a-4c6b-9e7f-000000000401', 'room-614', 1, 'ENG-614-PC-01', 'qr-campuscare-614-01', '614/D/1', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000403', 'room-614', 3, 'ENG-614-PC-03', 'qr-campuscare-614-03', '614/D/3', 'WORKING', NULL, true),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000408', 'room-614', 8, 'ENG-614-PC-08', 'qr-campuscare-614-08', '614/D/8', 'WORKING', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 7. Sample Tickets
INSERT INTO tickets (id, reporter_id, pc_id, category_id, subcategory_id, urgency, status, description, remarks, assigned_to, jira_issue_key, jira_issue_id) VALUES
('LAB-1012', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000112', 
 'cat-display', 'sub-flickering', 'HIGH', 'IN_PROGRESS', 
 'Monitor flickers every few seconds and sometimes goes black for a moment. Students cannot read the screen.', 
 'Happens more after the PC has been on for 30+ minutes.', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'JSM-1012', '10012'),

('LAB-1011', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000207', 
 'cat-input', 'sub-keyboard', 'MEDIUM', 'WAITING_FOR_INFO', 
 'Several keys on the keyboard are not typing.', 
 NULL, 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'JSM-1011', '10011'),

('LAB-1010', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000305', 
 'cat-network', 'sub-no-internet', 'CRITICAL', 'AWAITING_VERIFICATION', 
 'No internet on any PC in the Networking Lab. Practical session had to be stopped.', 
 'Affects the whole of room 610.', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'JSM-1010', '10010'),

('LAB-1009', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000103', 
 'cat-power', 'sub-not-starting', 'HIGH', 'FIXED', 
 'PC does not power on. No lights on the cabinet.', 
 NULL, 
 '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'JSM-1009', '10009')
ON CONFLICT (id) DO NOTHING;

-- 8. Sample Ticket Events
INSERT INTO ticket_events (ticket_id, event_type, actor_id, note) VALUES
('LAB-1012', 'SUBMITTED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'Ticket submitted via QR scan on PC 522/A/12'),
('LAB-1012', 'ACKNOWLEDGED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Technician acknowledged request and assigned to self'),
('LAB-1012', 'IN_PROGRESS', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Inspected VGA cable; requested replacement monitor'),

('LAB-1011', 'SUBMITTED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'Ticket submitted for keyboard issue'),
('LAB-1011', 'ACKNOWLEDGED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Acknowledged by lab team'),
('LAB-1011', 'WAITING_FOR_INFO', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Requested details on affected keys from teacher'),

('LAB-1010', 'SUBMITTED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'Critical network outage reported in room 610'),
('LAB-1010', 'ACKNOWLEDGED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Prioritized by network admin'),
('LAB-1010', 'IN_PROGRESS', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Replacing network switch in rack 2'),
('LAB-1010', 'FIXED', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Network switch replaced and tested'),
('LAB-1010', 'AWAITING_VERIFICATION', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Pending teacher verification');

-- 9. Sample Comments
INSERT INTO ticket_comments (ticket_id, author_id, body, visibility) VALUES
('LAB-1012', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Checked the VGA cable and swapped it; the flicker continues. A replacement monitor has been requested.', 'PUBLIC'),
('LAB-1012', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'INTERNAL: monitor is under AMC, raise vendor ticket V-889 before replacing.', 'INTERNAL'),
('LAB-1011', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Is it all keys or only some (for example the number row)? A photo of the keyboard would help.', 'PUBLIC'),
('LAB-1010', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'The network switch in rack 2 has been replaced. All PCs in 610 should now be online. Please confirm.', 'PUBLIC');

-- 10. Sample Repair Record
INSERT INTO repair_records (ticket_id, pc_id, technician_id, action_taken, parts_replaced, cost, notes) VALUES
('LAB-1009', '5b2f8c1e-4d3a-4c6b-9e7f-000000000103', '5b2f8c1e-4d3a-4c6b-9e7f-000000000004', 'Replaced faulty SMPS unit with new 450W power supply', 'SMPS 450W Antec', 1850.00, 'Tested boot cycle 3 times; working normally');

-- 11. Sample Notifications
INSERT INTO notifications (recipient_id, ticket_id, type, title, message, is_read) VALUES
('5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'LAB-1010', 'VERIFICATION_PENDING', 'Please verify the repair', 'LAB-1010 on PC 610/N/5 is ready for your verification.', false),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'LAB-1011', 'INFO_REQUESTED', 'Technician needs more information', 'Reply on LAB-1011 so the technician can continue.', false),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'LAB-1009', 'TICKET_FIXED', 'Marked as fixed', 'The technician marked LAB-1009 on PC 522/A/3 as fixed.', false),
('5b2f8c1e-4d3a-4c6b-9e7f-000000000001', 'LAB-1012', 'TICKET_ACKNOWLEDGED', 'Request acknowledged', 'LAB-1012 has been acknowledged by the lab team.', true);
