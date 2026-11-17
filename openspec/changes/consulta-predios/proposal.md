# Proposal — Consulta de Predios (`administracion-tributaria/consulta-predios`)

## Why

SIGMUN no tiene una consulta genérica de predios por código, código de predio, año, vía,
urbanización, número, dpto, mza, lte y sublote. Los módulos existentes
(`predios-contribuyentes` `@busc=29`, `predios-por-uso`, `inconsistencia-predios`)
resuelven otros casos. La pantalla legacy `consultapred/index` sí lo hace y es la
referencia canónica (share `Z:\`, autorizado solo para lectura). Se portan sus filtros,
grilla paginada y export XLS usando el mismo SP y la misma semántica de datos.

## What changes

Se agrega el feature `administracion-tributaria/consulta-predios`:

- **Backend** (`backend/src/administracion-tributaria/consulta-predios/`): módulo con
  controller, service, DTOs Zod y tipos. Endpoint `search` sobre
  `Rentas.sp_Mcontribuyente` con `@busc=20` (total) y `@busc=19` (filas); endpoint
  `export` sobre `@busc=21` (solo datos). Registro en `backend/src/app.module.ts`.
- **Frontend**: server action con cookie `SIGMUN_AUTH`, página
  `/dashboard/consulta-predios` con filtros, grilla paginada, estados
  loading/empty/error y botón Exportar; `export-utils.ts` genera el XLS en el cliente
  con `xlsx` (16/33 columnas según "Mostrar Pisos").

## Capabilities

- `consulta-predios`

## Scope

| Incluido | Fuera de alcance |
| --- | --- |
| Filtros legacy y grilla paginada sobre `Rentas.sp_Mcontribuyente` `@busc=19/20`. | Detalle/modal: no existe en la carpeta legacy. |
| Export XLS client-side con 16/33 columnas según "Mostrar Pisos", alimentado por `@busc=21`. | `mod=14/2` (ocultar botones en el legacy): sin contraparte en el dashboard. |
| Página por URL directa, sin cambios en BD. | Escritura en `Acceso.sp_LogOut @buscar=8` / `doform2`: requiere autorización explícita posterior. |
| Parámetros al SP enlazados con `request.input(...)`; error envelope canónico. | Reproducir el SQL por concatenación de `Z:\application\models\DbDatos\Datos.php` ni exponer secretos de configuración legacy. |

## User-visible outcome

Al abrir `/dashboard/consulta-predios`, el operador ve los 9 filtros de texto más el
combo Año (1998 → año actual, seleccionado el año en curso) y el checkbox
"Mostrar Pisos", con los botones Buscar y Exportar. Buscar muestra una grilla de 15
columnas con paginación de 20 filas por página, estados de carga, mensaje
"No se encontraron predios" cuando no hay datos y el error canónico cuando falla la
consulta. Exportar descarga un XLS con 16 columnas, o 33 cuando "Mostrar Pisos" está
activo, sin incluir la fila de título del SP como dato.

## Impact

- Afecta solo al módulo nuevo `administracion-tributaria/consulta-predios`; no modifica
  `predios-contribuyentes` ni otros módulos.
- Depende del SP existente `Rentas.sp_Mcontribuyente` (`@busc` 19/20/21); no requiere
  cambios de esquema ni de datos.
- Sin alta en el menú del sidebar: la navegación es por URL directa.

## Risks

- El contrato del SP se deriva del código legacy y no se sondeó contra la BD en esta
  feature. Mitigación: reproducir literalmente el orden posicional de
  `ConsultapredController.php` y enlazar cada parámetro con `request.input(...)`.
- `@busc=21` devuelve el título del reporte en `$row[15]`. Si se trata como celda de
  dato, el XLS queda desalineado: el mapeo lo excluye de forma explícita y se cubre con
  un test de regresión.
- `@busc=19/20` y `@busc=21` tienen órdenes de parámetros distintos. Mitigación: dos
  mappers separados con tests que fijen el orden.
- El resultado incluye datos personales (`codigo`, `nombre`): no se registran en logs.
