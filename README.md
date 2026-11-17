# Kostak Fraud Tool

Kostak is a local-first fraud monitoring and investigation prototype for Wallet,
Virtual POS and Physical POS channels. This repository version is the canonical
baseline for continued development and the UMDE vize delivery.

## Current application

The complete runnable workflow lives in `preview/` and uses a dependency-free
Node.js HTTP server with JSON persistence. It includes:

- channel-specific transaction schemas and server-side pagination;
- typed central filters, saved defaults and drag-and-drop column ordering;
- cell copy/equal-filter actions, analyst assignment and investigation history;
- a no-code temporal rule builder with COUNT, SUM, AVG, MIN, MAX and DISTINCT;
- per-metric time windows, independent grouping and arithmetic formulas;
- Wallet customer profiles with wallets, prepaid cards, devices and activity.

`backend/` and `frontend/` are production-shaped Spring Boot and Next.js migration
targets. They are retained for the next architecture phase, but do not yet have
feature parity with the canonical local prototype.

## Quick start

Node.js 22 or newer is required.

```powershell
.\start-local.ps1
```

Open `http://localhost:3000`, then stop the application with:

```powershell
.\stop-local.ps1
```

Local data is written to `preview/data/kostak.json` and is intentionally ignored
by Git.

## Quality gate

No dependency installation is required for the canonical prototype.

```powershell
npm run ci
```

The command performs the repository lint policy, JavaScript syntax checks, an API
smoke test and Wallet/rule-engine invariant tests against an isolated temporary
data store. The same commands run in GitHub Actions as `frontend-ci` and
`backend-ci`.

## Demo identities

The UI can switch between `analyst.one`, `analyst.two`, `rule.author` and
`viewer`. Requests carry the selected identity in an `X-Demo-User` header. This
mechanism is limited to the local academic prototype.

## Project continuity

The repository history before this baseline records the first two UMDE reporting
periods and the earlier Spring/Next foundation work. The current tree replaces
the runnable product baseline without rewriting that history. See
`docs/UMDE_TRANSITION.md` for the transition boundary and scope.
