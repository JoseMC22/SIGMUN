# ODD — Estado de Cuenta Proyectado

## Objetivo
Implementar en SIGMUN el "Estado de Cuenta Proyectado" del legacy, empezando por el punto de entrada: la búsqueda de contribuyentes de `mantcontriproyec/index` con su acción "Estado de Cuenta".

## Problema / Por qué
El usuario pidió el feature "estado de cuenta proyectado" indicando que en el legacy apunta a `mantcontriproyec/index`. Verificación con evidencia: esa ruta es la **búsqueda de contribuyentes** (`MantcontriproyecController.php:10-37`), y el estado de cuenta real se abre desde la columna de acción hacia `rentascajaproyec/index` (`js_Mantcontriproyec.js:112-115`, título "Estado de Cuenta Proyectado"). El usuario eligió el alcance **"Búsqueda + enlace"** el 2026-11-17: este work unit entrega la grilla de búsqueda y la acción; la pantalla destino se implementa en un child posterior.

## Alcance acordado
- Backend: endpoint de búsqueda de contribuyentes sobre `Rentas.sp_Mcontribuyente` con `@busc=6` (count) y `@busc=5` (rows), réplica del `consultaAction` legacy (`MantcontriproyecController.php:274-341`).
- Filtros legacy: `rdcriterio ∈ {C,N,D,R}` con mapeo a `@codigo/@nombres/@num_doc` y `@tipo_busqueda`; padding a 7 dígitos para `C`; paginación 1-based (`@inicio = (page-1)*limit + 1`, `@final = inicio + limit - 1`).
- Respuesta: `{ total, rows: [{ codigo, nombres, documento, direccion }] }` con `total` del `@busc=6` y columnas 0/4-6/3/15 del `@busc=5` (`MantcontriproyecController.php:327-338`).
- Frontend: página bajo `administracion-tributaria`, grilla con columnas Código / Nombres / Nro. Documento / Dirección, radios de criterio (Código/Nombres/Razón Social/Documento), botón Buscar, paginación y acción "Estado de Cuenta" que navega a la ruta destino con `?codigo=`.
- La ruta destino `/dashboard/administracion-tributaria/estado-cuenta-proyectado?codigo=...` se crea como **stub honesto** en este work unit para que el enlace no quede roto; el siguiente child la reemplaza por la pantalla real.

## Fuera de alcance
- `RentascajaproyecController.php` (cabecera, predios, períodos, años, recibos) y `RentascajareccontriproyecController.php` (`sp_EstCta_Rentas_proyectado_2022`, totales, generación/anulación de recibos) → child posterior.
- Cuerpos de SP no disponibles: `sp_EstCta_Rentas_proyectado_2022`, `store_caja_framework`, `sp_ActualizaInteres_proyectada`, `sp_Recibos_emitidos`, `sp_Genera_Recibos`. No se inventa lógica sobre ellos.
- SQL dinámico por concatenación del legacy (`sp_Mcontribuyente.sql:921,927-947`): prohibido; parametrizar por nombre.
- Sesión PHP `contri` del legacy: se sustituye por contexto explícito del contribuyente en la ruta.

## Evidencia legacy (path:line)
- Entrada y buttons: `Z:\application\controllers\MantcontriproyecController.php:10-37`.
- consultaAction: `MantcontriproyecController.php:274-341`.
- Store/grid/filtros: `Z:\public\js\js_Mantcontriproyec.js:16-28,40-55,188-264`.
- Acción Estado de Cuenta: `js_Mantcontriproyec.js:112-115`.
- SP `@busc=5/6`: `C:\Users\Mvaez\AppData\Local\Temp\opencode\sp_Mcontribuyente.sql:699-1044`.
- Destino: `Z:\application\controllers\RentascajaproyecController.php:24-92`.

## Decisiones de implementación
1. Parámetros del SP se enlazan por nombre (`request.input('busc', ...)`, sin `@`), patrón ya validado en `consulta-predios` T07.
2. `codigo` se sanea a dígitos y se rellena con ceros a la izquierda hasta 7 en el boundary Zod, compartido por la request.
3. `pageSize` se fija en 20 (store legacy) y se documenta el desajuste con el toolbar legacy de 10; se usa un solo valor para evitar doble paginación.
4. El `nombres` se compone en backend con `nombres + ' ' + paterno + ' ' + materno`, como el legacy (`MantcontriproyecController.php:333`).
5. La navegación al destino usa `router.push` con `?codigo=`; el stub de destino muestra el código recibido y un aviso explícito de que el detalle se implementa en el siguiente work unit.
6. La respuesta usa la forma canónica de la casa `{ data, total, page, pageSize, totalPages }` (patrón `consulta-predios`) en lugar de `{ total, rows }`; `data` contiene las 4 columnas legacy. El alcance autorizado permite esta forma.
7. Count con `@busc=6` envía solo `busc,codigo,nombres,num_doc`; el criterio R mapea `criterioRazon` a `num_doc` para el count, mientras rows con `@busc=5` envía `razon` + `tipo_busqueda`.
8. Los radios usan `aria-label="Criterio Código|Nombres|Razón Social|Documento"`; los seis inputs se renderizan y los inactivos se ocultan con `hidden`.

