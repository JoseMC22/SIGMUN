# Design: Seguridad — Usuarios

## Technical Approach

Extend the existing NestJS `menu/` pattern (controller → service → `DatabaseService.executeProcedure()`) into a new `SeguridadModule` with an `UsuariosController` (3 endpoints) and `UsuariosService` (3 SPs). Frontend follows the existing `authFetch()` pattern in a new `actions/usuarios.ts` server action, with a single client component page at `/dashboard/seguridad/usuarios` handling all UI states.

Reference: proposal.md §Approach, specs/seguridad-usuarios/spec.md R1–R7.

## Architecture Decisions

### Decision: Single page component vs. split components

| Option | Tradeoff |
|--------|----------|
| Single `page.tsx` with inline sections | + Simpler, no prop drilling, no premature extraction. — Slightly longer file. |
| Split into `SearchForm`, `ResultsGrid`, `Pagination` | + Reusable. — Wrong time: no second consumer exists yet. |

**Decision**: Single page component with clearly marked sections. Extract only when a second consumer appears.

### Decision: Duplicate authFetch vs. extract shared helper

| Option | Tradeoff |
|--------|----------|
| Repeat `authFetch()` in `actions/usuarios.ts` | + Consistent with `auth.ts` and `menu.ts`. — 3 copies of the same code. |
| Extract to shared `lib/auth-fetch.ts` | + DRY. — Breaks convention, potential merge conflict. |

**Decision**: Follow existing convention — repeat `authFetch` inline. A shared helper is a separate refactor change.

### Decision: New SeguridadModule vs. adding to AuthModule

**Choice**: New `SeguridadModule` registered in `AppModule`.
**Rationale**: Cohesion — `Seguridad` is a domain boundary (seguridad module menu links to it). AuthModule is about authentication only.

## Data Flow

```
Browser                          Next.js Server                     NestJS Backend                SQL Server
──────                          ──────────────                     ──────────────                 ──────────
page.tsx mount
  │ → fetchAreasAction() ──→ authFetch() ── GET /areas ───────→ UsuariosController.getAreas()
  │                                                               → UsuariosService.getAreas()
  │                                                                 → db.executeProcedure() ──→ dbo.sp_tccostos
  │ ←─── { data: [{area, nombre}] } ←──────────────────────── ←─── response
  │
  │ → fetchPerfilesAction() ──→ authFetch() ── GET /perfiles ─→ UsuariosController.getPerfiles()
  │                                                               → UsuariosService.getPerfiles()
  │                                                                 → db.executeProcedure() ──→ [Acceso].[sp_TblPerfil]
  │ ←─── { data: [{id_perfil, nombre}] } ←─────────────────── ←─── response (nestado=1 filtered)
  │
  │ → searchUsuariosAction(filters, page) ── POST /search ───→ UsuariosController.search()
  │   authFetch() body: SearchUsuarioDto                          → UsuariosService.search(dto)
  │                                                                 → SP @busc=6 (total)   ──→ [Acceso].[sp_TblUsuarios]
  │                                                                 → SP @busc=5 (rows)    ──→ [Acceso].[sp_TblUsuarios]
  │ ←─── { data, total, page, pageSize, totalPages } ←─────── ←─── response
  │
  └── render grid + pagination
```

## Route / Endpoint Table

| Method | Path | DTO Validation | SP | Cache? |
|--------|------|----------------|-----|--------|
| `POST` | `/seguridad/usuarios/search` | `SearchUsuarioDto` (Zod) | `[Acceso].[sp_TblUsuarios]` @busc=5/6 | No |
| `GET` | `/seguridad/usuarios/areas` | None | `dbo.sp_tccostos` @busc='1' | No |
| `GET` | `/seguridad/usuarios/perfiles` | None | `[Acceso].[sp_TblPerfil]` @busc='4' | No |

All under `@UseGuards(JwtAuthGuard)` at controller level.

