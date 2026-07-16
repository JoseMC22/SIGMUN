# Spec: Módulo de Mantenimiento UIT

## Functional Requirements

### FR-1: Cargar años disponibles
El sistema debe cargar un desplegable (combo) con los años desde 1992 hasta el año vigente (obtenido del parámetro del sistema), en orden descendente.

### FR-2: Buscar valores UIT por año
Al presionar el botón "Buscar":
- Se ejecuta `GET /api/mantenimiento/uit?anno={valor_seleccionado}`
- El backend ejecuta `sp_uit @busc=2, @anno={anno}`
- Se muestran los resultados en una tabla

### FR-3: Mostrar tabla de resultados
La tabla debe mostrar las columnas:
| Año | Tipo | Valor UIT | Imp Mínimo | Imp Máximo | Costo Emisión | Costo Adic | Acciones |
Ordenada por año descendente.

### FR-4: Nuevo valor UIT
Botón "Nuevo valor" → abre popup modal con campos:
- Año (number, requerido)
- Valor UIT (number, requerido, > 0)

Validaciones:
- Año no debe existir ya en BD
- Ambos campos obligatorios

Al guardar: `POST /api/mantenimiento/uit` con body `{ anno, valor_uit }`.

### FR-5: Eliminar valor UIT (soft delete)
Botón "Eliminar" en cada fila → modal de confirmación "¿Estás seguro de eliminar la UIT del año X?".

Al confirmar: `DELETE /api/mantenimiento/uit/{anno}`.
El backend cambia estado de 1 a 0 (soft delete). Refresca la tabla.

## API Contracts

### GET /api/mantenimiento/uit?anno={anno}

Response 200:
```json
{
  "data": [
    {
      "anno": 2026,
      "tipo": "02.01",
      "valor_uit": 5500.00,
      "imp_minimo": 33.00,
      "imp_maximo": null,
      "costo_emis": 15.20,
      "costo_adic": 7.60,
      "row": 1
    }
  ]
}
```

Response 404:
```json
{ "message": "No se encontraron registros para el año {anno}" }
```

### POST /api/mantenimiento/uit

Request body:
```json
{
  "anno": 2027,
  "valor_uit": 5700.00
}
```

Validaciones (Zod):
- `anno`: number, integer, min 1992, max {año vigente + 1}
- `valor_uit`: number, positive, max 999999.99

Response 201:
```json
{ "message": "Registro creado exitosamente", "anno": 2027 }
```

Response 409 (año duplicado):
```json
{ "message": "El año {anno} ya existe", "error": "CONFLICT" }
```

### DELETE /api/mantenimiento/uit/{anno}

Response 200:
```json
{ "message": "Registro desactivado exitosamente" }
```

Response 404:
```json
{ "message": "No se encontró el año {anno}" }
```

## UI Component Breakdown

### Page: `app/mantenimiento/uit/page.tsx`
- FilterBar: combo años + Botón Buscar
- ResultsTable: tabla de datos con botón Eliminar por fila
- NuevoValorButton
- NuevoValorModal

### Modal: NuevoValorModal
- Input Año
- Input Valor UIT
- Botones Guardar / Cancelar
- Validación inline (año requerido, valor > 0)
- Error state: "El año ya existe"

### ConfirmDeleteModal
- Mensaje "¿Estás seguro de eliminar la UIT del año X?"
- Botones Confirmar / Cancelar

## Business Rules

| ID | Regla |
|----|-------|
| BR-01 | Año debe ser único (no puede haber dos registros con el mismo año activos) |
| BR-02 | Soft delete: estado pasa de 1 a 0, no se elimina físicamente |
| BR-03 | Año vigente se obtiene de parámetro del sistema (no hardcodeado) |
| BR-04 | Solo se permite crear UIT para años >= 1992 |
| BR-05 | No se puede modificar un registro existente (solo crear o eliminar) |

## Scenarios

### Success: Buscar año con datos
1. Usuario selecciona 2026 en combo
2. Presiona Buscar
3. Tabla muestra los registros de 2026
4. Botón Eliminar visible en cada fila

### Success: Buscar año sin datos
1. Usuario selecciona año sin registros
2. Presiona Buscar
3. Tabla vacía con mensaje "No hay registros para el año seleccionado"

### Success: Nuevo valor
1. Usuario presiona "Nuevo valor"
2. Completa año 2027, valor 5700
3. Presiona Guardar
4. Modal se cierra, tabla se refresca mostrando el nuevo registro

### Error: Año duplicado al crear
1. Usuario ingresa año 2026 (ya existe)
2. Presiona Guardar
3. Backend responde 409
4. Modal muestra error "El año 2026 ya existe"

### Success: Eliminar valor
1. Usuario presiona Eliminar en fila 2025
2. Modal confirmación: "¿Estás seguro de eliminar la UIT del año 2025?"
3. Usuario confirma
4. Se ejecuta DELETE, tabla se refresca sin el registro

### Error: Eliminar año inexistente
1. DELETE /api/mantenimiento/uit/9999
2. Backend responde 404
3. Toast o mensaje de error

## Acceptance Criteria

- [ ] AC-01: Combo carga años 1992..vigente descendente
- [ ] AC-02: Búsqueda por año muestra resultados en tabla
- [ ] AC-03: Tabla vacía muestra mensaje informativo
- [ ] AC-04: Popup nuevo valor tiene validaciones inline
- [ ] AC-05: Año duplicado muestra error en popup
- [ ] AC-06: Eliminación cambia estado 1→0 (soft delete)
- [ ] AC-07: Modal de confirmación aparece antes de eliminar
- [ ] AC-08: Tabla se refresca después de crear o eliminar
- [ ] AC-09: Backend valida año único con 409
- [ ] AC-10: Backend responde 404 para año inexistente en GET y DELETE
