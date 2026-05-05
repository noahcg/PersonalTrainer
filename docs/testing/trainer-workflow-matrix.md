# Trainer Workflow Matrix

## Authentication And Session Management

### Create a new trainer user

What to test:

- Trainer can reach the login or setup flow from a fresh browser session.
- Trainer can create or complete a trainer account with required profile information.
- Setup does not allow incomplete required identity fields.
- Completed setup routes the trainer to the correct trainer experience.
- Returning to setup after completion does not corrupt the account.

Expected result:

- The trainer lands in the trainer app with the correct role, identity, and navigation.
- Trainer-specific routes are accessible.
- Client-only routes are not treated as the trainer home.

### Log in as an existing trainer

What to test:

- Valid trainer credentials create a usable session.
- Invalid credentials show a clear error.
- Refreshing a trainer page keeps the session.
- Opening a protected trainer URL while logged out redirects appropriately.

Expected result:

- The trainer reaches the requested or default trainer page.
- User identity in the header matches the logged-in trainer.

### Log out

What to test:

- Logout ends the trainer session.
- Protected trainer pages are no longer accessible without logging back in.
- Logging back in restores the expected trainer data.

Expected result:

- The trainer is returned to the public/login experience.
- Browser back/refresh does not expose protected trainer data.

## Trainer Dashboard

### Review dashboard summary

What to test:

- Dashboard reflects current counts for clients, check-ins, bulletins, and sessions.
- Empty dashboard states are useful before data exists.
- Quick actions route to the correct trainer workflows.
- Upcoming sessions appear after session bulletins are created.
- Pending check-ins appear after clients submit updates.

Expected result:

- Dashboard acts as a reliable summary of trainer work.
- Links and quick actions land on the relevant pages without losing context.

## Client Roster

### Create a client

What to test:

- Trainer can create a client with identity, contact, goals, availability, status, pricing tier, and package/session limit.
- Required fields are enforced.
- Duplicate or malformed emails are handled clearly.
- Client appears in the roster immediately.
- Roster metrics update after creation.
- Client detail page opens for the new client.

Expected result:

- Client record is saved and remains after refresh.
- Client has a sensible access state, session package state, and profile summary.

### Search, filter, and review clients

What to test:

- Trainer can find clients by name, email, status, or visible profile details.
- Roster cards expose enough information to distinguish clients.
- Selecting multiple clients behaves predictably.
- Empty search state explains that no clients match.

Expected result:

- Search/filter changes only the visible list, not the underlying data.
- Selected clients remain clear until cleared or acted on.

### Invite clients

What to test:

- Trainer can invite one or more selected clients.
- Invite subject and message can be reviewed before sending.
- Pending/active/not-invited states update correctly.
- Supabase-backed invite creates usable setup links.
- Demo mode provides an understandable invite preview or fallback.
- Client can complete setup from an invite and then appear as active to trainer.

Expected result:

- Invited clients have clear status.
- The trainer can tell whether setup is pending or complete.

### Archive selected clients

What to test:

- Trainer can select one or more clients and archive them.
- Archived clients no longer appear as active roster items if that is the intended behavior.
- Metrics update after archive.
- Archived clients do not receive unintended future assignments or invites.

Expected result:

- Archive action is clear and reversible only if the product supports a restore path.

## Client Profile

### Edit client profile

What to test:

- Trainer can update client contact information, status, pricing tier, session package limit, training level, goals, injuries, and notes.
- Existing data is prefilled correctly.
- Saving preserves unchanged fields.
- Invalid package/session values are rejected or normalized.
- Changes appear on roster, detail page, dashboard summaries, and related workflows.

Expected result:

- Client profile updates persist after refresh and are reflected wherever that client appears.

### Manage client status

What to test:

- Trainer can change client status using the available status controls.
- Status changes affect roster metrics and visual labeling.
- Status changes do not accidentally delete profile or assignment data.

Expected result:

- Status is reliable, visible, and persistent.

### Log in-person sessions

What to test:

- Trainer can start an in-person session for a client.
- Active session state appears clearly.
- Trainer can complete the session with notes, duration, and location where supported.
- Package/session counts update correctly.
- Session history appears in the client profile and dashboard/session summaries where applicable.

Expected result:

- Session records are accurate and do not double-count.

### Add coaching notes

What to test:

- Trainer can add a coaching note to a client.
- Notes are timestamped and ordered sensibly.
- Empty notes cannot be saved.
- Notes persist after refresh.

Expected result:

- Coaching note history is available on the client profile.

### Delete a client

What to test:

- Trainer can permanently delete a client only through an intentional destructive flow.
- Warning copy explains impact on profile data, assignments, messages, logs, and access.
- Supabase-backed delete removes the client and associated auth access where applicable.
- Deleted client no longer appears in roster, assignments, messages, check-ins, or dashboard summaries.

Expected result:

- Delete is hard to trigger accidentally and complete when confirmed.

## Exercise Library

### Add an exercise to the library

What to test:

