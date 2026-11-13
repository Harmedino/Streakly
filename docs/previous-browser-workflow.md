# Streakly

**Small actions. Big consistency.** A private, browser-local personal life, finance, learning, goal, and streak tracker built with Angular standalone components, TypeScript, SCSS, Router, Signals, and Lucide icons.

## Run

Requires Node.js 22.12+ (tested with 24.19) and npm.

```sh
npm ci
npm start
```

The development server uses port 4200. For a container, use `npm start -- --host 0.0.0.0`. Use the existing checkout; each cloud task already has an isolated environment, so a Git worktree is unnecessary.

```sh
npm run build             # strict TypeScript + Angular templates, production bundles
npm test -- --watch=false # Vitest via Angular's unit-test builder
npm run test:e2e          # Chromium workflows; start npm start first
npm run test:pwa          # builds and tests offline production service worker
npm run format           # readable source formatting
```

Browser tests use `/usr/bin/chromium`. Set `CHROMIUM_PATH` to your installed Chromium executable if needed. They use fresh browser contexts and never seed production application data. Build output is in `dist/streakly/browser`; serve it with a static host configured to fall back to `index.html` for Angular routes. No application backend is required.

## Your everyday workflow

- Set a display name, then create your first intention. The application starts empty.
- Track daily, selected-weekday, weekly, monthly, custom-interval, and one-time activities.
- Check off a day immediately, enter quantities, attach notes, or undo a completion.
- Search and sort activities, use custom categories, and archive without losing history.
- Open an activity for its streaks, heatmap, calendar, schedule, and recorded moments.
- Select a calendar date to correct historical progress. Future recordings are disabled.
- Explore actual weekly/monthly consistency, daily trends, weekday rates, and active days.
- Export JSON backups, validate and confirm replacement imports, and choose a persistent light/dark theme in Settings.

Reminder times are opt-in in Settings. While the application is open, it checks due activities every 30 seconds, uses notifications only after permission, and provides an in-app fallback. It does not send backend push messages or promise delivery when closed. One-time goals count successful completion without creating recurring streaks. Milestones celebrate 3, 7, 14, 30, 50, 100, and 365 successful consecutive tracking periods.

## Privacy and persistence

All data is saved under `streakly.data.v1` in the current browser's LocalStorage. There is no authentication, database, REST API, analytics, or automatic cross-device synchronization. Fonts and icons are bundled locally. Browser data can be removed by clearing site storage or ending a private session; export backups regularly.

Storage errors are shown visibly, and failed writes do not update application state. Unreadable stored data is preserved and protected against automatic overwrites. The backup export includes the original unreadable payload in this recovery case. A validated, explicitly confirmed import can replace it. Same-origin tabs synchronize through storage events. Each write compares its saved snapshot before updating and increments a revision; stale writes are rejected. Open activity/progress forms detect newer revisions and require reopening before saving. This prevents ordinary stale-tab overwrites; LocalStorage is not a transactional multi-device database.

## Architecture

- `models/`: strongly typed activities, schedules, completions, preferences, and versioned data.
- `core/`: pure local-date arithmetic, scheduling, streak calculation, and aggregate insights.
- `services/`: storage validation/migration boundary and a single reactive tracker store.
- `shared/`: accessible dialogs, activity/record forms, activity rows, calendar, heatmap, icons, and progress/empty states.
- `features/`: lazy-loaded dashboard, activities/details, calendar, statistics, and settings.
- `e2e/`: real-browser tests for onboarding, quantities, notes, refresh persistence, undo, categories, archival/deletion, history, backup import/export, theme persistence, and mobile layout.

### Calendar and streak rules

Date-only values use local `YYYY-MM-DD` keys. Date increments use calendar arithmetic (`setDate`), never 24-hour timestamp increments. UTC is used only to compare already-extracted date parts for DST-independent interval distances. Weeks start on Monday. Weekly/monthly targets count distinct successful days; each day must reach its quantity target. Only scheduled days contribute to daily/weekday/interval streaks. An unfinished current day or period does not break an existing streak. A missed closed period does. The first weekly/monthly period starts at its calendar boundary, but completions before the activity start are excluded. Changes to schedules or quantity targets intentionally recalculate history.

