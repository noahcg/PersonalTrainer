# Changelog

All notable app updates should be recorded here.

This project uses pre-1.0 semver until intentional launch:

- Patch: small fixes, copy updates, and low-risk UI adjustments.
- Minor: user-visible features, workflow changes, schema changes, integrations, and release-prep milestones.
- Major: reserved for the intentional `1.0.0` launch.

## [0.7.13] - 2026-08-23

- Updated the trainer app header eyebrow and account chip subtitle.

## [0.7.12] - 2026-08-23

- Restored shared bottom padding across client and trainer app pages.

## [0.7.11] - 2026-08-23

- Changed the client account chip subtitle to "Client account."

## [0.7.10] - 2026-08-23

- Removed the demo client profile photo from the client header's initial loading state.

## [0.7.9] - 2026-08-23

- Changed the client header eyebrow from "Client experience" to "Welcome back."

## [0.7.8] - 2026-08-23

- Removed the supporting message below the app header greeting.

## [0.7.7] - 2026-08-23

- Updated the client app header to show a time-of-day greeting using the client's name.

## [0.7.6] - 2026-08-22

- Renamed the trainer navigation item from Communications to Messages.
- Added unread client-message badges to the trainer Messages navigation and inbox threads.
- Simplified trainer inbox thread rows to client identity and latest timestamp.
- Marked client-sent messages as read when the trainer opens that client thread.

## [0.7.5] - 2026-08-22

- Removed the trainer communications summary, metrics, and search panel from the messages page.

## [0.7.4] - 2026-08-22

- Added bottom breathing room to the trainer communications workspace so the message window does not touch the browser edge.

## [0.7.3] - 2026-08-22

- Changed the client Messages nav badge to show only unread trainer-sent messages.
- Marked trainer-sent messages as read when the client opens their Messages page.
- Matched trainer chat behavior with bottom-aligned messages, auto-scroll, and Enter-to-send.

## [0.7.2] - 2026-08-22

- Moved Messages to the third item in the client navigation.
- Added a client Messages navigation badge showing the number of trainer-sent messages.

## [0.7.1] - 2026-08-22

- Simplified the client messages page to show only the messaging thread and reply composer.
- Kept the client message page height stable by making the transcript area scroll internally.
- Aligned the desktop client message panel height with the bottom of the left navigation.
- Anchored client message bubbles to the bottom of the transcript and auto-scrolled to new messages.
- Added Enter-to-send behavior for the client message reply field.

## [0.7.0] - 2026-08-21

- Added PWA metadata and a service worker for installable app behavior.
- Added trainer Web Push subscription management and test notifications.
- Added scheduled trainer appointment reminder delivery with duplicate-send protection.
- Added Supabase schema support for push subscriptions and reminder delivery tracking.

## [0.6.0] - 2026-08-21

- Bumped the app to version `0.6.0`.
- Added release tracking rules for future Codex-assisted updates.
- Added a version check script to keep `package.json`, `package-lock.json`, and `CHANGELOG.md` aligned.
