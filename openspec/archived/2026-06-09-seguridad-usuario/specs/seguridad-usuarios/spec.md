# Seguridad — Usuarios Specification

## Purpose

Administrative user search and management grid with filtering, pagination, and dropdown-loading via three stored procedures. Enables system administrators to locate and browse users without legacy interface access.

## Requirements

### R1: User Search API

`POST /seguridad/usuarios/search` MUST accept `SearchUsuarioDto` with optional filters (`codigo`, `nombre`, `usuario`, `area`, `perfil`, `estado`) and required pagination (`page >= 1`, `pageSize` 1–100). SHALL query `[Acceso].[sp_TblUsuarios]` twice: `@busc = 6` for total (no pagination params) and `@busc = 5` for rows with `@inicio = (page-1)*pageSize+1`, `@final = page*pageSize`. Response MUST be `{ data, total, page, pageSize, totalPages }`.

#### Scenario: Paginated search with filters
- GIVEN `{ nombre: "SISTEMAS", page: 1, pageSize: 20 }`
- WHEN the endpoint receives the request
- THEN it calls SP with `@busc=6` + filter params AND `@busc=5` + `@inicio=1` + `@final=20`
- AND returns `{ data, total: N, page: 1, pageSize: 20, totalPages: Math.ceil(N/20) }`

#### Scenario: All filters empty returns all users
- GIVEN `{ page: 1, pageSize: 20 }` (all optional filters omitted)
- WHEN the endpoint processes
- THEN both SP calls receive `null` for all filter params
- AND the first page of all users is returned

#### Scenario: Last page with partial rows
- GIVEN 45 total results, `pageSize: 20`
- WHEN page 3 is requested
- THEN `@inicio=41`, `@final=60`, results have 5 rows, `totalPages: 3`

#### Scenario: Empty results
- GIVEN filters matching zero users
- WHEN search executes
- THEN `data` is `[]`, `total: 0`, `totalPages: 0`

#### Scenario: Invalid pagination
- GIVEN `page: 0` or `pageSize: 200`
- WHEN Zod validation runs
- THEN endpoint returns 400 Bad Request

### R2: Areas List API

`GET /seguridad/usuarios/areas` MUST query `dbo.sp_tccostos @busc = '1'` and return `{ data: Array<{ area: string, nombre: string }> }`.

#### Scenario: Returns mapped areas
- GIVEN the endpoint is called
- WHEN the SP returns rows
- THEN each row maps to `{ area, nombre }` in response data

### R3: Perfiles List API

`GET /seguridad/usuarios/perfiles` MUST query `[Acceso].[sp_TblPerfil] @busc = '4'` and filter results where `nestado = 1`, returning `{ data: Array<{ id_perfil: string, nombre: string }> }`.

#### Scenario: Filters inactive profiles
- GIVEN SP returns rows with mixed `nestado` values
- WHEN the endpoint processes results
- THEN only `nestado = 1` rows are included in response

### R4: Server Action

`searchUsuariosAction` (in `actions/usuarios.ts`) MUST be a `"use server"` action using `authFetch()` to POST `/seguridad/usuarios/search`. On success SHALL return `{ success: true, data, total, page, pageSize, totalPages }`. On failure SHALL return `{ success: false, error: string }`.

#### Scenario: Successful search
- GIVEN authFetch resolves with 200 + valid JSON
- WHEN the action is invoked with filter params
- THEN it returns success envelope with typed paginated data

#### Scenario: Network error
- GIVEN authFetch throws
- WHEN the action is invoked
- THEN it returns `{ success: false, error: "..." }` without throwing

### R5: Search Form

The page at `/dashboard/seguridad/usuarios` (wrapped in `DashboardLayout`) MUST render 6 fields: código (text), nombre (text), usuario (text), área (select from areas API on mount), perfil (select from perfiles API on mount), estado (select: ""=Todos, "1"=Activado, "0"=Desactivado). Enter key on any text field SHALL trigger search.

