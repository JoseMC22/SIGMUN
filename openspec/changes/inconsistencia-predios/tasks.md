# Tasks: Consulta de Inconsistencias de Predios

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1.190–1.320 (5 nuevos, 4 modificados) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (BE data/service ~400) → PR 2 (BE HTTP ~180) → PR 3 (FE core ~470) → PR 4 (FE export + límites ~240) |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base / target |
|------|------|-----------|---------------|
| 1 | Backend dominio + datos (DTO, types, service) | PR 1 | base = tracker `feat/inconsistencia-predios` |
| 2 | Backend HTTP (controller + combos) | PR 2 | base = PR 1 (`...-be-data`) |
| 3 | Frontend acción + página core (filtros, grilla, paginación, estados) | PR 3 | base = PR 2 (`...-be-http`) |
| 4 | Frontend export Excel + tests de límites/export | PR 4 | base = PR 3 (`...-fe-core`) |

## Slices (feature-branch-chain)

> Tracker `feat/inconsistencia-predios` (ya en checkout) acumula la integración; **solo el tracker** mergea a main. Cada PR hijo apunta al branch del PR inmediato anterior para que el diff no arrastre trabajo previo. El tracker se mantiene como draft/no-merge hasta integrar todos los hijos.

### PR 1 — `feat(inconsistencia): add predios search DTO, types and service layer`

- Branch: `feat/inconsistencia-predios-be-data` · Target: `feat/inconsistencia-predios`
- Tasks: 1.1–1.8
- Verificación: `pnpm --filter backend test -- predios-inconsistencia`
- Rollback: revert del PR; el scaffold placeholder de `types.ts`/`service.ts` se recupera sin tocar controller ni frontend.
- Estimado: ~400 líneas.

### PR 2 — `feat(inconsistencia): expose predios search and combos HTTP endpoints`

- Branch: `feat/inconsistencia-predios-be-http` · Target: `feat/inconsistencia-predios-be-data`
- Tasks: 2.1–2.3
- Verificación: `pnpm --filter backend test -- predios-inconsistencia`
- Rollback: revert del PR; el service del PR 1 queda intacto (API sin consumidor).
- Estimado: ~180 líneas.

### PR 3 — `feat(inconsistencia): add predios page with filters, grid and pagination`

- Branch: `feat/inconsistencia-predios-fe-core` · Target: `feat/inconsistencia-predios-be-http`
- Tasks: 3.1–3.5
- Verificación: `pnpm --filter frontend test`
- Rollback: revert del PR; vuelve el placeholder de `page.tsx`; los endpoints backend siguen disponibles.
- Estimado: ~470 líneas (slice más grande; monitorear antes de abrir).

### PR 4 — `feat(inconsistencia): add client-side Excel export and pagination tests`

- Branch: `feat/inconsistencia-predios-fe-export` · Target: `feat/inconsistencia-predios-fe-core`
- Tasks: 4.1–4.3
- Verificación: `pnpm --filter frontend test`
- Rollback: revert del PR; la página core conserva búsqueda y grilla sin exportación.
- Estimado: ~240 líneas.

## Phase 1 — Backend dominio y datos (PR 1)

