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
| T01 | Registrar fila en `odd/OWNERSHIP.md` §4 | — | pendiente |
| T02 | Sonda BD: fijar contrato del SP (`@opcion` 1/2/3/4, params, columnas) | S2,S3,S7,S8 | hecha (L3; contrato en `design.md` D1) |
| T03 | Definir/obtener plantilla HTML `PlantillaConstanciaExigibilidad.html` | S8 | pendiente |
| T04 | `constancia-exigibilidad.types.ts` | S5,S8 | pendiente |
| T05 | DTOs + Zod (`search`/`validar`, `grabar`) | S2,S7 | pendiente |
| T06 | `constancia-exigibilidad.service.ts` (4 acciones) + spec | S2,S3,S4,S6,S7,S8 | pendiente |
| T07 | `constancia-exigibilidad.controller.ts` + `.module.ts` | S1..S9 | pendiente |
| T08 | Registro en `notificaciones.module.ts` (solo orquestador) | — | pendiente |
| T09 | Verificación backend + commit work unit | — | pendiente |
| T10 | `frontend/src/actions/notificaciones/constancia-exigibilidad.ts` + tests | S2,S7,S8 | pendiente |
| T11 | `page.tsx` (form Validar/Grabar/Imprimir/Cancelar) + tests | S1..S7,S9 | pendiente |
| T12 | `export-utils.ts` (HTML→PDF sin QR) + test | S8 | pendiente |
| T13 | Verificación frontend + commit work unit | — | pendiente |

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
