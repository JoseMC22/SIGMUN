# SDD Init Context — SIGMUN

Generated: 2026-06-09
Persistence mode: hybrid (OpenSpec + Engram)

## Project

SIGMUN (Sistema Integral de Gestión Municipal — SAT ICA)
Monorepo with backend/ and frontend/ packages via pnpm workspaces.

## Stack

### Backend (`backend/`)
- **Framework:** NestJS 11 (CommonJS, express platform)
- **Language:** TypeScript 5.7
- **Database:** SQL Server via mssql driver v12 (no ORM, stored procedures)
- **Auth:** passport-jwt with HttpOnly cookies, @nestjs/jwt
- **Validation:** zod
- **Caching:** cache-manager + redis (cache-manager-redis-yet)
- **API prefix:** `/api`
- **Build:** NestJS CLI, ts-jest, ts-loader

### Frontend (`frontend/`)
- **Framework:** Next.js 16 App Router, React 19
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS v4 + PostCSS
- **UI:** lucide-react, framer-motion, clsx, tailwind-merge
- **Architecture:** Clean Architecture (domain/, application/, infrastructure/, presentation/)

## Conventions
- **Project skill:** `.trae/skills/sigmun-standard/SKILL.md` — enforcement priorities: Security > API Contract > Typing/Lint > Validation > Testing > Observability > UX
- **Code:** English; **Docs/Comments:** Spanish; **UI strings:** Spanish
- **i18n:** Dot-notation keys (e.g. `login.button.submit`), locale files in `/src/i18n`
- **Secrets:** External vault (Azure Key Vault / HashiCorp Vault); never commit .env
- **DB:** Parametrized queries only, no string concatenation

## Quality Tooling
- **Linter:** ESLint 9 (flat config) — backend: typescript-eslint recommendedTypeChecked; frontend: eslint-config-next
- **Type checker:** TypeScript (tsconfig in each package)
- **Formatter:** Prettier (backend only, configured in backend/.prettierrc)

## Strict TDD
- **Status:** enabled (test runner detected; no marker override)
- **Backend:** 3 unit spec files + 1 E2E spec
- **Frontend:** 1 vitest test file
- **Coverage target (per sigmun-standard):** >=80% on critical modules (auth/, repositories/)

## Existing SDD State
- `openspec/` exists with `changes/auth-boundary-stabilization/` (completed + archived)
- `openspec/config.yaml` created by this init (was missing)
- `openspec/specs/` created by this init (was missing)
