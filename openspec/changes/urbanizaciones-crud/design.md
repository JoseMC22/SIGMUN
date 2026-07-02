# Design: CRUD de Urbanizaciones

## Technical Approach

Extender el módulo `MantenimientoVias` existente agregando 3 endpoints REST, 3 métodos de servicio, DTOs con validación Zod, y un nuevo modal frontend que sigue el patrón exacto del CRUD de Vías (`via-crud-modal.tsx`). Sin migraciones — los stored procedures ya existen en `[Rentas].[sp_Mant_Vias]`.

## Architecture Decisions

### Decision: Ubicación de rutas en el controller

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Nuevo controller separado | Más archivos, inconsistente con el patrón existente | ❌ |
| Mismo controller, rutas antes de `:cod_via` | Previene conflicto Express con param catch-all | ✅ |

**Rationale**: NestJS/Express registra rutas en orden. Si `urbanizaciones/:id_urba` se registra después de `:cod_via`, una request a `/urbanizaciones/U001` podría matchear `:cod_via` con `cod_via="urbanizaciones"`. Se colocan las nuevas rutas entre las rutas `combos/` existentes y `:cod_via`.

### Decision: DTO separado para urbanizaciones

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Reutilizar DTO de vías | Fields distintos, Zod schema mezclado | ❌ |
| Archivo propio `create-urbanizacion.dto.ts` | Consistente con estructura actual, testable aisladamente | ✅ |

**Rationale**: Los campos de urbanización (`tipourb`, `nombabr`) son distintos de los de vía (`tipovia`, `vcuadra`, etc.). Un archivo separado sigue el patrón existente y mantiene el código limpio.

### Decision: `estacion` vía DTO, `operador` vía request context en update

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Ambos en DTO | Operador editable por el cliente (inconsistente con vías) | ❌ |
| Operador del JWT, estacion del DTO | Consistente con patrón `updateVia` + SP @busc=22 acepta operador | ✅ |

**Rationale**: El SP @busc=22 acepta `@operador`, pero el patrón establecido en `update()` de vías no expone operador en el DTO. Se pasa `operador` desde `req.user.username` del controller al service, donde se inyecta al SP. `estacion` sí se incluye en el DTO (como en `updateVia`).

### Decision: Single file para tipos `SpUrbanizacionDetail`

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Tipo inline en el service | Inconsistente con el patrón de types.ts | ❌ |
| Nueva interfaz en `mantenimiento-vias.types.ts` | Sigue patrón existente (`SpViaDetail`, `SpUrbanizacion`, etc.) | ✅ |

**Rationale**: Todos los tipos SP están centralizados en `mantenimiento-vias.types.ts`. Agregar `SpUrbanizacionDetail` ahí mantiene la consistencia y facilita el descubrimiento.

## Data Flow

```
detalle-urbanizacion-modal.tsx
  │
  ├─ "Nueva Urbanización" → urbanizacion-crud-modal.tsx (mode: "create")
  ├─ "Editar" (pencil)    → urbanizacion-crud-modal.tsx (mode: "edit", idUrba)
  │
  ▼
urbanizacion-crud-modal.tsx
  │
  ├─ mount → combos: getTiposUrbanizacionAction() → GET /combos/tipos-urbanizacion
  ├─ mount (edit) → getUrbanizacionAction(id) → GET /urbanizaciones/:id_urba
  │
  ├─ submit create → createUrbanizacionAction(payload) → POST /urbanizaciones
  ├─ submit update → updateUrbanizacionAction(id, payload) → PUT /urbanizaciones/:id
  │
  ▼
mantenimiento-vias.controller.ts
  │
  ├─ Zod validation → BadRequestException si falla
  │
  ▼
mantenimiento-vias.service.ts
  │
  └─ db.executeProcedure('[Rentas].[sp_Mant_Vias]', { busc: 16|21|22, ... })
       │
       ▼
      SQL Server → response → controller → action → modal.onSaved → detalle-urbanizacion re-fetch
```

