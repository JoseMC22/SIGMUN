# Inconsistencia de Predios — Specification

## Purpose

Consulta paginada de predios con inconsistencias (diferencias entre padrón y declaración), filtrable por tipo de inconsistencia y año. Los datos provienen de `Rentas.sp_inconsistencias`. Reemplaza el scaffold placeholder backend/frontend; es una capacidad nueva y autónoma (no modifica specs existentes).

## Requirements

### Requirement: Filtros de criterios

La pantalla DEBE renderizar, en este orden exacto: combo **tipo de inconsistencia**, combo **año**, combo **tipo de uso**, botón **Buscar** y botón **Exportar a Excel**.

#### Scenario: Orden de los controles

- GIVEN la página monta
- WHEN se renderiza la sección de criterios
- THEN los controles aparecen en el orden: tipo de inconsistencia, año, tipo de uso, Buscar, Exportar a Excel

### Requirement: Combo tipo de inconsistencia

El sistema DEBE poblar el combo con `SELECT id_acceso, nombre FROM Acceso.Macceso WHERE id_acceso LIKE '30.01.%' AND nestado = '3'`. El valor seleccionado DEBE mapearse a `@msquery`: `30.01.01→1`, `30.01.02→3`, `30.01.03→5`, `30.01.04→7`, `30.01.05→9`. Si el `id_acceso` NO está en el mapa, DEBE rechazarse la búsqueda con error de validación (`validation_error`) y NO invocarse el SP.

#### Scenario: Combo poblado desde Macceso

- GIVEN `Acceso.Macceso` devuelve accesos `30.01.01`..`30.01.05`
- WHEN el combo se inicializa
- THEN muestra una opción por `nombre`, con su `id_acceso` como valor

#### Scenario: Mapeo a @msquery

- GIVEN el usuario selecciona `30.01.03`
- WHEN presiona Buscar
- THEN el SP se invoca con `@msquery = 5`

#### Scenario: id_acceso fuera del mapa

- GIVEN un `idAcceso` no presente en la tabla de mapeo
- WHEN se ejecuta la búsqueda
- THEN responde 400 `validation_error` y no se llama al SP

### Requirement: Combo año

El sistema DEBE generar el combo de años en el frontend, desde el año vigente hasta 1998, en orden descendente.

#### Scenario: Rango de años

- GIVEN el año vigente es 2026
- WHEN el combo se inicializa
- THEN la primera opción es 2026 y la última es 1998, descendente

### Requirement: Combo tipo de uso (solo visual)

El combo DEBE poblarse con `SELECT id_uso, uso FROM Contenedor.TblUsoPredio WHERE tipo_pred = 1 ORDER BY uso`. Es **solo visual**: su valor NO se envía al SP ni filtra la grilla.

#### Scenario: Combo poblado

- GIVEN `Contenedor.TblUsoPredio` tiene usos con `tipo_pred = 1`
- WHEN el combo se inicializa
- THEN muestra cada `uso` ordenado alfabéticamente

#### Scenario: El uso no afecta la búsqueda

- GIVEN el usuario selecciona un tipo de uso distinto
- WHEN presiona Buscar
- THEN el SP recibe los mismos parámetros que sin esa selección y la grilla no cambia por el uso

### Requirement: Búsqueda de datos

`Buscar` DEBE invocar `Rentas.sp_inconsistencias` con `@msquery` (mapeo del tipo), `@anno` (año seleccionado) y `@inicio`/`@final` (rango de filas de la página). La paginación es fija de **10** filas: página 1 → `1–10`, página 2 → `11–20`, etc. (`@inicio = (page-1)*10 + 1`, `@final = page*10`).

#### Scenario: Rango de la primera página

- GIVEN tipo `30.01.01` (→1), año 2026, página 1
- WHEN se ejecuta Buscar
- THEN el SP recibe `@msquery=1, @anno=2026, @inicio=1, @final=10`

#### Scenario: Rango de página siguiente

- GIVEN página 2 con los mismos filtros
- WHEN se ejecuta Buscar
- THEN el SP recibe `@inicio=11, @final=20`

#### Scenario: Sin resultados

- GIVEN el SP devuelve cero filas
- WHEN se procesa la respuesta
- THEN `data` es `[]` y la grilla muestra el estado vacío

### Requirement: Cálculo del total

