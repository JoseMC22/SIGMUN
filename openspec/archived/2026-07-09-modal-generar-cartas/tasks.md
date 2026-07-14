# Tasks: Modal Generar Cartas

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–750 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always (C1) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All backend + frontend changes | Single PR | ~700 lines total, well within 800 budget |

## Phase 1: Backend Types & DTOs

- [x] 1.1 Add `SpContribuyenteRow`, `ContribuyenteInfo`, `SpCartaRequerimientoRow`, `CartaRequerimientoItem` interfaces to `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.types.ts`
- [x] 1.2 Add `GetContribuyenteSchema` (z.string) and `SearchCartasSchema` (codigo + page + pageSize) DTOs to `backend/src/fiscalizacion-tributaria/cartas-requerimiento/dto/search-cartas-requerimiento.dto.ts`

## Phase 2: Backend Service (TDD)

- [x] 2.1 RED: Write failing tests for `getContribuyente()` and `searchCartas()` in `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.service.spec.ts` — mock `DatabaseService`, verify SP params (mquery=12/4/5) and response mapping
- [x] 2.2 GREEN: Implement `getContribuyente(codigo)` → calls SP mquery=12, maps `nombres+paterno+materno` → `nombreCompleto`, returns null on empty; implement `searchCartas(codigo, page, pageSize)` → calls SP mquery=5 (total) + mquery=4 (data), returns `PaginatedResponse<CartaRequerimientoItem>` — add to `cartas-requerimiento.service.ts`
- [x] 2.3 REFACTOR: Verify tests pass, extract shared pagination helper reuse if needed

## Phase 3: Backend Controller (TDD)

- [x] 3.1 RED: Write failing tests for `POST contribuyente` and `POST cartas` endpoints in `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.controller.spec.ts` — verify Zod validation (400 on missing codigo), JwtAuthGuard (401 without token)
- [x] 3.2 GREEN: Add `@Post('contribuyente')` and `@Post('cartas')` endpoints to `cartas-requerimiento.controller.ts` — parse DTOs with Zod, delegate to service methods, add new imports
- [x] 3.3 REFACTOR: Verify all backend tests pass with `pnpm --filter backend test`

## Phase 4: Frontend Server Actions

- [x] 4.1 Add `getContribuyenteAction(codigo)` and `searchCartasAction(codigo, page, pageSize)` to `frontend/src/actions/fiscalizacion-tributaria/cartas-requerimiento.ts` — follow existing `authFetch` pattern with try/catch, return `{ success, data/error }` envelope

## Phase 5: Frontend Modal Component (TDD)

- [x] 5.1 RED: Write failing tests for `ModalGenerar` in `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/modal-generar.test.tsx` — mock server actions, verify: renders when `open=true`, calls `getContribuyenteAction` and `searchCartasAction` on mount, shows loading skeletons, renders contributor name + code, renders cartas table with columns, handles pagination page change, closes on × click and Escape key, shows "Editar" stub alert, shows empty state message
- [x] 5.2 GREEN: Create `modal-generar.tsx` — `"use client"` component with props `{ open, onClose, codigo }`, state: contribuyente/cartas/page/totalPages/loading/error, two `useEffect` hooks (open→fetch contributor+cartas, page→re-fetch cartas), overlay+panel layout (z-50, backdrop-blur, max-w-3xl), header with title + close button, contributor GroupField (read-only bg-slate-50), cartas table (gradient header, alternating rows, "Editar" stub button), pagination bar, loading skeletons, empty state with UserX icon, Escape key handler via `useEffect` + keydown listener
- [x] 5.3 REFACTOR: Verify modal tests pass with `pnpm --filter frontend test`

## Phase 6: Page Integration

- [x] 6.1 Modify `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/page.tsx`: add `modalOpen`/`selectedCodigo` state, replace `handleGenerar` body (set selectedCodigo + modalOpen instead of alert), render `<ModalGenerar open={modalOpen} onClose={...} codigo={selectedCodigo} />` at end of JSX, add import for ModalGenerar