- [x] 1.1 RED — Crear `backend/src/inconsistencia/predios/predios-inconsistencia.service.spec.ts` (mock `DatabaseService`) con tests que fallan: `resolveMsquery` (5 casos), fuera del mapa, `gridRange`, `exportRange`, `resolveRange`, `buildTotalParams`, `readTotal`, mapeo 13 columnas. *Acepta: Req. "Verificabilidad" / Scenario "Tests unitarios del servicio".*
- [x] 1.2 Crear `backend/src/inconsistencia/predios/dto/search-inconsistencia-predios.dto.ts` — Zod `{ idAcceso: string.min(1), anno: coerce.number.int.min(1998), page: int.min(1).default(1), pageSize: int.min(1).max(100000).default(10) }`. *Acepta: Req. "Contrato API" / Scenario "Búsqueda válida".*
- [x] 1.3 Modificar `predios-inconsistencia.types.ts` — `PredioInconsistenciaRow` con las 13 columnas exactas incl. `direcion`; `PaginatedResponse<T>`, `TipoInconsistenciaOption`, `UsoPredioOption`, `SpTipoInconsistenciaRow`, `SpUsoPredioRow`; eliminar `PrediosInconsistenciaResult`. *Acepta: Req. "Grilla de resultados" / Scenario "Columnas de la grilla".*
- [x] 1.4 GREEN — Implementar service: `TIPO_MSQUERY_MAP`, `GRID_PAGE_SIZE=10`, `EXPORT_MAX_ROWS=100000`, `TOTAL_MSQUERY=2`, `TOTAL_CALL_INCLUDE_FILTERS`, `gridRange`/`exportRange`/`resolveRange`, `readTotal` posicional, `col<T>` genérico, `buildTotalParams`, `search`, `getTiposInconsistencia`, `getUsosPredio` (SQL estático). *Acepta: Req. "Búsqueda de datos", "Cálculo del total", "Combo tipo de uso", "Seguridad".* *(El total fijo `TOTAL_MSQUERY=2` se eliminó en la corrección 6.2: el total es por tipo, `select + 1`.)*
- [x] 1.5 Corregir tipo de retorno de `resolveMsquery` — declarar `number | undefined` (o `never` con throw) para conciliar la firma con el caso fuera del mapa; `search` lanza `BadRequestException` y NO invoca el SP. *Acepta: Req. "Combo tipo de inconsistencia" / Scenario "id_acceso fuera del mapa".*
- [x] 1.6 Corregir `buildTotalParams` — si `TOTAL_CALL_INCLUDE_FILTERS`, usar el rango COMPLETO `1..EXPORT_MAX_ROWS` (no el rango de la página) para que el total sea independiente de la página; test que lo fija. *Acepta: Req. "Cálculo del total".* *(El total ya no es fijo ni independiente del tipo: ver corrección 6.2 — usa el branch de COUNT del tipo, `select + 1`.)*
- [x] 1.7 Verificar `totalPages = ceil(total / GRID_PAGE_SIZE)` siempre con 10, aun con `pageSize=100000`; test que lo fija. *Acepta: Req. "Paginación".*
- [x] 1.8 Verificación del slice: `pnpm --filter backend test -- predios-inconsistencia`.

## Phase 2 — Backend HTTP (PR 2)

- [x] 2.1 RED — Crear `predios-inconsistencia.controller.spec.ts` (`TestingModule` + `overrideGuard(JwtAuthGuard)`): body inválido (`page:0`, `anno` no numérico, `pageSize:100001`) → `BadRequestException`; body válido delega al service; combos → `{success:true,data}`; propaga `BadRequestException` del service. *Acepta: Req. "Contrato API" / Scenarios "Body inválido", "Acceso sin token".*
- [x] 2.2 GREEN — Modificar controller: reemplazar stub `@Get()` por `@Post('search')` con `Schema.parse()`, `@Get('combos/tipos')` y `@Get('combos/usos')`, bajo `@UseGuards(JwtAuthGuard)`. *Acepta: Req. "Contrato API".*
- [x] 2.3 Verificación del slice: `pnpm --filter backend test -- predios-inconsistencia`.

## Phase 3 — Frontend acción y página core (PR 3)

- [x] 3.1 Crear `frontend/src/actions/inconsistencia/predios.ts` — `searchInconsistenciasAction({idAcceso,anno}, page=1, pageSize=10)`, `getTiposInconsistenciaAction`, `getUsosPredioAction`; `authFetch` con cookie `SIGMUN_AUTH`; nunca lanzan (`{success:false,error}`). *Acepta: Req. "Contrato API".*
- [x] 3.2 RED — Crear `frontend/src/app/dashboard/inconsistencia/predios/page.test.tsx` (mock del módulo de actions): orden de controles, años vigente→1998 desc, `uso` nunca enviado, 13 columnas incl. `direcion`, loading/empty/error+Reintentar, cambio de página re-invoca con `page=2`. *Acepta: Req. "Filtros de criterios", "Combo año", "Combo tipo de uso", "Estados de UI", "Paginación".*
- [x] 3.3 GREEN — Reescribir `page.tsx` (`"use client"`): 5 controles en orden tipo→año→uso→Buscar→Exportar; años current→1998 desc; grilla fija en 20; paginador Anterior/Siguiente; skeleton/empty/error con Reintentar. *Acepta: Req. "Filtros de criterios", "Estados de UI".*
- [x] 3.4 Corregir secuenciación de mocks del test de límites de paginación — el flujo dispara 3 llamadas (mount, Siguiente, página 3) pero se encolan 2; encolar una tercera `mockResolvedValueOnce` o saltar de página 1 a la última; verificar Anterior deshabilitado en p1 y Siguiente en la última. *Acepta: Req. "Paginación" / Scenario "Límites".*
- [x] 3.5 Verificación del slice: `pnpm --filter frontend test`.

