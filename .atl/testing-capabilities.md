# Testing Capabilities — SIGMUN

**Strict TDD Mode**: enabled
**Detected**: 2026-06-09

## Test Runner

| Package | Runner  | Command                        | Config                   |
| ------- | ------- | ------------------------------ | ------------------------ |
| backend | Jest 30 | `pnpm --filter backend test`   | inline in package.json   |
| frontend| Vitest 1| `pnpm --filter frontend test`  | `frontend/vitest.config.ts` |

## Test Layers

| Layer       | Backend | Frontend |
| ----------- | ------- | -------- |
| Unit        | ✅ Jest (3 specs) | ✅ Vitest + @testing-library/react (1 test) |
| Integration | ✅ @nestjs/testing + supertest | ✅ @testing-library/react |
| E2E         | ✅ Jest + supertest (`test/**/*.e2e-spec.ts`) | ❌ Not configured |

### Backend Details
- **Unit pattern:** `src/**/*.spec.ts` — existing: app.controller, auth.controller, jwt-auth.guard
- **E2E pattern:** `test/**/*.e2e-spec.ts` — existing: app.e2e-spec
- **Framework:** @nestjs/testing for module compilation, supertest for HTTP assertions
- **Nesting:** ts-jest transform, tsconfig-paths for path resolution

### Frontend Details
- **Unit pattern:** `src/**/*.{test,spec}.{ts,tsx}` — existing: actions/auth.test.ts
- **Environment:** jsdom (configured in vitest.config.ts)
- **Setup:** `src/setupTests.ts` — imports @testing-library/jest-dom
- **Libraries:** @testing-library/react v14, @testing-library/user-event v14
- **Coverage:** NOT configured in scripts (no `vitest --coverage`)

## Coverage

| Package  | Available | Command |
| -------- | --------- | ------- |
| backend  | ✅ Yes    | `pnpm --filter backend test:cov` |
| frontend | ❌ No     | — |

## Quality Tools

| Tool         | Backend | Frontend |
| ------------ | ------- | -------- |
| Linter       | ✅ ESLint 9 + typescript-eslint | ✅ ESLint 9 + eslint-config-next |
| Type checker | ✅ TypeScript (strictNullChecks only) | ✅ TypeScript (strict: true) |
| Formatter    | ✅ Prettier | ❌ Not configured |

## Root-Level DevDependencies Note

Root `package.json` lists vitest v4 and @testing-library/react v16 — newer versions than
the frontend package's own deps (vitest v1, @testing-library/react v14). This may indicate
a migration in progress or orphaned dependencies. Frontend package.json takes precedence
for actual test execution due to pnpm workspace resolution.
