# SDD Init Context — SIGMUN

Generated: 2026-06-24
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
- **Project skill:** `openspec/standards/SKILL.md` — enforcement priorities: SDD mandatory > Security > API Contract > Typing/Lint > Validation > Testing > UI/UX > Observability
- **Code:** English; **Docs/Comments:** Spanish; **UI strings:** Spanish
- **i18n:** Dot-notation keys (e.g. `login.button.submit`)
- **Secrets:** External vault; never commit .env
- **DB:** Parametrized queries only, no string concatenation

## Quality Tooling
- **Linter:** ESLint 9 (flat config) — backend: typescript-eslint recommendedTypeChecked; frontend: eslint-config-next
- **Type checker:** TypeScript (tsconfig per package)
- **Formatter:** Prettier (backend only)

## Strict TDD
- **Status:** enabled (test runner detected; no marker override)
- **Backend:** 9 unit spec files + 1 E2E spec
- **Frontend:** 6 vitest test files
- **Coverage target (per sigmun-standard):** >=80% on critical modules (auth/, repositories/)

## Existing SDD State
- `openspec/` exists with config.yaml, standards (6), specs (2), changes (archive + active), reports
- `openspec/config.yaml` — up to date (hybrid mode, strict_tdd: true, accurate stack/testing info)
- `openspec/standards/` — 6 files: API, ARCHITECTURE, CODING, SKILL, TESTING, UI-UX
- `openspec/specs/` — 2 active: mantenimiento-vias/, seguridad-usuario/
- `openspec/changes/` — 1 active: auth-boundary-stabilization (all phases), 1 archived: mantenimiento-vias
- `openspec/reports/` — 1 report: seguridad-usuario
- `.atl/` — existing with skill-registry, testing-capabilities, sdd-init-context
- Previous init from different user (jmozo.SATICA) — rebuilt for current user (Mvaez)

## Known Issues
- Root devDependencies have newer versions of vitest/react-testing-library vs frontend package — potential drift
- Frontend has no coverage command configured
- Frontend has no Prettier configuration
