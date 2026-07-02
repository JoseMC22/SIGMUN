# Tasks: CRUD de Urbanizaciones

## Review Workload Forecast

```
┌─────────────────────────────────────────────────────────────┐
│  REVIEW WORKLOAD FORECAST                                    │
│                                                              │
│  Estimated changed lines: ~815                               │
│  Budget: 400 lines                                           │
│  Status: EXCEEDED (204% of budget)                           │
│                                                              │
│  ⚠️  This change exceeds the 400-line review budget.         │
│  Action required: The user must approve before apply.        │
│                                                              │
│  Breakdown:                                                   │
│    DTO + Types           ~55  lines  (Phase 1)               │
│    Service + Controller  ~155 lines  (Phase 2)               │
│    Frontend Actions      ~85  lines  (Phase 3)               │
│    Modal + Wiring        ~380 lines  (Phase 4)               │
│    Tests                 ~140 lines  (Phase 5)               │
│                                                              │
│  Recommendation: Proceed with implementation in phases        │
│  as defined below. User to confirm before Phase 4 (modal)     │
│  if budget concern persists.                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Infrastructure (DTO + Types)

### T1.1 — Crear DTO `create-urbanizacion.dto.ts`

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/dto/create-urbanizacion.dto.ts`

**Dependencias**: Ninguna

**Descripción**: Crear schemas Zod y tipos inferidos para creación y actualización de urbanizaciones, siguiendo el patrón de `create-mantenimiento-vias.dto.ts`.

**Checklist**:
- [x] Importar `z` desde `zod`
- [x] Definir `CreateUrbanizacionSchema` con:
  - `id_urba`: `z.string().max(4, 'id_urba máximo 4 caracteres')`
  - `tipourb`: `z.string().max(4, 'tipourb máximo 4 caracteres')`
  - `nombabr`: `z.string().max(30, 'nombabr máximo 30 caracteres')`
  - `nombre`: `z.string().max(200, 'nombre máximo 200 caracteres')`
  - `nestado`: `z.string().max(1).default('1')`
  - `operador`: `z.string().default('')`
  - `estacion`: `z.string().max(25, 'estacion máximo 25 caracteres').default('')`
- [x] Definir tipo `CreateUrbanizacionDto` inferido del schema
- [x] Definir `UpdateUrbanizacionSchema` con:
  - `id_urba`: `z.string().max(4)`
  - `tipourb`: `z.string().max(4)`
  - `nombabr`: `z.string().max(30)`
  - `nombre`: `z.string().max(200)`
  - `nestado`: `z.string().max(1)`
  - `estacion`: `z.string().max(25).default('')`
- [x] Definir tipo `UpdateUrbanizacionDto` inferido del schema

**Líneas estimadas**: ~35

---

### T1.2 — Agregar tipos SP en `mantenimiento-vias.types.ts`

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/dto/mantenimiento-vias.types.ts`

**Dependencias**: Ninguna

**Descripción**: Agregar interfaces para respuesta de SP @busc=21 (detalle) y @busc=16/22 (resultado CRUD).

**Checklist**:
- [x] Agregar `SpUrbanizacionDetail`:
  ```typescript
  /** @busc=21 — Detalle de urbanización para edición */
  export interface SpUrbanizacionDetail {
    id_urba: string;
    tipourb: string;
    nombabr: string;
    nombre: string;
    nestado: string;
  }
  ```
- [x] Agregar `SpUrbanizacionCRUDResult`:
  ```typescript
  /** @busc=16 / @busc=22 — Respuesta del SP CRUD */
  export interface SpUrbanizacionCRUDResult {
    mensaje?: string;
    success?: string;
  }
  ```

**Líneas estimadas**: ~20

---

## Phase 2: Backend Core Implementation

### T2.1 — Métodos de servicio `createUrbanizacion`, `getUrbanizacion`, `updateUrbanizacion`

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/mantenimiento-vias.service.ts`

**Dependencias**: T1.1, T1.2

**Descripción**: Agregar 3 métodos en `MantenimientoViasService` que ejecutan `[Rentas].[sp_Mant_Vias]` con los @busc correspondientes.

