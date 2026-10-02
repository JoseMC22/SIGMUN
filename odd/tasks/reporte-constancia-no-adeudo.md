# Feature: Reporte de Constancia de No Adeudos (`reporte-constancia-no-adeudo`)

## Objective
Construir la pantalla "Reporte de Constancia de No Adeudos" dentro de **Cobranza**
(`cobranza/reporte-constancia-no-adeudo`): panel superior con criterios de búsqueda por
**Código** y **rango de fechas (desde/hasta)**, botón **Procesar**, botón **Exportar a Excel**, y
tabla central de resultados con **paginación de 20**.

## Problem / Why
El usuario necesita listar las constancias de no adeudos emitidas. La consulta ya existe
centralizada en el SP `Certificado.sp_certificado`; falta exponerla por HTTP y construir la vista.
Es el Reporte gemelo de `notificaciones/reporte-constancia-exigibilidad`, pero **con paginación**
(ese módulo no pagina) y **sin export PDF** (solo Excel, según pedido explícito).

> **Nota de ubicación:** la primera implementación se hizo bajo `notificaciones/`. El usuario pidió
> explícitamente moverla a **Cobranza** con nombre en **singular**. Ver task **T3**.

## Consulta del SP
```sql
exec Certificado.sp_certificado @BUSC = '5', @Codigo = '', @fini = '', @ffin = ''
```
- `@BUSC = '5'` → rama de listado de constancias de no adeudos. **Fijo**, no lo manda el usuario.
- `@Codigo` → texto, opcional. `''` = todos.
- `@fini` / `@ffin` → rango de fechas, opcional. `''` = sin filtro de fecha.
- **Sin parámetros de paginación** → **paginación en memoria** en el service
  (patrón `predios-contribuyentes` / `maestro-contribuyentes` / `mantenimiento-vias`).

### Columnas (confirmadas por el usuario)
| # | Columna SP     | Header UI  | Tipo        | Nota |
|---|----------------|------------|-------------|------|
| 1 | `Numero`       | `N°`       | numérico    | correlativo |
| 2 | `Año`          | `Año`      | numérico    | **identificador con `ñ`** — usar acceso por corchetes `row['Año']` |
| 3 | `Fecha`        | `Fecha`    | texto       | **ya viene `dd/mm/yyyy`** |
| 4 | `codigo`       | `Código`   | texto       | 7 dígitos, ej. `0282418` |
| 5 | `Nombre`       | `Nombre`   | texto       | contribuyente |
| 6 | `concepto`     | `Concepto` | texto       | ej. `GASTOS NOTIFICACION HASTA EL EJERCICIO FISCAL 2026 .` |

Casing **mixto** coming del SP (`Numero`/`Nombre` vs `codigo`/`concepto`) → hay que respectarlo
literal, no normalizar.

## Gotcha crítico: NO pasar `Fecha` por `formatDateTime`
El módulo gemelo formatea columnas de fecha con `formatDateTime` porque su SP devuelve datetime
crudo (`fec_gen`). **Acá `Fecha` ya viene como texto `05/01/2026`**.
`new Date("05/01/2026")` lo interpreta como **1 de mayo** (formato US) y `formatDateTime` lo
volvería `01/05/2026` — **la fecha se invierte en pantalla y en el Excel**. Renderizar `Fecha`
como texto, sin parsear. Ninguna otra columna necesita formateo.

## Scope
- **Backend** `backend/src/cobranza/reporte-constancia-no-adeudo/`
  (module, controller, service, dto, types, spec), registrado en **`app.module.ts`**
  (Cobranza no tiene `cobranza.module.ts`; los módulos se registran directo en el root, igual que
  `ContribuyentesSinValoresModule`).
  Ruta HTTP: `POST /api/cobranza/reporte-constancia-no-adeudo/search`.
  Contrato: `{ success, data, total, page, pageSize, totalPages }` + `{ success:false, error }`.
- **Frontend**:
  - `frontend/src/actions/cobranza/reporte-constancia-no-adeudo.ts` (server action, `authFetch`).
  - `frontend/src/app/dashboard/cobranza/reporte-constancia-no-adeudo/page.tsx`
    (panel de criterios, botón Procesar, botón Exportar a Excel, tabla 6 columnas, paginación 20).
  - `frontend/src/app/dashboard/cobranza/reporte-constancia-no-adeudo/export-utils.ts`
    (Excel, re-consulta completa con `pageSize` export, `exportSeq` anti-carrera).