## Restricciones
- Seguridad: sin secretos, sin concatenación de input en SQL, parámetros por nombre, autenticación en el endpoint.
- Contrato API: envelope canónico del proyecto para errores; Zod en el boundary; sin `any`/`@ts-ignore`.
- Logging estructurado con `correlationId`, sin datos personales en logs (el `num_doc` y nombres no se loguean).
- Testing: todo comportamiento nuevo o corregido con test; sin `test.skip`/`it.only`.
- UI/UX: tokens SAT ICA, foco visible, labels accesibles y contraste AA; sin librerías de UI nuevas.
- Un escritor por archivo (`odd/OWNERSHIP.md`); `backend/src/app.module.ts` y barrels son puentes del orquestador.

## Superficies autorizadas de edición
Backend (writer): `backend/src/administracion-tributaria/estado-cuenta-proyectado/**`
Frontend (writer): `frontend/src/app/dashboard/administracion-tributaria/estado-cuenta-proyectado/**`, `frontend/src/actions/administracion-tributaria/estado-cuenta-proyectado.ts`
Puente (orquestador): `backend/src/app.module.ts`
Documentación (orquestador): `odd/tasks/estado-cuenta-proyectado.md`, `odd/OWNERSHIP.md`

## Criterios de aceptación
1. POST/GET de búsqueda con criterio C paddea a 7 y devuelve `{total, rows}` con las 4 columnas legacy.
2. Criterios N/R/D envían `@tipo_busqueda` y los campos correctos; `documento` con maxlength 11.
3. Paginación 1-based coherente entre `total` y `rows`.
4. Parámetros del SP enlazados por nombre; cero concatenación de input.
5. Errores de validación devuelven el envelope canónico con HTTP 400.
6. Grilla, radios y botón Buscar accesibles; acción "Estado de Cuenta" lleva el `codigo` al stub destino.
7. Tests backend y frontend verdes; typecheck sin errores nuevos.

## Checks aplicables
- `pnpm --dir backend test -- --runInBand estado-cuenta-proyectado`
- `pnpm --dir frontend test -- src/app/dashboard/administracion-tributaria/estado-cuenta-proyectado src/actions/administracion-tributaria/estado-cuenta-proyectado`
- `pnpm --dir backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --dir frontend exec tsc --noEmit`
- Errores preexistentes conocidos: 25 TS2554 en `mantenimiento-notificadores/*.spec.ts` (backend), 12 en frontend (9 `baja-alcabala-modal.test.tsx`, 3 `mantenimiento-uit`). Cero nuevos.

## Tareas
- [x] **T01 — Backend búsqueda de contribuyentes**: módulo, controller, service, DTO Zod, tipos y specs sobre `sp_Mcontribuyente @busc=5/6`; filtros C/N/R/D, padding, paginación 1-based, mapeo `{codigo,nombres,documento,direccion}`, parámetros por nombre y envelope canónico. Checks: Jest backend + typecheck backend.
- [x] **T02 — Frontend grilla y filtros**: página, vista y action con radios, inputs, botón Buscar, grilla paginada y acción "Estado de Cuenta" hacia la ruta destino; stub honesto de la ruta. Checks: Vitest frontend + typecheck frontend.
- [x] **T03 — Integración y registro**: orquestador registra el módulo en `backend/src/app.module.ts`, actualiza `odd/OWNERSHIP.md`, verifica checks completos y decide estrategia de entrega. Checks: diff de puentes + suites completas del feature.

## Route declaration
| Task | Route | Trigger |
|---|---|---|
| T01 | Delegated direct (writer) | service + DTO + controller + 2 specs + module → writer trigger |
| T02 | Delegated direct (writer) | page + view + action + stub + 2 tests → writer trigger |
| T03 | Inline (orquestador) | puente `app.module.ts` + ownership + verificación |

