# Feature: CRUD de valores unitarios — mantenimiento-tablas

## Objetivo

Implementar el CRUD de `CALCULO.TBLVALUNI` en
`mantenimiento-tablas/valores-unitarios`, siguiendo el patrón visual y técnico de
`mantenimiento-uit`, con búsqueda por año y operaciones sobre filas individuales.

## Problema

El repositorio no tiene ninguna referencia a `TBLVALUNI`, ni SPs de CRUD, ni SQL
script con su esquema. La tabla no tiene PK declarada; `idsigma` está duplicado en
muchos años, así que no puede usarse como identificador. La clave natural
verificada en datos reales es `(region, año, codi)`.

## Alcance autorizado

- **SÍ**: backend con consultas parametrizadas (`queryWithParams`), DTOs Zod,
  envelope canónico de errores, guard JWT; frontend con búsqueda por año, grilla,
  alta, edición y baja física de una fila; tests de backend y frontend; registrar
  el módulo en `app.module.ts`; excepción en `.gitignore` para versionar specs.
- **NO**: SPs nuevos en base de datos, alta masiva por año, copia desde año
  anterior, soft-delete, exportación a Excel, paginación server-side, cambios en
  `mantenimiento-ingresos` ni en otros módulos.
- El usuario eligió **filas individuales** el 2026-11-23. La baja es física porque
  la tabla no tiene columna de estado.

## Restricciones

- RDD desactivado globalmente → sin ciclo de review nativo.
- `odd/OWNERSHIP.md`: un solo escritor por archivo. No tocar archivos de otros
  features. No correr `tsc`/build/lint globales; verificación acotada al módulo.
- Puentes autorizados por el orquestador: `backend/src/app.module.ts`,
  `.gitignore`, `odd/OWNERSHIP.md`. La fila de menú en BD es externa al repo y
  queda fuera de este trabajo; la ruta Next.js existirá, pero el sidebar
  dependerá de que el usuario/DBA agregue el registro de menú.
- El hook `gga` falló en entregas anteriores por créditos del proveedor; si vuelve
  a fallar, los commits pueden hacerse con `--no-verify`, documentándolo.
- Sin commit, push, issue ni PR salvo los work-unit commits autorizados por ODD
  en esta rama. Push/PR/merge quedan bajo decisión del usuario.

## Contrato verificado en vivo (2026-11-23)

`Calculo.Tblvaluni`:

| Columna | Tipo | Null | Observación |
|---|---|---|---|
| `region` | `char(1)` | NO | Parte de la clave natural |
| `año` | `char(4)` | NO | Parte de la clave natural; se expone como `anno` en la API |
| `codi` | `char(2)` | NO | Parte de la clave natural; códigos actuales `A1`…`J7` |
| `valor` | `decimal(7,2)` | NO | Máximo `99999.99` |
| `operador` | `varchar(50)` | NO | Default `USER_NAME()`; se sobreescribe con el usuario JWT |
| `estacion` | `varchar(50)` | NO | Default `HOST_NAME()`; se sobreescribe con la IP del cliente |
| `fechor_ing` | `datetime` | NO | Default `GETDATE()`; se actualiza en cada escritura |
| `idsigma` | `int` | NO | IDENTITY (seed 1, increment 1); no se escribe ni se expone |

Datos reales: 2390 filas, años 1992–2027, años recientes con 70 filas,
`(region, año, codi)` sin duplicados, `idsigma` con duplicados. No hay FK ni PK.
SPs que mencionan la tabla: `Rentas.actualizar_valores` y
`Fiscalizacion.sp_CalculoPisos`; ninguno implementa CRUD.

## Contrato API propuesto

- `GET /api/mantenimiento-tablas/valores-unitarios/years` → `{ years: string[] }`.
- `GET /api/mantenimiento-tablas/valores-unitarios?anno=2027&region=1` → `{ data: ValorUnitarioRow[] }`.
- `POST /api/mantenimiento-tablas/valores-unitarios` → `{ message, row }`.
- `PUT /api/mantenimiento-tablas/valores-unitarios` → `{ message, row }`.
- `DELETE /api/mantenimiento-tablas/valores-unitarios/:region/:anno/:codi` → `{ message }`.

