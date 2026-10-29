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
- `\.\mvnw.cmd -B verify`: **NOT RUN LOCALLY** because it requires the same unavailable Docker/Testcontainers path. The GitHub `backend-ci` job must provide the full Maven verify, PostgreSQL 17/18, Flyway, and regression evidence.
- `git diff --check`: **PASS**.
- Frontend checks: not run because no frontend file changed. The pre-fix PR run `40817089932` had `frontend-ci` successful and `backend-ci` failed on the confirmed JSON defect.

## Safety and invariant review

- Migrations V3/V4 were reviewed and not modified; no schema migration is needed.
- Tenant ID continues to come from the locked tenant control row and is passed unchanged into persistence. Authorization/controller code was not modified.
- Stable source/idempotency key formats, unique constraints, `ON CONFLICT DO NOTHING`, and conflict failure behavior are unchanged.
- Transaction insertion and `next_sequence` advancement remain inside the same `TransactionTemplate` transaction. `FOR UPDATE SKIP LOCKED`, rollback behavior, and compare-and-update sequence guard are unchanged.
- Global and tenant-level simulation gates, 1–10 rate validation, runtime configuration handling, and production rejection logic are unchanged. All 10 `RuntimePreflightTest` cases passed locally.
- Only synthetic references and deterministic seeds are used.

## Remote CI and remaining risk

- At handoff creation, the new commit had not yet been pushed; its GitHub Actions run was therefore pending creation.
- The remaining blocker is local Docker daemon unavailability. Executor review must require a green `backend-ci` run covering the new PostgreSQL JSONB regression and full `verify` before merge.
- No merge, auto-merge, migration, deployment, or production configuration action was performed.
