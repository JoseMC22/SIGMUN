# Tasks: Auth Boundary Stabilization — First Increment

## Overview
This task list targets the first increment: backend auth contract stabilization, backend auth boundary tests, and frontend auth test scaffolding.

## Task 1 — Stabilize backend auth contract types
- title: Stabilize backend auth DTOs and successful/failed response shapes
- description: Update backend auth contract types to explicitly express `LoginSuccessResponse`, `SessionCheckResponse`, `LogoutSuccessResponse`, and `AuthErrorResponse`; include `authenticated` and `sessionExpiresAt` on success responses and standardize error payload codes.
- owner: dev
- estimate: 3 hours
- files to change:
  - backend/src/auth/dto/auth.dto.ts
  - backend/src/auth/auth.service.ts
- acceptance test reference: "Successful login issues auth cookie and stable response", "Login with invalid credentials returns structured auth error", "Logout invalidates server session and clears auth cookie", "Session validation failure for expired or absent cookies"

## Task 2 — Harden backend auth endpoints and cookie contract
- title: Harden auth controller behavior, session endpoint, and cookie contract
- description: Update `POST /api/auth/login`, `GET /api/auth/session`, and `POST /api/auth/logout` to implement the stabilized auth contract. Return consistent DTO shapes, use `sameSite: 'Lax'` for `access_token`, preserve HttpOnly cookie semantics, and return 401 + `AuthErrorResponse` for missing/invalid sessions.
- owner: dev
- estimate: 5 hours
- files to change:
  - backend/src/auth/auth.controller.ts
  - backend/src/auth/auth.service.ts
  - backend/src/main.ts
- acceptance test reference: "Successful login issues auth cookie and stable response", "Protected backend endpoint rejects missing auth cookie", "Protected backend endpoint rejects invalid or expired session", "Logout invalidates server session and clears auth cookie", "Frontend auth client uses backend session validation for state"

## Task 3 — Add protected backend example endpoint and auth guard anchor
- title: Add protected endpoint contract anchor for auth boundary tests
- description: Implement a protected example route `GET /api/protected` behind `JwtAuthGuard` that returns `authenticated: true` and simple payload data, so tests can verify guard enforcement and contract guarantees.
- owner: dev
- estimate: 2 hours
- files to change:
  - backend/src/app.controller.ts
  - backend/src/auth/auth.module.ts (if needed for guard/controller registration)
- acceptance test reference: "Protected backend endpoint rejects missing auth cookie", "Protected backend endpoint rejects invalid or expired session"

## Task 4 — Add backend auth boundary tests
- title: Add backend Jest tests for login, session validation, logout, and protected route coverage
- description: Add a backend auth test suite covering successful login, invalid credentials, session check valid/missing/invalid, protected route allow/deny, logout success, and logout session invalidation. Verify response status, payload shapes, cookie headers, and cache invalidation semantics.
- owner: test
- estimate: 8 hours
- files to change:
  - backend/src/auth/auth.controller.spec.ts or backend/src/auth/auth.e2e-spec.ts
  - backend/test/jest-e2e.json (only if a new e2e config is required)
- acceptance test reference: all backend auth acceptance scenarios and minimal backend test matrix entries

## Task 5 — Align frontend auth API and action layer with backend contract
- title: Align frontend auth API client and server action behavior with backend session validation
- description: Update frontend request/response types and API helpers to use the stable backend auth contract; add `sessionCheck()` and improve `logout()` semantics so frontend state relies on backend `authenticated` results rather than local auth metadata.
- owner: dev
- estimate: 4 hours
- files to change:
  - frontend/src/lib/api.ts
  - frontend/src/actions/auth.ts
- acceptance test reference: "Frontend auth client uses backend session validation for state"

## Task 6 — Add frontend test scaffold and initial auth client contract test
- title: Add frontend test runner scaffold and first auth client contract test
- description: Add minimal Next.js-compatible frontend test scaffolding, a test script, and an initial test that validates auth client behavior against the stabilized backend contract shape.
- owner: test
- estimate: 5 hours
- files to change:
  - frontend/package.json
  - frontend/vitest.config.ts
  - frontend/src/__tests__/auth-api.test.ts
- acceptance test reference: "Frontend must have test runner scaffolding compatible with Next.js 16 and one initial auth contract test targeting the auth client layer"

## Review Workload Forecast
- Estimated changed lines: 220–280 total
- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Low

## Execution Order
1. Task 1 — establish the backend auth DTO/response contract.
2. Task 2 — wire the stabilized contract into auth endpoints, cookie behavior, and session validation.
3. Task 3 — add the protected route contract anchor used by tests.
4. Task 4 — implement backend auth boundary tests once the contract and endpoints are stable.
5. Task 5 — update frontend auth client/API alignment with the finalized backend contract.
6. Task 6 — add frontend test scaffold and initial auth contract test.

## Required passing tests per task
- Task 1: Type-check plus backend compile and DTO contract consistency.
- Task 2: Backend auth endpoint smoke tests for login, logout, session, and cookie semantics.
- Task 3: Protected route guard test verifying 401 for unauthenticated access and 200 for valid session.
- Task 4: Full backend auth test suite passes with expected status codes and payload shapes.
- Task 5: Frontend compile plus client helper behavior consistent with backend API types.
- Task 6: Frontend test runner initializes and the initial auth client test passes.
