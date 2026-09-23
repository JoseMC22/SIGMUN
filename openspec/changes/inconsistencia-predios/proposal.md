# Proposal: Consulta de Inconsistencias de Predios

## Intent

Los operadores de SAT ICA necesitan una pantalla para detectar predios con inconsistencias (diferencias entre el padrón y la declaración) por tipo de inconsistencia y año. Hoy solo existe un scaffold placeholder (backend y frontend) sin datos reales ni SP conectado. Este cambio reemplaza ese scaffold con la implementación real sobre `Rentas.sp_inconsistencias`, replicando el patrón de `reportes-gerenciales/predios-por-uso`.

## Scope

### In Scope
- Backend: `POST search` + 2 endpoints de combos + Zod DTO + service → `Rentas.sp_inconsistencias` (`@msquery`, `@anno`, `@inicio`, `@final`)
- Frontend: página "use client" con header de filtros y grilla de resultados paginada (10 por página)
- Combos: tipo de inconsistencia (SP/SQL), año (generado en frontend 2026→1998 desc), tipo de uso (solo visual, NO filtra)
- Exportación a Excel client-side con `xlsx@0.18.5`
- Estados loading (skeleton), empty, error, y datos
- TDD: tests backend (Jest) + frontend (Vitest)

### Out of Scope
- Modal de detalle, PDF/impresión, endpoint backend de Excel
- Endpoints muertos `/detail` y `/uso-options` del reporte homólogo (NO replicar)
- Edición/creación/eliminación de predios
- Nuevos SPs o cambios en BD; seeding de menú/BD (follow-up)

## Capabilities

### New Capabilities
- `inconsistencia-predios`: consulta paginada de inconsistencias de predios con filtros (tipo de inconsistencia, año) y combos; export Excel client-side

### Modified Capabilities
- None — cambio autónomo, reemplaza scaffold sin afectar specs existentes

## Stored Procedure Contract — `Rentas.sp_inconsistencias`

Parámetros: `@msquery` (int), `@anno` (int), `@inicio` (int), `@final` (int).

- **Llamada de datos** (grilla): `@msquery` mapeado del tipo de inconsistencia — `30.01.01→1`, `30.01.02→3`, `30.01.03→5`, `30.01.04→7`, `30.01.05→9`; `@anno` = año seleccionado; `@inicio`/`@final` = rango de filas de la página (p1: 1–10, p2: 11–20, …).
- **Llamada de total**: `@msquery = 2`, **sin** el tipo. Devuelve el total de registros para calcular páginas.

Columnas del result set (nombres exactos, incluida la errata `direcion`):
`codigo, nombre, cod_pred, anexo, sub_anexo, direcion, uso, area_terreno, porcen_propiedad, val_total_terreno, val_total_constru, total_autoavaluo, ROW`.

## API Surface

- `POST /inconsistencia/predios/search` — body `{ idAcceso: string, anno: number, page: number, pageSize: number = 10 }` → `PaginatedResponse<PredioInconsistenciaRow>` `{ data, total, page, pageSize, totalPages }`. Zod `.parse()` en el controller.
- `GET /inconsistencia/predios/combos/tipos` → `{ success: true, data: [{ id_acceso, nombre }] }` — `SELECT id_acceso, nombre FROM Acceso.Macceso WHERE id_acceso LIKE '30.01.%' AND nestado = '3'`.
- `GET /inconsistencia/predios/combos/usos` → `{ success: true, data: [{ id_uso, uso }] }` — `SELECT id_uso, uso FROM Contenedor.TblUsoPredio WHERE tipo_pred = 1 ORDER BY uso` (solo visual).
- Todos bajo `JwtAuthGuard`. Envoltorio de error canónico (`code`/`message`/`details`).

## UI/UX Outline

