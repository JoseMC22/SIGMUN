# Design — Constancia de Exigibilidad

## Context

Port del form WinForms `FrmConstanciaExigibilidad` (SIGNotificaciones) a SIGMUN, modulo
`notificaciones/constancia-exigibilidad`. Reutiliza el SP del reporte
(`COACTIVO.USP_EXIGIBILIDAD`) con `@opcion` 1/2/3/4. Sigue los patrones de
`reporte-constancia-exigibilidad` (hermano) y del `certificado de no adeudo` (PDF imprimible).

## Decisions

### D1 — Contrato del SP `[Coactivo].[usp_exigibilidad]` (sonda T02, 2026-11-09)

Params relevantes: `@opcion int`, `@numexig char(7)`, `@anoexig char(4)`, `@codigo char(7)`,
`@nombre varchar(200)`, `@lote varchar(50)`, `@fec_gen datetime`, `@montota decimal(18,2)`,
`@observacion varchar(250)`, `@nestado int`, `@operador varchar(50)`, `@estacion varchar(50)`,
`@fech_ing datetime`, `@id_valor char(2)`, `@ano_val char(4)`, `@num_val char(7)`,
`@fnotifica datetime`, `@fexigibilidad datetime`, `@cargo varchar(7)`, `@fdesde char(10)`, `@fhasta char(10)`.

| Acción | `@opcion` | Params entrada | Columnas / retorno |
|---|---|---|---|
| Validar (con estado) | 2 | `@id_valor`, `@num_val`, `@ano_val` | `Estado`, `NroExigibilidad`, `Cargo`, `Administrado`, `FEC_VAL`, `Monto` (`IMP_reaj+MORA+COSTO_EMIS`), `Fnotifica`, `FExigibilidad`, `CODIGO`, `ID_VALOR`, `NUM_VAL`, `ANO_VAL` |
| Emitir (insertar) | 3 | `@anoexig`, `@codigo`, `@nombre`, `@lote`, `@montota`, `@observacion`, `@operador`, `@estacion`, `@id_valor`, `@ano_val`, `@num_val`, `@cargo`, `@fnotifica` | `numexig` (auto: `max(numexig)+1` por `anoexig`; `fec_gen=getdate()`) |
| Datos impresión | 4 | `@numexig`, `@anoexig` | `Constancia`, `Codigo`, `Nombre`, `Valor`, `Fnotifica`, `Cargo`, `Fec_Gen`, `Monto`, ... |

**Correcciones sobre el modelo del form legacy:**
- `@opcion=2` ya trae `Estado` → **no** se necesita llamada aparte para el estado (S3 simplificada).
- `@opcion=3` **auto-genera `numexig`** → el Nro. de Constancia **no** es input del usuario
  (el `TxtNroConstancia`/`NUMEXIG` del legacy se ignora; se ignora tambien `nestado`/`fech_ing`,
  que no estan en el INSERT del SP).
- `@opcion=1` es `listarexigibilidad` (listado) y `@opcion=5` es el reporte (la del hermano).
  Para esta feature se usan solo 2/3/4.

Se usan estos nombres exactos de parametros/columnas. Ajustar tipos si difieren.

### D2 — Validación de 7 días hábiles (S10)

Se implementa en la **capa de dominio (service)** como precondición de `@opcion=3`:
`diasHabiles(FNotifica, hoy) >= 7`. `días hábiles` = Lun–Vie. Si existe tabla de
feriados (`Contenedor`/`COACTIVO`), se agrega al cálculo. El `estado` para bloquear
cancelados se toma de `@opcion=2` (`Estado` ∈ {9,2}).

### D3 — Plantilla PDF institucional (sin QR)

El frontend renderiza HTML con Mustache-like (o template literals) y convierte a PDF A4
con la libreria HTML→PDF ya usada en el proyecto (misma del `certificado de no adeudo`).
Campos: `nombre`, `nroconstancia`, `valor_completo`, `fnotifica`, `nrocargo`, `dia`,
`mes`, `anio`. Encabezado institucional SAT ICA + cuerpo + firmas. Salida:
`Constancia_{NUMEXIG}_{ANOEXIG}.pdf`.

