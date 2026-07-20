# Proposal: Consulta RD Alcabala

## Intent

The SAT ICA needs a dedicated interface to query and inspect Resoluciones de Determinación (RD) generated for Impuesto de Alcabala within SIGMUN. Currently, there is no centralized view — officers must rely on legacy system queries or ad-hoc SQL, leading to slow response times and inconsistent data access.

## Scope

### In Scope

- Search page under Alcabala submenu: filters (Código/Nombre contribuyente, N° RD, rango de fechas, período fiscal/año, estado de la RD)
- Paginated data table: N° RD, Contribuyente, Fecha de emisión, Base imponible, Estado
- Detail modal: full RD view on row click
- Print/export RD: PDF generation from detail view
- Backend endpoint calling existing legacy SP for RD queries
- Server action proxying search + count to backend

### Out of Scope

- RD creation or modification workflows
- Appeal/derivation actions
- Bulk export (CSV/Excel) — print only
- RD filtering by sub-types (all alcabala RDs listed together)

## Capabilities

### New Capabilities

- `fiscalizacion-rd-alcabala-consulta`: Search, paginate, view detail, and print RD for Impuesto de Alcabala

### Modified Capabilities

None — no existing spec behavior changes.

## Approach

Follow the `fiscalizacion-cartas-requerimiento` pattern: NestJS controller + service + Zod DTOs under `fiscalizacion-tributaria` module, server action with `authFetch`, Next.js page under `dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/`. Reuse GroupField + Select filter pattern. Backend calls existing SP via `DatabaseService.executeProcedure`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/` | New | Controller, service, DTO, types for RD queries |
| `backend/src/fiscalizacion-tributaria/fiscalizacion-tributaria.module.ts` | Modified | Register new submodule |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/` | New | Page, detail modal, print component |
| `frontend/src/actions/` | New | Server action for RD search + count proxy |
| Navigation DB config | Modified | Add "Consulta RD Alcabala" submenu entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy SP returns unexpected schema | Medium | Validate response shape in service layer; log mismatches |
| PDF generation adds latency | Low | Generate on demand from detail view only, not bulk |
| Navigation config not set up | Low | Confirm submenu entry exists in DB before testing UI |

## Rollback Plan

1. Remove `consulta-rd-alcabala/` directories from backend and frontend
2. Revert `fiscalizacion-tributaria.module.ts` to original state
3. Delete submenu entry from navigation DB config
4. No data migration needed — read-only feature, zero persisted state changes

## Dependencies

- Existing legacy SP for RD queries (user-confirmed present)
- Navigation DB configuration (submenu entry for Alcabala)
- `DatabaseService.executeProcedure` availability

## Success Criteria

- [ ] Filters return correct RD results matching legacy system output
- [ ] Pagination works with 10 records/page default
- [ ] Detail modal shows full RD information
- [ ] PDF print produces readable output
- [ ] Empty states handled (no results, SP errors)
- [ ] Page accessible only with valid JWT (JwtAuthGuard)
