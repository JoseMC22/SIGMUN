# Proposal: Modal Generar Cartas

## Intent

The "Cartas de Requerimiento" page has a "Generar" button per row that currently shows `alert("Modal por desarrollar")`. Operators need to view contributor details and existing cartas before generating a new carta de requerimiento. This change replaces the alert with a functional modal that fetches and displays contributor data + paginated carta history.

## Scope

### In Scope
- Backend: 2 new endpoints (contributor info, cartas list with pagination)
- Backend: 2 new service methods calling `SP_FISCA_CONTRIBUYENTE` (mquery=12) and `SP_FISCA_CARTA_REQ` (mquery=4/5)
- Backend: New Zod DTOs + types for contributor and carta responses
- Frontend: New `modal-generar.tsx` client component with own state management
- Frontend: 2 new server actions (contributor info, cartas list)
- Frontend: Modify page.tsx to integrate modal, replace alert

### Out of Scope
- "Editar" button functionality in the modal table (stub alert only)
- Actual carta generation/creation logic
- Backend endpoints for carta CRUD

## Capabilities

### New Capabilities
- `fiscalizacion-modal-generar`: Modal for viewing contributor info and existing cartas before generating a carta de requerimiento

### Modified Capabilities
- `fiscalizacion-cartas-requerimiento`: R4 (Generar Button) changes from "opens modal (out of scope)" to "opens modal with contributor data and carta history"

## Approach

Follow the exact same backend pattern as the existing `search` endpoint: controller + service + Zod DTO + types. Frontend follows the existing server action pattern (`authFetch` proxy). The modal is a self-contained client component that receives `codigo` as prop, fetches its own data on open via the new server actions, and manages its own loading/pagination state independently from the parent page.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.controller.ts` | Modified | Add 2 new POST endpoints |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.service.ts` | Modified | Add `getContribuyente()` and `searchCartas()` methods |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.types.ts` | Modified | Add `ContribuyenteInfo`, `CartaRequerimientoRow` interfaces |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/dto/search-cartas-requerimiento.dto.ts` | Modified | Add `GetContribuyenteSchema`, `SearchCartasSchema` DTOs |
| `frontend/src/actions/fiscalizacion-tributaria/cartas-requerimiento.ts` | Modified | Add 2 new server actions |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/modal-generar.tsx` | New | Modal component |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/page.tsx` | Modified | Replace alert with modal integration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP_FISCA_CARTA_REQ (mquery=4) returns unexpected column names | Low | Map columns defensively, log raw response during dev |
| Contributor SP (mquery=12) returns empty for invalid codigo | Low | Handle empty state in modal UI |
| Modal state conflicts with parent page state | Low | Modal manages all its own state independently |

## Rollback Plan

Revert the 7 files changed. The "Generar" button returns to showing the alert. No database changes involved — all changes are application-layer only.

## Dependencies

- None (SPs already exist in the database)

## Success Criteria

- [ ] Clicking "Generar" opens a modal with contributor name + code
- [ ] Modal shows paginated table of existing cartas (10/page)
- [ ] Contributor info loads independently from carta list
- [ ] Modal closes cleanly, no state leaks to parent
- [ ] "Editar" button in modal table shows alert (stub)
- [ ] Loading and empty states render correctly
- [ ] Backend endpoints validate input with Zod and return correct SP params
