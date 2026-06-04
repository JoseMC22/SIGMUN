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

## Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| AUTH_INVALID_CREDENTIALS | Invalid username/password during login | 401 |
| AUTH_SESSION_MISSING | No auth cookie present | 401 |
| AUTH_SESSION_INVALID | Auth cookie present but session invalid/expired | 401 |
| AUTH_LOGOUT_FAILED | Logout attempt failed due to server/session error | 500 |
| AUTH_CONTRACT_MISMATCH | Shared auth contract mismatch detected in request/response parsing | 400 |
