# Design: Módulo de Mantenimiento UIT

## Technical Approach

Nuevo `MantenimientoModule` en `backend/src/mantenimiento/` con `MantenimientoController` + `MantenimientoService`, registrado en `AppModule` e importando `AuthModule` para el `JwtAuthGuard`. El frontend vive en la sección de mantenimiento de tablas (`dashboard/mantenimiento-tablas/mantenimiento-uit` y `dashboard/mantenimiento/uit`) y consume los endpoints vía server actions/API client existente.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Estructura del módulo | `src/mantenimiento/` (flat) con controller/service/dto | Espeja `seguridad/usuarios/` y `mantenimiento-vias`; habilita futuros sub-módulos de tablas. |
| Operaciones sobre SP | Parámetro `busc` (1,2,5,6,7) | Reutiliza `[Rentas].[sp_uit]` existente; mismo contrato que el legado PHP. |
| Validación | Zod en el borde del controller (`safeParse`) | Consistente con `crear-uit`/`editar-uit`; errores → `BadRequestException` con mensajes unidos. |
| Búsqueda por año | `@Query('anno', ParseIntPipe)` | Año como entero en query string; `ParseIntPipe` valida formato. |
| Desactivación | `eliminar` → `busc=7` con `estado='0'` | Soft delete; no se borra físicamente. |
| Respuesta de lista | `{ data: UitResponse[] }` | Envelope explícito; el service lanza `NotFoundException` si no hay filas. |

## Data Flow

```
Listar años:
  GET /mantenimiento/uit/annos
    → Service.obtenerAnnos → sp_uit(busc=1)
    → Mapea recordset.anno → { annos: number[] }

Buscar por año:
  GET /mantenimiento/uit?anno=2026
    → Controller (ParseIntPipe) → Service.buscarPorAnno(anno)
    → sp_uit(busc=2, anno)
    → { data: UitResponse[] }  (404 si recordset vacío)

Crear:
  POST /mantenimiento/uit  { anno, valor_uit, imp_minimo, imp_maximo, costo_emis, costo_adic, estado? }
    → Controller valida CrearUitSchema (safeParse)
    → Service.crear: sp_uit(busc=2, anno) para existencia → si existe 409
    → sp_uit(busc=5, anno, tipo='02.01', valor_uit, imp_min, imp_max, costo_emision, costo_adicional, estado)
    → { message, anno }

Editar:
  PUT /mantenimiento/uit  { anno, valor_uit, imp_minimo, imp_maximo, costo_emis, costo_adic, estado? }
    → Controller valida EditarUitSchema (safeParse)
    → Service.editar: sp_uit(busc=2, anno) → si no existe 404
    → sp_uit(busc=6, anno, tipo=actual, valor_uit, imp_min, imp_max, costo_emision, costo_adicional, estado)
    → { message, anno }

Desactivar:
  DELETE /mantenimiento/uit/:anno
    → Service.eliminar(anno) → sp_uit(busc=7, anno, estado='0')
    → { message }
```

## SP Parameter Mapping

| NestJS op | `busc` | Parámetros SP | Notas |
|---|---|---|---|
| obtenerAnnos | 1 | — | Lista años disponibles |
| buscarPorAnno | 2 | `anno` (string) | Si vacío → 404 |
| crear (check) | 2 | `anno` | Detecta duplicado → 409 |
| crear | 5 | `anno`, `tipo='02.01'`, `valor_uit`, `imp_min`, `imp_max`, `costo_emision`, `costo_adicional`, `estado` | Alta |
| editar (check) | 2 | `anno` | Si vacío → 404; conserva `tipo` actual |
| editar | 6 | `anno`, `tipo`, `valor_uit`, `imp_min`, `imp_max`, `costo_emision`, `costo_adicional`, `estado` | Actualización |
| eliminar | 7 | `anno`, `estado='0'` | Soft delete |

## File Changes

### Backend (11 archivos)

