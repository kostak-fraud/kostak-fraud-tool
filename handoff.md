# FND-003 Handoff — Railway isolation and release safety

**Updated:** 2026-10-29  
**Status:** Staging operational; production project isolated but empty; production release blocked by design.

## Verified provider state

- Railway staging project: accomplished-vibrancy; environment renamed to staging.
- API service: kostak-fraud-tool, ID 339a4353-7b6e-4ff6-a8cd-290048d87db3; last verified deployment SUCCESS at 614bafe8.
- Worker service: kostak-worker, ID 5ba0ffb7-4e9f-46ee-8a14-c6e7e05f4d45; last verified deployment SUCCESS at 614bafe8.
- Staging Flyway V1 completed. No production migration has run.
- Separate Railway production project kostak-fraud-production, ID 88aee7c7-224e-4fac-a87b-c72ac4d956f0, has an empty production environment and no services.
- Vercel Preview NEXT_PUBLIC_API_BASE_URL targets the Railway staging API. Its comment was updated to reflect the renamed environment.
- frontend/vercel.json disables Git-triggered main deployments while leaving feature-branch previews enabled.
- Current public HTTP readiness/info smoke is UNVERIFIED because the available executor/web network could not resolve/reach the Railway URL.

## Safety decisions

- Do not copy staging variables into the production project.
- Do not reset or rotate the production Supabase database password automatically; the existing password is not retrievable from the connected provider interface. Obtain/set it directly in the Supabase/Railway secret stores.
- Production API/Worker services have not been created; no production deployment or migration is in progress.
- The legacy Northflank release runner is replaced with a fail-closed guard. GitHub release workflows will not make provider calls until the Railway release flow is explicitly implemented and verified.
- Vercel production deployment was previously canceled; main branch deployments are now disabled in repository configuration.

## Required remaining work

1. Add a least-privilege production DB role and TLS connection values securely; then create production Railway API and Worker services.
2. Implement Railway-specific exact-revision release orchestration and migration-first behavior. Include a regression test for the staging Flyway/Hikari pool timeout and separate Flyway connection settings.
3. Verify public API readiness, exact /actuator/info SHA, Worker heartbeat/DB status and migration schema version from a DNS-capable runner.
4. Configure Vercel production API URL only after production API is live; prove Preview/Production API and Supabase environment mapping.
5. Enable production release automation only after all previous checks pass and with explicit release approval.

## Repository evidence

- PR #5 — Railway Docker build compatibility: https://github.com/kostak-fraud/kostak-fraud-tool/pull/5
- PR #8 — disable Vercel automatic production deploys from main: merged as 001e77b4fb5e3c5ad9542b0373749d177a4e65a6
- UI-001 PR #7 — accessible app shell and channel navigation: merged as ec076b6e42e4bb200ce923c11035790989d447a8
- FND-003 tracking issue: https://github.com/kostak-fraud/kostak-fraud-tool/issues/6

---

# TX-002 Handoff — JSON sequence serialization regression fix

**Updated:** 2026-10-29
**Ticket:** TX-002
**Pull request:** https://github.com/kostak-fraud/kostak-fraud-tool/pull/13
**Starting HEAD:** `5948b397641f7751d63cf3ea683bb2fe7dbebb96`
**Implementation commit:** `094ff344bbff8a3f7cdf6177f02cec3a3175176e`

## Root cause and fix

- `SimulationGeneratorService.insert()` manually interpolated the zero-padded suffix of the idempotency key into JSON. Values such as `000000000001` are not valid JSON numbers, so PostgreSQL rejected the `CAST(? AS jsonb)` operation.
- The generator now passes its existing `long sequence` directly to `insert()` and serializes `scenario` plus `sequence` with the Jackson 3 `ObjectMapper` already provided by the Spring Boot web dependency.
- `sequence` remains a JSON number, while scenario values and stable idempotency key formatting remain unchanged. No dependency was added.

## Changed files

