# Proposal: Implementar valores vehicular

## Intent

El submódulo "Valores Vehicular" gestiona los montos/tarifas del impuesto vehicular. Cada valor se asocia a una combinación de: año ejercicio, categoría, marca, modelo y año del vehículo. Reemplaza la funcionalidad PHP legacy con una implementación NestJS + Next.js moderna siguiendo el patrón exacto del submódulo `modelos`.

## Scope

### In Scope

- Backend: `backend/src/impuesto-vehicular/valores/` — controller, service, DTOs, tests
- Backend: Registrar `ImpuestoVehicularModule` en `app.module.ts`
- Frontend: Server actions (`valores.ts`), list page (`valores-vehicular/page.tsx`), edit modal (`valor-edit-modal.tsx`), tests
- 6 stored procedures (contar, listar, buscar, grabar, validar, modelo-filtro)
- 4 visual states: loading, empty, error+retry, populated

### Out of Scope

- Sidebar navigation (ya registrado)
- Database SP creation (ya existen en la BD)
- Modelos sub-module (branch separada feat/modelos)
- Otros submódulos del impuesto vehicular

## Capabilities

### New Capabilities

- `impuesto-vehicular-valores`: CRUD de valores vehiculares con búsqueda paginada, catálogos en cascada, y eliminación lógica. Operaciones vía stored procedures.

### Modified Capabilities

- None

## Approach

Sub-módulo standalone dentro de `ImpuestoVehicularModule`, mismo patrón que `modelos`. Crear módulo desde cero en feat/valores-vehicular (sin mergear modelos primero). Backend: NestJS controller/service con Zod DTOs, SP invocation via mssql driver. Frontend: Server actions con authFetch, list page server component, edit modal client component con cascading combos (categoría → marca → modelo).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/impuesto-vehicular/valores/` | New | Controller, service, DTOs, tests |
| `backend/src/impuesto-vehicular/impuesto-vehicular.module.ts` | New | Module registration with ValoresController/Service |
| `backend/src/app.module.ts` | Modified | Add ImpuestoVehicularModule import |
| `frontend/src/actions/valores.ts` | New | Server actions |
| `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/` | New | Page, edit modal, tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP column names differ from expected | Low | Verify via DB query before backend implementation |
| PHP pagination formula differs from seguridad modules | Medium | Confirm `inicio/fin` boundary before implementing pagination |
| Auth cookie/permissions not wired | Low | Follow authFetch + @UseGuards(JwtAuthGuard) pattern from modelos |

## Rollback Plan

- Backend: `git checkout -- backend/src/impuesto-vehicular/valores/` + revert `app.module.ts`
- Frontend: `git checkout -- frontend/src/actions/valores.ts` + `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/`
- Branch isolation: all changes on feat/valores-vehicular, zero impact on main

## Dependencies

- DB stored procedures existentes (verificar nombres exactos contra catálogo SQL Server)
- JWT auth middleware operativo

## Success Criteria

- [ ] Backend tests pasan: `pnpm --filter backend test`
- [ ] Frontend tests pasan: `pnpm --filter frontend test`
- [ ] Endpoints responden con error envelope canónico en validación
- [ ] Catálogos en cascada funcionan (categoría → marca → modelo)
