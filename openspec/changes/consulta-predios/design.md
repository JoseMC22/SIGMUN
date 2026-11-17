# Design — Consulta de Predios

## Context

Port de la pantalla legacy `consultapred/index` (Zend + ExtJS) al dashboard de SIGMUN,
dentro de `administracion-tributaria/consulta-predios`. Reutiliza el SP
`Rentas.sp_Mcontribuyente` con `@busc` 19 (filas), 20 (total) y 21 (export). Sigue la
estructura de `predios-contribuyentes` (módulo hermano, `@busc=29`) con dos diferencias
contractuales: error envelope canónico `{code,message,details}` y XLS generado en el
cliente.

Evidencia legacy (solo lectura, verificada in situ):

| Archivo | Secciones |
| --- | --- |
| `Z:\application\controllers\ConsultapredController.php` | `indexAction` L7-46, `consultapredioAction` L48-132, `exportarprediosAction` L134-296 |
| `Z:\application\views\scripts\consultapred\index.phtml` | L21-79 (filtros, combo Año, checkbox, botones) |
| `Z:\public\js\js_consultapred.js` | L9-13 (Enter), L39-52 (padding), L55-81 (búsqueda), L91-212 (Store/grilla), L214-240 (export) |

## Decisions

### D1 — Layout del módulo backend

Módulo nuevo siguiendo el patrón de `backend/src/seguridad/perfiles/` de
`openspec/standards/ARCHITECTURE.md` (controllers delegan, services llaman al SP; sin
ORM). Separación de capas por convención: `dto/` y `types` = boundary/dominio,
`service` = aplicación, `controller` = presentación.

```
backend/src/administracion-tributaria/consulta-predios/
├── dto/
│   ├── search-consulta-predios.dto.ts
│   └── export-consulta-predios.dto.ts
├── consulta-predios.types.ts
├── consulta-predios.controller.ts
├── consulta-predios.service.ts
├── consulta-predios.module.ts
├── consulta-predios.controller.spec.ts
└── consulta-predios.service.spec.ts
```

`consulta-predios.module.ts` se registra en `backend/src/app.module.ts` como módulo
nuevo, sin lógica adicional en el orquestador.

### D2 — Contrato de `Rentas.sp_Mcontribuyente` (parámetros nominales, orden exacto)

Los tres sobre `@busc` tienen órdenes distintos. Se reproducen en este orden literal;
`@inicio` y `@final` van **antes** de `@cod_urb` solo en `@busc=19` (L99-101).

| `@busc` | Propósito | Orden de parámetros (L source) |
| --- | --- | --- |
| `20` | Total de filas | `@busc, @anno, @id_via, @nro, @dpto, @Mza, @Lte, @SubLte, @cod_pred, @codigo, @cod_urb` (L72-82) |
| `19` | Filas paginadas | `@busc, @anno, @id_via, @nro, @dpto, @Mza, @Lte, @SubLte, @cod_pred, @codigo, @inicio, @final, @cod_urb` (L89-101) |
| `'21'` | Filas para export | `@busc, @codigo, @cod_pred, @id_via, @cod_urb, @anno, @nro, @dpto, @Mza, @Lte, @SubLte, @flag_pisos` (L155-166) |

Notas:

- En el legacy `@busc=19/20` son numéricos y `@busc='21'` es string (L155). Se mantiene
  el literal legacy y se ajusta el tipo solo si el driver lo exige.
- El total se lee de la primera columna de la primera fila de `@busc=20`
  (`$rowsTotal[0][0]`, L107).
- `@flag_pisos` = `'1'` cuando `mostrarPisos` es `true`, `'0'` en caso contrario
  (L227-234).
- Los nombres "bonitos" del DTO (`codigo`, `codPred`, `anno`, `idVia`, `codUrb`, `nro`,
  `dpto`, `mza`, `lte`, `sublote`) se mapean a estos parámetros nominales en un único
  mapper por sobre del SP. No se usa el orden posicional como contrato de entrada.

### D3 — Paginación 1-based

`pageSize` = 20 (el `Store` legacy manda 20 en L117; el `PagingToolbar` con 10 en L202
era inconsistente y se ignora). La aritmética es la del controller (L51-56):

```
inicio = (page - 1) * pageSize + 1
final  = inicio + pageSize - 1
totalPages = ceil(total / pageSize)
```

`page` es 1-based, mínimo 1. Una búsqueda nueva reinicia `page = 1` (L76).

### D4 — Zod en el boundary y error envelope canónico

Los schemas viven en `dto/` y los tipos se derivan con `z.infer<typeof Schema>`. El
controller valida body/query antes de delegar al service; el service recibe dominio
tipado, nunca `any`.

- `SearchConsultaPrediosDto`: los 10 filtros del SP más `page` (int ≥ 1, default 1) y
  `pageSize` (literal 20).
- `ExportConsultaPrediosDto`: los mismos 10 filtros más `mostrarPisos` (boolean,
  default `false`). El export no pagina.