## Error Propagation Chain

```
SQL Server timeout (30s) / DB failure
  └─ DatabaseService.executeProcedure() throws
       └─ UsuariosService.search() re-throws
            └─ UsuariosController → NestJS exception filter → 500/504
                 └─ authFetch() throws
                      └─ searchUsuariosAction → { success: false, error: "..." }
                           └─ page.tsx error state → "Reintentar"

Invalid DTO (Zod)
  └─ ValidationPipe → 400
       └─ authFetch() sees !response.ok
            └─ searchUsuariosAction → { success: false, error: "..." }

Invalid/expired JWT
  └─ JwtAuthGuard → 401 (handled by existing dashboard middleware → /login)
```

## File Changes

| File | Action | Lines |
|------|--------|-------|
| `backend/src/seguridad/seguridad.module.ts` | Create | ~10 |
| `backend/src/seguridad/usuarios/usuarios.controller.ts` | Create | ~50 |
| `backend/src/seguridad/usuarios/usuarios.service.ts` | Create | ~60 |
| `backend/src/seguridad/usuarios/dto/search-usuario.dto.ts` | Create | ~20 |
| `backend/src/seguridad/usuarios/dto/usuarios.types.ts` | Create | ~25 |
| `backend/src/app.module.ts` | Modify | +1 line (add import + entry) |
| `frontend/src/actions/usuarios.ts` | Create | ~45 |
| `frontend/src/app/dashboard/seguridad/usuarios/page.tsx` | Create | ~250 |

**Total**: 8 files (7 new, 1 modified), ~460 lines. Slightly over budget — tasks phase should consider splitting PR slices (backend vs frontend).

## Interfaces / Contracts

```typescript
// — Backend DTOs (search-usuario.dto.ts) —
import { z } from 'zod';
export const SearchUsuarioSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().optional(),
  usuario: z.string().optional(),
  area: z.string().optional(),
  perfil: z.string().optional(),
  estado: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type SearchUsuarioDto = z.infer<typeof SearchUsuarioSchema>;

// — Backend types (usuarios.types.ts) —
export interface SpUsuariosRow {
  id_usuario: string; nombre: string; area: string;
  perfil: string; vlogin: string; nestado: string; ROW: number;
}
export interface SpUsuariosTotal { total: number; }
export interface SpAreaRow { area: string; nombre: string; }
export interface SpPerfilRow { id_perfil: string; nombre: string; nestado: number; }

export interface UsuarioRow {
  id: string; nombre: string; area: string;
  perfil: string; usuario: string; estado: string;
}
export interface AreaOption { area: string; nombre: string; }
export interface PerfilOption { id_perfil: string; nombre: string; }

// — Frontend action response types —
export interface PaginatedResponse<T> {
  success: true; data: T[]; total: number;
  page: number; pageSize: number; totalPages: number;
}
export interface ErrorResponse { success: false; error: string; }
```

## Testing Strategy (Strict TDD Order)

| Order | Test | Layer | Approach |
|-------|------|-------|----------|
| 1 | T3: Pagination math | Pure function | `calculatePagination(page, pageSize, total)` → `{ inicio, final, totalPages }` |
| 2 | T1: Service SP mapping | Backend unit | Mock `DatabaseService`, verify SP params per scenario |
| 3 | T4: Areas mapping | Backend unit | Mock SP result, verify `{ area, nombre }` |
| 4 | T5: Perfiles filtering | Backend unit | Mock SP with mixed nestado, verify filter |
| 5 | T2: Controller response | Backend unit | Mock service, verify HTTP response envelope |
| 6 | T6: Action unit | Frontend unit | Mock `authFetch`, verify endpoint + error handling |
| 7 | T7–T11: Component | Frontend comp | Mock action, test 4 grid states + pagination |

## Migration / Rollout

No migration required. Zero config or schema changes.

## Open Questions

None. All SP contracts are defined in the spec.