## Delivery strategy
`ask-on-risk` (default) con `chain_strategy: feature-branch-chain`, elegida por el usuario el 2026-11-18. Forecast ~1.6k authored lines (add + del), supera ~400; el work unit del detalle tiene 2.7k líneas staged. SIN PR creado aún; el usuario autorizó implementar, no publicar. Push/PR/merge requieren autorización explícita. La rama es `feat/estado-cuenta-proyectado-01-busqueda` desde `DEV`.

## Progreso / evidencia
- 2026-11-17: feature iniciado tras verificación del legacy y elección de alcance "Búsqueda + enlace". Rama creada desde `DEV` (`3fbbfc7`). Tracker creado antes del primer source write.
- T01 (backend) con TDD: RED `Test Suites: 2 failed, 2 total` / `Tests: 0 total` (32.492 s) → GREEN `Test Suites: 2 passed, 2 total` / `Tests: 27 passed, 27 total` (corrida final 30.986 s).
- T02 (frontend) con TDD: RED `Test Files 1 failed (1)` / `Tests no tests` (9.72 s) → intermedia `3 failed | 7 passed (10)` por queries ambiguas de "Nombres" (el radio y el input comparten texto de etiqueta) → GREEN `Test Files 1 passed (1)` / `Tests 10 passed (10)` (9.84 s). Corrección: helper `getTextInput` restringe `getByLabelText` a `input[type="text"]`.
- Checks finales ejecutados (los cuatro de "Checks aplicables"):
  - backend Jest: 2 suites / 27 tests verdes.
  - frontend Vitest: 1 archivo / 10 tests verdes.
  - backend `tsc --noEmit`: solo 25 TS2554 preexistentes en `mantenimiento-notificadores/*.spec.ts`; cero errores nuevos.
  - frontend `tsc --noEmit`: solo 12 errores preexistentes (9 `baja-alcabala-modal.test.tsx`, 3 `mantenimiento-uit`); cero errores nuevos.
- Nota no bloqueante: Vitest imprime warnings `act(...)` en stderr en tres tests (actualizaciones de estado asíncronas tras resolverse el mock); los 10 tests pasan.
- Archivos creados por T01: `estado-cuenta-proyectado.module.ts`, `.controller.ts`, `.service.ts`, `.types.ts`, `dto/search-contribuyentes-proyectado.dto.ts`, `.controller.spec.ts`, `.service.spec.ts` (bajo `backend/src/administracion-tributaria/estado-cuenta-proyectado/`).
- Archivos creados por T02: `frontend/src/actions/administracion-tributaria/estado-cuenta-proyectado.ts`, `page.tsx`, `estado-cuenta-proyectado-view.tsx`, `page.test.tsx` (bajo `frontend/src/app/dashboard/administracion-tributaria/estado-cuenta-proyectado/`).
- Puentes T03 aplicados por el orquestador:
  - `backend/src/app.module.ts`: import de `EstadoCuentaProyectadoModule` (tras `ConsultaPrediosModule`, ~`:21`) y entrada en el arreglo `imports` (tras `ConsultaPrediosModule`, ~`:93`) con comentario `// Módulo de administración tributaria - estado de cuenta proyectado (búsqueda)`.
  - `odd/OWNERSHIP.md`: fila `administracion-tributaria | estado-cuenta-proyectado (búsqueda + enlace)` registrada antes de la primera escritura.
- Verificación del orquestador tras el puente (spot check): backend Jest 2 suites / 27 tests verdes; frontend Vitest 1 archivo / 10 tests verdes; `git diff --check` sin hallazgos; `tsc` backend 25 errores preexistentes y frontend 12 preexistentes, cero nuevos.
- RDD: `off (decided by global)`. `gentle-ai review assess --cwd D:\WEB\sigmun2.0\SIGMUN --json` devolvió `risk: high`, `review_due: true`, razón `unassessable` únicamente por archivos untracked sin declarar (candidate `current-changes`, `changed_paths: 0`). Sin review nativo por switch apagado; se registra como información, no bloquea.
- Sin pushes, PR ni merges creados. Rama activa: `feat/estado-cuenta-proyectado-01-busqueda`.

## Child 02 — Pantalla real del estado de cuenta (detalle)

### Objetivo del child
Reemplazar el stub honesto por la pantalla de solo lectura del estado de cuenta proyectado, replicando `rentascajaproyec` + `rentascajareccontriproyec` del legacy: cabecera del contribuyente, catálogos (períodos, años, predios, fecha de proyección), grilla de recibos emitidos y detalle de recibos con totales. Quedan fuera PDF, pago/generación de recibos, anulación y fraccionamiento (acciones mutantes del legacy).

### Evidencia validada (2026-11-17)
Inspección de SOLO LECTURA autorizada por el usuario sobre `192.168.3.205:1433 / Base_sigmun` (credencial de `backend/.env`). Sin ejecución de procedures ni mutaciones. Definiciones extraídas a `C:\Users\Mvaez\AppData\Local\Temp\opencode\*.sql`.

