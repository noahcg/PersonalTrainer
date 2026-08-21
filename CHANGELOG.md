# Changelog

All notable app updates should be recorded here.

This project uses pre-1.0 semver until intentional launch:

- Patch: small fixes, copy updates, and low-risk UI adjustments.
- Minor: user-visible features, workflow changes, schema changes, integrations, and release-prep milestones.
- Major: reserved for the intentional `1.0.0` launch.

## [0.7.0] - 2026-08-21

- Added PWA metadata and a service worker for installable app behavior.
- Added trainer Web Push subscription management and test notifications.
- Added scheduled trainer appointment reminder delivery with duplicate-send protection.
- Added Supabase schema support for push subscriptions and reminder delivery tracking.

## [0.6.0] - 2026-08-21

- Bumped the app to version `0.6.0`.
- Added release tracking rules for future Codex-assisted updates.
- Added a version check script to keep `package.json`, `package-lock.json`, and `CHANGELOG.md` aligned.