El total DEBE obtenerse con una segunda llamada a `Rentas.sp_inconsistencias` usando el **branch de COUNT del tipo** de inconsistencia seleccionado. Cada tipo tiene su propio par datos→conteo, siempre `selectMsquery + 1`:

| tipo | `@msquery` datos | `@msquery` COUNT (total) |
|------|------------------|--------------------------|
| `30.01.01` | 1 | 2 |
| `30.01.02` | 3 | 4 |
| `30.01.03` | 5 | 6 |
| `30.01.04` | 7 | 8 |
| `30.01.05` | 9 | 10 |

El total se usa para `totalPages = ceil(total / 10)`. Confirmado contra la BD real (Base_sigmun, anno=2026): conteos 2290, 54, 16, 346 y 139 respectivamente. Los branches de COUNT **ignoran** `@inicio`/`@final` (el WHERE de rango está comentado en el conteo) y **sí usan** `@anno` (año vigente si llega vacío).

#### Scenario: Total por tipo

- GIVEN una búsqueda de tipo `30.01.03` con datos en la grilla
- WHEN se calcula el total
- THEN se llama al SP con el branch de COUNT del tipo (`@msquery=6`, es decir el de datos + 1) y `totalPages` se deriva de ese valor

#### Scenario: El conteo es del tipo seleccionado

- GIVEN una búsqueda de tipo `30.01.04` (branch de datos `@msquery=7`)
- WHEN se calcula el total
- THEN el conteo proviene de `@msquery=8` y refleja el volumen real de ese tipo (346 filas en 2026), por lo que el paginador coincide con la grilla

### Requirement: Grilla de resultados

La grilla DEBE mostrar las columnas exactas del result set, respetando la errata `direcion`: `codigo, nombre, cod_pred, anexo, sub_anexo, direcion, uso, area_terreno, porcen_propiedad, val_total_terreno, val_total_constru, total_autoavaluo, ROW`.

#### Scenario: Columnas de la grilla

- GIVEN una búsqueda devuelve filas
- WHEN la grilla renderiza
- THEN muestra las 13 columnas del result set en el orden indicado, incluida `direcion`

### Requirement: Paginación

El paginador DEBE navegar con Anterior/Siguiente y páginas; al cambiar de página DEBE volver a invocar el SP con el nuevo `@inicio`/`@final`, manteniendo los filtros. Anterior DEBE estar deshabilitado en la página 1 y Siguiente en la última.

#### Scenario: Cambio de página

- GIVEN el usuario está en la página 1
- WHEN hace clic en Siguiente
- THEN se invoca el SP con `@inicio=11, @final=20`

#### Scenario: Límites

- GIVEN la página actual es 1
- WHEN el paginador renderiza
- THEN Anterior está deshabilitado

### Requirement: Exportar a Excel

El botón DEBE exportar client-side con `xlsx@0.18.5`, incluyendo los registros del filtro actual, con un nombre de archivo descriptivo. NO DEBE existir endpoint backend de Excel.

#### Scenario: Descarga del archivo

- GIVEN hay filas cargadas por el filtro actual
- WHEN el usuario presiona Exportar a Excel
- THEN se descarga un `.xlsx` con esas filas y un nombre descriptivo

#### Scenario: Sin endpoint backend

- GIVEN la exportación se ejecuta
- WHEN se genera el archivo
- THEN no se realiza ninguna llamada a un endpoint de Excel del backend

### Requirement: Estados de UI

La grilla DEBE manejar cuatro estados: loading (skeleton, sin spinner genérico), empty ("No se encontraron resultados"), error (mensaje + botón "Reintentar") y datos.

#### Scenario: Loading

- GIVEN una búsqueda está en vuelo
- WHEN el componente renderiza
- THEN se muestra un skeleton en el área de la grilla

#### Scenario: Vacío

- GIVEN la búsqueda devuelve cero filas
- WHEN la grilla renderiza
- THEN muestra "No se encontraron resultados"

#### Scenario: Error con reintento

- GIVEN la API responde con error
- WHEN el estado de error renderiza
- THEN muestra el mensaje y el botón "Reintentar"
- AND al presionarlo se re-ejecuta la búsqueda

### Requirement: Contrato API

