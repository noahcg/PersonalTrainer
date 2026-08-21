<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Release Tracking

- Treat `package.json` as the source of truth for the app version; `src/lib/version.ts` exposes that value in the UI.
- Before finishing any user-requested app update, decide whether the change should bump the version. User-visible features, behavior changes, schema changes, production fixes, and release prep should update the version and `CHANGELOG.md`.
- Keep versions below `1.0.0` until launch is explicitly intentional.
- After changing the version or changelog, run `npm run version:check`.
