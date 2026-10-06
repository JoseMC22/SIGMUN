# fiscalizacion-rd-alcabala-consulta — Specification

## Purpose

Search and inspect Resoluciones de Determinación (RD) for Impuesto de Alcabala. Officers filter by contributor code/name, RD number, date range, fiscal year, or RD status; view paginated results; open a detail modal; and print the RD as PDF.

## Requirements

### R1: Search Filters

GroupField with Select (Código / Nombre del Contribuyente) + text input, plus additional filters: N° RD, rango de fechas (desde/hasta), período fiscal/año, estado de la RD (Select). Only contributor code/name filter uses the GroupField pattern — other filters are standalone inputs. Buscar button triggers search.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Search by Código | Page loaded | Select "Código", type "12345", click Buscar | Backend called with `@codigo='12345'`, `@nomCompletoContrib=''` |
| Search by Nombre | Page loaded | Select "Nombre", type "Empresa", click Buscar | Backend called with `@nomCompletoContrib='Empresa'`, `@codigo=''` |
| Search by RD number | Page loaded | Type "RD-00123" in N° RD field, click Buscar | Backend called with RD number filter |
| Search by date range | Page loaded | Set desde 2024-01-01, hasta 2024-12-31, click Buscar | Backend called with both date params |
| Combined filters | Page loaded | Set Código + fecha range + estado, click Buscar | Backend called with all filter params combined |
| Empty search | Page loaded | Click Buscar with all filters empty | Backend called with no filters, returns first page of all records |
| SP error | Backend call fails | Click Buscar | Error message shown, page does not crash |

### R2: Data Table

Table SHALL display columns: N° RD, Contribuyente, Fecha de emisión, Base imponible, Estado. Each row is clickable to open detail modal.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Renders data | Backend returns rows | Search completes or initial load | All five columns render for each row |
| Empty results | No RDs match filters | Search completes | Empty state message shown, pagination disabled |

### R3: Pagination

10 records/page default. Total count fetched from backend. Standard pagination controls.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Navigate pages | 25 RDs exist, page 1 shown | User clicks page 2 | Backend called with offset for records 11-20, same filters preserved |
| Count fails | Count endpoint returns error | Page loads | Pagination controls disabled, error shown |

### R4: Detail Modal

Clicking a row SHALL open a modal showing the full RD detail: all fields returned by the backend for that RD.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Open modal | Table has ≥1 row | User clicks a row | Detail modal opens with full RD information |
| Close modal | Modal is open | User clicks close button or overlay | Modal closes, table remains in current state |
| Print RD | Modal is open | User clicks print button | PDF generated and downloaded for the displayed RD |

### R5: PDF Print

The detail modal SHALL include a print/export button that generates a PDF of the RD.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Generate PDF | Detail modal open | User clicks print button | PDF file generated and browser download triggered |
| PDF unavailable | PDF generation fails | User clicks print button | Error message shown, modal remains open |

### R6: No Create/Edit Actions

Page MUST NOT include buttons or links for RD creation, modification, or appeal. Read-only interface.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No CRUD actions | Page loaded | User inspects UI | No "Nuevo", "Editar", "Derivar" or similar buttons present |

### R7: Backend Module

Controller, service, Zod DTOs, and types registered under `fiscalizacion-tributaria` module. Route prefix: `fiscalizacion-tributaria/consulta-rd-alcabala`. JwtAuthGuard required.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Module registered | Backend starts | Module loads | Controller, service, DTOs exist; controller guarded by JwtAuthGuard |
| Invalid input | Non-conforming data sent | POST to search endpoint | Zod DTO rejects, returns 400 with validation error |
| Valid search | Conforming request | Controller receives request | Service calls legacy SP via DatabaseService.executeProcedure |

### R8: Server Action

Server action file proxies search and count requests to backend using `authFetch` pattern.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Search proxy | Client calls action with filters + pagination | Action executes | Calls backend, returns results |
| Count proxy | Client calls action for total | Action executes | Calls backend count endpoint, returns count |

### R9: Initial Page Load

On navigation to the page, SHALL execute search with empty filters and return first page (records 1-10).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Initial load | User navigates to consulta-rd-alcabala | Page renders | First 10 RDs displayed with no filters applied |
