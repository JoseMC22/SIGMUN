# Design: Nuevo submenú "Accesos" en Seguridad

## Technical Approach

Replicar el patrón exacto de Perfiles: página monolítica `"use client"` con render helpers inline, backend NestJS controller + service con Zod DTO, Server Action como proxy auth, y SP `[Acceso].[SP_MAcceso]` con `@busc` = 5/6 para datos paginados y 8/9 para cascada Menú→Módulo. Sin split de componentes — la página es autosuficiente.

## Architecture Decisions

### Decision: Monolithic page.tsx vs. split components

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Monolithic "use client" con render\* helpers | + Sigue patrón Perfiles; + Sin indirección innecesaria; — Archivo ~400 líneas | ✅ **Monolithic** — La página es un CRUD list simple, no hay estado complejo compartido entre rutas |
| Separar SearchForm, Grid, Pagination en componentes | + Reutilización teórica; — Overhead de props/imports; — Rompe consistencia con Perfiles | ❌ Rechazado |

### Decision: Cascading select race condition

| Option | Tradeoff | Decision |
|--------|----------|----------|
| AbortController en useRef | + Cancelar request anterior al cambiar Menú; + Sin race condition; — Lógica extra mínima | ✅ **AbortController** — Misma defensa que en Usuarios/Perfiles, evita Módulo desactualizado |
| Ignorar (último request gana) | + Simple; — Bug si Menú cambia rápido | ❌ Rechazado |

### Decision: Server Action como proxy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| authFetch con cookie serializada | + Sigue patrón existente; + Cliente no maneja cookies; — Una capa extra de red | ✅ **Server Action** — Consistente con Perfiles, Usuarios, y el resto del módulo Seguridad |
| fetch directo desde el cliente | — Expone API URL; — Cookie handling manual en el browser | ❌ Rechazado |

## Data Flow

```
[Page mount]
  ├→ fetchMenusAction() → GET /seguridad/accesos/menus → @busc=8 → MenuOption[]
  └→ searchAccesosAction({},1,10) → POST /seguridad/accesos/search
       → AccesosController.search() → Zod parse
       → AccesosService.search()
         → exec(@busc=6) → total
         → exec(@busc=5, @inicio, @final) → rows
         → map → PaginatedResponse<AccesoRow>

[Menú onChange(id)]
  ├→ reset selectedModulo + moduloOptions
  └→ fetchModulosAction(id) → GET /seguridad/accesos/modulos?menuId=X → @busc=9

[Search submit]
  └→ searchAccesosAction(filters, 1, pageSize) → ... → setData/setTotal/setTotalPages
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/app/dashboard/seguridad/accesos/page.tsx` | Create | Página principal "use client": 5 filtros con cascada, grid 7 columnas, paginación, estados loading/empty/error |
| `frontend/src/app/dashboard/seguridad/accesos/acceso-edit-modal.tsx` | Create | Modal vacío con `isOpen`, `onClose`, `onSaved` — sin campos de formulario |
| `frontend/src/actions/accesos.ts` | Create | `searchAccesosAction`, `fetchMenusAction`, `fetchModulosAction` — patrón authFetch exacto |
| `backend/src/seguridad/accesos/accesos.controller.ts` | Create | `POST /search`, `GET /menus`, `GET /modulos` — con JwtAuthGuard |
| `backend/src/seguridad/accesos/accesos.service.ts` | Create | `search()` con busc=5/6, `getMenus()` con busc=8, `getModulos(menuId)` con busc=9 |
| `backend/src/seguridad/accesos/dto/search-acceso.dto.ts` | Create | Zod schema: `id_acceso`, `nombre`, `orden`, `menu`, `pantalla` opcionales + `page`/`pageSize` |
| `backend/src/seguridad/accesos/dto/accesos.types.ts` | Create | `SpAccesoRow`, `AccesoRow`, `MenuOption`, `ModuloOption`, `PaginatedResponse<T>` |
| `backend/src/seguridad/accesos/dto/save-acceso.dto.ts` | Create | Placeholder — schema vacío para DTO futuro |
| `backend/src/seguridad/seguridad.module.ts` | Modify | Registrar `AccesosController` + `AccesosService` en controllers/providers |

## Interfaces / Contracts

```typescript
// search-acceso.dto.ts
export const SearchAccoSchema = z.object({
  id_acceso: z.string().optional(),
  nombre: z.string().optional(),
  orden: z.string().optional(),
  menu: z.string().optional(),
  pantalla: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
});
export type SearchAccesoDto = z.infer<typeof SearchAccoSchema>;

// accesos.types.ts
export interface AccesoRow {
  id_acceso: string; orden: string; nombre: string;
  id_objeto: string; icono: string; doform: string; nestado: string;
}
export interface MenuOption { id_acceso: string; nommenu: string; }
export type ModuloOption = MenuOption;

// Server action return
type ActionResponse<T> =
  | { success: true; data: T[]; total: number; page: number; pageSize: number; totalPages: number }
  | { success: false; error: string };
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend Unit | AccesosService.search() mapea params SP correctamente | Mock `DatabaseService.executeProcedure`, verificar params `{busc, @inicio, @final}` |
| Backend Unit | Pagination math inicio/final para pages 1, 2, last | Test `calculatePaginationParams` directo |
| Backend Unit | getMenus() / getModulos() llaman busc=8 / busc=9 | Mock DB, verificar SP + parámetros |
| Frontend Component | 5 campos renderizan, cascada Menú→Módulo | Vitest + @testing-library/react con mock de acciones |
| Frontend Component | Estados loading/empty/error | Mocks de server action retornando cada estado |
| Frontend Component | Grid 7 columnas con Estado badge | Render con datos mock, verificar clase green/red |

## Open Questions

- [ ] Verificar que `[Acceso].[SP_MAcceso]` existe en BD con busc=5,6,8,9 funcionales y columnas coinciden exactamente
