# Dublu Vé Entertainments

Dublu Vé is a music and audio-services marketplace connecting customers with artists, studios, vendors and production partners. The application is built on the existing EPHINTA event-services codebase, with its reusable account, marketplace, booking, wallet, payment, review, notification and administration workflows retained and adapted for creative projects.

## Product workspaces

- **Customer:** discover creative services, prepare a project brief, request work, manage bookings and review completed work.
- **Artist:** register an artist/studio identity, maintain an artist profile and use the creative-provider workspace to publish services and manage bookings.
- **Vendor:** publish and manage service listings, handle enquiries, verification, payment requests and promotions.
- **Production / organization:** coordinate service delivery and team operations using the existing organization workspace.
- **Growth partner:** use the existing affiliate/referral workspace.
- **Platform operations:** manage marketplace operations, users, payments and approvals through existing administrator tools.

## Reused application capabilities

The source application already contains substantial workflows that remain available where relevant:

- Account registration, sign-in, password reset, refresh tokens and role-based authorization.
- Service catalogue, vendor listings, enquiries, bookings and customer reviews.
- Wallet and escrow primitives, payment-provider adapters, reconciliation and payment requests.
- Promotions, subscriptions, affiliate/referral tracking and vendor verification.
- Notifications, event-related messages, admin approvals and audit records.
- Optional event-planning workflows: event briefs, budgets, tasks, guest lists, RSVP and check-in.
- Progressive Web App/offline foundations and a Capacitor mobile shell, now displaying Dublu Vé branding. The existing native app identifier is intentionally retained for install/update compatibility.
- Consent-based background audio playback using bundled music tracks.

## Dublu Vé implementation status

Implemented on the integration branch:
- A dedicated `ARTIST` role in the Prisma data model and registration API.
- Public artist directory, artist profile read/update API and an artist profile editor in the creative-provider workspace.
- An `ArtistProfile` record created during artist registration, including display name, biography, creative category/genre and portfolio metadata.
- Artist registration questionnaire and role-specific workspace entry. Artists can use the existing vendor/creative-provider service and booking workspace.
- Customer catalogue, cart, checkout session and wallet-funded booking flow.
- Wallet/escrow holds and an order delivery lifecycle for standalone audio bookings.
- Private final audio deliverable uploads (MP3, WAV, M4A, AAC, OGG and FLAC; up to 25 MB per file) through the configured private storage adapter. Downloads are restricted to the booking customer, provider or administrator.
- Provider delivery submission requires a fully funded order and at least one uploaded deliverable. Customers can approve delivery to release escrow or dispute it while funds remain held. Administrators can resolve a dispute by releasing or refunding the held amount; the resolution paths are idempotent and audited.
- Existing event-linked bookings retain their assigned-verifier completion and escrow controls.
- Existing marketplace, reviews, promotions, subscriptions, referrals, notifications, messaging, admin and optional event-planning modules.
- Dublu Vé branding, startup wordmark, background-audio consent copy and Capacitor mobile foundations. The existing native app identifier is intentionally retained for install/update compatibility.

Not yet complete and must not be represented as live:
- Public artist sample/portfolio audio streaming and protected preview playback.
- Verified-completion artist rankings and a complete review aggregation policy.
- Vendor retainership lifecycle and the three-qualified-referral reward workflow.
- Automatic external payouts to provider bank accounts; internal wallet credit is not a bank transfer.
- Live payment-provider acceptance, webhook verification and settlement reconciliation until the selected provider account and production secrets are configured and tested.
- Full customer-facing UI wiring for every API capability.

Artist portfolio metadata is not an audio file store. Do not put master audio files or permanent public URLs in that JSON field. Final order deliverables use the separate private audio-storage adapter; configure and test private object storage before production.

## Latest automated verification

The integration branch's latest verified commit is `e828e9cf2aed1613bc7a05210b054be5b8802ca6` (7 November 2026). GitHub Actions passed:
- 39 browser end-to-end journeys.
- API: 25 test files / 133 tests.
- Web: 9 test files / 51 tests.
- PostgreSQL 16 migration, regression/security checks and production web/API builds.
- Android debug QA APK build and iOS Simulator build.

The Android workflow artifact is named `dublu-ve-android-qa-debug-apk`. Download it from the [Android QA workflow run](https://github.com/deytaiwo2/customsoundz/actions/runs/42408316347). It is a debug QA APK, not a signed Play Store release. The iOS workflow output is a Simulator build, not an App Store-signed IPA.

See [the Dublu Vé production-readiness gate](docs/PRODUCTION_READINESS.md) for launch blockers and required production configuration.

## Architecture

- Node.js 20+ and npm workspaces.
- React + TypeScript + Vite web/PWA: `apps/web`.
- Express + TypeScript API: `apps/api`.
- Prisma + PostgreSQL: `apps/api/prisma`.
- Capacitor mobile shell: `apps/mobile`.

## Local development

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure the local database and required secrets.
3. Install dependencies: `npm ci`.
4. Apply local migrations: `npm run db:deploy`.
5. Start the development services: `npm run dev`.

Useful checks:
- `npm run check`
- `npm run build`
- `npm run build:web`
- `npm run test:db` (requires the configured test database)

Do not run migrations against production until the database is backed up and the migration has been reviewed and explicitly approved.

## Branches

- Original source import: `import/original-winning-game-app`
- Active Dublu Vé integration work: `feature/dublu-ve-integrated-marketplace`
- Earlier Dublu Vé foundation: `feature/dublu-ve-entertainments-foundation`

The integration branch is intentionally separate from the default branch until the feature set and QA are reviewed.

## Production readiness

See [the Dublu Vé production-readiness gate](docs/PRODUCTION_READINESS.md) for verified CI coverage, required production configuration and launch blockers.