## File Changes

| File | Acción | Descripción |
|------|--------|-------------|
| `backend/.../dto/create-urbanizacion.dto.ts` | Crear | Schemas Zod `CreateUrbanizacionSchema` y `UpdateUrbanizacionSchema` con tipos inferidos |
| `backend/.../dto/mantenimiento-vias.types.ts` | Modificar | Agregar `SpUrbanizacionDetail` para @busc=21; agregar `SpUrbanizacionCRUDResult` para @busc=16/22 |
| `backend/.../mantenimiento-vias.service.ts` | Modificar | +3 métodos: `createUrbanizacion()`, `getUrbanizacion()`, `updateUrbanizacion()` |
| `backend/.../mantenimiento-vias.controller.ts` | Modificar | +3 endpoints POST/GET/PUT bajo `/urbanizaciones` (antes de `:cod_via`) |
| `backend/.../mantenimiento-vias.service.spec.ts` | Modificar | Tests unitarios para 3 nuevos métodos |
| `backend/.../mantenimiento-vias.controller.spec.ts` | Modificar | Tests unitarios para 3 nuevos endpoints |
| `frontend/src/actions/mantenimiento-vias.ts` | Modificar | +4 server actions: create, get, update urbanización + getTiposUrbanizacionAction |
| `frontend/.../urbanizacion-crud-modal.tsx` | Crear | Modal CRUD siguiendo patrón `via-crud-modal.tsx` |
| `frontend/.../detalle-urbanizacion-modal.tsx` | Modificar | Wiring: botones abren modal CRUD, refresco post-save |
| `frontend/src/actions/mantenimiento-vias.test.ts` | Modificar | Tests unitarios para nuevas actions |
| `frontend/.../mantenimiento-vias.test.tsx` | Modificar | Tests de componente para nuevo modal (o archivo separado) |

## Interfaces / Contracts

### Zod Schemas (`dto/create-urbanizacion.dto.ts`)

```typescript
import { z } from 'zod';

export const CreateUrbanizacionSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres'),
  tipourb: z.string().max(4, 'tipourb máximo 4 caracteres'),
  nombabr: z.string().max(30, 'nombabr máximo 30 caracteres'),
  nombre:  z.string().max(200, 'nombre máximo 200 caracteres'),
  nestado: z.string().max(1, 'nestado máximo 1 carácter').default('1'),
  operador: z.string().default(''),
  estacion: z.string().max(25, 'estacion máximo 25 caracteres').default(''),
});

export type CreateUrbanizacionDto = z.infer<typeof CreateUrbanizacionSchema>;

export const UpdateUrbanizacionSchema = z.object({
  id_urba: z.string().max(4, 'id_urba máximo 4 caracteres'),
  tipourb: z.string().max(4, 'tipourb máximo 4 caracteres'),
  nombabr: z.string().max(30, 'nombabr máximo 30 caracteres'),
  nombre:  z.string().max(200, 'nombre máximo 200 caracteres'),
  nestado: z.string().max(1, 'nestado máximo 1 carácter'),
  estacion: z.string().max(25, 'estacion máximo 25 caracteres').default(''),
});

export type UpdateUrbanizacionDto = z.infer<typeof UpdateUrbanizacionSchema>;
```

### New Types (`mantenimiento-vias.types.ts`)

```typescript
/** @busc=21 — Detalle de urbanización para edición */
export interface SpUrbanizacionDetail {
  id_urba: string;
  tipourb: string;
  nombabr: string;
  nombre: string;
  nestado: string;
}

/** @busc=16 / @busc=22 — Respuesta del SP CRUD (confirmación) */
export interface SpUrbanizacionCRUDResult {
  mensaje?: string;
  success?: string;
}
```

### Server Action Signatures (`actions/mantenimiento-vias.ts`)

