# Tasks: Impresion Declaracion Alcabala

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked-to-main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend data layer + HTML/PDF generator + tests | PR 1 (~260 lines) | Foundation — DTO, service, generator, all backend tests. No controller yet. |
| 2 | Backend controller route + tests + env config | PR 2 (~100 lines) | Depends on PR 1. Adds endpoint, controller tests, `.env.example`. |
| 3 | Frontend action + button + tests | PR 3 (~190 lines) | Depends on PR 2. Server action, table button, frontend tests. |

---

## Phase 1: Backend Data Layer (PR 1)

- [ ] 1.1 **RED** — Create `backend/src/alcabala/impresion-dj-alcabala/dto/declaracion-pdf-row.dto.ts`: Zod schema `DeclaracionPdfRowSchema` with 16 string fields (default `''`) and 9 numeric fields (`z.coerce.number().catch(0)`). Export `DeclaracionPdfRow` type. Write test asserting schema parses a full row, defaults NULL strings to `''`, `.catch(0)` on non-numeric garbage like `'N/A'`.
- [ ] 1.2 **GREEN** — Implement `mapDeclaracionPdfRow(row)` in `impresion-dj-alcabala.service.ts`: local `col()` case-insensitive helper (same pattern as existing `col`), maps all 25 fields via `col()` + schema parse. Export the function.
- [ ] 1.3 **RED** — Add service test cases to `impresion-dj-alcabala.service.spec.ts`: (a) `resolveDeclaracionPrintData` calls `Alcabala.RptAlcabala` with `{ id_alcabala }`, (b) 0 rows → `NotFoundException`, (c) NULL/mixed-case columns map via `col()`, (d) first-row-keys logged, (e) `.catch(0)` on `'N/A'` numeric → 0, no throw. Use `describe('resolveDeclaracionPrintData')`.
- [ ] 1.4 **GREEN** — Implement `resolveDeclaracionPrintData(idAlcabala)` in service: `db.executeProcedure('Alcabala.RptAlcabala', { id_alcabala })`, check `recordset[0]` exists, log `Object.keys(recordset[0])`, map via `mapDeclaracionPdfRow`, throw `NotFoundException` on zero rows.
- [ ] 1.5 **RED** — Add fallback test cases: (a) When `usuario_ing`/`fecha_ing` empty → fallback calls `Alcabala.sp_DJAlcabala` with `{ buscar: '8', id_alcabala }`, reads `usuario`/`fecha_ing`; (b) Fallback SKIPPED when RptAlcabala provides stamp; (c) Fallback SP error → empty strings, no throw.
- [ ] 1.6 **GREEN** — Implement fallback logic: only call `sp_DJAlcabala` when `usuario_ing` and `fecha_ing` are empty after mapping. Wrap fallback in try/catch, default to `''` on error.
- [ ] 1.7 **RED** — Create `backend/src/alcabala/impresion-dj-alcabala/declaracion-pdf-generator.spec.ts`: test `esc()` escapes `&<>"'`; test `fmt()` formats numbers as `S/. #,##0.00`; test `buildDeclaracionPdfHtml` contains all section labels + amounts; test logo embedded when provided, absent when null; test `loadLogoDataUri` returns null for missing file / non-image bytes / oversized file; mock `html-pdf-node` for `generateDeclaracionPdf`.
- [ ] 1.8 **GREEN** — Create `declaracion-pdf-generator.ts`: `esc(s)` HTML-escapes DB strings; `fmt(n)` formats as `S/. #,##0.00`; `buildDeclaracionPdfHtml(row, opts)` renders A4 HTML with title "IMPUESTO DE ALCABALA", RECEPCION box, sections 1–4, montos table, firmas, footer; `generateDeclaracionPdf(row, opts)` calls `generatePdf` with margins `{ top:'30px', right:'30px', bottom:'20px', left:'20px' }`; `loadLogoDataUri(path)` reads file, validates magic bytes (PNG/JPEG) + size ≤1 MB, returns data URI or null.
- [ ] 1.9 Run `pnpm --filter backend test` — all service + generator tests pass.

### PR 1 Boundary

**Branch**: `feat/declaracion-alcabala-print-1`
**Target**: DEV
**Files**: `declaracion-pdf-row.dto.ts` (new), `declaracion-pdf-generator.ts` (new), `declaracion-pdf-generator.spec.ts` (new), `impresion-dj-alcabala.service.ts` (extend), `impresion-dj-alcabala.service.spec.ts` (extend)
**Verify**: `pnpm --filter backend test`
**Rollback**: Delete 2 new files, revert service changes.

---

## Phase 2: Backend Controller + Config (PR 2)

