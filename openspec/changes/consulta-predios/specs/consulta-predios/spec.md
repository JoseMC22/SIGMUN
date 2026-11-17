# Spec — `consulta-predios`

## ADDED Requirements

### Requirement: Pantalla de consulta de predios

El sistema SHALL ofrecer una pantalla en
`/dashboard/administracion-tributaria/consulta-predios` con los filtros legacy, la
grilla paginada y el botón Exportar. La página se abre por URL directa, sin alta en el
menú ni cambios en BD.

#### Scenario: Inicialización

- **WHEN** se abre la página
- **THEN** el combo Año contiene de 1998 al año en curso con el año en curso
  seleccionado, los 9 campos de texto y el checkbox "Mostrar Pisos" están vacíos, y la
  grilla muestra el estado inicial sin resultados

#### Scenario: Padding del código

- **WHEN** el usuario escribe un código numérico y sale del campo
- **THEN** se rellena con ceros a la izquierda hasta 7 caracteres, y un código no
  numérico se deja sin padding

#### Scenario: Búsqueda con Enter

- **WHEN** el usuario presiona Enter dentro del campo Codigo
- **THEN** se dispara la búsqueda con los filtros actuales y la página vuelve a 1

### Requirement: Búsqueda paginada sobre el SP legacy

El sistema SHALL consultar `Rentas.sp_Mcontribuyente` con `@busc=20` para el total y
`@busc=19` para las filas, con paginación 1-based y `pageSize` 20.

#### Scenario: Búsqueda con filtros

- **WHEN** se envían filtros válidos con `page=1`
- **THEN** el service invoca `@busc=20` con los 10 parámetros de filtro en el orden
  `@anno, @id_via, @nro, @dpto, @Mza, @Lte, @SubLte, @cod_pred, @codigo, @cod_urb`, e
  invoca `@busc=19` con `@inicio=1` y `@final=20` insertados antes de `@cod_urb`

#### Scenario: Cambio de página

- **WHEN** se solicita `page=n`
- **THEN** `@inicio = (n - 1) * 20 + 1` y `@final = @inicio + 19`, y la respuesta
  contiene `{ data, total, page, pageSize, totalPages }` con
  `totalPages = ceil(total / 20)`

#### Scenario: Parámetros enlazados

- **WHEN** el service construye la llamada al SP
- **THEN** cada valor se pasa con `request.input(...)` y ningún input del usuario se
  concatena en la consulta

### Requirement: Validación en el boundary y errores canónicos

El sistema SHALL validar todo input externo con Zod antes de delegar al service y SHALL
responder errores con el envelope `{code,message,details}`.

#### Scenario: Input inválido

- **WHEN** un parámetro de búsqueda o export no cumple el schema Zod
- **THEN** se responde HTTP 400 con
  `{ "code": "validation_error", "message": "Validation failed", "details": { "errors": [...] } }`
  indicando `path` y `message` por campo, sin invocar al SP

#### Scenario: Solicitud sin autenticación

- **WHEN** se llama a `search` o `export` sin un token JWT válido
- **THEN** el guard responde HTTP 401 con `code: "auth_invalid"` y no se consulta la BD

#### Scenario: Base de datos no disponible

- **WHEN** el SP falla por indisponibilidad de la base de datos
- **THEN** se responde HTTP 503 con `code: "database_unavailable"` y el servidor no
  registra datos personales en logs

### Requirement: Export XLS con flag de pisos

El sistema SHALL alimentar el XLS client-side desde `@busc=21` y SHALL respetar el flag
`mostrarPisos` para elegir entre 16 y 33 columnas.

#### Scenario: Parámetros del export

- **WHEN** se solicita un export con filtros válidos
- **THEN** se invoca `@busc=21` con los parámetros en el orden
  `@codigo, @cod_pred, @id_via, @cod_urb, @anno, @nro, @dpto, @Mza, @Lte, @SubLte, @flag_pisos`,
  donde `@flag_pisos` es `'1'` si `mostrarPisos` es `true` y `'0'` en caso contrario

#### Scenario: Export sin pisos

- **WHEN** `mostrarPisos` es `false`
- **THEN** el XLS contiene 16 columnas (N más los índices `row[0]` a `row[14]`) con los
  encabezados legacy corregidos

#### Scenario: Export con pisos

- **WHEN** `mostrarPisos` es `true`
- **THEN** el XLS contiene 33 columnas, agregando los índices `row[16]` a `row[32]` para
  las columnas de piso

#### Scenario: Fila de título excluida

- **WHEN** el SP devuelve `$rows[0][15]` con el título del reporte
- **THEN** ese valor se usa solo en `REPORTE DE PREDIOS - {title}` y nunca se emite como
  celda de dato, y la numeración de la columna N empieza en 1

### Requirement: Resultados vacíos

El sistema SHALL representar la ausencia de resultados sin errores.

#### Scenario: Búsqueda sin coincidencias

- **WHEN** `@busc=20` devuelve total 0 y `@busc=19` no devuelve filas
- **THEN** `search` responde `{ data: [], total: 0, page, pageSize: 20, totalPages: 0 }`
  y la grilla muestra "No se encontraron predios"

#### Scenario: Export sin coincidencias

- **WHEN** `@busc=21` no devuelve filas
- **THEN** `export` responde sin filas de dato y no genera un XLS con encabezados
  engañosos
