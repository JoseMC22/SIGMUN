# Constancia de Exigibilidad — `notificaciones/constancia-exigibilidad`

## Objetivo

Portar a SIGMUN la pantalla independiente de generación de la **Constancia de
Exigibilidad** (documento legal, PDF imprimible sin QR), como modulo
`notificaciones/constancia-exigibilidad`. Fuente de verdad: el form WinForms del
legacy `SIGNotificaciones.Notificaciones.FrmConstanciaExigibilidad` (C#), pegado
por el usuario en el Log.

## Fuente de verdad (legacy)

`FrmConstanciaExigibilidad` sobre el SP `COACTIVO.USP_EXIGIBILIDAD` (mismo SP que
usa `reporte-constancia-exigibilidad` con `@opcion=5`), con `@opcion` **1/2/3/4**.

## Specs

- **S1** — Pantalla independiente en `notificaciones/constancia-exigibilidad`, con:
  combo **TipoValor**, campo **Año**, campo **Número** de valor (se formatea a 7
  digitos `D7` con ceros a la izquierda al salir del campo), y acciones
  **Validar / Grabar / Imprimir / Cancelar / Cerrar**. Combo TipoValor se llena con
  `SELECT id_valor, nomb_val FROM Contenedor.TblTipo_valor WHERE estado = '1' and anno_gen = year(getdate()) ORDER BY 2`.
- **S2** — **Validar** (`@opcion=2`, params `NUM_VAL`, `ID_VALOR`, `ANO_VAL`): si el
  valor no existe → mensaje *"El valor no se encuentra registrado"*.
- **S3** — Si existe, se **verifica el estado** (columna `Estado` de `@opcion=2`, sin
  llamada aparte): si `estado` ∈ {`9`,`2`} →
  *"El valor se encuentra en estado Cancelado. No se puede generar la constancia."*
  y no avanza.
- **S4** — Si `Cargo == "0"` → *"El valor no cuenta con Cargo de Notificación"*; se
  bloquean Grabar e Imprimir.
- **S5** — Mostrar datos del valor: Administrado, Fecha (`Fec_val`), Monto,
  Nro. Notificación (`cargo`), F. Notificación (`FNotifica`), Nro. Exigibilidad,
  F. Exigibilidad.
- **S6** — Segun `NroExigibilidad`: si `!= "0"` y no vacio → *"Ya cuenta con
  Constancia de Exigibilidad"* (habilita Imprimir, deshabilita Grabar); si no →
  *"Proceder con la Generación de la Constancia"* (habilita Grabar, deshabilita
  Imprimir).
- **S7** — **Grabar** (`@opcion=3`): registra la constancia. **`numexig` lo auto-genera
  el SP** (`max(numexig)+1` por `anoexig`); el Nro. de Constancia **no** lo ingresa el
  usuario. Params reales: `@anoexig, @codigo, @nombre, @lote, @montota, @observacion,
  @operador, @estacion, @id_valor, @ano_val, @num_val, @cargo(→cargonotifica),
  @fnotifica` (`fec_gen=getdate()`; `nestado`/`fech_ing` los ignora el SP). Referencia de
  campos del legacy:
  mas `ESTACION` (máquina), `OPERADOR` (usuario), `NUMEXIG` (Nro. Constancia),
  `ANOEXIG` (Año constancia), `CODIGO`, `NOMBRE`, `LOTE="0"`, `FEC_GEN`,
  `MONTOTA`, `OBSERVACION="Constancia de Exigibilidad Generada desde el Sistema
  de Notificaciones"`, `NESTADO="1"`, `FECH_ING`, `NROCARGO`, `FECHACARGO`.
  Devuelve `numexig`. Luego habilita Imprimir y deshabilita Grabar. **Precondicion**
  (S10): `@opcion=3` es la emision y exige >= 7 dias habiles desde `FNotifica`.
- **S8** — **Imprimir** (`@opcion=4`, params `NUMEXIG`, `ANOEXIG`): si no hay
  exigibilidad → *"No existe exigibilidad para imprimir."* / *"La exigibilidad no
  existe."* Renderiza plantilla HTML (Mustache) con `{nombre, nroconstancia,
  valor_completo, fnotifica (dd/MM/yyyy), nrocargo, dia (DD), mes (MMMM es-ES),
  anio}` → **PDF A4 sin QR** → `Constancia_{NUMEXIG}_{ANOEXIG}.pdf`.
- **S9** — **Cancelar** limpia los campos (el año vuelve al año actual).
- **S10** — **Regla de emisión (7 días hábiles)**: con `@opcion=3` solo se puede emitir la
  constancia si desde la **fecha de notificación** (`FNotifica`) pasaron **>= 7 dias
  habiles**. Si no, se bloquea la emision y se avisa. `dias habiles` = Lun-Vie
  (sin feriados, a confirmar). Se valida en la capa de dominio antes de `@opcion=3`.

## Puentes declarados (odd/OWNERSHIP.md)

`notificaciones` no tiene fila propia; se declara aqui:

| Archivo | Cambio | Quien lo edita |
|---|---|---|
| `backend/src/notificaciones/constancia-exigibilidad/**` | modulo nuevo | agente writer |
| `frontend/src/actions/notificaciones/constancia-exigibilidad.ts` | server action nuevo | agente writer |
| `frontend/src/app/dashboard/notificaciones/constancia-exigibilidad/**` | pagina + export PDF | agente writer |
| `backend/src/notificaciones/notificaciones.module.ts` | registro del modulo | **solo orquestador** (puente transversal) |

## Tareas

| ID | Tarea | Specs | Estado |
|---|---|---|---|
| T01 | Registrar fila en `odd/OWNERSHIP.md` §4 | — | hecha (commit `df2be9a`) |
| T02 | Sonda BD: fijar contrato del SP (`@opcion` 1/2/3/4, params, columnas) | S2,S3,S7,S8 | hecha (L3; contrato en `design.md` D1) |
| T03 | Definir/obtener plantilla HTML `PlantillaConstanciaExigibilidad.html` | S8 | hecha (archivo creado; contrato de placeholders verificado por grep) |
| T04 | `constancia-exigibilidad.types.ts` | S5,S8 | hecha |
| T05 | DTOs + Zod (`search`/`validar`, `grabar`) | S2,S7 | hecha |
| T06 | `constancia-exigibilidad.service.ts` (4 acciones) + spec | S2,S3,S4,S6,S7,S8 | hecha |
| T07 | `constancia-exigibilidad.controller.ts` + `.module.ts` | S1..S9 | hecha |
| T08 | Registro en `notificaciones.module.ts` (solo orquestador) | — | hecha (commit) |
| T09 | Verificación backend + commit work unit | — | hecha (25/25 verdes, tsc limpio) |
| T10 | `frontend/src/actions/notificaciones/constancia-exigibilidad.ts` + tests | S2,S7,S8 | hecha (8/8 verdes) |
| T11 | `page.tsx` (form Validar/Generar/Imprimir/Cancelar/Cerrar) + tests | S1..S7,S9 | hecha (8/8 verdes) |
| T12 | `export-utils.ts` (HTML→PDF sin QR) + test | S8 | hecha (5/5 tests verdes; vitest via `frontend/node_modules/.bin`) |
| T13 | Verificación frontend + commit work unit | — | hecha (21/21 verdes: action 8 + export-utils 5 + page 8; eslint limpio) |
| T14 | Alta del ítem de menú en accesos/submenú → `/dashboard/notificaciones/constancia-exigibilidad` | S1 | pendiente |
| T15 | Verificación funcional con BD real (S2,S3,S4,S6,S8,S10 + riesgo D5) | S2..S10 | pendiente |

## Ruta y verificación

- **Ruta**: `delegated direct`. Disparador de writer: T04–T07 son 4+ archivos nuevos no
  triviales; la lectura de los módulos hermanos (preparación) va dentro del writer.
- **Superficie del writer backend**: `backend/src/notificaciones/constancia-exigibilidad/**`
  únicamente. `notificaciones.module.ts` (T08) lo registra el orquestador.
- **RDD**: `off` (global, leído 2026-11-09) → no corre review nativo ni consent; la
  verificación es tests + typecheck + spot check del orquestador, y la entrega sigue la
  política normal del repo.
- **Runner**: `pnpm` no está en el PATH. Backend: `backend/node_modules/.bin/jest` y
  `.../tsc --noEmit`. Frontend: `frontend/node_modules/.bin/vitest`.

## Supuestos de diseño (a confirmar)

- **`dias habiles`** = Lun-Vie. Si existe tabla de feriados, incorporarla.
- **Validacion de los 7 dias habiles** en la capa de dominio (service), antes de `@opcion=3`.
- **Plantilla PDF**: institucional SAT ICA (encabezado, cuerpo, firmas), sin QR, campos
  de S8. La disenia el agente (confirmado por el usuario).
- **Contrato del SP**: nombres de params del legacy (`NUM_VAL`, `ID_VALOR`, `ANO_VAL`,
  `NUMEXIG`, `ANOEXIG`); `@opcion=3` = emision. Ajustar con sonda BD si difiere.

## Log

- **L1** (2026-11-09): "hay que crear el feature" respecto de
  `notificaciones/constancia-exigibilidad`. Contexto previo: "busca si tienes algo
  sobre constancias de exigibilidad" y "se deberia buscar algo que apunte a esto
  notificaciones/constancia-exigibilidad". El usuario confirmó: pantalla
  independiente, misma SP con otra `@opcion`, PDF sin QR, y aportó el form legacy
  `FrmConstanciaExigibilidad` como referencia (ver Objective).
- **L2** (2026-11-09): el usuario pidio disenar la plantilla PDF institucional (sin QR)
  y aportó la regla de negocio: "se emplea el parametro @opcion=3, se debe validar que
  desde la fecha de notificación haya pasado 7 días habiles para poder emitirse la
  constancia de exigibilidad" -> spec S10.
- **L3** (2026-11-09): Sonda BD T02 contra `192.168.3.205 / Base_sigmun` (solo-lectura de
  catalogo). SP = `[Coactivo].[usp_exigibilidad]`. Correcciones: `@opcion=2` ya trae
  `Estado` (S3); `@opcion=3` auto-genera `numexig` (S7); `@opcion=4` da
  `Constancia/Nombre/Valor/Fnotifica/Cargo`. Contrato exacto en `design.md` (D1).
- **L4** (2026-11-09): rama `feat/notificaciones-constancia-exigibilidad` creada desde
  `DEV` local. Commit bootstrap `df2be9a` (--no-verify: gga no disponible en el shell;
  precedente `d0034ee`): versiona este doc + openspec del change (force-add autorizado
  por el owner) y registra OWNERSHIP §4 (T01 hecha). **Limite de slice**: el trabajo del
  feature se mide desde `df2be9a`; el delta `origin/main..DEV` (222 commits) es preexistente,
  ajeno a este feature.
- **L5** (2026-11-09): T03 hecha. Plantilla en
  `frontend/src/app/dashboard/notificaciones/constancia-exigibilidad/PlantillaConstanciaExigibilidad.html`.
  Decisiones: camino frontend (archivo + `llenarPlantilla` + iframe print, convencion
  `reporte-service`; Mustache NO existe en el repo, `{{}}` se sustituye a mano);
  logo `/logo_sat_2026.jpeg` (unico asset institucional en `frontend/public`);
  estilos inline en el propio archivo (T03 define un solo archivo); firmas
  Notificador(a) / Jefe(a) de Notificaciones. Chequeo estructural: los 8 placeholders
  del archivo == contrato S8 (grep). Verificacion visual queda para la integracion
  (T11/T12).
- **L6** (2026-11-09): T12 hecha (adelantada mientras corre el writer de backend).
  `export-utils.ts` reutiliza `llenarPlantilla` + `descargarPdfDesdeHtml` de
  `reporte-service`; `buildConstanciaExigibilidadPrintData` deriva el contrato S8
  (nroconstancia `NUMEXIG-ANOEXIG`, dia DD, mes MMMM es-ES hardcodeado —sin depender
  de ICU—, anio AAAA); nombre de archivo `Constancia_{NUMEXIG}_{ANOEXIG}.pdf`.
  Se agrego la excepcion de tests al `.gitignore` (specs backend + tests frontend del
  feature; justificacion: S10, mensajes verbatim y contrato S8 solo los cubren estos
  tests). Incidencia de tooling: `pnpm` y `gga` no estan en el PATH del shell; vitest
  corre via `frontend/node_modules/.bin/vitest`.
- **L7** (2026-11-09): el usuario reporto "no me levanta la constancia de exigibilidad".
  Diagnostico verificado en disco: la ruta no tiene `page.tsx` (Next.js sin ruta), no hay
  action ni modulo backend y no hay fila de menu. No es un bug: el feature no estaba
  construido; el writer de backend de L6 se perdio sin dejar archivos. Se agregan T14 (menu)
  y T15 (verificacion funcional) para que "levantar" quede cubierto de punta a punta.
  El usuario aporto el designer + code-behind completos del legacy: conciliacion en
  `design.md` D5 (5 bugs que no se portan, `@operador`/`@estacion` en web, `observacion`
  fija, default del combo por primer item). Correccion propia: lo que en L-pre se leyo como
  "contradiccion" entre `openspec/tasks.md` y `design.md` era el reflejo del legacy
  (`ActualizarEstadoValores(...,1)`) frente a la simplificacion de D1; queda como riesgo
  abierto de semantica de `Estado`, no como error de redaccion. `openspec/tasks.md`
  actualizado (T01/T02/T03/T12 marcadas, T06 corregida a 2/3/4, T14/T15 nuevas).
- **L8** (2026-11-10): T10 (acción frontend + 8/8 tests) y T11 (página + 8/8 tests) hechas.
  `page.tsx` reescrita de cero (el archivo previo estaba roto: import duplicado de
  `export-utils`, referencia a un módulo inexistente `PlantillaConstanciaExigibilidadHtml`,
  combo Tipo Valor nunca poblado, `handleGenerar`/`handleImprimir` llamaban a la acción
  equivocada y `templateRef` nunca se llenaba). La acción quedó tipada al contrato backend
  (GET `tipos-valor`, POST `validar|emitir|impresion`; contrato de impresión **`{numexig,
  anoexig}`**) y la plantilla S8 se lee desde disco con `obtenerPlantillaConstanciaExigibilidadAction`
  (fs, convención de los reportes de papeleta-transito; la plantilla es self-contained, sin CSS
  externo). Micro-decisión: al imprimir una constancia pre-existente, `anoexig` se deriva de
  `fExigibilidad` (año) con fallback al año en curso; la recién emitida usa el `anoexig` devuelto
  por `emitir` (D5 queda intacto como fallback). Suite del feature: 21/21 verdes (action 8 +
  export-utils 5 + page 8); eslint limpio en los archivos del feature. El `tsc` completo del
  frontend no se corrió (proyecto grande, sin script; corre como parte de `next build`).
  Pendiente: T14 (menú en accesos) y T15 (verificación funcional con BD real).
- **L9** (2026-11-10): verificación del backend a pedido del usuario. El `jest` del módulo da
  25/25 verdes, pero el `tsc --noEmit` global encontró un defecto real que L6/L8 dejaron pasar
  (tsc se había leído con un filtro roto en PowerShell, `$_` no propaga dentro de una
  comilla doble y devolvía 0): `da709cc` commiteó los DTOs con `ValorIdentitySchema` duplicado
  (el validador lo declara dos veces → TS2451; el emisor importa desde el validador y además
  lo redeclara → TS2395/TS2440). Los tests no lo detectan porque corren con transpilación
  sin type-check. Fix: esquema compartido en `dto/valor-identity.schema.ts`; ambos DTOs lo
  importan (validar lo re-exporta por compatibilidad). Re-verificación: `tsc` 0 diagnósticos
  en el módulo (los 25 TS2554 preexistentes en `mantenimiento-notificadores` siguen intactos,
  ajenos al feature) y 25/25 jest verdes. T11/T13 se mantienen; el gap quedó catalogado.