- `codigo`: máximo 7 caracteres (L42 del view) y se normaliza a 7 dígitos con ceros a
  la izquierda al perder foco (L39-52 del JS); el padding se aplica en el cliente y el
  valor padded viaja al SP.

Errores con el envelope de `openspec/standards/API.md`, no el `{success,error}` viejo:

```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": { "errors": [{ "path": "codigo", "message": "Invalid code format" }] }
}
```

Códigos: `validation_error` 400, `auth_invalid` 401, `auth_forbidden` 403,
`database_unavailable` 503. Respuesta de éxito de `search`:
`{ data, total, page, pageSize, totalPages }`.

### D5 — Seguridad y parametrización SQL

- Ambos endpoints quedan detrás del guard JWT de passport-jwt del proyecto (cookies
  HttpOnly + refresh rotation), **sin `@Public()`**. La validación de permisos usa el
  mecanismo estándar del proyecto antes de tocar datos.
- La server action del frontend lee la cookie `SIGMUN_AUTH` y reenvía el token al
  backend.
- Cada valor al SP se enlaza con `request.input('@anno', value)` (y así para los 10
  filtros, `@inicio`, `@final`, `@flag_pisos`). Queda prohibida la concatenación de
  input del usuario, al igual que en `Datos.php:116-120` del legacy.
- Sin secretos ni cadenas de conexión en código. Sin logs con `codigo` ni `nombre`; si
  se agrega logging, es estructurado y con `correlationId`.

### D6 — Estructura del frontend

```
frontend/src/actions/administracion-tributaria/consulta-predios.ts   (nuevo)
frontend/src/app/dashboard/consulta-predios/
├── page.tsx                    (RSC por defecto)
├── consulta-predios-view.tsx   (cliente: filtros, grilla, paginación, exportar)
├── export-utils.ts             (cliente: XLS con xlsx)
└── *.test.tsx / *.test.ts
```

- **Filtros**: 9 campos de texto (`codigo`, `codPred`, `idVia`, `codUrb`, `nro`, `dpto`,
  `mza`, `lte`, `sublote`) + combo `anno` (1998 → año en curso, default año en curso) +
  checkbox `mostrarPisos`. Botones Buscar y Exportar. Etiquetas legacy corregidas
  según D9.
- **Comportamientos portados**: Enter en `codigo` dispara la búsqueda (L9-13); blur en
  `codigo` aplica padding a 7 caracteres (L39-52); buscar reinicia la página a 1.
- **Grilla**: 15 columnas de datos, `pageSize` 20, estados `loading` (skeleton),
  `empty` ("No se encontraron predios") y `error` (mensaje del envelope).
- **UI/UX**: tokens `sat-navy`/`sat-cyan`, sin colores ni tipografías hardcodeadas,
  foco visible, labels accesibles, contraste WCAG AA (ver `openspec/standards/UI-UX.md`).
  Sin librerías de UI nuevas: se usa shadcn/ui ya presente.

### D7 — Export XLS (`mostrarPisos` 16/33 columnas)

- El endpoint `export` llama a `@busc=21` con `@flag_pisos` según `mostrarPisos` y
  devuelve **solo datos**: `{ title, rows, mostrarPisos }`.
  - `title` = `$rows[0][15]` (L187), usado como `REPORTE DE PREDIOS - {title}`.
  - `rows` = arreglos de celdas del SP con el índice 15 eliminado; 15 celdas por fila
    sin pisos y 32 con pisos (0-14 + 16-32).
  - El nombre exacto de estos campos es propuesto; T03 puede ajustarlo sin cambiar la
    semántica (excluir el título como dato).
- `export-utils.ts`, en el cliente, construye el XLS con `xlsx` (igual que
  `predios-contribuyentes`): agrega la columna `N` con numeración 1-based (L247) y los
  encabezados de D8. Total: 16 columnas si `mostrarPisos=false`, 33 si `true`.
- No se emite HTML: el bug `coslpan` de L179 no se replica.

### D8 — Mapeo legacy → nuevo

**Grilla (`@busc=19`, controller L111-127).** 15 campos; `anexo` es la concatenación
`$row[3] . "-" . $row[4]`:

| Índice legacy | Campo nuevo | Índice legacy | Campo nuevo |
| --- | --- | --- | --- |
| `row[0]` | `codigo` | `row[8]` | `area_terreno` |
| `row[1]` | `nombre` | `row[9]` | `porcen` |
| `row[2]` | `cod_pred` | `row[10]` | `val_terreno` |
| `row[3]` + `row[4]` | `anexo` | `row[11]` | `val_constru` |
| `row[5]` | `direccion` | `row[12]` | `autoavaluo` |
| `row[6]` | `uso` | `row[13]` | `id_instalas` |
| `row[7]` | `t_area_const` | `row[14]` | `num_pisos` |
| — | — | `row[15]` | `categoria` |

Orden de columnas de la grilla (JS L138-198): `codigo`, `nombre`, `cod_pred`, `anexo`,
`direccion`, `uso`, `area_terreno`, `porcen`, `t_area_const`, `val_terreno`,
`val_constru`, `autoavaluo`, `id_instalas`, `num_pisos`, `categoria`.

