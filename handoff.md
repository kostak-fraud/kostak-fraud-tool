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