**Checklist**:
- [x] Importar tipos nuevos: `SpUrbanizacionDetail`, `SpUrbanizacionCRUDResult` desde `./dto/mantenimiento-vias.types`
- [x] Importar DTOs nuevos: `CreateUrbanizacionDto`, `UpdateUrbanizacionDto` desde `./dto/create-urbanizacion.dto`

- [x] Método `createUrbanizacion(dto: CreateUrbanizacionDto, operador?: string, estacion?: string)`:
  - Ejecutar SP con `busc: 16`, params mapeados: `id_urba`, `tipourb`, `nombabr`, `nombre`, `nestado`, `operador`, `estacion`
  - Retornar `{ message: 'Urbanización registrada correctamente' }`

- [x] Método `getUrbanizacion(id_urba: string)`:
  - Ejecutar SP con `busc: 21`, param `id_urba`
  - Si `recordset` vacío, lanzar `NotFoundException` con mensaje descriptivo
  - Retornar `{ id_urba, tipourb, nombabr, nombre, nestado }` mapeado desde `SpUrbanizacionDetail`

- [x] Método `updateUrbanizacion(id_urba: string, dto: UpdateUrbanizacionDto, operador?: string, estacion?: string)`:
  - Ejecutar SP con `busc: 22`, params mapeados: `id_urba`, `tipourb`, `nombabr`, `nombre`, `nestado`, `operador`, `estacion`
  - Retornar `{ message: 'Urbanización actualizada correctamente' }`

**Líneas estimadas**: ~65

---

