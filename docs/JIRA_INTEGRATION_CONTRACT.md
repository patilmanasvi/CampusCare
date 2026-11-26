# Jira Integration Contract (Current Backend Surface)

This note records the integration fields and route currently present in the backend. Jira setup, an outbound worker, and the production webhook configuration are outside this checkout. Coordinate the final mapping and security with Member 3 before enabling synchronization.

## Stored fields

- `tickets.id` is CampusCare's internal ticket ID.
- `tickets.jira_issue_key` is a unique external issue key (for example, `JSM-1042`).
- `tickets.jira_issue_id` stores the external issue ID.
- `sync_events` stores ticket ID, direction (`OUTBOUND_TO_JIRA` or `INBOUND_FROM_JIRA`), event type, JSON payload, status, retry count, error and sync timestamps.
- `ticket_events` supports lifecycle history. Ticket statuses are constrained in `schema.sql`.

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [JIRA_BACKEND_HANDOFF.md](JIRA_BACKEND_HANDOFF.md) for the schema and proposed member responsibilities/mappings.

## Inbound route

`PATCH /api/tickets/:id/jira-sync` is mounted by `backend/src/routes/ticketRoutes.js`. It requires authentication and an `ADMIN` or `TECHNICIAN` role. The controller currently reads this JSON body:

```json
{
  "jiraIssueKey": "JSM-1042",
  "jiraIssueId": "10042",
  "status": "IN_PROGRESS",
  "comment": "Technician started work",
  "technicianName": "Assigned technician"
}
```

The `status` must be a CampusCare ticket status accepted by the ticket service/schema. On success, the endpoint returns `success`, `message`, `ticketId`, `jiraIssueKey`, and the resulting `status`. The implementation is in `backend/src/controllers/ticketController.js` and `backend/src/services/ticketService.js`.

## Coordination still required

- Agree on authentication for inbound webhooks; the present route uses application JWT authentication and role checks.
- Confirm Jira status-to-CampusCare status mapping and allowed state transitions.
- Confirm payload fields, comment visibility, duplicate/retry behavior, and how sync events are created/consumed.
- The checked-in backend has no Jira worker or Jira client configuration. Do not assume outbound issue creation is active.
