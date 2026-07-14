# Tasks: Cartas de Requerimiento

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~515 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always (C1) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Low

## Phase 1 — Backend (NestJS Module)

- [ ] 1.1 Create `backend/src/fiscalizacion-tributaria/fiscalizacion-tributaria.module.ts` — import AuthModule, register controller + service
- [ ] 1.2 Create `backend/src/fiscalizacion-tributaria/cartas-requerimiento/dto/search-cartas-requerimiento.dto.ts` — Zod schema with searchType enum, searchValue, page, pageSize
- [ ] 1.3 Create `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.types.ts` — CartasRequerimientoRow, PaginatedResponse\<T\>
- [ ] 1.4 Create `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.service.ts` — search() calling SP_FISCA_CONTRIBUYENTE twice (@mquery=11 count + @mquery=10 data), pagination calc, row mapping
- [ ] 1.5 Create `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.controller.ts` — @Controller with JwtAuthGuard, @Post('search') endpoint, Zod validation
- [ ] 1.6 Register `FiscalizacionTributariaModule` in `backend/src/app.module.ts` imports

## Phase 2 — Frontend (Server Action + Page)

- [ ] 2.1 Create `frontend/src/actions/fiscalizacion-tributaria/cartas-requerimiento.ts` — searchCartasRequerimientoAction via authFetch proxy
- [ ] 2.2 Create `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/page.tsx` — "use client" page with GroupField search (select + input + Buscar), 4-column table with per-row "Generar" button stub, offset pagination, loading/error/empty states

## Phase 3 — Integration Verification

- [ ] 3.1 Verify backend compiles (`npm run build` in backend/)
- [ ] 3.3 Verify frontend compiles (`npm run build` in frontend/)
