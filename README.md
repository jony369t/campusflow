# CampusFlow AI

**CampusFlow AI** is a full-stack, role-aware university information, class routine, academic calendar, and AI notice assistant platform designed for students, class representatives (CRs), teachers, and administrators. Initially pre-configured for **CSE 60E** (*Department of Computer Science & Engineering*), its multi-tenant schema supports multiple departments, classes, and courses.

## Key Capabilities

1. **Centralized Notice & Announcement Management**: Draft, approval queue (`pending_approval`), published, rejected, and archived states; category filtering (`General`, `Examination`, `Assignment`, `Class Routine`, `Department`, `Event`, `Emergency`); pinning; attachment validation; and read counters.
2. **Role-Based Access Control (RBAC) & Object-Level Security**:
   - **Student**: View authorized class notices, weekly routine, academic events, notifications, approved teacher directory, AI summaries, and source-grounded AI Q&A.
   - **Class Representative (CR)**: All student capabilities + create/edit class notices (routed to approval queue unless `canPublishDirectly` is granted), manage routine entries and events for assigned class.
   - **Teacher**: Publish course announcements, approve CR submissions, manage routine slots and course events.
   - **Administrator**: Manage users, roles, departments, classes, courses, notice approval queue, and security audit logs.
3. **Weekly Class Routine with Conflict Detection**: Weekly timetable grid, mobile-friendly cards, today's classes, next-class indicator, and server-side overlap conflict validation (`409 CONFLICT`).
4. **Academic Calendar & Deadlines**: Track CT, Midterm, Final exams, Assignment deadlines, Presentations, Lab assessments, University events, and Holidays with invalid-date prevention and same-day conflict flags.
5. **Database-Backed Notification Center**: Deduplicated in-app notifications (`dedupeKey` unique index per user) with unread counters and mark-as-read actions.
6. **AI Notice Assistant (OpenAI-Compatible Provider Abstraction)**:
   - **Bilingual Notice Summarization (`en` / `bn` বাংলা)**: Cached against `notice.version` so notice edits automatically invalidate stale summaries.
   - **Structured Information Extraction**: Schema-validated JSON extraction of dates, deadlines, course codes, exam types, and action items (requires human approval before creating official calendar events).
   - **Source-Grounded Question Answering (RAG)**: Answers student questions strictly from authorized, published notices with clickable notice citations and prompt-injection sanitization.

## Required Runtime & Tech Stack

- **Node.js**: `>=18.18.0` (tested on Node v18.20.4 / v20 LTS)
- **Frontend (`client/`)**: React 18, Vite 5, TypeScript 5, Tailwind CSS 3, React Router 6, TanStack Query 5, React Hook Form, Zod, Lucide React
- **Backend (`server/`)**: Node.js, Express, TypeScript, MongoDB & Mongoose 8, Zod, HTTP-only Cookie + Double-Submit CSRF + JWT Auth, Express Rate Limit, Helmet

## Local Setup & Run Commands

```bash
# 1. Clone and install dependencies across workspaces
npm install

# 2. Configure environment variables
cp .env.example server/.env
cp .env.example client/.env

# 3. Seed realistic development data (CSE 60E, 4 courses, teachers, CR, student, notices, routine, events)
npm run seed

# 4. Start backend (http://localhost:4000) and frontend (http://localhost:5173)
npm run dev:server
npm run dev:client

# 5. Run automated integration & E2E verification test suite
npm test
```

## Development Demo Accounts (Created by `npm run seed`)

| Role | Name | Email | Password | Scope / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Tasnia Kabir | `tasnia.60e@univ.edu.bd` | `CampusFlow#2026` | Enrolled in `CSE-60E` |
| **Class Rep (CR)** | Rafsan Jani | `rafsan.cr60e@univ.edu.bd` | `CampusFlow#2026` | Assigned to `CSE-60E` |
| **Teacher** | Dr. Farhana Rahman | `farhana.cse@univ.edu.bd` | `CampusFlow#2026` | `CSE-321`, `CSE-325` |
| **Administrator** | Dr. Mahmudul Hasan | `admin@univ.edu.bd` | `CampusFlow#2026` | Full system & audit access |

## Known Limitations & Future Improvements

- **Real-Time Delivery**: The MVP uses database-backed notifications with TanStack Query polling (`30s` interval) rather than WebSockets or Web Push.
- **Search Retrieval**: AI Question Answering currently uses MongoDB text/keyword filtering over authorized published notices; vector embeddings (`Atlas Vector Search`) can be enabled once notice volume exceeds several thousand documents.
- **Email Delivery**: Password reset tokens are logged/prepared via a transport abstraction; configure an SMTP/Resend provider in production to dispatch emails.
