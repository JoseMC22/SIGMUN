# Design: Mantenimiento de Vías

## Technical Approach

Add a new self-contained module `mantenimiento-vias` following the existing `seguridad/usuarios` pattern: a NestJS module with controller + service + DTOs, a frontend page with Server Action and `useState`-driven UI, and a new stored procedure for data access. The module registers as a flat NestJS module (not nested under a parent domain module) since it has no sibling modules yet.

## Architecture Decisions

### Decision: Module Structure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Nest under `administracion-tributaria/` | Cleaner domain grouping but adds premature parent module | Rejected — no other tributaria modules exist yet |
| **Standalone `mantenimiento-vias/`** | Self-contained, mirrors existing patterns, easy to extract later | **Chosen** |

### Decision: Endpoint Design

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `GET /api/mantenimiento-vias/usuarios` | RESTful but can't pass complex search body | Rejected |
| **`POST /api/mantenimiento-vias/search`** | Matches `seguridad/usuarios/search` exactly, supports typed filter body | **Chosen** |

### Decision: SP Pagination

| Option | Tradeoff | Decision |
|--------|----------|----------|
| In-memory pagination on full result set | Simple but breaks existing pattern | Rejected — all other SPs paginate |
| **SP accepts `inicio`/`final` params** | Consistent with `sp_TblUsuarios` pattern, tested infrastructure exists | **Chosen** |

## Data Flow

```
Browser ──POST──→ Server Action ──authFetch()──→ Backend Controller
                                                     │
                                          Zod validation (in controller)
                                                     │
                                                  Service
                                                     │
                                     DatabaseService.executeProcedure()
                                                     │
                                              SQL Server SP
                                              [dbo].[sp_MantenimientoVias_ListarUsuarios]
                                                     │
                                              ← recordset
                                                     │
                                         Service maps → DTO
                                                     │
         Page (useState) ←── JSON response ─── Controller
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/mantenimiento-vias/mantenimiento-vias.module.ts` | Create | NestJS module, imports AuthModule, registers controller + service |
| `backend/src/mantenimiento-vias/mantenimiento-vias.controller.ts` | Create | `@Controller('mantenimiento-vias')`, `@Post('search')` with Zod validation |
| `backend/src/mantenimiento-vias/mantenimiento-vias.service.ts` | Create | Calls SP via `DatabaseService.executeProcedure()`, maps rows |
| `backend/src/mantenimiento-vias/dto/search-mantenimiento-vias.dto.ts` | Create | Zod schema: `codigo`, `zona`, `estado`, `page`, `pageSize` |
| `backend/src/mantenimiento-vias/dto/mantenimiento-vias.types.ts` | Create | `SpVUsuarioRow`, `VUsuarioRow`, reuses `PaginatedResponse<T>` |
| `backend/src/mantenimiento-vias/mantenimiento-vias.controller.spec.ts` | Create | Controller unit tests |
| `backend/src/mantenimiento-vias/mantenimiento-vias.service.spec.ts` | Create | Service unit tests (mock DB, test mapping + pagination) |
| `backend/src/app.module.ts` | Modify | Import `MantenimientoViasModule` |
| `frontend/src/actions/mantenimiento-vias.ts` | Create | Server Action: `searchViasAction()` using `authFetch()` |
| `frontend/src/actions/mantenimiento-vias.test.ts` | Create | Vitest tests for action (mock fetch + cookies) |
| `frontend/src/app/dashboard/mantenimiento-vias/page.tsx` | Create | `"use client"` page: hero header, filter card, table, pagination, modals |
| `frontend/src/app/dashboard/mantenimiento-vias/detalle-urbanizacion-modal.tsx` | Create | Modal scaffold — shadcn Dialog, content TBD |
| `frontend/src/app/dashboard/mantenimiento-vias/detalle-via-modal.tsx` | Create | Modal scaffold — shadcn Dialog, content TBD |
| DB — `[dbo].[sp_MantenimientoVias_ListarUsuarios]` | Create | SP with `@codigo`, `@zona`, `@estado`, `@inicio`, `@final` params |
| DB — Menu table | Create | Submenu row: `doform2='mantenimiento-vias'`, linked to Adm. Tributaria module ID |

## Interfaces / Contracts

```typescript
// ── Request ──
// POST /api/mantenimiento-vias/search
// Body:
interface SearchMantenimientoViasDto {
  codigo?: string;
  zona?: string;
  estado?: string;       // "1" | "0" | ""
  page: number;          // default 1
  pageSize: number;      // default 20, max 100
}

// ── Response ──
// 200 OK
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Row type
interface VUsuarioRow {
  vlogin: string;
  estado: string;  // "ACTIVADO" | "DESACTIVADO"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service (unit) | SP call params, row mapping, pagination math | Mock `DatabaseService.executeProcedure()`, assert correct `inicio`/`final` params |
| Controller (unit) | Zod validation, response shape, auth guard presence | Use `@nestjs/testing`, mock service, test valid/invalid DTOs |
| Action (unit) | Request URL, method, Cookie header, error handling | Mock `global.fetch` + `cookies()`, follow `usuarios.test.ts` pattern |
| Page (component) | Renders filter, table, loading/error/empty states | Vitest + `@testing-library/react`, mock Server Action |

## Open Questions

- [ ] **Module ID**: What is the `id_acceso` of "Administración Tributaria" in the menu DB? Required to link the submenu row. Query `[Acceso].[sp_LogOut] @buscar=4` with a known user to discover it.
- [ ] **Modal content**: Both modals are scaffolded as empty shadcn Dialogs. Content will be defined in a follow-up change once business rules are clarified.
- [ ] **SP columns**: Does `acceso.tblusuarios` have `codigo` and `zona` columns for filtering? The proposal mentions these filters — if not available, filter params may be removed.