Errores: `{ code, message, details? }` con `validation_error`, `not_found`,
`conflict`, `database_unavailable` según corresponda. Todas las rutas usan
`JwtAuthGuard`. Todo SQL usa `request.input` vía `queryWithParams`.

## Checklist

- [x] T01 — Backend service: tipos, schemas Zod, búsqueda por año/región, alta,
      edición y baja por clave natural con SQL parametrizado y auditoría; tests
      Jest de service (RED → GREEN).
- [x] T02 — Backend controller/module: rutas, guard JWT, validación Zod,
      envelope canónico, registro en `app.module.ts`; tests Jest de controller.
- [x] T03 — Frontend: página con selector de año, grilla, modales de alta/edición
      y confirmación de baja; estados loading/empty/error; tests Vitest.
- [x] T04 — Cierre: verificación acotada, `git status`, work-unit commits,
      actualización de `odd/OWNERSHIP.md` y este documento con evidencia.
- [x] T05 — Alta masiva: endpoint `POST /bulk` con upsert atómico de los 70
      códigos `A1`..`J7`, formulario con una caja por código y un solo Guardar;
      corregir `idsigma` en el INSERT individual; tests backend y frontend.
- [x] T06 — Restituir el alta individual: «Nuevo valor» vuelve a pedir
      región/año/código/valor uno por uno; el modal masivo sale de la UI y el
      endpoint `/bulk` queda en backend sin uso; tests de frontend actualizados.
- [x] T07 — Formulario individual: región por defecto `1`, etiqueta
      «Categoría» en formulario y grilla, validación `A1..J7` en boundary
      frontend y Zod, y verificación de clave única `región+año+categoría`
      (409 del backend ya existente, con test de regresión en frontend).
- [x] T08 — Normalizar la entrada: categoría en mayúsculas, año solo dígitos
      y `estacion` con `os.hostname()` del backend en alta/edición/bulk;
      tests de frontend y controller actualizados.
- [x] T09 — Modal de registro por año: reemplaza el alta individual, permite
      agregar categorías a una lista con «Agregar» y «Grabar» registra la lista;
      las categorías no agregadas se envían con valor 0. `/bulk` pasa a insertar
      solo las filas faltantes, conservando las existentes.
- [x] T10 — Corregir el desfasaje de 5 horas de `fechor_ing`: configurar
      `useUTC: false` en el pool de SQL Server y agregar test de regresión;
      alcance global del backend, decidido por el usuario.
- [x] T11 — Integrar `Calculo.sp_Valuni_LogCambio` en update y delete para grabar
      la imagen anterior en `Historial.TBLVALUNI`; el SP ya está creado en la BD.
- [x] T12 — Grabar la acción (`MODIFICACION`/`ELIMINACION`) en la nueva columna
      `Historial.TBLVALUNI.accion`; actualizar el SP y los tokens del backend.
- [x] T13 — Reemplazar el SP por un trigger `AFTER UPDATE, DELETE` en
      `Calculo.Tblvaluni`; volver al DML directo en el backend y retirar el
      mapeo del error 50004.

## Rutas y triggers de delegación

- Exploración: `explore` (ya ejecutada) por mapping trigger.
- Implementación: un único `general` writer para T01–T03, por writer trigger
  (múltiples archivos no triviales). Sin worktree aislado: no hay otro agente
  activo en `mantenimiento-tablas`.
- Verificación: comandos acotados por action; sin verifier separado (RDD off y
  writer reportará resultados observados), con spot check del orquestador.

## Verificación

- Backend: `backend\node_modules\.bin\jest.cmd --runInBand src/mantenimiento-tablas/valores-unitarios`
- Frontend: `frontend\node_modules\.bin\vitest.cmd run src/app/dashboard/mantenimiento-tablas/valores-unitarios`
- Spot check del orquestador: leer los diffs y re-ejecutar un comando reportado por
  el writer antes de entrega.

