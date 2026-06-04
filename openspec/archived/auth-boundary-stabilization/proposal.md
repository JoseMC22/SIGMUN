# Proposal: Auth Boundary Stabilization and First Test Increment

## Intent

Stabilize the backend/frontend authentication boundary in the SIGMUN monorepo by aligning the API contract, hardening session/auth route protection, and establishing the first reliable auth-related test increment.

The current architecture has a NestJS backend with JWT cookie + cache-backed session validation and a Next.js frontend that stores metadata in localStorage while relying on HttpOnly JWT cookies. This mismatch and lack of frontend test coverage create a high-risk auth surface.

## Scope

### In Scope
- Harden backend auth/session boundary and clarify the API contract exposed from `backend/src/main.ts`.
- Align shared DTO/schema expectations for login, logout, session state, and protected-route responses between backend and frontend.
- Implement route protection for authenticated backend endpoints and ensure invalid session/cookie cases are handled consistently.
- Add backend Jest coverage for auth boundary behavior, including login/logout, cookie/session validation, protected route access, and cache invalidation semantics.
- Establish frontend test scaffolding for Next.js and add an initial auth-related test for `frontend/actions/auth.ts` / `frontend/lib/api.ts`.
- Document the auth contract and the first auth boundary expectations so `sdd-spec` can produce targeted requirements.

### Out of Scope
- Full frontend auth UI redesign or UX changes beyond route protection and metadata handling.
- Migrating auth to a new protocol, third-party identity provider, or non-cookie token storage strategy.
- Full end-to-end browser automation or integration tests beyond initial frontend test runner setup.
- API contract changes unrelated to auth/session boundary.
- Production deployment or infrastructure changes outside local `.atl` persistence.

## Capabilities

### New Capabilities
- `auth-boundary-contract`: define and verify the backend/frontend authentication API contract and schema alignment.
- `auth-test-scaffold`: establish frontend test runner scaffolding and an initial auth test increment.

### Modified Capabilities
- `backend-auth`: strengthen auth requirements to cover session cache-backed validation, invalidation behavior, and protected route enforcement.

## Approach

1. Analyze existing backend auth module, session cache logic, stored procedure login/logout, and the API entrypoint in `backend/src/main.ts`.
2. Define a concrete contract for auth APIs: login request/response shape, logout behavior, session validation result, cookie semantics, and error payloads.
3. Align frontend metadata handling in `frontend/actions/auth.ts` and `frontend/lib/api.ts` with the backend contract, removing assumptions that are not guaranteed by server state.
4. Add backend Jest tests first, because backend strict TDD is already true and Jest coverage exists.
5. Add frontend test runner scaffolding for Next.js 16 and one initial auth-related test file to validate the frontend auth client behavior without requiring a full integration layer.
6. Keep the first increment small, focused on contract stability rather than broad auth platform changes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/main.ts` | Modified | clarify API boundary, add auth route protection, ensure correct API host/port assumptions. |
| `backend/auth/**` | Modified | strengthen auth/session validation, align response DTOs, add tests for login/logout/guard cases. |
| `backend/database/**` | Modified | verify cache-backed session validation and stored procedure logout behavior under invalid session cases. |
| `frontend/actions/auth.ts` | Modified | align login/logout flow with backend API contract and metadata persistence expectations. |
| `frontend/lib/api.ts` | Modified | standardize API client auth behavior and error handling for auth boundary cases. |
| `frontend/app/page.tsx` | Modified | add or stabilize route protection / authenticated landing logic as needed. |
| `.atl/testing-capabilities.md` | Modified | record frontend test runner status and confirm backend strict TDD mode. |

## Constraints

- Persistence is local `.atl` only; no cloud or external auth storage changes are part of this change.
- Backend Jest tests already exist and strict TDD is enabled for backend work.
- Frontend currently has no test runner or test scripts, so the first increment must be scaffolding-first and low-risk.
- Work must fit an initial SDD increment rather than a full auth platform overhaul.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Frontend/localStorage metadata and backend session contract mismatch | High | define explicit shared DTO shapes, verify with backend tests, and avoid assuming client-only metadata means authenticated state. |
| Hidden protected routes not covered by the auth guard | Medium | audit backend auth routes and add at least one protected-route test coverage. |
| Frontend test runner choice conflicts with Next.js 16 | Medium | choose a test runner compatible with Next.js 16 and keep initial setup minimal; document the runner contract in `.atl`. |
| Backend session cache invalidation semantics are unstable | Medium | add tests for cache-backed validation and logout/invalidation path from stored procedure. |
| Scope creep into unrelated API or auth UX changes | Medium | keep the first change focused on boundary stabilization, contract alignment, and test hygiene. |

## Rollback Plan

- Revert API contract and DTO/schema changes if they introduce regressions.
- Revert backend auth tests only if they depend on unstable implementation details unrelated to the auth contract.
- Revert frontend test scaffolding if the selected runner breaks Next.js startup or local developer flows.
- Keep code changes isolated to auth boundary files and config so rollback is limited and traceable.

## Dependencies

- existing backend NestJS auth module and JWT cookie/session implementation
- frontend Next.js 16 auth action flow and API client
- `.atl` local persistence conventions and `testing-capabilities.md` status
- decision on frontend test runner approach for Next.js 16 (likely Vitest or the project's preferred compatible runner)

## Success Criteria

- [ ] Backend auth boundary contract is documented and aligned between backend and frontend.
- [ ] Backend Jest tests cover login, logout, session validation, and at least one protected route.
- [ ] Frontend test runner scaffold is installed/configured and the initial auth test executes.
- [ ] Frontend auth client and metadata handling in `frontend/actions/auth.ts` match backend expectations for HttpOnly JWT cookie auth.
- [ ] No new auth regressions are introduced in the stabilized boundary; the first auth increment is verifiable through tests.
