# Proposal: Módulo de Mantenimiento UIT

## Intent

Crear el módulo de **Mantenimiento de Tablas → UIT** para administrar los valores de la Unidad Impositiva Tributaria (UIT) por año, migrando el mantenimiento de la tabla `UIT` al stack NestJS + Next.js. El backend expone un CRUD sobre el stored procedure `[Rentas].[sp_uit]` y el frontend consume esos endpoints desde la sección de mantenimiento de tablas.

## Scope

### In Scope
- Backend CRUD sobre `[Rentas].[sp_uit]` (busc 1, 2, 5, 6, 7) vía `MantenimientoController` + `MantenimientoService`
- DTOs de validación con Zod (`crear-uit`, `editar-uit`, `consultar-uit`, `uit-response`)
- Frontend: página de listado/búsqueda por año + alta/edición/desactivación (en `dashboard/mantenimiento/uit` y `dashboard/mantenimiento-tablas/mantenimiento-uit`)
- Registro del `MantenimientoModule` en `AppModule` con `JwtAuthGuard`
- Unit tests de service y controller (mock de `DatabaseService` / `MantenimientoService`)

### Out of Scope
- Otras tablas de mantenimiento (vías, modelos, valores vehiculares, etc.)
- Catálogos externos (no se consultan tablas maestras adicionales)
- Migración/scripts de BD (el SP ya existe en la base)

## Capabilities

### New Capabilities
- `uit-crud`: administración de valores UIT por año (listar años, buscar por año, crear, editar y desactivar) sobre `[Rentas].[sp_uit]`.

### Modified Capabilities
None — es un módulo nuevo sin spec previo.

## Approach

Seguir el patrón de los módulos de mantenimiento existentes (p. ej. `MantenimientoViasModule` / `modelos`):
1. **Backend**: `mantenimiento.service.ts` invoca `DatabaseService.executeProcedure('[Rentas].[sp_uit]', {...})` con el parámetro `busc` que define la operación. `mantenimiento.controller.ts` bajo `JwtAuthGuard`, ruta base `mantenimiento/uit`. Validación en el borde del controller con esquemas Zod.
2. **Frontend**: página de mantenimiento UIT con estados loading/empty/error+retry/populated, modal de alta/edición y confirmación de desactivación, consumiendo los endpoints del backend.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/mantenimiento/mantenimiento.module.ts` | New | Declaración del módulo, importa `AuthModule` |
| `backend/src/mantenimiento/mantenimiento.controller.ts` | New | 5 endpoints bajo `JwtAuthGuard` |
| `backend/src/mantenimiento/mantenimiento.service.ts` | New | 5 métodos sobre `[Rentas].[sp_uit]` |
| `backend/src/mantenimiento/mantenimiento.service.spec.ts` | New | Unit tests del service |
| `backend/src/mantenimiento/mantenimiento.controller.spec.ts` | New | Unit tests del controller |
| `backend/src/mantenimiento/dto/crear-uit.dto.ts` | New | Zod schema de alta |
| `backend/src/mantenimiento/dto/editar-uit.dto.ts` | New | Zod schema de edición |
| `backend/src/mantenimiento/dto/consultar-uit.dto.ts` | New | Zod schema de consulta por año |
| `backend/src/mantenimiento/dto/uit-response.dto.ts` | New | Tipo de respuesta `UitResponse` |
| `backend/src/app.module.ts` | Modified | Agrega `MantenimientoModule` a `imports` |
| `frontend/src/app/dashboard/mantenimiento/uit/` | New | Página + components del mantenimiento UIT |
| `frontend/src/app/dashboard/mantenimiento-tablas/mantenimiento-uit/` | New | Página + components del mantenimiento UIT (ruta de tablas) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desajuste de tipos PHP → Node en los parámetros del SP | Low | Tests del service con los `busc` y parámetros exactos |
| `estado` no enviado en alta (`busc=5`) | Low | Test `crear` verifica inclusión de `estado` |
| Año duplicado en alta | Low | `crear` valida existencia (`busc=2`) y lanza `ConflictException` (409) |
| Desactivación irreversible desde API | Medium | `eliminar` solo marca `estado=0` (soft delete, `busc=7`) |

## Rollback Plan

1. Quitar `MantenimientoModule` de `AppModule.imports`.
2. Eliminar `backend/src/mantenimiento/`.
3. Eliminar `frontend/src/app/dashboard/mantenimiento/uit/` y `frontend/src/app/dashboard/mantenimiento-tablas/mantenimiento-uit/`.
4. Sin cambios de BD — el SP ya existe y no se altera.

## Dependencies

- `DatabaseService` (ya `@Global` en `AppModule`)
- `[Rentas].[sp_uit]` (ya existe en la BD)
- `AuthModule` + `JwtAuthGuard` (ya registrados)

## Success Criteria

- [x] `obtenerAnnos` llama `sp_uit` con `busc=1` y retorna `{ annos: number[] }`
- [x] `buscarPorAnno` llama `busc=2` y retorna `{ data: UitResponse[] }`; si no hay filas lanza 404
- [x] `crear` valida año existente (`busc=2`) y lanza 409 si existe; de lo contrario `busc=5` con `estado` e retorna `{ message, anno }`
- [x] `editar` valida existencia (`busc=2`) y lanza 404 si no existe; de lo contrario `busc=6`
- [x] `eliminar` ejecuta `busc=7` con `estado='0'` (desactivación lógica)
- [x] Frontend maneja estados loading/empty/error+retry/populated
- [x] Tests del backend pasan (`npm --prefix backend test -- mantenimiento`)
