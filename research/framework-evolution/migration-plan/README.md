# Full existing-ChatJS migration to Eve

Tentative implementation plan for [#312](https://github.com/FranciscoMoretti/chat-js/issues/312), refreshed 2026-09-07 against main `5b6664e7` (includes gateway registry [#332](https://github.com/FranciscoMoretti/chat-js/pull/332)). This delivery prepares the migration; it does not switch the app engine, change production data, deploy, publish a fork or submit upstream reports.

## Current planning focus

The [rough stages and decisions](stages.md) from the discussion are saved. Current focus is [Stage 1: ownership and contracts](stage-1-contracts.md), with detailed work packages, interface semantics, acceptance scenarios and an exit gate. This is a plan for producing the contract packet; Stage 1 has not been declared complete.

## Recommended direction

Migrate the existing ChatJS application and its reusable framework. Keep its UI composition, tree semantics, selected gateway contracts and feature services. Replace request-owned generation and Redis stream resumption with Eve execution. Examples must be applications built with ChatJS; the closed standalone #331 remains research evidence.

Use released Eve where its contracts suffice. For isolated memory-capture and Postgres uniqueness defects, prepare reproducible narrow fixes. For committed structured history, fresh history initialization and recoverable keyed admission, prove a bounded maintained source delta if releases do not provide the contract. Waiting for upstream is an option, not a prerequisite for all preparation. A working private prototype is evidence of feasibility, not a production-supported implementation.

Prefer one durable Eve canonical model-history record, referenced by ChatJS ancestry and execution bindings, and one durable workflow allocation per accepted create operation. These are separate invariants: one executing owner does not imply one allocated workflow record. Do not invent a second writable transcript or a new version-management system.

Keep the current app usable during implementation. The final app switch requires branching and feature parity; a linear-only path cannot silently replace the full app. The already accepted [#292 fresh-conversation reset](https://github.com/FranciscoMoretti/chat-js/issues/292#issuecomment-5552745730) stays settled. Legacy transcript conversion and continuation are optional future work, not migration gates.

## Evidence and confidence

- [Current application audit and full feature ledger](current-app-audit.md): exact code seams, AI SDK retained/replaced, merged composer/layout/gateway work.
- [Eve gap options](eve-gap-options.md): released versus package-patch versus source-fork versus upstream-first for each gap; artifact/source pins, packing, license, maintenance and storage implications.
- [Persistence and cutover](persistence-cutover.md): application authority, auth, canonical bindings, domain effects, reset/rollback and distributed acceptance.
- [Upstream report preparation](upstream-issue-drafts.md): candidate reports versus existing threads; no upstream posting in this delivery.

Package inspection currently identifies Eve 0.52.2 with Node >=24 and AI SDK 7 peer compatibility. Eve vendors Workflow internals; overriding an ordinary root package does not necessarily change the engine it runs. Use the exact artifact tuple in the gap report and refresh it before implementation. Earlier runtime reports target their own pins and do not establish newer-artifact acceptance.

Browser testing before the latest-main update (at `2db364c2`) passed login, stored history/search/version navigation, model/tool selection, settings and mobile navigation. Live creation failed during title generation with AI Gateway 401. This is a local credential blocker, not evidence of an Eve defect. No successful post-update live-provider test is claimed. Compilation success and a fallback model list do not establish working inference.

## Architecture and ownership

| Responsibility | Current app | Target |
| --- | --- | --- |
| User interaction | JSX composer/layout and typed ChatMessage views | Preserve composition; bind to one runtime command owner |
| Tree | ChatJS ancestry, sibling edits/regenerations, parallel response selection | ChatJS keeps ancestry and per-view selection; no native Eve tree requirement |
| Execution | AbstractThread run backed by SDK AbstractChat; principal API route streamText | Eve sessions/turns, with independent binding for divergent/parallel executions |
| Model inputs | Server-selected UI path, last-five truncation, conversion/filtering/file loading | Server-resolved exact committed canonical prefix plus trusted current request policy |
| Transcript facts | App Message/Part rows, stream callbacks and metadata | Durable execution facts in Eve; authorized app display projection plus separate domain records |
| Resumption/cancel | Redis resumable stream and application cancellation records | Eve replay/pending-input/cancel contract; measured cooperative-abort limits |
| Models | Selected installed Gateway; shared @chat-js/gateways contracts | Same selected Gateway feeds compatible SDK model to Eve; World is independent |
| Features | Documents/files/MCP/auth/projects/credits/tools | Keep feature authority; explicit replay-safe effect boundaries |

Proposed command flow (names illustrate responsibilities, not claimed released Eve APIs):

```text
composer.send({ conversationId, parentNodeId, operationId, input })
  -> trusted caller + conversation/path authorization
  -> server canonical-prefix resolver (never browser-supplied history)
  -> reuse matching linear session OR keyed fresh-session admission
  -> durable session/turn/node binding
  -> Eve execution -> durable canonical facts + rich display facts
  -> authorized projection/replay -> existing ChatJS views
```

Do not expose raw canonical history, provider metadata, credentials or privileged system policy in browser events. A display projection is not automatically reconstructable from lossy model messages: preserve rich typed tool/frontend facts durably at their source. Rebuilding a projection never executes a tool.

### Concrete path behavior

For `U1 → A1 → U2 → A2`:

- Continue after A2: reuse its session only if the authorized canonical prefix matches. A timeout/reload resolves the existing operation; it does not allocate a replacement.
- Edit U2: create U2′ as a sibling and a fresh execution seeded with the exact committed prefix through A1, then deliver U2′. Original A2 and its session remain intact.
- Regenerate A1: create a sibling assistant execution from the input through U1; never reset the old session.
- Parallel responses to U2: each response has independent execution/turn/cancel identity, including two requests for the same model.
- Navigate between branches or panels: change only view selection. Hidden runs continue. Stop targets one execution; stop-all is a separate explicit command.
- Approve a hidden run: route by original session/turn/input identity, not the currently visible branch. Reload restores pending input before another command.
- Inherit a completed document tool: carry exact immutable revision references and structured tool results; do not rerun the tool or silently use the latest document version. External sandbox state is not cloned by copying history.
- Compact a long run: retain the exact committed revision/provenance needed by existing branch points, or explicitly report unavailable history. A summary belonging to a descendant cannot seed an unrelated sibling.

The current app's last-five truncation is not an existing summary engine. Recommend a deliberate move to full selected history with Eve-managed context policy after exact-prefix proofs. Record this behavior change explicitly, test tools/long inputs/cost bounds, and avoid retaining accidental truncation under the name of compatibility.

## AI SDK 7 remains part of ChatJS

Retain typed UI/model messages and tools, selected provider/model creation, provider options/middleware, compatible MCP APIs, image/video APIs and appropriate title/followup/document calls. Preserve installed-tool inference into paired frontend props. Do not introduce an untyped catch-all registry.

Replace principal chat streamText orchestration, SDK AbstractChat run ownership, manual UI SSE assembly and Redis reconnect ownership. Some protocol helpers may remain where Eve uses them. Review nested deep-research loops individually: durable outer execution does not automatically make nested side effects replay-safe. The audit contains the API-by-API disposition.

Retain the tree algorithms in packages/thread where useful; separate execution ownership from tree/view state. Preserve #317 composer slots, #327 providers/children composition and #329 cached declaration outputs. Remove obsolete exports and old orchestration after equivalent behavior passes, rather than leaving permanent compatibility aliases or two active send engines.

## Resolve upstream gaps before the execution switch

| Gap | Proposed first move | Acceptance before integration |
| --- | --- | --- |
| B1 memory capture missing on ordinary completion | Small pinned patch or isolated fork commit; report reproducible defect | Published-artifact negative then fixed positive; ordinary/structured completion, errors/replay; no claim of transactional history export |
| B2 Postgres hook token uniqueness | Reuse/update existing upstream fix direction; bounded selected-World patch with schema rollout | Independent processes contend for token, one accepted owner; loser recovery, mixed worker/schema handling; separately count allocated workflows |
| Committed structured history | Public server-only reader or durable committed feed in bounded source delta | Kill before commit: no seedable revision; kill after commit before notification: revision recoverable; tool/provider/file metadata fidelity |
| Fresh structured initialization | Server-only full-history initializer, using resolved committed prefix | New control identity, unchanged source, exact role/content/tool corpus; malformed/pending seeds rejected; no inherited effects rerun |
| Canonical keyed admission | Prove owner-scoped immutable operation digest and atomic allocation/recoverable enqueue | Two replicas plus crashes converge to same session, one workflow row, one execution; conflicting payload rejected; unknown delivery recoverable |
| Cancellation/recovery/upgrade | Test selected World and built host; reuse known Stop→Send/callback failure cases | SIGKILL/lease and lost-wake recovery without broad force-unlock; cursor/pending pairing; explicit provider-abort latency and compatible snapshot behavior |

If strict keyed admission requires disproportionate engine changes, return a measured alternative: one canonical executing owner with loser workflow records. Compare row count, cleanup, latency and failure modes. Do not accept that weaker guarantee silently. Application reservations alone cannot infer that a timed-out non-idempotent start never committed.

A package-only patch is suitable only while runtime/type/export changes remain small and reproducible. Prefer a pinned source build for new server contracts, preserving export conditions/compiler assets and testing the packed artifact from a clean consumer. Carry each delta separately; keep applicable notices and a dependency inventory, including vendored code. Assign maintenance/security ownership and an upstream-base/rebuild policy. Use ordinary package pins/lockfiles and upstream snapshot migration mechanisms. See the gap report for the actual build constraints and alternatives.

Upstream exit happens per delta: verify the fix in a published artifact, rerun the same consumer regressions and stored-run compatibility checks, then remove the superseded change. A merged PR or B1/B2 fix alone is not proof that history/seed/admission is supported.

## Dependency graph: investigations versus implementation

Research/proof lanes can begin together; these are not approvals to ship production changes:

- R1: reproduce/package B1 and B2; inventory existing upstream reports and prepare minimal sanitized reproductions.
- R2: build/pack unmodified Eve from a pinned source and prove consumer exports/compiler/runtime; then bound proposed deltas.
- R3: committed-history + seed contract/corpus/crash design.
- R4: strict admission feasibility versus measured canonical-owner alternative.
- R5: chosen host/World abrupt recovery and stored-run upgrade behavior.
- R6: current app/tool/frontend/installer inventory and feature acceptance fixtures.

Implementation dependency DAG:

```text
R1,R2,R3,R4,R5 -> P1 engine contract proofs
R6            -> P2 typed app/tree/view and tool contracts
P1 + P2       -> P3 authorized binding/replay integration
P3            -> P4 branch edit/regenerate/parallel/recovery
P2            -> P5 typed tools + lazy paired UI + durable effects
P2 + #332     -> P6 host/World/capability installation + builder
P3 + P5       -> P7 metadata/services/documents/sharing/credits
P4+P5+P6+P7   -> P8 full existing-app parity
P8 + rollback/upgrade rehearsal -> P9 final app switch and retirement
```

P2/P5/P6 inventories and contract work need not wait for missing Eve APIs. P3 integration and the final switch do depend on proven engine contracts. No dependency on repairing #328, cleanup #330, the rejected standalone example, or legacy conversation import.

## Eight-agent implementation waves

This is a proposed work allocation after the plan is accepted, not eight agents editing the same files now. One integrator owns shared contract changes; consumers work from an agreed commit. Separate PRs/worktrees and explicit file ownership prevent competing root lockfile/schema edits.

| Lane | Wave 1: contracts/proofs | Wave 2: implementation behind explicit development selection | Wave 3: integration/acceptance |
| --- | --- | --- | --- |
| 1 Engine/history | Packed source, committed read/seed corpus | Reader + initializer delta and consumer adapter | Exact branch/compaction/crash proofs |
| 2 World/admission | Uniqueness, atomic admission and recovery | World/schema/keyed-create implementation | Multi-process kill/retry and upgrade tests |
| 3 App/tree/transport | Tree/view/command ownership contract | Existing app synchronization + execution bindings | Edit/regenerate/parallel/Stop→Send/reload |
| 4 Tools/frontend | Inferred tool/context/effect contract | Installed/platform tools and lazy paired renderers | Typed negative cases, chunk loading, replay effects |
| 5 Data/auth/services | Schema/ACL/effect and cutover inventory | Auth/raw routes, metadata, documents/files/credits | Ownership attacks, shares/clones, backup/restore |
| 6 CLI/registry | Consume #332; selection graph boundaries | Host/World/tool/layout capability integration | Independent installs, external selections, omitted deps |
| 7 Builder/layout | Shared selection + actual UI preview plan | Existing scoped views/composer/builder integration | Desktop/mobile/multi-panel and preview fidelity |
| 8 Integration/docs | Acceptance harness and baseline fixtures | CI wiring, portability recipe, review and docs | Whole-app real-provider test, rollback rehearsal and retirement audit |

Split lane 5 into bounded feature PRs instead of one schema rewrite. Lane 8 coordinates integration; it does not rubber-stamp author results. Wave 3 admits only supported combinations. Next remains the reference app; Vite React + Eve Node/Postgres is a ChatJS portability proof, not a new standalone Eve product or required polished starter.

## Bounded PR sequence and acceptance

1. **Contracts/fixtures:** domain ownership, exact tool/history corpus, trusted request IDs and parity matrix. No runtime switch.
2. **B1 isolated fix:** published negative/fixed positive, packed install proof. Independent upstream-ready delta.
3. **B2 selected World fix:** schema and loser handling together; real multi-process tests and rollout notes.
4. **Committed history reader:** server export/types, durable revision/retention, commit-boundary crash tests.
5. **Full-history initializer:** validation/control isolation, restart/compaction/tool corpus; no rewind/suffix/pending clone scope.
6. **Admission/reconciliation:** immutable owner-scoped key/digest, atomic create and recoverable response; count actual run records.
7. **App binding/transport:** authentication on every exposed route, UI replay/pending/draft retention, one command owner. Development-only selection while incomplete.
8. **Tree and parallel integration:** new/edit/regenerate/selection, two models and repeated same model, hidden-run approvals/cancel.
9. **Tools/effects and lazy frontend:** split installed tools, documents/media, research/MCP into independently reviewable PRs; persist rich UI facts and idempotent effect references.
10. **Services and installation:** split app CRUD/auth/credits and CLI/registry/builder consumers by owned surface; preserve #332 gateway capability/default/env contract.
11. **Integrated parity and operational proof:** actual existing app, clean installed output, selected deployment/World, Vite portability, compatible worker upgrade, restore rehearsal.
12. **Default switch/retirement:** only after acceptance; remove old orchestration/tests replaced by equivalent coverage and unused deps, publish breaking-change documentation. Deployment/merge remain separate actions.

Each code PR runs Bun lint, Bun type checks and relevant meaningful tests. Distributed invariants require real DB/process tests, not mocks of uniqueness. Browser tests cover visible behavior and navigation; deterministic models isolate execution behavior; a real configured provider validates integration separately. A production build is used only to validate deployment/runtime packaging, not merely to type-check.

## Release acceptance and cutover

The detailed audit ledger is the full scope, including text/reasoning/errors, model selection/parallel, branching/compaction, cancellation/reconnect/HITL, installed/platform tools, documents, attachments, search/research/code/media/MCP, auth/anonymous/Electron, history/shares/clones/projects/votes/settings, title/followups/credits and existing composition. Disabled optional features such as video do not become mandatory installations.

Hard gates: exact canonical path execution; one accepted create converges after crashes; raw route and coalescing authorization; replay without duplicate charges/effects; branch-safe document/file references; pending-input/cursor recovery; actual selected host/World operation; clean typed/lazy selected installation; full default app browser parity. Cancellation's cooperative limit must be explicit if provider interruption cannot be made prompt.

At an independently authorized cutover, stop new old-engine work, drain/cancel explicitly, preserve old release + database + object bytes and necessary configuration/key references, then start the new app/World stores. No in-flight run or pending approval transfer. Rehearse restoration before switching traffic. Preserve separately valued account/balance/connector metadata only under an explicit retained-data inventory; do not confuse fresh conversations with permission to discard unrelated account records.

Rollback uses the old build and old data. Preserve new Eve app/World/object data with its matching build; new Eve conversations do not become old-engine conversations. Avoid mixed patched/unpatched workers against suspended runs until compatibility is proved. Full legacy import/readability inside the new UI is deferred by #292.

## Decisions to review

1. **Engine maintenance:** recommend bounded source deltas for new contracts and narrow patches for isolated defects, with a named maintainer; upstream-only is the lower-maintenance alternative with uncertain switch timing.
2. **Creation:** retain the preferred one-workflow-record guarantee. Consider a weaker canonical-owner alternative only after the feasibility proof quantifies its trade-offs.
3. **First deployment:** prove one production host/World recipe end-to-end (Node24/Postgres is the current evidence-backed candidate); preserve independent gateway selection. Broader adapters must pass the same suite.
4. **Upstream reporting:** review prepared reports first. File novel reproducible bugs, add evidence to matching open issues, and separate feature requests from defects. Do not report the local credential failure or private-prototype defects as published Eve bugs.

These decisions bound the implementation; ordinary file/table naming and sequencing do not need repeated approval. The next concrete work is the engine packing/contract proof lane plus independent app/tool/installer contract preparation, not another standalone example.

## Validation of this planning baseline

`bun install --frozen-lockfile` succeeded after updating main. `bun lint` and `bun test:types` passed using Turbo cache hits; `bun test:unit` passed with fresh package runs (including 145 app, 58 CLI and 14 gateway tests, plus thread and worktree-port coverage). No app runtime changes are included. These baseline checks do not validate the proposed Eve implementation or clear the live-provider credential blocker.