## Progreso

Feature creada el 2026-11-23. Branch `feat/valores-unitarios-crud` desde `DEV`.
T01–T03 implementados por un único writer y verificados por el orquestador.
T04 cerrado con cuatro work-unit commits en `feat/valores-unitarios-crud`.

## Evidencia de verificación

Ejecutadas por el writer en modo TDD (RED → GREEN) y repetidas por el
orquestador:

| Fase | Comando | RED | GREEN (writer) | Spot check orquestador |
|---|---|---|---|---|
| Backend | `backend\node_modules\.bin\jest.cmd --runInBand src/mantenimiento-tablas/valores-unitarios` | 2 suites fallidas, 0 tests, TS2307, exit 1 | 2 suites / 19 tests OK, exit 0 | 2 suites / 19 tests OK, 33.273 s |
| Frontend | `frontend\node_modules\.bin\vitest.cmd run src/app/dashboard/mantenimiento-tablas/valores-unitarios` | 1 archivo fallido, sin tests, exit 1 | 1 archivo / 5 tests OK, exit 0 | 1 archivo / 5 tests OK, `VITEST_EXIT=0`, 11.61 s |

Lectura estructural del orquestador: `queryWithParams` con constantes de tabla
y `request.input` para todo valor externo; `@UseGuards(JwtAuthGuard)` en el
controller; Zod en todas las rutas; `operador`/`estacion` acotados a 50 chars;
`idsigma` nunca expuesto; respuesta de error canónica `{code,message,details?}`.

No ejecutados a propósito: `tsc`, build, lint y suites completas (fuera del
alcance acotado de la feature). Vitest emite warnings `act(...)` en stderr con
`userEvent`; no afectan el resultado ni cuentan como fallos.

El `Exit code: 1` del primer re-run de Vitest fue un artefacto de pipe de
PowerShell al redirigir stderr; con captura directa el código real es 0.

Work-unit commits (Conventional Commits, sin atribución de IA):

- `a6d3e30` — T01: service, DTOs, errores y spec de backend; incluye excepciones
  de `.gitignore` para los specs.
- `bc23e2f` — T02: controller, module, spec de controller y puente `app.module.ts`.
- `2404420` — T03: página, componentes y test de frontend.
- T04 — tracker y `odd/OWNERSHIP.md` (este commit).

El hook `gga` falló por créditos agotados del proveedor externo en el primer
intento de commit; los cuatro commits se hicieron con `--no-verify`, como en la
entrega anterior de `mantenimiento-ingresos`. No hubo hallazgos de código del
hook: falló antes de revisar el diff.

## Extensión T05 — Alta masiva (2026-11-23)

El usuario pidió que el alta muestre todas las cajas de texto de una vez
(`A1`…`J7`) y se guarde en una sola operación. Decidió **upsert**: los códigos
con valor se insertan si faltan o se actualizan si ya existen; los vacíos se
omiten. Todo en una sola sentencia atómica.

Se verificó en vivo que `idsigma` es `int IDENTITY` (seed 1, increment 1,
último valor 2077) y no es único: hay 259 filas históricas con `idsigma = 0`.
Por error se interpretó que era `NOT NULL` sin default y se agregó
`idsigma = 0` a los `INSERT`; eso provoca el error 544
(`Cannot insert explicit value for identity column ... IDENTITY_INSERT is set
to OFF`). La corrección definitiva omite la columna en el `INSERT` individual y
en el `WHEN NOT MATCHED` del `MERGE`, para que SQL Server genere el valor.

Contrato nuevo: `POST /api/mantenimiento-tablas/valores-unitarios/bulk` con
`{ region, anno, items: [{ codi, valor }] }`; responde
`{ message, rows, affected }`. Zod valida 1–70 items, códigos `^[A-J][1-7]$`,
.valores 0–99999.99 y códigos únicos.

SQL: un único `MERGE ... USING (VALUES (@codi0, @valor0), ...)` con
`OUTPUT INSERTED.*`. Los valores van siempre por `request.input`; el texto SQL
solo contiene marcadores generados. Sin transacción explícita: una sola
sentencia ya es atómica.