- `Caja.sp_EstCta_Rentas_proyectado_2022`: parámetros `@codigo char(7)`, `@annos`, `@tipos`, `@tiporec`, `@perio`, `@predio`, `@estado varchar(1)`, `@criterio varchar(2)`, `@fecha_proyectada nvarchar(10)`. El `SELECT DISTINCT *` final devuelve, en este orden, columnas **con nombre**: `idrecibo, codigo, tipo, anno, cod_pred, anexo, sub_anexo, tipo_docu, num_docu, tipo_rec, periodo, imp_insol, costo_emis, fact_reaj, imp_reaj, fact_mora, mora, observacion, estado, ubica_2, fec_venc, num_ingr, operador, estacion, fech_ing, ubica, fec_pago, des_tipo, des_cabecera, criterio, descuento, tot_pago, tipocontri`. El mapeo se hace **por nombre**, nunca por posición.
- Legacy `RentascajareccontriproyecController.php:150-173` deriva: `det_anexo = anexo + '-' + sub_anexo` solo si `tipo === '11.00'`; `total = imp_reaj + mora + costo_emis - tot_pago`; `benefic = descuento`; `tot_pagado = tot_pago`; `ubica = ubica_2` (no la columna `ubica`). `@criterio` se fuerza a `'0'` en `:126`.
- `dbo.store_caja_framework`: `@msquery=1` → `codigo, nombre, dirfiscal, num_doc, flag_fraccionamiento` (`:33-35`); `@msquery=5` → `minimo, maximo` de períodos (`:153-159`); `@msquery=6` → `minimo, maximo` de años (`:161-167`); `@msquery=15` → `cod_pred, anexo1, direccion, anno` (`:113-114`); `@msquery=9` → `banco_id, descripcion` (fuera de alcance del child).
- `dbo.sp_ActualizaInteres_proyectada @buscar=2` → `select top 1 convert(varchar(10), fecha_proyeccion, 103)` (`:18-21`); es de solo lectura y entrega `dd/mm/yyyy`.
- `Caja.sp_Recibos_emitidos @buscar=1` → `num_ingr, codigo, caja, fec_pago, monto, estado, estado, operador` (`:27-30`). El alias `estado` aparece dos veces: se usa la variante de texto (`Cancelado`/`Anulado`) y NO se expone la variante numérica.
- Valores legacy de `tipos`: cadenas ya agrupadas como `*02.01*,*00.16*` (`index.phtml:110-145`); el controlador las une con comas (`RentascajareccontriproyecController.php:83-86`). La API acepta arreglos y los une con `,` antes de enlazar el parámetro por nombre.

