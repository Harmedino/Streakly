# Streakly

**Small actions. Big consistency.** An Angular personal workspace for habits, notes, money, learning, goals and reflection, with a Node.js/Express/Mongoose backend.

## Run locally

Requires Node.js 22.12+, npm, and MongoDB 7/8. Node 24.19 is used in development.

```sh
npm ci
cp server/.env.example server/.env
# Start MongoDB, or set MONGODB_URI to an existing development database:
docker compose up -d mongo
npm run server             # Terminal 1: Express on port 3000
npm start                  # Terminal 2: Angular on http://localhost:4200, /api proxied to Express
```

Use the exact origin in `APP_ORIGIN`. `http://localhost:4200` and `http://127.0.0.1:4200` are different origins. The default `server/.env.example` supports Angular development. To serve the built app directly from Express, set `APP_ORIGIN=http://localhost:3000` in `server/.env`, run `npm run build`, then open `http://localhost:3000`.

Production: set `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, an authenticated `MONGODB_URI`, `SMTP_URL` and `MAIL_FROM` in the deployment environment. Never put credentials in Angular or commit `.env`. Run `npm run build`, `npm run server:build`, then `npm run server:start` behind an HTTPS reverse proxy. MongoDB must not be publicly exposed. The included Compose file is a loopback-only development database, not a production database deployment.

Password reset links are delivered through the configured SMTP provider. Without SMTP, reset requests explain that email delivery is unavailable; tokens are never returned to the browser or logged. The integration tests use an in-memory test mail transport, available only under `NODE_ENV=test`.

## Accounts and persistence

Sign up or sign in when connected to the backend. Passwords use salted scrypt hashing. Opaque session tokens are stored hashed in MongoDB and delivered only in HttpOnly, SameSite=Strict cookies (Secure in production). Mutation requests require the session's CSRF token and JSON from the configured origin. Every data route is authorized against the session owner; resource IDs never grant access to another user's workspace. Password resets expire in 30 minutes, are single-use and revoke existing sessions.

MongoDB is the source of truth for signed-in accounts. Angular only applies a successful write after server acknowledgment. Revision checks reject concurrent overwrites across tabs/devices. Failed requests leave forms open with their values and an error; session expiry prompts reauthentication without destroying an open form. Refresh reloads the latest server snapshot. New-note drafts are saved in a separate field of the authenticated server workspace and never put into browser localStorage.

An installation served without a backend can still open the legacy browser workspace. Once a browser signs into the server, a non-sensitive `server-required` flag prevents silently falling back to legacy data on a network failure. New account records, passwords, session tokens and server snapshots are not saved in localStorage. Browser preferences and original pre-migration records may remain there. Server account access requires connectivity; an offline PWA is not a database replica or a sync queue.

## Safe browser migration

Signing in does not import browser data automatically. The migration panel validates the original `streakly.data.v1` records, previews counts, offers the original JSON download and requires explicit confirmation. The server keeps a pre-import backup, checks IDs/references, preserves original date-only tracking values, merges non-conflicting records and rejects conflicts without partially importing. Repeating the exact migration is idempotent. A different second migration requires a reviewed JSON restore. The original browser data is never cleared automatically. Invalid records produce a reviewable error and can still be downloaded.

## Fast entry and editing

Income initially asks for amount and source. Expenses ask for amount, category and an optional description. Dates default to today; payment accounts, custom dates and recurring options are under **More Options**. Accounts and savings goals also start with minimal fields. Streaks initially show a name and frequency; templates, appearance, targets and automatic rules are optional. Job applications require company and role. Goals require a title. Records remain editable through prefilled forms.

Learning is a notes workspace: content is required, title is optional, and no URL, time or linked streak is required. A Tiptap WYSIWYG editor immediately displays headings, emphasis, lists, checklists, code blocks, inline code, quotes and links. New HTML notes are allowlist-sanitized on the server and sanitized again by Angular when rendered. Existing Markdown notes retain their original text and formatting until an explicit edit is saved. Desktop uses a list/editor split; phones open a full-page reading and editing workspace. Optional metadata includes tags, category, minutes, links, next steps and a related streak. Notes can be pinned, searched, filtered by category/tag, sorted oldest/newest and browsed by calendar date. The last edit date is shown. New-note drafts autosave to the server; a failed draft save is visibly reported.

## Automatic streaks

Daily and weekly Yes/No streaks can listen for learning notes, actual job applications, expense records, nonempty journal reflections, or completed dated planner tasks. Optional minimums apply to recorded minutes, spending amounts or event counts. The backend reconciles event-derived completion credits on every mutation, including edits, deletion, backdating and rule changes. One completion per activity/date is maintained, unrelated habits stay manual, and the original manual base is preserved when an automatic credit disappears. Archived habits do not gain new automatic dates. Cards explain the trigger and why a day was completed. Manual events remain manual; visiting a page never counts as a completion.

Legacy linked-learning credits also remain supported: duration habits receive minutes, Yes/No habits receive one success per date, and deleting a linked entry restores the manual base. Both mechanisms use local date-only keys and the configured IANA time zone for today. Existing daily, weekday, weekly, monthly, interval and one-time streak calculations remain in place.

## Finance

Amounts use integer minor units (kobo by default) with safe decimal parsing. Supported whole-ledger currencies are NGN, USD, EUR, GBP and CAD. Changing currency never performs FX conversion or relabels existing recorded money; export and reset Finance before changing a nonempty ledger's currency.

Accounts use actual opening balances and dates. Income, expenses and transfers update tracked balances exactly. Unassigned entries affect cash flow without inventing account balances. Own-account transfers are neither income nor spending. Savings contributions earmark money already held; withdrawals release it. Savings-account balances are not counted twice. Backdated edits and deletion validate account/goal allocation history. Optional savings deadlines can be omitted. Monthly recurring payments require explicit confirmation of actual receipts/payments and retain occurrence IDs to avoid duplicates.

**Salary** shows a selected income payment's received, explicitly spent, allocated-to-savings and remaining amounts. Link existing expenses or savings contributions and split funding across multiple income payments. Unknown funding can stay unallocated. Funding links do not move money between accounts. They cannot exceed a record's amount or allocate the same income twice; editing/deleting linked money is validated before saving. Unlinked expenses are never assumed to come from salary.

**Targets** supports monthly income goals, expense limits, net savings targets and source-specific income targets. Overall and category-specific spending budgets remain in **Budgets**. Targets and funding links are editable. Trends, salary category distributions and comparisons use actual stored transactions. CSV export follows active transaction filters and escapes spreadsheet formula prefixes.

## Reset, backup and reports

Export all current records as JSON, or validate and confirm a restore. Before import, migration or reset, the server stores an owner-protected safety backup in MongoDB; Settings can download the most recent one. Backups are retained until separately maintained by the server operator, so include them in the database backup policy.

Section resets explicitly name the affected section, preserve unrelated modules and clear dependent links. Full reset requires typing **RESET** in both UI and API; it clears application records while retaining the account and profile. Confirmation buttons disable while processing, failures keep the dialog open, and a backup export action is available before reset. Single deletions also require confirmation.

Reports explain earnings, spending, net cash flow, largest categories and comparison dates in plain language. They include learning notes/topics/hours/days, active and best streaks, missed scheduled days, automatic completions, completed tasks and goals. Insufficient comparison data is stated explicitly. No forecasts or generated insights are presented as recorded facts.

## Connected goals, jobs, planner and journal

Goals default to a title and optional deadline. **Mark completed** immediately sets a simple goal to 100%, with undo. Milestone goals calculate equally weighted progress (two of five is 40%); each milestone can be completed, renamed, dated, deleted and reordered without changing its ID. Numeric goals use a target, current value and unit, or derive their value from saved job applications, learning hours, savings or successful streak check-ins. Automatic sources are recalculated rather than incremented, so edits and deletions do not double-count. Legacy partial percentage goals retain their progress as numeric percentage goals.

Goal details include progress history, deadlines, milestones and linked notes/tasks. Planner tasks can optionally complete a linked milestone. This is an explicit checkbox, and multiple task credits count once. Undo removes only the task credit; independent manual completion is preserved. Deleting a goal detaches its notes and tasks rather than deleting them. Rescheduling keeps a dated schedule history for historical reports.

Applications track Applied, Assessment, Interview, Offer, Rejected and Withdrawn. Change status directly from a row, open application details, add/edit timeline notes, and manage dated follow-ups with completion/undo. Status changes append audit events that ordinary edits cannot erase. Follow-ups appear in Overview and daily reports. Salary, location, links and interview details remain optional.

Journal entries start with a date and free-writing area. Mood and reflection prompts are optional. Existing prompt-based entries remain readable and editable. Timeline/calendar views, search, editing, confirmed deletion and links to daily reports are supported.

## Daily, weekly and monthly reports

Reports default to **Daily report**, with selected-date navigation. Completed work, pending/missed scheduled work, overdue items, next-day priorities, daily money, budget warnings and learning summaries use real records. Weekly/monthly reports include task outcomes, follow-ups and frequently missed scheduled streaks alongside financial and learning summaries. Overview exposes tasks, follow-ups and goals requiring attention, recent notes, daily cash flow and a link to today's report.

Authenticated reports are generated by Express from the complete owner-scoped MongoDB workspace. The browser does not manufacture a report from paginated lists. Failed report requests show an error/retry state. Original browser-only installations use the same pure report rules locally.

A day ends in the user's configured IANA time zone. Today's unfinished work is **Pending**; past scheduled work is **Missed** or **Overdue**. No absent note or unscheduled task is treated as missed. Weekly/monthly flexible streaks are not missed before their tracking period ends. Task completion dates, goal progress events, status audits and schedule changes support historical review; old records without known timestamps are preserved without inventing completion times.

## Repository and deployment

```text
client/                       Angular workspace, assets and package.json
  src/app/core/models/        Strongly typed workspace records
  src/app/core/services/      Signals, storage, authenticated API and reports
  src/app/core/utils/         Shared pure validators and domain calculations
  src/app/shared/components/  Reusable standalone components
  src/app/features/           Dedicated goals, jobs, learning, journal, planner, etc.