- **Identificadores en singular** (`NoAdeudo`, no `NoAdeudos`): clases, DTO/schema, action y hook.
  El **título visible** de la UI y los textos de negocio conservan el plural natural
  ("Reporte de Constancia de No Adeudos"); el singular es requisito de ruta/identificador.
- **Menú / alta en BD — FUERA de alcance del código**: el menú de SIGMUN es 100% dinámico desde BD
  (`Acceso.sp_LogOut` `buscar=8`, campo `doform2` = ruta). `frontend/src/actions/menu.ts` sólo hace
  fetch; no hay archivo de rutas/sidebar que tocar. El módulo **funciona pero no aparece en el menú**
  hasta que un DBA inserte el registro con `doform2 = 'dashboard/cobranza/reporte-constancia-no-adeudo'`.
  Además hay caché de 30 min (`menu:*`) → esperar o limpiar caché.

## Molde a replicar
- **Estructura + paginación + export Excel + `exportSeq`** → `administracion-tributaria/predios-contribuyentes/`
  (backend `predios-contribuyentes.service.ts`, `dto/search-predios-contribuyentes.dto.ts`;
  frontend `page.tsx` con `renderPagination()` inline).
- **Panel de criterios código + rango de fechas + look&feel del header** →
  `notificaciones/reporte-constancia-exigibilidad/page.tsx`.
- **Registro de módulo en Cobranza** → `backend/src/cobranza/contribuyentes-sin-valores/`.
- **`exportSeq` anti-carrera** → `predios-contribuyentes/page.tsx` líneas 102/147/174.

## Constraints
- `pageSize` del DTO = **selector de modo**: `20` grilla / `100000` export. Union de literales en zod,
  **NUNCA `.max(100)`** (patrón canónico predios-contribuyentes / maestro-contribuyentes).
  El conjunto aceptado es `{20, 100000}`: cualquier otro valor (incluidos `10` y `15`) es rechazado
  por zod. **Cambiar el tamaño de grilla exige tocar el DTO**, no solo el `useState` del frontend.
- Llama al SP **solo** vía `this.db.executeProcedure('Certificado.sp_certificado', {...})`. Sin query crudo.
- Mapa `null → ''` para que el frontend no reciba null.
- Backend con `JwtAuthGuard`; errores como `{ success: false, error }` (no throw).
- **Idioma: UI, comentarios y mensajes de error en español; identificadores en inglés.**
  (Convención del repo, ver `odd/tasks/predios-contribuyentes.md`.)
- Tailwind con colores custom `sat-navy` / `sat-cyan`. `xlsx` por dynamic import (lazy).
- No exponer credenciales de BD.
- No agregar `Co-Authored-By` ni atribución de IA a los commits.

## Delivery strategy
- Branch: `feat/reporte-constancia-no-adeudo` desde `DEV` (renombrada en T3; sin upstream, no pusheada).
- Commits work-unit: **T1 backend**, **T2 frontend**, **T3 reubicación a Cobranza**, **T4 ajuste de grilla**,
  cada uno autocontenido y revisable.
- Forecast: backend ~290 líneas (incl. spec) + frontend ~470 → **~760 authored lines, excede el
  presupuesto de 400** → si el usuario pide PR, encadenar slices BE/FE (`feature-branch-chain`).
  Push / PR / merge quedan como decisión del usuario bajo política ordinaria del repo.

## TDD / Checks
- Modo: **estándar** (no strict TDD). Runners: backend **Jest**, frontend **Vitest + tsc + eslint**.
- Baseline conocido del frontend (previo a este feature): **tsc 12 errores = baseline**,
  **vitest 18 fail / 203 pass = baseline**. Cualquier cantidad distinta = regresión introducida.
- Baseline backend: **26 errores de tsc, todos en `notificaciones/mantenimiento-notificadores/`**
  (`Logger` con constructor de Nest desactualizado en los specs) = preexistente, no tocar.
- A partir de **T13** los `*.spec.ts` de este módulo **sí se versionan** (negación puntual en
  `.gitignore`). Antes corrían solo en local. Ojo: el backend tiene Jest configurado y los specs lo
  toman bien, pero **el repo no tiene CI**, así que versionarlos preserva la regresión, no la ejecuta.