- `backend/src/main/java/com/kostak/fraud/simulation/SimulationGeneratorService.java`: replaces manual JSON construction with Jackson serialization of the real numeric sequence.
- `backend/src/test/java/com/kostak/fraud/transactions/TransactionSchemaIntegrationTest.java`: wires the serializer in the direct service fixture and adds persistence-path assertions for sequences `1`, `10`, and `1000000000001`, JSON number type, and deterministic scenario values. The existing restart-continuity integration test remains intact.
- `handoff.md`: preserves the FND-003 handoff above and adds this TX-002 Worker record.

## Validation performed

- Active machine JDK preflight: the configured JDK was Java 17. The initial focused command `\.\mvnw.cmd -B -Dtest=TransactionSchemaIntegrationTest#generatorPersistsTransactionsAndResumesSequenceAfterServiceRecreation test` stopped at compilation with `release version 25 not supported`; it did not reach the regression.
- A portable Temurin `25.0.5+8` JDK was used from a temporary directory without changing the system Java installation.
- `\.\mvnw.cmd -B -Dtest=SyntheticTransactionFactoryTest test`: **PASS**, 3 tests, 0 failures/errors; production and test sources compiled with Java release 25.
- `\.\mvnw.cmd -B '-Dtest=SyntheticTransactionFactoryTest,TransactionFieldRegistryTest,RuntimePreflightTest,AppModeTest,KostakApplicationModeTest,SupabaseJwtDecoderTest,WorkerHeartbeatLifecycleTest' test`: **PASS**, 25 tests, 0 failures/errors after the final source change.
- `\.\mvnw.cmd -B -Dtest=TransactionSchemaIntegrationTest#generatorPersistsTransactionsAndResumesSequenceAfterServiceRecreation+generatorPersistsSequenceMetadataAsJsonNumbers test`: **NOT COMPLETED**. Testcontainers waited on the local Docker named pipe for more than 60 seconds while the Docker daemon remained unresponsive; the command was interrupted. No pass is claimed.
- `\.\mvnw.cmd -B verify`: **NOT RUN LOCALLY** because it requires the same unavailable Docker/Testcontainers path. GitHub Actions run `40818353588` subsequently provided the full remote verification evidence.
- `git diff --check`: **PASS**.
- Frontend checks were not run locally because no frontend file changed. In GitHub Actions run `40818353588`, `frontend-ci` passed.

## Safety and invariant review

- Migrations V3/V4 were reviewed and not modified; no schema migration is needed.
- Tenant ID continues to come from the locked tenant control row and is passed unchanged into persistence. Authorization/controller code was not modified.
- Stable source/idempotency key formats, unique constraints, `ON CONFLICT DO NOTHING`, and conflict failure behavior are unchanged.
- Transaction insertion and `next_sequence` advancement remain inside the same `TransactionTemplate` transaction. `FOR UPDATE SKIP LOCKED`, rollback behavior, and compare-and-update sequence guard are unchanged.
- Global and tenant-level simulation gates, 1–10 rate validation, runtime configuration handling, and production rejection logic are unchanged. All 10 `RuntimePreflightTest` cases passed locally.
- Only synthetic references and deterministic seeds are used.

## Remote CI and remaining risk

- GitHub Actions run `40818353588` for PR #13 completed successfully: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/40818353588.
- `frontend-ci` and `backend-ci` both passed. The backend job completed Maven `verify`; `TransactionSchemaIntegrationTest` passed 7/7, including the existing restart-continuity test and the new JSONB sequence regression.
- Remote verification also passed Flyway migration coverage, PostgreSQL 17.11 and 18.3 compatibility tests, and the backend runtime image build/inspection.
- Local Docker daemon unavailability remains a local-environment limitation only; the local Testcontainers command was not completed and no local persistence-test pass is claimed. The successful remote `backend-ci` run supplies the required PostgreSQL/Testcontainers evidence for this handoff.
- `release-ready` was skipped as expected. No merge, auto-merge, migration, deployment, or production configuration action was performed.

---

# TX-003 Handoff — Tenant-scoped transaction list API

**Updated:** 2026-10-29 08:20 Europe/Istanbul

**Ticket:** TX-003

**Branch:** `feat/tx-003-transaction-list-api`