### Tareas
- [x] **T04 — Backend detalle**: DTO Zod de consulta del detalle, tipos derivados, métodos de cabecera/catálogos/recibos/detalle en el service y endpoints `GET cabecera`, `GET catalogos`, `GET recibos`, `POST consulta` con `JwtAuthGuard` y envelope canónico. Parámetros SP por nombre; mapeo por nombre de columna; totales derivados del legacy. Checks: Jest backend + typecheck backend.
- [x] **T05 — Frontend detalle**: acciones de solo lectura, vista con cabecera, filtros, grilla de detalle, panel de recibos y totales, reemplazo del stub en `page.tsx:176-178`, y tests. Checks: Vitest frontend + typecheck frontend.
- [x] **T06 — Integración del child**: verificación completa, diff de puentes, registro de evidencia y decisión de entrega (sin push/PR/merge sin autorización). Checks: cuatro checks aplicables + `git diff --check`.
- [x] **T07 — Normalizar fecha de proyección en el boundary**: conservar `type="date"`; convertir `YYYY-MM-DD` → `DD/MM/YYYY` antes de enlazar `@fecha_proyectada` al SP (`DATEFORMAT dmy`) y `DD/MM/YYYY` → `YYYY-MM-DD` para el valor del input, validando ambos formatos en Zod. Tests de regresión backend y frontend. Checks: cuatro checks aplicables + `git diff --check`.
- [x] **T08 — Default de fecha actual y guard de conceptos**: inicializar la fecha de proyección con la fecha local actual (ISO); deshabilitar "Mostrar" hasta que haya al menos un concepto seleccionado; rechazar `tipos` vacío en el DTO backend con envelope canónico para que el SP predecesor no reciba `@query` dinámico inválido. Tests backend y frontend. Checks: cuatro checks aplicables + `git diff --check`.
- [x] **T09 — Keys únicas en checkboxes de predio**: el warning de React `Encountered two children with the same key, '000164976'` provenía del grupo "Predio", donde la key era `item.cod_pred` y el catálogo (`store_caja_framework @msquery=15`, agrupa por `codigo,cod_pred,anexo,sub_anexo`) puede repetir `cod_pred` con distinto anexo. La key de React pasa a ser compuesta `cod_pred::anexo1` (`anexo1 = anexo+'-'+sub_anexo`), mientras el `value` enlazado al SP sigue siendo `cod_pred` puro porque el filtro del SP es `a.cod_pred in(...)` y no usa anexo/sub_anexo en el WHERE. Test de regresión con dos predios que comparten `cod_pred` verificando dos checkboxes y ausencia del warning. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T10 — Estado "Procesando" del botón Mostrar**: al pulsar "Mostrar", el botón cambia su texto a "Procesando..." y queda deshabilitado (`aria-busy`) mientras `consultarDetalleProyectadoAction` está en vuelo; al culminar (éxito o error) vuelve a "Mostrar" y se habilita si hay conceptos. Estado `procesando` dedicado en `EstadoCuentaProyectadoDetalle` (separado del `loading` de carga inicial), propagado como prop a la vista. Tests de vista y de página con promesa controlada. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T11 — Dimensiones de los contenedores de filtros**: ampliar un 15% el ancho y reducir un 30% el espacio vertical de los contenedores de Concepto, Arbitrio, Período y Año (no Predio). El usuario eligió ancho fijo `13.8rem` (221px = 12rem × 1.15) y alto `5.6rem` (89.6px = 8rem × 0.7) para los cuatro grupos. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T12 — Interlineado de los registros**: reducir un 20% el espacio entre filas de checkboxes dentro de los contenedores (`space-y-[3px]` → `space-y-[2.4px]`), aplica a todos los grupos incluido Predio. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T13 — Interlineado, segunda reducción**: reducir otro 20% (`space-y-[2.4px]` → `space-y-[1.92px]`), aplica a los cinco grupos. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T14 — Anchos diferenciados por grupo**: reducir el ancho de Concepto y Arbitrio un 15% (`13.8rem` → `11.73rem`) y el de Período y Año un 50% (`13.8rem` → `6.9rem`). Predio se mantiene en `16rem`. Requiere reemplazar el flag `wide` por una clase de contenedor configurable. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T15 — Ancho de Concepto y Arbitrio, segunda reducción**: reducir otro 10% (`11.73rem` → `10.557rem`). Período, Año y Predio sin cambios. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T16 — Ancho de Predio**: reducir un 25% (`16rem` → `12rem`). Resto sin cambios. Checks: Vitest frontend + typecheck frontend + `git diff --check`.
- [x] **T17 — Ancho de Predio, segunda reducción**: reducir otro 25% (`12rem` → `9rem`). Además, reemplazar `min-w-[12rem]` por `w-[9rem]` (ancho fijo): `min-width` solo fija un piso y el label de predio (`codigo · anexo1 · direccion`) puede estirar la caja, por lo que la reducción anterior no era visible. Checks: Vitest frontend + typecheck frontend + `git diff --check`.

### Route declaration
| Task | Route | Trigger |
|---|---|---|
| T04 | Delegated direct (writer) | DTO + tipos + service + controller + specs → writer trigger |
| T05 | Delegated direct (writer) | action + vista + page + tests → writer trigger |
| T06 | Inline (orquestador) | verificación centralizada y registro; sin puentes transversales |
| T07 | Delegated direct (writer) | DTO + service + spec backend + vista + 2 tests frontend → writer trigger |
| T08 | Delegated direct (writer) | DTO + spec backend + vista + 2 tests frontend → writer trigger |
| T09 | Inline (orquestador) | fix local de 2 archivos, mechanical y ya entendido; sin investigación ni diseño pendiente |
| T10 | Delegated direct (writer) | page + vista + 2 tests → writer trigger (2+ archivos no triviales) |

### Checks aplicables
- `pnpm --dir backend test -- --runInBand estado-cuenta-proyectado`
- `pnpm --dir frontend test -- src/app/dashboard/administracion-tributaria/estado-cuenta-proyectado`
- `pnpm --dir backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --dir frontend exec tsc --noEmit`
- Bases conocidas: 25 TS2554 preexistentes (backend), 12 errores preexistentes (frontend). Cero nuevos.
- RDD: `off (decided by global)` → sin revisión nativa; `gentle-ai review assess` se registra como información.