### T2.2 — Endpoints de controller POST / GET / PUT urbanizaciones

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/mantenimiento-vias.controller.ts`

**Dependencias**: T2.1

**Descripción**: Agregar 3 endpoints REST para urbanizaciones, colocados ANTES del `@Get(':cod_via')` existente para evitar conflictos de ruteo Express.

**Checklist**:
- [x] Importar `CreateUrbanizacionSchema`, `CreateUrbanizacionDto`, `UpdateUrbanizacionSchema`, `UpdateUrbanizacionDto` desde `./dto/create-urbanizacion.dto`
- [x] Importar `SpUrbanizacionDetail` desde `./dto/mantenimiento-vias.types`
- [x] Ubicar los 3 nuevos endpoints entre `@Get('combos/zonas')` y `@Get(':cod_via')` (línea ~109 en el archivo actual)

- [x] Endpoint `POST /mantenimiento-vias/urbanizaciones`:
  ```typescript
  @Post('urbanizaciones')
  async createUrbanizacion(
    @Body() dto: CreateUrbanizacionDto,
    @Request() req,
  ): Promise<{ success: true; message: string }>
  ```
  - Validar con `CreateUrbanizacionSchema.parse(dto)`
  - Capturar `ZodError` → `BadRequestException` con `{ success: false, error }`
  - Extraer `operador` desde `req.user.username`, `estacion` desde header/IP
  - Llamar `service.createUrbanizacion(parsed, operador, clientIp)`
  - Retornar `{ success: true, message }`

- [x] Endpoint `GET /mantenimiento-vias/urbanizaciones/:id_urba`:
  ```typescript
  @Get('urbanizaciones/:id_urba')
  async getUrbanizacion(
    @Param('id_urba') id_urba: string,
  ): Promise<{ success: true; data: SpUrbanizacionDetail }>
  ```
  - Llamar `service.getUrbanizacion(id_urba)`
  - Dejar que `NotFoundException` del service se propague (manejado por NestJS filter)
  - Retornar `{ success: true, data }`

- [x] Endpoint `PUT /mantenimiento-vias/urbanizaciones/:id_urba`:
  ```typescript
  @Put('urbanizaciones/:id_urba')
  async updateUrbanizacion(
    @Param('id_urba') id_urba: string,
    @Body() dto: UpdateUrbanizacionDto,
    @Request() req,
  ): Promise<{ success: true; message: string }>
  ```
  - Validar con `UpdateUrbanizacionSchema.parse(dto)`
  - Capturar `ZodError` → `BadRequestException`
  - Extraer `operador` y `estacion`
  - Llamar `service.updateUrbanizacion(id_urba, parsed, operador, clientIp)`
  - Retornar `{ success: true, message }`

**Líneas estimadas**: ~90

---

## Phase 3: Frontend Actions

### T3.1 — Nuevos tipos y server actions en `mantenimiento-vias.ts`

**Archivo**: `frontend/src/actions/mantenimiento-vias.ts`

**Dependencias**: T1.2 (SpUrbanizacionDetail)

**Descripción**: Agregar 4 nuevas server actions para urbanizaciones: `getTiposUrbanizacionAction`, `createUrbanizacionAction`, `getUrbanizacionAction`, `updateUrbanizacionAction`. Seguir el patrón exacto de `createViaAction`/`getViaAction`/`updateViaAction`.

**Checklist**:
- [x] Agregar interfaz `TipoUrbanizacionOption`:
  ```typescript
  export interface TipoUrbanizacionOption {
    id: string;
    abrev: string;
    nombre: string;
  }
  ```

- [x] Agregar interfaz `CreateUrbanizacionPayload`:
  ```typescript
  export interface CreateUrbanizacionPayload {
    id_urba: string;
    tipourb: string;
    nombabr: string;
    nombre: string;
    nestado?: string;
    operador?: string;
    estacion?: string;
  }
  ```

- [x] Agregar interfaz `UpdateUrbanizacionPayload`:
  ```typescript
  export interface UpdateUrbanizacionPayload {
    tipourb: string;
    nombabr: string;
    nombre: string;
    nestado: string;
    estacion?: string;
  }
  ```

- [x] Acción `getTiposUrbanizacionAction()`:
  - GET `/mantenimiento-vias/combos/tipos-urbanizacion`
  - Retornar `{ success: true, data: TipoUrbanizacionOption[] }` o `{ success: false, error }`

- [x] Acción `createUrbanizacionAction(payload)`:
  - POST `/mantenimiento-vias/urbanizaciones` con body JSON
  - Retornar `{ success: true, message }` o `{ success: false, error }`

- [x] Acción `getUrbanizacionAction(id_urba)`:
  - GET `/mantenimiento-vias/urbanizaciones/${encodeURIComponent(id_urba)}`
  - Retornar `{ success: true, data: SpUrbanizacionDetail }` o `{ success: false, error }`

- [x] Acción `updateUrbanizacionAction(id_urba, payload)`:
  - PUT `/mantenimiento-vias/urbanizaciones/${encodeURIComponent(id_urba)}` con body JSON
  - Retornar `{ success: true, message }` o `{ success: false, error }`

**Líneas estimadas**: ~85

---

## Phase 4: Frontend Modal + Wiring

### T4.1 — Crear `urbanizacion-crud-modal.tsx`

**Archivo**: `frontend/src/app/dashboard/administracion-tributaria/mantenimiento-vias/urbanizacion-crud-modal.tsx`

**Dependencias**: T3.1

**Descripción**: Nuevo modal Client Component siguiendo el patrón exacto de `via-crud-modal.tsx`. Soporta modo create (formulario vacío con id_urba editable) y modo edit (id_urba read-only, datos precargados vía API).

**Checklist**:
- [x] Declarar `"use client"`
- [x] Importar `useState`, `useEffect`, `useCallback`, `FormEvent` desde React
- [x] Importar `X`, `Loader2`, `Save` desde `lucide-react`
- [x] Importar actions: `getTiposUrbanizacionAction`, `createUrbanizacionAction`, `getUrbanizacionAction`, `updateUrbanizacionAction`
- [x] Importar tipos: `TipoUrbanizacionOption` desde actions
- [x] Importar `getStoredUser`, `getPcName`, `fetchPcName`, `setPcName` desde `@/lib/api`

- [x] Definir tipo `ModalMode = "create" | "edit"`
- [x] Definir interfaz `UrbanizacionFormData` con campos: `id_urba`, `tipourb`, `nombabr`, `nombre`, `nestado`, `operador`, `estacion`
- [x] Definir interfaz `Props`:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `mode: ModalMode`
  - `idUrba?: string` (solo en edit)
  - `onSaved: () => void`

- [x] Estado del componente:
  - `form: UrbanizacionFormData` (iniciado con valores vacíos, nestado "1")
  - `saving`, `loading`, `error`
  - `tipoUrbOptions: TipoUrbanizacionOption[]`
  - `combosLoading`
  - `originalForm: UrbanizacionFormData | null` (para detectar cambios en edit)

- [x] `useEffect` para carga de combos `getTiposUrbanizacionAction()` al abrir
- [x] `useEffect` para fetch de PC name al abrir
- [x] `useEffect` para cargar datos en modo edit mediante `getUrbanizacionAction(idUrba)`
- [x] `handleChange(field, value)`
- [x] `hasChanges()` para modo edit
- [x] `handleSubmit` con:
  - Confirm dialog (`confirm()`)
  - Normalizar `nombabr` a mayúsculas
  - En create: `createUrbanizacionAction(form)` incluyendo operador/estacion
  - En edit: `updateUrbanizacionAction(idUrba, form)`
  - On success: `onSaved()` + `onClose()`

- [x] Render condicional (`if (!isOpen) return null`)
- [x] Overlay con `onClick` en backdrop, `onKeyDown` Escape, `tabIndex={-1}`
- [x] Header con gradiente, título condicional ("Nueva Urbanización" / "Editar Urbanización"), botón X
- [x] Body con:
  - Error banner (rojo)
  - Loading spinner para edit
  - Formulario:
    - id_urba: read-only en edit, editable en create
    - tipo urb: select desde `tipoUrbOptions`
    - nombabr: input texto, maxLength 30
    - nombre: input texto, maxLength 200
    - nestado: select ACTIVADO/INACTIVO
    - operador: disabled
    - estación: disabled + botón Settings para editar (como en via-crud-modal)
  - Botones: Cancelar + Registrar/Actualizar (con spinner)

**Líneas estimadas**: ~350

---

### T4.2 — Wire-up en `detalle-urbanizacion-modal.tsx`

**Archivo**: `frontend/src/app/dashboard/administracion-tributaria/mantenimiento-vias/detalle-urbanizacion-modal.tsx`

**Dependencias**: T4.1

**Descripción**: Conectar botones "Nueva Urbanización" y "Editar" (pencil) al nuevo modal CRUD. Agregar estado de apertura, handlers, y refresco post-save.

**Checklist**:
- [x] Importar `UrbanizacionCrudModal` desde `./urbanizacion-crud-modal`
- [x] Agregar estado:
  - `crudModalOpen: boolean` (default `false`)
  - `crudModalMode: "create" | "edit"` (default `"create"`)
  - `editUrbaId: string` (default `""`)
- [x] Agregar handler `handleNuevaUrbanizacion`:
  - `setCrudModalMode("create")`
  - `setEditUrbaId("")`
  - `setCrudModalOpen(true)`
- [x] Agregar handler `handleEditarUrbanizacion(id_urba)`:
  - `setCrudModalMode("edit")`
  - `setEditUrbaId(id_urba)`
  - `setCrudModalOpen(true)`
- [x] Agregar handler `handleCrudSaved`:
  - Llamar `handleSearch()` para refrescar la tabla
  - `setCrudModalOpen(false)`
- [x] En el botón "Nueva Urbanización" (footer, línea ~354): agregar `onClick={handleNuevaUrbanizacion}`
- [x] En el botón "Editar" (pencil, línea ~271): agregar `onClick={() => handleEditarUrbanizacion(row.id_urba)}`
- [x] Renderizar `<UrbanizacionCrudModal>` al final del JSX, justo antes del cierre del div contenedor, con props:
  - `isOpen={crudModalOpen}`
  - `onClose={() => setCrudModalOpen(false)}`
  - `mode={crudModalMode}`
  - `idUrba={editUrbaId || undefined}`
  - `onSaved={handleCrudSaved}`

**Líneas estimadas**: ~30

---

## Phase 5: Tests (Strict TDD — escribir tests PRIMERO)

### T5.1 — Tests de servicio backend

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/mantenimiento-vias.service.spec.ts`