**Starting SHA:** `0f04bfe98c5cb367df3fe8ad279725841dbea163`

**Final implementation SHA:** `931fa1f044400655e33cc25b5273645ad7278dce`

**Draft PR:** https://github.com/kostak-fraud/kostak-fraud-tool/pull/14

## 1. Delivery summary

- Added `GET /api/v1/transactions?channel=wallet&page=0&pageSize=50` through the established
  controller/service/repository package boundary.
- Tenant scope comes only from `IdentityContextService.current(jwt).tenantId()` after the existing
  `transactions.read` permission guard; no request value controls the tenant predicate.
- The page and exact-count SQL are parameterized and both require authorized `tenant_id`, requested
  `channel`, and `evaluation_state = 'processed'`.
- Ordering is fixed to `occurred_at DESC, id DESC`. Pagination is zero-based offset pagination with
  default 50, range 1–100, database `LIMIT/OFFSET`, and overflow rejection.
- Response fields follow V3 plus `TransactionFieldRegistry`; tenant ID, source/idempotency references,
  raw score and internal evaluation state are not exposed.
- Added the discoverable API contract in `docs/TRANSACTION_LIST_API.md`. No frontend was changed.

## 2. Changed files

- `backend/src/main/java/com/kostak/fraud/transactions/TransactionListController.java`
- `backend/src/main/java/com/kostak/fraud/transactions/TransactionListService.java`
- `backend/src/main/java/com/kostak/fraud/transactions/TransactionListRepository.java`
- `backend/src/main/java/com/kostak/fraud/transactions/TransactionListItem.java`
- `backend/src/main/java/com/kostak/fraud/transactions/TransactionPageResponse.java`
- `backend/src/test/java/com/kostak/fraud/transactions/TransactionListIntegrationTest.java`
- `backend/src/test/java/com/kostak/fraud/transactions/TransactionListServiceTest.java`
- `docs/TRANSACTION_LIST_API.md`
- `README.md`
- `handoff.md`

DB schema/migration/env impact: **none**. Applied V3/V4 migrations were not modified and no V5 was
added. No production/staging migration, deploy, configuration or credential operation was performed.

## 3. Acceptance criteria evidence

| Criterion | Result | Evidence |
|---|---|---|
| Mandatory supported channel; invalid input is 400 | Pass | `rejectsMissingBlankUnknownChannelAndInvalidPagination` covers missing, blank, unknown and numeric binding failures. |
| Auth required and `transactions.read` enforced | Pass | `requiresAuthenticationAndTransactionsReadPermission` proves anonymous 401 and active membership without permission 403 through MockMvc/Spring Security. |
| Server-resolved tenant isolation | Pass | `scopesRowsAndCountsToAuthenticatedTenantAndRequestedChannel` seeds Tenant A/B in real PostgreSQL, supplies Tenant B as a request parameter, and proves only Tenant A rows/count/pages across page 0 and 1. |
| Fixed newest-first ordering with ID tie-break | Pass | `ordersByOccurredAtThenIdAndPaginatesWithoutDuplicatesOrGaps` proves exact order for equal timestamps and all three pages. |
| Bounded server-side pagination | Pass | Defaults `page=0`, `pageSize=50`; size 0/101, negative page, nonnumeric values and overflow return 400; SQL applies `LIMIT/OFFSET`; out-of-range page returns empty items with stable totals. |
| Only processed evaluation state is visible | Pass | `returnsOnlyProcessedTransactionsAndKeepsCountConsistent` seeds pending/processing/processed/failed; only processed ID and count 1 are returned. Internal evaluation state is absent from JSON. |
| Page and count share tenant/channel/processed predicates | Pass | Repository SQL contains identical predicates; cross-tenant/state behavior tests and both `EXPLAIN ANALYZE` plans show all three predicates. |
| Three channels and empty page behavior | Pass | `supportsEveryChannelAndReturnsAValidEmptyPage` covers wallet, pos and physical_pos plus valid empty/out-of-range metadata. |
| Total-count cost/index plan measured | Pass | `representativePageAndCountPlansUseNaturalPostgresPlanner` uses 50.000 rows, `ANALYZE`, and unforced PostgreSQL 18.3 `EXPLAIN (ANALYZE, BUFFERS)`. Results below. |
| API contract documented | Pass | `docs/TRANSACTION_LIST_API.md` records auth, params/defaults/bounds, response, fixed ordering, processed-only semantics, errors and performance limits. |

