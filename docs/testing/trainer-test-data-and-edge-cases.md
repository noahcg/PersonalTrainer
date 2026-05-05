# Trainer Test Data And Edge Cases

## Baseline Test Accounts

Create or seed these users for full Supabase testing:

| Role | Purpose | Required State |
| --- | --- | --- |
| Trainer A | Primary trainer tester | Completed setup, settings saved |
| Trainer B | Permissions isolation | Completed setup, separate data |
| Client Active | End-to-end assigned client | Accepted invite, can log in |
| Client Pending | Invitation workflow | Invited, setup incomplete |
| Client Draft | Roster workflow | Created, not invited |

## Baseline Client Profiles

Use clients with varied data:

- Client with complete profile, goals, injuries, notes, active status, and package session limit.
- Client missing optional data to test empty/detail states.
- Client with long name, long goals, long injury notes, and long availability text.
- Client with no assigned plan.
- Client with assigned plan and workout.
- Client with active or recently completed session.

## Exercise Test Data

Create exercises that cover:

- Beginner, intermediate, and advanced difficulty.
- Bodyweight, gym, free weight, calisthenics, and conditioning categories.
- Multiple muscle groups and equipment values.
- Long instructions.
- Several cues, mistakes, substitutions, and tags.
- Missing optional demo media.
- Invalid demo media URL if validation exists.

Edge cases:

- Very long exercise name.
- Duplicate exercise name.
- Tags with extra spaces.
- Exercise edited after being used in a workout.

## Plan Test Data

Create plans that cover:

- Template plan.
- Non-template assigned plan.
- Plan with no workouts.
- Plan with multiple linked workouts.
- Plan assigned to one client.
- Plan assigned to multiple clients.
- Long goal, structure, and notes.

Edge cases:

- Duplicate plan title.
- Duration set to zero, blank, non-number, and very large number.
- Editing a plan after assignment.
- Duplicating an assigned plan.
- Reassigning a client from one plan to another.

## Workout Test Data

Create workouts that cover:

- Unassigned workout.
- Workout linked to a plan.
- Workout with one block and one exercise.
- Workout with multiple blocks and many exercises.
- Workout with detailed prescriptions for sets, reps, tempo, rest, RPE, load, and notes.
- Workout with long warm-up, cooldown, and coach notes.

Edge cases:

- Save with missing workout name.
- Remove all exercises from a block.
- Add exercise to the wrong selected block, then correct it.
- Edit a workout with many blocks.
- Change linked plan on an existing workout.

## Bulletin Test Data

Create bulletins that cover:

- General announcement.
- Pinned announcement.
- Session invite today.
- Session invite in the future.
- Session invite with capacity.
- Session invite with full location details.
- Session invite with RSVP requested.
- Archived bulletin.

Edge cases:

- Missing title.
- Missing message.
- Session invite missing date or time.
- Invalid map URL.
- Past session date.
- Capacity of zero, negative number, and very large number.
- Edit session after clients RSVP.
- Delete session after clients RSVP.

## Resource Test Data

Create resources that cover:

- Global guide.
- Global video/link resource.
- Client-specific guide.
- Resource with content but no URL.
- Resource with URL but minimal content.
- Resource with multiple tags.
- Long-form content.

Edge cases:

- Missing title.
- Empty description but detailed content.
- Invalid URL if validation exists.
- Duplicate title.
- Personal resource without selected client.
- Assigned client deleted after resource creation.

## Messages Test Data

Create message scenarios:

- Empty thread.
- Trainer-only first message.
- Client reply.
- Long message.
- Rapid back-and-forth messages.

Edge cases:

- Empty message.
- Whitespace-only message.
- Very long message.
- Switching threads after typing an unsent message.
- Refresh after sending.

## Check-in Test Data

Create check-ins that cover:

- Unreviewed check-in.
- Reviewed check-in.
- Low readiness/recovery values.
- High readiness/recovery values.
- Long freeform note.
- Missing optional response fields if supported.

Edge cases:

- Multiple check-ins from same client.
- Check-in submitted while trainer is viewing dashboard.
- Review saved twice.

## Settings Test Data

Use settings values that cover:

- Complete trainer profile.
- Long trainer name.
- Long bio.
- Valid and invalid email.
- Valid and invalid phone.
- Location with special characters.
- Supported image file.
- Unsupported image file.
- Large image file.

Edge cases:

- Refresh after save.
- Logout/login after settings update.
- Photo upload canceled before save.
- Settings saved while network request fails.

## Permissions And Isolation Edge Cases

Test these with two trainers and at least two clients:

- Trainer A cannot see Trainer B clients.
- Trainer A cannot assign plans to Trainer B clients.
- Trainer A resources are not visible to Trainer B clients.
- Client-specific resource is visible only to assigned client.
- Client cannot access trainer routes.
- Logged-out user cannot access protected trainer routes.
- Deleted client cannot log in or view old assigned content.

## Responsive And Usability Edge Cases

Test each major workflow with:

- Long labels and long names.
- Empty states.
- Dense data states.
- Mobile viewport.
- Narrow desktop viewport.
- Keyboard-only navigation for critical forms.
- Screen reader labels for critical dialogs and destructive actions.
- Slow network behavior where possible.
- Browser refresh during or after save.
