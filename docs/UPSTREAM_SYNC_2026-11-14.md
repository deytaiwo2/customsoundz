# Dublu Vé upstream functionality update — 14 November 2026

This change set selectively adapts reusable capabilities from the latest reviewed
`demtaiwo1-eng/Winning-game-` source revision to the Dublu Vé / CustomSoundz
marketplace. It is not a wholesale upstream replacement.

## Adapted functionality

- **Dublu Vé Guide:** role-aware in-app help for customers, artists, vendors and
  administrators, with direct links to the song studio, artist directory,
  dashboards, wallet and support areas.
- **Wallet transaction history:** the wallet panel now renders the append-only
  ledger returned by the existing wallet API, including amount, reference,
  timestamp and post-transaction balance.
- **Platform revenue subledger:** wallet-funding fees and booking commissions
  are written to a separate currency-scoped accounting journal in the same
  transaction as the related wallet movement. The migration backfills legacy
  fee rows without changing customer or provider wallet balances. Admins can
  review the revenue balances and recent entries.
- **Paystack webhook verification:** accepts the newer timestamped webhook signature with a dedicated `PAYSTACK_WEBHOOK_SECRET`, enforces a five-minute replay window and retains legacy signature verification during migration.
- **Central payment mode:** administrators can select DEMO, TEST or LIVE from
  one audited setting shared by the API. Payment requests refresh the setting,
  and intent creation locks against a concurrent mode change.

## Dublu Vé payment safety rules

- The new database setting is seeded as **DEMO**. Demo checkout is simulated and
  does not collect or transfer real money; it is allowed on the demo deployment.
- TEST mode requires sandbox provider credentials and is locked on production
  unless `ALLOW_PRODUCTION_TEST_MODE=true` is explicitly configured.
- LIVE mode requires a supported live Paystack or Flutterwave secret key and
  a typed `LIVE` confirmation. OPay is not considered a live-ready provider
  because the inherited adapter targets its sandbox endpoint.
- Existing commission configuration is retained. This update does not import
  EPHINTA's fee percentages or silently change CustomSoundz pricing.
- No payment-provider credentials are committed to GitHub.

## Deliberately not copied

- EPHINTA-specific OPay live transfer and payout routes.
- EPHINTA event/verifier workflows that do not apply to custom music orders.
- EPHINTA-only 2% wallet top-up fee rules or brand-specific copy.
- Any changes to the separate EPHINTA deployment, database or production data.

## Verification

Run the repository CI checks, Prisma validation/generation, database migrations,
API and web tests, and web/API production builds. The Render demo API applies
Prisma migrations on startup; confirm the new revenue and runtime-setting tables
exist before using the admin controls.
