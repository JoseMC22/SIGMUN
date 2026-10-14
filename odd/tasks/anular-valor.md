# Feature: Anular Valor — Listado con filtros (`anular-valor`)

## Objetivo

Pantalla en Cobranza que busca contribuyentes con selector de criterio —Código (C),
Nombre (N), Razón Social (R) o Documento (D)— en grilla paginada de 15, sin botón
de exportar. Es la base sobre la que se montará la anulación en fase 2.

Ruta: `cobranza/anular-valor`

Rama: `feat/anular-valor` (un solo nivel: `feat/cobranza/...` con dos barras viola el
regex de nombres del repo).

## Fuente (cambió respecto de fase 1)

Fase 1 usaba `sp_Mcontribuyente @busc=28` (sin filtros, 16 columnas). Por pedido del
usuario se cambió a **`Rentas.ssp_Mcontribuyente @busc=5`** (rama `msconsulta`, SP
nuevo creado el 2026-10-06), que filtra por `@tipo_busqueda` y devuelve ~29 columnas
de las que se muestran 8 identificatorias.

## Modal de valores emitidos (botón por fila)

Cada fila tiene un botón "Valores" que abre un modal con los valores emitidos del
código (`Rentas.ssp_Consultadocu @msquery=3`, verificado: 41 filas para `'0279126'`).
La grilla del modal muestra 5 columnas pedidas por el usuario: tipo de documento
(`nomb_val`), número (`num_val`), año (`ano_val`), monto (`MontoTotal` 2 dec),
estado (`nestado` con descripción resuelta, no el int).

El backend expone `POST /cobranza/anular-valor/valores` con `{ Codigo }` (sin
paginación: un contribuyente trae decenas). Viajan en datos `id_mvalores` (PK, la
necesitará la fase 2), `motivo`/`operador`/`fecha` (vacíos si no hay anulación;
`fecha` '1900-01-01' se mapea a ''). No se muestran en la grilla del modal.

## Decisión de diseño: filtros por tipo_busqueda (verificado contra la BD)

| Tipo | Params que viajan | Comportamiento medido del SP |
|---|---|---|
| C | `@codigo` | EXACTO con `right('0000000'+@codigo,7)` (el SP rellena solo). `'0279126'` → 1 fila |
| N | `@paterno`, `@materno`, `@nombres` | Los tres LIKE parcial con AND (+ OR sobre relacionados). Cualquiera o los tres; vacíos = `%%` |
| R | `@razon` | LIKE parcial sobre el nombre completo concatenado. `'municipalidad'` → 1 fila |
| D | `@num_doc` | LIKE parcial sobre `a.num_doc`. `'19082855'` → 1 fila |

Base fija: `codigo IS NOT NULL and nestado=1` y excluye códigos que empiezan con T/P.
Sin COUNT en esta rama: se trae todo lo filtrado (`@inicio=0, @final=0`) y se pagina
en memoria para el total exacto.

## Columnas mostradas (8 de ~29)

`codigo`, `nombres`, `paterno`, `materno`, `documento` (nombre del tipo, del join),
`num_doc`, `DireFis` (dirección armada por función), `TipoPersona` (computada).
Se descartan códigos internos, partes de dirección, auditoría y `ROW`.

## Sin exportar (pedido del usuario)

Se quitó el botón de la página y se eliminó `export-utils.ts` (quedaba huérfano).
El backend conserva el modo `pageSize=100000` (testeado, inofensivo); simplemente
la UI no lo dispara.

## Fuera de alcance en fase 1 (explícito, lo pidió el usuario)

- **La anulación en sí.** No hay endpoint de anular, no hay botón de anular, no hay
  ConfirmDialog. Solo el listado. "Luego continuamos".
- No hay SP para anular valores de cobranza (verificado: `Anularconvenio*` es para
  convenios, `sp_Anularrecibos` para recibos, el de vehicular es otro dominio).
  La fase 2 arranca consiguiendo ese SP.

## Decisión de diseño: de dónde sale el listado

Se espeja `maestro-contribuyentes` (probado y en producción):
`Rentas.sp_Mcontribuyente @busc=28` → `GOTO maestro_contribuyentes` → SELECT 16
columnas desde `REPORTS.VW_LISTACONTRIBUYENTE`. El SP no recibe filtros: se traen
todas las filas y se pagina en memoria.

Verificado: la vista tiene **86737** filas. No hay paginación server-side en esta rama
del SP (solo recibe `busc`), así que memoria es la única opción sin tocar el SP.
El módulo maestro ya lo hace en producción, así que está probado a esta escala.

Se crea módulo nuevo `cobranza/anular-valor` en vez de reutilizar el de
administración-tributaria: ruta propia, concerns propios, y lugar donde crecerán
los endpoints de anulación en fase 2.

## Alcance (fase 1)

- **Backend** `backend/src/cobranza/anular-valor/`
  - Ruta: `POST /api/cobranza/anular-valor/search`
  - `pageSize` selector de modo: `15` (grilla) | `100000` (exportación).
  - Paginación en memoria (el SP no pagina).
