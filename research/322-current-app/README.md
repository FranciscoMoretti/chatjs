# #322 current-app characterization and narrow hook extraction

Base: `8178650771aed69e75421a988e6c57f69ac131ca` (current main, merged #317). Separate branch `codex/322-history-extraction`. No M07 starter, Eve binding schema, new provider, independent view controller, storage migration or policy change.

List/rename/pin hooks moved unchanged into `chat-history-hooks.ts`; shared list cache functions moved into `chat-list-cache.ts`. Consumers import directly; no compatibility exports. Existing delete/clone/runtime hooks retain the same cache functions. No server procedure changed. Repository `.agents/skills/trpc-patterns/SKILL.md` says “Keep database access in apps/chat/lib/db/queries.ts”; this slice leaves that boundary and `trpc.chat.*` names intact.

## Validation executed

- 19 assertions against actual production query/router/protected middleware with real isolated PostgreSQL, including list owner/project filtering/order, actual rename/pin persistence, foreign mutation denial/no state change, input validation and anonymous denial. Trusted caller identity is injected; a minimal Chat table is used. Copy `proof.ts` to `apps/chat/322-review.ts` temporarily and run `bun 322-review.ts`, then remove that temporary file. Bun1.3.11; PostgreSQL17.11 via `PG_BIN` or Homebrew default. Own Unix-socket cluster starts/stops in finally. No model/auth network calls; unrelated external construction is stubbed, actual router/query are imported.
- Full app migrations passed in a different dedicated local PostgreSQL instance at56322. Root `bun dev:info --json` assigned slot332/chat6320; root `bun dev` launched Next16.3/Turbopack. Broken global Volta agent-browser shim bypassed using its installed0.34 binary; clean local frozen dependency install replaced out-of-root symlinks rejected by Turbopack.
- Real Chromium dev-login, sidebar list, rename before extraction, actual Log out full navigation to anonymous/Sign In with saved history absent, re-login with history restored. After extraction, sidebar Pin persisted (DB true, menu becomes Unpin); Rename persisted and displayed `Extracted History Verified`. No fake browser component/router.
- Next MCP compilation issues empty and session/config errors empty after extraction. React inspection command returned only `Done`, so no detailed React-state proof is claimed.
- Root `bun lint` passed (4 tasks;3 cached); root `bun test:types` passed (3 tasks;2 cached); current app149 existing unit tests passed. Thread was built once locally for type declarations; no cache-fix commit added. No new unit test mirrors the mechanical extraction.

## Actual session-expiry observation and limits

Normal logout was verified. A separate probe backdated the dedicated DB session expiry and reloaded: Dev User and history remained visible. Current `lib/auth.ts` explicitly enables Better Auth cookieCache for300seconds. This observation does not establish an auth bug or an immediate-revocation guarantee; it confirms DB-expiry mutation alone is not sufficient to test full signed-cookie expiry. We did not wait out cookie expiry, remove selected cookies, implement revocation, or alter authentication. Delayed-query account changes, cross-account replacement and Electron transitions remain unproven.

No model completion/reconnect, selective source/dependency omission, or framework portability claim. Projects and header still legitimately consume history metadata. Removing a sidebar assembly is not removal of history API/database dependencies.

## Next boundary

This closes the narrow client extraction. Actual selectable generation/installation remains dependent on #313's accepted current-app contract; do not restore rejected #318 starter or make broader persistence/runtime changes from this proof. No product decision is required for this slice. Delete/retention/reconciliation choices remain unchanged.

## Additional identity gates closed

Four new mounted ReactDOM tests exercise the actual SessionProvider: unknown pending versus settled anonymous; streamed seed while client is pending/errored; settled null defeating an existing and later stale server seed; and current client account overriding an older seed. All4 pass, full app suite now153 passes. HappyDOM is a test-only dev dependency because existing Vitest runs in Node and no DOM component-test environment was installed. No auth production code changed.

A real Chromium/Playwright probe now holds one actual `getAllChats` response produced by the app after browser rename, performs normal Log out, then releases that old response. The new document shows neither prior Dev User nor renamed history. Result: pass,1held response. Keyboard activation of the user menu was used because the Next dev indicator intercepted its pointer position in the headless viewport. It still invokes the real menu/logout; no direct auth call, synthetic router or forced application mutation. `delayed-logout.ts` is reproducible by temporarily copying into `apps/chat`, with the local app/database already started and at least one dev-user chat seeded. The fixture uses the configured6320 test origin, not a production site.

Remaining unexecuted identity cases are actual cookie-cache expiry after300seconds, cross-account replacement without normal navigation, and native Electron sign-out/sync. The four mounted tests establish provider precedence, not all browser QueryClient transitions. No Electron app/session was launched for this web-only scope. The pending-response normal-logout gap is closed; it is no longer merely source evidence.
