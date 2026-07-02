# Tasks: Modelos Module CRUD

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: types, DTOs, service, controller, controller test, module registration | PR 1 | Independent — ships alone, no UI dependency |
| 2 | Frontend: server actions, page, edit modal, component tests | PR 2 | Depends on PR 1 endpoints being live |

## Phase 1: Foundation — Types & DTOs

- [x] 1.1 Create `dto/modelos.types.ts` — `SpModeloRow` (skip index [1]), `ModeloRow`, `ModeloDetalle`, `CatalogoOption`
- [x] 1.2 Create `dto/search-modelo.dto.ts` — Zod schema with `rdEstado`/`criterio`/`page`(default 1)/`pageSize`(default 15)
- [x] 1.3 Create `dto/save-modelo.dto.ts` — Zod schema with `id`(optional)/`nombre`/`id_categoria`/`id_marca`/`estado`

## Phase 2: Backend Core — Service & Controller

- [x] 2.1 Create `modelos.service.ts` — 6 methods: `search` (PHP pagination calc `page>1 ? (page-1)*limit+1 : 0`), `getDetail` (null→404), `getMarcas` (tipo=3), `getCategorias` (tipo=2), `save` (mquery 1/2), `eliminar` (mquery=3)
- [x] 2.2 Create `modelos.controller.ts` — 6 endpoints (`POST search`, `GET :id`, `GET catalogos/marcas`, `GET catalogos/categorias`, `POST save`, `POST eliminar`) guarded by `JwtAuthGuard`
- [x] 2.3 Create `vehiculo.module.ts` — import `AuthModule`, declare controller + service; add `VehiculoModule` to `app.module.ts` imports

## Phase 3: Frontend — Actions & Pages

- [x] 3.1 Create `actions/modelos.ts` — 6 server actions wrapping `authFetch` calls matching design routes
- [x] 3.2 Create `page.tsx` — search form (criterio input + estado select + Buscar), grid (6 columns), pagination controls, 4 visual states (loading/empty/error+retry/populated)
- [x] 3.3 Create `modelo-edit-modal.tsx` — loads marcas/categorias on mount (cached), form validation, create/update/delete modes

## Phase 4: Testing

- [x] 4.1 Write `modelos.controller.spec.ts` — mock `ModelosService`, override `JwtAuthGuard`, test search/detail/catalogs/save/eliminar including null→404
- [x] 4.2 Write `modelos.test.tsx` — mock `@/actions/modelos` with `vi.mock`, test search form render, search trigger, grid 6 column headers, pagination, 4 visual states

### Bonus: Service spec (required by Strict TDD)

- [x] B.1 Write `modelos.service.spec.ts` — mock `DatabaseService`, test all 6 methods with PHP-correct pagination calc