## 4. Verification performed

- Java 25 compile/test-compile:
  `backend/.\mvnw.cmd -B -DskipTests compile test-compile` — **PASS**.
- Docker-independent focused suite:
  `backend/.\mvnw.cmd -B '-Dtest=TransactionListServiceTest,SyntheticTransactionFactoryTest,TransactionFieldRegistryTest,RuntimePreflightTest,AppModeTest,KostakApplicationModeTest,SupabaseJwtDecoderTest,WorkerHeartbeatLifecycleTest' test`
  — **PASS**, 27 tests, 0 failures/errors.
- Local `backend/.\mvnw.cmd -B verify` — **NOT COMPLETED LOCALLY**. Docker Desktop backend was present
  but Windows service `com.docker.service` was stopped and could not be started without administrator
  access; no local PostgreSQL/Testcontainers pass is claimed.
- GitHub Actions CI run `40822325322`:
  https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/40822325322 — **PASS**.
  `frontend-ci` passed. `backend-ci` ran Maven `verify` successfully: 48 surefire tests and 2 failsafe
  tests, including 7/7 TX-003 PostgreSQL endpoint/query-plan tests, PostgreSQL 17.11/18.3 compatibility,
  Flyway validation, and backend runtime image build/inspection.
- First CI run `40822191050` — **FAILED**, accurately recorded: four new tests passed `Instant`
  directly to JDBC fixtures and PostgreSQL could not infer the type. Fixtures now use
  `Timestamp.from`; the successful replacement run above verifies the fix.
- `git diff --check` — **PASS** before each implementation push and again before handoff.
- Frontend files were not changed; remote `frontend-ci` still completed lint, typecheck, test and build.

## 5. Query-plan and pagination decision

Fixture: PostgreSQL 18.3, 50.000 synthetic wallet rows; 40.000 Tenant A, 10.000 Tenant B, and 10% of
Tenant A rows processed. Planner was not forced; `ANALYZE transactions` ran first.

- Page query: natural index scan on `transactions_tenant_channel_occurred_id_idx`; 50 rows returned,
  450 evaluation-state rows filtered, 24 shared buffer hits, execution `0,180 ms`.
- Exact count: sequential scan; 4.000 rows counted, 46.000 filtered, 1.665 shared buffer hits,
  execution `12,380 ms`.
- Decision: retain bounded offset pagination because the API must expose page-number navigation and
  exact totals. Do not add a migration/index for this measured MVP load. Existing index makes the
  first page inexpensive; exact count is documented as linear and deep offsets grow more expensive.
  Re-measure at larger/prod-like distributions before adding a processed partial index, deferred or
  approximate count, or a cursor contract. These numbers are test-fixture evidence, not an SLA.

## 6. Security, risks and follow-up

- Cross-tenant row IDs and transaction volumes are excluded by repository predicates verified against
  a real container. Client `tenantId` is ignored as authority and cannot replace authenticated tenant.
- SQL uses placeholders for every tenant/channel/page value; no client sort expression or raw SQL is
  accepted.
- Exact page data and count are two read statements under normal `READ COMMITTED`; concurrent inserts
  can move offset pages between separate requests. The fixed ordering is deterministic for a stable
  fixture, matching TX-003 scope. Snapshot/cursor/live-refresh behavior remains later work.
- Exact count and deep offset cost grow with data volume; documented and intentionally not hidden by
  unsupported performance claims.
- No UI, advanced filters, rule evaluation, saved views, bulk actions, detail API, RLS expansion or
  unrelated refactor was added.

## 7. Executor action

Implementation is ready for Executor review. Inspect PR #14, repository SQL and integration fixtures;
do not treat this Worker handoff as merge/deploy approval. Worker did not merge, deploy, migrate, or
change production configuration.