Frontend: modal de alta masiva con 70 inputs (10 letras × 7 números), región y
año arriba, un solo Guardar; reemplaza al modal de alta individual. El modal
de edición individual se mantiene. Los vacíos no se envían.

Checks de T05: los mismos comandos acotados de backend y frontend, más un test
de regresión que compruebe que el INSERT individual incluye `idsigma`.

Resultado observado: backend 2 suites / 26 tests OK (spot check 27.314 s) y
frontend 1 archivo / 6 tests OK (spot check `VITEST_EXIT=0`, 15.53 s). TDD con
RED inicial: backend `TS2339: Property 'upsertMany' does not exist`; frontend
por los nuevos asertos bulk. Work-unit commits:

- `0c0a14f` — backend: DTO bulk, `upsertMany` con `MERGE`, ruta `POST /bulk`,
  `idsigma = 0` en el INSERT individual y tests.
- `a15d835` — frontend: modal con las 70 cajas, cableado de «Nuevo valor» y
  tests actualizados.
- T05 — tracker (este commit).

Pendiente honesto: el `MERGE`/`OUTPUT` solo está cubierto con `DatabaseService`
mockeado; no se ejecutó contra SQL Server real. Tampoco se corrieron `tsc`,
build, lint ni suites completas. El hook `gga` sigue fuera de servicio por
créditos del proveedor, así que estos commits también van con `--no-verify`.

### Ajuste de layout del modal masivo

El usuario pidió que el ancho vaya por letras: una fila `A1`…`A7`, otra
`B1`…`B7`, hasta `J1`…`J7`. El modal pasó de una grilla plana de 10 columnas a
diez filas explícitas de 7 columnas (`grid-cols-7`), derivadas de
`VALORES_UNITARIOS_CODES` en grupos de siete. El test de frontend ahora verifica
las 10 filas y el orden exacto de los 70 `aria-label`. Spot check del
orquestador: 1 archivo / 6 tests OK, `VITEST_EXIT=0`. Sin cambios en el
contrato ni en el payload; no se requirió correr la suite de backend.

### Diagnóstico del 503 en `POST /bulk`

El usuario reportó `Fallo de base de datos en valores-unitarios` al ejecutar la
carga masiva. Con autorización explícita para consultar la BD remota **solo en
lectura** se verificó: login `sa` con SELECT/INSERT/UPDATE/DELETE sobre
`Calculo.Tblvaluni`, esquema acorde, sin triggers, enlace de parámetros correcto
y compilación de la `MERGE` de 70 items y del `INSERT` individual con
`SET NOEXEC ON`. No había rastro del error en los logs del motor.

La causa sigue sin identificarse porque `throwDatabaseError` descartaba el
error original. Se agregó un log sanitizado con `name`, `message` truncado y
`code`/`number`/`state` cuando existen, sin SQL, parámetros ni credenciales
(se enmascaran `password`/`pwd`/`token`/`secret`). TDD observado: RED con el
nuevo aserto del logger, GREEN con 2 suites / 27 tests OK y build de backend
exitoso. El reintento del usuario produjo el error 544: `idsigma` es IDENTITY,
así que el `idsigma = 0` agregado antes era la causa. Se corrigió omitiendo la
columna en ambos INSERT (TDD: RED en los dos asertos de regresión, GREEN con
2 suites / 27 tests OK). Falta recompilar y reiniciar el backend que corre
`dist/main` antes de repetir el bulk.

### Restitución del alta individual (2026-11-24)

El usuario pidió volver a la forma de registro anterior: «que vaya pidiendo por
cada categoría». Ante la duda sobre qué hacer con la carga masiva, eligió
**solo formulario individual**: «Nuevo valor» abre `ValorUnitarioFormModal` en
modo `create` (región, año, código y valor), y el modal masivo se desconecta de
la UI. El contrato `POST /bulk` sigue implementado en backend, sin uso desde la
página. El archivo `valores-unitarios-bulk-modal.tsx` queda en el repo sin
importaciones activas; no se borra para no expandir el diff más allá de lo
pedido.

