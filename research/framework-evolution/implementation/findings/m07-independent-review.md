# #312 independent review — standalone public-Eve example

Date: 2026-09-07. Original source: `688c7e944cb66397ec2a0e2a80f1557dc7325b07`.
Review branch: `codex/312-public-eve-review`. Main base:
`8178650771aed69e75421a988e6c57f69ac131ca` (includes narrowed #317).

## Decision and scope

The example is coherent as **standalone, bounded public-Eve research source**.
It is not the CLI starter, an app migration, or a supported deployment recipe.
The PR changes only `examples/minimal-next` and its review/evidence documents.
Root package scripts/config/lockfile, `apps/chat`, CLI and #317/#318 are unchanged.
The original M07 report remains historical author evidence with a prominent
scope correction; its earlier CLI handoff is not an approved dependency.

Integration choice remains explicit: accept this source as an independently
runnable example, or keep it as a review branch. Neither choice selects the
Eve adapter architecture for the current app. Historical branching remains #298;
upstream bugs/capabilities remain #315.

## Review findings resolved

1. **First-message retry poisoning.** The browser saved an oversized first
   message before the server rejected it, then reused it forever despite an
   edited draft. Shared client/server validation now happens before persistence.
   A valid pending operation keeps its original ID and payload; a legacy
   schema-rejected payload can be replaced. Unreadable JSON is preserved with
   an actionable reconciliation error, rather than discarding an unknown
   operation. The UI displays the retained original message when retrying.
2. **Failed follow-up lost its draft.** The composer cleared before completion.
   Simply awaiting the Promise was insufficient: the actual published Eve React
   store reported a 403 transport failure through `onError` while its send
   Promise resolved. The component now observes the public callback; command
   and replay failures retain the draft and cancellation counter. A successful
   completion only clears unchanged text, preserving edits made while waiting.
   Callback errors are treated conservatively as uncertainty; this does not
   establish causal correlation or retry idempotency for accepted execution.

## Fresh validation

- Frozen isolated install: 179 packages on the existing exact lockfile.
- **10 tests / 37 assertions passed**, including two real PostgreSQL reservation
  tests; five first-create/cancellation/command-failure tests; three signed
  identity/origin tests. Tests deny wrong issuer, audience, signature, expiry,
  spoofed owner and missing/wrong mutation origin. Exact duplicates reuse the
  bound session; other owners cannot join; unknown creation remains fail-closed.
- Example lint and Node24-backed Next typegen/TypeScript passed. No production
  Next build was used to typecheck.
- Actual Next16.3/Turbopack browser: a 16,001-character input left no stored
  pending operation; corrected input reached the API using corrected text.
  Its downstream was deliberately unavailable, so the resulting reservation
  remained unresolved rather than creating a second operation.
- Actual browser/public Eve hook/Next gateway with a disposable bound row and
  owned HTTP rejection fixture: before the fix a rejected follow-up left an
  empty draft; after the fix it retained `Retain this failed followup`, status
  `error`, and the downstream rejection message. This is a failure-path browser
  test, not a real Eve worker/provider execution rerun.
- Next MCP listed the expected three routes and reported no compilation
  issues. Deliberate downstream failures produced expected runtime errors;
  no claim of a globally error-free fault-injection session is made. React
  introspection returned no useful tree; DOM/state assertions are the evidence.
- Root lint passed. Root typecheck initially hit the separately known Thread
  cache-output defect (cached success without `dist` declarations). Forcing the
  existing Thread typecheck/build rematerialized its declarations; root types
  were then rerun. No Thread source fix is included in this example PR.

Commands:

```sh
cd examples/minimal-next
bun install --frozen-lockfile
# Point APP_DATABASE_URL at a fresh disposable database; run db:init first.
bun --env-file=.env.local test tests
bun run lint
PATH=/opt/homebrew/opt/node@24/bin:$PATH bun run test:types
cd ../..
bun lint
bunx turbo run test:types --filter=@chat-js/thread --force
bun test:types
```

This run owned Next7314, a rejection-only HTTP fixture7315, and Postgres56431.
Listeners and database were stopped; temporary credential/cookie files removed;
the named browser session was closed. No provider key or production data was
used. No new live-model, approval/replay or worker-restart claim is made.

## Ownership, replay and remaining gates

The example checks verified caller identity, mutation origin and durable owner
binding at the public tRPC/gateway boundary. The private Eve channel separately
checks the server credential and binding. Unknown routes and reset/compact/
callbacks remain denied through Next. The owner-scoped reservation commits
before creation; external failures never automatically release it. Its unique
session constraint prevents one session being bound twice.

Each mounted session starts from event cursor zero, keeping projection and
cursor paired. Pending requests disappear only on `input.resolved`. Cancellation
uses public Eve handling, including its missing-turn-ID behavior; a counter
retains newer cancellation requests across older command completion. The new
failure tests cover promise rejection and callback-only errors, not arbitrary
simultaneous stream/cancel interleavings. Empty approval turn IDs are not
fabricated locally. Reference messages are derived projections, not a second
mutable transcript.

#320 contributes **historical research patterns**, not validation of this exact
example: it used newer generated #318 source with additional fixes. Its41 HTTP
checks and four crash probes must not be added to this run's totals. In
particular, its stale-approval hypothesis was disproved; do not “fix” valid
pending requests away after cooperative cancellation.

Remaining product/operational gates:

- Ambiguous creates require operator reconciliation. No atomic distributed
  create-once guarantee, lease cleanup, automatic orphan recovery or supported
  reconciliation API is supplied.
- Cancellation may wait for a provider step. Retained drafts after ambiguous
  send/replay errors must be reconciled with replay before manual resend.
- Host identity changes must clear/scope pending browser creation state; no
  account-switch interface is implemented in this example.
- Current app integration needs its own accepted boundary and parity plan.
  No retained multi-view session owner or runtime adapter is introduced here.
- Public ingress/callback deployment, multiple replicas, forced Eve-worker
  recovery, provider-side effects, body-size streaming limits and upgrade
  compatibility remain unvalidated.
- Root CI does not automatically exercise this separately locked example.
  The explicit example checks above are required for modifications.

No private Eve patch, public upstream submission, deployment or merge occurred.
