# Eve gaps: package patch, source fork, and release options

Planning evidence for ChatJS #312, refreshed 2026-09-07. This is a proposed
migration prerequisite lane, not application implementation, a new example,
publication, an upstream submission, or an approved production fork. Existing
ChatJS owns ancestry; Eve executes a selected linear history. Browsing a branch
requires no new execution. Sending on a divergent path creates a fresh session.
Canonical model history remains server-only.

## Recommendation

Continue existing-app migration preparation in parallel. Use current public Eve
APIs for identity/authorization, channels, host/World selection, tools, UI stores,
stream/replay and input responses. Do not block those investigations on a blanket
upstream dependency. For the actual production switch, require the history,
initialization and creation guarantees below against the chosen artifact.

Consider a small reproducible package patch for the already demonstrated memory
capture and Postgres hook defects. Prefer a maintained **source** fork over an
expanding compiled-JavaScript patch for committed-history, structured seed and
atomic admission changes if a released solution cannot meet the migration date.
A fork is an allowed option, not a finding that the missing contracts are already
implemented. Keep each delta independently removable. Upstream-first remains an
option with uncertain timing; it is not a reason to abandon a reviewable migration
plan. Francisco must choose the maintenance commitment and any weaker creation
guarantee after the bounded proofs, before implementation rollout.

## Refreshed artifact boundary

Registry JSON, npm SLSA attestations, GitHub commit/compare APIs and source were
read on 2026-09-07. Older runtime experiments were reused; they were **not**
rerun during this planning pass.

| Artifact | Refreshed identity | Implication |
| --- | --- | --- |
| Published Eve latest | `eve@0.52.2`; provenance `ed75e0267a7e46c9783a3b571f8847fa33e7e22e`; 73 export keys | Actual published baseline; Node `>=24`, AI SDK peer `^7.0.82` |
| Eve main | `c952497cd15c36680f6723bf311cb74878ac30c8`, committed 2026-09-07 16:21:25Z; 73 export keys | Source inspection only, not a release/runtime proof |
| Eve's Workflow build inputs | core/builders `5.0.0-beta.48`, World `5.0.0-beta.33`, local `5.0.0-beta.42`, Vercel `5.0.0-beta.44` | Workflow components are compiled/vendor inputs in Eve, not ordinary app dependencies that a root override necessarily replaces |
| Selected tested Postgres World | `@workflow/world-postgres@5.0.0-beta.40`; beta tag remains this version | Existing multi-process B2 proof still targets the current beta artifact |
| Workflow main | `c1293329230c13be98e6c9e1bda87521cb50d9d3`, 2026-09-05 00:16:59Z | Same source pin used by the refreshed B2 proof |
| npm `latest` tags | `workflow@4.8.5`, `world-postgres@4.3.5`, `world-local@4.4.0`; beta tags remain `5.0.0-beta.48`, `.40`, `.42` respectively | Do not install `latest` and call it a compatible upgrade of Eve's tested beta graph; 4.x is a separate untested integration here |
| Prior tree prototype | ChatJS `8d584dcd`; Eve source `1807ff9c5bd15c06b549e35fc5064dc912661275` | Private modified source; happy-path evidence, not a released contract |

