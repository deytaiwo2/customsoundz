# Dublu Vé integration map

## Product direction
Keep Dublu Vé as the customer-facing music and audio-services marketplace. Reuse the imported application's mature account, service marketplace, booking, finance, trust and operations foundations. Event-planning tools remain optional workflows for customers who commission music or production for an occasion; they do not define the Dublu Vé brand.

## Reuse map

| Imported capability | Dublu Vé use | Integration status |
|---|---|---|
| Client account and event-planning role | Customer account and optional event/project brief | Existing customer flow retained; copy being adapted |
| Vendor profile and listings | Artist/studio/service-provider profile and service catalogue | Artist role creates ArtistProfile plus provider profile; artist profile editor and public directory are implemented |
| Marketplace search and bookings | Discover and book jingles, songs, voice, mixing, podcast and production services | Existing marketplace foundation retained; service catalogue still needs Dublu-specific categories and UI polish |
| Wallet, escrow and payment adapters | Customer project payments and provider settlement | Existing finance workflows retained; live provider configuration and acceptance testing still required |
| Reviews and vendor reputation | Verified artist/service ratings | Existing booking reviews retained; artist-specific verified-completion ranking not yet implemented |
| Promotions and subscriptions | Artist/vendor visibility and paid plans | Existing workflows retained; Dublu plans and entitlement rules need product decisions |
| Affiliate/referral tools | Customer acquisition and partner referrals | Existing affiliate tools retained; three-qualified-referral reward policy needs implementation |
| Verification and admin approvals | Provider trust, compliance and operational review | Existing workflows retained; Dublu policy and evidence requirements need finalization |
| Event tasks, guests, RSVP and check-in | Optional live-event production coordination | Retained as optional functionality, not the core marketplace |
| Background audio | Consent-based Dublu Vé site atmosphere | Rebranded; existing saved audio preferences remain readable |

## Implemented in this branch
- Added `ARTIST` to the PostgreSQL-backed Prisma role enum.
- Added `ArtistProfile` with display name, bio, genres, portfolio metadata, average rating and completed-job count.
- Artist registration creates an artist profile and a provider profile, allowing reuse of existing listing, booking and provider APIs.
- Artist role is recognized by JWT authorization and can use routes protected for vendors.
- Artist profile read/update API, artist workspace editor and public artist directory are implemented and covered by a PostgreSQL integration test.
- Dublu Vé public landing copy, custom SVG monogram, PWA manifest and Android/iOS display names are updated; native package identifier remains unchanged for compatibility.
- Audio service categories are added to the database seed list.
- Artist registration questionnaire, customer/artist role labels and artist portal routing are wired into the web application.
- Public landing and startup/audio consent copy are being changed to Dublu Vé.

## Remaining critical product work
1. Add editable public portfolio entries and artist detail pages; the directory currently exposes profile metadata only.
2. Add a private media adapter for sample uploads and playback with expiring signed URLs; never make master files public.
3. Add secure final MP3 delivery with order ownership checks, expiring download links and audit events.
4. Add production queue, assignment, revision, approval and delivery states.
5. Add verified-completion artist ratings and rankings.
6. Implement vendor retainership and the explicitly defined three-qualified-referral reward workflow.
7. Run the updated database seed in the intended development environment, then add Dublu Vé service templates and remove event-only assumptions from customer ordering where they do not fit.
8. Complete browser E2E tests for customer order, artist listing, booking, payment webhook and secure delivery.
9. Validate database migration on a clean PostgreSQL 16 database and on a backed-up copy of any existing environment.

## Safety and rollout
- This branch is not merged into the default branch.
- The artist migration must be applied to a development/test database first.
- Do not run production migrations, enable live payments or publish private audio until the owner has approved the deployment and security review.
