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

Reminder times are local preferences only; the application does not send notifications. One-time goals count successful completion without creating recurring streaks. Milestones celebrate 3, 7, 14, 30, 50, 100, and 365 successful consecutive tracking periods.

## Privacy and persistence

All data is saved under `streakly.data.v1` in the current browser's LocalStorage. There is no authentication, database, REST API, analytics, or automatic cross-device synchronization. Fonts and icons are bundled locally. Browser data can be removed by clearing site storage or ending a private session; export backups regularly.

Storage errors are shown visibly, and failed writes do not update application state. Unreadable stored data is preserved and protected against automatic overwrites. The backup export includes the original unreadable payload in this recovery case. A validated, explicitly confirmed import can replace it. Storage is intended for a single browser tab; concurrent edits in different tabs are not merged automatically.

## Architecture

- `models/`: strongly typed activities, schedules, completions, preferences, and versioned data.
- `core/`: pure local-date arithmetic, scheduling, streak calculation, and aggregate insights.
- `services/`: storage validation/migration boundary and a single reactive tracker store.
- `shared/`: accessible dialogs, activity/record forms, activity rows, calendar, heatmap, icons, and progress/empty states.
- `features/`: lazy-loaded dashboard, activities/details, calendar, statistics, and settings.
- `e2e/`: real-browser tests for onboarding, quantities, notes, refresh persistence, undo, categories, archival/deletion, history, backup import/export, theme persistence, and mobile layout.

### Calendar and streak rules

Date-only values use local `YYYY-MM-DD` keys. Date increments use calendar arithmetic (`setDate`), never 24-hour timestamp increments. UTC is used only to compare already-extracted date parts for DST-independent interval distances. Weeks start on Monday. Weekly/monthly targets count distinct successful days; each day must reach its quantity target. Only scheduled days contribute to daily/weekday/interval streaks. An unfinished current day or period does not break an existing streak. A missed closed period does. The first weekly/monthly period starts at its calendar boundary, but completions before the activity start are excluded. Changes to schedules or quantity targets intentionally recalculate history.

The version 1 validation/migration boundary rejects unsupported versions rather than silently modifying unknown formats. Imports validate dates, frequencies, bounded quantities, IDs, references, duplicate entries, and required fields before data replacement. Completion percentage excludes an unfinished current tracking period; week/month insight percentages show progress toward targets in the overlapping tracking periods. Archived records remain available in activity details and filtered calendars.

## Validation

Unit tests cover daily/weekday/interval streaks, missed days, weekly/monthly goals, leap years, year/month boundaries, DST, one-time goals, quantity targets, duplicate prevention, undo, archival, deletion, storage persistence/failure/recovery, and import validation. Browser tests cover the complete interaction flow at desktop and mobile widths.