### D4 — Validación y mapeo

DTOs con **Zod** en el boundary del controller; el service recibe dominio tipado
(sin `any`). Respuestas con el envelope canónico de la familia `notificaciones`.

### D5 — Conciliación con el legacy (designer + code-behind, 2026-11-09)

**Paridad exacta (se mantiene):**
- Combo TipoValor: `SELECT id_valor, nomb_val FROM Contenedor.TblTipo_valor WHERE estado='1' AND anno_gen=YEAR(GETDATE()) ORDER BY 2`.
- Salida del campo Número: trim → si es numérico `D7`; si no, se limpia el campo.
- Mensajes verbatim de S2/S3/S4/S6/S8 (no se reescriben).
- `@opcion=3`: `lote='0'` y `observacion='Constancia de Exigibilidad Generada desde el Sistema de Notificaciones'` fija. El `TxtObservacion` del legacy es editable pero el code-behind **lo ignora** → no se porta como campo editable.
- `anoexig` = año en curso. `numexig` lo devuelve el SP y se muestra en Nro. Exigibilidad.
- Imprimir: `@opcion=4` con `numexig` = Nro. Exigibilidad y `anoexig` = año en curso.

**Bugs del legacy que NO se portan:**
1. `Convert.ToDateTime(fila["FExigibilidad"])` sin guard revienta cuando el valor aún no
   tiene constancia (`NroExigibilidad='0'`). Backend expone `fExigibilidad: string | null`
   (y lo mismo para `fecVal`/`fNotifica`); el frontend muestra vacío ante null.
2. El check `Cargo == "0"` ocurre después de esa conversión, así que un valor sin cargo
   podía romper antes del mensaje. Orden en SIGMUN: existe → estado cancelado → sin cargo
   → datos + acciones.
3. `BtnCancelar` limpiaba TextBox pero dejaba Grabar/Imprimir habilitados. Cancelar resetea
   también las acciones y devuelve `anio`/`anoexig` al año en curso.
4. En Imprimir, `fnotifica` estaba guardado por `Columns.Contains("valor")` (copy-paste).
   Se lee siempre la columna `fnotifica`.
5. `CmbTipoValor.SelectedIndex = 3` es un default por posición, frágil ante cambios del
   combo. Default en SIGMUN: primer ítem. Si se quiere replicar el 4º ítem, es decisión de
   producto y se hace por `id_valor`, no por índice.

**Identidad en web (antes `Environment.MachineName` + usuario Windows):**
- `@operador` = usuario autenticado (JWT). Nunca un input del cliente.
- `@estacion` = `'WEB'`: en web `MachineName` sería el del servidor y no identifica al
  operador. Un solo punto del service concentra el valor por si se prefiere IP/host.

## Data model

`ConstanciaExigibilidadRow` (types) refleja las columnas de `@opcion=2` y `@opcion=4`.
`SearchConstanciaExigibilidadDto` (validar): `{ tipoValor, anio, numero }`.
`EmitirConstanciaDto` (grabar): entidad de S7.

## Risks

- **Contrato del SP sin confirmar** hasta la sonda T02 → mitigación: sonda antes del code.
- **Cálculo de días hábiles** con/sin feriados → supuesto Lun-Vie a confirmar.
- **Dato personal** (`codigo`, `nombre` del administrado): no loguear (regla AGENTS.md).
- **Semántica de `Estado` en `@opcion=2` (D5)**: el legacy obtenía el estado con
  `oLogica.ActualizarEstadoValores(oEntidad, 1)`, un método distinto de
  `ValidarConstanciasExigibilidad(...,2)`; no hay evidencia de que ambos llamen al mismo SP.
  Hay que verificar con un valor cancelado real (estados 9 y 2) que la columna `Estado` de
  `@opcion=2` bloquea igual. Si difiere, se agrega la llamada equivalente. No bloquea el código,
  sí bloquea dar S3 por verificada.
