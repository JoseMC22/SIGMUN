# Design: Consulta de Inconsistencias de Predios

## Technical Approach

Reemplazar el scaffold placeholder por una implementación real que replica el patrón de `reportes-gerenciales/predios-por-uso`: controller NestJS (`@Post('search')` + combos bajo `JwtAuthGuard`), service que invoca `[Rentas].[sp_inconsistencias]` (datos con paginación server-side por rango de filas y total con el **branch de COUNT del tipo**: `selectMsquery + 1`), Zod DTO en `dto/`, y página Next.js `"use client"` con server action como proxy autenticado. El módulo `inconsistencia/` ya está registrado en `app.module.ts`; no se toca.

**Exportación a Excel:** la grilla queda fija en 10 filas por página; el botón exporta **todos los registros que cumplen el filtro actual**, no la página visible. Para eso la exportación re-consulta el SP con un rango completo (`@inicio=1`, `@final=EXPORT_MAX_ROWS`), igual que el `fetchAllRecords()` de `predios-por-uso/page.tsx`.

## Architecture Decisions

| Decisión | Elección | Alternativas / rationale |
|---|---|---|
| Rango de la grilla | `gridRange(page)`: `@inicio=(page-1)*10+1`, `@final=page*10`, con `GRID_PAGE_SIZE = 10` | La spec fija la grilla en 10 filas. La grilla NUNCA usa otro tamaño; ver Warning 5 abajo. |
| Rango de exportación | `exportRange()`: `@inicio=1`, `@final=EXPORT_MAX_ROWS` (`=100000`) | Es la **única** ruta con rango amplio. Re-consulta completa del filtro actual (Blocker 1). |
| Selección de rango | `resolveRange(page, pageSize)`: `pageSize > GRID_PAGE_SIZE ? exportRange() : gridRange(page)` | Un solo punto de decisión; el discriminador es el `pageSize` enviado por el frontend. Los dos caminos no se confunden porque cada uno tiene su constante y su helper propios. |
| `pageSize` del DTO | `z.coerce.number().int().min(1).max(100000).default(10)` | Se elimina el tope 20 (contradecía la exportación). Se alinea con el reference (`.max(100000)`); el default de grilla es 10. |
| `totalPages` | `ceil(total / GRID_PAGE_SIZE)` siempre con 10, aun si `pageSize=EXPORT_MAX_ROWS` | La paginación es del grid; no debe depender del tamaño de la re-consulta. |
| `idAcceso → @msquery` | `TIPO_MSQUERY_MAP` + `resolveMsquery()` pura; fuera del mapa → `BadRequestException`, sin invocar el SP | El mapeo es dominio, no presentación. |
| Llamada de total (Q1, corregida) | Enviar el set completo `{ msquery: selectMsquery + 1, anno, inicio, final }` (branch de COUNT del tipo), gobernado por `TOTAL_CALL_INCLUDE_FILTERS` | **Corregido 2026-09-23 con evidencia de BD real**: el total ya NO es fijo `@msquery=2`; cada tipo tiene su propio COUNT (`select+1`). El COUNT ignora `@inicio`/`@final` (rango comentado) y usa `@anno`. Ver Decisions Log #9. |
| Columna de total (Q2) | Lectura **posicional**: `Object.values(recordset[0])[0]` (primer valor del primer registro) | Mecanismo único y defensivo; no se usa lookup por nombre para el total. |
| Combos (Q3) | SQL estático sin parámetros vía `DatabaseService.query` | Sin input de usuario → sin concatenación. Si existe SP equivalente, se prefiere (cambio localizado). |
| Ayudante de columnas | `col<T>(row: Record<string, unknown>, name: string): T \| undefined` genérico y case-insensitive | Cumple `CODING.md` (prohibido `any`). Solo para las 13 columnas de datos. |
| `anno` en el DTO | `z.coerce.number().int().min(1998)` | `1998` es el límite inferior del combo según la spec; se elimina `.max(2100)` por ser un valor inventado (ver Decisions Log #7). |
| Errores | `BadRequestException({ code:'validation_error', message:'Validation failed', details:{ errors } })` | Envelope canónico de `API.md`; se rechaza el `{ success:false, error }` de `mantenimiento-vias`. |
| Export Excel | Client-side con `xlsx@0.18.5` sobre la re-consulta completa del filtro | Decidido (no open question); alternativa página-solo descartada por contradecir la spec/proposal. |

## Data Flow

```
[Buscar / cambio de página]
  └→ searchInconsistenciasAction({ idAcceso, anno }, page, GRID_PAGE_SIZE)
       → POST /inconsistencia/predios/search  (Zod.parse)
       → Service.search():
            resolveMsquery(idAcceso)                        // fuera del mapa → 400, sin SP
            resolveRange(page, 10) = gridRange(page)        // p1: 1–10 · p2: 11–20
            exec sp_inconsistencias {msquery, anno, inicio, final}   → data rows
            exec sp_inconsistencias buildTotalParams(msquery, anno)  → total (posicional, COUNT del tipo)
            totalPages = ceil(total / GRID_PAGE_SIZE)
       → { data, total, page, pageSize, totalPages }
  └→ renderGrid + renderPagination

[Exportar a Excel]
  └→ exportToExcel()
       → searchInconsistenciasAction(filters, 1, EXPORT_MAX_ROWS)   ← re-consulta del filtro COMPLETO
       → Service.search(): resolveRange(1, 100000) = exportRange()  // inicio=1, final=100000
       → map rows → await import("xlsx") → json_to_sheet → writeFile(...)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/inconsistencia/predios/dto/search-inconsistencia-predios.dto.ts` | Create | Zod search schema + tipos inferidos. |
| `backend/src/inconsistencia/predios/predios-inconsistencia.types.ts` | Modify | Reemplaza placeholder: `PredioInconsistenciaRow` (13 columnas), `PaginatedResponse<T>`, `TipoInconsistenciaOption`, `UsoPredioOption`, `SpTipoInconsistenciaRow`, `SpUsoPredioRow`. Elimina `PrediosInconsistenciaResult`. |
| `backend/src/inconsistencia/predios/predios-inconsistencia.service.ts` | Modify | `search()`, `getTiposInconsistencia()`, `getUsosPredio()`, `resolveMsquery()`, `gridRange()`, `exportRange()`, `resolveRange()`, `readTotal()`, `col<T>()`, `buildTotalParams()`, constantes. |
| `backend/src/inconsistencia/predios/predios-inconsistencia.controller.ts` | Modify | Reemplaza stub `@Get()` por `@Post('search')`, `@Get('combos/tipos')`, `@Get('combos/usos')`. |
| `backend/src/inconsistencia/predios/predios-inconsistencia.service.spec.ts` | Create | Unit tests del service (mock `DatabaseService`). |
| `backend/src/inconsistencia/predios/predios-inconsistencia.controller.spec.ts` | Create | Unit tests del controller (mock service + `overrideGuard`). |
| `frontend/src/actions/inconsistencia/predios.ts` | Create | Server actions con `authFetch` + cookie `SIGMUN_AUTH`. |
| `frontend/src/app/dashboard/inconsistencia/predios/page.tsx` | Modify | Reemplaza placeholder por pantalla real (incluye `fetchAllFilteredRecords` para export). |
| `frontend/src/app/dashboard/inconsistencia/predios/page.test.tsx` | Create | Vitest de la página (incluye límites de paginación y export completo). |
| `backend/src/inconsistencia/predios/predios-inconsistencia.module.ts` | Unchanged | Ya registrado. |

## Interfaces / Contracts

```typescript
// dto/search-inconsistencia-predios.dto.ts
export const SearchInconsistenciaPrediosSchema = z.object({
  idAcceso: z.string().min(1),
  anno: z.coerce.number().int().min(1998),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10), // 10 = grilla, 100000 = export
});
export type SearchInconsistenciaPrediosDto = z.infer<typeof SearchInconsistenciaPrediosSchema>;

// types.ts
export interface PredioInconsistenciaRow {
  codigo: string; nombre: string; cod_pred: string; anexo: string;
  sub_anexo: string; direcion: string; uso: string; area_terreno: number;
  porcen_propiedad: number; val_total_terreno: number; val_total_constru: number;
  total_autoavaluo: number; ROW: number;
}
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number }
export interface TipoInconsistenciaOption { id_acceso: string; nombre: string }
export interface UsoPredioOption { id_uso: string; uso: string }

// service.ts (constantes, helpers y firma)
const GRID_PAGE_SIZE = 10;        // grilla: 10 filas por página
const EXPORT_MAX_ROWS = 100000;   // export: rango completo del filtro
// COUNT del total por tipo = selectMsquery + 1 (2, 4, 6, 8, 10); derivado de TIPO_MSQUERY_MAP
const TOTAL_MSQUERY_MAP = derive(TIPO_MSQUERY_MAP, +1);
const TOTAL_CALL_INCLUDE_FILTERS = true; // Q1 resuelto: enviar {anno,inicio,final} junto al msquery de COUNT (inofensivo)

const TIPO_MSQUERY_MAP: Record<string, number> = {
  '30.01.01': 1, '30.01.02': 3, '30.01.03': 5, '30.01.04': 7, '30.01.05': 9,
};

export function resolveMsquery(idAcceso: string): number | undefined;      // fuera del mapa → undefined
export function resolveTotalMsquery(idAcceso: string): number | undefined; // branch de COUNT del tipo; undefined si no está mapeado
export function gridRange(page: number): { inicio: number; final: number };   // (page-1)*10+1 .. page*10
export function exportRange(): { inicio: number; final: number };             // 1 .. EXPORT_MAX_ROWS
export function resolveRange(page: number, pageSize: number): { inicio: number; final: number };
function buildTotalParams(selectMsquery: number, anno: number): Record<string, number>; // total-msquery = selectMsquery + 1
function readTotal(result: { recordset?: Record<string, unknown>[] }): number;
function col<T>(row: Record<string, unknown>, name: string): T | undefined;
async search(dto: SearchInconsistenciaPrediosDto): Promise<PaginatedResponse<PredioInconsistenciaRow>>;
```

`buildTotalParams` — recibe el `@msquery` de datos YA resuelto del tipo y usa su branch de COUNT; fallback de una línea:

```typescript
function buildTotalParams(selectMsquery, anno) {
  return TOTAL_CALL_INCLUDE_FILTERS
    ? { msquery: selectMsquery + 1, anno, inicio: 1, final: EXPORT_MAX_ROWS } // branch de COUNT del tipo
    : { msquery: selectMsquery + 1 };                                          // fallback mínimo
}
```

`readTotal` — mecanismo único, posicional (sin lookup por nombre):

```typescript
function readTotal(result) {
  const firstRow = result.recordset?.[0];
  const raw = firstRow ? Object.values(firstRow)[0] : undefined; // primer valor del primer registro
  return Number(raw ?? 0);
}
```

`col<T>` — tipado, case-insensitive, solo para las 13 columnas de datos (sin `any`):

```typescript
function col<T>(row: Record<string, unknown>, name: string): T | undefined {
  const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : (row[key] as T);
}
```

El recordset se obtiene con `executeProcedure<Record<string, unknown>>` y se mapea desde `Record<string, unknown>[]`, evitando `any`.

SQL de combos (verbatim, estático, sin parámetros):

```sql
-- combos/tipos
SELECT id_acceso, nombre FROM Acceso.Macceso WHERE id_acceso LIKE '30.01.%' AND nestado = '3';
-- combos/usos
SELECT id_uso, uso FROM Contenedor.TblUsoPredio WHERE tipo_pred = 1 ORDER BY uso;
```

Server action (`frontend/src/actions/inconsistencia/predios.ts`): `searchInconsistenciasAction(filters: { idAcceso: string; anno: number }, page = 1, pageSize = 10)` → POST body `{ idAcceso, anno, page, pageSize }`; `getTiposInconsistenciaAction()`, `getUsosPredioAction()`. Todas devuelven `{ success:true, ... }` o `{ success:false, error }` y nunca lanzan.

## Frontend page

`"use client"` monolítico (igual que `predios-por-uso`). Estado con `useState`: `filters { idAcceso, anno, uso }`, `data`, `total`, `page`, `pageSize=GRID_PAGE_SIZE (10)` fijo, `totalPages`, `loading`, `error`, `tipos`, `usos`, `exporting`. `renderSearchForm()` con los cinco controles en orden exacto: **tipo → año → uso → Buscar → Exportar a Excel**. Años generados de `new Date().getFullYear()` a 1998 desc. El combo `uso` se mantiene en estado pero NUNCA se incluye en el body del action. Al cargar: combos + búsqueda inicial con el primer `id_acceso` y el año vigente. `executeSearch(pageNum)` reutiliza `filters`; `handlePageChange` re-invoca el action con la nueva página (server-side).

Exportación — espeja el `fetchAllRecords()` del reference:

```typescript
const fetchAllFilteredRecords = useCallback(async (): Promise<PredioInconsistenciaRow[]> => {
  const result = await searchInconsistenciasAction(filters, 1, EXPORT_MAX_ROWS); // rango completo del filtro
  if (!result.success) throw new Error(result.error);
  return result.data;
}, [filters]);

// exportToExcel(): allData = await fetchAllFilteredRecords();
//   await import("xlsx") → json_to_sheet (encabezados en español de las 13 columnas)
//   → writeFile(`inconsistencia-predios-{anno}-{idAcceso}.xlsx`)
```

`EXPORT_MAX_ROWS` se define en el frontend con el mismo valor que el tope del DTO (`100000`) para superar la validación Zod.

Paginador: Anterior `disabled={page <= 1}`; Siguiente `disabled={page >= totalPages}`; no se renderiza si `totalPages <= 1` (igual que el reference).

## Testing Strategy

| Capa | Archivo | Qué verifica |
|---|---|---|
| Backend service | `predios-inconsistencia.service.spec.ts` | `resolveMsquery` (5 casos) y `idAcceso` fuera del mapa → `BadRequestException` con `executeProcedure` NO llamado; `resolveTotalMsquery`/`TOTAL_MSQUERY_MAP` (5 casos: total = select + 1) y `undefined` fuera del mapa; `gridRange`: p1 `inicio=1,final=10`, p2 `11,20`; `resolveRange(1, EXPORT_MAX_ROWS)` → `inicio=1,final=100000`; `resolveRange(1, 10)` → grilla (no export); params de datos `{msquery,anno,inicio,final}`; `buildTotalParams(selectMsquery, anno)` → `msquery = selectMsquery + 1` con `TOTAL_CALL_INCLUDE_FILTERS=true`; `totalPages=ceil(total/10)` aun con `pageSize=100000`; `readTotal` posicional (columna con nombre arbitrario); mapeo 13 columnas con `direcion`; SQL de combos estático. |
| Backend controller | `predios-inconsistencia.controller.spec.ts` | `TestingModule` + `overrideGuard(JwtAuthGuard)`; body inválido (`page:0`, `anno` no numérico, `pageSize:100001`) → `BadRequestException`; body válido delega al service; combos → `{success:true,data}`; propaga `BadRequestException` del service. |
| Frontend page | `page.test.tsx` | Mock del módulo de actions; orden de controles; años (primero=actual, último=1998); `uso` nunca enviado al action; 13 columnas incl. `direcion`; loading/empty/error+Reintentar; cambio de página re-invoca el action con `page=2`. |
| Frontend paginación (Warning 3) | `page.test.tsx` | Límites: Anterior deshabilitado en p1 y Siguiente deshabilitado en la última página. |
| Frontend export (Blocker 1) | `page.test.tsx` | Al exportar se invoca el action con `pageSize=EXPORT_MAX_ROWS` y se exportan TODAS las filas devueltas (no solo 10). |

Test de límites (Vitest, concreto):

```typescript
it('deshabilita "Anterior" en la página 1 y "Siguiente" en la última', async () => {
  vi.mocked(searchInconsistenciasAction)
    .mockResolvedValueOnce({ success: true, data: rows10, total: 60, page: 1, pageSize: 10, totalPages: 6 })
    .mockResolvedValueOnce({ success: true, data: rows10, total: 60, page: 6, pageSize: 10, totalPages: 6 });

  render(<InconsistenciaPrediosPage />);
  const prev = await screen.findByRole('button', { name: 'Anterior' });
  expect(prev).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(await screen.findByRole('button', { name: '3' })); // última página
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
});
```

Mock de BD: `jest.fn()` para `executeProcedure` y `query` (patrón `valores.service.spec.ts`, helper `mockSpResult`).

## Migration / Rollout

No migration required. Sin cambios de BD (SP de solo lectura). La exportación de un rango de hasta `EXPORT_MAX_ROWS` filas se materializa en memoria del cliente y del server; si el filtro devuelve volúmenes altos, el costo es de memoria/tiempo, no de correctitud. Rollback: `git revert` del commit; el scaffold previo se recupera.

## Decisions Log

1. **Export Excel = todos los registros del filtro actual.** Se re-consulta el SP con rango completo (`1..EXPORT_MAX_ROWS`), erradicando el tope de 20 y el alcance página-solo. Esto resuelve el BLOCKER 1 y alinea con la spec (L133), el proposal (L99) y el `fetchAllRecords()` del reference. Ya no es una open question.
2. **Grilla fija en 10.** El DTO permite `pageSize` hasta 100000 solo para habilitar la re-consulta de exportación; la grilla siempre envía 10 y `totalPages` siempre divide por 10. Los dos rangos tienen helpers separados (`gridRange`/`exportRange`) y `resolveRange` es el único punto de selección → no se confunden.
3. ~~**Total no respeta el tipo (legacy).** Se replica: el paginador usa `total` de `@msquery=2`; la grilla puede mostrar menos filas que el tamaño de página. Comportamiento esperado por el PO.~~ **SUPERSEDED por la #9** (evidencia real de BD: cada tipo tiene su COUNT).
4. ~~**Q1 — parámetros de la llamada de total.** Decisión aceptada: enviar el set completo `{ msquery: TOTAL_MSQUERY, anno, inicio, final }` (espeja el legacy), detrás de `TOTAL_CALL_INCLUDE_FILTERS`. Si `verify` comprueba que `@msquery=2` solo necesita `msquery`, el cambio es esa única constante a `false` (fallback `{ msquery: TOTAL_MSQUERY }`). Es un ítem de verificación, no una open question.~~ **SUPERSEDED por la #9.**
5. **Q2 — columna de total.** Lectura posicional única (`Object.values(recordset[0])[0]`); no se mezcla con lookup por nombre. `col<T>` queda reservado a las columnas de datos.
6. **401 — desviación conocida.** El `JwtAuthGuard` real responde HTTP 401 con `{ authenticated:false, errorCode:'AUTH_SESSION_MISSING'|'AUTH_SESSION_INVALID', message }` — **no** emite `code:'auth_invalid'` ni el envelope canónico. El escenario "Acceso sin token" de la spec es una desviación conocida que se reportará en `verify`; alinear el guard global está fuera del alcance de este cambio.
7. **`anno` en el DTO.** Se mantiene `min(1998)` (límite inferior del combo de años según la spec) y se **elimina** `.max(2100)` por no estar respaldado por la spec ni el proposal. El SP valida el rango efectivo.
8. **Sin `any`.** `col<T>` es genérico y el recordset se tipa como `Record<string, unknown>[]`; se cumple `CODING.md`.
9. **Corrección 2026-09-23 — total por tipo (real-DB).** Evidencia de `Base_sigmun`, anno=2026: cada tipo tiene SU branch de COUNT — datos→conteo: `30.01.01→2` (2290 filas), `30.01.02→4` (54), `30.01.03→6` (16), `30.01.04→8` (346), `30.01.05→10` (139) — siempre `selectMsquery + 1`. Se elimina el `TOTAL_MSQUERY = 2` fijo (causaba 229 páginas para cualquier tipo; correcto solo para `30.01.01`); `TOTAL_MSQUERY_MAP` se deriva de `TIPO_MSQUERY_MAP` y `buildTotalParams` recibe el `@msquery` de datos resuelto y envía `select + 1`. `TOTAL_CALL_INCLUDE_FILTERS` se mantiene `true`: el COUNT ignora `@inicio`/`@final` (el WHERE de rango está comentado en el SP) y usa `@anno` (año vigente si vacío) — enviarlos es inofensivo y espeja el legacy. La columna del COUNT no tiene nombre → lectura posicional confirmada. **Supersede #3 y #4.**

## Verification Items (para `verify`) — resueltos con evidencia real de BD (Base_sigmun, anno=2026)

- [x] Parámetros del COUNT: ignora `@inicio`/`@final` (rango comentado) y usa `@anno` → `TOTAL_CALL_INCLUDE_FILTERS = true` se mantiene (inofensivo, espeja el legacy).
- [x] Columna de conteo del total: **sin nombre** → lectura posicional confirmada como mecanismo correcto.
- [x] Total por tipo: cada tipo tiene su COUNT (`select + 1`: 2, 4, 6, 8, 10); implementado y testeado en la corrección 2026-09-23 (v. Decisions Log #9).
- [ ] La exportación devuelve efectivamente todos los registros del filtro con datos reales.
- [ ] El escenario 401 de la spec es desviación conocida (`JwtAuthGuard` global, fuera de alcance).

## Open Questions

- Ninguna pendiente que bloquee la implementación. Las preguntas previas de la spec quedaron resueltas como decisiones o ítems de verificación (arriba).

## Correcciones de la auditoría

| # | Hallazgo | Resolución |
|---|---|---|
| Blocker 1 | El export se limitaba a las 20 filas de la página y se agregaba `.max(20)` al DTO. | El export ahora re-consulta TODO el filtro (`@inicio=1`, `@final=EXPORT_MAX_ROWS`); se elimina `.max(20)` y el DTO usa `.max(100000)`. La grilla es de 10. Se retira "Export Excel" de Open Questions. |
| Warning 2 | Q1 (parámetros del total) quedaba sin confirmar. | Decisión aceptada explícita: enviar `{ msquery:TOTAL_MSQUERY, anno, inicio, final }` detrás de `TOTAL_CALL_INCLUDE_FILTERS`, con fallback de una línea; se registra como ítem de verificación, no como open question. |
| Warning 3 | El escenario "Límites" de paginación no tenía cobertura. | Se agrega cobertura de diseño (Anterior `disabled={page<=1}`, Siguiente `disabled={page>=totalPages}`) y un test Vitest concreto de límites en la estrategia de testing. |
| Warning 4 | Contrato 401 (`auth_invalid`) no coincidía con el guard real. | Se documenta como desviación conocida (el guard emite `errorCode: AUTH_SESSION_MISSING\|AUTH_SESSION_INVALID`, sin `code`), a reportar en `verify`; alinear el guard global queda fuera de alcance. |
| Warning 5 | Fórmula del rango del SP vs. contrato fijo de 20. | Se separan `gridRange(page)` (fijo 20) y `exportRange()` (rango amplio); `resolveRange()` es el único selector. La distinción queda explícita. |
| Suggestion 6 | Mezcla de `Object.values(row)[0]` con `col()` para el total; `any` prohibido. | Se fija la lectura posicional del total como mecanismo único y `col<T>(row: Record<string, unknown>, name: string)` genérico como helper de las 13 columnas, sin `any`. |
| Suggestion 7 | Bounds `min(1998).max(2100)` inventados. | Se conserva `min(1998)` (respaldado por la spec) y se elimina `.max(2100)`; justificado en el Decisions Log #7. |
