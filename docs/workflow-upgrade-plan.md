# Connected workflow upgrade — implementation notes

The existing MongoDB workspace, stored date-only values and original browser storage key remain intact. Optional model fields preserve earlier backups; the folder refactor does not delete application records.

Completed changes:

1. Separated Angular into `client/` and Express into `server/src/`, retaining root npm run/build/test commands. Every standalone component has separate TypeScript, HTML and SCSS files.
2. Added simple, milestone and numeric goal methods, audited progress, job timelines/follow-ups, optional note/task links and free-writing journal content.
3. Reconciled derived goal values and linked task milestones atomically on the server alongside existing automatic streaks. Task credits remain distinct from manual milestone completion, including the browser-to-server reconciliation sequence.
4. Replaced the generic record pages with dedicated goal, job, learning and journal workspaces. Added Tiptap rich-text editing, compact progress controls, planner connections and dashboard attention actions.
5. Added server-generated daily/weekly/monthly reports using complete authorized MongoDB records, configured calendar boundaries and explicit schedules. Rescheduling preserves history; unfinished current-day work stays pending.
6. Updated Vercel's client output and same-origin API gateway. The independently compiled Express artifact includes shared pure domain code and requires no Angular runtime packages.

Validation includes 101 unit tests, 12 MongoDB API tests, 12 authenticated browser tests, 25 legacy browser regression tests and an offline PWA test. Populated goal/job details, editors, reports, finance and navigation were checked at 320, 375, 430, 768, 1024 and 1440px in light and dark modes. Angular and server builds and component architecture lint pass. Angular reports non-blocking bundle/style size warnings under the existing budgets.

Production deployment still requires a MongoDB URI, exact frontend APP_ORIGIN, SMTP configuration and Vercel's STREAKLY_API_ORIGIN. No production account records were migrated or reset during development; tests use isolated accounts and an isolated API-test database. No cloud environment or public site was published.
