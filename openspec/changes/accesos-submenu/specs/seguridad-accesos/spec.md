# Seguridad — Accesos Specification

## Purpose

Administrative access records listing with 5 search filters, cascading Menú→Módulo selects, and pagination via `[Acceso].[SP_MAcceso]`. Enables browsing system entries (menus, modules, objects) without legacy interface access.

## Requirements

### R1: Search API

`POST /seguridad/accesos/search` MUST accept `SearchAccesoDto` with optional filters (`id_acceso`, `nombre`, `menu`, `pantalla`, `orden`) and required pagination (`page >= 1`, `pageSize` 1–100). SHALL query `[Acceso].[SP_MAcceso]` twice: `@busc = 6` for total and `@busc = 5` for rows with `@inicio = (page-1)*pageSize+1`, `@final = page*pageSize`. Response MUST be `{ data, total, page, pageSize, totalPages }`.

#### Scenario: Paginated search with filters
- GIVEN `{ id_acceso: "MNT", nombre: "Mantenimiento", page: 1, pageSize: 10 }`
- WHEN the endpoint receives the request
- THEN it calls SP with `@busc=6` + filter params AND `@busc=5` + `@inicio=1` + `@final=10`
- AND returns `{ data, total: N, page: 1, pageSize: 10, totalPages: Math.ceil(N/10) }`

#### Scenario: All filters empty returns all records
- GIVEN `{ page: 1, pageSize: 20 }` (all optional filters omitted)
- WHEN the endpoint processes
- THEN both SP calls receive `''` for all filter params, returning all records

#### Scenario: Last page with partial rows
- GIVEN 25 total results, `pageSize: 10`
- WHEN page 3 is requested
- THEN `@inicio=21`, `@final=30`, results have 5 rows, `totalPages: 3`

#### Scenario: Empty results
- GIVEN filters matching zero records
- WHEN search executes
- THEN `data` is `[]`, `total: 0`, `totalPages: 0`

#### Scenario: Invalid pagination
- GIVEN `page: 0` or `pageSize: 200`
- WHEN Zod validation runs
- THEN endpoint returns 400 Bad Request

### R2: Menus Dropdown API

`GET /seguridad/accesos/menus` MUST query `[Acceso].[SP_MAcceso] @busc = 8` and return `{ data: Array<{ id_acceso: string, nommenu: string }> }`.

#### Scenario: Returns menu options on mount
- GIVEN the endpoint is called
- WHEN the SP returns rows
- THEN each row maps to `{ id_acceso, nommenu }` in response data

### R3: Modulos Dropdown API (Cascading)

`GET /seguridad/accesos/modulos?menuId=<id>` MUST query `[Acceso].[SP_MAcceso] @busc = 9, @id_acceso = <menuId>` and return `{ data: Array<{ id_acceso: string, nommenu: string }> }`. When Menú selection changes, frontend SHALL call this API with the new `menuId` and reset the Módulo selection.

#### Scenario: Cascading fetch on menu change
- GIVEN Menú select value changes to "MNT"
- WHEN the handler fires
- THEN `GET /modulos?menuId=MNT` is called with AbortController
- AND Módulo select resets to "Todos" and populates with new options

#### Scenario: Empty menuId returns empty list
- GIVEN `menuId` is empty or omitted
- WHEN the endpoint is called
- THEN it returns `{ data: [] }`

### R4: Server Action

`searchAccesosAction` (in `actions/accesos.ts`) MUST be a `"use server"` action using `authFetch()` to POST `backend/seguridad/accesos/search`. On success SHALL return `{ success: true, data, total, page, pageSize, totalPages }`. On failure SHALL return `{ success: false, error: string }`.

#### Scenario: Successful search
- GIVEN authFetch resolves with 200 + valid JSON
- WHEN the action is invoked with filter params
- THEN it returns success envelope with typed paginated data

#### Scenario: Network error
- GIVEN authFetch throws
- WHEN the action is invoked
- THEN it returns `{ success: false, error }` without throwing

### R5: Search Form

The page at `/dashboard/seguridad/accesos` MUST render 5 fields: Acceso (text), Nombre (text), Menú (select from menus API on mount), Módulo (select, initially disabled/empty, populated on Menú change), Tipo (select: `""` = Todos, `"M"` = MENU, `"O"` = OBJETOS). Enter key on any text field SHALL trigger search.

#### Scenario: Five fields render with correct types
- GIVEN the page mounts
- WHEN rendering
- THEN 5 labeled inputs are present (2 text, 3 select)

#### Scenario: Menú select populates on mount
- GIVEN the page mounts
- WHEN initialization runs
- THEN menus API is called and Menú select displays options + "Todos"

