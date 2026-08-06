# 🟣 BUSINESS COMMAND CENTER — Repository Work Routing

Apply these rules to every task, regardless of who starts it or where it begins.

## Automatic placement
- Product/runtime code → existing `src/`, `app/`, `lib/`, `components/`, `api/`, `server/` structure. Never create a duplicate architecture.
- Tests → nearest existing test directory or matching `*.test.*` / `*.spec.*` convention.
- Database schema, migrations and seed data → existing database/migrations directory only.
- CI, automation and deployment configuration → `.github/workflows/` or the repository's existing deployment directory.
- Operational, audit and recovery records → `docs/operations/`.
- Architecture and technical decisions → `docs/architecture/`.
- Business requirements, workflows and policies → `docs/business/`.
- Temporary investigation output must not remain at repository root; convert useful findings into the correct document or remove them.

## Execution control
1. Inspect the repository structure and existing conventions before writing.
2. Reuse and extend existing modules; do not create parallel or duplicate systems.
3. Route every new file to its correct functional location.
4. Keep one authoritative source for each policy, config, workflow and business rule.
5. When work spans multiple areas, update code, tests, docs and deployment config together.
6. Diagnose blockers, apply recovery, verify, and continue without repeated approval.
7. Stop only for destructive actions, paid actions, missing credentials/permissions, or legal consent.
8. Report only verified success or the exact unresolved blocker.

## Completion gate
Work is complete only after relevant build/tests/CI pass and the accessible target or deployment health is verified where applicable.
