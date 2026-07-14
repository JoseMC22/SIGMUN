# Proposal: Cartas de Requerimiento

## Intent

Create the first page of the new "Fiscalización Tributaria" module — a contributor search listing page. The module doesn't exist in any layer yet. This change establishes the full stack (NestJS backend module + Next.js frontend page) following the exact `seguridad/perfiles` pattern, with search filters, paginated table, and a "Generar" button stub for future modal integration.

## Scope

### In Scope
- Backend NestJS module: `fiscalizacion-tributaria.module.ts`, controller, service, DTOs (Zod), types
- Frontend "use client" page under `fiscalizacion-tributaria/cartas-requerimiento/`
- Server actions via `authFetch` pattern
- GroupField search filter: select (Código / Nombre del Contribuyente) + text input + Buscar button
- Paginated table: Código, Contribuyente, Dirección Fiscal, ROW
- "Generar" button per row (stub — no modal yet)
- Pagination: 10 records/page, offset-based via SP params `@inicio`/`@final`

### Out of Scope
- Modal opened by "Generar" button (future work)
- Actual cartas/requerimientos CRUD operations
- Other submenus of Fiscalización Tributaria
- Page cache / prefetch optimizations (add later if SP is slow)

## Capabilities

### New Capabilities
- `fiscalizacion-cartas-requerimiento`: Contributor search listing with filters, paginated table, and "Generar" button stub. Backend SP integration via `SP_FISCA_CONTRIBUYENTE` with `@mquery=10` (data) and `@mquery=11` (count).

### Modified Capabilities
None — this is a brand new module.

## Approach

Follow the `seguridad/perfiles` pattern (simpler variant, no page cache):

**Backend**: NestJS module with `@UseGuards(JwtAuthGuard)` controller, service calling `DatabaseService.executeProcedure('SP_FISCA_CONTRIBUYENTE', ...)`, Zod DTOs for search input validation. Route prefix: `fiscalizacion-tributaria/cartas-requerimiento`.

**Frontend**: Monolithic "use client" page with inline render helpers. Server action as auth proxy calling backend. `executeSearch(pageNum)` flow: server action → map to states. GroupField with select (2 options) + input + button. Table component with per-row "Generar" button. Client-side pagination state derived from SP total count.

**Business Rules**:
- Only one filter active at a time: Código OR Nombre, never both
- Filter select determines which SP param gets the input value; the other gets `""`
- Pagination: `inicio = (page-1)*10 + 1`, `final = page*10`
- Total count from `@mquery=11` SP call

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/fiscalizacion-tributaria/` | New | NestJS module, controller, service, DTOs, types |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/page.tsx` | New | Search page with filters, table, pagination |
| `frontend/src/actions/fiscalizacion-tributaria/cartas-requerimiento.ts` | New | Server actions for SP calls |
| `openspec/changes/cartas-requerimiento/` | New | SDD change artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP `SP_FISCA_CONTRIBUYENTE` slow on first call (like valores SPs) | Medium | Add page cache hook later if needed; not in scope for first slice |
| Menu DB path must match frontend route exactly | Low | Verified in exploration — pattern is well established from seguridad module |

## Rollback Plan

- Delete `backend/src/fiscalizacion-tributaria/` module directory
- Delete `frontend/src/app/dashboard/fiscalizacion-tributaria/` directory
- Delete `frontend/src/actions/fiscalizacion-tributaria/` directory
- Remove module import from `backend/src/app.module.ts`
- No database changes — SP already exists

## Dependencies

- `SP_FISCA_CONTRIBUYENTE` stored procedure (already exists in database)
- `DatabaseService` (existing backend service)
- `JwtAuthGuard` (existing auth guard)
- `authFetch` pattern (existing frontend utility)
- `seguridad/perfiles` pattern as reference implementation

## Success Criteria

- [ ] Page loads and displays contributor data from SP
- [ ] Search filters work: Código filter sends `@codigo` only, Nombre filter sends `@nomCompletoContrib` only
- [ ] Pagination works: total pages calculated from count SP, page navigation updates table
- [ ] "Generar" button renders per row (no-op for now)
- [ ] Backend follows NestJS Clean Architecture with Zod validation
- [ ] Frontend follows existing monolithic page pattern with server actions
