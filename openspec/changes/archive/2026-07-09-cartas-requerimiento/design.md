# Design: Cartas de Requerimiento

## Technical Approach

New NestJS `FiscalizacionTributariaModule` + "use client" Next.js page, following the `seguridad/perfiles` pattern exactly. The module doesn't exist yet — this creates the full stack (backed by existing SP `SP_FISCA_CONTRIBUYENTE`) with search filters, paginated table, and a "Generar" button stub.

## Architecture Decisions

### Decision: Module structure — separate module vs. flat module

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add to `SeguridadModule` | No new imports in app.module, but semantically wrong (different domain) | ❌ Rejected |
| New `FiscalizacionTributariaModule` | One-line app.module import, clear domain boundary, follows NestJS conventions | ✅ **Chosen** |

### Decision: Filter UX — single select vs. radio buttons vs. inputs for both

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Two inputs (codigo + nombre) like perfiles | Simple but allows both filters at once — SP expects only one | ❌ Rejected |
| Radio buttons | Clear UX but heavier markup, harder to extend with more filter types | ❌ Rejected |
| Single `<select>` + text input | Clean, extendable (add filter types via select options), only one active filter | ✅ **Chosen** |

### Decision: Pagination helper

Reuse `calculatePaginationParams` pattern from perfiles service (`inicio = (page-1)*10 + 1`, `final = page*10`). Extracted as a pure function if the module grows; inline is acceptable for a single search endpoint.

### Decision: No page cache initially

Per proposal — perfiles doesn't cache either. Add after benchmarking if SP latency is problematic.

## Data Flow

```
[Page mount]
     │
     ▼
 searchCartasRequerimientoAction(filters, 1, 10)  ← Server Action (authFetch)
     │
     ▼
 POST /api/fiscalizacion-tributaria/cartas-requerimiento/search
     │
     ▼
 CartasRequerimientoController.search(dto)
     │
     ├─ SP_FISCA_CONTRIBUYENTE (@mquery='11')  → total count
     │
     └─ SP_FISCA_CONTRIBUYENTE (@mquery='10')  → paginated rows
          │
          ▼
   { data, total, page, pageSize, totalPages }
          │
          ▼
   Page state → render table + pagination
```

**Filter logic**: If `searchType === 'codigo'`, SP gets `@codigo=searchValue` and `@nomCompletoContrib=''`. If `searchType === 'nombre'`, the reverse.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/fiscalizacion-tributaria/fiscalizacion-tributaria.module.ts` | Create | NestJS module importing AuthModule, registering controller + service |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.controller.ts` | Create | `@Controller('fiscalizacion-tributaria/cartas-requerimiento')` with `@UseGuards(JwtAuthGuard)` and `@Post('search')` |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.service.ts` | Create | `search()` method calling SP_FISCA_CONTRIBUYENTE twice (count + data), mapping to `CartasRequerimientoRow` |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/cartas-requerimiento.types.ts` | Create | `CartasRequerimientoRow`, `PaginatedResponse<T>` interfaces |
| `backend/src/fiscalizacion-tributaria/cartas-requerimiento/dto/search-cartas-requerimiento.dto.ts` | Create | Zod schema: `searchType`, `searchValue`, `page`, `pageSize` |
| `frontend/src/actions/fiscalizacion-tributaria/cartas-requerimiento.ts` | Create | `searchCartasRequerimientoAction` — server action via authFetch |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/cartas-requerimiento/page.tsx` | Create | "use client" page with search form, table, pagination, "Generar" button stub |
| `backend/src/app.module.ts` | Modify | Add `FiscalizacionTributariaModule` to imports array |

## Interfaces / Contracts

### Backend

```typescript
// search-cartas-requerimiento.dto.ts
export const SearchCartasRequerimientoSchema = z.object({
  searchType: z.enum(['codigo', 'nombre']),
  searchValue: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type SearchCartasRequerimientoDto = z.infer<typeof SearchCartasRequerimientoSchema>;

// cartas-requerimiento.types.ts
export interface CartasRequerimientoRow {
  codigo: string;
  contribuyente: string;
  direccionFiscal: string;
  row: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### SP Parameters

| SP Param | Source | Value |
|----------|--------|-------|
| `@mquery` | Literal | `'10'` (data) or `'11'` (count) |
| `@codigo` | DTO | `searchValue` if `searchType === 'codigo'`, else `''` |
| `@nomCompletoContrib` | DTO | `searchValue` if `searchType === 'nombre'`, else `''` |
| `@inicio` | Calculated | `(page - 1) * pageSize + 1` |
| `@final` | Calculated | `page * pageSize` |

### Frontend Server Action Return

```typescript
{ success: true, data: CartasRequerimientoRow[], total: number, page: number, pageSize: number, totalPages: number }
| { success: false, error: string }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `CartasRequerimientoService.search()` | Mock `DatabaseService.executeProcedure`, verify SP params and row mapping |
| Integration | Module wiring | Verify module compiles, controller is registered, guards apply |
| E2E | Page load, search, pagination | Follow existing perfiles E2E pattern — verify table renders, filter works, pagination navigates |

Manual verification: hit the API with curl/Postman, confirm SP returns expected data for both `@mquery` values.

## Migration / Rollout

No migration required. SP `SP_FISCA_CONTRIBUYENTE` already exists. Rollback: delete the module directory, action directory, page directory, revert app.module.ts import. Zero database changes.

## Open Questions

- None. All decisions documented, all patterns verified against the existing `seguridad/perfiles` implementation.
