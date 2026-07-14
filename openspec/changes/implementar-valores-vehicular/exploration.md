## Exploration: Implementar valores vehicular

### Current State

The "Impuesto Vehicular" domain is partially built. On branch `feat/modelos`, there is a complete `modelos` (vehicle models) sub-module with backend CRUD (NestJS controller/service/DTOs + tests) and frontend (Next.js page/server actions/edit modal + tests). This sub-module lives under `backend/src/impuesto-vehicular/` and `frontend/src/app/dashboard/impuesto-vehicular/modelos/`.

On the current branch `feat/valores-vehicular`:
- **Frontend**: The directory `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/` exists but is **empty** — it is a placeholder awaiting implementation.
- **Backend**: No `impuesto-vehicular` module exists yet in `backend/src/`. The `app.module.ts` does not import `ImpuestoVehicularModule` (the modelos branch is ahead).
- **Stored Procedures**: The DB has existing SPs for the vehiculo domain: `sp_vehiculo_modelo_contar`, `sp_vehiculo_modelo_listar`, `sp_vehiculo_modelo_buscar`, `sp_vehiculo_modelo_grabar`. There may also be SPs for "valores" (vehicle rates/values) — this needs DB confirmation.
- **Navigation**: The sidebar already has "Impuesto Vehicular" registered as a module (lucide `Car` icon) with dynamic submenus from the menu SP.

### Affected Areas

Based on the modelos pattern, this feature will mirror the same structure:

- `backend/src/impuesto-vehicular/impuesto-vehicular.module.ts` — Module registration (may need to add ValoresController/Service alongside existing Modelos ones)
- `backend/src/impuesto-vehicular/valores/valores.controller.ts` — New: CRUD endpoints
- `backend/src/impuesto-vehicular/valores/valores.service.ts` — New: SP invocation + response mapping
- `backend/src/impuesto-vehicular/valores/dto/valores.types.ts` — New: SP result types + domain interfaces
- `backend/src/impuesto-vehicular/valores/dto/search-valor.dto.ts` — New: Zod search schema
- `backend/src/impuesto-vehicular/valores/dto/save-valor.dto.ts` — New: Zod save schema
- `backend/src/impuesto-vehicular/valores/valores.controller.spec.ts` — New: controller tests
- `backend/src/impuesto-vehicular/valores/valores.service.spec.ts` — New: service tests
- `backend/src/app.module.ts` — Add ImpuestoVehicularModule (if not already added)
- `frontend/src/actions/valores.ts` — New: server actions
- `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/page.tsx` — New: list page
- `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/valor-edit-modal.tsx` — New: create/edit modal
- `frontend/src/app/dashboard/impuesto-vehicular/valores-vehicular/valores.test.tsx` — New: component tests

### Approaches

1. **Standalone sub-module within ImpuestoVehicularModule** — Create `valores/` as a sibling of `modelos/` inside the existing `impuesto-vehicular/` module.
   - Pros: Follows exact established pattern; clean separation; reusable by modelos module
   - Cons: Need to coordinate with modelos module which exists on a different branch (may need merge first or parallel structure)
   - Effort: Medium

2. **Merge modelos first, then build valores** — Merge `feat/modelos` into this branch, then add valores as a second sub-module.
   - Pros: Shared ImpuestoVehicularModule is already wired; test infrastructure in place
   - Cons: Creates dependency on modelos merge; extends timeline
   - Effort: Medium (depends on merge conflicts)

3. **Independent domain module** — Create a completely separate `valores-vehicular` module independent from the modelos module.
   - Pros: Full isolation; no merge dependency
   - Cons: Diverges from project pattern (modulos should nest under impuesto-vehicular); duplicate module setup
   - Effort: Medium

4. **Only frontend (static catalog)** — If the SPs for valores already exist in the DB, only build the frontend UI and server actions.
   - Pros: Fastest path
   - Cons: Unlikely — SPs probably need to be created too; backend code still needed
   - Effort: Low (if SPs exist)

### Recommendation

**Approach 1: Standalone sub-module within ImpuestoVehicularModule.**

The modelos module (on branch `feat/modelos`) already established the pattern and the `ImpuestoVehicularModule`. The valores module should be a sibling sub-module (`valores/`) inside the same module, with:
- Its own controller, service, DTOs, and tests
- Server actions and frontend page/edit-modal
- The same naming conventions: Zod validation, PHP-correct pagination, authFetch pattern, 4 visual states (loading/empty/error+retry/populated)

This requires either:
- (a) Merging `feat/modelos` first to get the module structure, OR
- (b) Creating the module + valores together in one go if modelos hasn't been merged yet

The SP names for "valores" need to be confirmed via DB access — the existing pattern (`sp_vehiculo_modelo_*`) suggests they'd be named `sp_vehiculo_valor_*` (or similar).

### Risks

- **SP discovery**: The specific stored procedures for "valores vehicular" haven't been identified. The name might be `sp_vehiculo_valor_*`, `sp_impuesto_vehicular_valor_*`, or something entirely different. DB access is needed.
- **Domain ambiguity**: "Valores vehicular" could mean tax rates, fee tables, assessed values, or valuation parameters. The exact business meaning needs clarification from the user or the PHP legacy system.
- **Merge dependency**: If modelos branch isn't merged first, the ImpuestoVehicularModule doesn't exist yet in the current branch, and the module will need to be created from scratch.
- **Established convention**: The modelos design mentions PHP pagination uses a different formula (`page>1 ? (page-1)*limit+1 : 0`) than the seguridad modules (`(page-1)*pageSize+1`). This per-module quirk must be confirmed for valores too.

### Ready for Proposal

**Yes** — but with the caveat that the specific stored procedures for "valores vehicular" need to be discovered and documented during the proposal phase. The patterns are well-established (modelos module is the direct reference). The proposal should clarify the business meaning of "valores" in this context.
