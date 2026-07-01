# Tasks: Predios por Uso — Submenú en Reportes Gerenciales

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~780 (8 new files, 1 modified, 2 test files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend ~170) → PR 2 (Frontend Action + Page ~350) → PR 3 (Tests ~260) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend Foundation — DTOs, Service, Controller, Module | PR 1 → main | ~170 lines, self-contained API |
| 2 | Frontend — Action + page.tsx | PR 2 → main | ~350 lines, clean — no modal or cascading selects |
| 3 | Tests — Backend service + Frontend component | PR 3 → main | ~260 lines, depends on both PR 1 & 2 |

## Phase 1: Backend Foundation

- [x] 1.1 Create `backend/src/reportes-gerenciales/predios-por-uso/dto/predios-uso.types.ts` — `SpPredioUsoRow`, `PredioUsoRow`, `PaginatedResponse<T>`
- [x] 1.2 Create `backend/src/reportes-gerenciales/predios-por-uso/dto/search-predio-uso.dto.ts` — Zod schema with optional `codigo`, `anno`, `uso` + required `page`/`pageSize`
- [x] 1.3 Create `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.service.ts` — `search()` executes `[Rentas].[Rpt_Rentas_General] @BUSC=1`, maps SP columns to domain rows, applies in-memory pagination (SP does not support @inicio/@final), includes pure `calculatePaginationParams` helper
- [x] 1.4 Create `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.controller.ts` — `POST /search` with `@UseGuards(JwtAuthGuard)` + Zod parse via `SearchPredioUsoSchema.parse()`
- [x] 1.5 Create `backend/src/reportes-gerenciales/reportes-gerenciales.module.ts` — register `PrediosUsoController` + `PrediosUsoService`, import `AuthModule`
- [x] 1.6 Modify `backend/src/app.module.ts` — import `ReportesModule`

## Phase 2: Frontend Server Action

- [x] 2.1 Create `frontend/src/actions/reportes-gerenciales/predios-uso.ts` — `searchPrediosUsoAction(filters, page, pageSize)` with `authFetch` pattern, POST `/reportes-gerenciales/predios-uso/search`, returns `{ success, data, total, page, pageSize, totalPages }` or `{ success: false, error }`

## Phase 3: Frontend Page

- [x] 3.1 Create `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/page.tsx` — monolithic `"use client"` page with:
  - 3 filters: **Código** (text input), **Año** (select dropdown, 2016..2026 programmatically generated, default current year), **Uso** (text input)
  - Search triggers on Enter key and via Buscar button
  - Table with 7 columns: Tipo, Uso, Predios, Condición, Count, Año, Id Uso
  - **4 states**: loading (skeleton), empty ("No se encontraron resultados" with icon), error (message + "Reintentar" button), populated (data rows)
  - Pagination bar with "Mostrando X–Y de Z resultados", Previous/Next (disabled at boundaries), numbered page buttons
  - Results count bar ("Se encontraron N resultados")
  - **No action buttons** per row (read-only report), **no modal**
  - Page header with gradient banner and title "Predios por Uso"

## Phase 4: Testing

- [x] 4.1 Write `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.service.spec.ts` — mock `DatabaseService`, test:
  - SP params mapping (@BUSC=1, @CODIGO, @anno, @uso)
  - Null/undefined filters passed as default values
  - SP column mapping to `PredioUsoRow`
  - In-memory pagination (pages 1, 2, last page slicing)
  - Empty results returns `{ data: [], total: 0, totalPages: 0 }`
- [x] 4.2 Write `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/predios-uso.test.tsx` — mock server action, test:
  - 3 filter fields render (2 text + 1 select)
  - Año select populated with 2016..2026 range on mount
  - Search button + Enter key trigger API call
  - Table renders 7 column headers with data
  - Pagination controls: Previous disabled on page 1, Next disabled on last page, page click fires search
  - Loading skeleton displays during search
  - Empty state shows "No se encontraron resultados"
  - Error state shows message + "Reintentar" button, retry re-executes search
