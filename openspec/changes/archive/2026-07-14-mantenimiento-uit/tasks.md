# Tasks: Módulo de Mantenimiento UIT

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No (implementación ya realizada)
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: DTOs, service, controller, tests, registro en `AppModule` | PR 1 | Independiente — envía solo, sin dependencia de UI |
| 2 | Frontend: páginas de mantenimiento UIT + components | PR 2 | Depende de los endpoints del PR 1 |

## Phase 1: Foundation — DTOs

- [x] 1.1 Crear `dto/uit-response.dto.ts` — `UitResponse` interface
- [x] 1.2 Crear `dto/consultar-uit.dto.ts` — `ConsultarUitSchema` (anno)
- [x] 1.3 Crear `dto/crear-uit.dto.ts` — `CrearUitSchema` (anno, valor_uit, imp_*, costo_*, estado default '1')
- [x] 1.4 Crear `dto/editar-uit.dto.ts` — `EditarUitSchema` (sin defaults en costos)

## Phase 2: Backend Core — Service & Controller

- [x] 2.1 Crear `mantenimiento.service.ts` — 5 métodos (`obtenerAnnos` busc=1, `buscarPorAnno` busc=2 + 404, `crear` busc=2/5 + 409, `editar` busc=2/6 + 404, `eliminar` busc=7 estado=0)
- [x] 2.2 Crear `mantenimiento.controller.ts` — 5 endpoints (`GET annos`, `GET ?anno`, `POST`, `PUT`, `DELETE :anno`) bajo `JwtAuthGuard`, validación Zod con `safeParse`
- [x] 2.3 Crear `mantenimiento.module.ts` — importa `AuthModule`, declara controller + service
- [x] 2.4 Registrar `MantenimientoModule` en `backend/src/app.module.ts`

## Phase 3: Frontend — Pages

- [x] 3.1 Crear `frontend/src/app/dashboard/mantenimiento/uit/page.tsx` + `components/` — listado, búsqueda por año, alta/edición, desactivación
- [x] 3.2 Crear `frontend/src/app/dashboard/mantenimiento-tablas/mantenimiento-uit/page.tsx` + `components/` — ruta dentro de mantenimiento de tablas

## Phase 4: Testing

- [x] 4.1 Escribir `mantenimiento.service.spec.ts` — mock `DatabaseService`, cubre los 5 métodos y los `busc`/parámetros
- [x] 4.2 Escribir `mantenimiento.controller.spec.ts` — mock `MantenimientoService`, cubre delegación y propagación de excepciones

## Phase 5: Verification & Archive

- [x] 5.1 `npm --prefix backend test -- mantenimiento` → 20 passed
- [ ] 5.2 Archivar el cambio en `openspec/changes/archive`
- [ ] 5.3 Commit en rama `mantenimiento-uit`
