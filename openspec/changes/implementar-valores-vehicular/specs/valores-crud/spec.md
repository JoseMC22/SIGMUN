# Valores Vehicular — Specification

## Purpose

CRUD de valores del impuesto vehicular: montos por año ejercicio + categoría + marca + modelo + año vehículo, con búsqueda paginada, catálogos en cascada y eliminación lógica.

## Requirements

### Requirement: Search Paginated

`POST /api/impuesto-vehicular/valores/search` MUST accept `{ tipoBusqueda?, criterio?, page?, pageSize? }` and return `{ data: ValorRow[], total, page, pageSize, totalPages }`. SHALL call `sp_vehiculo_valores_contar` + `sp_vehiculo_valores_listar`. Page offset: `page>1 ? (page-1)*pageSize+1 : 0`.

- GIVEN records matching "TOYOTA"
- WHEN POST `{ tipoBusqueda:"marca", criterio:"TOYOTA", page:1, pageSize:10 }`
- THEN response has `data` array, `total>0`, `page:1`, `totalPages>=1`
- GIVEN no matches
- WHEN POST any non-matching criterio
- THEN `data` is `[]` and `total` is `0`

### Requirement: Get Single Valor

`GET /api/impuesto-vehicular/valores/:id` MUST return `{ data: ValorDetalle }` or `{ success: false, error: string }`. SHALL call `sp_vehiculo_valores_buscar @tipo=1`.

- GIVEN existing valor "V001"
- WHEN GET `/api/impuesto-vehicular/valores/V001`
- THEN `{ data: { id, ejercicio, categoria, marca, modelo, anio, monto, estado } }`
- GIVEN non-existent "INVALID"
- WHEN GET `/api/impuesto-vehicular/valores/INVALID`
- THEN `{ success: false, error: string }`

### Requirement: Save Valor

`POST /api/impuesto-vehicular/valores/save` MUST accept `{ id?, id_anio, id_categoria, id_marca, id_modelo, anio, monto, estado, xidmod }` and return `{ success: boolean, message: string }`. SHALL call `sp_vehiculo_valores_grabar @mquery=1` (create) or `@mquery=2` (update). `monto` MUST be numeric and positive. All fields except `id` are required.

- GIVEN valid fields, no `id`, unique combination
- WHEN POST save
- THEN record created, `{ success: true }`
- GIVEN existing valor with `id` and modified `monto`
- WHEN POST save
- THEN record updated, `{ success: true }`
- GIVEN missing `id_anio`
- WHEN POST save
- THEN `{ success: false, message: string }`

### Requirement: Logical Delete

`POST /api/impuesto-vehicular/valores/eliminar` MUST accept `{ id: string }` and return `{ success: boolean, message: string }`. SHALL call `sp_vehiculo_valores_grabar @mquery=3`. Delete MUST be logical (estado=0).

- GIVEN active valor "V001"
- WHEN POST eliminar `{ id:"V001" }`
- THEN estado becomes 0, `{ success: true }`
- GIVEN non-existent "INVALID"
- WHEN POST eliminar
- THEN `{ success: false }`

### Requirement: Unique Combination

The system MUST prevent duplicate active records for same `(id_anio, id_categoria, id_marca, id_modelo, anio)`.

- GIVEN active record exists for (2024, CAT1, MAR1, MOD1, 2023)
- WHEN POST save with same combination
- THEN `{ success: false, message: "Ya existe un valor activo con esa combinación" }`

### Requirement: Catalog Endpoints

| Endpoint | Method | SP | Body |
|----------|--------|----|------|
| `/catalogos/categorias` | GET | `@tipo=2` | — |
| `/catalogos/marcas` | GET | `@tipo=3` | — |
| `/catalogos/modelos` | POST | `@tipo=4` with `@datos1`, `@datos2` | `{ id_categoria, id_marca }` |
| `/catalogos/anios-ejercicio` | GET | `@tipo=5` | — |
| `/catalogos/anios` | GET | `@tipo=6` | — |

All MUST return `{ data: CatalogoOption[] }`. Models SHALL be filtered by `id_categoria + id_marca`.

- GIVEN no categories exist
- WHEN GET categorias
- THEN `data` is `[]`
- GIVEN `id_categoria=CAT1, id_marca=MAR1`
- WHEN POST modelos
- THEN only matching models returned

### Requirement: Grid Display

List MUST show columns: #, Año Ejercicio, Categoría, Marca, Modelo, Año Veh., Monto, Estado, Acciones. Estado SHALL display "ACTIVO"/"INACTIVO". MUST handle: loading skeleton, empty state message, error with retry button.

- GIVEN page mounting
- THEN skeleton/loader shown
- GIVEN no records after search
- THEN "No se encontraron registros" message
- GIVEN API failure
- THEN error with "Reintentar" button; clicking retry re-executes request

### Requirement: Search Filters

UI SHALL provide radio search: "Todos" | "Código" | "Marca" | "Modelo" (maps to `tipoBusqueda`) and text `criterio`. Additional text filters for Categoría, Marca, Modelo, Año. Filters SHOULD debounce before submitting.

- GIVEN radio "Marca" selected and "TOYOTA" typed
- WHEN form submits
- THEN POST search sends `{ tipoBusqueda:"marca", criterio:"TOYOTA" }`