The version 3 validation/migration boundary upgrades version 1 and 2 records without deleting history, and rejects unknown formats. The original storage key remains `streakly.data.v1` for compatibility. Imports validate dates, frequencies, bounded quantities, IDs, references, duplicate entries, and required fields before data replacement. Completion percentage excludes an unfinished current tracking period; week/month insight percentages show progress toward targets in the overlapping tracking periods. Archived records remain available in activity details and filtered calendars.

## Validation

Unit tests cover daily/weekday/interval streaks, missed days, weekly/monthly goals, leap years, year/month boundaries, DST, one-time goals, quantity targets, duplicate prevention, undo, archival, deletion, storage persistence/failure/recovery, and import validation. Browser tests cover the complete interaction flow at desktop and mobile widths.

## Everyday enhancements

The existing colors, typography, sidebar navigation, and card layout are retained. Mobile controls have larger touch targets, 16 px form inputs to avoid keyboard zoom, viewport-fitting dialogs, keyboard-safe drawer focus, and a sticky header. Motion is limited to short, reduced-motion-aware transitions.

### Rest, pause, and freezes

Open an activity's **Rest & streak protection** section, or select a date in its calendar. Planned rest days are excluded; temporary pauses retain a dated history until resumed. A completed day recorded before a pause remains a real completion. Neither rest nor a pause earns streak credit.

A freeze is manual, protects a past missed scheduled date, and is limited to two per activity per calendar month (the month of the protected date). It preserves a run but does not add a success. Future, completed, resting, paused, and already-frozen dates cannot consume a freeze. Used/remaining counts and frozen history are visible. Removing a freeze refunds that date's use and recalculates streaks.

For weekly/monthly activities, rest/pause days reduce available days and targets are capped to the days still available in that period. Fully excluded periods are neutral. Freezes can protect an unsuccessful **closed** tracking period only when real successful days plus frozen days cover the target; protected periods preserve a streak without increasing it. Calendars distinguish successful, partial, missed, rest, frozen, paused, upcoming, and unscheduled days using restrained styling and explicit labels.

### Progress and organization

Activity forms support Yes/No, quantities, durations in minutes, and monetary amounts with your chosen currency unit. Existing quantity history is preserved. Progress is an editable daily total, not an increment: update it throughout the day without duplicate completions. Reaching the target automatically completes that date; the card shows the remaining amount.

Ten optional form templates prefill fields without saving an activity until confirmed. Everything remains editable. Create categories beside the activity picker; rename them in Settings to update assigned activities together. Favorite pins appear first; use **My order** to move activities within their pinned/unpinned group, and optionally choose compact view. Archived items stay hidden by default and retain their restore action.

The Insights page includes a deterministic weekly reflection: real completions, target percentage, successful days, current best streak, most consistent activity, attention list, and an explicitly labelled comparison against the previous full week. Optional daily personal notes appear on Overview and Calendar and travel with backups.

### Recovery and multiple tabs

Unreadable original data remains untouched. Export it, then use **Recover valid records** in Settings to preview valid records and discarded counts. Replacement requires confirmation; no recovery is written automatically. Syntactically broken JSON requires manual repair from the exported original. Failed saves never update reactive state. Valid incoming tab changes update the current view; external deletions or unreadable writes show a clear warning rather than replacing the current data silently.

### Install and offline support

Production builds use Angular's official service worker, a web app manifest, 192/512 px app icons, and pre-cached application bundles, lazy routes, fonts, and icons. Serve production output over HTTPS or localhost. After the initial successful load/cache, Streakly can reload and navigate offline with its existing LocalStorage data. Development (`npm start`) intentionally does not register the worker.

Settings shows an install button when the browser exposes an install prompt, with manual browser/Safari instructions otherwise. Installation support varies by browser. Updates show a notice and wait for an explicit reload; open forms are not automatically discarded. The service worker does not create a cloud backup or cross-device sync, and browser eviction/clearing storage can still remove local data.

## Personal to-do list

Open **Daily Planner** in the sidebar (or mobile menu) to add tasks with optional due dates, edit them, complete or undo them, and filter pending/all/done. Removing a task or clearing completed tasks requires confirmation. Tasks persist in the same LocalStorage data, synchronize between tabs, and are included in JSON backups and recovery. Existing version 1/2 backups without tasks still work. To-dos do not affect habit streaks or consistency statistics.

## Manual check-ins and backdating

Nothing is marked complete just by opening Streakly or waiting. Mark today yourself, or use **Mark a past day** on an activity. The recording dialog includes a date picker plus Today/Yesterday shortcuts; past entries update the selected day’s history and recalculate streaks without completing today. Entries are limited to the activity’s start date through today. Each date has one editable record, so logging it twice never adds another streak day.

