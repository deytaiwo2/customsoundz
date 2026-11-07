# Copilot instructions for this repository

## Product and architecture
- This repository is being adapted into **Dublu Vé Entertainments**, a music and audio-services marketplace. The imported EPHINTA event-services codebase is the foundation, not the product brand.
- Preserve useful existing capabilities: authentication, role authorization, service marketplace, bookings, wallet/escrow, payment adapters, reviews, promotions, subscriptions, referrals, notifications, admin controls, event briefs and the optional event-planning workflows.
- Core Dublu Vé roles are customers, artists, vendors, production/organization partners and administrators. Existing affiliate, verifier and consultant roles remain available where useful.
- Preserve the monorepo: React + Vite web/PWA in `apps/web`, Express + TypeScript API in `apps/api`, Prisma/PostgreSQL data layer, and Capacitor Android/iOS shell in `apps/mobile`.
- Artists use the `ARTIST` role and `ArtistProfile` model. The existing vendor/creative-provider workspace and APIs are intentionally shared with artists unless a dedicated artist workflow is added.
- Before changing a feature, trace its active UI route, API route/service, Prisma model/migration, tests and mobile impact. Reuse existing patterns rather than introducing parallel implementations.

## Product and security rules
- Keep Dublu Vé branding in user-facing screens. EPHINTA identifiers, historical local-storage keys, database names and CSS class names may be compatibility-sensitive; migrate them deliberately rather than renaming blindly.
- Never expose master audio files through permanent public URLs. Private samples and final MP3 delivery must use private storage and short-lived signed URLs.
- Do not invent payment success, wallet balances, payouts, refunds, provider verification, KYC completion, admin authorization or online readiness. Fail safely and show the actual state.
- Make small, reviewable changes. Do not replace the application with a scaffold or delete files/assets merely because they look unused.
- Do not run production migrations, modify production data, deploy services, merge pull requests or change secrets without explicit owner approval.
- Never commit credentials, tokens, private keys, real customer data or populated environment files. Use `.env.example` for documented variable names only.
- Do not add paid services or new provider/API-key dependencies without owner approval.

## Toolchain and useful commands
- Node.js 20 or newer; npm workspaces are defined at the repository root.
- Install dependencies with `npm ci`.
- Run API checks with `npm run check -w apps/api`.
- Run web tests with `npm test -w apps/web`.
- Build the web app with `npm run build:web`.
- Run the combined repository check with `npm run check`.
- Build the API with `npm run build`.
- Database commands use Prisma and require a correctly configured `DATABASE_URL`; inspect `.env.example` and the relevant runbook before running migrations.
- Android commands are `npm run mobile:sync`, `npm run mobile:build` and `npm run mobile:verify`; they require the Android SDK/JDK/Gradle environment. A successful CI APK build is not a physical-device acceptance test.
- `npm run dev` starts the API and web services; focused work can use `npm run dev:web` or `npm run dev:api`.

## Verification and reporting
- Add or update tests for behavior changes, including authorization and failure cases.
- Report exact commands and actual results. Distinguish unit tests, database integration tests, browser E2E, CI artifact builds, live deployment checks and physical-device tests.
- A successful build does not prove live API connectivity. Online builds require the correct public `VITE_API_URL` and matching API `CORS_ORIGINS`; never guess production origins.
- Read the latest audit and release tracker documents before claiming a phase or feature is complete.
- If a command fails, preserve its full error and fix the underlying cause rather than suppressing it or weakening the check.