## Tasks
- [x] **T1 — Backend `reporte-constancia-no-adeudos`** (ubicación original `notificaciones/`):
      module/controller/service/dto/types/spec, registrar en `notificaciones.module.ts`.
      `POST search` → `executeProcedure('Certificado.sp_certificado', { BUSC: '5', Codigo, fini, ffin })`
      + paginación en memoria (`slice`) con `pageSize` 10/100000.
      Checks: jest **6/6 pass**. Commit `9d43179`.
- [x] **T2 — Frontend `reporte-constancia-no-adeudos`** (ubicación original `notificaciones/`):
      server action + `export-utils.ts` (Excel con `exportSeq` + re-consulta `pageSize=100000`,
      headers en español y **sin pasar `Fecha` por `formatDateTime`**) + `page.tsx` (panel
      Código/Desde/Hasta, botón **Procesar**, botón **Exportar a Excel**, tabla de **7 columnas**
      `# | N°(Numero) | Año | Fecha | Código | Nombre | Concepto` con `row['Año']`/`row['Numero']`
      por corchetes, `renderPagination()` inline con ventana de ±2 páginas, skeleton/empty/error states).
      Checks: tsc 12 = baseline (0 nuevos), eslint 0 errores (1 warning, mismo patrón del gemelo),
      vitest 18 fail / 203 pass = baseline. Commit `e6cdefd`.
- [x] **T3 — Reubicar a `cobranza/reporte-constancia-no-adeudo`** (pedido explícito del usuario):
      - Mover 5 archivos backend rastreados con `git mv` (individual, no por directorio: el rename de
        directorio falló con `Permission denied` en Windows) + el spec gitignored con `Move-Item`.
      - Reescribir los 6 archivos backend con `write` (UTF-8) para corregir el contenido a singular y
        la ruta del controller a `cobranza/reporte-constancia-no-adeudo`.
      - Sacar el módulo de `notificaciones.module.ts`; registrar `ReporteConstanciaNoAdeudoModule`
        en `app.module.ts` junto a `ContribuyentesSinValoresModule`.
      - Mover la action a `actions/cobranza/` y la página a `dashboard/cobranza/`, actualizando
        `BASE`, imports, `searchConstanciaNoAdeudoAction`, `useConstanciaNoAdeudoExport`,
        `ReporteConstanciaNoAdeudoPage`, `data-testid` y el nombre del `.xlsx`.
      - Renombrar este doc y la rama a singular.
      Checks: jest **6/6 pass**; backend tsc **26 errores = baseline, 0 en el módulo movido**;
      frontend tsc **12 = baseline, 0 nuevos**; eslint **0 errores, 1 warning** (patrón gemelo);
      vitest **18 fail / 203 pass = baseline**; búsqueda case-sensitive de
      `reporte-constancia-no-adeudos` / `NoAdeudos` → **0 resultados**.
- [x] **T4 — Ajustes de grilla pedidos por el usuario**:
      - Ocultar la columna de índice global `#` (era `(page - 1) * pageSize + idx + 1`). La tabla
        queda con **6 columnas**: `N°(Numero) | Año | Fecha | Código | Nombre | Concepto`.
        Se ajustó el esqueleto de `grid-cols-7`/`Array(7)` a `6`.
      - Ampliar la grilla de **10 a 15 registros por página**: `useState(15)` en el frontend y
        `z.union([z.literal(15), z.literal(100000)]).default(15)` en el DTO, más los dos fallbacks
        `pageSize` del controller y el spec del service.
      - Reducir el espaciado vertical de las filas: `py-1.5` → `py-1` en las 6 celdas, y el
        esqueleto de `py-3` → `py-2` para que carga y tabla cargada no desarmen.
      Checks: jest **6/6 pass**; frontend tsc **12 = baseline**; eslint **0 errores, 1 warning**;
      6 `<th>` y 6 `<td>` alineados; sin restos de `pageSize: 10` en el flujo (solo la grilla
      manda 15 y el export 100000).
- [x] **T5 — Ampliar la grilla de 15 a 20 registros**: mismo recorrido que T4 —
      `useState(20)` + `z.union([z.literal(20), z.literal(100000)]).default(20)` + 2 fallbacks del
      controller + spec recalculado (25 filas → página 1 de 20, página 2 de 5, `totalPages` 2).
      Checks: jest **6/6 pass**; tsc **12 = baseline**; eslint **0 errores, 1 warning**.