- **Frontend**
  - `frontend/src/actions/cobranza/anular-valor.ts` (server action + `authFetch`)
  - `frontend/src/app/dashboard/cobranza/anular-valor/page.tsx`
  - `frontend/src/app/dashboard/cobranza/anular-valor/export-utils.ts`

## Columnas (16, espejo de maestro-contribuyentes)

`codigo`, `nombre`, `direccion`, `junta`, `dni`, `correo`, `idVia`, `telefono1`,
`baseImponible`, `inafecto`, `categoria`, `gestor`, `impAnual`, `impTrime`, `costoEmi`,
`impTotal`

Texto → `''` si null; numéricos → `0` si null. Mismo mapeo del maestro.

## Tareas

- [x] **T0 — Verificar el SP** (`sp_Mcontribuyente @busc=28`, 86737 filas en la vista,
      patrón maestro en producción).
- [x] **T1 — Backend**: module, controller, service, dto, types + specs.
      Registrado en `app.module.ts`. Commit `ffd42e2`. 9/9 tests pasan.
- [x] **T2 — Frontend**: server action, página con grilla de 15, export-utils a Excel.
      Commit `8189717`. Build de Next ok.
- [x] **T3 — Verificación**: tests backend, `tsc` backend y frontend, ESLint, build frontend,
      y conteo de columnas. Commits. **STOP cumplido: no se implementó anulación.**

## Estado fase 1: completa y verificada

## Resultados de verificación (observados, no supuestos)

| Check | Resultado |
|---|---|
| `npx jest src/cobranza/anular-valor` | **9/9 pasan** (2 suites: 6 service + 3 dto) |
| `tsc --noEmit` backend | **0 errores nuevos** en el módulo (total 25, preexistentes) |
| `tsc --noEmit` frontend | **0 errores nuevos** en el módulo (total 21, preexistentes) |
| `npx eslint` sobre los 3 archivos nuevos | **0 errores, 0 warnings** |
| `next build` | **ok**, `/dashboard/cobranza/anular-valor` en el output |
| Conteo de columnas | **16 en `COLUMNAS` y 16 en `WS_COLUMNS`**, mismas claves y mismo orden |

## Criterios de aceptación (fase 1)

1. La pantalla lista contribuyentes paginados de 15, con total y páginas coherentes.
2. "Exportar a Excel" trae **todos** los que devuelve el SP, no solo la página actual.
3. El número de columnas coincide en thead, tbody, skeleton y export-utils (16).
4. **No existe ningún botón ni endpoint de anular.** Si aparece uno, la fase está mal.

## Verificación

Ejecutada y con resultados en la tabla de arriba. Comandos, por si hay que repetirlos:

- Backend: `npx jest src/cobranza/anular-valor`, `npx tsc --noEmit -p tsconfig.json`
- Frontend: `npx tsc --noEmit -p tsconfig.json`, `npx eslint <3 archivos nuevos>`,
  `npx next build`

## Commits (fase 1)

- `ffd42e2` — `feat(cobranza): backend listado de contribuyentes para anular-valor (fase 1)`
- `8189717` — `feat(cobranza): pantalla de listado para anular-valor (fase 1)`

## Pendiente para que funcione en el entorno (fase 1)

1. **Alta en el menú** (BD): `doform2 = 'dashboard/cobranza/anular-valor'`. Sin este
   INSERT la pantalla existe y compila, pero no aparece en el sidebar.

## Fase 2 (en curso): anulación con motivo

Fuente: **`Rentas.ssp_Mvalores @msquery=10`** ("Para anulación de valores",
verificado en la definición viva el 2026-10-06). Recibe `@id_valor`, `@num_val`,
`@ano_val`, `@codigo`, `@observacion` (varchar(250) = el motivo), `@id_user`
(operador). En una transacción: inserta en `Rentas.Mvalores_Motivo` (secuencia
auto), pone `mvalores.nestado='2'` + auditoría en `observacion`, y pasa a
`CAJA.MRECIBOS.estado='2'`. Con error hace rollback y loguea en `ErrorMigracion`.

**Trampa del SP: no devuelve resultset ni en éxito ni en error.** El éxito se
verifica re-leyendo (`ssp_Consultadocu @msquery=3` filtrado a la llave, se espera
`nestado='Anulado'`).

Estados (`rentas.estado_valores`, verificado): 1 Pendiente, 2 Anulado,
3 Notificado, 6 Coactivo, 7 Registro, 9 Pagado. El botón de eliminar solo existe
en filas con `nestado === 'Pendiente'`.

Motivo: mínimo **20 caracteres** (el usuario dijo "dígitos"; se interpreta como
caracteres), máximo 250 (límite de `@observacion`). Operador = usuario logueado
del frontend (precedente `AnularConvenio`: `getStoredUser()?.username`).

