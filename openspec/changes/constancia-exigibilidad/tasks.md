# Tasks — Constancia de Exigibilidad

## 1. Backend

- [x] T01 Registrar fila en `odd/OWNERSHIP.md` §4 (puentes de `constancia-exigibilidad.md`).
- [x] T02 Sonda BD: fijar contrato de `COACTIVO.USP_EXIGIBILIDAD` `@opcion` 1/2/3/4 (params + columnas).
- [x] T03 Definir plantilla HTML institucional del PDF (sin QR).
- [x] T04 `constancia-exigibilidad.types.ts`: `ConstanciaExigibilidadRow` / `Result`.
- [x] T05 DTOs + Zod: `search/validar` (`tipoValor`, `anio`, `numero`) y `emitir`.
- [x] T06 `constancia-exigibilidad.service.ts`: tiposValor (combo), validar(`@opcion=2`, ya trae `Estado`), emitir(`@opcion=3`) con regla 7 días hábiles, datosImpresion(`@opcion=4`) + spec. Null-safety y orden de validaciones según D5.
- [x] T07 `constancia-exigibilidad.controller.ts` + `constancia-exigibilidad.module.ts`.
- [x] T08 Registro en `notificaciones.module.ts` (solo orquestador).
- [x] T09 Verificación backend (tests, `tsc`, build) + commit work unit.

## 2. Frontend

- [x] T10 `frontend/src/actions/notificaciones/constancia-exigibilidad.ts` + tests.
- [x] T11 `page.tsx`: form Validar/Grabar/Imprimir/Cancelar + tests.
- [x] T12 `export-utils.ts`: HTML→PDF sin QR + test.
- [x] T13 Verificación frontend (tests, lint, build) + commit work unit.

## 3. Integración

- [x] T14 Alta del ítem de menú en la tabla de accesos/submenú apuntando a `/dashboard/notificaciones/constancia-exigibilidad` (sin esta fila la pantalla no es navegable). Verificado 2026-11-12: la fila `23.04.00` ya existía en `Acceso.MAcceso` con grants en `MPerfil_acceso`; `sp_LogOut @buscar=8` la devuelve para el perfil ENCARGADO DE NOTIFICACIONES.
- [x] T15 Verificación funcional con BD real: valor inexistente (S2), cancelado estados 9 y 2 (S3 + riesgo D5), sin cargo (S4), con y sin constancia (S6), regla de 7 días hábiles (S10) e impresión del PDF (S8). Ejecutada 2026-11-12 contra `192.168.3.205/Base_sigmun`; D5 cerrado; hallazgos H1 (`nroconstancia` sin padding) y H2 (rama muerta de `FNotifica`) registrados en `odd/tasks/constancia-exigibilidad.md`.
