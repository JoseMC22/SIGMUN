# Mantenimiento de Vías Specification

## Purpose

Search/filter page for street maintenance data under the "Administración Tributaria" module. Provides a GroupField filter (código, zona, estado), a paginated table of user vlogin data from `acceso.tblusuarios`, and two modal-trigger buttons ("Detalle de Urbanización", "Detalle de Vía").

## Requirements

### R1: Search API

`POST /mantenimiento-vias/search` MUST accept `SearchMantenimientoDto` with optional filters (`codigo`, `zona`, `estado`) and required pagination (`page >= 1`, `pageSize` 1–100). SHALL execute `[dbo].[sp_MantenimientoVias]` which runs `SELECT vlogin FROM acceso.tblusuarios`. Response MUST be `{ data: Array<{ vlogin: string }>, total, page, pageSize, totalPages }`.

#### Scenario: Paginated search with filters
- GIVEN `{ codigo: "ADM", page: 1, pageSize: 20 }`
- WHEN the endpoint receives the request
- THEN it calls the SP with the DTO params and returns paginated results
- AND response shape is `{ data, total, page: 1, pageSize: 20, totalPages }`

#### Scenario: All filters empty returns all users
- GIVEN `{ page: 1, pageSize: 20 }` (all optional filters omitted)
- WHEN the endpoint processes
- THEN the SP is called with no filter constraints
- AND the first page of all users is returned

#### Scenario: Last page with partial rows
- GIVEN 45 total results, `pageSize: 20`
- WHEN page 3 is requested
- THEN response has 5 rows in `data`, `totalPages: 3`

#### Scenario: Empty results
- GIVEN filters matching zero vlogin rows
- WHEN search executes
- THEN `data` is `[]`, `total: 0`, `totalPages: 0`

#### Scenario: Invalid pagination
- GIVEN `page: 0` or `pageSize: 200`
- WHEN Zod validation runs
- THEN endpoint returns 400 Bad Request

### R2: Server Action

`searchMantenimientoAction` (in `actions/mantenimiento-vias.ts`) MUST be a `"use server"` action using `authFetch()` to POST `/mantenimiento-vias/search`. On success SHALL return `{ success: true, data, total, page, pageSize, totalPages }`. On failure SHALL return `{ success: false, error: string }`.

#### Scenario: Successful search
- GIVEN authFetch resolves with 200 + valid JSON
- WHEN the action is invoked with filter params
- THEN it returns success envelope with typed paginated data

#### Scenario: Network error
- GIVEN authFetch throws
- WHEN the action is invoked
- THEN it returns `{ success: false, error: "..." }` without throwing

### R3: Search Form

The page at `/dashboard/mantenimiento-vias` MUST render a GroupField (fieldset) with 3 filter fields: código (text input), zona (text input), estado (select: `""`=Todos, `"1"`=Activo, `"0"`=Inactivo). Enter key on any text field SHALL trigger search.

#### Scenario: Three filter fields render
- GIVEN the page mounts
- WHEN rendering
- THEN 3 inputs are present (2 text inputs, 1 select)

#### Scenario: Enter key triggers search
- GIVEN the user types in the código field
- WHEN Enter key is pressed
- THEN search executes with current filter values

### R4: Results Grid

The grid MUST display 1 column: vlogin. SHALL handle 4 states: **loading** (skeleton/spinner), **empty** ("No se encontraron resultados"), **error** (message + retry button), **populated** (full data rows).

#### Scenario: Populated grid
- GIVEN search returns rows
- WHEN the grid renders
- THEN the vlogin column displays per-row data

#### Scenario: Empty state
- GIVEN search returns zero results
- WHEN the grid renders
- THEN the empty message "No se encontraron resultados" is displayed

#### Scenario: Loading state
- GIVEN a search request is in flight
- WHEN the component renders
- THEN a loading indicator (skeleton) replaces the grid area

#### Scenario: Error with retry
- GIVEN the API returns an error
- WHEN the error state renders
- THEN an error message and a "Reintentar" button are shown
- AND clicking retry re-executes the search

### R5: Detail Modals

The page MUST render two buttons: "Detalle de Urbanización" and "Detalle de Vía". Each button SHALL open a shadcn/ui `<Dialog>` modal when clicked. Each modal SHALL close when the user clicks the close button, clicks outside the modal, or presses Escape.

#### Scenario: Open Urbanización modal
- GIVEN the page is loaded with data
- WHEN the user clicks "Detalle de Urbanización"
- THEN a Dialog modal opens with a title "Detalle de Urbanización"

#### Scenario: Open Vía modal
- GIVEN the page is loaded with data
- WHEN the user clicks "Detalle de Vía"
- THEN a Dialog modal opens with a title "Detalle de Vía"

#### Scenario: Close modal via close button
- GIVEN either modal is open
- WHEN the user clicks the close button (X)
- THEN the modal closes

#### Scenario: Close modal via Escape
- GIVEN either modal is open
- WHEN the user presses the Escape key
- THEN the modal closes

### R6: Pagination

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
| `[dbo].[sp_MantenimientoVias]` | `@codigo, @zona, @estado, @page, @pageSize` | `vlogin` |

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
| T1 | Backend | Controller returns correct response shape | Unit |
| T2 | Backend | Zod validation rejects invalid pagination | Unit |
| T3 | Backend | Service calls SP with mapped DTO params | Unit |
| T4 | Frontend | Action calls correct endpoint via authFetch | Unit |
| T5 | Frontend | Component renders 3 filter fields | Component |
| T6 | Frontend | Enter key in text field triggers search | Component |
| T7 | Frontend | Grid renders vlogin column with data | Component |
| T8 | Frontend | Loading, empty, and error states render | Component |
| T9 | Frontend | Pagination controls render and handle clicks | Component |
| T10 | Frontend | "Detalle de Urbanización" button opens modal | Component |
| T11 | Frontend | "Detalle de Vía" button opens modal | Component |
| T12 | Frontend | Both modals close via close/X/Escape | Component |