- [x] **T6 — Restaurar la columna de índice global `#`** (el usuario la había ocultado en T4 y
      volvió a pedirla): se repone el `<th>#</th>` y el `<td>` con `(page - 1) * pageSize + idx + 1`,
      y el esqueleto vuelve a `grid-cols-7`/`Array(7)`. La tabla queda con **7 columnas**:
      `# | N°(Numero) | Año | Fecha | Código | Nombre | Concepto`.
      **No se revierte** el espaciado compacto (`py-1`) ni el `pageSize` de 20, que son ajustes
      separados y pedidos explícitamente.
      Checks: 7 `<th>` y 7 `<td>` alineados; tsc **12 = baseline**; eslint **0 errores, 1 warning**.
- [x] **T7 — Verificar el envío del parámetro `@Codigo` al SP** (revisión, sin cambio de
      comportamiento): se recorrió la cadena input → `buildFilters` → body del server action →
      DTO → `spParams` → `executeProcedure`. Confirmado que `Codigo` viaja con **C mayúscula** en
      todos los saltos y que `executeProcedure` es genérico (`request.input(key, ...)` sobre todas
      las claves), sin lista blanca que pueda dropearlo.
      Se agregaron 6 tests de contrato en `dto/search-constancia-no-adeudo.dto.spec.ts` (12/12 en el
      módulo) que documentan dos trampas:
      - **zod descarta claves desconocidas en silencio**: mandar `codigo` en minúscula dejaría
        `Codigo: ''` → el SP traería todo sin mostrar error. El nombre de la clave debe coincidir
        exactamente entre el action y el DTO.
      - **Ceros a la izquierda**: `padCodigo` genera `0000000`; `inferSqlType` devuelve `VarChar`
        para strings (no `Int`), así que `0282418` se manda como texto y conserva el cero.
      Pendiente sin resolver: **no hay fuente del SP en el repo**, así que no se pudo confirmar si
      el parámetro se declara `@Codigo` o `@codigo`. SQL Server suele ligar sin distinguir mayúsculas
      por collation, pero si la búsqueda por código devuelve todo sin filtrar, es el primer lugar
      donde mirar.

- [x] **T8 — Sincronizar grilla y export tras un ajuste manual del usuario**: el usuario editó
      `page.tsx` fuera de esta sesión y quitó la columna `Año` de la grilla, renombrando `N°` a
      `N° Const.`. La revisión detectó dos desincronizaciones que la foto de columnas de T4 no
      cubría:
      1. **Esqueleto desfasado** — la tabla bajó a 6 columnas pero el skeleton seguía en
         `grid-cols-7`/`Array(7)`, generando una columna fantasma durante la carga. Corregido a 6.
      2. **Export desfasado** — `export-utils.ts` seguía emitiendo `Año` y con header `N°`. Por
         decisión explícita del usuario se quitó `Año` del Excel y el header pasó a `N° Const.`,
         dejando grilla y export con las mismas 5 columnas de datos.
      `Año` **se mantiene** en `reporte-constancia-no-adeudo.types.ts` y en el mapeo del service
      porque el SP sigue devolviendo la columna: el tipo describe la fila real, solo se decidió no
      presentarla. La columna `#` no se exporta por ser un índice visual de la grilla.
      Checks: **6 `<th>` / 6 `<td>` / 6 skeleton alineados**; tsc **12 = baseline**; eslint
      **0 errores, 1 warning**.