`page.tsx`: el estado `formMode` vuelve a `"create" | "edit" | null`, el botón
«Nuevo valor» llama a `setFormMode("create")` y un único bloque renderiza el
modal individual en modo `create` o `edit`. `page.test.tsx`: los tres tests
bulk se reemplazan por dos tests del flujo individual (POST simple con los
cuatro campos, cero llamadas a `/bulk`, y validación de cada campo sin
petición). Quedan 5 tests en total.

Ruta de implementación: inline (dos archivos conocidos, sin investigación ni
decisión de diseño pendiente; no aplica mapping trigger ni writer trigger).
Backend sin cambios, así que no se repitió su suite.

Spot check del orquestador: `frontend\node_modules\.bin\vitest.cmd run
src/app/dashboard/mantenimiento-tablas/valores-unitarios` → 1 archivo / 5 tests
OK, `VITEST_EXIT=0` (warnings `act(...)` en stderr, no fallos). Work-unit commit
`77caed1` en `feat/valores-unitarios-crud` con `--no-verify` por el hook `gga`
fuera de servicio.

### T07 — Región por defecto, categoría y clave única (2026-11-24)

El usuario pidió que al grabar la región por defecto sea `1`, que el campo
«Código» se llame «Categoría» y que se verifique que `región+año+categoría` no
se repita, con categorías en los rangos `A1..A7` … `I1..I7`. Como el contrato
verificado y los datos reales llegan hasta `J7`, se planteó la contradicción y
el usuario eligió **A..J (70 categorías)**. Se mantuvieron las claves del API y
de BD como `codi`; solo cambiaron las etiquetas visibles.

`ValorUnitarioFormModal`: en `create` la región se inicializa en `"1"`; en
`edit` se conserva la de la fila (sigue readonly). La validación client-side
usa `/^[A-J][1-7]$/` con el mensaje `La categoría debe estar entre A1 y J7`.
`SaveValorUnitarioSchema` replica exactamente esa regla; `ValorUnitarioKeySchema`
sigue derivando del mismo esquema. La grilla muestra «Categoría» como encabezado.
No se agregó una nueva verificación de duplicados: `create()` ya llama a
`findByKey()` y responde 409; se conservó ese test y se sumó uno de frontend que
confirma que el conflicto muestra el error sin cerrar el modal ni refrescar.

Ruta de implementación: delegated direct (un único writer, writer trigger por
cinco archivos no triviales), con `interface-design` y `work-unit-commits` como
skills inyectados desde el registry. Sin `tsc`, build, lint ni suites completas.

TDD observado por el writer: RED frontend 6 fallidos / 2 OK (8), backend 1
fallido / 27 OK (28); GREEN final frontend 8/8 y backend 28/28. Spot check del
orquestador: mismos comandos acotados, frontend `VITEST_EXIT=0`, backend
`JEST_EXIT=0`. Los warnings `act(...)` siguen siendo ruido conocido de stderr.
Work-unit commit `30aef96` en `feat/valores-unitarios-crud`, con `--no-verify`
por el hook `gga` fuera de servicio.

### T08 — Mayúsculas, año numérico y estación del servidor (2026-11-24)

El usuario pidió que la categoría se ingrese en mayúsculas, que el año solo
aceptara valores numéricos y que se verificara que se almacena el nombre del
equipo de cómputo. Como el navegador no puede informar de manera confiable el
nombre de la PC del usuario, se le presentaron tres orígenes y eligió
**`os.hostname()` del backend**.

`ValorUnitarioFormModal` transforma la categoría con `.toUpperCase()` y filtra
el año con `replace(/\D/g, "")` en `onChange`, antes de validar y de construir
el payload. En el controller, `station()` ahora devuelve `audit(hostname())` y
se usa en `create`, `update` y `bulk`; se eliminó el uso de `x-forwarded-for` y
`req.ip`, y se conserva el límite de 50 caracteres. El `@Req()` sigue siendo
necesario para el usuario JWT. El service no cambió: sus `INSERT`/`UPDATE`/
`MERGE` ya ligan `@estacion`, y sus tests verifican ese parámetro.