#### Scenario: Módulo cascading from Menú
- GIVEN Menú is selected
- WHEN the value changes
- THEN Módulo select resets + calls modulos API with selected Menú id

### R6: Results Grid

The grid MUST display 7 columns: Id Acceso, Tipo (M→"MENU", O→"OBJETOS"), Nombre, Id Objeto, Icono, Formulario, Estado. Estado SHALL render a badge: `nestado = 1` → green "Activo", otherwise red "Inactivo". Icono and Formulario SHALL render as plain text. Each row SHALL include disabled Editar (Pencil) and Eliminar (Trash2) buttons. Grid SHALL handle 4 states: **loading** (skeleton), **empty** ("No se encontraron accesos"), **error** (message + "Reintentar" button), **populated** (data rows).

#### Scenario: Populated grid
- GIVEN search returns rows
- WHEN the grid renders
- THEN all 7 columns display per-row data, Estado shows badge, Icono/Formulario as text

#### Scenario: Empty state
- GIVEN search returns zero results
- WHEN the grid renders
- THEN empty message is displayed

#### Scenario: Loading state
- GIVEN a search request is in flight
- WHEN the component renders
- THEN a loading skeleton replaces the grid area

#### Scenario: Error with retry
- GIVEN the API returns an error
- WHEN the error state renders
- THEN error message + "Reintentar" button are shown
- AND clicking retry re-executes the search

#### Scenario: Tipo column display
- GIVEN `orden = "M"`
- WHEN the row renders
- THEN the Tipo column displays "MENU"
- GIVEN `orden = "O"`
- WHEN the row renders
- THEN the Tipo column displays "OBJETOS"

### R7: Pagination

Controls MUST show "Mostrando X-Y de Z resultados", Previous/Next buttons (disabled at boundaries), and numbered page buttons. Clicking any page or Previous/Next SHALL trigger search with the target page number.

#### Scenario: Previous disabled on first page
- GIVEN current page is 1
- WHEN pagination renders
- THEN Previous button is disabled

#### Scenario: Next disabled on last page
- GIVEN current page equals `totalPages`
- WHEN pagination renders
- THEN Next button is disabled

#### Scenario: Page click fires search
- GIVEN user clicks page 3
- WHEN the handler fires
- THEN search executes with `page: 3` and current filters

### R8: Edit Modal Shell

`acceso-edit-modal.tsx` MUST render an empty modal shell accepting `isOpen`, `onClose`, and `onSaved` props. No form fields — only close button and title.

#### Scenario: Modal opens and closes
- GIVEN `isOpen = true`
- WHEN the modal renders
- THEN it shows a title with a close button, empty body

#### Scenario: onClose fires on dismiss
- GIVEN the modal is open
- WHEN user clicks close or backdrop
- THEN `onClose` is called

### R9: Placeholder Action Buttons

Each grid row MUST include Editar (Pencil icon) and Eliminar (Trash2 icon) buttons with no functional handler (disabled or `onClick={() => {}}`).

#### Scenario: Buttons render per row
- GIVEN a data row renders
- WHEN the actions column renders
- THEN both Pencil and Trash2 icons are present

## SP Contract

| SP | Params | Result Columns |
|----|--------|----------------|
| `[Acceso].[SP_MAcceso]` @busc=5 | `@id_acceso, @nombre, @orden, @menu, @pantalla, @inicio, @final` | `id_acceso, orden, nombre, id_objeto, icono, doform, nestado` |
| `[Acceso].[SP_MAcceso]` @busc=6 | `@id_acceso, @nombre, @orden, @menu, @pantalla` (NO inicio/final) | `total` |
| `[Acceso].[SP_MAcceso]` @busc=8 | none | `id_acceso, nommenu` |
| `[Acceso].[SP_MAcceso]` @busc=9 | `@id_acceso` | `id_acceso, nommenu` |

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
| T1 | Backend | AccesosService.search() maps SP params correctly | Unit |
| T2 | Backend | AccesosController.search() returns correct response shape | Unit |
| T3 | Backend | Pagination math: inicio/final for pages 1, 2, last | Unit |
| T4 | Backend | Menus endpoint returns mapped data from @busc=8 | Unit |
| T5 | Backend | Modulos endpoint filters by menuId via @busc=9 | Unit |
| T6 | Frontend | searchAccesosAction calls correct endpoint | Unit |
| T7 | Frontend | Component renders 5 search fields (2 text, 3 select) | Component |
| T8 | Frontend | Menú→Módulo cascading select behavior | Component |
| T9 | Frontend | Grid renders 7 columns with Estado badge | Component |
| T10 | Frontend | Pagination controls render and handle clicks | Component |
| T11 | Frontend | Loading, empty, error states render correctly | Component |