**Export (`@busc=21`, controller L184-289).** Encabezados legacy (con las correcciones
de D9) y su índice de origen:

| # | Encabezado | Índice | # | Encabezado | Índice |
| --- | --- | --- | --- | --- | --- |
| 1 | N | generado | 18 | Nivel Piso | `row[17]` |
| 2 | CODIGO | `row[0]` | 19 | Mes Const. | `row[18]` |
| 3 | NOMBRE | `row[1]` | 20 | Anio Const. | `row[19]` |
| 4 | PREDIO | `row[2]` | 21 | Clasificacion | `row[20]` |
| 5 | ANEXO | `row[3]` | 22 | Material | `row[21]` |
| 6 | DIRECCIÓN | `row[4]` | 23 | Estado | `row[22]` |
| 7 | USO | `row[5]` | 24 | Cat. Muros | `row[23]` |
| 8 | Area Terreno | `row[6]` | 25 | Cat. Techo | `row[24]` |
| 9 | % Propiedad | `row[7]` | 26 | Cat. Pisos | `row[25]` |
| 10 | T. Area Const. | `row[8]` | 27 | Cat. Puerta | `row[26]` |
| 11 | Val. Terreno | `row[9]` | 28 | Cat. Revés | `row[27]` |
| 12 | Val. Construccion | `row[10]` | 29 | Cat. Baño | `row[28]` |
| 13 | Autoavaluo | `row[11]` | 30 | Cat. Insel | `row[29]` |
| 14 | Instalaciones | `row[12]` | 31 | Val. Uni | `row[30]` |
| 15 | N° Pisos | `row[13]` | 32 | Area. Const. | `row[31]` |
| 16 | Categoria | `row[14]` | 33 | Val. Const. | `row[32]` |
| 17 | Item Piso | `row[16]` | — | `row[15]` = título | **no es dato** |

Las columnas 1-16 se usan siempre; las 17-33 solo si `mostrarPisos=true`. El orden de
encabezados del export difiere del de la grilla (p. ej. `% Propiedad` antes que
`T. Area Const.`): se respeta el orden del export.

### D9 — Decisiones explícitas de alcance

| Decisión | Detalle |
| --- | --- |
| Sin cambios en BD | No se habilita el menú del sidebar. La página se abre por URL directa. No se escribe en `Acceso.sp_LogOut @buscar=8` / `doform2`. |
| `@busc=21` solo trae datos | El archivo XLS se genera en el cliente con `xlsx`, igual que `predios-contribuyentes`. |
| Corrección de typos | `% Popiedad` → `% Propiedad`, `direccion` → `Dirección`, mensaje vacío → `No se encontraron predios`. No se replican typos del HTML legacy (`coslpan`). El resto de las etiquetas se conserva. |
| Sin detalle/modal | No existe acción de detalle en la carpeta legacy. |
| `pageSize=20` | Se toma del `Store`; se ignora el `pageSize:10` del `PagingToolbar` por inconsistente. |

## Data model

- `ConsultaPrediosRow`: 15 campos de la grilla (D8), derivados de `@busc=19`.
- `ExportPrediosRow`: arreglo posicional de celdas de `@busc=21` (0-14 y 0-14 + 16-32),
  con `row[15]` reservado al título.
- `SearchConsultaPrediosDto` / `ExportConsultaPrediosDto`: definidos en D4.
- `ConsultaPrediosSearchResponse`: `{ data: ConsultaPrediosRow[], total: number, page: number, pageSize: number, totalPages: number }`.
- `ConsultaPrediosExportResponse`: `{ title: string, rows: string[][], mostrarPisos: boolean }`.

## Open questions

1. El tracker (T04) dice "9 filtros", pero la vista y el SP tienen 10 parámetros de
   filtro (9 campos de texto + el combo Año). Interpretación propuesta: "9 filtros"
   cuenta los campos de texto y el combo se menciona aparte. Confirmar antes de T04.
2. El tracker no define un código de permiso específico para este feature. Se aplica el
   mecanismo de autorización estándar del proyecto; confirmar si se requiere un permiso
   dedicado.
3. El nombre del archivo XLS y el título completo no están especificados: solo se conoce
   el prefijo `REPORTE DE PREDIOS - ` y que el sufijo proviene de `$rows[0][15]`.
   Confirmar con producto si se requiere un nombre fijo.

## Risks

- Contrato del SP sin sonda contra BD en esta feature: mitigación = orden posicional
  literal del controller legacy más `request.input(...)` para cada valor.
- `$row[15]` en `@busc=21` es el título, no una celda: exclusión explícita en el mapper
  y test de regresión que valide 16/33 columnas.
- Orden de parámetros distinto entre `@busc=19/20` y `@busc=21`: dos mappers separados
  y tests que fijen el orden.
- Dato personal (`codigo`, `nombre`): no se loguea; logging estructurado con
  `correlationId` si se agrega.
