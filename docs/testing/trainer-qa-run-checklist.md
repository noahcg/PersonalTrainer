# Trainer QA Run Checklist

Use this checklist during a manual QA pass. Mark each area as Pass, Fail, Blocked, or Needs Product Decision.

## Run Metadata

- Date:
- Tester:
- Environment:
- Browser:
- Viewport:
- Build/commit:
- Data mode: Demo / Supabase
- Trainer account:
- Client accounts used:

## Smoke Test

| Area | Status | Notes |
| --- | --- | --- |
| Trainer can log in |  |  |
| Trainer Command Center header loads |  |  |
| Side navigation routes work |  |  |
| Dashboard loads without errors |  |  |
| Logout works |  |  |
| Protected pages require login |  |  |

## Clients

| Workflow | Status | Notes |
| --- | --- | --- |
| Create client |  |  |
| Search/filter roster |  |  |
| Select multiple clients |  |  |
| Invite selected clients |  |  |
| Invite setup handoff works |  |  |
| Archive selected clients |  |  |
| Open client detail |  |  |
| Edit client profile |  |  |
| Change client status |  |  |
| Start/complete in-person session |  |  |
| Add coaching note |  |  |
| Delete client |  |  |

## Exercise Library

| Workflow | Status | Notes |
| --- | --- | --- |
| Create exercise |  |  |
| Search exercises |  |  |
| Filter exercises |  |  |
| Open exercise detail |  |  |
| Edit trainer-created exercise |  |  |
| Confirm global exercise is read-only |  |  |
| Confirm delete/archive expectation |  |  |

## Plans

| Workflow | Status | Notes |
| --- | --- | --- |
| Create plan |  |  |
| Edit plan |  |  |
| Duplicate plan |  |  |
| Assign plan to one client |  |  |
| Assign plan to multiple clients |  |  |
| Unassign/supersede assignment |  |  |
| Confirm client sees assigned plan |  |  |
| Confirm delete/archive expectation |  |  |

## Workouts

| Workflow | Status | Notes |
| --- | --- | --- |
| Create workout |  |  |
| Add blocks |  |  |
| Add exercises to selected block |  |  |
| Edit prescriptions |  |  |
| Remove exercise from block |  |  |
| Save workout |  |  |
| Edit existing workout |  |  |
| Link workout to plan |  |  |
| Confirm linked workout appears in plan |  |  |
| Confirm delete/archive expectation |  |  |

## Bulletins

| Workflow | Status | Notes |
| --- | --- | --- |
| Create general bulletin |  |  |
| Create session invite |  |  |
| Validate required bulletin fields |  |  |
| Validate session date/time/location fields |  |  |
| Edit bulletin |  |  |
| Pin/unpin bulletin |  |  |
| Archive bulletin |  |  |
| Delete bulletin |  |  |
| Confirm client feed visibility |  |  |
| Confirm client RSVP updates trainer count |  |  |
| Confirm dashboard session overview updates |  |  |

## Resources

| Workflow | Status | Notes |
| --- | --- | --- |
| Create global resource |  |  |
| Create client-specific resource |  |  |
| Search resources |  |  |
| Filter global/personal resources |  |  |
| Open resource detail |  |  |
| Confirm global client visibility |  |  |
| Confirm personal resource visibility only for assigned client |  |  |
| Confirm edit/delete expectation |  |  |

## Messages

| Workflow | Status | Notes |
| --- | --- | --- |
| Open trainer messages |  |  |
| Select client thread |  |  |
| Send trainer message |  |  |
| Confirm client sees message |  |  |
| Confirm trainer sees client reply |  |  |
| Refresh preserves thread |  |  |
| Confirm edit/delete expectation |  |  |

## Check-ins And Progress

| Workflow | Status | Notes |
| --- | --- | --- |
| Dashboard pending check-in count is accurate |  |  |
| Check-ins page lists submitted check-ins |  |  |
| Review/reply to check-in |  |  |
| Reviewed state persists |  |  |
| Dashboard count updates after review |  |  |
| Progress page renders with normal data |  |  |
| Progress page renders with empty/sparse data |  |  |

## Settings

| Workflow | Status | Notes |
| --- | --- | --- |
| Load trainer settings |  |  |
| Edit profile/business fields |  |  |
| Save settings |  |  |
| Header identity updates |  |  |
| Upload/update photo |  |  |
| Invalid settings data is handled |  |  |
| Credential change behavior is clear |  |  |

## Persistence And Permissions

| Workflow | Status | Notes |
| --- | --- | --- |
| Refresh after creates preserves data |  |  |
| Refresh after edits preserves data |  |  |
| Logout/login preserves Supabase data |  |  |
| Demo mode persistence behaves as expected |  |  |
| Trainer cannot access wrong trainer/client data |  |  |
| Client cannot access trainer pages |  |  |
| Personal resources are not visible to other clients |  |  |

## Final QA Summary

Top failures:

- 

Product decisions needed:

- 

Regression risks:

- 

Release recommendation:

- Pass / Hold / Ship with known issues
