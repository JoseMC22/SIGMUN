# Feature: Reporte de Fraccionamientos con Cuotas Impagadas (`reporte-fracc-cuotas-impagas`)

## Objetivo

Pantalla en Cobranza que lista los **fraccionamientos con cuotas impagadas**, con criterios de
**Código** (puede ir vacío) y **Fecha de corte**, botones **Procesar** y **Exportar a Excel**, y
paginación de **15 registros** por página.

Ruta: `cobranza/reporte-fracc-cuotas-impagas`

## Problema

El SP `Rentas.Rpt_Rentas_General` con `@BUSC=42` (rama `rpt_fraccionamientos_resumen`) devuelve el
listado de fraccionamientos del datamart `SRV201.SIGMUN_DATAMART.[DATA].[NOTIFICACION_FRACCIONAMIENTOS]`.
No está expuesto por HTTP, así que no hay forma de consultarlo desde la aplicación.

## Por qué

El usuario necesita ver, en pantalla y exportable, qué fraccionamientos tienen cuotas vencidas /
pendientes (`Pendientes`, `Vencidas`, `Ins Vencido`, `Mora Ven`) y en qué estado está cada
fraccionamiento (`estado_frac`).

## Decisión de diseño: qué SP y cómo se filtra

Verificado empíricamente contra `BASE_SIGMUN` (SP `modify_date = 2026-10-02 15:41`):

La rama `@BUSC=42` trae 15 columnas y filtra así:

```sql
where t.codigo = @CODIGO or t.codigo = ''
```

**Problemas medidos de ese WHERE tal como está:**

| `@CODIGO` enviado | filas |
|---|---|
| `''` (código vacío) | **0** |
| `'%%'` (default del SP) | **0** |
| `'0200274'` (exacto) | 1 |
| `'0200'` (parcial) | **0** (es `=`, no `LIKE`) |

- El datamart tiene **11302** filas, **0** con `codigo IS NULL` y **0** con `codigo = ''`. Por eso
  el `or t.codigo = ''` es un **no-op**: nunca matchea. Mandar el código vacío devuelve 0 filas
  siempre → el criterio "el código puede ir vacío" es imposible con el SP actual.
- `@FECH_INI` **no se usa** en esta rama. La fecha de corte no filtra nada.

**Decisión tomada por el usuario: corregir el SP y usar `@BUSC=42`.**

El cambio solicitado al DBA es la línea 94:

```sql
-- actual (devuelve 0 filas con codigo vacio, y exige coincidencia exacta)
where t.codigo = @CODIGO or t.codigo = ''

-- propuesto
where t.codigo LIKE '%' + @CODIGO + '%' or @CODIGO = ''
```

Mientras el DBA no lo aplique, la pantalla queda inservible (0 filas con código vacío). Por eso el
service **no confía en el SP** para el filtro de fecha y lo aplica en memoria, y el service marca en
el log qué está haciendo.

**La fecha de corte se aplica en el backend** sobre `F.Convenio`, que es la única fecha real por
fraccionamiento que trae la rama 42 (`curren_date` es constante en todo el resultado: `04/10/2023`;
`fecha` —la de la cuota— no está en el SELECT DISTINCT). Se documenta en la UI para que no parezca
un filtro del SP.

## Alcance

- **Backend** `backend/src/cobranza/reporte-fracc-cuotas-impagas/`
  - Ruta: `POST /api/cobranza/reporte-fracc-cuotas-impagas/search`
  - `pageSize` selector de modo: `15` (grilla) | `100000` (exportación).
  - Paginación en memoria (el SP no pagina).
- **Frontend**
  - `frontend/src/actions/cobranza/reporte-fracc-cuotas-impagas.ts` (server action + `authFetch`)
  - `frontend/src/app/dashboard/cobranza/reporte-fracc-cuotas-impagas/page.tsx`
  - `frontend/src/app/dashboard/cobranza/reporte-fracc-cuotas-impagas/export-utils.ts`

## Fuera de alcance

- Cambiar el SP (no se tiene acceso de escritura a la BD; el SQL corregido se entrega al usuario).
- Registrar la opción en el menú: el menú se arma en la BD con
  `doform2 = 'dashboard/cobranza/reporte-fracc-cuotas-impagas'`. **Sin ese INSERT la pantalla no
  aparece en el sidebar** (mismo requisito que `reporte-constancia-no-adeudo`). Lo hace el usuario/DBA.
- Impresión / PDF (el pedido es grilla + Excel).

## Columnas (15, literales del SP)

`Codigo`, `Nombre`, `Direccion`, `Año`, `Convenio`, `F.Convenio`, `Deuda`, `C.Inicial`, `Cuotas`,
`Pendientes`, `Vencidas`, `Ins Vencido`, `Mora Ven`, `curren_date`, `estado_frac`

Casing literal del SP, no normalizar. `Año` lleva ñ → acceso por corchetes. `F.Convenio` y
`Ins Vencido` llevan punto → acceso por corchetes obligatorio.

## Tareas

- [x] **T0 — Verificar el SP contra la BD** (sys.parameters + definición + ejecución real de 41 y 42).
      Evidencia: definiciones en temp, resultados medidos arriba. Corolario: el SP cambió entre la
      primera y la segunda verificación; hay que re-descargar la definición antes de afirmar.
