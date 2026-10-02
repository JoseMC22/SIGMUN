# Design: Implementar valores vehicular

## Technical Approach

Standalone sub-module inside `ImpuestoVehicularModule`, mirroring the `modelos` sub-module pattern exactly. Backend: NestJS controller + service + Zod DTOs, invoking 6 stored procedures via `DatabaseService.executeProcedure()`. Frontend: Next.js server actions with `authFetch`, client-component list page with 4 visual states (loading/empty/error+retry/populated), and edit modal with cascading combos (categoría → marca → modelo).

No framework beyond NestJS/Next.js core — no ORM, no state management library, no new dependencies.

## Architecture Decisions

### Decision: Replicate modelos module structure without sharing code

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extract shared controller/service base class | Premature abstraction; modelos is the first reference, not a proven pattern | Reject |
| Replicate DTOs, controller, service per existing pattern | Slight duplication but clear standalone module | **Accept** |
| Share types via a common `impuesto-vehicular/shared/` | Creates coupling between sub-modules that don't share behavior | Reject |

**Rationale**: valores and modelos are conceptually separate (tariffs vs vehicle models). They share the same architectural pattern but no business logic. Copying the structure with different SP names and field mappings is intentional — keeps each sub-module independently testable and deployable.

### Decision: Two SP calls per search (contar + listar) with PHP-correct pagination

**Choice**: Same `contar`→`listar` two-call pattern as modelos, with `inicio = page > 1 ? (page-1)*pageSize+1 : 0` formula.
**Alternatives**: Single SP returning total+rows (would require SP change). Window functions with `COUNT(*) OVER()` (SPs are legacy, cannot modify).
**Rationale**: SPs are fixed — we match the exact legacy PHP behavior. The pagination formula differs from the `usuarios` modules, which use offset-based pagination. This is deliberate: `sp_vehiculo_valores_listar` uses a `ROW_NUMBER()` + `BETWEEN` approach.

### Decision: 7 search criteria filters with SP @criterio1..@criterio4

**Choice**: Map `categoria`, `marca`, `modelo`, `anio` to SP parameters `@criterio1..@criterio4` with `LIKE '%value%'` inside the SP. Use `@criterio${i}` for the 4 filters instead of the modelos pattern of `@tipo` + `@criterio`.
**Rationale**: The PHP legacy passes each category as a separate criterion to allow multi-field filtering. The list SP (`sp_vehiculo_valores_listar`) uses `LIKE` on each criterion internally. The controller search route expects all 4 filters plus pagination params.

### Decision: Catalog endpoints use existing SP with @tipo parameter

**Choice**: Reuse `sp_vehiculo_valores_buscar @tipo=2..6` for catalog fetches (categorías, marcas, modelos, anios-ejercicio, anios), same pattern as modelos' `sp_vehiculo_modelo_buscar @tipo=2..4`.
**Rationale**: The SP already returns structured catalog data. Models is special (POST with `id_categoria`+`id_marca` filters) — uses a dedicated service-only route for cascading combo support.

## Architecture Diagram

```
Navegador (Next.js)
  │ Server Actions (authFetch)
  ▼
API Gateway (NestJS) — @UseGuards(JwtAuthGuard)
  │
  ▼
ValoresController (8 endpoints)
  │
  ▼
ValoresService (SP invocation, PHP-correct pagination, column mapping)
  │
  ▼
DatabaseService.executeProcedure()
  │
  ▼
SQL Server: sp_vehiculo_valores_{contar,listar,buscar,grabar}
```

## Data Flow

```
search:       POST /search → contar(filters) → listar(filters+inicio+fin) → PaginatedResponse<ValorRow>
detail:       GET  /:id    → buscar(tipo=1)  → ValorDetalle | null
catalogos:    GET  /catalogo/{tipo} → buscar(tipo=2..6) → CatalogoOption[]
modelos-filt: POST /catalogos/modelos → buscar(tipo=4) → CatalogoOption[]
save:         POST /save   → grabar(mquery=1/2) → {success, message}
eliminar:     POST /eliminar → grabar(mquery=3) → {success, message}
```

