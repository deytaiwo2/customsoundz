# Dublu Vé production project workflow

## Customer journey

1. Open the public landing page and scroll to **Build a sample. Price your production.**
2. Select style, mood, key, tempo and sample duration. The browser synthesizer creates a short illustrative sketch locally; it does not claim to generate a finished AI song.
3. Select one or more production services. The page displays an itemised NGN estimate from the server-matched launch price menu.
4. Sign in or create a customer account and submit the project. The API recalculates the estimate on the server; browser-submitted prices are never trusted.
5. The project is assigned to the Dublu Vé Production queue and administrators receive an in-app notification.
6. Production staff move the project through IN_PRODUCTION and REVIEW. Once the final audio master is ready, an administrator uploads it through the private deliverable endpoint.
7. Uploading a valid final audio file changes the project to READY and sends the customer an in-app notification. The customer can download the private file from the project list; the API checks ownership on every download.

## API operations

All endpoints are under `/api/v1/production-projects` and require a signed-in session. Admin operations require the ADMIN role.

- `POST /` — create a production brief; the server calculates the amount.
- `GET /` — list the signed-in customer's projects.
- `GET /admin/queue` — production-team queue.
- `PATCH /:projectId/status` — set IN_PRODUCTION, REVIEW or CANCELLED.
- `PUT /:projectId/deliverable?fileName=final-master.mp3` — upload an MP3/WAV/M4A/AAC/OGG/FLAC master as the raw request body, maximum 25 MB. Example:

```sh
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: audio/mpeg" \
  --data-binary @final-master.mp3 \
  "$API_BASE/api/v1/production-projects/$PROJECT_ID/deliverable?fileName=final-master.mp3"
```

- `GET /:projectId/download` — private customer/admin download. The route streams the object from configured private S3-compatible audio storage; it does not expose a public bucket URL.

## Yuletide loved-one song offer

The landing studio includes a seasonal Yuletide offer for original occasional songs dedicated to a loved one. It is available from launch through **31 December 2026 (Nigeria time)**:

| Package | Rate per song | Package total |
|---|---:|---:|
| 1 song | ₦30,000 | ₦30,000 |
| 2 songs | ₦25,000 | ₦50,000 |
| 3 songs | ₦20,000 | ₦60,000 |

Customers may optionally request personal storytelling based on a dedication, memory or story. The target maximum finished length for this option is **2 minutes 30 seconds**. Storytelling is recorded in the submitted production brief; the production team confirms the final creative scope and quote. The API recalculates package pricing from the selected quantity and rejects the campaign after the stated end date.

## Price menu and commercial approval

The initial menu in the landing studio and API is an illustrative launch estimate in NGN:
- Original song production: ₦180,000
- Brand/advert jingle: ₦95,000
- Voice-over: ₦45,000
- Custom instrumental/beat: ₦85,000
- Mixing: ₦55,000
- Mastering: ₦30,000
- Studio recording session: ₦40,000

These are starter estimates, not prices previously approved by the business owner. The Yuletide package rates above are the campaign-specific prices requested for this offer. The production team must approve or replace them before accepting paid customer orders. The customer is told that the final quote is confirmed after reviewing complexity, duration, revisions, talent and deliverables. No payment is collected by this intake workflow; payment/escrow must be linked to an approved quote before production is commercially accepted.

## Notifications and limitations

The project assignment and READY events are persisted as in-app notifications. Device push delivery is not yet configured (FCM/APNs credentials and sender required), and email notifications require SMTP configuration. Do not promise push or email delivery until those providers are configured and tested.

The sample is a local Web Audio sketch made from simple oscillators and rhythm pulses. It is for testing a musical direction, not a rendered song, recording, AI generation or final master. Final production still requires the Dublu Vé production team and a real audio deliverable.
