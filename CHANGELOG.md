# Changelog

All notable app updates should be recorded here.

This project uses pre-1.0 semver until intentional launch:

- Patch: small fixes, copy updates, and low-risk UI adjustments.
- Minor: user-visible features, workflow changes, schema changes, integrations, and release-prep milestones.
- Major: reserved for the intentional `1.0.0` launch.

## [0.12.4] - 2026-08-26

- Let trainers customize reference exercises by saving trainer-owned copies instead of showing locked rows.

## [0.12.3] - 2026-08-26

- Changed the Exercise Library from large row tiles to a compact equal-height index layout.

## [0.12.2] - 2026-08-26

- Reworked the Exercise Library into equal-height catalog rows instead of card tiles.

## [0.12.1] - 2026-08-26

- Redesigned Exercise Library cards with sharper tiles and integrated edit actions.

## [0.12.0] - 2026-08-26

- Added trainer exercise image uploads so self-shot demo photos can be saved to exercise media instead of requiring an external URL.

## [0.11.8] - 2026-08-26

- Removed the Exercise Library intro and summary metrics so library tools start higher on the page.

## [0.11.7] - 2026-08-26

- Tightened the Workout Builder landing page spacing after removing the right-side panel.

## [0.11.6] - 2026-08-26

- Simplified the Workout Builder landing page by removing the eyebrow and right-side sequence panel.

## [0.11.5] - 2026-08-26

- Redesigned the Workout Builder landing page as a lighter builder canvas with an integrated exercise-to-workout-to-plan path.

## [0.11.4] - 2026-08-26

- Removed the extra workflow navigation strip from the Workout Builder landing page.

## [0.11.3] - 2026-08-26

- Reworked the Workout Builder landing page to remove redundant explanatory cards and replace them with a compact workflow navigation strip.

## [0.11.2] - 2026-08-26

- Expanded the Workout Builder landing page copy to explain the exercise-to-workout-to-plan building-block workflow.

## [0.11.1] - 2026-08-26

- Reflowed the trainer workout editor so the new Workout Builder rail no longer pushes the workout details panel off-screen.

## [0.11.0] - 2026-08-26

- Simplified the trainer navigation to Dashboard, Clients, Calendar, Messages, Bulletin Board, Workout Builder, and Settings.
- Added a trainer Workout Builder hub page with clear entry points for Exercise Library, Workouts, and Training Plans.
- Added a shared left-rail subnav across Exercise Library, Workouts, Training Plans, and exercise detail pages.

## [0.10.0] - 2026-08-26

- Removed the standalone trainer Progress page and nav item so trainer progress review stays client-specific.

## [0.9.1] - 2026-08-26

- Fixed dashboard and schedule displays so saved trainer calendar times render in the app timezone consistently across development and production.

## [0.9.0] - 2026-08-26

- Added trainer-only calendar items so trainers can block work time for client management, workout building, demo media, or any other freeform task.
- Updated trainer calendar and dashboard copy to treat client appointments and trainer work blocks as one daily schedule.
- Hid client reminder controls unless a calendar item is linked to a client.
- Updated the trainer dashboard's next-calendar card to label client appointments and trainer work blocks differently.
- Renamed trainer-only dashboard work blocks to planning sessions without repeating the label in the card eyebrow.
- Reordered the trainer calendar item dialog so trainers choose the event type before seeing client-specific fields.
- Moved trainer calendar month controls into the calendar panel above the weekday grid.
- Refined the trainer calendar month header styling with lighter navigation controls and cleaner hierarchy.
- Redesigned the selected-day event count as quieter agenda metadata instead of a rounded badge.
- Fixed selected-day event cards so edit and delete actions stay aligned in the top-right corner.
- Fixed duplicate planning-session events after creating or hydrating trainer calendar items.

## [0.8.15] - 2026-08-24

- Added spacing and visual polish to the trainer settings profile sections.

## [0.8.14] - 2026-08-24

- Added in-app Terms and Privacy links to trainer settings, client profile, and account setup.

## [0.8.13] - 2026-08-24

- Prevented the public legal page brand name from wrapping across lines.

## [0.8.12] - 2026-08-24

- Added public Terms of Service and Privacy Policy pages.
- Linked Terms and Privacy from the logged-out public footer.

## [0.8.11] - 2026-08-23

- Reworked trainer Messages on mobile with a compact client picker and a more phone-friendly conversation layout.

## [0.8.10] - 2026-08-23

- Capped the trainer message conversation height so long threads scroll internally on desktop and mobile.

## [0.8.9] - 2026-08-23

- Replaced the large black client workout hero with a compact workout summary for faster mobile logging.

## [0.8.8] - 2026-08-23

- Improved client mobile layouts for messages, workout lists, and workout logging.
- Added compact client page chrome for focused phone workflows and a sticky mobile workout completion bar.

## [0.8.7] - 2026-08-23

- Prevented mobile viewport scaling and input-focus zoom in the app shell.

## [0.8.6] - 2026-08-23

- Changed client home Trainer notes to show the latest trainer-managed profile note instead of recent messages.
- Limited client profile editing to profile photo updates; trainer-managed profile details are now read-only for clients.

## [0.8.5] - 2026-08-23

- Grouped consecutive chat bubbles from the same sender with tighter spacing, connected corners, and end-of-group timestamps.

## [0.8.4] - 2026-08-23

- Fixed the client message thread's trainer avatar lookup so it can display the trainer profile image under Supabase row-level security.

## [0.8.3] - 2026-08-23

- Displayed the trainer's uploaded profile image on trainer-sent bubbles in the client message thread.

## [0.8.2] - 2026-08-23

- Refined client and trainer message threads with an inset transcript surface, reserved scrollbar gutter, tighter chat bubbles, and clearer sent/received bubble edges.

## [0.8.1] - 2026-08-23

- Fixed client workout exercise references so trainer-added demo media appears in the client form review dialog.

## [0.8.0] - 2026-08-23

- Replaced the vague adherence display with plan adherence based on scheduled assigned workouts due so far.
- Added due-workout counts to client summaries so clients and trainers can see what the adherence percentage means.

## [0.7.14] - 2026-08-23

- Changed trainer session logging to record a completed in-person session immediately instead of starting an active stopwatch-style session.

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