**Dependencias**: T2.1

**Descripción**: Tests unitarios para los 3 nuevos métodos del servicio, siguiendo el patrón de mocks existente (`jest.Mocked<Pick<DatabaseService, 'executeProcedure'>>`).

**Checklist**:
- [x] `createUrbanizacion` llama SP con `busc: 16` y params correctos
  - Mockear `db.executeProcedure` con resolución exitosa
  - Verificar llamado con `[Rentas].[sp_Mant_Vias]` y objeto que incluye `busc: 16`, `id_urba`, `tipourb`, `nombabr`, `nombre`, `nestado`, `operador`, `estacion`
  - Verificar retorno `{ message: "Urbanización registrada correctamente" }`
- [x] `createUrbanizacion` pasa operador y estacion correctamente
  - Verificar que `operador` y `estacion` del DTO se mapean al SP
- [x] `getUrbanizacion` llama SP con `busc: 21` y retorna `SpUrbanizacionDetail`
  - Mockear `recordset` con una fila
  - Verificar retorno con los campos mapeados
- [x] `getUrbanizacion` lanza `NotFoundException` cuando no hay filas
  - Mockear `recordset: []`
  - Verificar que lanza `NotFoundException`
- [x] `updateUrbanizacion` llama SP con `busc: 22` y params correctos
  - Verificar llamado con `busc: 22` y todos los params
  - Verificar retorno `{ message: "Urbanización actualizada correctamente" }`

