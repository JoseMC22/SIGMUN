# Auth Boundary Stabilization — Design

## Overview

This design stabilizes the SIGMUN authentication boundary by making the backend auth API contract explicit, aligning frontend auth client behavior to backend session validation, and preserving the first increment scope to contract stabilization, backend auth tests, and frontend auth test scaffolding.

The working contract is username/password login with an HttpOnly cookie named `access_token`, cache-backed session validation, and protected backend route enforcement.

## Architecture Approach

- Backend remains NestJS with Passport JWT strategy and cache-backed session validation.
- Auth boundary is limited to: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, plus one example protected endpoint `GET /api/protected`.
- Shared validation is implemented with DTO/Zod schemas in `backend/src/auth/dto/auth.dto.ts` and mirrored frontend types in `frontend/src/lib/api.ts`.
- Frontend auth actions transition from local-storage assumptions to backend-driven session state.
- Cookie and CORS configuration are explicit contract elements and must be documented in `backend/src/main.ts`.

## Detailed API Design

### Login

Endpoint
- `POST /api/auth/login`

Request
- Content-Type: `application/json`
- Body:
  - `username`: string
  - `password`: string

Request schema
```ts
export const loginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(1).max(200),
});
```

Successful response
- HTTP 200
- Body:
```ts
export interface LoginSuccessResponse {
  authenticated: true;
  user: {
    id: string;
    username: string;
    fullName: string;
    profileId: string;
    profileName: string;
    areaId: string;
    areaName: string;
    isEncargado: string;
    isRemoto: boolean | null;
  };
  sessionExpiresAt: string; // ISO 8601
}
```

Failure response
- HTTP 401 or 400
- Body:
```ts
export interface AuthErrorResponse {
  authenticated: false;
  errorCode: 'AUTH_INVALID_CREDENTIALS' | 'AUTH_CONTRACT_MISMATCH';
  message: string;
}
```

Set-Cookie contract
- Cookie name: `access_token`
- `HttpOnly`: true
- `Path`: `/`
- `SameSite`: `Lax`
- `Secure`: `process.env.NODE_ENV === 'production'`
- `Max-Age` or `Expires`: aligned to the configured JWT TTL (default 8 hours)
- Cookie value: signed JWT only
- Cookie must not be readable by frontend JavaScript

Notes
- Current backend already issues `access_token` in a cookie; this design stabilizes it rather than renaming it.
- The current implementation uses `sameSite: 'strict'`; for cross-origin frontend/backends during local development, this should be changed to `Lax`.

### Logout

Endpoint
- `POST /api/auth/logout`

Request
- No body required
- Must include credentials/cookies

Successful response
- HTTP 200
- Body:
```ts
export interface LogoutSuccessResponse {
  success: true;
  message: string;
}
```

Failure response
- HTTP 401 or 500
- Body:
```ts
export interface LogoutErrorResponse {
  success: false;
  errorCode: 'AUTH_SESSION_INVALID' | 'AUTH_LOGOUT_FAILED';
  message: string;
}
```

Server behavior
- Protect with `JwtAuthGuard`
- Invalidate cache key `session:${userId}`
- Execute the legacy stored procedure wrapper for logout semantics
- Clear cookie with the same flags used in login and `Max-Age=0`

### Session Check

Endpoint
- `GET /api/auth/session`

Request
- No body
- Must include credentials/cookies

Successful response
- HTTP 200
- Body:
```ts
export interface SessionCheckResponse {
  authenticated: true;
  user: {
    id: string;
    username: string;
    fullName: string;
    profileId: string;
    profileName: string;
    areaId: string;
    areaName: string;
    isEncargado: string;
    isRemoto: boolean | null;
  };
  sessionExpiresAt: string;
}
```

Unauthenticated response
- HTTP 401
- Body: `AuthErrorResponse`

Semantics
- `authenticated: true` is the only correct signal for an authenticated state.
- The frontend must treat `401` or `authenticated: false` as unauthenticated.

### Protected Resource Example

Endpoint
- `GET /api/protected`

Successful response
- HTTP 200
- Body:
```ts
export interface ProtectedDataResponse {
  authenticated: true;
  data: {
    message: string;
  };
}
```

Failure response
- HTTP 401
- Body: `AuthErrorResponse`

Protection
- Use `@UseGuards(JwtAuthGuard)` on the controller or the route
- This endpoint is a contract example and test anchor point for auth guard behavior

## DTO / Zod Schemas

### Backend shared schemas

`backend/src/auth/dto/auth.dto.ts`
- `loginSchema`
- `LoginDto`
- `LoginSuccessResponse`
- `SessionCheckResponse`
- `LogoutSuccessResponse`
- `AuthErrorResponse`
- `JwtPayload`

Example:
```ts
export const loginSchema = z.object({
  username: z.string({ message: 'El usuario es obligatorio.' }).min(3).max(100),
  password: z.string({ message: 'La contraseña es obligatoria.' }).min(1).max(200),
});

export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthErrorResponse {
  authenticated: false;
  errorCode: 'AUTH_INVALID_CREDENTIALS' | 'AUTH_SESSION_MISSING' | 'AUTH_SESSION_INVALID' | 'AUTH_LOGOUT_FAILED' | 'AUTH_CONTRACT_MISMATCH';
  message: string;
}
```

