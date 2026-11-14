# Upstream application foundation

## Source snapshot

- Source repository: `demtaiwo1-eng/Winning-game-`
- Source application directory: `eventsss123/eventsss-main/`
- Source branch inspected: `main`
- Source commit inspected on 13 November 2026: `0fd60f19df75061de5a874fc0daaefab85616c32`
- Working destination: `deytaiwo2/customsoundz`
- Destination branch: `feature/dublu-ve-integrated-marketplace`

The Dublu Vé workspace is based on the source application's React/Vite web app, Express API, PostgreSQL 16 / Prisma data layer, and Capacitor mobile foundation. The marketplace, account, booking, wallet, notification, operations and administration modules are retained where they support the Dublu Vé product.

## Safe synchronization rule

Do not replace the destination tree wholesale with a newer source snapshot. The destination contains Dublu Vé-specific work: the public music studio, Yuletide loved-one song packages, production-project intake, private audio deliverables, Dublu Vé branding and production documentation. Synchronize upstream changes by reviewing their changed files and porting compatible foundation improvements individually, preserving those product features and their database migrations.

The 13 November source snapshot includes EPHINTA-specific central OPay DEMO/TEST/LIVE controls and operational policy. Those controls are not copied blindly into the Dublu Vé production-project intake: its current intake workflow does not collect payment for a production brief, and a payment-mode control must be integrated against the actual Dublu Vé quote, checkout and escrow lifecycle before it can safely govern those orders.

## Current destination safeguards

- Keep the source repository unchanged unless write access is explicitly available.
- Work on the Dublu Vé feature branch and use its pull request for review.
- Never trust browser-submitted prices; the API recalculates production-project estimates.
- Keep final audio deliverables in private storage and enforce customer ownership on downloads.
- Treat browser audio as a musical sketch, not an AI-generated final master.
- Do not describe a build as passed unless the relevant CI workflow reports success.
