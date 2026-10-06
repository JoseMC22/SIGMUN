# Design: Consulta RD Alcabala

## Technical Approach

Replicate the `cartas-requerimiento` pattern: NestJS controller + service under `fiscalizacion-tributaria` module, server action proxy via `authFetch`, Next.js `"use client"` page with filters, paginated table, detail modal, and PDF print. Backend calls the legacy RD stored procedure via `DatabaseService.executeProcedure`. No ORM, no data migration — read-only feature.

## Architecture Decisions

### Decision: Follow existing cartas-requerimiento module pattern

**Choice**: Flat folder per feature inside `fiscalizacion-tributaria/` with controller, service, DTO, types files.
**Alternatives considered**: Shared/generic query module with feature-specific config.
**Rationale**: Every fiscalizacion feature follows this pattern. Consistency > abstraction for a small team. The generic module adds indirection without clear ROI.

### Decision: Two SP calls for search (count + paginated data)

**Choice**: Single SP `Rentas.SP_ConsultadocuAlcabala` invoked twice — once with `@msquery=1` for count, once with `@msquery=2` for paginated data. Same as `cartas-requerimiento`.
**Alternatives considered**: Single SP returning both count and rows; separate SPs.
**Rationale**: The legacy SP uses `@msquery` to select operation mode. This is the established convention — all existing fiscalizacion SPs work this way. Changing it would require DBA coordination for a read-only feature.

### Decision: Detail modal over detail page

**Choice**: Modal overlay showing full RD detail, triggered by table row click.
**Alternatives considered**: Dedicated `/consulta-rd-alcabala/[id]` route.
**Rationale**: Proposal explicitly requests modal. Matches modal pattern already used in cartas-requerimiento (`modal-generar.tsx`). Keeps user in search context.

### Decision: PDF generation via frontend browser print

**Choice**: Generate PDF from the detail modal content using browser print/print-to-PDF. No backend PDF endpoint.
**Alternatives considered**: Backend PDF generation (puppeteer, pdfmake); server-side rendering.
**Rationale**: Out-of-scope for a read-only consultation feature. Lowest risk, no additional dependencies. If a formal PDF template is needed later, it becomes a separate change.

## Data Flow

```
Browser                  Server Action              NestJS Backend           SQL Server
  │                          │                          │                        │
  ├─ searchAction(filters) ──┤                          │                        │
  │                          ├── authFetch(POST) ───────┤                        │
  │                          │                          ├─ executeProcedure ─────┤
  │                          │                          │  SP_ConsultadocuAlcabala│
  │                          │                          │  @msquery=1 (count)    │
  │                          │                          ├───── total count ──────┤
  │                          │                          │                        │
  │                          │                          ├─ executeProcedure ─────┤
  │                          │                          │  SP_ConsultadocuAlcabala│
  │                          │                          │  @msquery=2 (data)     │
  │                          │                          ├───── paginated rows ───┤
  │                          │                          │                        │
  │  { data, total, page }   │◄── response ────────────┤                        │
  │◄── return ───────────────┤                          │                        │
  │                          │                          │                        │
  ├─ openDetail(row)         │                          │                        │
  ├─ detailAction(idRd) ─────┤                          │                        │
  │                          ├── authFetch(POST) ───────┤                        │
  │                          │                          ├─ executeProcedure ─────┤
  │                          │                          │  SP_ConsultadocuAlcabala│
  │                          │                          │  @msquery=3 (detail)   │
  │                          │                          ├───── full RD row ──────┤
  │  { data: RdDetail }      │◄── response ────────────┤                        │
  │◄── return ───────────────┤                          │                        │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.controller.ts` | Create | Controller with search + detail endpoints, JwtAuthGuard |
| `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.service.ts` | Create | Service calling legacy SP via DatabaseService |
| `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/dto/search-rd-alcabala.dto.ts` | Create | Zod schemas for search + detail DTOs |
| `backend/src/fiscalizacion-tributaria/consulta-rd-alcabala/consulta-rd-alcabala.types.ts` | Create | SP row interfaces + domain types (RdAlcabalaRow, RdAlcabalaDetail, PaginatedResponse) |
| `backend/src/fiscalizacion-tributaria/fiscalizacion-tributaria.module.ts` | Modify | Register ConsultaRdAlcabalaController + Service |
| `frontend/src/actions/fiscalizacion-tributaria/consulta-rd-alcabala.ts` | Create | Server actions: searchRdAlcabalaAction, getRdAlcabalaDetailAction |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/page.tsx` | Create | Search page with filters, paginated table, detail modal |
| `frontend/src/app/dashboard/fiscalizacion-tributaria/consulta-rd-alcabala/detail-modal.tsx` | Create | Modal showing full RD detail + print button |
| Navigation DB config | Modify | Add "Consulta RD Alcabala" submenu under Alcabala |

## Interfaces / Contracts

```typescript
// Backend DTO (Zod) — matches legacy SP params
const SearchRdAlcabalaSchema = z.object({
  searchType: z.enum(['codigo', 'nombre']),
  searchValue: z.string().optional().default(''),
  nroRd: z.string().optional().default(''),  // maps to @num_va
  fechaDesde: z.string().optional().default(''),  // maps to @inicio
  fechaHasta: z.string().optional().default(''),  // maps to @final
  periodoFiscal: z.string().optional().default(''),
  estado: z.string().optional().default(''),  // maps to @id_valor (fixed '08' for Alcabala)
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// Backend response types (reuse project convention)
interface RdAlcabalaRow {
  nroRd: string;
  contribuyente: string;
  fechaEmision: string;
  baseImponible: number;
  estado: string;
}

interface RdAlcabalaDetail extends RdAlcabalaRow {
  codigo: string;
  domicilio: string;
  periodoFiscal: string;
  anio: string;
  // ... all SP-returned fields
}

// Server action return envelope (matches existing pattern)
type ActionResult<T> =
  | { success: true; data: T[]; total: number; page: number; totalPages: number }
  | { success: false; error: string };
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | Service SP param mapping, pagination calc, response mapping | Jest + mock DatabaseService |
| Unit (backend) | Zod DTO validation (valid + invalid inputs) | Jest schema .parse() assertions |
| Unit (frontend) | Server action success/error paths | Vitest + mock fetch |
| Unit (frontend) | Page renders filters, table, empty state | Vitest + @testing-library/react |
| Integration | Controller → Service → mock SP response | Jest + supertest |

## Migration / Rollout

No migration required. Read-only feature — no persisted state changes. Navigation submenu must be inserted into DB config (manual or scripted). Rollback: delete new directories, revert module registration, remove submenu.

## Open Questions

- [x] **SP name and params**: RESOLVED — `Rentas.SP_ConsultadocuAlcabala` with params: `@msquery`, `@codigo`, `@unombre`, `@num_va`, `@inicio`, `@final`, `@id_valor` (fixed '08' for Alcabala).
- [x] **SP `mquery` values**: RESOLVED — `@msquery=1` for count, `@msquery=2` for paginated data, `@msquery=3` for detail (assumed based on pattern; verify during implementation).
- [ ] **Navigation submenu parent**: Confirm exact parent menu and ordering for "Consulta RD Alcabala" entry in DB config.
- [ ] **Estado RD values**: What are the possible status values for the estado Select filter? SP may return them or they may be hardcoded.
- [ ] **PDF format requirements**: Is browser print sufficient, or is a formal SAT-branded PDF template required? This would change scope significantly.
