# Modelos CRUD Specification

## Purpose

CRUD operations for vehicle models (modelos) — paginated search/filter with SP-driven persistence. Replaces PHP `VehiculoModeloController` with identical behavior.

## Requirements

### Requirement: Paginated Search with Filter

The system MUST support paginated search of vehicle models by free-text criteria and estado filter, matching PHP pagination math exactly.

| Property | Value |
|----------|-------|
| SP | `sp_vehiculo_modelo_contar` + `sp_vehiculo_modelo_listar` |
| Pagination | `start = page>1 ? (page-1)*limit+1 : 0; end = limit*page`, limit=15 |
| Fields | codmodelo, marca, nombre, estado, categoria, id |

#### Scenario: First page with estado filter

- GIVEN a search with `estado=1` and `criterio="sedan"` and `page=1`
- WHEN the controller calls `sp_vehiculo_modelo_contar(@tipo, @criterio)` then `sp_vehiculo_modelo_listar(@tipo, @criterio, @inicio=0, @fin=15)`
- THEN the response MUST include `data[]` with the first 15 matching rows and `total` matching the count

#### Scenario: Subsequent page

- GIVEN `page=3` and `limit=15`
- WHEN the controller calls `sp_vehiculo_modelo_listar(..., @inicio=31, @fin=45)`
- THEN response MUST return rows 31-45

#### Scenario: Empty results

- GIVEN a search with no matching rows
- WHEN the SP returns zero results
- THEN the response MUST return `{ data: [], total: 0 }`

### Requirement: Detail by ID

The system MUST return a single vehicle model by its primary key.

| Property | Value |
|----------|-------|
| SP | `sp_vehiculo_modelo_buscar(@tipo=1, @datos=id)` |

#### Scenario: Valid ID returns model

- GIVEN a model with `id=5` exists
- WHEN GET `/vehiculo/modelos/5`
- THEN the response MUST include the model's codmodelo, nombre, marca, categoria, and estado

#### Scenario: Non-existent ID

- GIVEN no model with `id=9999`
- WHEN GET `/vehiculo/modelos/9999`
- THEN the service MUST return null or throw a 404

### Requirement: Create Model

The system MUST create a new vehicle model via `mquery=1`.

| Property | Value |
|----------|-------|
| SP | `sp_vehiculo_modelo_grabar(@mquery=1, @xnombre, @xid_categoria, @xid_marca, @xestado)` |

#### Scenario: Successful creation

- GIVEN valid `nombre`, `id_categoria`, `id_marca`, and `estado=1`
- WHEN POST `/vehiculo/modelos/save`
- THEN the SP executes with `@mquery=1` and returns the new model's ID
- AND the response reflects the created entity

### Requirement: Update Model

The system MUST update an existing model via `mquery=2`.

#### Scenario: Full update

- GIVEN an existing model with `id=5` and valid update fields
- WHEN POST `/vehiculo/modelos/save` with `mquery=2` and the model ID
- THEN the SP executes with `@mquery=2` and updates nombre, id_categoria, id_marca, estado
- AND the response reflects the updated entity

### Requirement: Delete Model

The system MUST mark a model as inactive via `mquery=3`.

#### Scenario: Soft delete

- GIVEN an existing model with `id=5`
- WHEN POST `/vehiculo/modelos/eliminar` with `id=5`
- THEN the SP executes with `@mquery=3` and `@xid_modelo=5`
- AND the model is marked inactive (estado=0) in the database

### Requirement: Load Brand Catalog

The system MUST return a catalog of vehicle brands.

| Property | Value |
|----------|-------|
| SP | `sp_vehiculo_modelo_buscar(@tipo=3)` |

#### Scenario: Brands loaded

- GIVEN brands exist in the database
- WHEN GET `/vehiculo/modelos/catalogos/marcas`
- THEN the response MUST return a list of `{ id, nombre }` pairs

### Requirement: Load Category Catalog

The system MUST return a catalog of vehicle categories.

| Property | Value |
|----------|-------|
| SP | `sp_vehiculo_modelo_buscar(@tipo=2)` |

#### Scenario: Categories loaded

- GIVEN categories exist in the database
- WHEN GET `/vehiculo/modelos/catalogos/categorias`
- THEN the response MUST return a list of `{ id, nombre }` pairs
