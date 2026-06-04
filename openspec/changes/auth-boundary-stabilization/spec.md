# Spec: Auth Boundary Stabilization — First Increment

## Purpose
Stabilize the SIGMUN auth boundary by defining a concrete backend/frontend API contract for login, logout, and session validation, hardening protected backend endpoints, and adding the first auth-focused test coverage increment.

This first increment is intentionally narrow:
- backend contract stability and auth boundary behavior
- backend Jest coverage for auth boundary cases
- frontend test scaffolding and an initial auth client test
- no full auth UI redesign or broad auth migration

## Requirements

### Functional Requirements
1. Backend auth APIs must expose a stable contract for:
   - login request/response
   - logout behavior
   - session validation status
   - protected-route access control
2. The backend must validate authenticated requests using HttpOnly JWT cookie auth plus cache-backed session state.
3. Invalid session or missing/expired cookie cases must return consistent auth failure payloads.
4. The frontend must align `frontend/actions/auth.ts` and `frontend/lib/api.ts` with the backend contract, avoiding client-only metadata assumptions for auth state.
5. Backend auth routes requiring authentication must reject unauthorized access before handler execution.
6. Backend tests must cover:
   - successful login, cookie issuance, and session cache record creation
   - login failure for invalid credentials
   - logout invalidating session state/cache and unsetting auth cookies
   - protected route access allowed for valid sessions and denied for invalid sessions
   - session validation failure for expired or absent cookies
7. Frontend must have test runner scaffolding compatible with Next.js 16 and one initial auth contract test targeting the auth client layer.

## Acceptance Criteria (Gherkin-style)

### Scenario: Successful login issues auth cookie and stable response
Given a valid username/password request to `POST /auth/login`
When the backend authenticates the user
Then the response status is `200`
And the response body contains `userId`, `email`, `authenticated: true`, and `sessionExpiresAt`
And the response sets an HttpOnly `SIGMUN_AUTH` cookie with `SameSite=Lax` and `Secure` when served over HTTPS

### Scenario: Login with invalid credentials returns structured auth error
Given an invalid credential request to `POST /auth/login`
When the backend rejects authentication
Then the response status is `401`
And the response body contains `errorCode: AUTH_INVALID_CREDENTIALS`, `message: "Invalid username or password"`, and `authenticated: false`

### Scenario: Protected backend endpoint rejects missing auth cookie
Given a request to `GET /api/protected` without an auth cookie
When the backend auth guard evaluates the request
Then the response status is `401`
And the response body contains `errorCode: AUTH_SESSION_MISSING` and `message: "Authentication required"`

### Scenario: Protected backend endpoint rejects invalid or expired session
Given a request to `GET /api/protected` with an invalid or expired auth cookie
When the backend validates the session cache
Then the response status is `401`
And the response body contains `errorCode: AUTH_SESSION_INVALID` and `message: "Session invalid or expired"`

### Scenario: Logout invalidates server session and clears auth cookie
Given an authenticated request to `POST /auth/logout`
When logout is processed
Then the backend invalidates the session cache for the current JWT
And the response status is `200`
And the response body contains `success: true`
And the response clears the `SIGMUN_AUTH` cookie

### Scenario: Frontend auth client uses backend session validation for state
Given a frontend auth client request for session state
When the client calls the backend session-check API
Then it must only treat the user as authenticated when the response returns `authenticated: true`
And it must not rely solely on localStorage auth metadata

## Detailed Success Criteria

- Backend auth API contract is explicit and versioned through shared schemas.
- Frontend auth actions use backend session-check results, not stale local metadata.
- Backend route protection is enforceable and covered by unit/integration Jest tests.
- Login/logout/session-check responses use a consistent DTO shape and error payload structure.
- Frontend test scaffolding is committed and an initial auth client test passes.
- Test coverage demonstrates the auth boundary behavior, not just successful happy paths.

## API Contract

### Login
`POST /auth/login`