- Header (gradiente SAT navy): sección de criterios con, en orden, combo **tipo de inconsistencia**, combo **año**, combo **tipo de uso** (display-only), botón **Buscar**, botón **Exportar a Excel**.
- Sección inferior: grilla paginada (10 filas), barra de resultados y paginador (Anterior/Siguiente + páginas).
- Tokens `sat-navy`/`sat-cyan`/`font-outfit`, iconos `lucide-react`, skeleton de carga, estados empty ("No se encontraron resultados") y error con Reintentar.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/inconsistencia/predios/predios-inconsistencia.controller.ts` | Modified | Reemplaza stub `@Get()` por `@Post('search')` + combos |
| `backend/src/inconsistencia/predios/predios-inconsistencia.service.ts` | Modified | Llama `sp_inconsistencias` (datos + total) y combos |
| `backend/src/inconsistencia/predios/predios-inconsistencia.types.ts` | Modified | Tipos de fila reales + `PaginatedResponse<T>` |
| `backend/src/inconsistencia/predios/dto/` | New | Zod schema de búsqueda + tipos |
| `frontend/src/actions/inconsistencia/predios.ts` | New | Server action (`authFetch` con cookie `SIGMUN_AUTH`) |
| `frontend/src/app/dashboard/inconsistencia/predios/page.tsx` | Modified | Reemplaza placeholder por pantalla real |
| `backend/src/inconsistencia/predios/predios-inconsistencia.module.ts` | Unchanged | Ya registrado en `app.module.ts` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Total (`@msquery=2`) NO respeta el filtro de tipo → conteo de páginas discrepa de la grilla | High | **Decisión: replicar comportamiento legacy (confirmado por PO).** Documentar como limitación conocida; verificar en fase de verify con datos reales |
| Nombre exacto de la columna de total devuelta por `@msquery=2` es desconocido | Med | Leer defensivamente el primer valor del primer registro (lookup case-insensitive), igual que helper `col()` de predios-uso |
| Combos definidos como SQL crudo vs. convención "todo vía SP" | Med | Preferir SP equivalente si existe; si no, `DatabaseService.query` con SQL estático parametrizado (sin input de usuario, sin concatenación) |
| Mapeo `id_acceso → @msquery` hardcodeado; nuevos accesos rompen el mapeo | Low | Tabla de mapeo explícita + fallback documentado; registrar como open question |

## Rollback Plan

`git revert` del commit del cambio. No hay migraciones ni cambios en BD ni en otros módulos; el scaffold previo se recupera con el revert. Sin efectos secundarios persistentes (SP es de solo lectura).

## Dependencies

- `Rentas.sp_inconsistencias` funcional en BD destino con los 4 parámetros.
- `Acceso.Macceso` y `Contenedor.TblUsoPredio` accesibles para los combos.
- `DatabaseModule` (`@Global()`) ya inyectable como `DatabaseService`.

## Open Questions

1. ¿La llamada de total (`@msquery=2`) requiere `@anno` y/o `@inicio`/`@final`, o solo `@msquery`?
2. Nombre exacto de la columna de conteo en `@msquery=2` (se leerá defensivamente hasta confirmarlo).
3. ¿Los combos de tipo de inconsistencia y tipo de uso usan SP existente o SQL directo parametrizado?
4. ¿El tipo de inconsistencia es obligatorio para buscar, o hay un valor "todos"/default?
5. Comportamiento ante un `id_acceso` fuera del mapa (fallback o error de validación).
6. ¿Seeding del submenú en BD queda como follow-up?

## Success Criteria

- [ ] La página carga con header de filtros (tipo, año, uso) y grilla paginada de 10 filas
- [ ] "Buscar" dispara datos (`@msquery` mapeado + `@anno` + rango de página) y el total para el paginador
- [ ] El combo de año va del año actual a 1998 (desc); el combo de uso se muestra pero no filtra
- [ ] "Exportar a Excel" descarga `.xlsx` con los registros filtrados (client-side)
- [ ] Estados loading/empty/error renderizan; tests backend (Jest) y frontend (Vitest) pasan
