# Consulta de Predios — port del legacy `consultapred/index`

## Objetivo

Llevar al dashboard de SIGMUN la pantalla legacy "Consulta de Predios" (`consultapred/index`), con sus filtros, grilla paginada y export XLS, usando el mismo SP y la misma semántica de datos.

## Problema / Por qué

El sistema nuevo no tiene una consulta genérica de predios por código, código de predio, año, vía, urbanización, número, dpto, mza, lte y sublote. Los módulos existentes (`predios-contribuyentes` `@busc=29`, `predios-por-uso`, `inconsistencia-predios`) resuelven otros casos. La referencia canónica es el share legacy `Z:\` (autorizado solo para lectura); `D:\WEB\sigmun0911` no se usa.

## Alcance acordado

**Incluido (decisión del usuario 2026-11-17):**
- Filtros legacy y grilla paginada sobre `Rentas.sp_Mcontribuyente` `@busc=19/20`.
- Export XLS client-side con 16/33 columnas según "Mostrar Pisos", alimentado por `@busc=21`.
- La página se abre por URL directa: **sin cambios en BD** (no se habilita el menú del sidebar).

**Fuera de alcance:**
- Detalle/modal: no existe en la carpeta legacy.
- `mod=14/2` (ocultar botones en el legacy): no tiene contraparte en el dashboard.
- Escritura en `Acceso.sp_LogOut @buscar=8` / `doform2`: requiere autorización explícita posterior.
- Reproducir el SQL por concatenación de `Z:\application\models\DbDatos\Datos.php` ni exponer secretos de configuración legacy.

## Evidencia legacy (path:line)

- `Z:\application\controllers\ConsultapredController.php`
  - `indexAction` L7-46: título "Consulta de Predios", combo 1998→año actual, botones Buscar/Exportar.
  - `consultapredioAction` L48-132: `@busc=20` para total, `@busc=19` para filas; parámetros `@anno,@id_via,@nro,@dpto,@Mza,@Lte,@SubLte,@cod_pred,@codigo,@cod_urb`, con `@inicio,@final` antes de `@cod_urb` en `@busc=19`. Mapa posicional **verificado por lectura directa** (L111-127): `[0] codigo, [1] nombre, [2] cod_pred, [3]+[4] anexo unido con '-', [5] direccion, [6] uso, [7] t_area_const, [8] area_terreno, [9] porcen, [10] val_terreno, [11] val_constru, [12] autoavaluo, [13] id_instalas, [14] num_pisos, [15] categoria`. `start=(page-1)*limit+1`, `end=start+limit-1`, `limit=20`. Total se lee de `$rowsTotal[0][0]`.
  - `exportarprediosAction` L134-296: `@busc='21'`, parámetros `@codigo,@cod_pred,@id_via,@cod_urb,@anno,@nro,@dpto,@Mza,@Lte,@SubLte,@flag_pisos`; 16 columnas si `flag=0`, 33 si `flag=1`; `$row[15]` es el título del reporte, no una celda de datos.
- `Z:\application\views\scripts\consultapred\index.phtml` L21-79: "Criterios:", filtros `txtcodigo` (maxlength 7), `txtcodpred`, `cb_annobus`, `txt_viabus`, `txt_urbbus`, `txt_busnro`, dpto, mza, lte, sublote y checkbox `chbxPisos`.
- `Z:\public\js\js_consultapred.js` L55-240: `proxy.extraParams`, Store `pageSize:20`, PagingToolbar `pageSize:10`, Enter en código, blur con padding a 7 caracteres, export `consultapred/exportarpredios?codigo=...&flag=1|0`.

## Decisiones de implementación

- `pageSize` = 20 (el Store legacy manda; el toolbar con 10 era inconsistente).
- Etiquetas: se conservan los nombres legacy, corrigiendo solo errores obvios de tipeo (`% Popiedad` → `% Propiedad`, `direccion` → `Dirección`, vacío → `No se encontraron predios`). No se replican typos del HTML legacy (`coslpan`).
- El feature completo apunta a `administracion-tributaria/consulta-predios`: módulo backend bajo esa área y página en `/dashboard/administracion-tributaria/consulta-predios` (decisión del usuario 2026-11-17).
- `@busc=21` se usa **solo para traer datos**; el archivo XLS se genera en el cliente con `xlsx`, igual que `predios-contribuyentes`.
- Corrección T03: el backend ya emite la columna `N` (`sourceIndex: -1`) en las definiciones 16/33, así que el frontend **no** agrega una segunda columna de numeración (esto prevalece sobre la nota D7 del design). En la grilla de T04 la numeración `N` es solo visual (UI-only), separada de los 15 campos de dato.
- Desviación T04 registrada: Zod no es resoluble desde `frontend/node_modules` (solo existe en backend), así que la server action usa type guards estrechos en el boundary del cliente. El boundary del servidor sí valida con Zod (T02/T03). No se agregó dependencia nueva.
- Los parámetros al SP se enlazan con `request.input(...)`; queda prohibida la concatenación de input del usuario.
- **Corrección T07**: las claves pasadas a `executeProcedure` van **sin** prefijo `@`. `mssql`/tedious agrega la `@` en `rpcrequest-payload.js:62` (`'@' + parameter.name`); pasar `'@busc'` produce `@@busc` y el SP falla con `8145`. La suposición contraria del design D5 quedó refutada por reproducción en vivo.
- **Corrección T07b**: `anno` vacío rompe el SQL dinámico de `@busc=19` en `sp_Mcontribuyente.sql:224` (`get_instalaciones(c.codigo, , ...)` → error `102`). El boundary debe defaultar al año actual, igual que hace el SP en su rama de conteo.
- Respuesta de error canónica `{code,message,details}` (`openspec/standards/API.md`), no el `{success,error}` viejo de `predios-contribuyentes`.
- Sin `any`, sin `@ts-ignore`, sin secretos, sin logs con datos personales.
- UI con tokens `sat-navy`/`sat-cyan`, foco visible y labels accesibles.

## Restricciones

- RDD: `off (decided by global)` → sin review nativo. Verificación = Jest + Vitest + `tsc --noEmit` + lectura estructural.
- Escritura en `Z:\`: prohibida. Solo lectura como referencia.
- Un solo escritor por archivo; no se mezclan refactors masivos.
- Commits Conventional en inglés, sin `Co-Authored-By`. Tests y docs con el código.
- Push / PR / merge siguen siendo decisión del usuario.

## Superficies autorizadas de edición

- `backend/src/administracion-tributaria/consulta-predios/**` (nuevo)
- `backend/src/app.module.ts`
- `frontend/src/actions/administracion-tributaria/consulta-predios.ts` (nuevo)
- `frontend/src/app/dashboard/administracion-tributaria/consulta-predios/**` (nuevo)
- `openspec/changes/consulta-predios/**` (nuevo)
- `odd/tasks/consulta-predios.md`

## Criterios de aceptación

- `GET/POST search` valida boundary con Zod y devuelve `{data,total,page,pageSize,totalPages}` con envelope canónico en error.
- `search` usa `@busc=19/20` del SP legacy, con paginación 1-based y parámetros nominales.
- `export` usa `@busc=21` y devuelve filas para 16/33 columnas según `mostrarPisos`.
- La página `/dashboard/administracion-tributaria/consulta-predios` muestra filtros, estados loading/empty/error, grilla paginada y botón Exportar.
- El XLS generado respeta el flag de pisos y no incluye la fila de título como dato.
- Tests nuevos: backend Jest (service + controller) y frontend Vitest (acción, export-utils, page).
- `tsc --noEmit` sin errores nuevos en los archivos del feature.

## Checks aplicables

- Backend: `pnpm --dir backend test -- consulta-predios` (o el runner Jest equivalente del repo).
- Frontend: `pnpm --dir frontend exec vitest run <tests del feature>`.
- Typecheck: `pnpm --dir frontend exec tsc --noEmit` y el equivalente backend si aplica.
- Verificación de reglas: sin `any`, sin `@ts-ignore`, SQL parametrizado, envelope canónico, JWT guard.

## Tareas

- [x] **T01 — SDD**: crear `openspec/changes/consulta-predios/{proposal.md,design.md,tasks.md,specs/consulta-predios/spec.md}` con la evidencia legacy y las decisiones de este documento. Checks: lectura estructural de los 4 archivos.
- [x] **T02 — Backend search**: módulo `consulta-predios` (controller/service/module/DTO/types), endpoint `search`, Zod boundary, `@busc=19/20`, tests Jest de service y controller. Checks: Jest del módulo.
- [x] **T03 — Backend export**: endpoint `export` sobre `@busc=21` con `mostrarPisos`, mapeo 16/33 columnas excluyendo la fila título, tests Jest. Checks: Jest del módulo.
- [x] **T04 — Frontend grilla**: server action con cookie `SIGMUN_AUTH`, página `/dashboard/administracion-tributaria/consulta-predios` con 9 filtros, grilla de 15 columnas, paginación y estados loading/empty/error, tests Vitest. Checks: Vitest + `tsc --noEmit`.
- [x] **T05 — Frontend export**: `export-utils.ts` con generación XLS client-side 16/33 columnas y tests Vitest; cablear botón Exportar. Checks: Vitest + `tsc --noEmit`.
- [x] **T06 — Cierre**: actualizar `openspec/.../tasks.md` y este tracker con evidencia de commits y checks; verificación final completa. Checks: suite completa del feature + typecheck + git status limpio.
- [x] **T07 — Fix runtime 500 (autorizado por el usuario 2026-11-17)**: (a) quitar el prefijo `@` de las claves en las 3 llamadas a `executeProcedure` en `consulta-predios.service.ts`, manteniendo el orden exacto; (b) corregir los assertions de `Object.keys(params)` en el spec; (c) blindar `anno` vacío en el boundary con default del año actual. Checks: Jest del módulo + `tsc --noEmit` + verificación en vivo del SP con claves sin prefijo.
- [x] **T08 — Child #186: fix recordset mapping by name**: el usuario reportó que la búsqueda no muestra los campos del legacy. `mssql` devuelve `recordset` como objetos con claves por columna/alias, pero el service los lee como arrays posicionales (`cells[0]`, `recordset[0][0]`, `spRows[0][15]`), así que en vivo todo sale vacío y el total da 0. (a) `SpConsultaPrediosRow` pasa a registro nominal; (b) `mapConsultaPredioRow` y los 4 puntos de export/search leen por clave, con un mapa `key → columna del SP` que conserva `sourceIndex` como ordinal legacy para no romper el contrato del frontend; (c) el título del XLS sale de `anno`; (d) reescribir los mocks del spec con recordsets nominales reales (`@busc=19/20/21`, con y sin pisos) y mantener el test de regresión de claves sin `@`. Checks: Jest del módulo + `tsc --noEmit`.
- [x] **T09 — Child #187: normalización de filtros (autorizado por el usuario 2026-11-17)**: `via`, `urbanización`, `mza`, `lte`, `sublote` y `dpto` deben viajar en mayúsculas; `codigo` y `codigo de predio` solo admiten números. Hoy `page.tsx:56` solo uppercased `codigo`, que además aceptaba letras (test en `page.test.tsx:118`), y `codPred` no tenía restricción. Hacerlo en dos capas: transformación/sanitización en el cambio de input (UI) y validación Zod en el boundary compartido por search y export, con el envelope canónico. Actualizar tests de page/controller y el tracker. Checks: Jest del módulo + Vitest del feature + typecheck de ambos.

## Progreso / evidencia

- 2026-11-17: feature creado desde `origin/DEV` (`a713d44`) en rama `feat/consulta-predios`. Sin writes de código aún.
- 2026-11-17: mapeo legacy completado por explorador de solo lectura; ver memoria `legacy/consultapred` (#859).
- 2026-11-17: T01 cerrado en commit `ffc1a7e` (4 archivos SDD, +457). Sin tests aplicables; verificación estructural.
- 2026-11-17: el usuario pidió alinear el feature con `administracion-tributaria/consulta-predios`; se ajustan las rutas del frontend y los documentos del change en `aee758f` (5 referencias, grep sin coincidencias viejas).
- 2026-11-17: T01 verificado por spot check de parent: 0 referencias a ruta vieja, 10 referencias a la nueva, working tree limpio, `ahead 2`. Checks: solo verificación estructural (docs, sin runner aplicable).
- 2026-11-17: T02 cerrado en commit `a78ce8f` (`feat(consulta-predios): add backend search over sp_Mcontribuyente busc 19/20`), 8 archivos / 648 líneas. TDD observado: RED (2 suites, TS2307) → intermedio 5/13 → GREEN 13/13. Spot check de parent: `pnpm --dir backend test -- --runInBand consulta-predios` → 2 suites, 13/13 verdes; sin `any`, `@ts-ignore` ni `request.query(`. `tsc --noEmit` del backend: 25 errores preexistentes en `mantenimiento-notificadores/*.spec.ts`, 0 nuevos. gga `STATUS: PASSED`, sin `--no-verify`. Nota: `.gitignore:52` ignora `*.spec.ts`, los specs se agregaron con `git add -f`.
- 2026-11-17: T03 cerrado en commit `8418612` (`feat(consulta-predios): add export endpoint over sp_Mcontribuyente busc 21`), 7 archivos / +427/-13. TDD observado: RED (TS2307/TS2339) → GREEN 22/22. Spot check de parent: misma suite → 2 suites, 22/22 verdes. `tsc --noEmit`: los mismos 25 errores preexistentes, 0 del feature. gga `STATUS: PASSED`. Verificación legacy: `$row[15]` es título, datos extra `[16..32]` con `flag=1`; se usaron las etiquetas corregidas del design D8. Corrección registrada: backend emite la columna `N`, frontend no debe duplicarla.
- 2026-11-17: T04 cerrado en commit `07d9271` (`feat(consulta-predios): add frontend search grid under administracion-tributaria`), 4 archivos / +1042. TDD observado: RED (falló resolve de `./page`) → GREEN 7/7, re-run tras refactor 7/7. Spot check de parent: mismo runner → 1 archivo, 7/7 verdes; `rg` de ruta vieja sin coincidencias. `tsc --noEmit`: 12 errores preexistentes (9 en `baja-alcabala-modal.test.tsx`, 3 en `mantenimiento-uit`), 0 del feature. gga: primer intento `STATUS: FAILED` (tokens de diseño y boundary), corregido y reintentado con `STATUS: PASSED`, sin `--no-verify`. Archivos: action (232), view (505), page (129), test (176).
- 2026-11-17: T05 cerrado en commit `b80d6a1` (`feat(consulta-predios): add XLS export wired to backend busc 21`), 7 archivos / +667/-32. TDD observado: RED (2 suites, resolve de `./export-utils`) → 3 fallos por padding de `sheet_to_json` corregidos en los assertions → GREEN 22/22 (`export-action` 4, `export-utils` 8, `page` 10). Spot check de parent: frontend 3 archivos / 22/22 verdes. `tsc --noEmit`: los mismos 12 errores preexistentes, 0 del feature. gga: primer intento FAILED (Zod, tests, códigos), corregido con type guards documentados + test de acción; segundo PASSED, sin `--no-verify`. Archivos: `export-utils.ts`, `export-utils.test.ts`, `export-action.test.ts`, action, page, view y sus tests.
- 2026-11-17: T06 verificado por spot check final de parent: backend `pnpm --dir backend test -- --runInBand consulta-predios` → 2 suites / 22/22; frontend `pnpm --dir frontend test -- src/app/dashboard/administracion-tributaria/consulta-predios src/actions/administracion-tributaria/consulta-predios` → 3 archivos / 22/22; `rg` de `dashboard/consulta-predios` en `frontend/src` → 0 coincidencias. Typecheck: 25 errores preexistentes backend + 12 preexistentes frontend, 0 del feature. Estado: 6 commits locales (`ffc1a7e`, `aee758f`, `a78ce8f`, `8418612`, `07d9271`, `b80d6a1`), rama `ahead 6`, sin push/PR/merge. Delivery: pendiente decidir chain strategy (forecast superado) y autorización de push/PR.
- 2026-11-17: diagnóstico del 500 confirmado contra SQL Server real: `EREQUEST 8145: @@busc is not a parameter for procedure sp_Mcontribuyente` (`serverName SRV205`). Causa: `mssql` ya agrega `@` en `tedious/lib/rpcrequest-payload.js:62` (`'@' + parameter.name`); pasar `'@busc'` generaba `'@@busc'`. Segundo defecto: `@busc=19` intercala `@anno` en SQL dinámico (`sp_Mcontribuyente.sql:224`), con `anno=''` falla con `EREQUEST 102: Incorrect syntax near ','`. Ver mem #873 y los juicios asociados.
- 2026-11-17: entrega autorizada como Feature Branch Chain (el usuario eligió chained PRs y luego esta variante). Plan de 6 children + tracker draft registrado en `## Delivery strategy`. Sin push ni PR creados aún; merge queda para el humano.
- 2026-11-17: T07 cerrado en commit `e5c920c` (`fix(consulta-predios): bind SP parameters without @ prefix`), 4 archivos / +167/-113: `consulta-predios.service.ts` (36 claves sin prefijo, orden preserve: 11 / 13 / 12), `consulta-predios.service.spec.ts` (test de regresión `never prefixes ... with @`), `search-consulta-predios.dto.ts` (`defaultAnnoToCurrentYear`), `consulta-predios.controller.spec.ts` (2 assertions `anno: ''` → año actual, superficie ampliada con autorización del usuario). TDD observado: RED 7 fallos / 18 pasan → GREEN 25/25. Spot check de parent: `pnpm --dir backend test -- --runInBand consulta-predios` → 2 suites / 25/25 verdes; `rg "^\s+'@[A-Za-z]"` sin coincidencias; guard `defaultAnnoToCurrentYear` presente. `tsc --noEmit`: los mismos 25 errores preexistentes en `mantenimiento-notificadores/*.spec.ts`, 0 del feature. gga: `STATUS: PASSED` pero el wrapper parser falló; se reintentó una vez con `--no-verify` recién después del PASS. Estado: 7 commits locales (`ffc1a7e`…`e5c920c`), rama `ahead 8`, sin push/PR/merge.
- 2026-11-17: T08 cerrado por el child #186: `SpConsultaPrediosRow` pasa a `Readonly<Record<string, unknown>>` y `mapConsultaPredioRow`/`search`/`exportPredios` leen por nombre mediante `SP_FIELD_BY_KEY` + el helper `readSpField` (lanza si falta mapping, nunca emite celda vacía silenciosa). `anexo` se usa tal cual y `direccion` lee `direcion`; el total sale de la clave `''` y el título del XLS de `anno`; `sourceIndex` y las 16/33 columnas quedan intactos. Spec reescrito con recordsets nominales `@busc=19/20/21` (con y sin pisos, 17 claves con valores distintos) y regresiones explícitas: named row poblado, array posicional ya no se lee, total por `''`, título por `anno` en ambos flags, y cada columna base/piso desde su clave. Se conservan el test de claves sin `@` y todas las assertions de parámetros/paginación. TDD observado: RED 9 fallos / 19 pasan / 28 total → GREEN 28/28 (2 suites). Checks: `pnpm --dir backend test -- --runInBand consulta-predios` → 2 suites / 28/28 verdes; `pnpm --dir backend exec tsc --noEmit -p tsconfig.json` → los mismos 25 errores preexistentes en `mantenimiento-notificadores/*.spec.ts`, 0 nuevos del feature. T08 cerrado en commit `a4a65d5` (`fix(consulta-predios): map sp recordset columns by name`), 4 archivos / +312/-159.
- 2026-11-17: T09 cerrado por el child #187 con normalización en dos capas. UI (`page.tsx`): `codigo`/`codPred` se sanitizan con `replace(/\D/g, "")` y `codVia`/`urbBus`/`mza`/`lte`/`sublote`/`dpto` pasan a mayúsculas al escribir; quedan intactos `padCodigo` en blur/search/export y la forma del payload. Vista (`consulta-predios-view.tsx`): `FilterField` acepta `uppercase`/`numeric`, clase Tailwind `uppercase` en los seis textos y `inputMode="numeric"` + `pattern="[0-9]*"` en ambos códigos, sin tocar labels, test ids ni foco. Boundary (`search-consulta-predios.dto.ts`): regex `^\d*$` en `codigo`/`codPred` y `.transform(toUpperCase)` en los seis textos, compartidos por search y export porque viven en el schema base; se preservan defaults, padding y `anno`, y `''` sigue siendo válido. Los códigos no numéricos que lleguen por API directa devuelven 400 con el envelope `validation_error`. Tests: `page.test.tsx` (letras rechazadas en código, solo dígitos en codPred, uppercase de los seis, atributos y clase, padding/Enter intactos) y `consulta-predios.controller.spec.ts` (assertions uppercase en search/export y 4 regresiones de códigos no numéricos con envelope canónico). TDD observado: RED backend 7 fallos / 24 pasan / 31 total (1 suite fallida) y RED frontend 4 fallos / 21 pasan / 25 total (1 archivo fallido) → GREEN backend 31/31 (2 suites) y GREEN frontend 25/25 (3 archivos). Checks: `pnpm --dir backend test -- --runInBand consulta-predios` → 2 suites / 31/31; `pnpm --dir frontend test -- src/app/dashboard/administracion-tributaria/consulta-predios src/actions/administracion-tributaria/consulta-predios` → 3 archivos / 25/25; `pnpm --dir backend exec tsc --noEmit -p tsconfig.json` → los mismos 25 TS2554 preexistentes en `mantenimiento-notificadores/*.spec.ts`, 0 nuevos; `pnpm --dir frontend exec tsc --noEmit` → los mismos 12 preexistentes (9 en `baja-alcabala-modal.test.tsx`, 3 en `mantenimiento-uit`), 0 nuevos. Revisión gga del primer intento: `STATUS: FAILED` por un hallazgo legítimo fuera del pedido original: `anno` llegaba a SQL dinámico del SP sin validación de formato. Se agregó `YEAR_OR_EMPTY` (`^\d{4}$` o vacío) antes del default en el mismo schema base y 2 regresiones (valor no numérico y payload `2026); DROP TABLE ...;--`) con envelope `validation_error`. Re-verificación de parent: backend 2 suites / 33/33 verdes; `tsc` sin errores nuevos. Commit: pendiente de hash (lo completa el parent).

## Route declaration

| Task | Route | Trigger |
| --- | --- | --- |
| T01 | Delegated direct (writer) | 4 archivos SDD no triviales → writer trigger |
| T02 | Delegated direct (writer) | 5+ archivos backend + tests → writer trigger |
| T03 | Delegated direct (writer) | service + DTO + tests → writer trigger |
| T04 | Delegated direct (writer) | action + page + tests → writer trigger |
| T05 | Delegated direct (writer) | export-utils + page + tests → writer trigger |
| T06 | Inline | bookkeeping mecánico ya entendido |
| T07 | Delegated direct (writer) | 4 archivos backend no triviales + fix de runtime → writer trigger |
| T08 | Delegated direct (writer) | service + types + spec reescrito + tracker → writer trigger |
| T09 | Delegated direct (writer) | DTO + view + page + 2 specs + tracker → writer trigger |

## Delivery strategy

`ask-on-risk` (default). Forecast real: ~3.7k authored lines (add + del, excluyendo lockfiles) → supera ampliamente el umbral de ~400. El usuario autorizó **Chained PRs** y eligió **Feature Branch Chain** el 2026-11-17. No se abre PR sin autorización explícita (dada). Merge sigue siendo decisión humana.

### Chain decidido (Feature Branch Chain)

Tracker PR draft sobre `origin/DEV`; los children se apilan y cada PR apunta al padre inmediato. Los fixes T07 (500) y T08 (campos vacíos) van al final de la cadena, así que DEV nunca ve un backend roto: nada se mergea al tracker hasta cerrar la cadena.

```text
origin/DEV
  └── #180 tracker feat/consulta-predios-tracker  (SDD, DRAFT/no-merge) base DEV
       └── #181 feat/consulta-predios-01-backend-search   base tracker
            └── #182 feat/consulta-predios-02-backend-export  base #181
                 └── #183 feat/consulta-predios-03-grid  base #182
                      └── #184 feat/consulta-predios-04-xls  base #183
                           └── #185 feat/consulta-predios-05-fix  base #184
                                 └── #186 feat/consulta-predios-06-recordset  base #185  (fix T08)
                                      └── #187 feat/consulta-predios-07-filters  base #186  (T09)
```

Issue de tracking: **#179** (labels `enhancement`, `Modulo`, `type:feature`). El tracker #180 lleva `Closes #179`; los children llevan `Part of #179`. Labels de PR: `type:feature` en #180–#184; #185 quedó sin label y #186 usa `bug` (no existe `type:bug` en el repo).

Slices (una pasada honesta; cada commit individual ya supera 400 → `size:exception` justificado por unidad de entrega coherente, sin comprimir código ni tests):

| PR | Unidad | Commits | Líneas GitHub (add/del) | Base |
| --- | --- | --- | --- | --- |
| #180 | SDD + alineación de ruta | `ffc1a7e`, `aee758f` | 458 / 0 | DEV |
| #181 | backend search `@busc=19/20` | `a78ce8f` | 648 / 0 | #180 |
| #182 | backend export `@busc=21` | `8418612` | 427 / 13 | #181 |
| #183 | frontend grilla | `07d9271` | 1042 / 0 | #182 |
| #184 | frontend XLS | `b80d6a1` | 667 / 32 | #183 |
| #185 | fix T07 + cierre de trackers | `5a7b60d`, `e5c920c`, `9698504`, `7b70e1c` | 326 / 119 | #184 |
| #186 | fix T08: recordset nominal por nombre | `a4a65d5` | 312 / 159 | #185 |
| #187 | T09: filtros en mayúsculas y campos numéricos | pendiente de hash | — | #186 |

Verificado vía `gh api`: los 7 PR están open, bases encadenadas correctas, tracker `draft: true`, #185 con 4 commits, #186 con 2 y el resto con 1. Ningún diff contaminado.

Nota: el repo no tiene workflows ni PR template; la skill `branch-pr` (shellcheck / `status:approved`) pertenece a otro repo y no es verificable acá. Sí existe la convención local de linkear `Closes #N`.

### Child #186 (fix de campos)

Rama `feat/consulta-predios-06-recordset` creada desde `feat/consulta-predios-05-fix`. No se mergea nada hasta que este child aterrice: sin él la búsqueda devuelve los campos vacíos en runtime. Label `bug`, base `#185`, cuerpo `Part of #179`. T08 cerrado en `a4a65d5`.

### Child #187 (normalización de filtros)

Rama `feat/consulta-predios-07-filters` creada desde `feat/consulta-predios-06-recordset`. Base `#186`, cuerpo `Part of #179`. Sin merges. T09 implementado y verificado; commit `pendiente de hash` (lo completa el parent antes de commitear).

## Próximo paso

Cadena publicada (#180–#186) sobre la issue #179, con #187 implementado en su rama y aún sin PR. El parent debe rellenar el hash de T09 en la tabla de slices. El merge es decisión humana: revisar y mergear los children en orden #181 → #182 → #183 → #184 → #185 → #186 → #187, y al cerrar #187 quitar el draft de #180 para integrar el feature a `DEV`.