### Progreso del child
- 2026-11-17: usuario eligió "Validar SP primero" y autorizó inspección de solo lectura a la BD; se obtuvieron los cinco cuerpos de SP y se confirmó que el detalle se puede mapear por nombre.
- T04 (backend) con TDD: RED `Test Suites: 2 failed, 2 passed, 4 total` / `Tests: 27 passed, 27 total` → GREEN `Test Suites: 4 passed, 4 total` / `Tests: 62 passed, 62 total`.
- T05 (frontend) con TDD: RED `Test Files 2 failed (2)` / `Tests 7 failed | 9 passed (16)` → GREEN `Test Files 2 passed (2)` / `Tests 26 passed (26)`.
- Verificación del orquestador (spot check de los cuatro checks):
  - backend Jest: 4 suites / 62 tests verdes.
  - frontend Vitest: 2 archivos / 26 tests verdes.
  - backend `tsc --noEmit`: 25 TS2554 preexistentes en `mantenimiento-notificadores/*.spec.ts`; cero errores nuevos.
  - frontend `tsc --noEmit`: 12 errores preexistentes (9 `baja-alcabala-modal.test.tsx`, 3 `mantenimiento-uit`); cero errores nuevos.
  - `git diff --check`: sin hallazgos (solo avisos LF→CRLF del working copy).
- Verificación independiente del backend (RDD off, assess `high/unassessable` por archivos untracked): `verdict: findings`, dos hallazgos menores. Corregido el `@Optional()` del `detalleService` en el controller para restaurar fail-fast de Nest; el harness search-only ahora provee un mock del servicio. Segundo hallazgo (specs ignorados por `*.spec.ts`) resuelto con `git add -f` en el commit. Sin hallazgos de seguridad, contrato, mapeo ni tipado.
- Archivos T04: `dto/get-estado-cuenta-proyectado.dto.ts`, `estado-cuenta-proyectado-detalle.types.ts`, `estado-cuenta-proyectado-detalle.service.ts`, más controller y module extendidos; specs `detalle.service.spec.ts` y `detalle.controller.spec.ts`.
- Archivos T05: acciones de detalle en `frontend/src/actions/administracion-tributaria/estado-cuenta-proyectado.ts`, `estado-cuenta-proyectado-detalle-view.tsx`, su test, y `page.tsx`/`page.test.tsx` actualizados. El stub fue reemplazado.
- Controles legacy omitidos a propósito por ser mutantes o no read-only: PDF "Est. de cuenta", "Ver Recibos", "Anular Recibos", "Pagar", "Cerrar Ventana", "Fraccionar" y los atajos Todos/Ninguno.
- RDD: `off (decided by global)`. `gentle-ai review assess` devolvió `risk: high`, `review_due_reason: high_risk` únicamente por `unassessable` (archivos untracked); se registró como información, sin review nativo.
- Sin pushes, PR ni merges creados.
- 2026-11-18: usuario eligió `feature-branch-chain` como `chain_strategy` para el delivery de este feature; la decisión se registró antes del commit del work unit.
- 2026-11-18: work unit del detalle commiteado como `e0675f030b42e454705978b2198faaafdc1f76ae` (`feat(estado-cuenta-proyectado): add read-only projected statement detail`), 15 archivos, 2719 inserciones y 49 borrados. Antes del commit: backend 4 suites / 62 tests verdes, frontend 2 archivos / 26 tests verdes, `tsc` con bases preexistentes y cero errores nuevos, `git diff --check` limpio.
- 2026-11-18: pre-commit `gga` bloqueó con resultados contradictorios: primera corrida `STATUS: PASSED` rechazada por el parser estricto; segunda `STATUS: FAILED` con hallazgos falsos porque `.gga` excluye `*.spec.ts`/`*.test.tsx` del review y `ObjectAccessGuard` no está aplicado en ningún controller ( patrón real: `JwtAuthGuard` en 55 callers). El usuario autorizó explícitamente `--no-verify` para este commit; no se modificó `.gga`.

- 2026-11-19: el usuario eligió **normalizar en el boundary** para el error de fecha de proyección (`type="date"` → ISO contra SP con `DATEFORMAT dmy`). Causa verificada en BD: `CONVERT(datetime,'2026-11-18')` → Msg 242; `18/11/2026` OK. El catálogo entrega `DD/MM/YYYY` y hoy el input queda vacío (2 tests frontend fallan, 26/28). T07 creado antes del primer source write; RDD sigue `off (decided by global)`.

