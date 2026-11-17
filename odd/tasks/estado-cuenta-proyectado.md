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
`ask-on-risk` (default). Forecast ~1.6k authored lines (add + del), supera ~400. Sin PR creado aún; el usuario autorizó implementar, no publicar. Push/PR/merge requieren autorización explícita. La rama es `feat/estado-cuenta-proyectado-01-busqueda` desde `DEV`.

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

## Próximo paso
Work unit completo y verificado. Siguiente acción (decisión humana): push y PR del slice, o continuar con el child de la pantalla real `rentascajaproyec`. Push/PR/merge requieren autorización explícita del usuario.
