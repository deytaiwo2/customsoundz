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
- An `ArtistProfile` record created during artist registration, including display name, biography, creative category/genre, portfolio metadata, rating and completed-job fields.
- Artist registration questionnaire and role-specific workspace entry.
- Artists are authorized to use the existing vendor/creative-provider APIs and workspace.
- Dublu Vé branding and music/audio-focused public landing copy.
- A Dublu Vé startup wordmark and background-audio consent copy. Existing EPHINTA audio preference keys are still read so saved user choices are not lost.

Not yet complete and must not be represented as live:
- Portfolio uploads, protected sample streaming and expiring signed audio URLs.
- Secure final MP3 delivery and production handoff.
- Verified-completion artist rankings and review aggregation.
- Vendor retainership lifecycle and the three-qualified-referral reward workflow.
- Full customer UI wiring for every API workflow and end-to-end payment acceptance.

The artist portfolio field currently stores metadata only. Do not store master audio files or expose permanent public URLs in this JSON field. Private audio needs a separately configured private object-storage adapter and short-lived signed access.

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
