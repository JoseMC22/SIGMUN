# fiscalizacion-cartas-requerimiento — Specification

## Purpose

Contributor search listing page for Fiscalización Tributaria. Filter-by-code-or-name search, paginated results from `SP_FISCA_CONTRIBUYENTE`, per-row "Generar" button stub.

## Requirements

### R1: Search Filters

GroupField with Select (Código / Nombre del Contribuyente) + text input + Buscar button. Only ONE filter active at a time. "Código" maps input to `@codigo` (empty `@nomCompletoContrib`). "Nombre del Contribuyente" maps to `@nomCompletoContrib` (empty `@codigo`).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Search by Código | Page loaded | Select "Código", type "12345", click Buscar | SP called with `@codigo='12345'`, `@nomCompletoContrib=''`, `@inicio=1`, `@final=10` |
| Search by Nombre | Page loaded | Select "Nombre", type "Empresa", click Buscar | SP called with `@codigo=''`, `@nomCompletoContrib='Empresa'` |
| Empty input | Page loaded | Click Buscar with empty input | SP called with both filters empty, returns all records page 1 |
| SP error | Page loaded | Click Buscar, SP fails | User-facing error message shown, page does not crash |

### R2: Data Table

Table SHALL display columns from `SP_FISCA_CONTRIBUYENTE` (`@mquery=10`): Código, Contribuyente, Dirección Fiscal, ROW.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Renders data | SP returns rows | Page loads or search completes | All four columns render for each row |
| Empty results | No contributors match | Search completes | Empty state "No se encontraron contribuyentes" shown, pagination disabled |

### R3: Pagination

10 records/page default. Total from `SP_FISCA_CONTRIBUYENTE` `@mquery=11`. Params: `@inicio = (page-1)*10+1`, `@final = page*10`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Navigate page | 25 contributors, page 1 shown | User clicks page 2 | SP called with `@inicio=11`, `@final=20`, same filters |
| Count SP fails | `@mquery=11` returns error | Page loads | Pagination disabled, error message shown |

### R4: Generar Button

Each row SHALL render a "Generar" button. Clicking opens a modal (out of scope for this change).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Button renders | Table has ≥1 row | Page renders | Each row shows styled "Generar" button, no backend call triggered |

### R5: No "Nuevo" Button

Page MUST NOT include a "Nuevo"/"Create" button. Search-only page.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No create action | Page loaded | User inspects UI | No "Nuevo", "Agregar", or "Crear" button present |

### R6: Backend NestJS Module

New `fiscalizacion-tributaria` module with controller (JwtAuthGuard), service, Zod DTOs, types. Route prefix: `fiscalizacion-tributaria/cartas-requerimiento`. Follows `seguridad/perfiles` pattern.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Module structure | Module created | Inspection | Module, controller, service, Zod DTOs, types exist; controller guarded by JwtAuthGuard |
| Input validation | Invalid data sent (e.g., non-string codigo) | POST to search endpoint | Zod DTO rejects, returns 400 |
| SP call | Valid search request | Controller calls service | Service calls DatabaseService.executeProcedure with correct SP params |

### R7: Server Actions

Server action file following `authFetch` pattern. Proxies search and count calls to backend.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Search proxy | Client calls action with filters + pagination | Action executes | Calls backend via authFetch, returns results |
| Count proxy | Client calls action for total count | Action executes | Calls backend with `@mquery=11`, returns count |

### R8: Initial Page Load

On load, execute SP with `@mquery=10`, empty filters, `@inicio=1`, `@final=10`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Initial load | User navigates to page | Page renders | First 10 contributors fetched with no filters, displayed in table |
