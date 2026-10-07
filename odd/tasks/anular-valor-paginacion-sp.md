# Feature: anular-valor paginación server-side SP (anular-valor-paginacion-sp)

## Objetivo
Que filtrar con vacío en `cobranza/anular-valor` no traiga 86k filas a memoria. Paginar en el SP `Rentas.ssp_Mcontribuyente @busc=5` estilo `consulta-valores` (COUNT + página 1-based).

## Problema
`AnularValorService.search` manda `@inicio=0,@final=0`, trae todo lo filtrado y pagina en memoria (`anular-valor.service.ts:48-82`). Con filtro vacío = full scan lento.

## Por qué
Pedido explícito del usuario 2026-10-07: "con vacio me demora mucho, modifica el sp para paginación".

## Alcance autorizado
- Destino remoto autorizado: `DEV remoto` (sin servidor/BD/credencial exacta → NO ejecutar ALTER, solo entregar script + backend listo).
- SP: `Rentas.ssp_Mcontribuyente`, solo rama `@busc=5` (`msconsulta`). Prohibido cambiar `@busc=28` (maestro-contribuyentes).
- Backend `cobranza/anular-valor/search`: usar COUNT + `inicio/final` 1-based inclusivo como `consulta-valores.service.ts:98-138`.
- Frontend: sin cambios salvo que el contrato `total/totalPages` lo exija (hoy ya lo consume).
- Patrón de referencia: `Rentas.SP_Consultadocu @msquery=2 COUNT` + `@msquery=1` página.

## Restricciones
- No probar ni ejecutar ALTER contra DEV sin servidor/BD/usuario explícitos (remote-auth incompleta). Trabajo local + script `.sql` revisable.
- TDD estricto vigente (fuente: `sdd-init/sigmun`, `odd/tasks/anular-valor.md:217-221`). Runners: backend `pnpm --filter backend test` (Jest), frontend `pnpm --filter frontend test` (Vitest). RED → GREEN → REFACTOR, evidencia observada.
- Ruta: `delegated direct` intentada, `direct inline` por fallback (Task `explore` falló: "OpenCode free tier can only be used from within OpenCode" 2026-10-07). Trigger evidence: writer toca 2+ archivos no-triviales (service + spec + sql), mapping necesitó 6+ archivos → delegation mandatoria pero runtime la niega; se sigue inline acotado con disclosure.
- Presupuesto entrega: heurística ~400 líneas authored por tarea (advisory, no cap). Forecast: script SQL ~60 + service + spec ~120 = bajo 400, un solo slice.
- Commits: work-unit en `feat/anular-valor`, Conventional Commits, sin push/PR/merge (política ordinaria del repo).

## Checklist
- [ ] T1 — Script `backend/sql/ssp_Mcontribuyente-busc5-paginacion.sql`: rama `@busc=5` acepta `@inicio/@final` 1-based + `@busc=5 COUNT` (o `@esCount=1`) con mismos filtros C/N/R/D, sin tocar `@busc=28`.
- [ ] T2 — Backend `search`: modo grilla COUNT + página, modo export `pageSize=100000` intacto (`inicio=0,final=0`), `totalPages=ceil(total/pageSize)`.
- [ ] T3 — Specs Jest: COUNT + inicio/final por página, export no pide COUNT, total 0 corta sin segunda llamada, error SP → `success:false` sin throw.
- [ ] T4 — Verificación: `pnpm --filter backend test src/cobranza/anular-valor`, `tsc --noEmit` backend, eslint módulo, evidencia de no-regresión `@busc=28`.

## Criterios de aceptación
1. Con filtro vacío la grilla pide solo 15 filas + COUNT, no 86k.
2. `total/totalPages` coherentes al cambiar de página y de criterio C/N/R/D.
3. Export (si se re-activa) sigue trayendo todo sin COUNT.
4. `@busc=28` sin cambios de comportamiento.

## Checks aplicables
- `pnpm --filter backend test src/cobranza/anular-valor`
- `npx tsc --noEmit -p tsconfig.json` (backend)
- `npx eslint src/cobranza/anular-valor` (backend)

## Progreso
- 2026-10-07: doc creado, sin código aún. Próximo: T1 script local (requiere definición viva del SP para no inventar columnas — bloqueado hasta tenerla o autorización total remota).
- Review RDD: n/a local; candidato = work-unit commit, no TODO checkbox.

## Alineación con declaración jurada (pedido 2026-10-07)
- DJ backend standard: `sp_Mcontribuyente busc=6 COUNT` + `busc=5` con `inicio/final` String 1-based (`declaracion-jurada.service.ts:198-226`). Anular usa `ssp_Mcontribuyente busc=5` con `0,0` + memoria → traer 86k.
- DJ frontend: auto-search al abrir, `handleTipoBusquedaChange` limpia `data/total/totalPages/page/error`, `runSearch` normaliza código en Procesar y lo escribe de vuelta (`page.tsx:211-270`). Anular solo normaliza en `onBlur` y no limpia grilla al cambiar tipo.
- Aplicar lo mismo excepto botones: mantener columna Acción + `ValoresModal` + flujo anular (fase 2). No copiar botones de DJ (nuevo/editar/eliminar/estado-cuenta).
- Paso 1 (sin SP): paridad frontend DJ en `anular-valor/page.tsx` (limpiar al cambiar tipo + normalizar en Procesar). Paso 2 (con SP): COUNT + página en `ssp_Mcontribuyente` cuando haya definición/autorización total.

## Open questions
- Falta para ejecutar en DEV: servidor exacto + BD + usuario con permiso ALTER. Hasta entonces, script sin aplicar.
- Verificar si `ssp_Mcontribuyente` soporta `busc=6` COUNT como `sp_Mcontribuyente`; si no, agregarlo solo en rama `@busc=5/6` sin tocar `@busc=28`.