A new daily check-in opens at **local midnight**, rather than 24 hours after your last entry. The app schedules that rollover with local calendar arithmetic (including daylight-saving changes), refreshes when a sleeping tab regains focus, and preserves the streak while today is still unfinished.

The labeled **Mark streak** button stays visible on activity cards and detail pages. Once marked it is disabled until the next eligible day; Undo is a separate action. Paused, resting, future, and unscheduled activities show a disabled button with a reason. The Overview’s **All activities** tab keeps these disabled activities visible, while today’s statistics still count only scheduled activities.

## Personal life dashboard (schema version 3)

The existing Angular app, streak engine, themes, local-date arithmetic, protection rules, PWA, and manual/past-day check-ins remain in place. Existing `/activities`, `/calendar`, `/statistics`, and `/todos` URLs still work. Navigation now includes Overview, My Streaks, Daily Planner, Learning Journal, Job Applications, Finance, Goals, Personal Journal, Reports, and Settings. Records begin empty; no sample money or activity is presented as your own.

Overview combines actual streaks/completions with this week's learning time, this month's applications, recorded income/expenses, tracked savings, available balances, active goals, and pending deadlines. Quick-entry dialogs record income, expenses, learning, and manual streak progress without leaving the page.

### Finance

All amounts are integer **kobo** internally, displayed in Nigerian Naira. Amount inputs accept up to two decimals; unsafe or oversized values are rejected. No bank login, password, account credential, API connection, or external database is involved.

- **Accounts:** bank, cash, savings, and wallet accounts have a real opening balance and opening date. Transactions cannot precede the account's opening date. Account deletion is blocked while financial history references it.
- **Income / expenses:** add, edit, delete, search, and filter actual dated records, with custom categories and optional payment accounts. Unassigned records affect cash flow but are explicitly excluded from tracked account balances.
- **Transfers:** move funds between distinct tracked accounts. They change the two balances equally and never count as earnings or spending. The “Savings Transfers” category cannot be entered as an ordinary expense; use transfers or savings allocations instead.
- **Balances:** tracked balance = opening balances + account income − account expenses + incoming transfers − outgoing transfers. This is deliberately different from net cash flow.
- **Savings:** goal contributions **earmark funds already held in an account**; they do not physically move money or create income/expenses. A withdrawal releases an allocation from the account holding it. Use an account transfer to actually move funds. Available balance excludes savings accounts and subtracts earmarked funds in spendable accounts. Total savings includes savings-account balances plus earmarked spendable-account funds; allocation inside a savings account is not added again. Backdated edits, deletions, and withdrawals are checked against allocation history so reserved funds cannot silently be spent or withdrawn twice.
- **Budgets:** an empty category defines the overall monthly budget. Other budgets match exact category names. One budget per month/category is allowed, with usage, remaining amounts, approaching-limit notices, and overruns. Future-month budgets are supported.
- **Recurring records:** monthly schedules are not assumed to have been paid. Review and explicitly confirm due receipts/payments. Occurrences retain the original calendar-day anchor (31st → last day of a short month → 31st again). Each occurrence is posted once. Deleting a posted transaction does not silently recreate it; pausing a schedule stops further due records. Posted history prevents schedule deletion; pause it instead.
- **Reports:** calendar-month totals, income/expense trends, spending categories, income sources, recent transactions, highest expenses, net allocations, and recurring spending use actual ledger records. CSV export uses the current date/search/category filters and escapes spreadsheet formula prefixes, quotes, commas, and newlines.

### Learning, applications, goals, planner, reflections

Learning entries store topic, description, category, minutes, date, resource links, notes, and next steps. Calendars, search, filters, and weekly/monthly totals use saved entries. A duration streak receives linked learning minutes; a Yes/No streak gets one success per date. Linking multiple entries does not create duplicate completion records. A separate credit ledger retains the original manual progress and note; editing/deleting learning adjusts its contribution and restores manual history when the last link is removed. Incompatible streak types require unlinking learning first.

Job Applications stays deliberately lightweight: company, position, application date/link, Applied/Interview/Rejected/Offer status, and notes. It includes search, status filtering, week/month counts, and a six-month application chart, with no job search or automated applications.