Request body schema:
```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

Successful response schema:
```ts
interface LoginSuccessResponse {
  authenticated: true;
  userId: string;
  email: string;
  sessionExpiresAt: string; // ISO 8601
  message?: string;
}
```

Failure response schema:
```ts
interface AuthErrorResponse {
  authenticated: false;
  errorCode: string;
  message: string;
}
```

Cookie behavior:
- Set `SIGMUN_AUTH` as HttpOnly, `Path=/`, `SameSite=Lax`, `Secure` when HTTPS is available.
- Cookie must not be accessible from JavaScript.
- Backend may also set `Max-Age` or `Expires` consistent with session TTL.

### Logout
`POST /auth/logout`

Request body: none

Successful response schema:
```ts
interface LogoutSuccessResponse {
  success: true;
  message?: string;
}
```

Failure response schema:
```ts
interface LogoutErrorResponse {
  success: false;
  errorCode: string;
  message: string;
}
```

Expected behavior:
- Invalidate session cache for current JWT/session.
- Clear `SIGMUN_AUTH` cookie with `Set-Cookie: SIGMUN_AUTH=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`.

### Session Check
`GET /auth/session`

Successful response schema:
```ts
interface SessionCheckResponse {
  authenticated: boolean;
  userId?: string;
  email?: string;
  sessionExpiresAt?: string;
  message?: string;
}
```

Failure response schema:
- If not authenticated: `401` with `AuthErrorResponse`.
- If authenticated: `200` with `authenticated: true`.

Expected semantics:
- `authenticated: true` is the only valid signal for authenticated state.
- Frontend must treat any `authenticated: false` or `401` as unauthenticated.

### Protected Endpoint Response Contract
`GET /api/protected` (example protected route)

Successful response schema:
```ts
interface ProtectedDataResponse {
  authenticated: true;
  data: unknown;
}
```

Failure response schema:
```ts
interface ProtectedErrorResponse {
  errorCode: string;
  message: string;
}
```

## Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| AUTH_INVALID_CREDENTIALS | Invalid username/password during login | 401 |
| AUTH_SESSION_MISSING | No auth cookie present | 401 |
| AUTH_SESSION_INVALID | Auth cookie present but session invalid/expired | 401 |
| AUTH_LOGOUT_FAILED | Logout attempt failed due to server/session error | 500 |
| AUTH_CONTRACT_MISMATCH | Shared auth contract mismatch detected in request/response parsing | 400 |

## API Request/Response Schema Examples

#### Login request
```json
{
  "email": "user@example.com",
  "password": "correct-horse-battery-staple"
}
```

#### Login success response
```json
{
  "authenticated": true,
  "userId": "12345",
  "email": "user@example.com",
  "sessionExpiresAt": "2026-06-04T18:30:00.000Z"
}
```

#### Session check success response
```json
{
  "authenticated": true,
  "userId": "12345",
  "email": "user@example.com",
  "sessionExpiresAt": "2026-06-04T18:30:00.000Z"
}
```

#### Session check unauthenticated response
```json
{
  "authenticated": false,
  "errorCode": "AUTH_SESSION_MISSING",
  "message": "Authentication required"
}
```

#### Logout success response
```json
{
  "success": true,
  "message": "Logged out"
}
```

## Minimal Test Matrix

### Backend

| Area | Test Case | Expected Result |
|------|-----------|-----------------|
| Login success | valid credentials to `POST /auth/login` | `200`, cookie set, response body authenticated=true |
| Login failure | invalid credentials | `401`, `AUTH_INVALID_CREDENTIALS` |
| Session check valid | valid auth cookie to `GET /auth/session` | `200`, `authenticated: true` |
| Session check missing cookie | no auth cookie | `401`, `AUTH_SESSION_MISSING` |
| Session check invalid | expired/invalid cookie | `401`, `AUTH_SESSION_INVALID` |
| Protected route valid | valid session to protected endpoint | `200`, allowed |
| Protected route invalid | invalid session to protected endpoint | `401`, denied |
| Logout success | valid session to `POST /auth/logout` | `200`, session invalidated, cookie cleared |
| Logout with invalid session | invalid/expired session | either `200` with cleared cookie or `401` with `AUTH_SESSION_INVALID` depending on contract consistency |

### Frontend

| Area | Test Case | Expected Result |
|------|-----------|-----------------|
| Auth client login | call auth login wrapper with valid request | sends correct payload, accepts backend contract, no localStorage auth-only fallback |
| Auth client session check | call session validation wrapper | interprets `authenticated: true` as auth and `401`/`false` as unauthenticated |
| Auth client logout | call logout wrapper | requests `POST /auth/logout` and handles success response |
| Test scaffolding | run initial frontend test file | test runner starts, one auth client test passes |

## Non-functional Requirements

### Security
- All auth cookies must be HttpOnly.
- Backend must set `SameSite=Lax` for auth cookies.
- Cookies should be `Secure` when HTTPS is enabled.
- Backend must never expose raw JWT data in response bodies.
- Frontend must not store auth cookies in localStorage or sessionStorage.
- Auth contract validation failures must use standardized error payloads and not leak internal server state.

### Cookie Flags
- `HttpOnly`: true
- `Path`: `/`
- `SameSite`: `Lax`
- `Secure`: true when HTTPS is available; for local development over HTTP, document the exception.
- `Max-Age` or `Expires`: aligned with session TTL.

### CORS
- Auth APIs must accept requests from the frontend origin if the frontend app is served separately (document actual allowed origin if known).
- `Access-Control-Allow-Credentials: true` must be enabled for cross-origin auth requests using cookies.
- The backend must not permit wildcard CORS with credentials.

### Performance
- Session validation must be efficient and cache-backed.
- Invalid session checks must fail fast and avoid excessive database or cache lookups.
- Login and logout flows should remain within acceptable backend API latency for auth requests (target sub-200ms in local/dev conditions).

### Test and Development
- Backend Jest runner is the authoritative auth test harness.
- Frontend test scaffolding must be low-friction and not require a full application build to run the initial auth test.
- The first increment must preserve developer flow and avoid introducing broad dependencies beyond Next.js-compatible test tooling.

## Scope Boundaries for This Increment

Included:
- auth contract alignment for login/logout/session-check
- backend auth route protection and cache-backed session validation
- backend Jest coverage for core auth boundary cases
- frontend test scaffolding and initial auth client test
- contract documentation and error code definition

Excluded:
- full frontend auth UI work beyond route-protection stabilization
- full auth state migration or new identity provider integration
- broad end-to-end browser automation tests
- complete frontend authentication test coverage beyond the initial auth client contract test

## Notes for `sdd-design`

- Keep design focused on shared DTOs, auth guard placement, and frontend auth client contract enforcement.
- The backend should expose a small, stable auth contract surface; design should avoid speculative next-phase auth features.
- The frontend test scaffolding selection should be documented in `.atl/testing-capabilities.md` and tied to the initial auth client test.