- [x] **T9 — Precedencia del filtro: el código anula el rango de fechas** (pedido del usuario):
      cuando `@Codigo` viene informado, el service manda `@fini` y `@ffin` **vacíos** al SP, así
      una búsqueda por código no queda acotada por fechas.
      **Por qué en el backend y no en la grilla:** la regla vive en
      `reporte-constancia-no-adeudo.service.ts`, el único punto que decide qué llega al SP. Si
      estuviera en `buildFilters()` del frontend, cualquier otro cliente (Postman, otro reporte)
      seguiría mandando el rango. Evitar dos fuentes de verdad para una misma regla.
      Se usa `(Codigo ?? '').trim() !== ''` para que un código compuesto solo por espacios se
      trate como ausente y no desactive el rango por accidente. Cuando se descartan fechas que sí
      venían informadas queda un `logger.log` con los valores ignorados, para poder diagnosticar
      por qué una búsqueda por código trae registros fuera del rango visible.
      El frontend **no se modificó**: sigue mandando las fechas y el backend las normaliza. La UI
      todavía muestra los campos de fecha sin marcar que van a ser ignorados (ver pendientes).
      Checks: jest **14/14 pass** en el módulo (8 del service + 6 del DTO); tsc backend con **0
      errores en el módulo** (total 25, baseline preexistente de mantenimiento); el test previo
      `pasa Codigo y rango de fechas al SP cuando se proveen` **se reemplazó** porque afirmaba
      el comportamiento contrario al nuevo.

- [x] **T10 — Corrección de T9: el rango vacío NO desactiva el filtro, lo rompe** (bug propio,
      detectado probando contra la BD real). Leyendo el fuente del SP en `sys.sql_modules`:
      ```sql
      WHERE (@codigo IS NULL OR @codigo = '' OR cab.codigo = @codigo)
        AND cab.fec_impresion >= @fini + ' 00:00:00'
        AND cab.fec_impresion <= @ffin + ' 23:59:59'
      ```
      El SP **no tiene guarda** del tipo `@fini = '' OR ...`. Como concatena, mandar `''` produce
      `' 00:00:00'` y `' 23:59:59'`, que SQL Server convierte a `1900-01-01 00:00:00` y
      `1900-01-01 23:59:59` — **ambos extremos quedan fijados en 1900** y solo|matchearían
      constancias de ese año. T9 hacía que **toda** búsqueda por código devolviera 0 filas.
      **Arreglo: rango abierto explícito** `1900-01-01`..`9999-12-31` en vez de cadena vacía.
      Extendido a un segundo agujero del mismo tipo: si el rango viene **incompleto** (solo uno de
      los dos extremos) también cae al rango abierto, porque con un extremo vacío el SP devuelve
      0 filas en silencio.
      **No hubo que cambiar el SP** (el usuario preguntó si hacía falta): el SP es compartido con
      el sistema legado (ramas `@busc=1..4`) y tocarlo exigiría un despliegue de objetos de BD.
      Ajustar el cliente es seguro y reversible.
      Verificación: unit **16/16** + un spec de integración temporal contra la BD real
      (`192.168.3.205`) que corrió el service real y devolvió las **4** constancias de `0270801`
      con el rango `2026-10-01..2026-10-01` pedido, confirmando que las fechas se ignoran. Ese
      spec se eliminó después: requiere BD y no debe quedar como test que falla sin acceso.
      Se dejó un test de invariante (`nunca manda @fini ni @ffin vacios al SP`) que corre siempre
      sin BD y cubre justamente esta clase de regresión.

- [x] **T11 — Hallazgo sobre la columna `Año`** (explica por qué el usuario la quitó): el SP tiene
      la columna **comentada** en el `SELECT` de `@busc=5`
      (`--cab.NUMCERTIF AS Numero,cab.CERT_ANIO AS [Año]`). El resultset real es
      `Numero, Fecha, codigo, Nombre, concepto`. **`Año` nunca volvió del SP**, por eso la grilla
      y el export la mostraban vacía. `Numero` ya trae el año concatenado (`00007-2026`), que es
      lo que se ve en la columna `N° Const.`.

