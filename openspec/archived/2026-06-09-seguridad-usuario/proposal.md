# Proposal: Seguridad — Usuario

## Intent

Port user management search/grid from the legacy PHP/JS app to the NestJS + Next.js stack. Administrators need to find, filter, and navigate system users within the modern SIGMUN dashboard without switching to the old interface.

## Scope

### In Scope
- Backend: `POST /seguridad/usuarios/search`, `GET /seguridad/usuarios/areas`, `GET /seguridad/usuarios/perfiles`
- Frontend: search form (6 filters) + paginated results grid at `/dashboard/seguridad/usuarios`
- DTOs, Zod validation, SP result types for 3 stored procedures
- Backend tests (Jest) + frontend tests (Vitest) per strict TDD

### Out of Scope
- Create/edit user forms (separate change)
- Role-based UI visibility
- Export to Excel/PDF

## Capabilities

### New Capabilities
- `seguridad-usuarios`: user search and management grid with filtering, sorting, and pagination via 3 stored procedures

### Modified Capabilities
- None

## Approach

1. **Backend**: `SeguridadModule` with `UsuariosController` (3 endpoints), `UsuariosService` (calls `[Acceso].[sp_TblUsuarios]`, `dbo.sp_tccostos`, `[Acceso].[sp_TblPerfil]`), and `SearchUsuarioDto` with Zod validation — follows existing `MenuModule` patterns.
2. **Frontend**: Server action `usuarios.ts` using `authFetch`, page component with 6-field search form + grid (código, nombres, área, perfil, usuario, acciones) + pagination controls — follows dashboard layout conventions.
3. **Testing**: Write SP result type interfaces and integration tests first, then service → controller → page component.

## Architecture

```
Frontend (Next.js 16)                      Backend (NestJS 11)                 SQL Server
─────────────────────                      ───────────────────                 ──────────
/seguridad/usuarios/page.tsx              POST /seguridad/usuarios/search ──→ [Acceso].[sp_TblUsuarios]
  └─ Server Action (usuarios.ts) ──→        GET  /seguridad/usuarios/areas ──→ dbo.sp_tccostos
     authFetch() → fetch with cookie        GET  /seguridad/usuarios/perfiles  [Acceso].[sp_TblPerfil]
                                            All under @UseGuards(JwtAuthGuard)
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/seguridad/` | **New** | Module, controller, service, DTOs (4-5 files) |
| `frontend/src/actions/usuarios.ts` | **New** | Server action for user search |
| `frontend/src/app/dashboard/seguridad/usuarios/page.tsx` | **New** | Search form + results grid |

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP @busc=5/6 contract mismatch (column names/types) | Low | Write SP integration test before service code |
| Pagination off-by-one errors (inicio/final params) | Low | Test boundary cases: first page, last page, empty results |
| Strict TDD overhead for 3 new result types | Low | 3 small test → interface → implementation cycles |

## Dependencies

- Existing SPs: `[Acceso].[sp_TblUsuarios]`, `dbo.sp_tccostos`, `[Acceso].[sp_TblPerfil]`
- `JwtAuthGuard` and `DatabaseService` already available (global)
- No schema or DB changes required

## Rollback Plan

- Revert: remove `backend/src/seguridad/`, `frontend/src/actions/usuarios.ts`, `frontend/src/app/dashboard/seguridad/usuarios/`
- No migrations, no schema changes, no config changes → clean revert

## Success Criteria

- [ ] `POST /seguridad/usuarios/search` returns paginated results matching SP output
- [ ] `GET /seguridad/usuarios/areas` and `/perfiles` return correct select options
- [ ] Grid displays 6 columns with working pagination ("Mostrando X-Y de Z")
- [ ] `pnpm --filter backend test` passes; `pnpm --filter frontend test` passes

## Review Workload Forecast

~250 lines changed across 11 files (8 new, 0 modified, 0 deleted). Budget risk: **Low** — well under the 400-line guard.
