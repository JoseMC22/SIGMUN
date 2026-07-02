# Tasks: Implementar valores vehicular

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend DTOs + Service + Tests) → PR 2 (Backend Controller + Tests + Wiring) → PR 3 (Frontend Actions + Page) → PR 4 (Modal + Tests) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: DTOs + Service + Service tests + Module update | PR 1 | Base: `feat/valores-vehicular`; 6 SPs, 8 service methods |
| 2 | Backend: Controller + Controller tests + AppModule wiring | PR 2 | Base: PR 1 branch; depends on PR 1 |
| 3 | Frontend: Server actions + List page (search, grid, pagination, 4 states) | PR 3 | Base: PR 2 branch; depends on PR 2 |
| 4 | Frontend: Edit modal (cascading combos) + Vitest tests | PR 4 | Base: PR 3 branch; depends on PR 3 |

## Phase 1: Backend Foundation

- [x] 1.1 Create DTOs: `valores.types.ts` (ValorRow, ValorDetalle, CatalogoOption, PaginatedResponse), `search-valor.dto.ts` (4 criteria + pagination Zod), `save-valor.dto.ts` (create/update fields + Zod)
- [x] 1.2 Create `valores.service.ts` — 6 SPs (contar, listar, buscar, grabar, validar, modelo_filtro), PHP pagination (`page>1 ? (page-1)*pageSize+1 : 0`), column mapping, 8 methods
- [x] 1.3 Create `valores.service.spec.ts` — mock DatabaseService, test contar→listar SP sequence, pagination boundaries (page=1→inicio=0, page=3→inicio=31), detail null, 4 catalog endpoints, create@mquery=1 vs update@mquery=2, logical delete@mquery=3
- [x] 1.4 Create `valores.controller.ts` — 8 endpoints: `POST search`, `GET :id`, `GET catalogo/categorias`, `GET catalogo/marcas`, `POST catalogo/modelos`, `GET catalogo/anios-ejercicio`, `GET catalogo/anios`, `POST save`, `POST eliminar`; static routes before `:id`
- [x] 1.5 Create `valores.controller.spec.ts` — mock service, override JwtAuthGuard, test all 8 endpoints + Zod defaults on empty body + error envelope for 404
- [x] 1.6 Update `impuesto-vehicular.module.ts` (ValoresController + ValoresService) and `app.module.ts` (register ImpuestoVehicularModule)

## Phase 2: Frontend Actions

- [ ] 2.1 Create `frontend/src/actions/valores.ts` — 6 server actions (search, detail, save, delete, fetchCatalogs) with authFetch pattern, error handling, ConnectionError catch

## Phase 3: Frontend UI

- [ ] 3.1 Create `valor-edit-modal.tsx` — cascading combos (categoría→marca→modelo via POST), 4 parallel catalog fetches on open, Zod validation, create vs edit mode, save error display
- [ ] 3.2 Create `page.tsx` — radio search (Todos/Código/Marca/Modelo) + 4 text criteria filters, 9-column grid (Año Ejercicio, Categoría, Marca, Modelo, Año Veh., Monto, Estado, Acciones), pagination, 4 states (loading skeleton, empty, error+retry, populated), delete confirmation dialog
- [ ] 3.3 Create `valores.test.tsx` — vitest: search form rendering, Buscar/Limpiar buttons, grid 9 columns, pagination boundaries (prev disabled on page 1, next disabled on last page), 4 visual states, edit/delete action buttons

## SP Reference

| Method | SP | Params |
|--------|----|--------|
| count | `sp_vehiculo_valores_contar` | @criterio1..@criterio4 |
| search | `sp_vehiculo_valores_listar` | @criterio1..@criterio4, @inicio, @fin |
| detail | `sp_vehiculo_valores_buscar` | @tipo=1 |
| categorias | `sp_vehiculo_valores_buscar` | @tipo=2 |
| marcas | `sp_vehiculo_valores_buscar` | @tipo=3 |
| modelos | `sp_vehiculo_valores_buscar` | @tipo=4 |
| anios-ejercicio | `sp_vehiculo_valores_buscar` | @tipo=5 |
| anios | `sp_vehiculo_valores_buscar` | @tipo=6 |
| save-insert | `sp_vehiculo_valores_grabar` | @mquery=1 |
| save-update | `sp_vehiculo_valores_grabar` | @mquery=2 |
| delete | `sp_vehiculo_valores_grabar` | @mquery=3 |