## Phase 4 — Frontend export y cierre (PR 4)

- [x] 4.1 RED — Extender `page.test.tsx`: al exportar se invoca el action con `pageSize=EXPORT_MAX_ROWS` y se exportan TODAS las filas devueltas (no solo 10); el action recibe SOLO `{ idAcceso, anno }` (sin `uso`). *Acepta: Req. "Exportar a Excel", "Combo tipo de uso" / Scenario "El uso no afecta la búsqueda".*
- [x] 4.2 GREEN — Implementar `fetchAllFilteredRecords()` + `exportToExcel()` con `xlsx@0.18.5` (dynamic import, `json_to_sheet`, `writeFile('inconsistencia-predios-{anno}-{idAcceso}.xlsx')`), sin endpoint backend de Excel. *Acepta: Req. "Exportar a Excel" / Scenarios "Descarga del archivo", "Sin endpoint backend".*
- [x] 4.3 Verificación del slice: `pnpm --filter frontend test`.

## Phase 5 — Verificación final

- [x] 5.1 `pnpm --filter backend test` — suites enfocadas del módulo verdes (38/38). Los fallos de la suite completa son **pre-existentes** (baseline `d1b7762`: 30 fallidos, Δ0).
- [x] 5.2 `pnpm --filter frontend test` — suite enfocada del módulo verde (11/11). Los fallos de la suite completa son **pre-existentes** (baseline: 18 fallidos, Δ0).
- [x] 5.3 Build backend OK. **Lint backend bloqueado por deuda pre-existente** (`backend/eslint.config.mjs` ausente, repo-wide); typecheck FE con errores pre-existentes fuera del módulo.
- [x] 5.4 Revisar ítems de verificación del design: `TOTAL_CALL_INCLUDE_FILTERS`, columna de total posicional, export real de todo el filtro, y desviación conocida del 401 del `JwtAuthGuard` (fuera de alcance). *Acepta: design "Verification Items".* *(Parcial: los ítems de la llamada de total quedaron resueltos con evidencia real de BD en la corrección 6.2; ver design Verification Items actualizado.)*

## Phase 6 — Corrección post-verify: total por tipo (real-DB)

> Evidencia real de `Base_sigmun` (anno=2026): `[Rentas].[sp_inconsistencias]` tiene un branch de COUNT POR TIPO — datos→conteo: `30.01.01→2` (2290), `30.01.02→4` (54), `30.01.03→6` (16), `30.01.04→8` (346), `30.01.05→10` (139). El total SIEMPRE es `selectMsquery + 1`. El COUNT ignora `@inicio`/`@final` (rango comentado) y usa `@anno` (año vigente si vacío). La columna de conteo no tiene nombre → lectura posicional. El `TOTAL_MSQUERY=2` fijo causaba 229 páginas para cualquier tipo (correcto solo para `30.01.01`).

- [x] 6.1 RED — Actualizar `predios-inconsistencia.service.spec.ts`: el total DEBE usar el branch de COUNT del tipo — import de `TOTAL_MSQUERY_MAP`/`resolveTotalMsquery` (no existen aún), tabla `it.each` de los 5 tipos (`select + 1`), derivación del mapa, `undefined` fuera del mapa, y llamada de total en `search` por tipo (`30.01.03` → datos 5 / COUNT 6; `30.01.05` → datos 9 / COUNT 10). *Acepta: Req. "Cálculo del total" / Scenario "Total por tipo".*
- [x] 6.2 GREEN — Implementar en el service: eliminar `TOTAL_MSQUERY=2`; agregar `TOTAL_MSQUERY_MAP` derivado de `TIPO_MSQUERY_MAP` (+1) y `resolveTotalMsquery`; `buildTotalParams(selectMsquery, anno)` envía `msquery = selectMsquery + 1`; `TOTAL_CALL_INCLUDE_FILTERS` se mantiene `true`; comentarios actualizados con la evidencia. *Acepta: Req. "Cálculo del total" / Scenario "Total por tipo" y "El conteo es del tipo seleccionado".*
- [x] 6.3 Verificación de la corrección: `pnpm --filter backend test -- predios-inconsistencia` (47/47, +9 tests) · `pnpm --filter frontend test -- inconsistencia/predios` (11/11, sin cambios) · `pnpm --filter backend build` (exit 0).

## Dependencias

`1.1→1.4` (TDD) · `1.2–1.4` antes de `2.x` · `2.2` antes de `3.1` · `3.1` antes de `3.3`/`4.2` · `3.4`/`4.1` extienden `3.2` · `5.x` al final.
