# Cargo de Notificación — Tipo de Valor "Resolución de Gerencia"

## Objetivo
Soportar el tipo de valor **Resolución de Gerencia** (id_valor `20`, ya existente en `Contenedor.TblTipo_valor`) en la pantalla Cargos de Notificación, con un flujo manual que no pasa por la validación del valor tributario.

## Problema / Por qué
El tipo de valor existe en BD pero la pantalla lo trata como un valor tributario normal: Nro/Año Cargo derivados y readonly, monto del SP de validación, y Código de contribuyente readonly solo llenable vía Validar. Para una resolución no hay valor tributario que validar: el usuario debe cargar los datos manualmente.

## Alcance
1. Backend: endpoint `POST /notificaciones/cargos-notificaciones/contribuyente` que ejecuta la query provista por el usuario contra `rentas.mcontribuyente` con parámetro `@codigo`.
2. Frontend: server action `buscarContribuyenteAction(codigo)`.
3. Frontend página: lógica condicional cuando el tipo de valor seleccionado es "Resolución de Gerencia":
   - Labels "Nro Valor" → "Nro Resol.", "Año Valor" → "Año Resol".
   - Cajas "Nro Cargo" y "Año Cargo" editables (dejan de ser derivadas/readonly).
   - Monto forzado a 0.
   - Texto "Código" editable + botón "Buscar" que llena contribuyente, documento identidad y dirección desde la query.
4. Guarda de UX: botón "Validar" deshabilitado para Resolución de Gerencia (evita que borre datos manuales con "No se encontró el valor").

## Fuera de alcance
- Cambios a la BD (el tipo ya existe).
- Modificación del flujo normal de los demás tipos de valor.
- Flujo de subida a NAS.

## Decisiones
- Detección de "Resolución de Gerencia" por **nombre normalizado** (`nomb_val` del combo, sin tildes, case-insensitive) → evita hardcodear el id 20 y soporta cualquier BD de municipio.
- El campo Código editable + búsqueda: **solo para Resolución de Gerencia** (decisión explícita del usuario; el flujo normal mantiene Validar → readonly).

## Tasks
- [x] T1 (backend): tipos + DTO `buscar-contribuyente` + service `buscarContribuyente` + route POST `contribuyente`.
- [x] T2 (backend): tests del service para `buscarContribuyente` (mock + row + sin resultados + error).
- [x] T3 (frontend): action `buscarContribuyenteAction` con tipos.
- [x] T4 (frontend): página — detección esResolucionGerencia, labels condicionales, numCargoManual, año cargo editable, monto 0, código editable + botón Buscar, guardas Validar/grabar, resetForm.

## Criterios de aceptación
- Con tipo Resolución de Gerencia: labels "Nro Resol."/"Año Resol", Nro/Año Cargo editables, monto muestra 0, Código editable, botón Buscar llena contribuyente/doc/dirección, Validar deshabilitado.
- Con cualquier otro tipo: comportamiento actual intacto (Validar, readonly, monto del SP).
- Payload de grabar: `monto: 0` para resol; `num_cargo` y `ano_cargo` con los valores manuales.

## Checks aplicables
- Backend: `npm test` (jest) en backend; `npm run build` (tsc vía nest build).
- Frontend: `npm run build` (tsc) en frontend.
- Baselines conocidas: frontend tsc 12; vitest 18 failed / 203 passed (sin tocar). Backend tsc 25.

## Progreso
- T1–T4 implementados y verificados (28/28 tests backend incl. 3 nuevos; backend build OK; frontend tsc sin errores nuevos — siguen solo los 12 del baseline).
- Desviación de ruta: el task tool reportó "Bad Request: big-pickle" pero el subagent **sí se ejecutó en paralelo**, escribiendo el spec completo; además se aplicaron edits inline del orquestador → el subagent y el orquestador escribieron la misma feature en paralelo (duplicados en service/controller/types/actions/spec, + JSX faltante). Resuelto: se eliminaron los duplicados y se completaron inline los edits JSX faltantes (Validar disabled, Nro/Año Cargo editables, Monto `montoDisplay`, Código + botón Buscar). Queda pendiente de reportar al usuario el problema de modelo en el dispatch de subagents.
- Commit: aún no — el usuario decide commit/push/PR a DEV.

## Evidencia
- T1: `backend/src/.../dto/buscar-contribuyente.dto.ts` (nuevo), types `ContribuyenteRow`/`ContribuyenteResult`, service `buscarContribuyente`, controller `POST contribuyente` — `npm run build` OK.
- T2: spec `cargos-notificaciones.service.spec.ts` (+3 tests) — `npm test -- --testPathPatterns "cargos-notificaciones" --silent` → 28 passed, 28 total.
- T3: `frontend/src/actions/.../cargos-notificaciones.ts` — `buscarContribuyenteAction` + tipos.
- T4: `page.tsx` — `npx tsc --noEmit` → 12 errores baseline (alcabala/mantenimiento-uit tests), 0 en cargos-notificaciones.
- Query validada en BD (read-only) con sqlcmd: muestra fila para codigo 0296529; id_valor 20 activo para 2026.