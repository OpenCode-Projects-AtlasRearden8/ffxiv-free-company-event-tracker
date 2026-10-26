# Free Company Event Tracker

A single-file, offline web app for running a Final Fantasy XIV Free Company's event nights: a calendar of raids, crafting nights, and GATE evenings; a signup grid with role slots and a waitlist; recurring-event templates; attendance history per member; and lead-only notes.

No server, no accounts, no API calls, no build step, no dependencies. It is one HTML file that runs entirely in your browser, and everything it stores lives in that browser's `localStorage`.

Part of the Asdale Dynamics, LLC collection of beginner-friendly, local-first tools. Learn more at [dylanasdale.github.io](https://dylanasdale.github.io).

## Quick start

1. Download `index.html` (or clone this repository).
2. Open it in any modern browser. That is the whole setup.

You can copy the file onto a USB stick, attach it to an email, or drop it on a shared drive; it works offline from the file system, from a static host, or from a phone.

To try it quickly with Node installed:

```
node tests/run-tests.js
```

or `npm test` (there are no dependencies; `npm` is never required).

## What it does

- **Calendar** - a month view of every event night, color-coded by type (raid, craft, GATE, misc). Recurring nights are generated automatically from templates; one-off events can be added from the calendar page. Past events that were marked as held show a dashed style.
- **Signup grid** - every event has a grid of role slots (Tank, Tank, Healer, DPS, Crafter, ...). Adding a signup places a member in the first open matching slot, or queues them on the waitlist when matching slots are full. `General` slots fit anyone. Slot swaps, clears, and waitlist promotions are all handled for you.
- **Recurring-event templates** - define a night once ("Raid Night, every Tuesday 20:00, 2/2/4 slots") and the calendar fills itself. Supports weekly, biweekly (anchored), and monthly ("3rd Saturday") patterns, editable in Settings.
- **Attendance history** - after a night, the lead checks who showed up and marks the event as held. The Attendance tab totals each member's turnout across all held nights.
- **Lead-only notes** - with Lead mode on, each event night has a private notes area (strats, loot rules, reminders). Notes are hidden unless Lead mode is enabled.
- **Data you own** - export everything as JSON, import it back, restore the starter schedule, or wipe it. All from Settings.

## Starter schedule

On first run the app seeds a sample FC so nothing looks broken:

- Raid Night: Static A - Tuesdays 20:00, 2/2/4 slots
- Raid Night: Casual B - Thursdays 20:00, 1/1/3 slots
- Crafting Corner - Wednesdays 20:00, 3 crafters + gatherer
- GATE Night - every other Saturday 21:00, hosts + general
- New Fellow Bootcamp - 1st Saturday of each month 19:00

The sample roster is nine fictional, snack-themed member names so the signup grid has something to chew on. Replace all of it via Settings whenever you like.

## Privacy and data

- **Everything is local.** The app makes zero network requests - no CDNs, no fonts, no analytics, nothing. The test suite even asserts the file contains no absolute URLs.
- **Storage is per browser.** Data saved in Chrome stays in Chrome; the same file opened in Firefox starts fresh. Use Settings > Export/Import to move data between browsers or machines.
- **No personal data is required.** Member entries are just game names and role checkboxes. "Lead-only" notes are enforced by the Lead mode toggle in this client; since there are no accounts, anyone with access to the same browser profile and Lead mode can read them. Treat it as a coordination tool, not a secrets vault.
- If `localStorage` is unavailable (some private browsing modes), the app warns you and keeps changes for the session only.

## Testing

`node tests/run-tests.js` extracts the application script straight out of `index.html` (so it always tests the code that ships) and runs it in isolation, covering:

- calendar repeats: weekly multi-day patterns, anchored biweekly, nth-weekday monthly, year wraps, DST-stable week math, and stable occurrence ids
- slot-filling logic: role matching, order priority, waitlisting on overflow, duplicate protection, swaps, clears, and waitlist promotion
- attendance summaries, starter-schedule sanity, and UI smoke tests (every tab renders, lead-only notes stay hidden without Lead mode, and the member-add / signup-add click wiring works)

## Project layout

```
index.html           the entire app (HTML + CSS + JS, no build step)
tests/run-tests.js   zero-dependency test runner (plain Node)
```

## License

MIT License - Copyright (c) 2026 Asdale Dynamics, LLC. See `LICENSE`.

Built and maintained by [Asdale Dynamics, LLC](https://dylanasdale.github.io), the LLC behind *The Massive AI Manual* - plain-English AI education and practical, local-first tools.
