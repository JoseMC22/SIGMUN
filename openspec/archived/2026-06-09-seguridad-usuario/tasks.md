# Tasks: Seguridad — Usuarios

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

~460 lines across 11 files (7 new, 1 modified, 3 test files). User chose 800-line guard → risk LOW. Single PR sufficient.

## Phase 1: Foundation — Types & DTOs

- [x] **1.1** Create `backend/src/seguridad/usuarios/dto/search-usuario.dto.ts` — `SearchUsuarioSchema` (Zod: `codigo`, `nombre`, `usuario`, `area`, `perfil`, `estado` = optional strings; `page` = coerce int >=1 default 1; `pageSize` = coerce int 1–100 default 20) + inferred `SearchUsuarioDto`
- [x] **1.2** Create `backend/src/seguridad/usuarios/dto/usuarios.types.ts` — SP result interfaces (`SpUsuariosRow`, `SpUsuariosTotal`, `SpAreaRow`, `SpPerfilRow`), domain types (`UsuarioRow`, `AreaOption`, `PerfilOption`), response envelopes (`PaginatedResponse<T>`, `ErrorResponse`)

## Phase 2: Backend Service (Test-First)

- [x] **2.1** Write tests T3 + T1 + T4 + T5: pagination math boundaries (page 1 → inicio=1, page 3 of 45 → inicio=41 final=60, totalPages=3), `UsuariosService.search()` maps SP params correctly (busc=6 without inicio/final, busc=5 with them), `getAreas()` maps `{ area, nombre }` from SP, `getPerfiles()` filters `nestado=1` only
- [x] **2.2** Implement `UsuariosService` with `search(dto)` — two SP calls (`[Acceso].[sp_TblUsuarios]` @busc=6 for total, @busc=5 for rows using `(page-1)*pageSize+1` / `page*pageSize`), `getAreas()` → `dbo.sp_tccostos @busc='1'`, `getPerfiles()` → `[Acceso].[sp_TblPerfil] @busc='4'` filtered client-side

## Phase 3: Backend Controller + Module (Test-First)

- [x] **3.1** Write test T2: `UsuariosController.search()` returns `{ data, total, page, pageSize, totalPages }` with correct types via mocked service
- [x] **3.2** Create `SeguridadModule` (imports `AuthModule`, registers `UsuariosController` + `UsuariosService`), create `UsuariosController` (3 endpoints under `@UseGuards(JwtAuthGuard)` + `@Controller('seguridad/usuarios')`: `POST /search`, `GET /areas`, `GET /perfiles`), add `SeguridadModule` to `app.module.ts` imports

## Phase 4: Frontend Server Action (Test-First)

- [x] **4.1** Write test T6: `searchUsuariosAction` calls `POST /seguridad/usuarios/search` with correct body, returns `{ success, data, total, page, pageSize, totalPages }` on 200 or `{ success: false, error }` on failure/throw
- [x] **4.2** Create `frontend/src/actions/usuarios.ts` — three `"use server"` functions with inline `authFetch()`: `searchUsuariosAction(filters, page)`, `fetchAreasAction()`, `fetchPerfilesAction()`; follows `auth.ts`/`menu.ts` pattern with cookie forwarding

## Phase 5: Frontend Page Component (Test-First)

- [x] **5.1** Write component tests T7–T11: T7=renders 6 fields (3 text, 3 select), T8=Enter+button trigger API, T9=grid shows 6 columns with data, T10=pagination controls with disabled Previous/Next at boundaries + page click fires new search, T11=4 grid states (loading skeleton, empty message, error+retry, populated rows)
- [x] **5.2** Create `frontend/src/app/dashboard/seguridad/usuarios/page.tsx` — single client component with SearchForm (6 fields: código text, nombre text, usuario text, área select from API, perfil select from API, estado select with Todos/Activado/Desactivado), ResultsGrid (Código, Nombres y Apellidos, Área, Perfil, Usuario, Acciones with disabled buttons), Pagination ("Mostrando X-Y de Z resultados", Previous, numbered pages, Next); loads áreas/perfiles on mount; all 4 grid states
