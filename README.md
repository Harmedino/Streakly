# Streakly

**Small actions. Big consistency.** A private, browser-local habit and activity tracker built with Angular standalone components, TypeScript, SCSS, Router, Signals, and Lucide icons.

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

The version 2 validation/migration boundary upgrades version 1 records without deleting history, and rejects unknown formats. The original storage key remains `streakly.data.v1` for compatibility. Imports validate dates, frequencies, bounded quantities, IDs, references, duplicate entries, and required fields before data replacement. Completion percentage excludes an unfinished current tracking period; week/month insight percentages show progress toward targets in the overlapping tracking periods. Archived records remain available in activity details and filtered calendars.

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

Open **To-do list** in the sidebar (or mobile menu) to add tasks with optional due dates, edit them, complete or undo them, and filter pending/all/done. Removing a task or clearing completed tasks requires confirmation. Tasks persist in the same LocalStorage data, synchronize between tabs, and are included in JSON backups and recovery. Existing version 1/2 backups without tasks still work. To-dos do not affect habit streaks or consistency statistics.

## Manual check-ins and backdating

Nothing is marked complete just by opening Streakly or waiting. Mark today yourself, or use **Mark a past day** on an activity. The recording dialog includes a date picker plus Today/Yesterday shortcuts; past entries update the selected day’s history and recalculate streaks without completing today. Entries are limited to the activity’s start date through today. Each date has one editable record, so logging it twice never adds another streak day.

A new daily check-in opens at **local midnight**, rather than 24 hours after your last entry. The app schedules that rollover with local calendar arithmetic (including daylight-saving changes), refreshes when a sleeping tab regains focus, and preserves the streak while today is still unfinished.
