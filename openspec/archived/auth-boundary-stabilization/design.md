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
  message?: string;
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
- `authenticated: true` is the only valid signal for an authenticated state.
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
```