### Frontend shared validation types

`frontend/src/lib/api.ts`
- `LoginRequest`
- `LoginSuccessResponse`
- `SessionCheckResponse`
- `LogoutSuccessResponse`
- `AuthErrorResponse`
- `ApiRequestError`

This file should be the source of truth for request/response shapes used by client code.

## Cookie and Security Requirements

### Cookie contract
- Name: `access_token`
- HttpOnly: true
- Path: `/`
- SameSite: `Lax`
- Secure: true in production; false in local development
- Max-Age: 8 hours (or derived from `JWT_EXPIRES_IN`)
- Value: signed JWT only
- No cookie value in response bodies

### Security requirements
- No JWT values in frontend-visible JSON.
- No auth token storage in `localStorage`/`sessionStorage` for the token itself.
- Frontend may store user metadata for UI state only, but must revalidate with `/auth/session` before trusting auth.
- Backend error payloads must be standardized and not leak internal state.
- Backend routes requiring auth must be rejected by a guard before controller logic runs.

### Refresh considerations
- This first increment does not add refresh token support.
- Use static TTL and session cache invalidation.
- For a future increment, add a separate refresh endpoint and rotate refresh tokens instead of extending login cookie duration.

## CORS Configuration

`backend/src/main.ts` should configure CORS explicitly:
- origin: `['http://localhost:3000', process.env.FRONTEND_URL ?? 'http://localhost:3000']`
- methods: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`
- allowedHeaders: `['Content-Type', 'Accept']`
- credentials: true
- Do not use wildcard origin with credentials

Example:
```ts
app.enableCors({
  origin: [frontendUrl, devAllowedHost],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
});
```

Notes
- `Set-Cookie` is handled by the browser when `credentials: 'include'` is present; it should not be treated as a request header.
- The backend must not use `origin: '*'` when `credentials: true`.

## Sequence Diagrams (Textual)

### Login flow

1. Frontend `frontend/actions/auth.ts` calls backend `POST /api/auth/login` with `{ username, password }` and `credentials: 'include'`.
2. Backend `AuthController.login` validates body with `loginSchema`.
3. Backend `AuthService.login` calls the legacy stored procedure, validates credentials, signs JWT, caches session state under `session:${userId}`, and returns user metadata.
4. Backend sets `Set-Cookie: access_token=...; HttpOnly; Path=/; SameSite=Lax; Secure=<prod>; Max-Age=...`.
5. Backend returns HTTP 200 with `LoginSuccessResponse`.
6. Frontend receives authenticated response, optionally stores user metadata for UI, and only considers auth active if `authenticated: true`.

### Session validation flow

1. Frontend calls `GET /api/auth/session` with `credentials: 'include'`.
2. Backend cookie-parser extracts `access_token` from the request.
3. `JwtStrategy` verifies the token signature, expiration, and then calls `AuthService.validateSession(payload.sub)`.
4. If cache session exists: backend returns HTTP 200 with `SessionCheckResponse`.
5. If missing/invalid: backend returns HTTP 401 with `AuthErrorResponse`.
6. Frontend treats any failure as unauthenticated and clears local auth metadata.

### Logout flow

1. Frontend calls `POST /api/auth/logout` with `credentials: 'include'`.
2. Backend guard `JwtAuthGuard` validates token and session state.
3. `AuthController.logout` calls `AuthService.logout(userId, username)`.
4. `AuthService.logout` deletes cache key `session:${userId}` and invokes the legacy logout stored procedure.
5. Backend clears the `access_token` cookie with `Max-Age=0`.
6. Backend returns HTTP 200 with `LogoutSuccessResponse`.
7. Frontend clears local UI metadata and treats the user as signed out.

## Migration and Compatibility Notes

- The backend currently uses the legacy stored procedure `[Acceso].[sp_LogOut]` for both login and logout paths. For this first increment, preserve the existing SP call contract and document it clearly as a legacy compatibility wrapper.
- Keep the cookie name `access_token` to avoid breaking currently deployed or developer local state.
- Current cache key `session:${userId}` implies one session validity state per user. That is acceptable for this stabilization increment but should be revisited if concurrent sessions become a requirement.
- No schema migration is required in the database for this scope.
- Cache invalidation must be tested explicitly: logout deletes `session:${userId}` and an expired/invalidated session must produce `AUTH_SESSION_INVALID`.
- Existing frontend localStorage storage of user metadata is compatible only if it is treated as UI cache; it must not be the primary auth source.

## Implementation Plan

### Backend changes

1. `backend/src/auth/dto/auth.dto.ts`
   - Add `LoginSuccessResponse` and `SessionCheckResponse` types.
   - Add `LogoutSuccessResponse` and `AuthErrorResponse`.
   - Keep `LoginDto` and `loginSchema` but document `username` as the stable login credential.

2. `backend/src/auth/auth.controller.ts`
   - Update `POST /auth/login` to return `authenticated: true` and `sessionExpiresAt`.
   - Change cookie semantics to `sameSite: 'lax'` and document cookie behavior.
   - Add `GET /auth/session` endpoint returning `SessionCheckResponse` or `401` error payload.
   - Keep `POST /auth/logout` protected with `JwtAuthGuard` and return stable logout success shape.

3. `backend/src/auth/auth.service.ts`
   - Compute `sessionExpiresAt` from JWT TTL using the existing `JWT_EXPIRES_IN` value and `ms` package.
   - Keep session caching behavior and `validateSession` semantics.
   - Add explicit comments documenting legacy stored procedure compatibility.

4. `backend/src/main.ts`
   - Harden CORS config for `http://localhost:3000` and `process.env.FRONTEND_URL`.
   - Explicitly set `allowedHeaders` and `credentials: true`.
   - Keep `cookieParser()`.