- 2026-11-19: T07 (delegado a un único writer por writer trigger; DTO + service + 2 specs + vista + 2 tests) con TDD estricto: RED previo `Tests 2 failed | 26 passed (28)`, RED de nuevos tests backend `4 failed, 65 passed (69)` y frontend `3 failed | 28 passed (31)` → GREEN backend `4 suites / 70 tests`, frontend `2 archivos / 31 tests`.
- 2026-11-19: spot check del orquestador (réplica de los dos runners): backend `4 passed, 4 total` / `70 passed, 70 total`; frontend `2 passed (2)` / `31 passed (31)`; `git diff --check` sin hallazgos. Typechecks con las bases conocidas de 25 errores (backend) y 12 (frontend), cero errores nuevos. RDD `off (decided by global)`, sin revisión nativa.
- 2026-11-19: work unit T07 commiteado como `80bbbb1a030527f4723ec8f6665d4760c1c95b20` (`fix(estado-cuenta-proyectado): normalize projection date at boundary`), 8 archivos, 229 inserciones y 10 borrados. Pre-commit `gga` devolvió `STATUS: PASSED` y el commit se creó sin `--no-verify`.

- 2026-11-19: el usuario pidió fecha de proyección por defecto = fecha actual, evitar la caída del proceso y exigir al menos un concepto para habilitar "Mostrar". Evidencia local: `Caja.sp_EstCta_Rentas_proyectado_2022` delega en `sp_EstCta_Rentas_predecesor_proyectado`, que construye `@query` dinámico a partir de `@tipos`; un `tipos: []` llega como `''`. Sin ejecución remota: solo se leyó la definición ya extraída en temp. T08 creado antes del primer source write.

- 2026-11-19: T08 (delegado a un único writer por writer trigger) con TDD estricto: RED backend `1 failed, 70 passed (71)` y frontend `6 failed | 26 passed (32)` → GREEN backend `4 suites / 71 tests` y frontend `2 archivos / 32 tests`.
- 2026-11-19: spot check del orquestador: backend `4 passed, 4 total` / `71 passed, 71 total`; frontend `2 passed (2)` / `32 passed (32)`; `git diff --check` sin hallazgos. Typechecks solo con las bases conocidas (25 backend, 12 frontend), cero errores nuevos. RDD `off (decided by global)`, sin revisión nativa.
- 2026-11-19: work unit T08 commiteado como `cdbdee34fcd1ca340f45756cd20de9b09347c2ce` (`fix(estado-cuenta-proyectado): default projection date and require concept`), 6 archivos, 130 inserciones y 42 borrados. Pre-commit `gga` devolvió `STATUS: PASSED`, sin `--no-verify`.
- 2026-11-19: verificación del guard de "Mostrar": se agregó el test `does not process or show the detail grid when Mostrar is pressed without a concept`, que clickea el botón deshabilitado y confirma `onMostrar` NO llamado (sin POST a `/consulta`, `detalle` intacto, grilla sin filas). `estado-cuenta-proyectado-detalle-view.test.tsx` 15/15. Work unit `9d3bee21f52039bbe4ce331f4eb60efffabadd45` (`test(estado-cuenta-proyectado): assert disabled Mostrar does not process`).

- 2026-11-20: el usuario reportó el warning de React `Encountered two children with the same key, '000164976'`. Causa verificada: `CheckboxGroup` usaba `key={option.value}` y las opciones de predio usaban `value = item.cod_pred`; el catálogo (`dbo.store_caja_framework @msquery=15`) agrupa por `codigo,cod_pred,anexo,sub_anexo`, por lo que un mismo `cod_pred` aparece con varios anexos. Confirmado en la definición de `sp_EstCta_Rentas_predecesor_proyectado`: el filtro de predio es `a.cod_pred in('',@codigo,@predio)` (solo `cod_pred`, sin anexo/sub_anexo en el WHERE). T09 resuelto inline.

