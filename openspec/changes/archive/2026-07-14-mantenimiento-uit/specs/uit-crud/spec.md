# UIT CRUD Specification

## Purpose

Administración de los valores de la Unidad Impositiva Tributaria (UIT) por año: listar años disponibles, buscar por año, crear, editar y desactivar. Reemplaza el mantenimiento de la tabla `UIT` por un CRUD sobre `[Rentas].[sp_uit]`, detrás de `JwtAuthGuard`.

## Requirements

### Requirement: Listar años disponibles

El sistema DEBE retornar la lista de años con registros UIT disponibles.

| Property | Value |
|----------|-------|
| SP | `[Rentas].[sp_uit]` (`busc=1`) |
| Auth | `JwtAuthGuard` |
| Route | `GET /mantenimiento/uit/annos` |

#### Scenario: Años disponibles

- GIVEN existen registros UIT para los años 2024, 2025 y 2026
- WHEN `GET /mantenimiento/uit/annos`
- THEN la respuesta DEBE ser `{ annos: [2024, 2025, 2026] }`

### Requirement: Buscar UIT por año

El sistema DEBE retornar los registros UIT de un año dado; si no hay filas DEBE lanzar 404.

| Property | Value |
|----------|-------|
| SP | `[Rentas].[sp_uit]` (`busc=2`, `anno`) |
| Auth | `JwtAuthGuard` |
| Route | `GET /mantenimiento/uit?anno=2026` |

#### Scenario: Año con registros

- GIVEN existe al menos un registro UIT para `anno=2026`
- WHEN `GET /mantenimiento/uit?anno=2026`
- THEN la respuesta DEBE incluir `{ data: UitResponse[] }` con las filas del año

#### Scenario: Año sin registros

- GIVEN no existe registro UIT para `anno=1990`
- WHEN `GET /mantenimiento/uit?anno=1990`
- THEN el servicio DEBE lanzar `NotFoundException` (404)

### Requirement: Crear UIT

El sistema DEBE crear un nuevo registro UIT para un año; si el año ya existe DEBE lanzar 409.

| Property | Value |
|----------|-------|
| SP | `[Rentas].[sp_uit]` (`busc=2` para chequeo, `busc=5` para alta) |
| Auth | `JwtAuthGuard` |
| Route | `POST /mantenimiento/uit` |

#### Scenario: Alta exitosa

- GIVEN un año nuevo `2027` sin registro previo
- WHEN `POST /mantenimiento/uit` con `{ anno:2027, valor_uit, imp_minimo, imp_maximo, costo_emis, costo_adic, estado? }`
- THEN el SP ejecuta `busc=5` con `tipo='02.01'`, `valor_uit`, `imp_min`, `imp_max`, `costo_emision`, `costo_adicional` y `estado` (default `'1'`)
- AND la respuesta DEBE ser `{ message: 'Registro creado exitosamente', anno: 2027 }`

#### Scenario: Año duplicado

- GIVEN ya existe un registro UIT para `anno=2026`
- WHEN `POST /mantenimiento/uit` con `anno=2026`
- THEN el servicio DEBE lanzar `ConflictException` (409)

### Requirement: Editar UIT

El sistema DEBE actualizar un registro UIT existente; si el año no existe DEBE lanzar 404.

| Property | Value |
|----------|-------|
| SP | `[Rentas].[sp_uit]` (`busc=2` para chequeo, `busc=6` para update) |
| Auth | `JwtAuthGuard` |
| Route | `PUT /mantenimiento/uit` |

#### Scenario: Actualización exitosa

- GIVEN existe un registro UIT para `anno=2026`
- WHEN `PUT /mantenimiento/uit` con los campos editables
- THEN el SP ejecuta `busc=6` conservando el `tipo` actual y aplicando los nuevos valores
- AND la respuesta DEBE ser `{ message: 'Registro actualizado exitosamente', anno: 2026 }`

#### Scenario: Año inexistente

- GIVEN no existe registro UIT para `anno=9999`
- WHEN `PUT /mantenimiento/uit` con `anno=9999`
- THEN el servicio DEBE lanzar `NotFoundException` (404)

### Requirement: Desactivar UIT

El sistema DEBE desactivar (soft delete) un registro UIT marcándolo `estado='0'`.

| Property | Value |
|----------|-------|
| SP | `[Rentas].[sp_uit]` (`busc=7`, `anno`, `estado='0'`) |
| Auth | `JwtAuthGuard` |
| Route | `DELETE /mantenimiento/uit/:anno` |

#### Scenario: Desactivación lógica

- GIVEN existe un registro UIT para `anno=2025`
- WHEN `DELETE /mantenimiento/uit/2025`
- THEN el SP ejecuta `busc=7` con `estado='0'`
- AND la respuesta DEBE ser `{ message: 'Registro desactivado exitosamente' }`