Primary sources: [Eve registry artifact](https://registry.npmjs.org/eve/0.52.2),
[provenance](https://registry.npmjs.org/-/npm/v1/attestations/eve@0.52.2),
[published-source manifest](https://github.com/vercel/eve/blob/ed75e0267a7e46c9783a3b571f8847fa33e7e22e/packages/eve/package.json),
[vendor list](https://github.com/vercel/eve/blob/ed75e0267a7e46c9783a3b571f8847fa33e7e22e/packages/eve/scripts/vendor-compiled/index.mjs),
[Workflow registry](https://registry.npmjs.org/workflow),
[Postgres registry](https://registry.npmjs.org/@workflow/world-postgres),
[local World registry](https://registry.npmjs.org/@workflow/world-local).
Eve 0.52.2 integrity is
`sha512-FM3aC2A3SCKQxtyhSNR5+CaIVlKJmTGb7rCqcuHEhZShDKo1IXCTt/F7r4toqkLDG6lW7VcStTku77KWiosLfg==`.

Main adds accepted-delivery correlation in the send response and stream/client
handling; this is relevant to stale-cursor and Stop→Send regression work. The
[release-to-main diff](https://github.com/vercel/eve/compare/ed75e0267a7e46c9783a3b571f8847fa33e7e22e...c952497cd15c36680f6723bf311cb74878ac30c8)
does not introduce a supported structured seed or committed-history getter.
At this pin, `emitTurnEpilogue` still omits history and memory dispatch still
requires it. Do not promote a new correlation implementation to a recovery
certificate without the current-app regressions.

## Per-gap choice matrix

The first column describes released behavior, not whether the desired contract
is desirable. Patch and fork columns are implementation options requiring proof.

| Gap | Released APIs / public composition | Narrow package patch | Maintained source fork / custom package | Upstream-first and recommendation |
| --- | --- | --- | --- | --- |
| Reliable committed structured model history | Memory recall/capture and instrumentation expose useful histories at specific phases. None supplies a revision-addressable durable canonical snapshot. Stream completion is earlier than the session commit. | Possible to add a server-only export backed by committed snapshots, but patching emissions alone is insufficient. Needs declarations, export map, durable-read/retention semantics, and compiler/runtime agreement; quickly exceeds a narrow bug patch. | Add a small public server reader or durable private feed whose revision is committed with session state. Keep raw history in Eve; ChatJS stores authorized references/provenance plus display projection, avoiding a second competing canonical transcript. | Align with #315's corrected server-history contract. **Recommend source delta if no released API arrives**, gated by pre/postcommit crash tests. Getter versus outbox remains an implementation proof question. |
| Fresh structured seed / independent fork | `Session.send` accepts user input; channel `context` and memory recalls lower to text/user context. They cannot preserve assistant/tool roles. Same-session rewind proposals do not create an independent execution. | Prototype establishes that wiring full model history through initialization can work. A production package patch must add runtime and type/export surfaces, validate before allocation and bind seed intent durably. Do not copy its browser history event. | Add full-history server initialization at an explicit exported boundary. Preserve structured values/provider metadata for a declared tested corpus; new control IDs and inbox, no historical tool execution. Keep source unchanged and current configured system instructions separate. | Reuse [Eve #91](https://github.com/vercel/eve/issues/91), [#75](https://github.com/vercel/eve/issues/75), [#3022](https://github.com/vercel/eve/issues/3022). **Recommend one source slice alongside committed history**, not native tree machinery. Full history only; suffix seed, pending-state clone and same-session rewind are not prerequisites. |
| Recoverable canonical creation | Authenticated `operationId` scopes identity; current create returns a candidate before durable ownership settles. An app reservation can fail closed on uncertainty but cannot safely retry an unknown ordinary start. | Request polling/locking alone does not close the crash window. A smaller option combines fixed hook uniqueness with canonical owner lookup, input digest and retained operation mapping; it may allocate loser runs and still needs durable reconciliation. | Extend Eve→Workflow admission with a stable owner-scoped operation key, immutable intent digest and atomic canonical run allocation plus recoverable enqueue. Store the key on/atomically with the canonical run rather than inventing a separate transcript/version manager. **Not yet proven.** | [Workflow #2376](https://github.com/vercel/workflow/issues/2376) is the existing atomic-start discussion; [Eve #2859](https://github.com/vercel/eve/pull/2859) intentionally trades canonical response for latency. **Recommend proving atomic admission first**, then present cost versus canonical-owner/multiple-record option. A durable operation receipt can resolve asynchronously; an unconfirmed candidate must not be called canonical. |
| Memory capture (B1) | Public `capture['turn.completed']` exists but tested 0.52.1/0.52.2 ordinary completion produces zero callbacks. Main still omits messages. | Existing local source patch supplies successful ordinary/structured finalizer history, preserving projection, callback errors, and replay identity. Smallest candidate: build deterministic JS/declaration patch for exact package; assert clean install applies it. | Carry the same isolated change in a source fork if already maintaining one; no reason to invent a second memory interface. | Reuse private B1 regression and [Eve #2534](https://github.com/vercel/eve/pull/2534)'s existing contract. **Recommend narrow patch/source fix**, independently of history export. Callback remains precommit/replayable even when fixed. |
| World uniqueness (B2) | Public World selection works. Tested Postgres beta.40 accepts simultaneous identical hook tokens; Eve loser handling cannot fix multiple accepted owners. No other selected World gains a guarantee from this test. | Refreshed #1970 direction adds DB uniqueness plus correct loser handling. This is a small package code delta but also a real schema rollout, not only a JS install operation. | Carry backend change in a selected custom World package, or source fork if atomic admission already requires backend changes. Preserve World interfaces; never parse private Eve serialized input to discover the operation key. | [Workflow #1970](https://github.com/vercel/workflow/pull/1970) remains open. **Recommend a bounded refreshed fix**, with schema/worker migration acceptance before use. It does not itself ensure one workflow allocation or canonical API response. |

### Required proof, and what is already established

**Committed history.** The source explicitly identifies Workflow step results as
the atomic session persistence boundary and carries a snapshot version for
cross-deployment compatibility. [Durable session source](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/execution/durable-session-store.ts#L1).
The prototype emitted `model-history.committed` inside the harness before that
boundary. A proposed reader must return an opaque revision tied to the actual
committed snapshot; its read must not depend on an external callback succeeding.
Test death after event emission/before commit (no seedable revision), and after
commit/before notification (revision recoverable). Cover success, failure,
cancellation, manual clear, compaction and approval resume. Availability of a
snapshot and eligibility to seed it are separate assertions. Compaction requires
retaining the exact pre/post states needed by extant ChatJS branches or returning
an explicit expired-revision error. Reuse Eve's storage version/migrators; the
opaque revision is an identity, not a new package versioning scheme.

**Seed.** The private prototype includes real provider tool→branch→follow-up and
control isolation evidence. It is sufficient to justify a bounded implementation
attempt, not production adoption. Require exact model-input equality after
permitted current-system composition; structured tool output, provider options,
attachments and attribution; reject malformed or unresolved tool/approval state;
no historical effects, duplicated instructions or source mutation. Test cold
restart immediately after admission, and a branch based on a compaction
checkpoint. Do not seed by serializing JSON into a user prompt or rewriting only
the model request through middleware: that would leave Eve's durable state
inconsistent with model input.

**Creation.** Assert independently: one canonical session ID, one executing owner,
and the preferred one durable **workflow** record for each accepted operation.
An outbox/dedupe index is execution metadata, not a second canonical transcript;
its physical storage cost must still be disclosed. Reject a reused operation key
with a different authorized seed/input/configuration digest before effects.
Count actual run rows, not just provider invocations. Test separate processes,
duplicate HTTP deliveries, principal A/B with the same client key, death between
reservation/start/claim/commit/response, terminal retries and retention expiry.
Authorize before any in-process coalescing; include trusted identity in its key.
The prototype's old promise sharing failed this isolation boundary. Do not claim
exactly-once external side effects from exactly-one admission: tools still need
stable effect keys and downstream idempotency.

**B1 evidence.** Prior fixture reproduced zero captures on both published versions;
local patch produced five captures, cumulative history, transient model retry
(two attempts/one capture), zero capture on terminal failure, and successful reply
when provider capture throws. 259 source tests passed. It was transpiled into an
installed artifact for that runtime proof, not built as a complete new release.
Deferred session-limit parks and child proxies remain outside the fix.
[Exact patch/pins/logs](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contract-fixes/b1/README.md).
[Current omitted argument](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/harness/emission.ts#L214),
[current dispatch guard](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/packages/eve/src/context/memory-event-lifecycle.ts#L56).

**B2 evidence.** Twelve independent processes produced twelve owners on beta.40;
local fix plus unique index produced one owner/eleven conflicts. Event-write
failure or controlled death after hook insertion leaves an orphan hook that
same-owner retry repairs. Old code with the new index produced twelve success
events but one hook row: a schema-only rollout is demonstrably unsafe. The
provided fresh-DB SQL refuses a nonempty table and is not a production migration.
[Exact race/boundary evidence](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-contract-fixes/b2/README.md).
Existing duplicates require an explicit owner-reconciliation policy; do not adopt
#1970's historical delete-all-but-oldest cleanup blindly. Validate current
retention/disposal, duplicate same-hook races, and old/new worker/schema pairs.

## Distribution, licenses and operational ownership

The inspected Eve and Workflow package manifests identify `Apache-2.0`. Preserve
license, applicable attribution/NOTICE material and notices of modifications
when packaging modified artifacts; inventory bundled dependencies independently.
This is the packaging checklist from the [pinned Eve license](https://github.com/vercel/eve/blob/c952497cd15c36680f6723bf311cb74878ac30c8/LICENSE#L90)
and [Workflow license](https://github.com/vercel/workflow/blob/c1293329230c13be98e6c9e1bda87521cb50d9d3/LICENSE),
not a blanket assertion about every vendored dependency or trademark. An
unpublished local fork requires no public repository submission in this plan.

For **Bun package patches**, use its existing `bun patch` / `bun patch --commit`
mechanism with exact package versions, committed patch files and frozen lockfile.
[Bun primary documentation](https://bun.sh/docs/pm/cli/patch). Patch installed
runtime assets and declarations/export metadata together. The patch must fail
closed when a new tarball no longer matches; CI starts from an empty install,
verifies integrity, applies the delta, builds the consuming existing ChatJS app
for runtime validation, and runs behavioral gates. A patch against installed
`@workflow/core` does not automatically affect Eve's vendored core. Do not ship
an ad-hoc postinstall search/replace or deep-import workaround.

For a **source fork**, pin source SHA plus immutable built tarball and record
upstream base, delta commits, artifact hash and applicable licenses. Standard
package aliases/custom package addresses may preserve `eve/*` imports, but Eve's
self-resolution/compiler assumptions must be tested from the packed artifact;
renaming the package is not proven by ordinary TypeScript import success. Keep
all 73 existing export keys, `types`, `eve-source` conditions, CLI bins and runtime
assets valid. Add only the agreed server contract. Reuse ordinary Bun dependency
installation and shadcn/Eve registry selection for consumers; selected tools/UI
contributions install source/dependencies as already designed. No new updater,
package manager, registry format or compatibility-alias layer is proposed.

Eve's pinned build runs compiled vendoring, declaration generation, Rolldown with
`eve-source`, runtime/docs asset copying and version stamping; its `prepack` also
copies the license. It is a pnpm-native upstream workspace. A complete fork build
must reproduce that upstream toolchain in isolated maintainer CI (or prove a
Bun-compatible build); do not present the earlier two-file transpilation proof as
reproducible fork distribution. ChatJS installs/scripts remain Bun. See the
[pinned build scripts](https://github.com/vercel/eve/blob/ed75e0267a7e46c9783a3b571f8847fa33e7e22e/packages/eve/package.json)
and [vendor builder](https://github.com/vercel/eve/blob/ed75e0267a7e46c9783a3b571f8847fa33e7e22e/packages/eve/scripts/vendor-compiled.mjs).

Assign a named runtime maintainer/reviewer for the Eve delta and a backend
maintainer for World/schema changes. Each dependency/security update requires
rebase, rebuilt artifact/SBOM or equivalent inventory including vendored modules,
export/type smoke, and behavioral compatibility gates. Pinning prevents surprise
change but does not fix vulnerabilities; set a recurring human maintenance/release
process and emergency upgrade owner before accepting a fork. This planning task
does not create a monitor or publish anything.

## Mixed versions, recovery and the path back

Eve states that its driver is pinned to the starting deployment while child turns
can run latest. Its existing snapshot versions/migrators and function/build
identities are consequently part of rollout compatibility, including pending
approvals. Additive shape preservation alone does not prove changed semantics
replay correctly. Initially route each conversation to one runtime generation;
drain old execution or retain old workers/artifacts to completion. Test old
snapshot→new reader, old driver→new turn and rollback-reader compatibility with
actual serialized data. Reject an incompatible execution explicitly. Never point
an older unpatched Postgres worker at a new unique schema without compatible
loser handling. A DB backup is not instant behavioral rollback for an already
accepted side effect.

PR331/M07's linear proof supplies useful provider, ACL, pending-input and graceful
restart evidence, plus the Stop→Send catch-up regression. It does not establish
unassisted process-death recovery, strict create-once, prompt model abort, or
branch initialization. Reuse these tests in **existing ChatJS**, not a standalone
Eve deliverable. Its fail-closed uncertain reservation is an acceptable planning
counterexample showing why an app outbox alone is insufficient, not the desired
transparent recovery endpoint. Evidence: [M07 at 688c7e94](https://github.com/FranciscoMoretti/chat-js/blob/688c7e94/research/framework-evolution/implementation/findings/m07.md).

Operational acceptance also measures SIGKILL/lease recovery and committed-event
lost-wake recovery on the actual chosen World. [Workflow #3911](https://github.com/vercel/workflow/issues/3911)
and [Eve #1983](https://github.com/vercel/eve/pull/1983) remain open at this check;
merged fixes listed in the [prior durability follow-up](/Users/fran/.codex/worktrees/5778/chat-js/research/framework-evolution/implementation/findings/eve-upstream-durability-followup.md)
do not close all availability boundaries. Do not copy prototype `run.sh`'s
force-unlock of all locked jobs as production recovery. Any repair requires proven
dead worker ownership and an explicit operational policy.

Upstream exit is per delta: match a merged commit to the actual published
artifact/provenance, run the same consumer tests against it, reconcile stored
schema/snapshot compatibility, then remove only the superseded patch. B1 repair
must not be mistaken for committed history; B2 uniqueness must not be mistaken
for atomic admission. A release containing one fix does not retire the rest of
the fork. Contribute small isolated changes only after separate authorization;
no retry of blocked task324 is part of this lane.

## Bounded prerequisites and decision handoff

Independent planning/proof work can proceed on four seams: (1) source/packed-artifact
reproducibility and B1/B2 reuse, (2) committed snapshot/seed contract and exact
message corpus, (3) atomic admission versus canonical-owner alternative, and
(4) selected World recovery/mixed-version behavior. These feed runtime integration;
application/UI/tool parity inventories and installer handoff can progress now.

Suggested implementation PR boundaries **after plan approval**: small B1 fix;
World uniqueness plus reviewed migration; server committed reader; full-history
initializer; admission+reconciliation; existing ChatJS branch adapter and recovery
regressions. Reader and initializer can share a source base but need independent
acceptance. Never expand these slices into an unrelated standalone app.

Three material choices to return to Francisco:

1. **Maintenance:** recommended bounded source fork for new runtime contracts,
   narrow patches for isolated defects; alternative upstream-first delays the
   execution switch until release evidence; a package-only delta remains viable
   if the packing proof shows it stays small. No fork publication is implied.
2. **Creation guarantee:** recommended atomic keyed admission retaining one run;
   alternative one canonical executing owner with loser workflow records needs
   explicit acceptance of storage/cleanup/latency and retained-key behavior after
   a proof quantifies it. No unsupported estimate or silent weakening.
3. **Initial World/rollout:** recommended prove one explicitly selected production
   World end-to-end before broadening; expose external selection as existing
   installation architecture permits, but make each alternative pass the same
   contract suite. Choosing another World avoids no proof obligation.
