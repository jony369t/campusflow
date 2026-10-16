# CampusFlow AI — REST API Reference

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

## Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticates user, sets `campusflow_session` HTTP-only cookie and `campusflow_csrf` token. |
| `POST` | `/api/auth/logout` | Authenticated | Clears session and CSRF cookies and logs `USER_LOGOUT` audit event. |
| `GET` | `/api/auth/me` | Authenticated | Returns current user profile, role, class memberships, and university timezone (`Asia/Dhaka`). |

## Notices (`/api/notices`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notices` | Authenticated | Paginated list of notices filtered by `category`, `search`, `status`, and user's authorized class/course scope. |
| `GET` | `/api/notices/:id` | Authenticated (Scoped) | Returns notice details and increments `readCount`. Blocks unpublished or cross-class access (`403`). |
| `POST` | `/api/notices` | `cr`, `teacher`, `admin` | Creates a notice. CRs without `canPublishDirectly` default to `pending_approval`. |
| `PATCH` | `/api/notices/:id` | Author or `admin` | Updates notice; increments `version` and invalidates cached AI summary when title/body changes. |
| `POST` | `/api/notices/:id/approve` | `teacher`, `admin` | Approves pending notice, sets `publishedAt`, and dispatches deduplicated class notifications. |
| `POST` | `/api/notices/:id/reject` | `teacher`, `admin` | Marks notice as `rejected` with `rejectionReason`. |
| `DELETE` | `/api/notices/:id` | Author or `admin` | Permanently deletes notice and records `NOTICE_DELETED` in audit log. |

## Class Routine (`/api/routine`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/routine` | Authenticated (Scoped) | Lists weekly timetable slots for the requested `classId`. |
| `POST` | `/api/routine` | `cr`, `teacher`, `admin` | Creates a routine slot after verifying no time overlap (`409 CONFLICT`) exists on the same day for the class. |
| `PATCH` | `/api/routine/:id` | `cr`, `teacher`, `admin` | Updates routine entry with conflict detection. |
| `DELETE` | `/api/routine/:id` | `cr`, `teacher`, `admin` | Deletes routine entry. |

## Academic Events & Deadlines (`/api/events`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Authenticated (Scoped) | Lists upcoming exams, assignment deadlines, presentations, lab assessments, and holidays. |
| `POST` | `/api/events` | `cr`, `teacher`, `admin` | Validates `endAt >= startAt`, flags same-day class conflicts (`hasConflictFlag`), and dispatches notifications. |
| `PATCH` | `/api/events/:id` | Creator or `admin` | Updates event details or approval status. |
| `DELETE` | `/api/events/:id` | Creator or `admin` | Deletes academic event. |

## Notifications (`/api/notifications`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Authenticated | Returns latest 50 notifications and `unreadCount` for the current user. |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Marks a single notification (or `all`) as read (`readAt` timestamp). |

## AI Notice Assistant (`/api/ai`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/notices/:id/summarize` | Authenticated (Rate-limited) | Generates or returns version-cached summary in `en` or `bn` (`বাংলা`). |
| `POST` | `/api/ai/notices/:id/extract` | Authenticated (Rate-limited) | Extracts structured dates, deadlines, course codes, exam types, and actions validated by Zod. |
| `POST` | `/api/ai/ask` | Authenticated (Rate-limited) | Answers natural-language questions strictly using authorized, published notices with source citations. |

## Academic & Administration (`/api/classes`, `/api/courses`, `/api/teachers`, `/api/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/classes` | Authenticated | Lists classes and semester metadata. |
| `GET` | `/api/courses` | Authenticated | Lists courses and assigned faculty. |
| `GET` | `/api/teachers` | Authenticated | Searchable Teacher Directory (exposes email/office room only when `publicContactApproved === true`). |
| `GET` | `/api/admin/users` | `admin` | Lists all users and role assignments. |
| `PATCH` | `/api/admin/users/:id` | `admin` | Updates user role, `isActive`, `canPublishDirectly`, class memberships, or course assignments. |
| `GET` | `/api/admin/audit-logs` | `admin` | Returns immutable security and administrative audit trail. |