- [x] **T12 — UX del filtro excluyente** (cierra el hueco reportado en el PR #117): cuando hay
      código, la UI **deshabilita** los dos `input type="date"` (con estilo atenuado) y muestra un
      aviso ámbar: *"Buscando por código: el rango de fechas se ignora y se muestra todas las
      constancias del contribuyente."* El aviso vive en el panel de criterios, no sobre la grilla.
      - La condición sale de `codigoActivo = codigo.trim() !== ""`, **el mismo criterio que usa el
        service**, para que la UI no prometa un filtrado que el backend no hace.
      - Los valores de fecha **no se borran**: quedan en el estado, así que al limpiar el código
        el rango vuelve intacto. Se descartó limpiarlos por ser destructivo.
      - Bug colateral encontrado al derivar `codigoActivo`: `padCodigo("   ")` devolvía `"0000000"`,
        convirtiendo un campo de solo espacios en un código real. Ahora devuelve `""` cuando no hay
        dígitos, que es lo que el service espera.
      - Checks: tsc frontend **12 = baseline, 0 en `page.tsx`**; eslint **0 errores, 0 warnings**.

- [x] **T13 — Specs versionados** (cierra el segundo pendiente del PR #117): `.gitignore` ignoraba
      `*.spec.ts` con el comentario *"Test files (all current and future)"*. Desbloquear la regla
      global habría metido **43** specs de golpe, así que se agregó una negación quirúrgica:
      ```gitignore
      !backend/src/cobranza/reporte-constancia-no-adeudo/**/*.spec.ts
      ```
      - Verificado con `git check-ignore -q`: los 2 specs del módulo salen con exit 1 (no ignorados)
        y un spec de otro módulo sigue con exit 0 (ignorado). Sin regresión de alcance.
      - Los 16 tests quedan ahora en el PR: `jest` **2 suites / 16 tests pass**.

## Route declaration
- T1: delegated writer (general) — **primera delegación de frontend falló** (worker `general` reportó
  archivos que nunca escribió + verificaciones que no corrió; `git status` limpio). Corregido con
  feedback explícito en reintento.
- T2: delegated writer (general, reintento) — 3 archivos (110/76/511 líneas).
- T3: **directo inline del orquestador** (relocación mecánica + verificación, sin diseño nuevo).
  Lección: **`Set-Content` de PowerShell 5.1 destruyó la codificación UTF-8** (acentos → `?`) y el
  `-replace` case-insensitive comió la `S` de `Service`/`Schema`. Todo el contenido de texto debe
  editarse con las herramientas `read`/`edit`/`write`, nunca con `Set-Content`/`-replace`.
- T12, T13: **directo inline del orquestador**. Los dos cambios son de una solaconcern sobre archivos
  ya leídos y entendidos en esta sesión, con verificación reproducible; delegar habría exigido
  re-transmitir el contexto del SP y del service sin agregar señal.

## Acceptance criteria
- La consulta devuelve las 6 columnas del SP, en orden, paginadas de a 20.
- El panel superior busca por código y por rango de fechas; **Procesar** dispara la consulta.
- La tabla muestra `Numero, Fecha, codigo, Nombre, concepto` con headers en español (`N° Const.`,
`Fecha`, `Código`, `Nombre`, `Concepto`), precedidas por la columna de índice global `#`. El
    resultset real del SP **no incluye `Año`** (está comentada en el `SELECT` de `@busc=5`) y por eso
    no se presenta en grilla ni en export.
- **La fecha se muestra exactamente como la devuelve el SP (`dd/mm/yyyy`), sin invertir.**
- Export a Excel trae **todas** las filas de los filtros actuales (no solo la página visible).
- Backend protegido con `JwtAuthGuard`; contrato `{ success, data, total, page, pageSize, totalPages }`.
- Tests backend verdes; frontend compila y pasa lint sin regresiones.
- **La implementación vive bajo `cobranza/reporte-constancia-no-adeudo` en backend y frontend.**

## Known unknowns / next step

- **Único pendiente real:** alta del menú por parte del DBA con la ruta
  `dashboard/cobranza/reporte-constancia-no-adeudo`. Sin eso la pantalla no aparece en el sidebar,
  aunque la ruta funciona. La caché de menú dura 30 minutos, así que hay que esperar o reiniciar sesión.
- ~~¿La rama `@BUSC='5'` filtra por `@fini`/`@ffin`?~~ **Resuelto en T9/T10.** Verificado contra la BD
  real: con `@Codigo` informado el SP ignera el rango, y con cadena vacía en las fechas devuelve 0
  filas porque concatena sin guarda. La UI ahora lo dice explícitamente (T12).
- ~~Los tests no tienen cobertura en CI.~~ **Resuelto en T13.** Los 16 tests del módulo están
  versionados; el resto de los specs del repo sigue ignorado a propósito.

## Pendientes fuera de este PR

- El repo **no tiene workflows de CI** (`.github/workflows` vacío): versionar los specs evita que se
  pierdan, pero no los ejecuta nadie hasta que se defina un pipeline.
- Desbloquear los specs del resto del repo (~41 archivos más) es un PR aparte, no algo que deba
  colarse acá.
