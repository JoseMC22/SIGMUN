# Feature: Consulta de Valores (`consulta-valores`)

## Objetivo

Pantalla en Cobranza que consulta **valores** (documentos de deuda: Órdenes de Pago, etc.) con un **selector de criterio** (Código, Nombre o Nro Valor), un campo de búsqueda, botón **Procesar**, botón **Exportar a Excel**, y grilla de **15 registros** por página.

Ruta: `cobranza/consulta-valores`

## Problema

El SP `Rentas.SP_Consultadocu` con `@msquery=1` devuelve los valores del datamart `Rentas.Mvalores`. No está expuesto por HTTP, así que no hay forma de consultarlos desde la aplicación.

## Por qué

El usuario necesita buscar valores por código de contribuyente, por nombre o por número de valor, ver el detalle (tipo, monto, fechas, expediente) y exportarlo.

## Decisión de diseño: qué SP y cómo se filtra

Verificado empíricamente contra `Base_sigmun` (SP `modify_date = 2026-04-22`, definición 13729 chars, estable):

La rama `@msquery=1` trae 13 columnas + `ROW` y filtra así (todo con `AND`):

| Parámetro | Tipo SP | Comportamiento medido |
|---|---|---|
| `@codigo` | `varchar(7)` | **Exacto** (`=`). `'0204199'` trae sus valores; `'0204'` parcial da 0 |
| `@unombre` | `varchar(200)` | **LIKE parcial** (`%...%`). `'PANIZO'` trae también `'VDA. DE PANIZO'` |
| `@num_val` | `char(7)` | **Exacto** (`=`). `'0005259'` existe en 3 contribuyentes/años distintos |

**`@num_val` es NÚMERO DE VALOR, no nro de documento.** Verificado: el mismo `'0005259'` aparece en 3 contribuyentes y años distintos. Es secuencial por `(id_valor, ano_val)`. Por eso la etiqueta de la UI es **"Nro Valor"**, no "Nro Documento" — decir "documento" haría pensar en DNI/RUC y confundiría.

Base fija del SP: `V.codigo IS NOT NULL and V.nestado=1`. Siempre trae solo valores activos con código.

## Decisión de diseño: paginación server-side (no en memoria)

El total sin filtros es **77793 filas**. Traer todo a Node para paginar en memoria (patrón de los reportes anteriores) es inviable acá.

El SP **ya pagina**: `@inicio`/`@final` son números de fila 1-based inclusivos (`ROW_NUMBER() OVER (order by V.ano_val + V.num_val desc)`). `@inicio=0` equivale a vacío (el `int 0` iguala a `''` por conversión implícita) → sin límite, trae todo.

Y `@msquery=2` es el **COUNT** con los mismos filtros. El diseño es el que el SP propone:

- **Grilla**: `@msquery=2` para el total + `@msquery=1` con `@inicio=(page-1)*15+1`, `@final=page*15`.
- **Export**: `@msquery=1` con `@inicio=0, @final=0` (sin límite, todas las filas). Sin COUNT previo.

`pageSize` sigue siendo selector de modo: `15` (grilla) | `100000` (exportación). En modo export se ignora el número y se manda `0,0` para no topar contra ningún techo.

## Decisión de diseño: un criterio a la vez (decisión del usuario)

El usuario eligió selector único en vez de tres campos independientes. La UI tiene un selector (Código / Nombre / Nro Valor) + un campo de búsqueda. Solo el criterio elegido viaja lleno; los otros dos van `''`.

El backend **no impone** la regla: acepta los tres opcionales y los pasa tal cual. Si algún día llegan dos llenos, el SP los combina con AND de forma segura. La regla de "uno a la vez" vive en la UI, donde el usuario la pidió.

## Alcance

- **Backend** `backend/src/cobranza/consulta-valores/`
  - Ruta: `POST /api/cobranza/consulta-valores/search`
  - `pageSize` selector de modo: `15` (grilla, pagina en el SP) | `100000` (export, todo sin límite).
  - Paginación server-side (el SP pagina, el backend calcula inicio/final y pide el COUNT).
- **Frontend**
  - `frontend/src/actions/cobranza/consulta-valores.ts` (server action + `authFetch`)
  - `frontend/src/app/dashboard/cobranza/consulta-valores/page.tsx`
  - `frontend/src/app/dashboard/cobranza/consulta-valores/export-utils.ts`

## Fuera de alcance

- Cambiar el SP (no se tiene acceso de escritura a la BD; además no hace falta: el SP ya hace lo necesario).
- Registrar la opción en el menú: el menú se arma en la BD con
  `doform2 = 'dashboard/cobranza/consulta-valores'`. **Sin ese INSERT la pantalla no
  aparece en el sidebar**. Lo hace el usuario/DBA.
- Impresión / PDF (el pedido es grilla + Excel).

## Columnas (12 mostradas, 13 que trae el SP)

El SP trae 13 + `ROW`. `ROW` se descarta (artefacto de paginación, no dato). `nestado` se
descarta: el SP filtra `V.nestado=1` fijo, así que vale 1 en todas las filas y no informa nada.

