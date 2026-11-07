# Dublu Vé production-readiness gate

This checklist distinguishes code that has automated coverage from services that still require real production accounts, secrets, operator decisions, or physical-device verification. Passing GitHub Actions is not the same as being ready to accept live customer payments.

## Verified in CI

The feature branch has automated checks for:

- TypeScript and API/web build validation.
- PostgreSQL 16 schema migration and database integration tests.
- Web component/regression tests and Playwright customer/provider journeys.
- Artist registration, artist profile management, creative-provider listings, and directory reputation derived from fulfilled bookings and customer reviews.
- Booking wallet/escrow lifecycle, delivery approval, dispute handling and administrative resolution.
- iOS simulator compilation.
- Android QA debug APK compilation (workflow runs on pushes to this branch).

## Implemented application workflows

- Customer, artist, vendor, organizer and operations/admin account journeys.
- Public artist discovery with profile details, verification status, recorded review average and completed booking count.
- Creative-service listings, marketplace discovery, customer carts and wallet-funded checkout.
- Wallet balances, escrow holds, delivery approval, disputes and admin release/refund controls.
- Private final audio deliverables on funded standalone bookings. Providers can upload MP3, WAV, M4A, AAC, OGG or FLAC files (up to 25 MB each); customers download them only after delivery is submitted.
- KYC document storage adapter, notifications, subscriptions, referral-related roles and app update infrastructure.

## Launch blockers that require real configuration or an explicit business decision

### 1. Production API and database

- Provision a production PostgreSQL database with TLS, automated backups, restore testing and restricted credentials.
- Deploy the API and web application to stable HTTPS domains.
- Set `DATABASE_URL`, `JWT_SECRET` (unique, random and at least 32 characters), `APP_BASE_URL`, `API_BASE_URL`, and exact `CORS_ORIGINS`.
- Run migrations against a backup first; never use CI or demo credentials in production.

### 2. Payment collection

- Set `PAYMENT_MODE=live` only after a payment provider account is approved and live credentials are stored as backend secrets.
- Configure the selected Paystack, Flutterwave, Stripe or OPay credentials and the provider-specific webhook secret/signature settings.
- Register the production webhook URLs and test success, failure, duplicate webhook, timeout, reconciliation and refund/dispute scenarios with small controlled transactions.
- Wallet-funded checkout is implemented. Do not advertise a payment method until its live provider configuration and webhook verification have been tested.

### 3. Vendor payouts — not enabled

The current external payout endpoint deliberately returns `501 PAYOUT_NOT_CONFIGURED`. The platform can hold and release escrow into internal provider wallets, but it does not yet send money automatically to vendor bank accounts. A production launch must choose and implement a payout model (provider transfer API or a controlled manual payout queue with maker/checker approval, transfer references, reconciliation and audit history). Do not represent wallet credit as a completed bank payout.

### 4. Private media and KYC storage

- Configure HTTPS S3-compatible storage credentials on the API only: `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- Set a private `AUDIO_STORAGE_BUCKET`; `KYC_STORAGE_BUCKET` is used as a fallback if a separate audio bucket is not set.
- Keep public bucket access disabled. Configure encryption at rest, object lifecycle/retention, backups and storage monitoring.
- Without storage configuration, uploads fail closed with HTTP 503. Test upload/download, wrong-owner access, storage outage and object restore before live orders.
- Final booking audio delivery is implemented; public artist sample streaming and portfolio preview playback remain a separate unfinished feature.

### 5. Email and customer support

- Configure SMTP host, port, username, password and verified sender for password resets and transactional messages.
- Test delivery, spam handling, invalid/expired reset links and account recovery.
- Publish real support contact details, response targets, refund/cancellation rules, privacy notice, terms of service and dispute policy.

### 6. Android release

- The Dublu Vé Android QA workflow produces an installable **debug QA APK**; it is not a Play Store release build.
- Set the GitHub Actions variable `VITE_API_URL` to the production HTTPS API base ending in `/api/v1` before testing sign-in and transactions on a real device.
- A signed release requires the owner's Android keystore and secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, plus the expected signing fingerprint variable.
- Test on physical Android devices across supported versions, screen sizes, network loss/recovery, file upload/download, deep links and app update/rollback.

### 7. iOS release

The CI iOS workflow compiles a simulator build. A signed device/App Store release still requires Apple signing certificates, provisioning profiles, app-store configuration and physical-device QA.

## Release decision

Do not call the marketplace production-ready until all launch blockers above have named owners, configured environments, successful end-to-end tests and documented rollback procedures. The current branch is a tested development candidate, not a live production deployment.