Ruta de implementación: delegated direct (un único writer, writer trigger por
cuatro archivos no triviales), con `interface-design` y `work-unit-commits`
inyectados. Sin `tsc`, build, lint ni suites completas.

TDD observado por el writer: RED frontend 2 fallidos / 8 OK (10), backend 3
fallidos / 25 OK (28); GREEN final frontend 10/10 y backend 28/28. Spot check
del orquestador: frontend `VITEST_EXIT=0`, backend `JEST_EXIT=0`. Los tests del
controller espyan `os.hostname` y comprueban `'SERVIDOR-01'` en las tres
operaciones. No se hizo una escritura real en SQL Server: la autorización de BD
era solo lectura; la verificación es estructural (parámetro ligado en el SQL).
Work-unit commit `4361e9c` en `feat/valores-unitarios-crud`, con `--no-verify`
por el hook `gga` fuera de servicio.

### T09 — Registro por año con lista de categorías (2026-11-24)

El usuario pidió que «Nuevo valor» abra un modal que solicite el año y las
categorías, que permita ir agregando categorías a una lista con un botón
«Agregar», y que «Grabar» registre la lista; las categorías no agregadas deben
registrarse automáticamente con valor 0. Ante la duda sobre filas ya existentes
para ese año, eligió **reemplazar el alta y conservar las existentes**.

`ValoresUnitariosBulkModal` se reconvirtió en ese modal: región por defecto
`1`, año numérico, categoría en mayúsculas con rango `A1..J7`, valor válido,
botón «Agregar» con lista visible y removible, y «Grabar». El payload envía las
70 categorías en orden, con las no agregadas en `0`. `page.tsx` abre este modal
desde «Nuevo valor» y deja `ValorUnitarioFormModal` solo para edición; al
grabar con éxito selecciona el año informado y refresca la grilla.

En el backend `upsertMany` conserva un único `MERGE` atómico y parameterizado,
pero sin cláusula `WHEN MATCHED`: el `WHEN NOT MATCHED THEN INSERT` agrega solo
las filas ausentes y nunca sobrescribe las existentes. No se tocaron DTOs ni el
controller; el esquema Zod ya acepta los 70 ítems.

Ruta de implementación: delegated direct (un único writer, writer trigger por
cinco archivos no triviales), con `interface-design` y `work-unit-commits`
inyectados desde el registry. Sin `tsc`, build, lint ni suites completas.

TDD observado por el writer: RED frontend 8 fallidos / 4 OK (12), backend 1
fallido / 27 OK (28); GREEN final frontend 12/12 y backend 28/28. Spot check
del orquestador: mismos comandos acotados, frontend `VITEST_EXIT=0`, backend
`JEST_EXIT=0`. Los warnings `act(...)` siguen siendo ruido conocido de stderr.
La verificación es estructural: no hubo escritura real en SQL Server porque la
autorización de BD era solo de lectura. Work-unit commit `d69d345` en
`feat/valores-unitarios-crud`, con `--no-verify` por el hook `gga` fuera de
servicio.

### T10 — Hora de ingreso sin desfasaje (2026-11-24)

El usuario reportó que la fecha mostrada no coincidía con la del servidor. Una
consulta de solo lectura confirmó que el almacenamiento es correcto: `GETDATE()`
dio 12:36 local, `SYSUTCDATETIME()` 17:36Z (offset -300 min) y el último
`fechor_ing` guardado era 12:31. El desfasaje ocurría al leer: tedious viene con
`useUTC: true` y `database.service.ts` no lo sobrescribía, así que la hora local
de SQL se serializaba como `...T12:31:53.273Z` y el navegador en `America/Lima`
la mostraba a las 07:31. El usuario eligió corregirlo en el backend, con alcance
global.

