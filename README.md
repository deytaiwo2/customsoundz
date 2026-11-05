# Dublu Vé Entertainments

React/Vite frontend and Express/PostgreSQL API foundation for a custom music and audio production marketplace.

## Included in this foundation
- Five portal workspaces: customer, artist, vendor, production and admin.
- Interactive service catalogue, artist discovery and local demo order flow.
- PostgreSQL schema for users, artists, services, orders, ratings, vendor retainerships, referrals, payments and subscriptions.
- Express registration/login, service catalogue and customer order API foundations.
- Server-side Paystack initialization and signature-checked webhook foundation.

## Important status note
The current frontend runs in demo mode; the order interaction stores data in browser memory only. API authentication and live records are not yet connected to the UI. Artist private sample streaming, protected MP3 delivery, subscription lifecycle, three-qualified-referral reward qualification/payout, retainership management, production workflows and admin CRUD still need implementation. The original template source was not present in the connected repository, so original template features could not be inspected or retained.

## Setup
Requirements: Node.js 20+, npm, PostgreSQL 16+.
1. Create an empty database named dublu_ve.
2. Back up and inspect any existing database before schema changes. Apply server/schema.sql only to a new database or after an approved migration plan.
3. Run npm install.
4. Copy .env.example to .env and set DATABASE_URL plus a strong JWT_SECRET.
5. Run psql "$DATABASE_URL" -f server/schema.sql.
6. Run npm run dev and open http://localhost:5173. API health: http://localhost:4000/api/health.

## Production build
Run npm ci, npm run check, npm run build, then NODE_ENV=production npm start. Configure secrets on the hosting provider, use HTTPS and a managed PostgreSQL database. Never expose payment or database secrets in frontend code.

## Security and remaining launch work
Private sample playback and MP3 delivery require private object storage and short-lived signed URLs; do not publish permanent public master-file URLs. Implement role-specific permissions, admin audit logs, service seed data/migrations, subscriptions, referral qualification and three-referral reward approval, vendor retainership lifecycle, verified-completion ratings/rankings, secure production handoff and automated tests before launch. Paystack success must be confirmed by the signed webhook, not a browser redirect.
