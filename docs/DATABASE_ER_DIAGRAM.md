# CampusCare Database Entity-Relationship (ER) Diagram

The following Mermaid diagram illustrates the 15 core entities of `campuscare_db`, their attributes, primary keys, foreign keys, and cardinalities.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "has"
    BLOCKS ||--o{ LABS : "contains"
    LABS ||--o{ PCS : "houses"
    
    USERS ||--o{ TICKETS : "reports"
    USERS ||--o{ TICKETS : "assigned_to"
    PCS ||--o{ TICKETS : "has_issue_on"
    TICKET_CATEGORIES ||--o{ TICKETS : "categorizes"
    TICKET_CATEGORIES ||--o{ TICKET_CATEGORIES : "subcategories"
    
    TICKETS ||--o{ TICKET_EVENTS : "tracks_history"
    USERS ||--o{ TICKET_EVENTS : "triggered_by"
    
    TICKETS ||--o{ TICKET_COMMENTS : "contains"
    USERS ||--o{ TICKET_COMMENTS : "authors"
    
    TICKETS ||--o{ TICKET_INFORMATION : "requests_more_info"
    USERS ||--o{ TICKET_INFORMATION : "requested_by"
    USERS ||--o{ TICKET_INFORMATION : "provided_by"
    
    TICKETS ||--o{ TICKET_LINKS : "source_ticket"
    TICKETS ||--o{ TICKET_LINKS : "target_ticket"
    
    TICKETS ||--o{ REPAIR_RECORDS : "resolves"
    PCS ||--o{ REPAIR_RECORDS : "serviced"
    USERS ||--o{ REPAIR_RECORDS : "repaired_by"
    
    TICKETS ||--o{ SYNC_EVENTS : "jira_syncs"
    
    TICKETS ||--o{ ATTACHMENTS : "files"
    TICKET_COMMENTS ||--o{ ATTACHMENTS : "comment_files"
    USERS ||--o{ ATTACHMENTS : "uploaded_by"
    
    USERS ||--o{ NOTIFICATIONS : "receives"
    TICKETS ||--o{ NOTIFICATIONS : "alerts_for"

    ROLES {
        int id PK
        varchar name UK
        text description
        timestamp created_at
    }

    USERS {
        uuid id PK
        int role_id FK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone
        varchar department
        varchar designation
        varchar account_status
        timestamp created_at
        timestamp updated_at
    }

    BLOCKS {
        varchar id PK
        varchar name UK
        text description
        timestamp created_at
    }

    LABS {
        varchar id PK
        varchar block_id FK
        varchar lab_name
        varchar room_number
        varchar code
        int pc_count
        timestamp created_at
    }

    PCS {
        uuid id PK
        varchar lab_id FK
        int pc_number
        varchar asset_id UK
        varchar qr_token UK
        varchar display_code
        varchar status
        text notice
        boolean can_report
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    TICKET_CATEGORIES {
        varchar id PK
        varchar parent_id FK
        varchar code
        varchar name
        text description
        boolean is_active
        timestamp created_at
    }

    TICKETS {
        varchar id PK
        int ticket_number UK
        uuid reporter_id FK
        uuid pc_id FK
        varchar category_id FK
        varchar subcategory_id FK
        varchar urgency
        varchar status
        text description
        text remarks
        uuid assigned_to FK
        varchar jira_issue_key UK
        varchar jira_issue_id
        timestamp resolved_at
        timestamp closed_at
        timestamp created_at
        timestamp updated_at
    }

    TICKET_EVENTS {
        uuid id PK
        varchar ticket_id FK
        varchar event_type
        uuid actor_id FK
        text note
        timestamp created_at
    }

    TICKET_COMMENTS {
        uuid id PK
        varchar ticket_id FK
        uuid author_id FK
        text body
        varchar visibility
        timestamp created_at
        timestamp updated_at
    }

    TICKET_INFORMATION {
        uuid id PK
        varchar ticket_id FK
        uuid requested_by FK
        text question
        uuid provided_by FK
        text response
        timestamp requested_at
        timestamp responded_at
    }

    TICKET_LINKS {
        uuid id PK
        varchar source_ticket_id FK
        varchar target_ticket_id FK
        varchar link_type
        uuid created_by FK
        timestamp created_at
    }

    REPAIR_RECORDS {
        uuid id PK
        varchar ticket_id FK
        uuid pc_id FK
        uuid technician_id FK
        text action_taken
        text parts_replaced
        numeric cost
        date repair_date
        text notes
        timestamp created_at
    }

    SYNC_EVENTS {
        uuid id PK
        varchar ticket_id FK
        varchar direction
        varchar event_type
        jsonb payload
        varchar status
        text error_message
        int retry_count
        timestamp synced_at
        timestamp created_at
    }

    ATTACHMENTS {
        varchar id PK
        varchar ticket_id FK
        uuid comment_id FK
        uuid uploader_id FK
        varchar file_name
        varchar original_name
        varchar mime_type
        bigint file_size
        text file_path
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id FK
        varchar ticket_id FK
        varchar type
        varchar title
        text message
        boolean is_read
        timestamp read_at
        timestamp created_at
    }
```