| Método | Ruta | Body/Query | Respuesta |
|--------|------|-----------|-----------|
| POST | `/inconsistencia/predios/search` | `{ idAcceso: string, anno: number, page: number, pageSize?: number = 10 }` | `PaginatedResponse<PredioInconsistenciaRow>` `{ data, total, page, pageSize, totalPages }` |
| GET | `/inconsistencia/predios/combos/tipos` | — | `{ success: true, data: [{ id_acceso, nombre }] }` |
| GET | `/inconsistencia/predios/combos/usos` | — | `{ success: true, data: [{ id_uso, uso }] }` |

Todos bajo `JwtAuthGuard`. El body del `search` DEBE validarse con Zod `.parse()` en el controller; errores de validación DEBEN devolver 400 `validation_error`.

#### Scenario: Búsqueda válida

- GIVEN un body válido con `pageSize` omitido
- WHEN `POST /inconsistencia/predios/search`
- THEN responde 200 con `pageSize = 10` y el envoltorio paginado

#### Scenario: Body inválido

- GIVEN `page: 0` o `anno` no numérico
- WHEN Zod valida
- THEN responde 400 `validation_error`

#### Scenario: Acceso sin token

- GIVEN una request sin JWT válido
- WHEN llega a los endpoints
- THEN responde 401 `auth_invalid`

### Requirement: Seguridad

Toda interacción con BD DEBE usar parámetros tipados hacia el SP, sin concatenación de strings SQL con input del usuario. El código DEBE evitar `any`.

#### Scenario: Sin concatenación

- GIVEN cualquier filtro provisto por el usuario
- WHEN se construye la llamada al SP
- THEN los valores se pasan como parámetros tipados, nunca interpolados en SQL

### Requirement: Verificabilidad (testing)

Cada escenario DEBE ser verificable por tests: backend Jest en `*.spec.ts` colocados junto al archivo, frontend Vitest en `*.{test,spec}.{ts,tsx}`, mockeando la capa de BD.

#### Scenario: Tests unitarios del servicio

- GIVEN el servicio con `DatabaseService` mockeado
- WHEN se testea `search`
- THEN se verifica el mapeo de `@msquery`, el rango `@inicio`/`@final` y el cálculo de `totalPages`

## SP Contract

| SP | Params | Result Columns |
|----|--------|----------------|
| `Rentas.sp_inconsistencias` (datos) | `@msquery` (mapeo del tipo: 1, 3, 5, 7, 9), `@anno`, `@inicio`, `@final` | `codigo, nombre, cod_pred, anexo, sub_anexo, direcion, uso, area_terreno, porcen_propiedad, val_total_terreno, val_total_constru, total_autoavaluo, ROW` |
| `Rentas.sp_inconsistencias` (total) | `@msquery = msquery_datos + 1` (branch de COUNT por tipo: 2, 4, 6, 8, 10), `@anno` (el COUNT lo usa; `@inicio`/`@final` son ignorados) | Columna de conteo **sin nombre** → lectura posicional (primer valor del primer registro) |

## Assumptions / Constraints

- **Nombre de la columna de total (Q2):** RESUELTO contra la BD real. El branch de COUNT devuelve una columna **sin nombre**; el servicio DEBE leer el primer valor del primer registro (lectura posicional `Object.values(recordset[0])[0]`).
- **Parámetros de la llamada de total (Q1):** RESUELTO contra la BD real. Los branches de COUNT ignoran `@inicio`/`@final` (rango comentado) y usan `@anno` (año vigente por defecto). Se envían `{ msquery: select+1, anno, inicio, final }` — inofensivo y espeja el legacy.
- **Combos (Q3):** se asume SQL estático parametrizado vía `DatabaseService.query` (sin input de usuario); se preferirá un SP equivalente si existe.
- **Tipo obligatorio (Q4):** el tipo de inconsistencia es obligatorio; no hay valor "todos"/default.
- **id_acceso fuera del mapa (Q5):** error de validación (`validation_error`), no se llama al SP.
- **Seeding del submenú (Q6):** queda como follow-up, fuera del alcance de esta spec.

## Open Questions

- [x] Nombre exacto de la columna de conteo del total — **Resuelto**: la columna no tiene nombre; lectura posicional.
- [x] Si el COUNT requiere `@anno` y/o `@inicio`/`@final` — **Resuelto**: usa `@anno` (año vigente si vacío) e ignora el rango; se envían igual (inofensivo).
