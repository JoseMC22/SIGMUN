# Tasks: Mantenimiento de Vías

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: DB+Backend (~250) → PR 2: Action+Test (~90) → PR 3: Page+Modals (~250) → PR 4: PageTests+Menu (~150) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB SP + Backend module + tests + App registration | PR 1 | ~250 lines, standalone |
| 2 | Frontend action + action test | PR 2 | Depends on PR 1 API; ~90 lines |
| 3 | Frontend page + modals | PR 3 | Depends on PR 2 action; ~310 lines |
| 4 | Page component tests + DB menu row | PR 4 | Depends on PR 3; ~150 lines |

## Phase 1: DB + Backend

- [x] 1.1 Create SP `[dbo].[sp_MantenimientoVias_ListarUsuarios]` with `@codigo`, `@zona`, `@estado`, `@inicio`, `@final`
- [x] 1.2 Create `backend/src/mantenimiento-vias/dto/search-mantenimiento-vias.dto.ts` (Zod schema)
- [x] 1.3 Create `backend/src/mantenimiento-vias/dto/mantenimiento-vias.types.ts` (row types + PaginatedResponse)
- [x] 1.4 Create service with `search()` — calls SP, maps `VUsuarioRow`, pagination math
- [x] 1.5 Create controller `POST /api/mantenimiento-vias/search` — Zod pipe + `@UseGuards(JwtAuthGuard)`
- [x] 1.6 Create `mantenimiento-vias.module.ts` importing `AuthModule`
- [x] 1.7 Register `MantenimientoViasModule` in `app.module.ts`
- [x] 1.8 Write backend tests (TDD: spec RED first, then implement) — service SP params + mapping, controller Zod validation + response shape

## Phase 2: Frontend Actions

- [x] 2.1 Create `frontend/src/actions/mantenimiento-vias.ts` — `searchViasAction()` using `authFetch()`
- [x] 2.2 Write `mantenimiento-vias.test.ts` — mock fetch + cookies, test success/error envelopes

## Phase 3: Frontend Page

- [x] 3.1 Create `page.tsx` — "use client", GroupField filter (código, zona, estado), Enter triggers search
- [x] 3.2 Add paginated table with vlogin column + loading/empty/error states + "Mostrando X-Y de Z" pagination
- [x] 3.3 Create `detalle-urbanizacion-modal.tsx` — shadcn Dialog scaffold with close/X/Escape
- [x] 3.4 Create `detalle-via-modal.tsx` — shadcn Dialog scaffold with close/X/Escape

## Phase 4: Frontend Tests + Wiring

- [x] 4.1 Write component tests: filter renders 3 fields, Enter triggers search
- [x] 4.2 Write component tests: table renders vlogin data, pagination controls handle clicks
- [x] 4.3 Write component tests: loading/empty/error states render correctly
- [x] 4.4 Write component tests: both modals open via button, close via X/Escape
- [x] 4.5 Add DB submenu row linked to "Administración Tributaria" module
