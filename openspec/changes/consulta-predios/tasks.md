# Tasks — Consulta de Predios

Checklist alineado 1:1 con `odd/tasks/consulta-predios.md`. Los checks son los del
tracker; T06 cierra el feature con la verificación completa.

## 0. SDD

- [x] **T01 — SDD**: crear `openspec/changes/consulta-predios/{proposal.md,design.md,tasks.md,specs/consulta-predios/spec.md}` con la evidencia legacy (path:line) y las decisiones del tracker. **Checks:** lectura estructural de los 4 archivos (presentes y no vacíos) y un único commit `docs(consulta-predios): ...` que contenga solo esos 4 archivos.

## 1. Backend

- [x] **T02 — Backend search**: módulo `backend/src/administracion-tributaria/consulta-predios/**` (controller, service, module, DTOs Zod, types), endpoint `search`, Zod en el boundary, `@busc=20/19` con el orden exacto de parámetros, paginación 1-based `pageSize=20`, envelope canónico, guard JWT y `request.input(...)`. Registro en `backend/src/app.module.ts`. Tests Jest de service y controller. **Checks:** `pnpm --dir backend test -- consulta-predios` (o runner Jest equivalente del repo); verificar sin `any`, sin `@ts-ignore`, SQL parametrizado, envelope canónico y JWT guard.

- [x] **T03 — Backend export**: endpoint `export` sobre `@busc=21` con `mostrarPisos` (`@flag_pisos` `'1'/'0'`), parámetros en el orden del tracker y mapeo 16/33 columnas excluyendo `$row[15]` (título) como dato. Tests Jest. **Checks:** `pnpm --dir backend test -- consulta-predios`; el test de regresión confirma 16 columnas sin pisos y 33 con pisos.

## 2. Frontend

- [x] **T04 — Frontend grilla**: `frontend/src/actions/administracion-tributaria/consulta-predios.ts` (server action con cookie `SIGMUN_AUTH`) y `frontend/src/app/dashboard/administracion-tributaria/consulta-predios/**` con los 9 filtros de texto + combo Año + checkbox "Mostrar Pisos", grilla de 15 columnas, paginación de 20 y estados loading/empty/error. Enter y padding del código según D6 del design. Tests Vitest. **Checks:** `pnpm --dir frontend exec vitest run <tests del feature>` y `pnpm --dir frontend exec tsc --noEmit`.

- [x] **T05 — Frontend export**: `export-utils.ts` con generación XLS client-side (`xlsx`) de 16/33 columnas según `mostrarPisos` y encabezados del D8 del design; cablear el botón Exportar. Tests Vitest. **Corrección:** la columna `N` ya la emite el backend (`sourceIndex: -1`), así que el builder usa `columns` tal cual y no agrega una segunda numeración (prevalece sobre D7). **Checks:** `pnpm --dir frontend test -- <tests del feature>` y `pnpm --dir frontend exec tsc --noEmit`. Verificado: commit `b80d6a1`, 22/22 tests frontend.

## 3. Cierre

- [x] **T06 — Cierre**: actualizar `openspec/changes/consulta-predios/tasks.md` y `odd/tasks/consulta-predios.md` con la evidencia de commits y checks; verificación final completa. **Checks:** suite completa del feature (Jest + Vitest), typecheck (`tsc --noEmit` de frontend y equivalente backend) y `git status --short --branch` limpio salvo lo pendiente de entrega. Push / PR / merge quedan sujetos a autorización explícita del usuario.
