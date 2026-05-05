# Trainer UI/UX Testing Plan

## Purpose

This plan defines what needs user testing on the trainer side of the app. It focuses on real workflows a trainer must complete to use the system, not individual clicks, taps, or implementation details.

Use this plan to confirm that each trainer workflow is understandable, reliable, persistent, and connected to the rest of the product.

## Scope

Trainer-facing areas in scope:

- Authentication and session management
- Trainer dashboard
- Client roster and client profiles
- Client invitations and account setup handoff
- Training plans
- Workout builder
- Exercise library
- Bulletin board and session invites
- Resources
- Messages
- Check-ins
- Progress
- Trainer settings
- Logout and return-session behavior

Client-side verification is included only where it is required to prove a trainer workflow works end to end, such as invitations, assigned plans, bulletin visibility, resources, messages, and RSVP/check-in visibility.

## Test Environments

Run each major workflow in both supported modes when possible:

- Demo/local mode: validates local storage behavior, UI flow, empty states, and non-Supabase fallback behavior.
- Supabase-backed mode: validates authentication, database persistence, RLS/server permissions, cross-account visibility, and refresh/session behavior.

Minimum viewport coverage:

- Desktop trainer workflow viewport
- Tablet or narrow laptop viewport
- Mobile viewport for critical navigation and read-only review flows

Minimum browser coverage:

- Chrome or Chromium
- Safari
- Firefox if time allows

## Test Data Strategy

Create a small but realistic data set before full workflow testing:

- One trainer account with completed settings.
- Three client profiles:
  - Active client with accepted access.
  - Invited client with pending access.
  - Draft/not invited client.
- At least one archived/inactive client if the current UI supports it.
- Two plans:
  - One reusable template.
  - One assigned client plan.
- Two workouts:
  - One unassigned workout.
  - One linked to a plan.
- Several exercises:
  - Global/reference exercise.
  - Trainer-created exercise.
  - Edited trainer-created exercise.
- Three bulletins:
  - General announcement.
  - Pinned announcement.
  - Session invite with RSVP and location.
- Two resources:
  - Global resource.
  - Client-specific resource.
- Message thread with one trainer message and one client reply.
- One reviewed and one unreviewed check-in.

## Global Acceptance Criteria

Every workflow should meet these criteria:

- The trainer can tell what the page is for within a few seconds.
- Primary actions are visible and named clearly.
- Required fields are understandable before submission.
- Missing or invalid information produces a useful error or disabled state.
- Successful actions show clear confirmation.
- New or changed data appears immediately in the UI.
- New or changed data remains after refresh.
- Supabase-backed data remains after logout and login.
- Demo-mode data remains within the expected local demo session.
- Empty states explain what to do next.
- Loading, saving, and disabled states prevent duplicate or confusing submissions.
- The same record is not accidentally duplicated unless the workflow is explicitly duplicate/copy.
- Navigation back to the relevant list/detail page is clear.
- Trainer-only data is not visible to the wrong role or wrong user.

## CRUD Coverage Expectations

For each feature, test every operation the UI currently exposes:

- Create: trainer can add a new item with valid data.
- Read: trainer can find and review the new item in list, detail, dashboard, or related pages.
- Update: trainer can edit the item if editing is supported.
- Delete/archive/remove: trainer can remove, archive, unassign, or delete the item if supported.
- Negative cases: invalid or incomplete data is handled gracefully.
- Persistence: results survive refresh and auth session transitions.

If a workflow does not support update or delete in the current UI, document that as a product gap rather than a failed test.

## Key UX Risks To Watch

- Page headers and workspace cards duplicate each other or create unclear hierarchy.
- Trainer creates data but cannot find it afterward.
- Trainer saves an item but related pages do not update.
- Trainer edits an item and loses previously entered fields.
- Trainer creates duplicate records by submitting twice.
- Trainer cannot recover from a validation or network error.
- Trainer cannot distinguish global vs personal/client-specific content.
- Trainer cannot tell whether an action affects one client, all clients, or a selected group.
- Trainer cannot safely identify destructive actions.
- Mobile navigation hides essential trainer actions.
- Demo mode and Supabase mode behave differently without explanation.

## Pass/Fail Definitions

Pass:

- The trainer can complete the workflow without tester intervention.
- Data is accurate, visible in the expected places, and persistent.
- The UI communicates state and errors clearly.

Fail:

- The trainer cannot complete the workflow.
- The workflow appears successful but data is missing, incorrect, duplicated, or visible to the wrong audience.
- Required data can be saved in an unusable state.
- The UI blocks recovery from an error.

Needs product decision:

- The trainer expects a capability that the current product does not expose, such as deleting a plan or deleting a resource.
- The UI behavior is technically correct but confusing enough that the intended workflow is unclear.

## Recommended Test Order

1. Authentication and trainer session setup.
2. Trainer settings.
3. Client creation and invitation.
4. Client profile management.
5. Exercise library creation/editing.
6. Plan creation/editing/duplication/assignment.
7. Workout creation/editing and plan linking.
8. Bulletin creation/editing/pinning/archiving/deleting/session invite.
9. Resource creation and audience visibility.
10. Messaging.
11. Check-ins and progress review.
12. Dashboard aggregation and cross-feature consistency.
13. Logout, session expiry, and return login.

## Related Files

- [Trainer workflow matrix](./trainer-workflow-matrix.md)
- [Trainer QA run checklist](./trainer-qa-run-checklist.md)
- [Trainer test data and edge cases](./trainer-test-data-and-edge-cases.md)