- Trainer can create an exercise with name, category, movement pattern, difficulty, muscle groups, equipment, instructions, cues, mistakes, substitutions, demo media, and tags.
- Required fields are enforced.
- Long instructions and tag lists remain readable.
- New exercise appears in the exercise library and workout builder.

Expected result:

- Trainer-created exercise is usable anywhere exercises are selected.

### Search and filter exercise library

What to test:

- Search works across name, category, pattern, difficulty, muscle group, equipment, and tags.
- Category filters match visible exercises.
- Empty search state is useful.
- Global/reference exercises and trainer-created exercises are distinguishable.

Expected result:

- Trainer can quickly find the right movement.

### Edit a trainer-created exercise

What to test:

- Editable exercises open with existing data prefilled.
- Saving updates the exercise card, detail page, and workout builder options.
- Existing workouts using the exercise remain stable after edit.

Expected result:

- Exercise updates do not break previously created workouts.

### Exercise delete gap

What to test:

- Confirm whether deleting exercises is intentionally unsupported.
- Confirm trainer expectations when a custom exercise is no longer wanted.

Expected result:

- Product decision is documented: support delete/archive, or explain why not.

## Training Plans

### Create a plan

What to test:

- Trainer can create a plan with title, duration, description, goal, weekly structure, notes, and template setting.
- Required fields are clear.
- New plan appears in the plan library and can be selected.
- Plan metrics update.

Expected result:

- Plan persists and is available for assignment and workout linking.

### Edit a plan

What to test:

- Existing plan data is prefilled.
- Trainer can update plan structure without losing assignments or linked workouts.
- Edited values appear in plan detail and client views where assigned.

Expected result:

- Plan edits preserve relationships unless explicitly changed.

### Duplicate a plan

What to test:

- Trainer can duplicate a plan.
- Duplicate has a distinguishable title.
- Duplicate does not inherit client assignments unless intentionally designed to.
- Duplicate can be edited independently.

Expected result:

- Copy workflow supports reusable templates without accidental client assignment.

### Assign and unassign plans

What to test:

- Trainer can assign a plan to one or more clients.
- Assigning a plan removes or supersedes previous active plan assignments as intended.
- Assign dialog shows selected clients clearly.
- Assigned clients see the correct plan.
- Unselecting clients removes assignment if supported by the assign workflow.

Expected result:

- Client assignments are accurate and visible to both trainer and client.

### Plan delete/archive gap

What to test:

- Confirm whether deleting or archiving plans is intentionally unsupported.
- Confirm what trainers should do with obsolete plans.

Expected result:

- Product decision is documented: support delete/archive, or keep plans immutable.

## Workout Builder

### Create a workout

What to test:

- Trainer can start a new workout draft.
- Trainer can add workout name, day/phase label, linked plan, warm-up, cooldown, and coach notes.
- Trainer can add one or more blocks.
- Trainer can select a target block and add exercises from the library.
- Trainer can prescribe sets, reps, tempo, rest, RPE, load, and notes.
- Workout can be saved only when minimum required data exists.

Expected result:

- Workout appears in the workout library and linked plan if selected.

### Edit a workout

What to test:

- Selecting an existing workout loads full workout structure.
- Trainer can change details, blocks, exercises, and prescriptions.
- Removing an exercise from a block works.
- Saving an edited workout replaces the previous structure without duplicate blocks or stale exercises.

Expected result:

- Workout remains coherent and persists after refresh.

### Link workout to a plan

What to test:

- Trainer can select a plan while building or editing a workout.
- Linked workout appears under the plan detail.
- Changing the linked plan updates both old and new plan views correctly.

Expected result:

- Plan/workout relationships are accurate.

### Workout delete/archive gap

What to test:

- Confirm whether deleting workouts is intentionally unsupported.
- Confirm how trainers should handle outdated workouts.

Expected result:

- Product decision is documented.

## Bulletin Board

### Create a general bulletin

What to test:

- Trainer can create a general announcement with title, message, tags/audience options where supported, and RSVP settings if applicable.
- Required title/message validation works.
- Published bulletin appears in trainer bulletin list and client bulletin feed as intended.

Expected result:

- General announcements are visible to the correct audience.

### Create a session invite bulletin

What to test:

- Trainer can create a session invite with date, time, capacity, location details, map URL, meeting point, address, and notes.
- Required session schedule fields are enforced.
- Invalid map URLs are rejected or explained.
- Session invite appears in bulletin list, dashboard session overview, and client bulletin feed.
- Client RSVP updates trainer-facing attendance counts.

Expected result:

- Session bulletins reliably coordinate trainer/client attendance.

### Edit a bulletin

What to test:

- Existing bulletin data is prefilled.
- Trainer can edit general announcements and session invites.
- Edits update trainer list, dashboard session overview, and client feed.
- Existing RSVP state remains sensible after schedule or capacity edits.

Expected result:

- Bulletin edits update all related surfaces.

### Pin and unpin a bulletin

What to test:

