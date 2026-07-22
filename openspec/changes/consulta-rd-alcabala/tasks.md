# Tasks: Consulta RD Alcabala

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1200 (code + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Frontend) → PR 3 (Integration/Nav) |
| Delivery strategy | force-chained |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: types, DTOs, service, controller, tests | PR 1 | Base: feature/consulta-rd-alcabala. ~530 lines. Follows cartas-requerimiento pattern. |
| 2 | Frontend: server action, page, detail modal, tests | PR 2 | Base: PR 1 branch. ~750 lines. Depends on backend endpoints. |
| 3 | Integration: navigation config, cross-layer verification | PR 3 | Base: PR 2 branch. ~50 lines. Manual nav DB insert + smoke test. |

## Phase 1: Backend Foundation

- [x] 1.1 Create `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.types.ts` — `RdAlcabalaRow`, `RdAlcabalaDetail`, `PaginatedResponse<T>` interfaces matching SP output
- [x] 1.2 Create `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/dto/search-rd-alcabala.dto.ts` — `SearchRdAlcabalaSchema` (Zod): searchType, searchValue, nroRd, fechaDesde/Hasta, periodoFiscal, estado, page, pageSize; export inferred type
- [x] 1.3 Write `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.service.spec.ts` — RED: test SP param mapping for count (@msquery=1), data (@msquery=2), detail (@msquery=3); test response mapping and error handling (mock DatabaseService)

## Phase 2: Backend Service

- [x] 2.1 Create `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.service.ts` — GREEN: implement `search()`, `getCount()`, `getDetail()` calling `DatabaseService.executeProcedure('Rentas.SP_ConsultadocuAlcabala', params)` with mapped Zod DTO; REFACTOR: extract param builder helper
- [x] 2.2 Run service tests, verify all pass: `pnpm --filter backend test -- --testPathPattern=consulta-rd-alcabala`

## Phase 3: Backend Controller

- [x] 3.1 Write `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.controller.spec.ts` — RED: test POST /search returns paginated data; POST /detail returns full RD; 400 on invalid Zod input; JwtAuthGuard applied
- [x] 3.2 Create `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.controller.ts` — GREEN: controller with `@Post('search')` + `@Post('detail')`, Zod validation pipe, `@UseGuards(JwtAuthGuard)`, `@Controller('fiscalizacion-tributaria/consulta-rd-alcabala')`
- [x] 3.3 Modify `backend/src/fiscalizacion-tributaria/fiscalizacion-tributaria.module.ts` — register `ConsultaRdAlcabalaController` + `ConsultaRdAlcabalaService` in controllers/providers arrays

## Phase 4: Frontend Server Action

- [ ] 4.1 Create `frontend/src/actions/fiscalizacion-tributaria/consulta-rd-alcabala.ts` — `searchRdAlcabalaAction(filters, page)` and `getRdAlcabalaDetailAction(idRd)` using `authFetch` pattern; return `ActionResult` type
- [ ] 4.2 Write `frontend/src/actions/fiscalizacion-tributaria/consulta-rd-alcabala.test.ts` — RED: test success/error paths, verify authFetch called with correct endpoints; GREEN: verify tests pass

## Phase 5: Frontend Page

- [ ] 5.1 Create `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/detail-modal.tsx` — modal component: full RD fields layout, close button, print button (window.print with CSS print media query)
- [ ] 5.2 Create `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/page.tsx` — `"use client"` page: GroupField + Select filters (Código/Nombre), standalone inputs (N° RD, fechas, período, estado), Buscar button, DataTable with 5 columns, pagination, row click opens detail-modal, initial load with empty filters
- [ ] 5.3 Write `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/page.test.tsx` — RED: test renders filters, renders table with data, shows empty state, pagination calls next page, row click opens modal; GREEN: verify tests pass

## Phase 6: Integration Verification

- [ ] 6.1 Verify backend module loads without errors: `pnpm --filter backend build`
- [ ] 6.2 Verify frontend compiles without errors: `pnpm --filter frontend build`
- [ ] 6.3 Manual test: navigate to `/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala`, confirm filters render, search returns results, pagination works, detail modal opens, print triggers download
- [ ] 6.4 Insert "Consulta RD Alcabala" submenu entry in navigation DB config under Alcabala parent
