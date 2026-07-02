# Proposal: Login Remember-Me

## Intent

The login page already has a "Recordar credenciales en este dispositivo" checkbox, but no logic reads/writes from localStorage. This results in a dead UI element — checking it has no effect. We need to wire the checkbox so that when checked on successful login, credentials persist and pre-fill on next visit.

## Scope

### In Scope
- Save username (with optional base64-encoded password) to localStorage when checkbox is checked + login succeeds
- Clear saved credentials when checkbox is unchecked or login succeeds with unchecked state
- On page mount (`useEffect`), check localStorage and pre-fill fields + auto-check checkbox when data exists
- Add `rememberCredentials` helper functions in `frontend/src/lib/api.ts`

### Out of Scope
- Authentication protocol changes, JWT, or session management
- Backend changes (pure frontend feature)
- "Remember this device" beyond localStorage (e.g. cookies, biometrics)
- Changing the existing `storeAuth`/`clearAuth` flow

## Capabilities

### New Capabilities
- `login-remember-me`: persist and restore login credentials via localStorage for convenience

### Modified Capabilities
None — pure frontend addition with no spec-level behavior change

## Approach

1. Add `saveRememberedCredentials(data)` / `getRememberedCredentials()` / `clearRememberedCredentials()` to `frontend/src/lib/api.ts`
2. Store shape: `{ username: string, password?: string }` with password base64-encoded (security warning below)
3. In `LoginPage` (`page.tsx`), add `useEffect` on mount to check localStorage and pre-fill + set `rememberMe=true` if saved data exists
4. In `handleLoginSubmit`, after successful login: if `rememberMe` is true, save both fields; else clear saved data
5. When user unchecks the checkbox, immediately clear saved data from localStorage
6. Key name: `sigmun_remembered_credentials`

## Security decisions

| Decision | Why |
|----------|-----|
| Store password (base64) | The label says "credenciales" — UX matches expectation. Base64 is NOT encryption, only obfuscation |
| Username-only alternative | Remove `password` from stored data. Safer but breaks label promise |
| **Recommendation** | Store **username only** unless the user explicitly accepts the XSS risk |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/app/page.tsx` | Modified | Add `useEffect` for pre-fill + wire checkbox to localStorage logic |
| `frontend/src/lib/api.ts` | Modified | Add `saveRememberedCredentials`, `getRememberedCredentials`, `clearRememberedCredentials` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Password stored in localStorage (XSS vector) | Medium | Recommend username-only; document the tradeoff; base64 encoding (not security, just serialization) |
| Stale credentials after password change | Low | User clears checkbox and re-checks; no auto-sync mechanism needed |

## Rollback Plan

- Revert changes to `page.tsx` and `api.ts`
- Delete the `sigmun_remembered_credentials` key from localStorage manually if any user has stale data

## Dependencies

- Existing `storeAuth`/`clearAuth`/`getStoredUser` in `frontend/src/lib/api.ts`
- Target is `frontend` only — no backend changes

## Success Criteria

- [ ] Checking "Recordar credenciales" and logging in saves credentials to localStorage
- [ ] Page reload pre-fills username + password and auto-checks the checkbox when saved data exists
- [ ] Unchecking the checkbox during login clears saved credentials on success
- [ ] `handleClear` also clears remembered credentials if checkbox was unchecked