```typescript
export interface TipoUrbanizacionOption {
  id: string;
  abrev: string;
  nombre: string;
}

export interface CreateUrbanizacionPayload {
  id_urba: string;
  tipourb: string;
  nombabr: string;
  nombre: string;
  nestado?: string;
  operador?: string;
  estacion?: string;
}

export interface UpdateUrbanizacionPayload {
  tipourb: string;
  nombabr: string;
  nombre: string;
  nestado: string;
  estacion?: string;
}

export async function getTiposUrbanizacionAction(): Promise<
  { success: true; data: TipoUrbanizacionOption[] } | { success: false; error: string }
>;

export async function createUrbanizacionAction(payload: CreateUrbanizacionPayload): Promise<
  { success: true; message: string } | { success: false; error: string }
>;

export async function getUrbanizacionAction(id_urba: string): Promise<
  { success: true; data: SpUrbanizacionDetail } | { success: false; error: string }
>;

export async function updateUrbanizacionAction(
  id_urba: string,
  payload: UpdateUrbanizacionPayload,
): Promise<
  { success: true; message: string } | { success: false; error: string }
>;
```

### SP Contract

| @busc | Método | Params |
|-------|--------|--------|
| 16 | createUrbanizacion | `id_urba, tipourb, nombabr, nombre, nestado, operador, estacion` |
| 21 | getUrbanizacion | `id_urba` |
| 22 | updateUrbanizacion | `id_urba, tipourb, nombabr, nombre, nestado, operador, estacion` |

### Controller Route Order (nuevas rutas entre combos y `:cod_via`)

```
GET  /combos/tipos-via           ← existente
GET  /urbanizaciones             ← existente (lista)
GET  /combos/urbanizaciones      ← existente
GET  /combos/tipos-urbanizacion  ← existente
GET  /combos/zonas               ← existente
POST /urbanizaciones             ← NUEVO (crear)
GET  /urbanizaciones/:id_urba    ← NUEVO (obtener uno)
PUT  /urbanizaciones/:id_urba    ← NUEVO (actualizar)
GET  :cod_via                    ← existente (a partir de aquí)
...resto de rutas existentes
```

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| **Backend — Controller** | POST /urbanizaciones → 201, GET /urbanizaciones/:id → 200/404, PUT /urbanizaciones/:id → 200/404 | `Test.createTestingModule` con mock del service. `overrideGuard(JwtAuthGuard)` como en spec existente. Zod parse: probar BadRequestException con datos inválidos. |
| **Backend — Service** | SP llamado con @busc correcto y params mapeados | Mock `DatabaseService.executeProcedure`. Verificar `@busc: 16/21/22` y que params coinciden. NotFoundException si recordset vacío. |
| **Backend — Zod** | Validación de cada campo: maxLength, required, defaults | Probar `CreateUrbanizacionSchema.parse()` con datos válidos e inválidos. Verificar defaults de `nestado`, `operador`, `estacion`. |
| **Frontend — Actions** | URL, method, body, Cookie header correctos | Mock `global.fetch` y `cookies()`. Verificar `authFetch` llamada con endpoint y payload correctos. Assert success/error envelopes. |
| **Frontend — Modal** | Render create/edit, carga combos, submit, confirm | Test con `@testing-library/react`. Mock server actions. Verificar campos visibles, botón "Registrar"/"Actualizar", llamada a action en submit. |

## Migration / Rollout

No requiere migración de base de datos. Los stored procedures `@busc=16`, `@busc=21`, `@busc=22` ya existen en `[Rentas].[sp_Mant_Vias]`.

Rollback plan:
1. Revertir cambios en controller, service, DTOs y types del backend
2. Revertir cambios en actions del frontend
3. Eliminar `urbanizacion-crud-modal.tsx`
4. Revertir wiring en `detalle-urbanizacion-modal.tsx`
5. Ejecutar tests para verificar estado pre-cambio

## Open Questions

- [ ] Confirmar nombres exactos de columnas que retorna `@busc=21` para mapear correctamente `SpUrbanizacionDetail`
- [ ] Confirmar si `@busc=22` retorna algún mensaje de error específico que debamos propagar o si el SP lanza excepción SQL