Goals have categories, dates, deadlines, priorities, status, manual progress or calculated milestone progress, and links to streaks, savings goals, and learning categories. Unchanged milestone titles retain completion history when edited. Progress changes create dated events for reports; records are not inferred from current status alone.

The existing task list is now Daily Planner, with scheduled dates, priorities, today's progress, overdue filtering, and rescheduling through Edit. Old undated tasks remain available. New completions receive a local completion date; old completed tasks without a known completion date are not assigned invented dates in weekly/monthly reports.

Personal Journal adds one structured reflection per local date: accomplishments, learning, challenges, ideas, improvements, tomorrow's priorities, and optional mood. It has a browsing calendar and search. Existing quick daily notes remain untouched on Overview and the habit calendar.

Life Reports combine real streak consistency, learning minutes, job applications, financial flows, net savings contributions, completed tasks, goal progress, and completions. Current incomplete periods are explicitly compared with the previous full week/month. Savings allocations and tracked holdings are labelled separately.

### Migration, backup, and resets

The storage key remains `streakly.data.v1` for compatibility; the JSON schema is version 3. Versions 1/2 gain empty life-management modules without dropping original habits, completion history, tasks, or notes. Version 3 validates record IDs, references, dates, finance invariants, duplicate recurring occurrences, learning credits, journal uniqueness, and goal history. Invalid storage stays protected; it is never silently overwritten. Financial recovery refuses to discard invalid linked money records automatically.

Before **every import or section reset**, the previous raw stored data is saved to `streakly.backup.before-restore`. If that safety backup cannot be stored, replacement is blocked. Settings can export the last pre-restore file. This local safety copy is replaced by the next import/reset and is lost if site storage is cleared; export full JSON backups regularly. Imports validate before confirmation and reject stale confirmations after another tab changes data.

Section resets clear related links while keeping unrelated records. Resetting learning restores the separate manual streak base. Resetting finance clears account/savings links in personal goals. Resetting streaks leaves learning records but unlinks their credits. Reset-all removes application records and preferences. All reset actions require confirmation and a safety backup.

No data automatically synchronizes across devices. Same-origin tabs in the same browser synchronize with revision/snapshot checks. Avoid storing credentials or passwords in any notes field. Browser/device changes and clearing site data can remove all locally held records.

### Validation commands

```sh
npm run build
npm test -- --watch=false
npm run test:e2e               # start npm start first
npm run test:pwa               # production build + offline check
# Optionally run normal browser tests against an already-served production build:
STREAKLY_TEST_URL=http://127.0.0.1:4201 npm run test:e2e
```

Finance and life tests cover exact decimal conversion, balances, unassigned flows, transfers, savings allocation/withdrawal rules, recurring month boundaries/deduplication, CSV escaping, linked-learning reconciliation, migrations, backup failures, resets, goal events, persistence, and responsive multi-module workflows.

## Workspace design system

The UI uses a neutral canvas and a restrained violet accent in light and dark themes. Shared color, spacing, type, border and shadow tokens live in `src/styles/_tokens.scss`; reusable controls and surface styles are defined in `src/styles/_workspace.scss`. Feature layouts are in their own SCSS files and remain lazy loaded. No UI framework or new runtime dependency was added. Obsolete decorative styles and superseded declarations were removed.

The new Overview leads with daily progress, weekly rhythm and quick capture, then separates streaks/priorities/recent history from finance, learning and goals. Finance prioritizes tracked balances, account summaries and readable transaction history; tables become stacked transaction rows on phones. Learning uses a chronological timeline, applications a simple status pipeline, goals milestone progress, reflections a date rail, and the planner a task agenda with a capture panel. Settings has section navigation for profile, appearance, categories, reminders, install, backup and reset.

At mobile/tablet widths, a persistent Today/Planner/Finance/More navigation complements the complete focus-trapped menu. Dialogs use a scrollable sheet with visible actions, forms preserve accessible labels, and reduced-motion preferences suppress animation. Page transitions intentionally avoid transforms on ancestors of fixed dialogs. The thin route-loading indicator reflects actual router navigation. Storage schemas, keys and business rules are unchanged by this redesign.

`e2e/design.spec.ts` renders every route (including activity details, calendar and insights), all seven finance sections, and a record form at 1440, 768, 390 and 320 pixels in both themes. It checks overflow, dialog viewport placement, JavaScript errors and unchanged stored records. Visual captures use isolated test fixtures only; the app continues to start empty. Screenshots are saved under `/tmp/streakly-redesign` during these checks.
