# Panel startup optimization

Scope: `redesign/frame-house-studio`; frontend-only. Firebase Functions, ImageKit, credentials, IAM and production routing are unchanged.

## Observations

- Existing preview `dpl_66iDeYDeZTeScHFFHn9PRjJbWh4a` was READY. Its HTML returned HTTP 200 with `x-vercel-cache: HIT`.
- Vercel runtime log query for the latest 30 minutes returned no matching errors/warnings. This static Vite app performs authentication and Firestore operations in the browser; those waits do not appear as Vercel Function execution logs.
- Existing `sessions.ts` awaited ipapi.co geolocation (2.5-second timeout) before writing the essential session, on both login and auth restoration. App restoration and LoginCard already waited for that write. Display-only metadata was therefore on the critical path.
- A persistent `fh_login_flow=1` flag caused App to poll for up to 15 seconds. Closing a tab during login could leave that flag behind for future visits.
- Login eagerly imported AdminPanel, gallery, settings and sessions. The primary JS bundle was 833.75 kB uncompressed / 214.48 kB gzip.
- A Google Fonts stylesheet imported from the main CSS introduced an external stylesheet dependency before rendering.
- An initial attempt to time a protected preview reached Vercel's SSO login, not the application. That attempt is not a valid app performance benchmark, and no before/after real-user timing is claimed.

## Changes

- Persist essential session state before optional location enrichment. Geo lookups run in the background, share a pending request, and cache display metadata in memory for 30 minutes (failed lookup for one minute). Unknown lookup results never overwrite known locations. Metadata updates are skipped after sign-out/user change and never modify authorization fields.
- Replace persistent login polling with a promise for the actual login operation in the current JS tab. The promise resolves in LoginCard's existing finally block. There is no abandoned storage flag to wait on.
- Lazy-load AdminPanel, start its download alongside authenticated session verification, and lazy-load gallery/sessions/settings when those sections are opened.
- Fetch the sessions list only in the sessions section, not every panel visit.
- Add a recoverable verification error state and a 12-second slow-verification notice/retry. Protected content is still withheld until verification and the essential write succeed. No timeout grants access.
- Serve Inter and Montserrat locally as variable WOFF2 fonts, retaining the same families/weights and font-display: swap.
- Include a lightweight initial status in index.html before React starts.

## Validation and limits

- Frontend TypeScript + Vite production build: passed.
- Primary JS: 710.27 kB raw / 185.31 kB gzip (about 15% smaller raw, 14% smaller compressed). AdminPanel and sections are separate chunks. Excel and Remotion remain independently loaded.
- 13 unit/component tests: essential write must finish before entry; stale flags do not stall restoration; blocked/remote-logout sessions are denied; verification errors can retry; optional geo cannot block the session; existing control fields stay intact; metadata respects sign-out and cached lookup behavior.
- 12 Chromium UI tests: startup does not request admin modules or external Google Fonts; existing login, responsive navigation, forms, Excel and ImageKit UI behavior still pass.
- A real signed-in session on the user's device was not available. Firebase/network latency can still influence entry; these changes remove avoidable dependencies without skipping security checks. No promise of an exact number of seconds for every device/network is made.