**Líneas estimadas**: ~70

---

### T5.2 — Tests de controller backend

**Archivo**: `backend/src/administracion-tributaria/mantenimiento-vias/mantenimiento-vias.controller.spec.ts`

**Dependencias**: T2.2

**Descripción**: Tests unitarios para los 3 nuevos endpoints, siguiendo el patrón existente con `Test.createTestingModule` y `overrideGuard(JwtAuthGuard)`.

**Checklist**:
- [x] Configurar `TestingModule` con mock del service que incluya los 3 nuevos métodos
- [x] `POST /urbanizaciones` retorna `{ success: true, message }` en creación exitosa
  - Mockear `service.createUrbanizacion`
  - Llamar `controller.createUrbanizacion(dtoValido, mockRequest)`
  - Verificar respuesta y llamado a service
- [x] `POST /urbanizaciones` rechaza datos inválidos con `BadRequestException`
  - Llamar con DTO con `id_urba` > 4 caracteres
  - Verificar que lanza `BadRequestException`
- [x] `GET /urbanizaciones/:id_urba` retorna `{ success: true, data }`
  - Mockear `service.getUrbanizacion` con `SpUrbanizacionDetail`
  - Verificar respuesta
- [x] `PUT /urbanizaciones/:id_urba` retorna `{ success: true, message }`
  - Mockear `service.updateUrbanizacion`
  - Llamar con DTO válido y request mock
  - Verificar respuesta

**Líneas estimadas**: ~80

---

### T5.3 — Tests de frontend actions

**Archivo**: `frontend/src/actions/mantenimiento-vias.test.ts`

**Dependencias**: T3.1

**Descripción**: Tests unitarios para las 4 nuevas acciones. Seguir el patrón existente con `vi.mock("next/headers")` y mock de `global.fetch`.

**Checklist**:
- [x] `getTiposUrbanizacionAction` llama GET correcto y retorna data
  - Mockear fetch con respuesta 200 + `{ data: [...] }`
  - Verificar URL: `/mantenimiento-vias/combos/tipos-urbanizacion`
  - Verificar retorno `{ success: true, data }`
- [x] `createUrbanizacionAction` llama POST con payload y retorna message
  - Mockear fetch 200 con `{ message: "..." }`
  - Verificar URL: `/mantenimiento-vias/urbanizaciones`
  - Verificar method POST, body con payload serializado
- [x] `getUrbanizacionAction` llama GET con id_urba y retorna data
  - Verificar URL incluye `encodeURIComponent(id_urba)`
  - Verificar retorno `{ success: true, data }`