- Trainer can pin a bulletin to the top.
- Pin state persists after refresh.
- Unpinning restores normal ordering.

Expected result:

- Important bulletins stay prominent.

### Archive and delete bulletins

What to test:

- Trainer can archive a bulletin and remove it from active views.
- Trainer can delete a bulletin when a permanent removal is intended.
- Deleted/archived bulletins do not remain on dashboard or client feeds.
- Destructive actions give sufficient clarity.

Expected result:

- Bulletin lifecycle is controllable and predictable.

## Resources

### Create a global resource

What to test:

- Trainer can create a resource with title, type, description, content, external link, estimated time, and tags.
- Global audience is clear.
- Resource appears in trainer resource grid and client resources for all clients.
- Search and global filter find the resource.

Expected result:

- Global resource is reusable support content.

### Create a client-specific resource

What to test:

- Trainer can assign a resource to one client.
- Assigned client name is visible on resource card/detail.
- Resource appears only for the assigned client.
- Personal filter finds the resource.

Expected result:

- Personalized resources respect audience rules.

### Resource read/detail behavior

What to test:

- Resource detail shows type, audience, tags, description, content, external link, estimated time, and updated date.
- External links behave safely and open as expected.
- Long resource content remains readable.

Expected result:

- Trainer can verify exactly what clients will see.

### Resource edit/delete gap

What to test:

- Confirm whether editing or deleting resources is intentionally unsupported.
- Confirm trainer expectations for correcting resource mistakes.

Expected result:

- Product decision is documented.

## Messages

### Review message inbox

What to test:

- Trainer can see clients with message threads.
- Unread or recent messages are easy to identify if supported.
- Empty inbox state is useful.
- Selecting a client loads the correct conversation.

Expected result:

- Trainer can understand communication status across clients.

### Send a message

What to test:

- Trainer can send a message to a client.
- Empty messages are blocked.
- Sent message appears immediately.
- Client can see trainer message.
- Client reply appears in trainer thread.
- Refresh preserves message history.

Expected result:

- Messaging works as a two-way communication channel.

### Message edit/delete gap

What to test:

- Confirm whether editing or deleting messages is intentionally unsupported.
- Confirm whether product requires moderation or correction behavior.

Expected result:

- Product decision is documented.

## Check-ins

### Review submitted check-ins

What to test:

- Trainer can see submitted check-ins with readiness, recovery, mood, notes, and reviewed state.
- Pending/unreviewed check-ins are easy to distinguish.
- Dashboard pending count matches check-in page.

Expected result:

- Trainer can prioritize client updates.

### Reply to or mark check-in reviewed

What to test:

- Trainer can open a check-in, add review/reply where supported, and save.
- Reviewed state updates immediately.
- Dashboard pending count decreases.
- Client can see trainer response if product supports it.

Expected result:

- Check-in review closes the feedback loop.

## Progress

### Review trainer progress overview

What to test:

- Trainer can view progress data for clients.
- Charts and summary cards render correctly with real, empty, and sparse data.
- Client selection/filtering works if available.
- Progress data matches related check-ins or session/workout logs where applicable.

Expected result:

- Trainer can use progress views to evaluate client trajectory.

## Trainer Settings

### Update trainer profile and business settings

What to test:

- Trainer can edit display name, email, phone, location, bio, business details, and any app-supported settings.
- Required fields and invalid email/phone values are handled clearly.
- Save confirmation appears.
- Header identity and settings form reflect saved changes after refresh.

Expected result:

- Trainer identity is consistent across the app.

### Update trainer photo

What to test:

- Trainer can choose a supported image file.
- Preview appears before or after save as intended.
- Unsupported file types and oversized files are handled gracefully.
- Header/avatar updates after save.

Expected result:

- Profile photo update is reliable and does not break layout.

### Password or email changes

What to test:

- Trainer can update password/email if supported.
- Current password, confirmation, and invalid input handling are clear.
- Session behavior after credential changes is understandable.

Expected result:

- Account changes are secure and do not strand the trainer.

## Cross-Workflow Integration

### Client-to-plan-to-workout path

What to test:

- Create client.
- Create plan.
- Create workout and link it to plan.
- Assign plan to client.
- Confirm trainer sees assignment and client sees plan/workout.

Expected result:

- Core coaching delivery loop works end to end.

### Bulletin-to-dashboard-to-client path

What to test:

- Create session bulletin.
- Confirm dashboard upcoming sessions update.
- Confirm client can RSVP.
- Confirm trainer attendance count updates.

Expected result:

- Scheduling and RSVP loop works end to end.

### Resource-to-client path

What to test:

- Create global resource.
- Create client-specific resource.
- Confirm correct client visibility.
- Confirm other clients cannot see personal resource.

Expected result:

- Resource audience rules work.

### Message/check-in feedback loop

What to test:

- Client submits check-in.
- Trainer reviews and responds.
- Trainer sends follow-up message.
- Client sees response/message.

Expected result:

- Ongoing coaching communication is coherent.
