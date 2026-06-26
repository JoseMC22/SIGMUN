# Proposal: Mantenimiento de Vías

## Intent

New "Mantenimiento de Vías" submenu under the existing "Administración Tributaria" module. Provides a search/filter page with a GroupField (código, zona, estado), a table of users from `acceso.tblusuarios`, and two modal-trigger buttons ("Detalle de Urbanización", "Detalle de Vía").

## Scope

### In Scope
- DB stored procedure wrapping `SELECT vlogin FROM acceso.tblusuarios`
- New backend module `mantenimiento-vias/` (controller, service, DTOs, Zod schemas)
- New frontend page at `dashboard/mantenimiento-vias/page.tsx` following `seguridad/usuarios` pattern
- New Server Action (`src/actions/mantenimiento-vias.ts`) using `authFetch()`
- GroupField filter with inputs: código, zona, and estado (Activo/Inactivo) select
- Table displaying user vlogin data (paginated)
- Two modal components: "Detalle de Urbanización" and "Detalle de Vía"
- DB row for the new submenu linked to "Administración Tributaria" module
- Tests (strict TDD: Jest backend, Vitest frontend)

### Out of Scope
- Full CRUD for vías or urbanizaciones data
- Edits, deletes, or inline actions on the user table
- Changes to existing modules or components outside `mantenimiento-vias/`

## Capabilities

### New Capabilities
- `mantenimiento-vias`: search/filter page for street maintenance data with user vlogin table and detail modals.

### Modified Capabilities
- None.

## Approach

1. Create DB stored procedure (pattern: `[dbo].[sp_MantenimientoVias]`) returning `SELECT vlogin FROM acceso.tblusuarios`.
2. Add submenu row in the menu table linked to "Administración Tributaria" module (`doform2 = "mantenimiento-vias"`).
3. Build backend module: controller (`POST /api/mantenimiento-vias/search`), service (calls SP via `DatabaseService.executeProcedure()`), DTO with Zod validation.
4. Build frontend page: `"use client"` with useState for filters + data, Server Action for fetch, GroupField filter card, paginated table, two modal buttons.
5. Implement both modals as shadcn/ui `<Dialog>` components (content TBD — opened on button click).
6. Write backend Jest tests + frontend Vitest tests first (TDD).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/mantenimiento-vias/` | New | Module: controller, service, DTOs |
| `backend/src/app.module.ts` | Modified | Register nuevo módulo |
| `frontend/app/dashboard/mantenimiento-vias/` | New | Page + components |
| `frontend/src/actions/mantenimiento-vias.ts` | New | Server Action |
| Database — new SP | New | `SELECT vlogin FROM acceso.tblusuarios` |
| Database — menu table | New | Submenu row linked to Adm. Tributaria |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unknown parent module ID for Adm. Tributaria | High | Query DB first; add migration note in spec |
| Undefined modal content for both "Detalle" modals | High | Scaffold empty modals; content defined in follow-up |
| New DB SP conflicts with existing naming | Low | Follow existing SP naming convention |

## Rollback Plan

- Remove new frontend page directory and action file
- Remove backend module files + revert `app.module.ts`
- Drop the new stored procedure
- Delete the submenu DB row
- Revert test files

## Dependencies

- Existing `DatabaseService.executeProcedure()` and `JwtAuthGuard` infrastructure
- NestJS module registration pattern
- shadcn/ui Dialog component (already in project)

## Success Criteria

- [ ] Page renders at `/dashboard/mantenimiento-vias` with GroupField filter
- [ ] Table loads and paginates user vlogin data from the SP
- [ ] "Detalle de Urbanización" button opens a modal
- [ ] "Detalle de Vía" button opens a modal
- [ ] Backend tests pass (Jest)
- [ ] Frontend tests pass (Vitest)
