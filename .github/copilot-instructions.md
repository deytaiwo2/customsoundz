# Copilot instructions for this repository

## Product and architecture
- This repository contains the EPHINTA event-planning and event-services marketplace application. It is not a music-streaming or audio-marketplace application.
- Preserve the existing monorepo: React + Vite web/PWA in `apps/web`, Express + TypeScript API in `apps/api`, Prisma/PostgreSQL data layer, and Capacitor Android/iOS shell in `apps/mobile`.
- Keep existing authentication, role authorization, planner/event workflows, vendors, guests/RSVP, marketplace, wallet/escrow, payment-provider adapters, messaging, admin controls, and mobile/offline behavior compatible.
- Before changing a feature, trace its active UI route, API route/service, Prisma model/migration, tests, and mobile impact. Reuse existing patterns and APIs rather than introducing parallel implementations.

## Safe development rules
- Make small, reviewable changes. Do not replace the application with a scaffold or delete files/assets merely because they look unused.
- Do not run production migrations, modify production data, deploy services, merge pull requests, or change secrets without explicit owner approval.
- Do not invent payment success, wallet balances, payouts, refunds, provider verification, KYC completion, admin authorization, or online readiness. Fail safely and display the real state.
- Never commit credentials, tokens, private keys, real customer data, or populated environment files. Use `.env.example` for documented variable names only.
- Do not add paid services or new provider/API-key dependencies without owner approval.
- Preserve branding and product naming unless the task explicitly requests a rebrand. Historical ESS identifiers may be compatibility-sensitive.

## Toolchain and useful commands
- Node.js 20 or newer; npm workspaces are defined at the repository root.
- Install dependencies with `npm ci`.
- Run API checks with `npm run check -w apps/api`.
- Run web tests with `npm test -w apps/web`.
- Build the web app with `npm run build:web`.
- Run the combined repository check with `npm run check`.
- Build the API with `npm run build`.
- Database commands use Prisma and require a correctly configured `DATABASE_URL`; inspect `.env.example` and the relevant runbook before running migrations.
- Android commands are `npm run mobile:sync`, `npm run mobile:build`, and `npm run mobile:verify`; they require the Android SDK/JDK/Gradle environment. A successful CI APK build is not a physical-device acceptance test.
- `npm run dev` runs verification/build steps before starting the safe development server; for faster focused work use `npm run dev:web` or `npm run dev:api` when their prerequisites are satisfied.

## Verification and reporting
- Add or update tests for behavior changes, including authorization and failure cases.
- Report the exact commands run and their actual results. Distinguish unit tests, database integration tests, browser E2E, CI artifact builds, live deployment checks, and physical-device tests.
- A successful build does not prove live API connectivity. Online builds require the correct public `VITE_API_URL` and matching API `CORS_ORIGINS`; never guess production origins.
- Read the latest audit and release tracker documents before claiming a phase or feature is complete. Older reports are historical snapshots.
- If a command fails, preserve its full error and fix the underlying cause rather than suppressing it or weakening the check.