- [x] `updateUrbanizacionAction` llama PUT con payload y retorna message
  - Verificar URL: `/mantenimiento-vias/urbanizaciones/${id}`
  - Verificar method PUT, body con payload
- [x] Cada acción retorna `{ success: false, error }` en error de red
  - Mockear fetch con `mockRejectedValue`
- [x] Cada acción retorna `{ success: false, error }` en respuesta no-ok
  - Mockear fetch con `ok: false, status: 400`

**Líneas estimadas**: ~60

---

### T5.4 — Test del modal `urbanizacion-crud-modal`

**Archivo** (crear nuevo): `frontend/src/app/dashboard/administracion-tributaria/mantenimiento-vias/urbanizacion-crud-modal.test.tsx`

**Dependencias**: T4.1

**Descripción**: Tests de componente con `@testing-library/react`. Mockear server actions y verificar renderizado, modos, y submit.

**Checklist**:
- [x] Mockear acciones: `getTiposUrbanizacionAction`, `createUrbanizacionAction`, `getUrbanizacionAction`, `updateUrbanizacionAction` con `vi.fn()`
- [x] Render en modo create muestra campos vacíos y botón "Registrar"
  - Props: `mode: "create"`, `isOpen: true`
  - Verificar `data-testid="urbanizacion-crud-modal"`
  - Verificar botón "Registrar" presente
  - Verificar input `id_urba` no está deshabilitado
- [x] Render en modo edit carga datos y muestra botón "Actualizar"
  - Mockear `getUrbanizacionAction` resuelve con `{ success: true, data: {...} }`
  - Props: `mode: "edit"`, `idUrba: "U001"`
  - Verificar input `id_urba` deshabilitado (read-only)
  - Verificar botón "Actualizar" presente
- [x] Submit en modo create llama `createUrbanizacionAction` y dispara `onSaved`
  - Mockear `createUrbanizacionAction` resuelve con `{ success: true, message }`
  - Llenar campos, submit, verificar llamado, verificar `onSaved` se llamó
- [x] Submit en modo edit llama `updateUrbanizacionAction` y dispara `onSaved`
  - Similar al anterior con modo edit
- [x] Cerrar modal vía botón X llama `onClose`
  - Click en botón con `aria-label="Cerrar"` (o X)
  - Verificar `onClose` llamado

**Líneas estimadas**: ~100

---

## Resumen de Archivos

| Archivo | Acción | Phase |
|---------|--------|-------|
| `backend/.../dto/create-urbanizacion.dto.ts` | Crear | 1 |
| `backend/.../dto/mantenimiento-vias.types.ts` | Modificar | 1 |
| `backend/.../mantenimiento-vias.service.ts` | Modificar | 2 |
| `backend/.../mantenimiento-vias.controller.ts` | Modificar | 2 |
| `frontend/src/actions/mantenimiento-vias.ts` | Modificar | 3 |
| `frontend/.../urbanizacion-crud-modal.tsx` | Crear | 4 |
| `frontend/.../detalle-urbanizacion-modal.tsx` | Modificar | 4 |
| `backend/.../mantenimiento-vias.service.spec.ts` | Modificar | 5 |
| `backend/.../mantenimiento-vias.controller.spec.ts` | Modificar | 5 |
| `frontend/src/actions/mantenimiento-vias.test.ts` | Modificar | 5 |
| `frontend/.../urbanizacion-crud-modal.test.tsx` | Crear | 5 |

## Orden de Implementación

```
T1.1 → T1.2 → T2.1 → T2.2 → T3.1 → T4.1 → T4.2 → T5.1 → T5.2 → T5.3 → T5.4
```

Donde T5.x (tests) deben escribirse **antes** de la implementación correspondiente (Strict TDD), pero se listan al final por claridad de fases. En la práctica:

1. Escribir T5.1 → implementar T2.1
2. Escribir T5.2 → implementar T2.2
3. Escribir T5.3 → implementar T3.1
4. Escribir T5.4 → implementar T4.1
5. Implementar T4.2 (wiring — sin tests específicos)
