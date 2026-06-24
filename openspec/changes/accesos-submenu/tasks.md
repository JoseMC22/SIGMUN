# Tasks: Nuevo submenú "Accesos" en Seguridad

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~775 (8 new files, 1 modified, 2 test files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend ~160) → PR 2 (Frontend Actions+Modal+Page ~465) → PR 3 (Tests ~150) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend Foundation — DTOs, Service, Controller, Module | PR 1 → main | ~160 lines, self-contained API |
| 2 | Frontend — Actions, Edit Modal, page.tsx | PR 2 → main | ~465 lines, over budget — may need further split into Page vs infrastructure |
| 3 | Tests — Backend service + Frontend component | PR 3 → main | ~150 lines, depends on both PR 1 & 2 |

## Phase 1: Backend Foundation

- [x] 1.1 Create `backend/src/seguridad/accesos/dto/accesos.types.ts` — AccesoRow, MenuOption, ModuloOption, PaginatedResponse<T>, SpAccesoTotal
- [x] 1.2 Create `backend/src/seguridad/accesos/dto/search-acceso.dto.ts` — Zod schema with optional id_acceso, nombre, orden, menu, pantalla + required page/pageSize
- [x] 1.3 Create `backend/src/seguridad/accesos/dto/save-acceso.dto.ts` — empty skeleton with placeholder schema
- [x] 1.4 Create `backend/src/seguridad/accesos/accesos.service.ts` — search() (busc=5/6), getMenus() (busc=8), getModulos(menuId) (busc=9), calculatePaginationParams helper
- [x] 1.5 Create `backend/src/seguridad/accesos/accesos.controller.ts` — POST /search, GET /menus, GET /modulos?menuId= with JwtAuthGuard + Zod parse
- [x] 1.6 Register `AccesosController` + `AccesosService` in `backend/src/seguridad/seguridad.module.ts`

## Phase 2: Frontend Server Actions

- [x] 2.1 Create `frontend/src/actions/accesos.ts` — searchAccesosAction (POST /search), fetchMenusAction (GET /menus), fetchModulosAction (GET /modulos?menuId=) with authFetch pattern

## Phase 3: Frontend Page

- [x] 3.1 Create `frontend/src/app/dashboard/seguridad/accesos/page.tsx` — 5 filters (Acceso text, Nombre text, Menú select, Módulo select cascading with AbortController, Tipo select M/O), 7-column grid (id_acceso, Tipo badge, nombre, id_objeto, icono, doform, Estado badge green/red), pagination with page numbers + "Mostrando X-Y de Z", loading skeleton, empty state "No se encontraron accesos", error state + "Reintentar", Edit (Pencil) / Delete (Trash2) placeholder buttons
- [x] 3.2 Create `frontend/src/app/dashboard/seguridad/accesos/acceso-edit-modal.tsx` — shell with isOpen/onClose/onSaved props, title, close button, empty body

## Phase 4: Testing

- [x] 4.1 Write `backend/src/seguridad/accesos/accesos.service.spec.ts` — mock DatabaseService, test search param mapping (busc=5/6), pagination math (pages 1, 2, last), getMenus (busc=8), getModulos (busc=9 with menuId)
- [x] 4.2 Write `frontend/src/app/dashboard/seguridad/accesos/accesos.test.tsx` — 5 fields render, Menú→Módulo cascading select, 7-column grid with Estado badge (green for nestado=1, red otherwise), loading/empty/error states, pagination controls
