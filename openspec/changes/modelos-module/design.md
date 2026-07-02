# Design: Modelos Module

## Technical Approach

New `VehiculoModule` in `backend/src/vehiculo/` housing `ModelosController` + `ModelosService`, registered in `AppModule` following `SeguridadModule` pattern. Frontend at `/dashboard/modelos` with server actions matching `usuarios.ts` pattern exactly.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module structure | `VehiculoModule` with inline `ModelosController/Service` | Single module for vehiculo domain; no other sub-modules exist yet. Matches `SeguridadModule` pattern. |
| Nesting vs flat | `src/vehiculo/modelos/` (flat) | Mirror `seguridad/usuarios/` hierarchy. Enables future `src/vehiculo/marcas/` etc. |
| Pagination | PHP-correct `start=0` for page 1 | **CRITICAL**: PHP modelos legacy uses `page>1 ? (page-1)*limit+1 : 0`, NOT the usuarios formula `(page-1)*pageSize+1`. This must match exactly. |
| Catalog caching | Client-side on mount, not server | Same as usuarios — fetch marcas/categorias once when modal opens, not per-request. |
| Response envelope | `PaginatedResponse<ModeloRow>` | Reuse existing `PaginatedResponse<T>` interface. |
| Zod validation | Same pattern as `SearchUsuarioSchema` | Validate at controller boundary via `.parse()`, Zod supplies `.default()` for page/pageSize. |

## Data Flow

```
Search:
  Client → searchModelosAction(filters, page, limit)
    → POST /vehiculo/modelos/search { rdEstado, criterio, page, pageSize }
    → Controller validates via SearchModeloSchema.parse()
    → Service calls:
        1. sp_vehiculo_modelo_contar(@tipo=rdEstado, @criterio) → count
        2. sp_vehiculo_modelo_listar(@tipo, @criterio, @inicio, @fin) → rows
    → Map recordset[0..6] → ModeloRow { codmodelo, marca, nombre, estado, categoria, id }
    → Wrap { data, total, page, pageSize, totalPages }

Detail:
  Client → fetchModeloDetailAction(id)
    → GET /vehiculo/modelos/:id
    → Service: sp_vehiculo_modelo_buscar(@tipo=1, @datos=id)
    → Map single row → ModeloDetalle

Catalogs:
  GET /vehiculo/modelos/catalogos/marcas    → sp_vehiculo_modelo_buscar(@tipo=3)
  GET /vehiculo/modelos/catalogos/categorias → sp_vehiculo_modelo_buscar(@tipo=2)

Save (Create/Update):
  Client → saveModeloAction({ id, nombre, id_categoria, id_marca, estado })
    → POST /vehiculo/modelos/save
    → Service: sp_vehiculo_modelo_grabar(@mquery=1|2, @xnombre, @xid_categoria, @xid_marca, @xestado)

Delete:
  Client → eliminarModeloAction(id)
    → POST /vehiculo/modelos/eliminar
    → Service: sp_vehiculo_modelo_grabar(@mquery=3, @xid_modelo=id)
```

## SP Parameter Mapping

| NestJS param | SP param | Notes |
|---|---|---|
| `rdEstado` | `@tipo` | In search list & count |
| `criterio` | `@criterio` | Free-text filter |
| `page`, `pageSize` | `@inicio`, `@fin` | Transformed via PHP pagination calc |
| `id` (detail) | `@datos` | `buscar` tipo=1 |
| `nombre` | `@xnombre` | Save |
| `id_categoria` | `@xid_categoria` | Save |
| `id_marca` | `@xid_marca` | Save |
| `estado` | `@xestado` | Save (0/1) |
| `id` (delete) | `@xid_modelo` | Delete (mquery=3) |

## SP Result Mapping (0-indexed columns)

```
SP recordset row → ModeloRow {
  codmodelo: row[0],   // string
  marca:     row[2],   // string (brand name from JOIN)
  nombre:    row[3],   // string (model name)
  estado:    String(row[4]) === '1' ? 'ACTIVO' : 'INACTIVO',
  categoria: row[5],   // string (category from JOIN)
  id:        row[6],   // string (PK)
}
```

Column [1] is unused in the SP result — mapped types may alias it or skip.

## File Changes

### Backend (7 files)

