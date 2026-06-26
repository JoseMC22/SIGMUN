# Proposal: Predios por Uso — Submenú en Reportes Gerenciales

## Intent

Agregar el submenú "Predios por Uso" bajo "Reportes Gerenciales" para que usuarios de SAT ICA puedan consultar predios agrupados por uso, con filtros por código, año y tipo de uso. El submenú ya existe en BD pero no tiene implementación backend ni frontend.

## Scope

### In Scope
- Backend module `reportes-gerenciales/` con controller, service y DTOs que invoca `[Rentas].[Rpt_Rentas_General]` (`@BUSC=1`, `@CODIGO`, `@anno`, `@uso`)
- Frontend page monolítica "use client" con filtros (codigo, anno, uso) y tabla de resultados paginada
- Server action (`predios-uso.ts`) como proxy auth
- Estados loading (skeleton), empty, error, y datos
- Registro de `ReportesModule` en `app.module.ts`
- TDD estricto: tests backend (Jest) + frontend (Vitest)

### Out of Scope
- Exportación de datos (Excel/PDF)
- Edición, creación o eliminación de predios
- Dashboard o gráficos agregados
- Roles, permisos o autenticación (JwtAuthGuard existente cubre)
- Nuevos SPs o cambios en BD
- Otros reportes gerenciales (este es el primero)

## Capabilities

### New Capabilities
- `reportes-predios-uso`: consulta paginada de predios agrupados por uso con filtros (código, año, uso)

### Modified Capabilities
- None — cambio autónomo, no afecta specs existentes

## Approach

Replicar patrón exacto de `accesos-submenu`:

1. **Backend**: `ReportesModule` → `PrediosUsoController` (GET search) → `PrediosUsoService` (ejecuta SP, mapea resultados) → DTOs Zod
2. **Frontend**: Página `reportes-gerenciales/predios-por-uso/page.tsx` ("use client") con tabla, filtros, paginador. Server action serializa cookies y llama al backend
3. **Validación**: Zod schema para parámetros de búsqueda

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.controller.ts` | New | POST search con JwtAuthGuard |
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.service.ts` | New | Llama `Rpt_Rentas_General` (busc=1) |
| `backend/src/reportes-gerenciales/predios-por-uso/dto/` | New | Zod schema + tipos |
| `backend/src/reportes-gerenciales/reportes-gerenciales.module.ts` | New | Module agrupador |
| `backend/src/app.module.ts` | Modified | Importar ReportesModule |
| `frontend/src/actions/reportes-gerenciales/predios-uso.ts` | New | Server action search |
| `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/page.tsx` | New | Página "use client" con filtros y tabla |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Columnas retornadas por SP no coinciden con DTO previsto | Medium | Verificar columnas del SP antes de implementar; DTO flexible |
| ReportesModule es nuevo — sin patrón previo de reportes | Low | Seguir misma estructura que `seguridad/` módulos existentes |
| Sin datos en BD para desarrollo | Low | Usar datos mock en tests; SP retorna vacío sin error |

## Rollback Plan

Revertir commit del cambio. No hay migraciones BD, cambios en tablas ni modificaciones a otros módulos — `git revert` limpio.

## Dependencies

- SP `[Rentas].[Rpt_Rentas_General]` con `@BUSC=1` funcional en BD destino
- Submenú "Predios por Uso" registrado en BD bajo módulo "Reportes Gerenciales"

## Success Criteria

- [ ] Página carga con filtros vacíos y tabla paginada con datos del SP
- [ ] Filtros (código, año, uso) modifican la consulta correctamente
- [ ] Estados loading (skeleton), empty ("sin resultados"), y error se renderizan
- [ ] Tests backend pasan (Jest, mockeando SP)
- [ ] Tests frontend pasan (Vitest, estados loading/empty/error)
