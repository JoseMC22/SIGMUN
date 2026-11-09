# Tasks — Constancia de Exigibilidad

## 1. Backend

- [ ] T01 Registrar fila en `odd/OWNERSHIP.md` §4 (puentes de `constancia-exigibilidad.md`).
- [ ] T02 Sonda BD: fijar contrato de `COACTIVO.USP_EXIGIBILIDAD` `@opcion` 1/2/3/4 (params + columnas).
- [ ] T03 Definir plantilla HTML institucional del PDF (sin QR).
- [ ] T04 `constancia-exigibilidad.types.ts`: `ConstanciaExigibilidadRow` / `Result`.
- [ ] T05 DTOs + Zod: `search/validar` (`tipoValor`, `anio`, `numero`) y `emitir`.
- [ ] T06 `constancia-exigibilidad.service.ts`: validar(2), estado(1), emitir(3) con regla 7 días hábiles, datosImpresion(4) + spec.
- [ ] T07 `constancia-exigibilidad.controller.ts` + `constancia-exigibilidad.module.ts`.
- [ ] T08 Registro en `notificaciones.module.ts` (solo orquestador).
- [ ] T09 Verificación backend (tests, `tsc`, build) + commit work unit.

## 2. Frontend

- [ ] T10 `frontend/src/actions/notificaciones/constancia-exigibilidad.ts` + tests.
- [ ] T11 `page.tsx`: form Validar/Grabar/Imprimir/Cancelar + tests.
- [ ] T12 `export-utils.ts`: HTML→PDF sin QR + test.
- [ ] T13 Verificación frontend (tests, lint, build) + commit work unit.