`codigo`, `nombre`, `nomb_val`, `num_val`, `ano_val`, `MontoTotal`, `fec_val`, `id_valor`,
`num_exp`, `ano_exp`, `fec_vence`, `observacion`

Casing literal del SP, no normalizar. `MontoTotal` es `imp_reaj + costo_emis + mora`
(calculado en el SP). `fec_val` y `fec_vence` vienen `dd/mm/yyyy` (convert 103).

## Tareas

- [x] **T0 — Verificar el SP contra la BD** (sys.parameters + definición + ejecución real de
      msquery 1 y 2, filtros y paginación). Evidencia arriba. Total sin filtros: 77793.
- [x] **T1 — Backend**: module, controller, service, dto, types + specs (servicio y dto).
      Registrado en `app.module.ts`. Commit `0cd97e9`. 18/18 tests pasan.
- [x] **T2 — Frontend**: server action, página con selector de criterio + grilla de 15,
      export-utils a Excel. Commit `fddbbae`. Build de Next ok.
- [x] **T3 — Verificación**: tests backend, `tsc` backend y frontend, ESLint, build frontend, y
      chequeo de que el conteo de columnas coincide en thead / tbody / skeleton / export.

## Estado: implementación completa, verificación completa

Ruta declarada: **inline en el orquestador** para backend y frontend. El SP se verificó
empíricamente antes de escribir código; el patrón de llamada (count+page) se copió de
`listado-de-infracciones`, y el resto del módulo del hermano `reporte-fracc-cuotas-impagas`.

## Resultados de verificación (observados, no supuestos)

| Check | Resultado |
|---|---|
| `npx jest src/cobranza/consulta-valores` | **18/18 pasan** (2 suites: 10 service + 8 dto) |
| `tsc --noEmit` backend | **0 errores nuevos** en el módulo (total 25, todos preexistentes) |
| `tsc --noEmit` frontend | **0 errores nuevos** en el módulo (total 21, todos preexistentes) |
| `npx eslint` sobre los 3 archivos nuevos | **0 errores, 0 warnings** |
| `next build` | **ok**, `/dashboard/cobranza/consulta-valores` en el output |
| Conteo de columnas | **12 en `COLUMNAS` y 12 en `WS_COLUMNS`**, mismas claves y mismo orden |

## Criterios de aceptación

1. Con el selector en Código y un código exacto, trae solo sus valores.
2. Con el selector en Nombre y un texto parcial, trae los LIKE (incluye coincidencias intermedias).
3. Con el selector en Nro Valor y un número exacto, trae los valores con ese número.
4. La grilla muestra 15 registros por página y el total coincide con el COUNT del SP.
5. "Exportar a Excel" trae **todas** las filas que cumplen el criterio, sin tope de 100k.
6. El número de columnas coincide en thead, tbody, skeleton y export-utils (12).
7. Solo viaja lleno el criterio elegido; los otros dos van `''`.

## Verificación

Ejecutada y con resultados en la tabla de arriba. Comandos, por si hay que repetirlos:

- Backend: `npx jest src/cobranza/consulta-valores`, `npx tsc --noEmit -p tsconfig.json`
- Frontend: `npx tsc --noEmit -p tsconfig.json`, `npx eslint <3 archivos nuevos>`,
  `npx next build`

## Commits

- `0cd97e9` — `feat(cobranza): backend consulta de valores con paginacion server-side`
- `fddbbae` — `feat(cobranza): pantalla de consulta de valores con selector de criterio`

## Pendiente para que funcione en el entorno

1. **Alta en el menú** (BD): `doform2 = 'dashboard/cobranza/consulta-valores'`. Sin este
   INSERT la pantalla existe y compila, pero no aparece en el sidebar.
2. **Probar contra la BD real** una vez registrada: código exacto, nombre parcial,
   nro valor exacto, paginación (página 2+), y export con un criterio que traiga
   muchas filas.

A diferencia del reporte anterior, acá **no hay bloqueo del SP**: el procedimiento ya hace
todo lo necesario (filtros + paginación + COUNT). El único pendiente es el alta de menú.

## Notas y trampas

- **`sys.parameters` dijo `has_default_value=0` pero la definición muestra defaults en los 24.**
  La definición (`OBJECT_DEFINITION`) manda; `sys.parameters` no siempre refleja defaults en este
  SP. No asumir por una sola fuente.
- **`@num_val` no es documento de identidad.** Si la UI dijera "Nro Documento", el usuario
  buscaría por DNI y obtendría 0 filas siempre. La etiqueta es "Nro Valor".
- **77k filas**: cualquier intento de `pageSize` grande con paginación en memoria revienta Node.
  El modo export manda `0,0` al SP, no `1,100000`.
- El SP hace `PRINT` del SQL dinámico antes de ejecutar. Es mensaje, no resultset: no interfiere
  con `mssql`, pero aparece en logs si se captura.
- El orden del SP es `V.ano_val + V.num_val desc` (concatenación de strings). Es determinista
  para paginar, pero si los datos cambian entre el COUNT y la página puede haber deriva.
  Aceptable para un reporteador.
