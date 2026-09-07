# Prepared upstream reports and follow-ups

Review packet, refreshed 2026-09-07. No reports or code submitted upstream.
“Maybe reporting” is treated as preparation, not authorization to communicate
upstream. This packet does not retry blocked task324. The existing local runtime
reproductions are research evidence, not a proposed standalone Eve product.

## Refreshed triage

GitHub issue/PR APIs and npm registry were checked again after the first migration
plan. Eve main remains `c952497cd15c36680f6723bf311cb74878ac30c8`; released latest
remains `0.52.2`, provenance `ed75e0267a7e46c9783a3b571f8847fa33e7e22e`.
Workflow main remains `c1293329230c13be98e6c9e1bda87521cb50d9d3`.
The compatibility lane remains Workflow/core beta.48, World beta.33, local
beta.42, selected Postgres beta.40. npm `latest` 4.x tags are not replacements
validated by this work. [Artifact details](eve-gap-options.md#refreshed-artifact-boundary).
No new runtime execution is claimed by this refresh.

| Subject | Current upstream state | Proposed action |
| --- | --- | --- |
| Missing successful memory capture | [#2534](https://github.com/vercel/eve/pull/2534) merged the contract; [#2951](https://github.com/vercel/eve/pull/2951) remains open and documentation-only | One new defect report candidate below. No matching defect found in bounded searches; recheck immediately before any authorized submission. |
| Structured seed and exact server history | [#91](https://github.com/vercel/eve/issues/91), [#75](https://github.com/vercel/eve/issues/75), [#3022](https://github.com/vercel/eve/issues/3022) remain open | Append requirements/evidence to #91, cross-reference the others. Avoid duplicate broad fork/import issues. |
| Same-session history restoration | [#3066](https://github.com/vercel/eve/pull/3066) remains open/draft; head `fbb95c9a537f0521a9a479cd5a9652e3e68086d2` | Track; it is not accepted as independent seeded execution. |
| Atomic admission/canonical creation | [Workflow #2376](https://github.com/vercel/workflow/issues/2376) remains open; [Eve #2859](https://github.com/vercel/eve/pull/2859) merged intentional candidate-ID behavior | Append a concrete stronger-contract use case to #2376. Do not report #2859's documented behavior as an accidental bug. |
| Postgres token uniqueness | [Workflow #1970](https://github.com/vercel/workflow/pull/1970) remains open; head `7999ede3335f45fbba227f0634d8e183bb937112` | Append independent beta.40 race and mixed-version evidence; no duplicate issue or PR. |
| Shutdown/recovery | [Eve #1983](https://github.com/vercel/eve/pull/1983), [Workflow #3911](https://github.com/vercel/workflow/issues/3911), [#3162](https://github.com/vercel/workflow/pull/3162) remain open | No new report from this pass: no new unassisted crash reproduction. Preserve existing operational acceptance gates. |
| Durable code mode | [Eve #3002](https://github.com/vercel/eve/pull/3002) remains open, head `d8d33792ec8161d270e365044302709661226ba8` | Its refreshed body replaces the experimental Workflow orchestration helper, not the entire persistence backend. Authored `use workflow` tools remain supported. Do not infer a backend replacement from the title. |

Bounded deduplication searches used `gh search issues/prs --repo vercel/eve` with
`memory capture`, `committed history`, and `"turn.completed" "memory"`; wider
`capture` PR results were inspected. The exact memory-defect search returned no
matching issue. Search absence is not proof no report exists. GitHub bodies and
source links below take precedence over search snippets.

## Draft A — new Eve defect report candidate

**Title:** Successful turns omit memory `capture["turn.completed"]`

**Target:** `vercel/eve`, new issue only after a final duplicate check.

**Problem and expected behavior**

A memory provider authored through public `eve/memory` receives recall callbacks,
but two ordinary successful turns never invoke its configured completed-turn
capture. Expected: each successful turn calls that provider with its completed
projected history, preserving the existing operation ID and error semantics.
This concerns the public callback introduced by #2534, independently of any new
history import/export feature.

**Versions and reproduction**

Reproduced on published `eve@0.52.1` and `0.52.2`, AI SDK `7.0.84`, Bun `1.3.11`,
Node `24.20.0`, macOS arm64. There is no established last-known-good version.
The pinned 0.52.2 artifact is [registry metadata](https://registry.npmjs.org/eve/0.52.2)
with [build provenance](https://registry.npmjs.org/-/npm/v1/attestations/eve@0.52.2).

A public-API reproduction already exists locally:
[fixture README](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contribution-drafts/eve/minimal-reproduction/README.md),
[runner](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contribution-drafts/eve/minimal-reproduction/reproduce.mjs),
[memory provider](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contribution-drafts/eve/minimal-reproduction/agent/memory/capture.ts).
Before submission, obtain separate authorization for any required public
reproduction location and replace these local links with reviewer-accessible
artifacts. The prior prepared issue template requests a public reproduction URL;
this draft does not pretend that URL exists.

1. Install the locked fixture with Bun and use Node 24.
2. Run `bun run reproduce`. The fixture builds Eve, starts a local server on an
   OS-assigned port, sends two turns through public `eve/client`, and stops it.
3. Observe two deterministic successful replies, two recalls and zero captures.
   No provider credential or external model call is needed.

Recorded result:

```json
{"successfulTurns":2,"recalls":2,"captures":0,"expectedCaptures":2}
```

The second recall includes the first assistant response, so prior history exists;
the capture callback is simply absent. The final assertion fails `0 !== 2`.
The earlier [before/after report](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contract-fixes/b1/README.md)
contains version pins, commands, logs and the narrow local repair. This planning
refresh reused that execution evidence rather than rerunning it.

**Source trace and suggested repair scope**

At current inspected main,
[`emitTurnEpilogue`](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/harness/emission.ts#L214)
emits `turn.completed` without history, while
[memory dispatch](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/context/memory-event-lifecycle.ts#L56)
requires history before invoking capture. Supply the ordinary/structured
successful finalizers' settled messages using the existing server callback;
retain projection, retry identity and capture-error behavior. Test through a
built runtime, not only a dispatcher unit test supplied with artificial history.

The local repair passed 259 source tests plus five runtime captures and checks
for cumulative history, transient failure→success, terminal model failure, and
capture-provider exceptions. It was a narrow source transplant into a published
runtime, not a complete fork release or upstream CI run. Deferred parks and child
proxies require separate lifecycle analysis and were excluded.

**Caveats**

Capture is precommit and potentially replayed. A successful callback does not
prove the Workflow session snapshot committed. This report requests neither
browser-visible model history nor fork/seed APIs, and does not promise exactly-once
provider side effects. #2951's replay documentation is related but does not fix
the missing runtime argument. The known precommit issue in our private prototype
is not represented as a published Eve defect.

## Draft B — follow-up to existing Eve #91

**Target:** comment on [#91](https://github.com/vercel/eve/issues/91), with #75 and
#3022 cross-references. Feature-contract proposal; no duplicate issue.

Our app owns a message ancestry tree and selects a linear history. Branch browsing
uses its existing display projection; only a divergent send needs a fresh Eve
execution. The minimal import contract we need is server-resolved, role-preserving
full history for that fresh session. It must not reexecute historical tools or
copy live approval/inbox state. Current public text context and user-input APIs
are useful but do not satisfy that contract on inspected `eve@0.52.2`.

We have bounded private prototype evidence for seed→real model→tool output→branch
follow-up and control isolation. That prototype changes Eve internals and is not
a shipped API. The source/evidence is pinned at ChatJS `8d584dcd`, using Eve
`1807ff9c5bd15c06b549e35fc5064dc912661275`; a separately publishable reproduction
would be needed before presenting it as maintainer-verifiable evidence.
[Local report](/Users/fran/.codex/worktrees/c631/chat-js/research/framework-evolution/implementation/findings/eve-tree-session-prototype.md).

There is a separate export prerequisite: the app needs an exact **committed**
server history/revision to select, including applicable compaction state. Memory
providers observe projected histories and instrumentation observes model-call
inputs, but neither establishes the authoritative postcommit snapshot. The
[durable store](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/execution/durable-session-store.ts#L1)
identifies Workflow step results as the persistence boundary. Our original private
history event fired before that boundary and must not be presented as a committed
export proof.

Could a server-only committed reader or recoverable private feed be the companion
to the initializer? The app can own ACL, ancestry, provenance and authorized
revision references; we do not require a native tree model or browser model
history. Acceptance would cover crash before commit (never seed that attempt),
crash after commit before notification (recover the revision), exact supported
structured tool/provider content, source immutability, and fresh execution
controls. Pending-state cloning and suffix seed are outside the minimum request.

This is a stronger contract proposal, not a new reproduced runtime bug. There is
no completed crash/commit proof yet. #3066's same-session restoration direction
may be related, but a new independent execution remains the requirement here.
If a separate committed-history issue is desired, ask maintainers to split it
rather than open overlapping feature reports preemptively.

## Draft C — independent regression evidence for Workflow #1970

**Target:** comment on [#1970](https://github.com/vercel/workflow/pull/1970).

We independently reproduced the concurrent-token defect through public
`createWorld` / `events.create` on published
`@workflow/world-postgres@5.0.0-beta.40`, Node `24.20.0`, Bun `1.3.11`, PostgreSQL 17.
Twelve independent processes/pools claimed the same token for different run IDs:
the baseline produced twelve `hook_created` events and twelve owner rows.
Expected: one owner and eleven conflicts identifying that owner.

A private refresh of this PR's index-plus-loser-handling approach against Workflow
`c1293329230c13be98e6c9e1bda87521cb50d9d3` produced one owner and eleven conflicts.
It preserves current retention/disposal and same-owner orphan repair. The old PR
patch does not apply unchanged because storage/schema/migration paths drifted.
[Exact local fixture, pins, patch and logs](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contract-fixes/b2/README.md).
Replace local artifact links with an authorized reviewer-accessible location
before posting.

We also confirmed the rolling-schema hazard: **old beta.40 code with the new
unique index produced twelve success events but only one hook row**. Compatible
loser handling must accompany the schema rollout; adding only the index is not
safe. Existing duplicate live owners need an explicit reconciliation policy. Our
fresh-DB index refuses nonempty tables and is intentionally not a production
migration or a deletion policy.

Fault injection showed hook insertion can commit before event insertion fails;
a controlled child-process kill at this boundary leaves an orphan owner that
same-owner retry repairs. This does not prove unassisted worker recovery or an
atomic hook+event transaction. Neither the index nor this test proves one workflow
allocation, canonical create response, or post-disposal dedupe; those belong to
#2376. The report reuses recorded executions; no fresh run occurred during this
planning refresh.

## Draft D — stronger admission use case for Workflow #2376

**Target:** comment on [#2376](https://github.com/vercel/workflow/issues/2376).

For an app-owned conversation branch, a repeated owner-scoped creation operation
must recover the same canonical execution after an uncertain HTTP result. We
prefer one durable workflow record, independently from one executing owner. A
stable input digest includes the authorized seed revision and creation settings;
the same key with a different digest must fail before effects.

An app reservation followed by ordinary Eve start fails closed but has a crash
window after start and before recording the returned ID. Retrying start from an
app outbox can create another candidate. Eve #2859 intentionally returns candidate
IDs before ownership arbitration; we do not classify that as an implementation
bug. #1970 fixes token uniqueness, not keyed run admission.

Would a stable operation key and digest be admitted atomically with canonical run
allocation, followed by recoverable enqueue? An asynchronous durable receipt is
acceptable if canonical resolution is reliable. The acceptance target is the same
ID after concurrency and crash, one executing owner, and preferably one run row.
Count stored runs as well as provider invocations. Retention must be explicit after
terminal state/reset; inbox disposal alone is not durable operation memory.

A weaker option—one canonical owner with duplicate nonexecuting candidate runs—may
be worth a concrete storage/latency/cleanup trade-off, but is not silently equivalent
to atomic admission. We have not implemented or proven either stronger contract.
The public Postgres race above and our app's fail-closed ambiguous-creation proof
are evidence of why this requirement is separate, not proof of a finished design.
See #1970 and [Eve #2859](https://github.com/vercel/eve/pull/2859).

## Intentionally not drafted as new upstream bugs

- The private gateway's authorize-after-coalescing flaw belongs to ChatJS-owned
  code. Reproduce/fix there; do not attribute it to Eve auth exports.
- The prototype's precommit `model-history.committed` event is our private patch
  flaw. It motivates the contract discussion, not an upstream bug report.
- Cooperative cancellation, force-unlocked worker fixtures, stale replay results
  and approval turn IDs need a fresh isolated reproduction on the selected artifact
  before a new issue. Current main's delivery-correlation changes must be included
  in that comparison. Existing-app regressions remain required regardless.
- Existing shutdown/lost-wake issues already cover the observed operational
  questions. No new crash proof was executed in this refresh.

Review the concrete texts and artifact accessibility before any external action.
Actual upstream posting, reproduction publication, contribution PRs and package
publication remain separate actions; none occurred here.