| File | Purpose |
|------|---------|
| `backend/src/mantenimiento/mantenimiento.module.ts` | Declara el módulo, importa `AuthModule` |
| `backend/src/mantenimiento/mantenimiento.controller.ts` | 5 endpoints bajo `JwtAuthGuard`, ruta `mantenimiento/uit` |
| `backend/src/mantenimiento/mantenimiento.service.ts` | 5 métodos sobre `[Rentas].[sp_uit]` |
| `backend/src/mantenimiento/mantenimiento.service.spec.ts` | Unit tests del service (mock `DatabaseService`) |
| `backend/src/mantenimiento/mantenimiento.controller.spec.ts` | Unit tests del controller (mock `MantenimientoService`) |
| `backend/src/mantenimiento/dto/crear-uit.dto.ts` | `CrearUitSchema` (Zod) |
| `backend/src/mantenimiento/dto/editar-uit.dto.ts` | `EditarUitSchema` (Zod) |
| `backend/src/mantenimiento/dto/consultar-uit.dto.ts` | `ConsultarUitSchema` (Zod) |
| `backend/src/mantenimiento/dto/uit-response.dto.ts` | `UitResponse` interface |
| `backend/src/app.module.ts` | Agrega `MantenimientoModule` a `imports` |

### Frontend (2 rutas)

| File | Purpose |
|------|---------|
| `frontend/src/app/dashboard/mantenimiento/uit/page.tsx` + `components/` | Página de mantenimiento UIT |
| `frontend/src/app/dashboard/mantenimiento-tablas/mantenimiento-uit/page.tsx` + `components/` | Página de mantenimiento UIT (ruta de tablas) |

## Interfaces / Contracts

```typescript
// uit-response.dto.ts
interface UitResponse {
  anno: number;
  tipo: string;
  valor_uit: number;
  imp_minimo: number | null;
  imp_maximo: number | null;
  costo_emis: number;
  costo_adic: number;
  estado: string;
  row: number;
}

// crear-uit.dto.ts
const CrearUitSchema = z.object({
  anno: z.coerce.number().int().min(1992),
  valor_uit: z.coerce.number().positive().max(999999.99),
  imp_minimo: nullableCoerceNum,
  imp_maximo: nullableCoerceNum,
  costo_emis: coerceNum.default(0),
  costo_adic: coerceNum.default(0),
  estado: z.string().default('1'),
});

// editar-uit.dto.ts
const EditarUitSchema = z.object({
  anno: z.coerce.number().int().min(1992),
  valor_uit: z.coerce.number().positive().max(999999.99),
  imp_minimo: nullableCoerceNum,
  imp_maximo: nullableCoerceNum,
  costo_emis: coerceNum,
  costo_adic: coerceNum,
  estado: z.string().default('1'),
});

// consultar-uit.dto.ts
const ConsultarUitSchema = z.object({
  anno: z.coerce.number().int().min(1992),
});
```

## Testing Strategy

### Backend: `mantenimiento.service.spec.ts`
- Mock `DatabaseService.executeProcedure` (`jest.fn`)
- `obtenerAnnos`: verifica `busc=1` y mapeo de `anno`
- `buscarPorAnno`: `busc=2` + retorno de `data`; 404 si recordset vacío
- `crear`: 409 si año existe (`busc=2` con filas); alta con `busc=5` incluyendo `estado` si es año nuevo
- `editar`: `busc=6` con `tipo` actual; 404 si no existe
- `eliminar`: `busc=7` con `estado='0'`

### Backend: `mantenimiento.controller.spec.ts`
- Mock `MantenimientoService`, `TestingModule` con controller + provider
- GET `/annos`, GET `?anno`, POST, PUT, DELETE `:anno` delegan al service con los argumentos correctos
- Propagación de `ConflictException` / `NotFoundException` desde el service

### Frontend
- Página con estados loading / empty / error+retry / populated
- Modal de alta/edición y confirmación de desactivación