Se extrajo `buildMssqlConfig(env)` como fábrica pura y se agregó
`options.useUTC: false`; `DatabaseService` consume esa fábrica sin otros cambios
de configuración. El nuevo spec cubre la opción y preserva el mapeo de
credenciales, pool y timeouts. Con la misma consulta de solo lectura usando
`useUTC: false`, el último `fechor_ing` pasó a `2026-11-24T17:31:53.273Z` y se
muestra `24/11/2026, 12:31 p. m.` en Lima. La corrección depende de que el
proceso Node corra en la misma zona horaria que SQL Server (verificada localmente
como `America/Lima`, UTC-5); no se tocó `TZ` ni el frontend.

Ruta de implementación: delegated direct (un único writer, writer trigger por
dos archivos no triviales), con `interface-design` y `work-unit-commits`
inyectados. Sin `tsc`, build, lint ni suites completas.

TDD observado por el writer: RED con `TS2305` por el export ausente
(`JEST_DB_EXIT=1`); GREEN 3/3 en el spec nuevo y 28/28 en valores-unitarios.
Spot check del orquestador: `JEST_DB_EXIT=0` y `JEST_VU_EXIT=0`. El spec nuevo
está ignorado por `.gitignore` (`*.spec.ts`), así que se incluyó con `git add -f`.
Work-unit commit `76bd447` en `feat/valores-unitarios-crud`, con `--no-verify`
por el hook `gga` fuera de servicio.

### T11 — Auditoría de modificaciones y eliminaciones (2026-11-24)

El usuario creó en la BD `Calculo.sp_Valuni_LogCambio`, verificado por consulta de
solo lectura: misma firma y cuerpo entregados, con `SET NOCOUNT ON`, OUTPUT de
`deleted.*` hacia `Historial.TBLVALUNI` y `THROW 50004` cuando la clave natural
no existe. Se integró en `update` y `remove` del service, y el `@Delete()` del
controller ahora reenvía `operador` y `estacion` como hacían el alta y la edición.
No se tocaron `create` ni `upsertMany`.

Punto delicado: con `SET NOCOUNT ON`, `rowsAffected` queda vacío y el check
anterior de 404 daba falsos `not_found`. Se reemplazó por el mapeo del error SQL
`50004` a `notFoundError`, dejando cualquier otro error en
`database_unavailable` con el envelope canónico. `@valor` se envía explícitamente
en las dos acciones (`null` para DELETE) tipado como `mssql.Decimal(7, 2)`.
`idsigma` no se envía: es IDENTITY.

Ruta de implementación: delegated direct (un único writer, writer trigger por
cuatro archivos no triviales), con `work-unit-commits` inyectado. Sin `tsc`,
build, lint ni suites completas, y sin escrituras reales en SQL Server.

TDD observado por el writer: RED con `TS2554` por las firmas nuevas
(`JEST_VU_EXIT=1`); GREEN 30/30 en dos suites (`JEST_VU_EXIT=0`). Spot check del
orquestador: mismos 30/30 con `JEST_VU_EXIT=0`; `git diff --check` sin errores
de whitespace. Work-unit commit `0ef8754` en `feat/valores-unitarios-crud`, con
`--no-verify` por el hook `gga` fuera de servicio.

### T12 — Columna `accion` en el historial (2026-11-24)

El usuario agregó `accion varchar(20) NULL` a `Historial.TBLVALUNI`. Consulta de
solo lectura confirmó que era la columna 12 y que el SP seguía insertando solo
11 columnas. Se entregó al usuario un `CREATE OR ALTER` del SP que normaliza la
entrada a `MODIFICACION` o `ELIMINACION` y la escribe en la columna nueva;
acepta además los tokens viejos `UPDATE`/`DELETE` para no romper el backend aún
no reconstruido. El usuario ejecuta el script en la BD; este trabajo no escribió
en SQL Server.

En el backend se definieron `LOG_ACTION_MODIFICACION` y
`LOG_ACTION_ELIMINACION` como constantes de módulo y se usaron en las llamadas
al SP. El resto del contrato (auditoría, tipos, 50004 → 404, relectura) quedó
intacto. Las filas de historial anteriores siguen con `accion` en `NULL`: no es
posible inferir la acción desde los datos ya grabados.

