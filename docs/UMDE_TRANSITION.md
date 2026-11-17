# UMDE development continuity

The repository keeps the earlier UMDE engineering history while the current `main` source is replaced by the locally validated application developed after the second interim report.

## Evidence boundary

- The second interim report ends at the historical `TX-003` main commit `9cc5eb38c76f8b639e834b60a8b2c46f3430f6c8` dated 29 October 2026.
- Earlier pull requests, workflow runs, commits and staging notes remain historical evidence. They are not claims about the runtime architecture of the current application.
- The current line is a functional local-first fraud monitoring prototype built entirely with synthetic data. It becomes the product baseline for subsequent UMDE and graduation-project work.

## Current canonical runtime

`preview/server.mjs` and `preview/public/` provide the complete runnable workflow at `http://localhost:3000`:

- Wallet, Virtual POS and Physical POS transaction monitoring
- type-aware multi-column filters and user/channel default views
- column ordering and cell actions
- analyst assignment, exclusive edit lease, decisions, comments and audit trail
- no-code temporal rule formulas with independent metric windows and grouping keys
- Wallet customer profiles, linked wallets, prepaid cards, devices and activity history
- synthetic transaction generation and local persistence

The `backend/` and `frontend/` directories remain migration targets for a production-shaped Spring/Next implementation. They must not be presented as having feature parity with the canonical local runtime until that migration is completed and tested.

## Verification

Run the same deterministic quality entry point locally and in GitHub Actions:

```text
npm run ci
```

Generated data, logs, caches and runtime state are intentionally excluded from version control.
