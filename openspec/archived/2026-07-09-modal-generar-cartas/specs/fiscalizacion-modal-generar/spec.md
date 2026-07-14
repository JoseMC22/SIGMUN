# fiscalizacion-modal-generar — Specification

## Purpose

Modal dialog for viewing contributor details and existing cartas de requerimiento. Triggered from the "Generar" button on the cartas-requerimiento page. This is a read-only view that prepares the operator for future carta generation.

## Requirements

### R1: Modal Trigger

The "Generar" button on each table row SHALL open the modal, passing the row's `codigo` as a prop.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Open modal | Table has ≥1 row | User clicks "Generar" on a row | Modal opens, `codigo` prop set to the row's codigo |
| Close modal | Modal is open | User clicks close button (×) or backdrop | Modal closes, parent state unchanged |
| Close modal keyboard | Modal is open | User presses Escape | Modal closes |

### R2: Contributor Info Display

Top section of the modal shows contributor data fetched via `SP_FISCA_CONTRIBUYENTE` with `@mquery='12'`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Load contributor | Modal opens with codigo | Modal mounts | Calls `getContribuyenteAction(codigo)`, displays full name + code |
| Display fields | SP returns data | Data loaded | Shows: Código (`codigo`) and Nombre Completo (`nombres paterno materno`) |
| Read-only | Modal is open | User interacts | All contributor fields are read-only, not editable |
| SP returns empty | Invalid codigo | Data loaded | Shows "Contribuyente no encontrado" message |
| SP fails | Network/DB error | Data loaded | Shows error message, carta table hidden |

### R3: Cartas Table

Bottom section shows existing cartas de requerimiento for the contributor.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Load cartas | Modal opens with codigo | Modal mounts | Calls `searchCartasAction(codigo, 1, 10)` |
| Display columns | SP returns rows | Data loaded | Columns: idCarta, NroCarta, Año, Día, Mes, Año(ye), Detalle, ROW |
| Total count | SP returns total | Data loaded | Results bar shows total cartas count |
| Empty cartas | No cartas exist | Data loaded | Shows "No hay cartas de requerimiento para este contribuyente" |

### R4: Cartas Pagination

10 records per page, same pattern as the main page.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Navigate page | Multiple pages exist | User clicks next page | Calls `searchCartasAction(codigo, newPage, 10)` |
| Page bounds | Page 1 shown | User clicks "Anterior" | Button disabled, no action |
| Total from SP | Cartas exist | Data loaded | Total from `SP_FISCA_CARTA_REQ` `@mquery='5'`, pagination derived |

### R5: Editar Button (Stub)

Each carta row SHALL render an "Editar" button that shows an alert for now.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Button renders | Cartas table has ≥1 row | Table renders | Each row shows "Editar" button |
| Click Editar | Carta row exists | User clicks "Editar" | Shows `alert("Modal por desarrollar")` |

### R6: Loading States

Modal SHALL show loading indicators during data fetch.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Initial load | Modal opens | Data fetching | Shows skeleton/spinner in both contributor and cartas sections |
| Contributor loading | Fetch in progress | While loading | Contributor section shows skeleton |
| Cartas loading | Fetch in progress | While loading | Cartas table shows skeleton rows |
| Refresh on page change | User navigates cartas page | New page requested | Only cartas table shows loading overlay |

### R7: Modal Layout

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Overlay | Modal opens | Render | Fixed position, z-50, backdrop blur, centered |
| Header | Modal renders | Layout | Title "Generar Carta de Requerimiento" + close (×) button |
| Content order | Modal renders | Layout | Top: contributor GroupField → Bottom: cartas table + pagination |
| Styling | Modal renders | Visual | Matches page patterns: slate colors, rounded-lg, border-slate-200 |

### R8: Backend Endpoints

Two new POST endpoints on the existing controller.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Contribuyente endpoint | Valid codigo | POST `/fiscalizacion-tributaria/cartas-requerimiento/contribuyente` | Calls SP with `@mquery='12'`, `@codigo='{codigo}'`, returns contributor info |
| Cartas endpoint | Valid codigo + pagination | POST `/fiscalizacion-tributaria/cartas-requerimiento/cartas` | Calls SP with `@mquery='4'` (data) and `@mquery='5'` (total), returns paginated cartas |
| Invalid input | Missing/invalid codigo | Either endpoint | Zod rejects, returns 400 |
| Unauthenticated | No JWT cookie | Either endpoint | JwtAuthGuard rejects, returns 401 |

### R9: Server Actions

Two new server actions in the existing action file.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| getContribuyenteAction | Client calls with codigo | Action executes | Calls backend contribuyente endpoint via authFetch |
| searchCartasAction | Client calls with codigo, page, pageSize | Action executes | Calls backend cartas endpoint via authFetch |
