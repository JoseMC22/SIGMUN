# Proposal: Modelos Module CRUD

## Intent

Migrate the PHP `VehiculoModeloController` (4 stored procedures, paginated CRUD with search/filter) to NestJS + Next.js with **100% identical behavior**. Replace the legacy UI at `/Modelos/frmModelos.php` with a modern React page at `/dashboard/modelos`.

## Scope

### In Scope
- Backend CRUD (4 SPs: listar, buscar, grabar, contar) via NestJS controller + service
- Frontend list page with pagination, search, estado filter, and edit modal
- Server actions for API calls following Seguridad/Usuarios pattern
- DTO validation with Zod (search-modelo.dto.ts, save-modelo.dto.ts)
- Unit tests for controller, service, and components

### Out of Scope
- Sidebar or navigation changes (no routing config)
- Valores Vehicular, Solicitudes, Declaraciones Juradas modules
- Uniqueness validation (handled by SP only, same as PHP)
- Categoria/Marca catalogs as standalone endpoints (sent to SP as-is, same as PHP)

## Capabilities

### New Capabilities
- `modelos-crud`: CRUD operations for vehicle models (marcas/modelos) with paginated search, estado filter, and SP-driven persistence. Follows the same SP contract as the PHP legacy.

### Modified Capabilities
None — this is a new capability with no existing spec.

## Approach

Follow Seguridad/Usuarios pattern exactly:
1. **Backend**: `modelos.service.ts` → `DatabaseService.executeProcedure()` calls for 4 SPs. `modelos.controller.ts` with JWT guard. Types in `dto/modelos.types.ts`. Zod dtos for search and save.
2. **Frontend**: Server action in `actions/modelos.ts` wraps API calls. Page component with loading/empty/error+retry/populated states. Edit modal loads on mount, caches catalogs.
3. **Pagination**: Identical calc: `start = page>1 ? (page-1)*limit+1 : 0; end = limit*page`, limit=15.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/vehiculo/vehiculo.module.ts` | New | Module registration |
| `backend/src/vehiculo/modelos/modelos.controller.ts` | New | 4 endpoints (list, search, save, count) |
| `backend/src/vehiculo/modelos/modelos.service.ts` | New | SP invocation + response mapping |
| `backend/src/vehiculo/modelos/dto/modelos.types.ts` | New | SP result types + domain interfaces |
| `backend/src/vehiculo/modelos/dto/search-modelo.dto.ts` | New | Zod schema for search/filter |
| `backend/src/vehiculo/modelos/dto/save-modelo.dto.ts` | New | Zod schema for insert/update/delete |
| `frontend/src/actions/modelos.ts` | New | Server action + authFetch |
| `frontend/src/app/dashboard/modelos/page.tsx` | New | List page with pagination + filters |
| `frontend/src/app/dashboard/modelos/modelo-edit-modal.tsx` | New | Create/edit/delete modal |
| `frontend/src/app/dashboard/modelos/modelos.test.tsx` | New | Component tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP parameter mismatch (PHP → Node types) | Low | Test each SP with PHP-known inputs/outputs |
| Pagination off-by-one replicating PHP calc | Low | Test edge cases: page=0, page=1, last page |
| SP error handling differs from PHP | Low | Match PHP error propagation: SP throws → NestJS exception filter |

## Rollback Plan

1. Remove `VehiculoModule` from `AppModule` imports.
2. Delete `frontend/src/app/dashboard/modelos/` directory.
3. Delete `frontend/src/actions/modelos.ts`.
4. No DB changes — SPs already exist and unchanged.

## Dependencies

- `DatabaseService` (already `@Global` in `AppModule`)
- SPs `sp_vehiculo_modelo_*` (already exist in DB)
- `AuthModule` + `JwtAuthGuard` (already registered)

## Success Criteria

- [ ] All 4 SPs called correctly from NestJS with matching parameter sets
- [ ] Pagination matches PHP: same results per page, same page calc
- [ ] Search + estado filter produce identical results to PHP
- [ ] Create, update, delete operations persist correctly via `mquery`
- [ ] Frontend handles loading, empty, error+retry, and populated states
- [ ] All tests pass (`pnpm --filter backend test`, `pnpm --filter frontend test`)
