# Design: Predios por Uso — Submenú en Reportes Gerenciales

## Technical Approach

Replicar el patrón exacto de `accesos-submenu`: backend NestJS con controller + service + Zod DTOs invocando SP `[Rentas].[Rpt_Rentas_General]` (`@BUSC=1`), y frontend página monolítica `"use client"` con filtros, tabla paginada, y server action como proxy auth. Crear `ReportesModule` siguiendo la misma estructura de `SeguridadModule`.

## Architecture Decisions

### Decision: Module naming

Se creó `reportes-gerenciales/` como directorio principal del módulo, con `predios-por-uso/` como submódulo contenedor de los archivos del reporte específico.

### Decision: Monolithic page.tsx vs. split components

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Monolithic "use client" con render helpers inline | + Sigue patrón accesos-submenu exacto; + Sin indirección innecesaria; — Archivo ~300+ líneas | ✅ **Monolithic** — CRUD list simple, sin estado complejo compartido |
| Separar SearchForm, DataTable, Pagination | — Overhead de props/imports; — Rompe consistencia | ❌ Rechazado |

### Decision: No cascading selects needed

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Sin AbortController ni catálogos previos | + Más simple que accesos-submenu; + Sin race condition que manejar; — Filtros son entrada directa del usuario (codigo text, anno select, uso text) | ✅ **Simple** — Este reporte no tiene cascada Menú→Módulo |

## Data Flow

```
[Page mount]
  └→ searchPrediosAction({}, 1, 15) → POST /reportes-gerenciales/predios-uso/search
       → PrediosUsoController.search() → Zod parse
       → PrediosUsoService.search()
         → exec(@BUSC=1, @CODIGO, @anno, @uso) → SP result rows
         → map → PredioUsoRow[]
         → return { data, total, page, pageSize, totalPages }

[Search submit / Filter change]
  └→ searchPrediosAction(filters, 1, pageSize) → ... → setData/setTotal/setTotalPages
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/reportes-gerenciales/predios-por-uso/dto/predios-uso.types.ts` | Create | `SpPredioUsoRow`, `PredioUsoRow`, `PaginatedResponse<T>` |
| `backend/src/reportes-gerenciales/predios-por-uso/dto/search-predio-uso.dto.ts` | Create | Zod schema: `codigo`, `anno`, `uso` opcionales + `page`/`pageSize` |
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.service.ts` | Create | `search()` ejecuta SP @BUSC=1, mapea columnas SP a domain |
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.controller.ts` | Create | `POST /search` con JwtAuthGuard + Zod parse |
| `backend/src/reportes-gerenciales/reportes-gerenciales.module.ts` | Create | Module agrupador (registra controller + service) |
| `backend/src/app.module.ts` | Modify | Importar `ReportesModule` |
| `frontend/src/actions/reportes-gerenciales/predios-uso.ts` | Create | `searchPrediosAction` — patrón authFetch |
| `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/page.tsx` | Create | Página "use client": 3 filtros, tabla 7 columnas, paginación, estados loading/empty/error |

## Interfaces / Contracts

```typescript
// search-predio-uso.dto.ts
export const SearchPredioUsoSchema = z.object({
  codigo: z.string().optional(),
  anno: z.coerce.number().int().optional(),
  uso: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});
export type SearchPredioUsoDto = z.infer<typeof SearchPredioUsoSchema>;

// predios-uso.types.ts
export interface SpPredioUsoRow {
  tipo: string;       // 'U'
  uso: string;        // 'COMERCIO'
  predios: number;    // 123
  condicion: string;  // 'UNICOS 100%'
  count: number;      // 123
  anno: number;       // 2026
  id_uso: string;     // '001'
  ROW: number;        // Pagination row number
}

export interface PredioUsoRow {
  tipo: string;
  uso: string;
  predios: number;
  condicion: string;
  count: number;
  anno: number;
  id_uso: string;
}

// Server action response
type ActionResponse<T> =
  | { success: true; data: T[]; total: number; page: number; pageSize: number; totalPages: number }
  | { success: false; error: string };
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend Unit | Service.search() mapea params SP correctamente (@BUSC=1, @CODIGO, @anno, @uso) | Mock `DatabaseService.executeProcedure`, verificar params y columnas mapeadas |
| Backend Unit | Pagination math (inicio/final) | Test `calculatePaginationParams` (pure function) |
| Backend Unit | Valores null/undefined en filtros se pasan como string vacío | Mock SP, verificar default values |
| Frontend Component | 3 filtros renderizan (codigo, anno, uso) | Vitest + @testing-library/react con mock de server action |
| Frontend Component | Estados loading/empty/error | Mocks de server action retornando cada estado |
| Frontend Component | Tabla 7 columnas con datos mock | Render con datos, verificar columnas y formato |

## Migration / Rollout

No migration required. El submenú ya está registrado en BD. Despliegue: `git revert` limpio si hay issues.

## Open Questions

- [ ] Verificar que `[Rentas].[Rpt_Rentas_General]` con `@BUSC=1` existe en BD destino y las columnas tipo, uso, predios, condicion, count, anno, id_uso coinciden exactamente con lo especificado
- [ ] Confirmar si `@CODIGO`, `@anno`, `@uso` son parámetros opcionales (SP tolera NULL/vacío) o requieren valores por defecto
- [ ] Determinar si los años disponibles para el filtro `anno` vienen del SP o se generan programáticamente (ej. últimos 5 años desde el actual)