Ruta de implementación: delegated direct (un único writer, writer trigger por
dos archivos no triviales), con `work-unit-commits` inyectado. Sin `tsc`, build,
lint ni suites completas.

TDD observado por el writer: RED con 2 tests fallidos por los tokens
(`JEST_VU_EXIT=1`); GREEN 30/30 (`JEST_VU_EXIT=0`). Spot check del orquestador:
mismos 30/30 con `JEST_VU_EXIT=0`. Despliegue: el SP nuevo debe quedar activo
antes o junto con el backend, porque el SP actual declara `@Accion varchar(10)`
y truncaría `MODIFICACION`, disparando el error 50002. Work-unit commit
`9021f4a` en `feat/valores-unitarios-crud`, con `--no-verify` por el hook `gga`
fuera de servicio.

### T13 — Auditoría por trigger en lugar de SP (2026-11-24)

El usuario pidió reemplazar el procedimiento por un trigger. Consulta de solo
lectura confirmó que `Calculo.Tblvaluni` no tenía triggers. Se entregó un
`CREATE OR ALTER TRIGGER Calculo.tr_Tblvaluni_Auditoria ... AFTER UPDATE, DELETE`
que graba la imagen anterior en `Historial.TBLVALUNI` con
`accion = 'MODIFICACION'` o `'ELIMINACION'`. La rama UPDATE une `deleted` con
`inserted` por `idsigma` (IDENTITY, inmutable) para soportar varias filas por
sentencia; la rama DELETE usa `deleted` porque `inserted` está vacío. El usuario
ejecuta el script; este trabajo no escribió en SQL Server.

El backend volvió al DML directo parametrizado: `update` y `remove` usan
`queryWithParams` y el check `rowsAffected === 0` para el 404. Se retiraron el
nombre del SP, los tokens de acción, `NOT_FOUND_ERROR_NUMBER`,
`isMissingRowError`, `throwLogCambioError` y el import de `mssql`. El controller
de DELETE perdió `@Req()` porque el trigger obtiene la auditoría de la propia
fila. En delete, `usu_act`/`pc_act` son los últimos valores de la fila, no
necesariamente quien borra; identificar al que borra exigiría
`CONTEXT_INFO`/`SESSION_CONTEXT`. Si el SP viejo sigue activo y alguien lo llama,
el trigger también dispara y genera historial duplicado: hay que retirarlo.

Ruta de implementación: delegated direct (un único writer, writer trigger por
cuatro archivos no triviales), con `work-unit-commits` inyectado. Sin `tsc`,
build, lint ni suites completas.

TDD observado por el writer: RED con `TS2554` por las firmas nuevas
(`JEST_VU_EXIT=1`); GREEN 30/30 (`JEST_VU_EXIT=0`). Spot check del orquestador:
mismos 30/30 con `JEST_VU_EXIT=0` y `git diff --check` limpio.

## Próximo paso

Feature cerrada con T01–T13 completos. «Nuevo valor» registra un año completo:
las categorías agregadas con su valor y el resto en 0, insertando solo las
filas faltantes. La edición individual sigue disponible desde la grilla, con
región por defecto `1`, categoría `A1..J7` en mayúsculas, año numérico y
`estacion` con el hostname del servidor. El control de duplicados de la alta
individual sigue a cargo del 409 del backend. El renombraje de `upsertMany` a
`insertManyIfMissing` quedó fuera de alcance. El fix de `idsigma` para
`POST /bulk` sigue pendiente de confirmación en
el entorno corriente: ejecutar `npm run build` en `backend`, reiniciar el
proceso que corre `dist/main` y repetir el bulk solo si se vuelve a habilitar.
Push, PR y merge quedan bajo decisión del usuario. La fila del menú en BD es
externa al repo y debe cargarla el usuario/DBA (`Acceso.sp_LogOut`, campo
`doform2`). Sin despliegue por parte de este trabajo.
