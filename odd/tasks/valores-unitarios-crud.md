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
| `idsigma` | `int` | NO | No único; se omite en altas y no identifica filas |

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

## Próximo paso

Push, PR y merge quedan bajo decisión del usuario. La fila del menú en BD es
externa al repo y debe cargarla el usuario/DBA (`Acceso.sp_LogOut`, campo
`doform2`). Sin despliegue por parte de este trabajo.
