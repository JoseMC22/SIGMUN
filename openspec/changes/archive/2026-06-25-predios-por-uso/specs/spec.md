# Predios por Uso — Specification

## Purpose

Consulta paginada de predios agrupados por uso en el sistema SAT ICA, accesible desde Reportes Gerenciales. Filtros por código, año y tipo de uso. Datos provistos por `[Rentas].[Rpt_Rentas_General]` (`@BUSC=1`).

## Requirements

### R1: Search API

`POST /reportes-gerenciales/predios-uso/search` MUST accept `SearchPredioUsoDto` with optional filters (`codigo`, `anno`, `uso`) and required pagination (`page >= 1`, `pageSize` 1–100). SHALL query `[Rentas].[Rpt_Rentas_General] @BUSC=1, @CODIGO, @anno, @uso` and return `{ data, total, page, pageSize, totalPages }`.

#### Scenario: Search with all filters

- GIVEN `{ codigo: "123", anno: 2026, uso: "COMERCIO", page: 1, pageSize: 15 }`
- WHEN the endpoint receives the request
- THEN it calls SP with `@BUSC=1, @CODIGO="123", @anno=2026, @uso="COMERCIO"`
- AND returns paginated response with mapped rows

#### Scenario: All filters empty returns all records

- GIVEN `{ page: 1, pageSize: 15 }` (all optional filters omitted)
- WHEN the endpoint processes
- THEN SP receives empty strings for all filter params, returning all records

#### Scenario: Empty results

- GIVEN filters matching zero records
- WHEN search executes
- THEN `data` is `[]`, `total: 0`, `totalPages: 0`

#### Scenario: Invalid pagination

- GIVEN `page: 0` or `pageSize: 200`
- WHEN Zod validation runs
- THEN endpoint returns 400 with `validation_error` code

### R2: Server Action

`searchPrediosAction` (in `actions/reportes-gerenciales/predios-uso.ts`) MUST be a `"use server"` action using `authFetch()` to POST `backend/reportes-gerenciales/predios-uso/search`. On success SHALL return `{ success: true, data, total, page, pageSize, totalPages }`. On failure SHALL return `{ success: false, error: string }`.

#### Scenario: Successful search

- GIVEN authFetch resolves with 200 + valid JSON
- WHEN the action is invoked with filter params
- THEN it returns success envelope with typed paginated data

#### Scenario: Network error

- GIVEN authFetch throws
- WHEN the action is invoked
- THEN it returns `{ success: false, error }` without throwing

### R3: Search Form

The page at `/dashboard/reportes-gerenciales/predios-por-uso` MUST render 3 filters: Código (text), Año (select with preset year range), Uso (text). Enter key SHALL trigger search.

#### Scenario: Three filters render

- GIVEN the page mounts
- WHEN rendering
- THEN 3 labeled inputs are present (2 text, 1 select)

#### Scenario: Año select populated on mount

- GIVEN the page mounts
- WHEN initialization runs
- THEN año select displays last 5 years + current year as options

### R4: Results Table

The grid MUST display 7 columns: Tipo, Uso, Predios, Condición, Count, Año, Id Uso. Grid SHALL handle 4 states: **loading** (skeleton), **empty** ("No se encontraron resultados"), **error** (message + "Reintentar" button), **populated** (data rows).

#### Scenario: Populated grid

- GIVEN search returns rows
- WHEN the grid renders
- THEN all 7 columns display per-row data

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

### R5: Pagination

Controls MUST show "Mostrando X-Y de Z resultados", Previous/Next buttons (disabled at boundaries), and numbered page buttons.

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

## SP Contract

| SP | Params | Result Columns |
|----|--------|----------------|
| `[Rentas].[Rpt_Rentas_General]` @BUSC=1 | `@CODIGO?`, `@anno?`, `@uso?` | `tipo, uso, predios, condicion, count, anno, id_uso` |

## Error Handling

| Scenario | HTTP | Frontend Behavior |
|----------|------|-------------------|
| SP timeout (>30s) | 504 | Error state + retry button |
| DB connection failure | 500 | Error state + "Error del servidor" |
| Invalid DTO | 400 | Zod validation error |
| Missing/invalid JWT | 401 | Redirect to `/login` |
| Network error (fetch) | — | `{ success: false, error }` |

## Test Scenarios

| # | Domain | Test | Level |
|---|--------|------|-------|
| T1 | Backend | Service.search() maps SP params correctly (@BUSC=1, @CODIGO, @anno, @uso) | Unit |
| T2 | Backend | Controller returns correct response shape | Unit |
| T3 | Frontend | searchPrediosAction calls correct endpoint | Unit |
| T4 | Frontend | 3 search fields render (2 text, 1 select) | Component |
| T5 | Frontend | Grid renders 7 columns | Component |
| T6 | Frontend | Pagination controls render and handle clicks | Component |
| T7 | Frontend | Loading, empty, error states render correctly | Component |

## Open Questions

- [ ] Confirm SP `@CODIGO`, `@anno`, `@uso` accept NULL/empty as valid defaults
- [ ] Determine if SP supports pagination params (`@inicio`/`@final`) or returns all rows (client-side pagination)
- [ ] Define año range logic: hardcoded last 5 years, SP-driven, or configurable?
