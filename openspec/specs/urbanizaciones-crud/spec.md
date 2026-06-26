# Urbanizaciones CRUD Specification

## Purpose

CRUD completo para urbanizaciones dentro del módulo Mantenimiento de Vías. Actualmente solo existe consulta vía modal `detalle-urbanizacion-modal.tsx`; este spec agrega creación, lectura individual y actualización (incluyendo toggle activo/inactivo) siguiendo el patrón del CRUD de Vías existente.

## Requirements

### R1: Create Urbanización API

`POST /mantenimiento-vias/urbanizaciones` MUST accept `CreateUrbanizacionDto` with Zod validation. Fields: `id_urba` (string, max 4), `tipourb` (referencia a tipo urb), `nombabr` (abreviado), `nombre` (completo), `nestado` (1/0), `operador`, `estacion`. SHALL execute `[Rentas].[sp_Mant_Vias]` with `@busc=16`. On success MUST return `{ success: true, message: "Urbanización registrada correctamente" }`. On validation failure SHALL return 400 with error details.

#### Scenario: Valid creation

- GIVEN a valid `CreateUrbanizacionDto` with all required fields
- WHEN the endpoint receives the POST
- THEN it calls the SP with `@busc=16` and mapped params
- AND returns `{ success: true, message }`

#### Scenario: Duplicate id_urba

- GIVEN an `id_urba` that already exists
- WHEN the SP raises a duplicate-key error (2627/2601)
- THEN the endpoint returns a conflict error (409) with descriptive message

#### Scenario: Invalid data rejected

- GIVEN `id_urba` exceeds 4 characters or `nombabr`/`nombre` is missing
- WHEN Zod validation runs
- THEN the endpoint returns 400 Bad Request with error details

### R2: Get Urbanización API

`GET /mantenimiento-vias/urbanizaciones/:id_urba` MUST return a single urbanización for editing. SHALL execute `[Rentas].[sp_Mant_Vias]` with `@busc=21`. Response MUST be `{ success: true, data: { id_urba, tipourb, nombabr, nombre, nestado } }`. SHALL throw 404 if no row is returned.

#### Scenario: Existing id_urba

- GIVEN an urbanización with `id_urba = "U001"` exists
- WHEN GET /urbanizaciones/U001 is called
- THEN the SP returns the row mapped to `{ id_urba, tipourb, nombabr, nombre, nestado }`
- AND response includes `success: true`

#### Scenario: Non-existent id_urba

- GIVEN no urbanización with `id_urba = "ZZZZ"` exists
- WHEN GET /urbanizaciones/ZZZZ is called
- THEN the SP returns zero rows
- AND the endpoint throws 404 Not Found

### R3: Update Urbanización API

`PUT /mantenimiento-vias/urbanizaciones/:id_urba` MUST accept `UpdateUrbanizacionDto`. SHALL execute `[Rentas].[sp_Mant_Vias]` with `@busc=22`. Setting `nestado=0` SHALL mark as inactive (logical delete). On success MUST return `{ success: true, message: "Urbanización actualizada correctamente" }`.

#### Scenario: Full update

- GIVEN an existing urbanización with `id_urba = "U001"`
- WHEN PUT /urbanizaciones/U001 is called with updated fields
- THEN the SP executes with `@busc=22` and the new values
- AND returns success message

#### Scenario: Toggle estado to inactive

- GIVEN an active urbanización
- WHEN PUT is called with `nestado: "0"`
- THEN the SP updates the record with inactive state
- AND returns success message

#### Scenario: Non-existent id_urba

- GIVEN no urbanización with the given id_urba
- WHEN PUT is called
- THEN the endpoint returns 404 Not Found

### R4: Server Actions

`createUrbanizacionAction`, `getUrbanizacionAction`, `updateUrbanizacionAction` in `actions/mantenimiento-vias.ts` MUST follow the same pattern as `createViaAction`/`getViaAction`/`updateViaAction`: `"use server"` actions using `authFetch()`, returning `{ success: true, data/message }` on success or `{ success: false, error }` on failure.

#### Scenario: Success path

