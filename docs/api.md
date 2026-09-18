# API guide

Machine-readable OpenAPI: `/api/openapi.json` and `docs/openapi.json`. Regenerate with `node --import tsx scripts/generate-openapi.ts`.

All endpoints are prefixed `/api`. Success is `{data, meta?}`; failure is `{error:{message,details?,requestId}}`. List metadata contains total/page/limit where applicable. Pagination is bounded to 100, defaults to 10 clients and 50 operational records. Directory sorting permits `name|createdAt` and `asc|desc`. Search is case-insensitive for textual names/emails/identifiers; phone search uses normalized values.

## Session

1. `GET /auth/csrf` establishes an anonymous cookie and returns `data.csrf`.
2. `POST /auth/login` with `{email,password}` and `X-CSRF-Token`; keep cookies, replace the CSRF token with the response's token.
3. `GET /auth/me` returns current role/workspace/timezone and CSRF token.
4. Send the token for all POST/PATCH actions, including sign-out.

Forgot password accepts `{email}` and requires configured SMTP. Reset accepts `{token,password}`. Account PATCH requires `{name,currentPassword,newPassword?}`.

## Clients and import

Create/update fields are described in the shared Client schema. PATCH requires `version`. Missing optional data is not guessed. Duplicate phone/email returns 409 with authorized candidates; distinct reviewed identities require `allowDuplicate:true` and `duplicateReason`. Unchanged shared contact details do not repeatedly prompt during edits.

Client links and details: `/clients/{id}`, `/clients/{id}/relationships` (`{clientId,type}`), `/clients/{id}/notes` (`{body}`), `/clients/{id}/consents` (`{channel,granted,source}`). Bulk status changes require `{ids,status}` and edit permission. `DELETE /clients/{id}` deletes the client and cascades related contacts, notes, documents, and records (requires edit/admin permission).

CSV template: `/clients/template`. Preview POST `/clients/import/preview` with `{csv}`. The response includes import id and `{row,data,error}` entries. Commit POST `/clients/import/{id}/commit`; valid nonduplicates are inserted transactionally, invalid/duplicate rows are reported, and repeat commits return the stored result. No overwrite mode exists.

## Opportunities

Create: `{clientId,requirement,ownerId,priority,source,notes?,nextAction,nextFollowUp?,stage?}`. Closed initial stages are rejected. Stage action: `{stage,version,reason?}`. Lost and reopening require a reason. Won must use conversion rather than direct stage movement.

`POST /leads/{id}/convert`: `{version,accepted:true,definitionId,identifier}`. Client acceptance is recorded, the existing identity is reused, and one product Application is linked through a unique opportunityId. Retried conversion returns that same product.

## Products and financial events

Product schemas distinguish premiumMinor, principalMinor, expectedCommissionMinor and structured subtype details. All money is an exact nonnegative integer string in paise. Product identifiers are unique inside the workspace.

Create event: `{productId,type,dueDate,amountMinor,recurrenceMonths?}`. The backend assigns amountMeaning and validates event category. Dates are valid ISO calendar dates, not timestamps.

Record payment: `POST /renewals/{id}/payment` with `{reference,amountMinor}`. Reusing the same reference is idempotent. Overpayment, zero/negative amount, and payment to a confirmed event are rejected.

Confirm: `POST /renewals/{id}/complete` with `{version}`. Requires payment/receipt covering the event, except a no-payment review. Confirmation and next-event creation are atomic and safe to retry. Historical event amount/date/product ownership remains intact.

Reminder: `{runAt}` to `/renewals/{id}/reminder`. This schedules an in-app reminder; it does not send unconfigured WhatsApp/email messages. Same event/time deduplicates. Jobs and failures are visible to administrators.

## Follow-ups and communication

Create follow-up: `{clientId,ownerId,channel,dueAt,priority,notes,opportunityId?,productId?,eventId?}`. Optional links must belong to the same client and workspace. PATCH edits/reschedules pending tasks with `version`.

Complete/cancel: `{version,state:'completed'|'cancelled',outcome,nextDueAt?}`. Outcomes: Connected, No answer, Documents requested, Meeting arranged, Not needed. Optional nextDueAt creates the next task in the same transaction. Task state is distinct from computed timing.

Communication events accept `{clientId,channel,event,body?}` where event is Conversation opened, Message prepared, or Manual outcome. The API does not accept an unverified sent/delivered/replied event. A deep link cannot complete a task.

## Documents

`POST /clients/{id}/documents`: multipart field `file`, optional `purpose=Photo`. Allowed signatures/extensions: PDF, PNG, JPEG; 10 MB maximum; photos must be images. Storage missing returns 503. Successful storage creates quarantined metadata and a durable scan job. `GET /documents/{id}/download` is session-authorized controlled streaming, returns 409 until clean, and never exposes a public object URL.

## Administration and exports

Members: GET `/members`; admin POST `{name,email,role,password}`; admin PATCH `/members/{id}` with `{role}`. Existing account emails require manual identity coordination rather than cross-workspace auto-linking. Self-demotion is forbidden.

Catalogue POST: `{name,category,provider}`. Notification read: POST `/notifications/{id}/read`. Job retry: POST `/jobs/{id}/retry`, failed jobs only. Export: `/reports/export?module=clients|renewals|followups`; returns at most 10,000 workspace records, with auditable export activity. Exports are workspace-wide; use directory/list filters for interactive review.