- [x] 2.1 **RED** — Add controller test cases to `impresion-dj-alcabala.controller.spec.ts`: (a) `GET declaracion-pdf/:idAlcabala` → resolves data, generates PDF, streams with correct headers (`Content-Type`, `Content-Type`, `Content-Disposition: inline`, `Content-Length`, filename `declaracion_<id>.pdf`), (b) invalid id → 400, (c) passes `req.user.username` as `usuario`, (d) uses `ConfigService` for logo path, (e) 401 guard scenario.
- [x] 2.2 **GREEN** — Extend controller: add `@Get('declaracion-pdf/:idAlcabala')` with `@UseGuards(JwtAuthGuard)`. Validate `Number(idAlcabala)` → `BadRequestException` if NaN/≤0. Inject `ConfigService`, read `REPORT_IMG_RUTA`. Extract `req.user?.username ?? 'SISTEMA'`, `fecha` = server now `dd/MM/yyyy HH:mm:ss`. Call `resolveDeclaracionPrintData` + `generateDeclaracionPdf`, set headers + `Content-Length`, `res.end(buffer)`.
- [x] 2.3 Add `REPORT_IMG_RUTA=` to `backend/.env.example` (documented as optional logo path).
- [x] 2.4 Run `pnpm --filter backend test` — all controller tests pass.

### PR 2 Boundary

**Branch**: `feat/declaracion-alcabala-print-2`
**Target**: DEV (stacked on PR 1)
**Files**: `impresion-dj-alcabala.controller.ts` (extend), `impresion-dj-alcabala.controller.spec.ts` (extend), `.env.example` (extend)
**Verify**: `pnpm --filter backend test`
**Rollback**: Revert controller + env changes.

---

## Phase 3: Frontend (PR 3)

- [x] 3.1 **RED** — Add action test cases to `frontend/src/actions/alcabala/impresion-dj-alcabala.test.ts`: `getDeclaracionPdfBase64Action` — success returns base64, 404 returns null, fetch throws returns null.
- [x] 3.2 **GREEN** — Add `getDeclaracionPdfBase64Action` to `impresion-dj-alcabala.ts`: mirror `getOpPdfBase64Action` pattern, path `alcabala/impresion-dj-alcabala/declaracion-pdf/${idAlcabala}`.
- [x] 3.3 **RED** — Add table test cases to `alcabalas-table.test.tsx`: (a) "Imprimir Declaración" button renders next to "Imprimir Formato", (b) click opens new tab with blob URL, (c) popup blocked (`window.open` null) shows error, (d) loading disables button, (e) error message shown on failure.
- [x] 3.4 **GREEN** — Extend `alcabalas-table.tsx`: add `declaracionPrintingId` + `declaracionError` state (independent from existing). Add `handlePrintDeclaracion(item)` — same UX as `handlePrint`. Add button with `FileText` icon, label "Imprimir Declaración", disabled while loading. Import `FileText` from lucide-react.
- [x] 3.5 Run `pnpm --filter frontend test` — PR 3 slice green (13/13 alcabala tests pass). 16 pre-existing failures in unrelated modules (impuesto-vehicular, mantenimiento-tablas) reported separately — not introduced by this slice.

### PR 3 Boundary

**Branch**: `feat/declaracion-alcabala-print-3`
**Target**: DEV (stacked on PR 2)
**Files**: `frontend/src/actions/alcabala/impresion-dj-alcabala.ts` (extend), `frontend/src/actions/alcabala/impresion-dj-alcabala.test.ts` (extend), `frontend/src/app/dashboard/alcabala/determinar-alcabala/alcabalas-table.tsx` (extend), `frontend/src/app/dashboard/alcabala/determinar-alcabala/alcabalas-table.test.tsx` (extend)
**Verify**: `pnpm --filter frontend test`
**Rollback**: Revert frontend files.

---

## Phase 4: Field-Count Reconciliation (after PR 1 merge)

- [ ] 4.1 **Verify** — After PR 1 merges, run `resolveDeclaracionPrintData` against a real `idAlcabala` in dev. Log first-row keys. Compare against the 25 named fields in the DTO. If a 26th field exists in SP output, document it in the spec delta but do NOT add a placeholder name to the DTO — the real SP output is the source of truth.

## Phase 5: Verification

- [ ] 5.1 Run full backend suite: `pnpm --filter backend test` — 0 failures.
- [ ] 5.2 Run full frontend suite: `pnpm --filter frontend test` — 0 failures.
- [ ] 5.3 Manual: `GET /alcabala/impresion-dj-alcabala/declaracion-pdf/{valid-id}` returns inline PDF with correct headers.
- [ ] 5.4 Manual: "Imprimir Declaración" button in alcabalas-table opens PDF in new tab.
- [ ] 5.5 Manual: PDF layout matches JRXML — title, RECEPCION, 4 sections, montos table, firmas, footer.
- [ ] 5.6 Manual: Logo renders when `REPORT_IMG_RUTA` set; PDF renders without logo when unset.