server/                       Independently runnable Express package
  src/config/                 Environment parsing
  src/controllers/            Request/response orchestration
  src/routes/                 Routing and authentication middleware ordering
  src/models/                 Mongoose models and indexes
  src/services/               Atomic workspace, auth and migration services
  src/validators/             Request schemas
  src/middleware/             Authorization, CSRF and errors
  src/utils/                  Rich-text sanitization
scripts/                      Architecture lint and deployment preparation
api/proxy.js                  Vercel same-origin gateway to Express
```

Every Angular component has separate `.component.ts`, `.component.html` and `.component.scss` files. The architecture lint rejects inline templates/styles and missing companion files. Root npm workspace scripts preserve the common run/build/test commands. The server compiles the shared pure domain files into its own `server/dist` artifact; the running server does not require Angular packages. Build from the checkout, then deploy `server/dist`, `server/package.json` and production server dependencies. MongoDB credentials belong only in the server deployment environment.

`vercel.json` builds the Angular workspace and serves `client/dist/streakly/browser`. Deploy Express separately; set **STREAKLY_API_ORIGIN** in Vercel to its HTTPS origin, and set Express's **APP_ORIGIN** to the Vercel frontend's exact HTTPS origin. Vercel proxies `/api` to Express without exposing MongoDB or SMTP credentials. The build marks the client as server-required and updates its service-worker checksum, so a missing backend produces a connection error rather than opening legacy records. Gateway requests have an 18-second timeout and Vercel's platform payload limits; a same-origin reverse proxy to Express is preferable for larger backups. No production host or email provider is provisioned by this repository.

## Architecture and API

- Angular: standalone components, Signals, Router, SCSS tokens, Lucide and reusable forms/dialogs/calendars.
- Server: Express/Mongoose, request validation, owner authorization, CSRF, bounded workspace writes, revision conflicts, backups and sanitized rich text.
- Shared pure functions: `client/src/app/core/utils/` and `core/models/`; automatic streaks, linked milestone credits and goal sources reconcile in the same atomic server save.

An owner has one MongoDB workspace aggregate. This makes compound ledger, credit and automatic-streak changes atomic in a single compare-and-swap write without requiring MongoDB replica-set transactions. Workspace requests are limited to 8 MB, below MongoDB's document limit. This is a bounded personal workspace, not unlimited document storage. Backups are separate owner-scoped documents. Drafts live in their owner’s workspace with a reset epoch, so a stale autosave cannot resurrect a draft after Reset All. Unique owner/email/token indexes and session TTL indexes are created at startup.

Responses use `{ok:true,data,meta?}` or `{ok:false,error:{code,message}}`. Core routes:

- `/api/auth/signup`, `/login`, `/logout`, `/session`, `/forgot-password`, `/reset-password`
- `GET/PUT /api/workspace` (`expectedRevision` on writes)
- `GET/PATCH /api/profile`
- `GET /api/:section?page=1&limit=50` (maximum page size 200)
- `POST /api/:section[/:id]`, `PUT/DELETE /api/:section/:id` (revision required; deletion also requires `confirm:true`)
- `/api/migration/preview`, `/api/migration`, `/api/reset`
- `/api/backup`, `/api/backup/previous`
- `GET /api/reports?period=day|week|month&date=YYYY-MM-DD` (legacy `from`/`to` reports remain supported)
- `GET/PUT/DELETE /api/drafts/learning`

Sections cover activities, tasks, learning, jobs, income/expenses/transactions, accounts, recurring rules, budgets, savings goals/contributions, targets, goals and journal. The aggregate API handles compound completion/history mutations. Cross-record constraints reject orphaned references; deleting goals/milestones safely detaches their links.

## Verify

```sh
npm run lint                 # component structure and strict server type checking
npm run build
npm run server:build
npm test -- --watch=false
npm run test:api             # real localhost MongoDB; ONLY drops streakly_api_test
npm run test:backend:e2e     # running Express + MongoDB; APP_ORIGIN must match base URL
# Legacy browser-only regression tests, against the static test host:
STREAKLY_TEST_URL=http://127.0.0.1:4201 npm run test:e2e
npm run test:pwa
```

Backend browser tests default to `http://127.0.0.1:3000`; set `STREAKLY_BACKEND_URL` for a different test origin. Tests use isolated accounts/contexts and no production user records. Responsive checks include 320, 375, 430, 768, 1024 and 1440px. Screenshots are written under `/tmp/streakly-connected` and `/tmp/streakly-backend`. Animation respects reduced motion and does not block interaction.