| File | Purpose |
|------|---------|
| `backend/src/vehiculo/vehiculo.module.ts` | Module declaration, imports `AuthModule`, registers `ModelosController` + `ModelosService` |
| `backend/src/vehiculo/modelos/modelos.controller.ts` | 6 endpoints: `POST search`, `GET :id`, `GET catalogos/marcas`, `GET catalogos/categorias`, `POST save`, `POST eliminar` |
| `backend/src/vehiculo/modelos/modelos.service.ts` | 5 methods: `search`, `getDetail`, `getMarcas`, `getCategorias`, `save`, `eliminar` |
| `backend/src/vehiculo/modelos/dto/modelos.types.ts` | `SpModeloRow`, `ModeloRow`, `ModeloDetalle`, `CatalogoOption`, `PaginatedResponse<T>` (re-exported) |
| `backend/src/vehiculo/modelos/dto/search-modelo.dto.ts` | Zod schema: `rdEstado`, `criterio`, `page`(default 1), `pageSize`(default 15) |
| `backend/src/vehiculo/modelos/dto/save-modelo.dto.ts` | Zod schema: `id` (optional), `nombre`, `id_categoria`, `id_marca`, `estado` |
| `backend/src/vehiculo/modelos/modelos.controller.spec.ts` | Unit tests (see Testing Strategy) |

### Frontend (4 files)

| File | Purpose |
|------|---------|
| `frontend/src/actions/modelos.ts` | Server actions: `searchModelosAction`, `fetchModeloDetailAction`, `fetchMarcasAction`, `fetchCategoriasAction`, `saveModeloAction`, `eliminarModeloAction` |
| `frontend/src/app/dashboard/modelos/page.tsx` | List page: search form, grid, pagination, 4 visual states (loading/empty/error+retry/populated), delete confirmation |
| `frontend/src/app/dashboard/modelos/modelo-edit-modal.tsx` | Create/edit modal: loads catalogs on mount, form validation, save/close |
| `frontend/src/app/dashboard/modelos/modelos.test.tsx` | Component tests: renders filters, search triggers API, grid, pagination, 4 states |

### Modified

| File | Change |
|------|--------|
| `backend/src/app.module.ts` | Add `VehiculoModule` to `imports` array (after `SeguridadModule`) |

## Interfaces / Contracts

```typescript
// modelos.types.ts
interface SpModeloRow {
  codmodelo: string;    // [0]
  marca: string;        // [2]
  nombre: string;       // [3]
  estado: string;       // [4]
  categoria: string;    // [5]
  id: string;           // [6]
}

interface ModeloRow {
  codmodelo: string;
  marca: string;
  nombre: string;
  estado: string;       // "ACTIVO" | "INACTIVO"
  categoria: string;
  id: string;
}

interface ModeloDetalle {
  id: string;
  codmodelo: string;
  nombre: string;
  id_marca: string;
  marca: string;
  id_categoria: string;
  categoria: string;
  estado: string;
}

interface CatalogoOption {
  id: string;
  nombre: string;
}

// search-modelo.dto.ts
const SearchModeloSchema = z.object({
  rdEstado: z.string().optional(),
  criterio: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

// save-modelo.dto.ts
const SaveModeloSchema = z.object({
  id: z.string().optional(),       // empty = create, non-empty = update
  nombre: z.string().min(1),
  id_categoria: z.string().min(1),
  id_marca: z.string().min(1),
  estado: z.string(),              // "0" | "1"
});
```

## Testing Strategy

### Backend: `modelos.controller.spec.ts`

- Mock `ModelosService` (jest manual mock)
- Override `JwtAuthGuard` with `{ canActivate: () => true }`
- **Search**: verify Zod parsing defaults, service delegation
- **Detail**: verify parameter passthrough, null → 404
- **Catalogs**: verify return shape `{ data: CatalogoOption[] }`
- **Save**: verify DTO passthrough
- **Delete**: verify ID passthrough

### Frontend: `modelos.test.tsx`

- Mock `@/actions/modelos` module with `vi.mock()`
- **Search form**: renders text input (criterio) + estado select + Buscar button
- **Search trigger**: button click and Enter key call `searchModelosAction`
- **Grid**: 6 column headers (Código, Marca, Modelo, Categoría, Estado, Acciones) with data rows
- **Pagination**: Previous/Next disabled at boundaries, page click fires search
- **4 visual states**: loading (skeleton/spinner), empty (`No se encontraron`), error+retry (`Reintentar`), populated grid with edit/delete buttons
