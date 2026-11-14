# Dublu Vé private audio delivery

## What this adds

Providers can attach audio files to a fully funded, standalone booking. Customers can download the files from their order screen. The object itself is never exposed through a public bucket URL.

Supported formats: MP3, WAV, M4A, AAC, OGG and FLAC. Maximum upload size: 25 MB per file.

## Storage configuration

The API uses the existing S3-compatible storage credentials already used by the KYC document adapter:

- `AWS_ENDPOINT_URL_S3`: HTTPS S3-compatible endpoint
- `AWS_REGION`: bucket signing region
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: server-side credentials only
- `AUDIO_STORAGE_BUCKET`: recommended private bucket for audio deliverables
- `KYC_STORAGE_BUCKET`: used as a fallback bucket if `AUDIO_STORAGE_BUCKET` is not set

The audio adapter writes objects under `audio-deliveries/<booking-id>/`. Keep the bucket private; do not enable public object access. Never put storage credentials in the web app, Android app, or repository. If storage is not configured, upload requests fail closed with HTTP 503; booking payments and other API functions remain available.

## Booking workflow

1. The customer pays the booking in full.
2. The provider uploads one or more audio files from **Bookings & delivery**.
3. The provider submits a delivery note. The API refuses to mark the booking delivered until at least one audio file is attached.
4. The customer downloads the protected file(s), then approves delivery or opens a dispute.
5. Escrow release remains governed by the existing booking approval workflow.

The upload endpoint accepts the raw audio file body:

- `POST /api/v1/payments/bookings/:id/deliverables?fileName=final-mix.mp3`
- Header: `Authorization: Bearer <access-token>`
- Header: `Content-Type: audio/mpeg` (or another supported audio MIME type)
- Body: raw audio bytes

The protected download endpoint is:

- `GET /api/v1/payments/bookings/:id/deliverables/:assetId`

Only the booking customer, the provider who owns the booking, and an administrator can retrieve a file. Customers can retrieve files only after the provider submits delivery. Responses use private, no-store caching and attachment disposition.

## Operational notes

- This is final booking delivery, not public portfolio/sample streaming.
- Files are not publicly addressable; all downloads pass through authenticated API authorization.
- Configure object-store lifecycle and backup policies before launch.
- Test upload, download, dispute, approval, and storage outage behavior against the production-like storage account before enabling live bookings.
