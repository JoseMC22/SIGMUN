# Testing Capabilities — SIGMUN

**Strict TDD Mode**: enabled
**Detected**: 2026-06-24

## Test Runners

| Package | Runner | Command | Config |
| ------- | ------ | ------- | ------ |
| backend | Jest 30 | `pnpm --filter backend test` | inline in `backend/package.json` |
| frontend | Vitest 1.x | `pnpm --filter frontend test` | `frontend/vitest.config.ts` |

## Test Layers

| Layer | Backend | Frontend |
| ----- | ------- | -------- |
| Unit | ✅ Jest — 9 spec files | ✅ Vitest + @testing-library/react — 6 test files |
| Integration | ✅ @nestjs/testing + supertest | ✅ @testing-library/react |
| E2E | ✅ Jest + supertest (`test/jest-e2e.json`) | ❌ Not configured |

### Backend Details
- **Unit pattern:** `src/**/*.spec.ts` — existing: app.controller, auth (controller + guard), mantenimiento-vias (controller + service), usuarios (controller + service), perfiles (controller + service)
- **E2E pattern:** `test/**/*.e2e-spec.ts` — existing: app.e2e-spec
- **Framework:** @nestjs/testing v11 for module compilation, supertest v7 for HTTP assertions
- **Transform:** ts-jest v29, tsconfig-paths for path resolution
- **Coverage:** Available via `pnpm --filter backend test:cov` (jest --coverage)
- **Coverage source:** `src/**/*.(t|j)s`
- **Output directory:** `coverage/`

### Frontend Details
- **Unit pattern:** `src/**/*.{test,spec}.{ts,tsx}` — existing: actions (auth, usuarios, mantenimiento-vias) + pages (usuarios, mantenimiento-vias, perfiles)
- **Environment:** jsdom (configured in vitest.config.ts)
- **Setup:** `src/setupTests.ts` — imports @testing-library/jest-dom
- **Libraries:** @testing-library/react v14, @testing-library/user-event v14
- **Coverage:** NOT configured (no `--coverage` flag in scripts)
- **Notable:** Root `package.json` has vitest v4 + @testing-library/react v16 (newer than frontend's own deps — migration in progress or orphaned). Frontend package takes precedence.

## Coverage

| Package | Available | Command |
| ------- | --------- | ------- |
| backend | ✅ Yes | `pnpm --filter backend test:cov` |
| frontend | ❌ No | — |

## Quality Tools

| Tool | Backend | Frontend |
| ---- | ------- | -------- |
| Linter | ✅ ESLint 9 + typescript-eslint (recommendedTypeChecked) | ✅ ESLint 9 + eslint-config-next |
| Type checker | ✅ TypeScript 5.7 (strictNullChecks only) | ✅ TypeScript 5.x (strict: true) |
| Formatter | ✅ Prettier (`.prettierrc`: singleQuote, trailingComma all) | ❌ Not configured |

## Root-Level DevDependencies Note

Root `package.json` lists vitest ^4.1.8 and @testing-library/react ^16.3.2 — newer versions than
frontend's own deps (vitest ^1.0.0, @testing-library/react ^14.0.0). This may indicate a migration
in progress or orphaned dependencies. Frontend `package.json` takes precedence for actual test
execution due to pnpm workspace resolution.