#### Scenario: All six fields render with correct types
- GIVEN the page mounts
- WHEN rendering
- THEN 6 labeled inputs are present (3 text, 3 select)

#### Scenario: Selects populate from APIs
- GIVEN the page mounts
- WHEN initialization runs
- THEN areas and perfiles APIs are called and their selects display options

### R6: Results Grid

The grid MUST display 6 columns: Código, Nombres y Apellidos, Área, Perfil, Usuario, Acciones (disabled Editar/Eliminar buttons). SHALL handle 4 states: **loading** (skeleton/spinner), **empty** ("No se encontraron usuarios"), **error** (message + retry button), **populated** (full data rows).

#### Scenario: Populated grid
- GIVEN search returns rows
- WHEN the grid renders
- THEN all 6 columns display per-row data

#### Scenario: Empty state
- GIVEN search returns zero results
- WHEN the grid renders
- THEN empty message is displayed

#### Scenario: Loading state
- GIVEN a search request is in flight
- WHEN the component renders
- THEN a loading indicator replaces the grid area

#### Scenario: Error with retry
- GIVEN the API returns an error
- WHEN the error state renders
- THEN an error message and a "Reintentar" button are shown
- AND clicking retry re-executes the search

### R7: Pagination

Pagination controls MUST show "Mostrando X-Y de Z resultados", Previous/Next buttons (disabled at boundaries), and numbered page buttons. Clicking any page button or Previous/Next SHALL trigger a new search with the target page number.

#### Scenario: Previous disabled on first page
- GIVEN the current page is 1
- WHEN pagination renders
- THEN Previous button is disabled

#### Scenario: Next disabled on last page
- GIVEN the current page equals `totalPages`
- WHEN pagination renders
- THEN Next button is disabled

#### Scenario: Page click fires search
- GIVEN user clicks page 3
- WHEN the handler fires
- THEN search executes with `page: 3` and current filters

## SP Contract

| SP | Params | Result Columns |
|----|--------|----------------|
| `[Acceso].[sp_TblUsuarios]` @busc=5 | `@id_usuario, @nombres, @vlogin, @area, @id_perfil, @nest, @inicio, @final` | `id_usuario, nombre, area, perfil, vlogin, nestado, ROW` |
| `[Acceso].[sp_TblUsuarios]` @busc=6 | `@id_usuario, @nombres, @vlogin, @area, @id_perfil, @nest` (NO inicio/final) | `total` |
| `dbo.sp_tccostos` @busc='1' | `@busc` | `area, nombre` |
| `[Acceso].[sp_TblPerfil]` @busc='4' | `@busc` | `id_perfil, nombre, nestado, operador, estacion, fech_ing` |

## Error Handling

| Scenario | HTTP | Frontend Behavior |
|----------|------|-------------------|
| SP timeout (>30s) | 504 | Error state + retry button |
| DB connection failure | 500 | Error state + "Error del servidor" |
| Invalid DTO | 400 | Zod validation error response |
| Missing/invalid JWT | 401 | Redirect to `/login` |
| Network error (fetch) | — | `{ success: false, error }` action response |

## Test Scenarios

| # | Domain | Test | Level |
|---|--------|------|-------|
| T1 | Backend | UsuariosService.search() maps SP params correctly | Unit |
| T2 | Backend | UsuariosController.search() returns correct response shape | Unit |
| T3 | Backend | Pagination math: inicio/final for pages 1, 2, last | Unit |
| T4 | Backend | Areas endpoint returns mapped data | Unit |
| T5 | Backend | Perfiles endpoint filters nestado=1 | Unit |
| T6 | Frontend | searchUsuariosAction calls correct endpoint | Unit |
| T7 | Frontend | Component renders 6 search fields | Component |
| T8 | Frontend | Search button + Enter trigger API call | Component |
| T9 | Frontend | Grid renders 6 columns with data | Component |
| T10 | Frontend | Pagination controls render and handle clicks | Component |
| T11 | Frontend | Loading, empty, and error states render | Component |
