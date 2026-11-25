-- Pre-uploaded files must exist before a ticket is created so that ticket and
-- comment requests can link them atomically. Keep the foreign key when linked.
ALTER TABLE attachments
  ALTER COLUMN ticket_id DROP NOT NULL;