5. `backend/src/app.controller.ts`
   - Add an example protected route `GET /protected` guarded by `JwtAuthGuard`.
   - Return a simple contract response for test coverage.

6. Tests
   - Add `backend/test/auth.e2e-spec.ts` or `backend/src/auth/auth.controller.spec.ts`.
   - Cover successful login, invalid login, session-check success/failure, protected route, logout success, and logout invalidation.
   - Use `supertest` to verify cookie behavior and response contracts.

### Frontend changes

1. `frontend/src/lib/api.ts`
   - Add `SessionCheckResponse`, `LogoutSuccessResponse`, and `AuthErrorResponse` types.
   - Update `LoginResponse` to exclude token data and include `authenticated: true` and `sessionExpiresAt`.
   - Add `sessionCheck()` helper calling `GET /auth/session` with `credentials: 'include'`.
   - Refine `logout()` to return stable success/failure semantics.
   - Keep `credentials: 'include'` for all auth requests.

2. `frontend/src/actions/auth.ts`
   - Align `loginAction()` to the backend contract and cookie name.
   - Use `cookies().set()` only if the backend returns a cookie header; otherwise rely on the browser response through server action semantics.
   - Add a `sessionCheckAction()` or equivalent server-side helper for session validation.
   - Update `logoutAction()` to call the backend logout endpoint and clear local auth metadata.

3. Frontend test scaffold
   - Add `frontend/vitest.config.ts` or similar minimal test configuration.
   - Add `frontend/src/__tests__/auth-api.test.ts` targeting `frontend/src/lib/api.ts`.
   - Add `frontend/package.json` script `test:unit` and devDependencies for `vitest`, `@testing-library/react`, and `@testing-library/jest-dom` as needed.
   - The first test should validate that `login()` sends correct request payload and interprets a successful backend contract response.

4. Optional UI alignment
   - If needed for route protection, update `frontend/src/app/page.tsx` to call `sessionCheck()` on initial render or server-side so UI does not rely solely on cached local metadata.

### `.atl` and project metadata

1. `.atl/testing-capabilities.md`
   - Record frontend test runner choice and note backend strict TDD capability.
   - Mark auth boundary test coverage as the first increment.

## Size and Review Budget

Estimated scope for first increment
- Backend auth/API contract + controller updates: ~120 lines
- Backend example protected route + tests: ~120 lines
- Frontend API contract + action alignment + test scaffold: ~100 lines
- CORS/cookie documentation and comments: ~40 lines

Estimated total: 220–260 lines changed.

Review budget recommendation
- Single PR is recommended for this increment.
- Reviewers: 1 backend reviewer and 1 frontend reviewer if available; one reviewer with full-stack auth context can also cover both.
- Chained PRs are not required for this scope unless additional auth surface changes are added.

## Recommendations

- Keep this first increment in a single focused PR.
- Separate commits by concern: backend auth contract, frontend auth contract, and test scaffolding.
- Do not add refresh-token behavior in this phase.

## Risks

1. `SameSite` cookie mismatch
   - Current code uses `strict`; cross-origin requests from `http://localhost:3000` may fail. Fixing this is essential.

2. Auth contract mismatch between backend and frontend
   - Current frontend expects `accessToken` in response body. The stabilized contract must return `authenticated` and user metadata only.

3. Legacy stored procedure naming confusion
   - The backend uses `[Acceso].[sp_LogOut]` for both login and logout in the current codebase. This is a legacy compatibility detail, not a new auth contract.

4. Frontend test scaffolding friction
   - The frontend has no current test runner. Choose a minimal compatible runner and keep the first auth test simple.

5. Cache invalidation semantics
   - Session invalidation is currently user-scoped. If the backend is later expected to support concurrent sessions, this must be revisited after the first increment.

## Persisted Design Artifact

- `openspec/changes/auth-boundary-stabilization/design.md`

---

### Next recommended step

`sdd-tasks`

### Next risks

- `SameSite` contract mismatch on local dev
- backend/frontend DTO contract drift
- legacy stored procedure compatibility
- frontend auth test runner choice