- 2026-11-20: T09 (inline del orquestador, 2 archivos): `CheckboxOption` acepta `key?`; `predioOptions` entrega `key: ${cod_pred}::${anexo1}` (anexo1 ya incluye anexo-sub_anexo) y `CheckboxGroup` usa `key={option.key ?? option.value}`. El `value` enlazado sigue siendo `cod_pred` para no romper el filtro del SP. Test de regresión `uses unique keys for predios that share cod_pred but differ in anexo` (dos predios `000164976`, distinto anexo1 → 2 checkboxes, sin console.error de "same key"). Verificación: `estado-cuenta-proyectado-detalle-view.test.tsx` 16/16, suite del feature 34/34 (18 page + 16 view), `tsc --noEmit` sin errores nuevos en el feature (bases preexistentes: 9 baja-alcabala + 3 mantenimiento-uit), `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió que, al pulsar "Mostrar", el botón cambie a "Procesando..." hasta que culmine la consulta y vuelva a "Mostrar". T10 creado antes del primer source write; RDD sigue `off (decided by global)`. Se delegó un único writer por writer trigger (page + vista + 2 tests).
- 2026-11-20: T10 con TDD estricto: RED `Test Files 2 failed (2)` / `Tests 3 failed | 34 passed (37)` fallando exactamente los 3 tests nuevos → GREEN `Test Files 2 passed (2)` / `Tests 37 passed (37)` (18 vista + 19 página).
- 2026-11-20: spot check del orquestador: réplica del runner `2 passed (2)` / `37 passed (37)`. `gentle-ai review assess --cwd ... --json` → `risk: medium`, `review_due: false`, `review_due_reason: under_budget` (76 líneas cambiadas, 5 paths). Sin review nativo por RDD off. `tsc --noEmit`: solo las 12 bases preexistentes (9 `baja-alcabala-modal.test.tsx`, 3 `mantenimiento-uit`), cero errores nuevos. `git diff --check` sin hallazgos (solo avisos LF→CRLF).
- 2026-11-20: implementación: estado `procesando` dedicado en `EstadoCuentaProyectadoDetalle` (separado de `loading`, que queda solo para carga inicial de catálogos); `handleMostrar` hace `setProcesando(true)` y `.finally(() => setProcesando(false))`; la vista recibe la prop y el botón usa `disabled={tipos.length === 0 || procesando}`, `aria-busy`, texto condicional e ícono `Loader2` con `animate-spin`. El hint y la key compuesta de predio (T09) quedan intactos.

- 2026-11-20: el usuario pidió ampliar un 15% el ancho y reducir un 30% el espacio vertical de los contenedores de Concepto, Arbitrio, Período y Año. Como no tenían ancho explícito, se preguntó la base del +15% y el usuario eligió `13.8rem` fijos (221px). Se cargó el skill `interface-design`; no existe `.interface-design/system.md`, y el cambio es paramétrico sobre tokens ya establecidos, sin nueva dirección visual. T11 creado antes del primer source write.
- 2026-11-20: T11 inline (1 archivo de source + 1 test): `CheckboxGroup` aplica `max-h-[5.6rem] min-w-[13.8rem]` a los grupos no-`wide` y conserva `max-h-32 min-w-[16rem]` para Predio. Test de regresión que fija las cuatro dimensiones y verifica que Predio queda intacto. Verificación: suite del feature 38/38 (19 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió reducir un 20% el espacio interlineado entre registros de los contenedores. T12 creado antes del primer source write. Cambio inline en `CheckboxGroup`: `space-y-[3px]` → `space-y-[2.4px]` (3 × 0.8), aplica a los cinco grupos. Test de regresión que verifica la clase en Concepto, Arbitrio, Período, Año y Predio. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió reducir otro 20% el interlineado. T13 creado antes del primer source write. `space-y-[2.4px]` → `space-y-[1.92px]` en los cinco grupos; se actualizó el test de regresión. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió anchos diferenciados: Concepto y Arbitrio −15%, Período y Año −50%. T14 creado antes del primer source write. Se reemplazó el flag `wide` por la prop `containerClass` en `CheckboxGroup` (default `max-h-[5.6rem] min-w-[13.8rem]`) y cada llamada pasa su clase: `11.73rem` para Concepto/Arbitrio, `6.9rem` para Período/Año, `16rem`/`max-h-32` para Predio. El interlineado `1.92px` queda en la clase base compartida. Test actualizado con los cinco anchos. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió reducir otro 10% el ancho de Concepto y Arbitrio. T15 creado antes del primer source write. `11.73rem` → `10.557rem` en ambos grupos; se actualizó el test. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario pidió reducir un 25% el ancho de Predio. T16 creado antes del primer source write. `16rem` → `12rem`; se actualizó el test. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

- 2026-11-20: el usuario repitió la reducción del 25% en Predio. Causa de que T16 no fuera visible: `min-w` solo establece un mínimo y el label (`codigo · anexo1 · direccion`) supera ese mínimo, por lo que la caja seguía dimensionada por su contenido. T17 creado antes del primer source write. `containerClass` de Predio pasa a `max-h-32 w-[9rem]` (ancho fijo); se actualizó el test. Verificación: suite del feature 39/39 (20 vista + 19 página), `tsc --noEmit` con solo las 12 bases preexistentes, `git diff --check` sin hallazgos. RDD `off (decided by global)`, sin revisión nativa.

### Próximo paso
Decisión humana: push y PR del child, o continuar con la siguiente capa (PDF/generación de recibos), que requiere autorización adicional porque incluye acciones mutantes. Push/PR/merge requieren autorización explícita.