Cascading combo flow on modal:
1. Open → GET categorias, marcas, anios-ejercicio, anios (parallel)
2. Categoría+Marca selected → POST modelos con `id_categoria`+`id_marca`
3. Edit → GET /:id → then load modelos for saved categoria+marca
4. Change categoria/marca → clear modelo, refetch

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/impuesto-vehicular/valores/dto/valores.types.ts` | Create | ValorRow, ValorDetalle, CatalogoOption, PaginatedResponse |
| `backend/src/impuesto-vehicular/valores/dto/search-valor.dto.ts` | Create | Zod schema with 4 criteria filters + pagination defaults |
| `backend/src/impuesto-vehicular/valores/dto/save-valor.dto.ts` | Create | Zod schema with xidmod/xid_modelo dual fields |
| `backend/src/impuesto-vehicular/valores/valores.service.ts` | Create | SP invocation, PHP-correct pagination, column mapping |
| `backend/src/impuesto-vehicular/valores/valores.controller.ts` | Create | 8 endpoints, @UseGuards(JwtAuthGuard), static before :id |
| `backend/src/impuesto-vehicular/valores/valores.service.spec.ts` | Create | Mocked DB service, 15+ tests |
| `backend/src/impuesto-vehicular/valores/valores.controller.spec.ts` | Create | Mocked service, guard override, all endpoints |
| `backend/src/impuesto-vehicular/impuesto-vehicular.module.ts` | Modify | Replace modelos references with valores |
| `backend/src/app.module.ts` | Modify | Add `ImpuestoVehicularModule` import |
| `frontend/src/actions/valores.ts` | Create | 6 server actions (authFetch pattern) |
| `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/page.tsx` | Create | List page, 4 states, search, grid, pagination, delete |
| `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/valor-edit-modal.tsx` | Create | Edit modal, cascading combos, validation |
| `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/valores.test.tsx` | Create | Vitest — search, grid, states, pagination |

## Interfaces / Contracts

### SP Parameter Mappings for save (grabar)

```
@mquery      → "1" (create) | "2" (update) | "3" (delete)
@xid_valor   → dto.id ("" for create)
@xanioeje    → dto.id_anio
@xid_categoria → dto.id_categoria
@xid_marca   → dto.id_marca
@xid_modelo  → dto.xid_modelo (resolved by SP internally for create)
@xanio       → dto.anio
@xmonto      → dto.monto
@xestado     → dto.estado
@xidmod      → dto.xidmod (PHP legacy combo value)
```

### Column Mappings

**sp_vehiculo_valores_listar → ValorRow:**
`id_valor→id, ejec→ejercicio, nomcate→categoria, nommarca→marca, nommodelo→modelo, anio→anio, monto→monto, estado→estado("0"→INACTIVO/"1"→ACTIVO)`

**sp_vehiculo_valores_buscar @tipo=1 → ValorDetalle:**
`id_valor→id, ejec→ejercicio, id_anio→id_anio (internal), id_categoria→(internal), id_marca→(internal), nommarca→marca, id_modelo→(internal), nommodelo→modelo, anio→anio, monto→monto, estado→estado, mo.id→xidmod`

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Service (unit) | SP invocation, pagination, column mapping, state transitions | Mock `DatabaseService.executeProcedure()`, 15+ tests |
| Controller (unit) | Delegation, Zod defaults, 404, guard presence | Mock service, override `JwtAuthGuard` |
| Frontend (vitest) | Search form, grid, 4 states, pagination boundaries, edit/delete buttons | Mock server actions via `vi.mock("@/actions/valores")` |

## SP Names Reference

- `sp_vehiculo_valores_contar` — count with criteria filters
- `sp_vehiculo_valores_listar` — paginated rows with PHP-correct offset
- `sp_vehiculo_valores_buscar` — detail (@tipo=1) + catalogs (@tipo=2..6)
- `sp_vehiculo_valores_grabar` — create/update/delete via @mquery
- `sp_vehiculo_valores_validar` — validation (if called from frontend)
- `sp_vehiculo_valores_modelo_filtro` — filtered modelos by categoria+marca

## Migration / Rollout

No migration required. All SPs exist in the database. Rollback: revert `app.module.ts`, delete `valores/` directory and frontend folder. Branch isolation on `feat/valores-vehicular`.

## Open Questions

- [ ] Verify exact SP parameter names vs PHP legacy (confirm `@xidmod` vs `@xid_modelo` dual-field semantics)