Diseño: `POST /cobranza/anular-valor/anular` con
`{ Codigo, IdValor, NumVal, AnoVal, Motivo, Operador }`. El service: 1) re-lee el
valor y exige Pendiente (si no, `success:false` sin tocar la BD), 2) ejecuta
`@msquery=10`, 3) re-lee y exige Anulado. Frontend: columna Acción en el modal
(visible solo si Pendiente) → modal de motivo (textarea con contador, min 20) →
confirma → recarga el listado del modal.

## Tareas fase 2

- [x] **T4 — Backend anular**: dto `anular-valor.dto.ts` + spec (requeridos, motivo
      20–250 con trim), `service.anularValor()` + spec (mock db: pendiente→ejecuta
      y verifica Anulado; no-pendiente→no ejecuta; error SP→false),
      `POST anular` en controller. TDD estricto (RED primero).
- [x] **T5 — Frontend anular**: `anularValorAction`, columna Acción en
      `valores-modal.tsx` (solo Pendiente), modal de motivo con validación min 20,
      recarga del listado tras anular.
- [x] **T6 — Verificación**: `pnpm --filter backend test` del módulo, `tsc` ambos,
      eslint, build frontend. Work-unit commit en `feat/anular-valor`.

## Resultados de verificación fase 2 (observados, no supuestos)

| Check | Resultado |
|---|---|
| RED backend (specs nuevos, sin implementar) | **2 failed / 2 passed** (TS2307 módulo dto no existe, TS2339 `anularValor`) |
| RED frontend (2 specs nuevos, sin implementar) | **5 failed / 0 passed** (`anularValorAction is not a function`) |
| `npx jest src/cobranza/anular-valor` | **28/28 pasan** (4 suites) |
| `npx tsc --noEmit` backend | **0 errores en el módulo** (total 25, preexistentes en mantenimiento-notificadores) |
| `npx tsc --noEmit` frontend | **0 errores en el módulo** (total 12, preexistentes en alcabala/mantenimiento-uit) |
| `npx eslint` backend (6 archivos del módulo) | **30 errors + 3 warnings, 0 en líneas de fase 2** (baseline HEAD: 31+3; los dto nuevos: 0/0) |
| `npx eslint` frontend (5 archivos de fase 2) | **0 errors, 0 warnings** |
| Vitest frontend (specs de fase 2) | **10/10 pasan** |
| `pnpm --filter frontend test` (suite completa) | **18 failed / 213 passed**; los 18 son preexistentes (access-context, modelos, valores-vehicular, nuevo-valor-modal) — comprobado idéntico en baseline con stash |
| `npx next build` | **ok**, `/dashboard/cobranza/anular-valor` en el output |

## Criterios de aceptación (fase 2)

1. Anular exige motivo con trim entre 20 y 250 caracteres; la UI lo valida con
   contador en vivo y el dto lo re-valida en el backend.
2. Solo filas `nestado === 'Pendiente'` ofrecen el botón de anular; el backend
   re-lee la llave y devuelve `success:false` sin tocar la BD si el estado no
   es Pendiente.
3. El éxito se confirma re-leyendo `nestado === 'Anulado'` (el SP `@msquery=10`
   no devuelve resultset); si no, `success:false` sin throw.
4. El usuario debe explicar el motivo para confirmar; al anular, el modal de
   motivo se cierra y el listado de valores se recarga.

## TDD / runners (de `sdd-init/sigmun`, strict_tdd: true)

Backend `pnpm --filter backend test` (Jest), frontend `pnpm --filter frontend test`
(Vitest). RED antes de implementar, GREEN, REFACTOR. Evidencia observada, no
inventada.

## Cierre fase 2 (verificación independiente + gate)

- Commit `c8ae66a` (13 archivos, +859/−24: supera el budget 400 — una sola unidad
  código+tests+doc, no se comprime).
- Spot check del orquestador: `npx jest src/cobranza/anular-valor` → 28/28.
- Verificador independiente: PASS en ruta destructiva (guard Pendiente, params
  exactos, re-verificación Anulado), 28/28 backend + 10/10 frontend, sin cambios
  fuera del endpoint nuevo. RDD global off → sin review nativa (assess:
  `high/unassessable` por untracked ajenos).
- Riesgo del verificador CERRADO con evidencia: `ssp_Consultadocu @msquery=3`
  **sí filtra por llave** — `EXEC @msquery=3, @codigo='0279126', @id_valor='01',
  @num_val='0035433', @ano_val='2018'` devuelve exactamente 1 fila (SQL impreso
  por el SP muestra los 3 `and`). El `leerValor` del service opera sobre la fila
  correcta.

## Notas y trampas

- La rama se llama `feat/anular-valor`, no `feat/cobranza/anular-valor`: el regex de
  nombres (`^(feat|...)\/[a-z0-9._-]+$`) permite una sola barra.
- 86k filas en memoria por request: es lo que ya hace el maestro en producción. Si en
  fase 2 el SP de anular trae su propia paginación, se revisa; no anticipar.
- Cuando llegue la fase 2, el primer paso es conseguir el SP de anular (hoy no existe
  para cobranza) y verificarlo contra la BD antes de escribir código. Es operación
  destructiva: no se supone el contrato.