- GIVEN authFetch resolves with 200 + valid JSON
- WHEN the action is invoked
- THEN it returns success envelope with expected data/message

#### Scenario: Network error

- GIVEN authFetch throws
- WHEN the action is invoked
- THEN it returns `{ success: false, error }` without throwing

### R5: Urbanización CRUD Modal

New `urbanizacion-crud-modal.tsx` SHALL follow the `via-crud-modal.tsx` pattern. MUST support two modes: **create** (form vacío con campos id_urba, tipourb via combo @busc=20, nombabr, nombre, nestado; botón "Registrar") and **edit** (mismos campos precargados vía API; id_urba read-only; botón "Actualizar"). On save success MUST call `onSaved` callback then close. SHALL include confirm dialog before submit, loading/error states, and close via X/Escape/outside click.

#### Scenario: Open in create mode

- GIVEN the modal receives `mode: "create"`
- WHEN it renders
- THEN the form shows empty fields with "Registrar" button
- AND id_urba input is editable

#### Scenario: Open in edit mode with data

- GIVEN the modal receives `mode: "edit"` and `idUrba`
- WHEN it mounts
- THEN it fetches data via `getUrbanizacionAction`
- AND pre-fills the form with id_urba read-only and "Actualizar" button

#### Scenario: Submit creates record

- GIVEN a filled form in create mode
- WHEN "Registrar" is clicked and confirmed
- THEN `createUrbanizacionAction` is called
- AND on success, `onSaved` fires and modal closes

#### Scenario: Submit updates record

- GIVEN modified form in edit mode
- WHEN "Actualizar" is clicked and confirmed
- THEN `updateUrbanizacionAction` is called with the id_urba
- AND on success, `onSaved` fires and modal closes

#### Scenario: Validation error displays

- GIVEN the API returns a validation error
- WHEN submit fails
- THEN the error message is shown in a red error banner inside the modal

#### Scenario: Close modal

- GIVEN the modal is open
- WHEN the user clicks X, presses Escape, or clicks outside
- THEN the modal closes without saving

### R6: Wire-up

"Nueva Urbanización" button in `detalle-urbanizacion-modal.tsx` footer SHALL open `urbanizacion-crud-modal` in **create** mode. "Editar" pencil button per table row SHALL open it in **edit** mode with the row's `id_urba`. On save (`onSaved`), the parent modal SHALL refresh its data list.

#### Scenario: "Nueva Urbanización" opens create modal

- GIVEN the Urbanización modal is open
- WHEN the user clicks "Nueva Urbanización"
- THEN the CRUD modal opens in create mode

#### Scenario: "Editar" pencil opens edit modal

- GIVEN the Urbanización modal is open with data rows
- WHEN the user clicks the pencil button on a row
- THEN the CRUD modal opens in edit mode with that row's id_urba

#### Scenario: Table refreshes after save

- GIVEN a save operation completes in the CRUD modal
- WHEN `onSaved` fires
- THEN `detalle-urbanizacion-modal` re-fetches its data list

## SP Contract

| SP | @busc | Params |
|----|-------|--------|
| `[Rentas].[sp_Mant_Vias]` | 16 | `@id_urba, @tipourb, @nombabr, @nombre, @nestado, @operador, @estacion` |
| `[Rentas].[sp_Mant_Vias]` | 21 | `@id_urba` |
| `[Rentas].[sp_Mant_Vias]` | 22 | `@id_urba, @tipourb, @nombabr, @nombre, @nestado, @operador, @estacion` |

## Test Coverage

| # | Domain | Test | Level |
|---|--------|------|-------|
| T1 | Backend | Controller create returns correct response shape | Unit |
| T2 | Backend | Zod validation rejects invalid data | Unit |
| T3 | Backend | Service calls SP with mapped params | Unit |
| T4 | Backend | Controller get one returns 404 for non-existent | Unit |
| T5 | Frontend | Action calls correct endpoint via authFetch | Unit |
| T6 | Frontend | Modal renders form in create mode | Component |
| T7 | Frontend | Modal renders form in edit mode with loaded data | Component |
| T8 | Frontend | Submit calls correct action | Component |
