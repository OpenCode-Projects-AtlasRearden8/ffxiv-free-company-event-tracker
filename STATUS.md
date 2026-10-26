# STATUS

## What was built

A complete, offline, single-file web app for running an FFXIV Free Company's event nights. One `index.html` contains the full app (HTML + CSS + JS); there is no build step, no dependencies, no server, no accounts, and no API calls. All data is stored in the browser's `localStorage`.

Features:

- **Event calendar** - month view of raid, crafting, and GATE nights plus misc events, color-coded by type, with prev/next/today navigation and a plain list view of the month for accessibility. One-off events (schedule breakers) can be added from the calendar page.
- **Signup grid with role slots** - each event generates a slot grid (e.g. 2 Tank / 2 Healer / 4 DPS). Signups are placed into the first open matching slot; `General` slots fit anyone. Overflow goes to a waitlist; duplicates are refused; slot swaps, clears, and waitlist promotions are handled automatically.
- **Recurring-event templates** - weekly, biweekly (anchored week pattern), and monthly (nth weekday) schedules defined once in Settings; the calendar expands them automatically with stable per-occurrence ids.
- **Attendance history per member** - lead checks attendees and marks a night as held; the Attendance tab totals each member's attended/missed/turnout across all held nights.
- **Lead-only notes** - a per-night notes area (strats, loot rules, reminders) visible only when Lead mode is enabled.
- **Data ownership** - JSON export/import, restore starter schedule, and erase-all, all client-side.
- **Starter schedule included** - 5 seeded templates (Tuesday/Thursday raid nights, Wednesday crafting, biweekly GATE night, monthly bootcamp) and a fictional 9-member snack-themed demo roster.

## How to run it

Open `index.html` in any modern browser. That is everything - it works offline from the file system, a USB stick, or any static host. No install, no build, no network access needed.

Optional (to run the tests): Node.js 18+.

```
node tests/run-tests.js      # or: npm test
```

## Verification results

- `node tests/run-tests.js`: **21 tests, 21 passed, 0 failed.**
- The test runner extracts the `<script>` block directly out of `index.html`, so it always tests the code that ships. It compiles and runs the app in isolation, which doubles as a syntax check of the whole script.
- Covered: calendar repeat logic (weekly multi-day, anchored biweekly including the default anchor, nth-weekday monthly, month-skipping when a 5th weekday does not exist, year wraps, DST-stable week math, stable occurrence ids); slot-filling logic (role matching, request order, waitlisting on overflow, duplicate protection, no-role-mismatch placement, member swaps, clears, waitlist promotion); attendance summaries counting only nights marked as held; starter-schedule sanity (unique ids, valid times, slots present, patterns produce events); and UI smoke tests (every tab renders from a document stub, lead-only notes stay hidden without Lead mode, and the member-add / signup-add click wiring updates state correctly).
- Extra ad-hoc checks run: December-to-January week wrap, US DST spring-forward month (no weekday drift), 5th-Friday months correctly skipped, a 52-week biweekly run producing exactly 26 occurrences, and empty-template/zero-slot edge cases.
- Confirmed the app file contains zero absolute URLs, zero external resources, and one inline script - it genuinely runs offline.
- `npm test` alias verified working (no dependencies installed).

## Known gaps

- **Real-browser interaction was not tested here** (no browser in this environment). Rendering of every tab and event view, and the click wiring for member-add and signup-add, are exercised through a document stub; visual layout, focus behavior, and browser-specific `localStorage` quirks were not.
- **"Lead-only" is enforced client-side only.** There are no accounts, so anyone with the same browser profile can flip Lead mode and read notes or edit attendance. It is a coordination tool, not a secrets vault.
- Editing a template's role slots applies to all future generated signups but does not migrate slots already recorded for past occurrences.
- Attendance history is kept for deleted templates (so history survives), but those nights show as "deleted event" in the Held-nights list.
- If `localStorage` is blocked (some private modes), the app warns and keeps data for the session only.
- The UI is English-only and uses a fixed dark theme.

## Repository notes

- Files: `index.html` (app), `tests/run-tests.js` (test runner), `README.md`, `LICENSE`, `STATUS.md`, `package.json`, `.gitignore`.
- License: MIT, `Copyright (c) 2026 Asdale Dynamics, LLC`. README credits Asdale Dynamics, LLC.
- Git initialized locally with a plain commit message; no remote, nothing pushed or published.
