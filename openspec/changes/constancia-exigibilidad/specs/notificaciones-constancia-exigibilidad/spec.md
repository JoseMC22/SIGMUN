# Spec — `notificaciones-constancia-exigibilidad`

## ADDED Requirements

### Requirement: Pantalla de emisión de Constancia de Exigibilidad

El sistema SHALL ofrecer una pantalla independiente en
`notificaciones/constancia-exigibilidad` con combo TipoValor, campo Año, campo Número
de valor y las acciones Validar, Grabar, Imprimir, Cancelar y Cerrar.

#### Scenario: Inicialización
- **WHEN** se abre la pantalla
- **THEN** el combo TipoValor se llena con `SELECT id_valor, nomb_val FROM
  Contenedor.TblTipo_valor WHERE estado = '1' and anno_gen = year(getdate()) ORDER BY 2`,
  el Año y el Año de Constancia se inicializan al año actual, y Grabar/Imprimir
  quedan deshabilitados.

#### Scenario: Formato del número de valor
- **WHEN** el usuario sale del campo Número con un valor numérico
- **THEN** se formatea a 7 dígitos con ceros a la izquierda (`D7`); si no es numérico se limpia.

### Requirement: Validación del valor

El sistema SHALL validar la existencia y el estado del valor antes de permitir cualquier operación.

#### Scenario: Valor inexistente
- **WHEN** se valida un TipoValor + Año + Número que no existe (SP `@opcion=2`)
- **THEN** se muestra "El valor no se encuentra registrado" y no se avanzan las acciones.

#### Scenario: Valor cancelado
- **WHEN** el estado del valor (SP `@opcion=1`) es `9` o `2`
- **THEN** se muestra "El valor se encuentra en estado Cancelado. No se puede generar la constancia."

#### Scenario: Sin cargo de notificación
- **WHEN** el valor tiene `Cargo == "0"`
- **THEN** se muestra "El valor no cuenta con Cargo de Notificación" y se bloquean Grabar e Imprimir.

#### Scenario: Datos del valor
- **WHEN** la validación es exitosa
- **THEN** se muestran Administrado, Fecha (`Fec_val`), Monto, Nro. Notificación (`cargo`),
  F. Notificación (`FNotifica`), Nro. Exigibilidad y F. Exigibilidad.

### Requirement: Decisión según exigibilidad existente

#### Scenario: Ya tiene constancia
- **WHEN** `NroExigibilidad != "0"` y no vacío
- **THEN** se muestra "Ya cuenta con Constancia de Exigibilidad", se habilita Imprimir y se deshabilita Grabar.

#### Scenario: Proceder a generar
- **WHEN** `NroExigibilidad == "0"` o vacío
- **THEN** se muestra "Proceder con la Generación de la Constancia", se habilita Grabar y se deshabilita Imprimir.

### Requirement: Emisión sujeta a 7 días hábiles

El sistema SHALL permitir emitir la constancia (`@opcion=3`) solo si desde la fecha de
notificación (`FNotifica`) pasaron al menos 7 días hábiles (Lun–Vie).

#### Scenario: No pasaron los 7 días hábiles
- **WHEN** entre `FNotifica` y hoy hay menos de 7 días hábiles
- **THEN** se bloquea la emisión y se avisa que no se puede generar la constancia.

#### Scenario: Emisión válida
- **WHEN** pasaron 7 o más días hábiles desde `FNotifica`
- **THEN** se registra la constancia (`@opcion=3`) con los campos del valor más
  `ESTACION`, `OPERADOR`, `NUMEXIG`, `ANOEXIG`, `CODIGO`, `NOMBRE`, `LOTE="0"`,
  `FEC_GEN`, `MONTOTA`, `OBSERVACION="Constancia de Exigibilidad Generada desde el
  Sistema de Notificaciones"`, `NESTADO="1"`, `FECH_ING`, `NROCARGO`, `FECHACARGO`;
  el SP devuelve `numexig`, se habilita Imprimir y se deshabilita Grabar.

### Requirement: Impresión en PDF

El sistema SHALL generar un PDF A4 imprimible (sin QR) de la constancia.

#### Scenario: Sin exigibilidad
- **WHEN** se pide imprimir sin `NUMEXIG`/`ANOEXIG`, o el SP `@opcion=4` no devuelve filas
- **THEN** se muestra "No existe exigibilidad para imprimir." o "La exigibilidad no existe."

#### Scenario: Generación del PDF
- **WHEN** hay exigibilidad (SP `@opcion=4` con `NUMEXIG`, `ANOEXIG`)
- **THEN** se renderiza la plantilla HTML institucional con `{nombre, nroconstancia,
  valor_completo, fnotifica (dd/MM/yyyy), nrocargo, dia (DD), mes (MMMM es-ES), anio}`
  y se descarga/guarda `Constancia_{NUMEXIG}_{ANOEXIG}.pdf`.

### Requirement: Cancelar

#### Scenario: Limpiar
- **WHEN** se presiona Cancelar
- **THEN** se limpian los campos y el Año vuelve al año actual.
