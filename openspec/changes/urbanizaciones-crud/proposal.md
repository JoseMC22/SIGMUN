# Propuesta: CRUD de Urbanizaciones

## Intención

El modal de Detalle de Urbanización actual solo permite consulta (búsqueda, filtros, paginación). Los botones "Nueva Urbanización" y "Editar" por fila existen en la UI pero no tienen funcionalidad. Este cambio implementa el CRUD completo (create, read, update, toggle activo/inactivo) para urbanizaciones, siguiendo el patrón existente del CRUD de Vías.

## Alcance

### Incluye
- Backend: endpoint `POST /mantenimiento-vias/urbanizaciones` (SP @busc=16)
- Backend: endpoint `GET /mantenimiento-vias/urbanizaciones/:id_urba` (SP @busc=21)
- Backend: endpoint `PUT /mantenimiento-vias/urbanizaciones/:id_urba` (SP @busc=22)
- Backend: DTOs `CreateUrbanizacionDto` / `UpdateUrbanizacionDto` con validación Zod
- Backend: tipos para respuesta de SP buscas 16, 21, 22
- Frontend: nuevo modal `urbanizacion-crud-modal.tsx` (create/edit)
- Frontend: actions `createUrbanizacionAction`, `getUrbanizacionAction`, `updateUrbanizacionAction`
- Frontend: wiring de botón "Nueva Urbanización" en `detalle-urbanizacion-modal.tsx`
- Frontend: wiring de botón "Editar" por fila en `detalle-urbanizacion-modal.tsx`
- Frontend: refresco automático de la tabla al guardar
- Tests unitarios backend (Jest) y frontend (Vitest) — TDD estricto

### Excluye
- Eliminación física de registros — solo toggle de estado vía update
- Cambios en la página principal de Mantenimiento de Vías
- Cambios en el modal de CRUD de Vías existente
- Migraciones de base de datos (los SP ya existen)

## Capacidades

### Nuevas Capacidades
- `urbanizaciones-crud`: Creación, edición y toggle de estado de urbanizaciones vía modal con formulario y validación.

### Capacidades Modificadas
- `mantenimiento-vias`: Se agregan las operaciones CRUD de urbanización como extensión del módulo existente.

## Enfoque

Seguir el patrón exacto del CRUD de Vías (`via-crud-modal.tsx` → `urbanizacion-crud-modal.tsx`).

**Backend:** 3 nuevos métodos en `MantenimientoViasService` llamando al mismo SP `[Rentas].[sp_Mant_Vias]` con distintos valores de `@busc`. 3 nuevos endpoints en el controller. DTOs separados con Zod.

**Frontend:** Nuevo modal como Client Component con `useState`/`useEffect` para carga de combos (tipos de urbanización vía @busc=20). El formulario incluye: id_urba (read-only en edit, required en create), tipo (combo), nombre abreviado, nombre completo, estado (activo/inactivo). El botón "Nueva Urbanización" abre el modal en modo create; "Editar" lo abre en modo edit con datos precargados.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `backend/.../mantenimiento-vias.service.ts` | Modificado | +3 métodos: createUrbanizacion, getUrbanizacion, updateUrbanizacion |
| `backend/.../mantenimiento-vias.controller.ts` | Modificado | +3 endpoints POST/GET/PUT /urbanizaciones |
| `backend/.../dto/` | Nuevo | `create-urbanizacion.dto.ts`, `update-urbanizacion.dto.ts` |
| `backend/.../dto/mantenimiento-vias.types.ts` | Modificado | +tipos SP para buscas 16/21/22 |
| `frontend/.../urbanizacion-crud-modal.tsx` | Nuevo | Modal CRUD completo |
| `frontend/.../detalle-urbanizacion-modal.tsx` | Modificado | Wiring botones + refresco |
| `frontend/src/actions/mantenimiento-vias.ts` | Modificado | +3 server actions |
| `frontend/src/actions/mantenimiento-vias.test.ts` | Modificado | Tests para nuevas actions |
| `backend/.../*.spec.ts` | Modificado | Tests unitarios service + controller |

## Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| SP @busc=21/22 no existen o tienen parámetros distintos | Baja | Validar con DBA antes de codear; los SPs están referenciados del sistema legacy |
| Conflictos de ruteo con endpoints existentes (ej: `:cod_via` vs `:id_urba`) | Baja | Las rutas de urbanización son POST/PUT/GET explícitos bajo `/urbanizaciones/`, no interfieren con `:cod_via` |
| Nombres de columna del SP no coinciden con lo esperado | Media | Usar `Object.values()` como ya se hace en `getUrbanizacionesTable()` |

## Plan de Rollback

1. Revertir cambios en controller, service, DTOs y types del backend
2. Revertir cambios en actions del frontend
3. Eliminar `urbanizacion-crud-modal.tsx`
4. Revertir wiring en `detalle-urbanizacion-modal.tsx`
5. Correr tests para verificar estado pre-cambio

## Dependencias

- Los stored procedures @busc=16, @busc=21, @busc=22 deben existir en `[Rentas].[sp_Mant_Vias]` con los parámetros esperados.

## Criterios de Éxito

- [ ] POST /urbanizaciones crea registro y devuelve `{ success, message }`
- [ ] GET /urbanizaciones/:id_urba devuelve el registro completo para edición
- [ ] PUT /urbanizaciones/:id_urba actualiza campos y permite toggle de nestado
- [ ] Modal urb-crud-modal abre en modo create desde botón "Nueva Urbanización"
- [ ] Modal abre en modo edit con datos precargados desde botón "Editar"
- [ ] Al guardar, la tabla del modal padre se refresca automáticamente
- [ ] Validación Zod rechaza datos inválidos con 400
- [ ] Tests unitarios backend pasan
- [ ] Tests unitarios frontend pasan