- [x] **T1 — Backend**: module, controller, service, dto, types + specs (servicio y dto).
      Registrado en `app.module.ts`. Commit `319161c`. 23/23 tests pasan.
- [x] **T2 — Frontend**: server action, página con grilla de 15, export-utils a Excel.
      Commit `0605d68`. Build de Next ok y la ruta queda registrada en el output del build.
- [x] **T3 — Verificación**: tests backend, `tsc` backend y frontend, ESLint, build frontend, y
      chequeo de que el conteo de columnas coincide en thead / tbody / skeleton / export.

## Estado: implementación completa, verificación completa

Ruta declarada: **inline en el orquestador** para backend y frontend. No hubo delegación porque cada
pieza era pequeña y el patrón ya estaba verificado en `reporte-constancia-no-adeudo`: leer los 3
archivos de referencia no dispara el trigger de 4+ archivos, y escribir archivos mecánicos sobre un
contrato ya comprobado tampoco dispara el de 2+ archivos no triviales. El trabajo no trivial real
—decidir dónde vive cada filtro— se resolvió con verificación empírica del SP, no con exploración
de código.

## Resultados de verificación (observados, no supuestos)

| Check | Resultado |
|---|---|
| `npx jest src/cobranza/reporte-fracc-cuotas-impagas` | **23/23 pasan** (2 suites) |
| `tsc --noEmit` backend | 27 errores, **los mismos 27 que en DEV** sin mis cambios → 0 introducidos |
| `tsc --noEmit` frontend | 21 errores, **los mismos 21 que en DEV** sin mis cambios → 0 introducidos |
| `npx eslint` sobre los 3 archivos nuevos | **0 errores, 0 warnings** |
| `next build` | **ok**, `/dashboard/cobranza/reporte-fracc-cuotas-impagas` en el output |
| Conteo de columnas | **14 en `COLUMNAS` y 14 en `WS_COLUMNS`, mismas claves y mismo orden** |

El baseline seSacó con `git stash -u` sobre DEV y recompilando: los errores de `tsc` son preexistentes
(de `mantenimiento-notificadores` y otros), y mi módulo no aporta ninguno.

**Prettier no se aplicó porque el frontend no lo tiene configurado** — no hay `prettier` en
`devDependencies` ni script de format. ESLint es el verificador real de ese paquete.

## Columnas mostradas: 14, no 15

El SP trae 15 columnas pero `curren_date` queda **fuera** de grilla y Excel: es constante en todo el
resultado (`04/10/2023`), no informa nada de cada fraccionamiento. Las otras 14 están todas.

`COLUMNAS` es la **única** lista de la grilla: los `<th>`, los `<td>` y el skeleton derivan de ella por
`.map()`, así que no pueden desincronizarse entre sí. `WS_COLUMNS` en `export-utils.ts` es la única
réplica y se verificó a mano contra la otra.

## Criterios de aceptación

1. Con código vacío la pantalla lista los fraccionamientos (requiere el SP corregido).
2. Con un código parcial devuelve solo las coincidencias.
3. La fecha de corte acota el listado y la UI lo aclara.
4. La grilla muestra 15 registros por página y la paginación es coherente.
5. "Exportar a Excel" trae **todas** las filas que cumplen los criterios, no solo la página actual.
6. El número de columnas coincide en thead, tbody, skeleton y export-utils.
7. Ningún criterio se descarta en silencio: si el SP devuelve 0 filas con código vacío, se loguea.

## Verificación

Ejecutada y con resultados en la tabla de arriba. Comandos, por si hay que repetirlos:

- Backend: `npx jest src/cobranza/reporte-fracc-cuotas-impagas`, `npx tsc --noEmit -p tsconfig.json`
- Frontend: `npx tsc --noEmit -p tsconfig.json`, `npx eslint <3 archivos nuevos>`,
  `npx next build`

## Commits

- `319161c` — `feat(cobranza): backend reporte de fraccionamientos con cuotas impagadas`
- `0605d68` — `feat(cobranza): pantalla de fraccionamientos con cuotas impagadas`

## Pendiente para que funcione en el entorno

1. **DBA aplica el `WHERE` corregido** en `Rentas.Rpt_Rentas_General` (línea 94). Sin esto el criterio
   "código puede ir vacío" devuelve 0 filas.
2. **Alta en el menú** (BD): `doform2 = 'dashboard/cobranza/reporte-fracc-cuotas-impagas'`. Sin este
   INSERT la pantalla existe y compila, pero no aparece en el sidebar.

Ninguno de los dos es código: son los mismos prerrequisitos que tiene
`reporte-constancia-no-adeudo`.

## Notas y trampas

- **El SP puede cambiar bajo los pies.** Entre la primera y la segunda verificación pasó de no
  filtrar a filtrar. Re-descargar con `OBJECT_DEFINITION` y comparar longitud antes de afirmar.
- **`@busc=41`** (rama hermana) sí filtra por `LIKE` y por `fecha <= @FECH_INI`, pero devuelve filas
  por **cuota**, no por fraccionamiento, y exige `@FECH_INI` en `dd/mm/yyyy` (vacío → 0 filas en
  silencio). Es la alternativa si el DBA no aplica el cambio.
- La grilla de este repo tuvo dos desincronizaciones de columnas entre thead / tbody / skeleton /
  export-utils. Verificar los cuatro puntos antes de dar por cerrado.