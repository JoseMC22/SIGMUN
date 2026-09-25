# Feature: Contribuyentes sin Valores Tributarios (`contribuyentes-sin-valores`)

## Cambio en curso (pedido del usuario 25/09)
- Nueva pantalla dentro del menú **Cobranza De Deuda** (`04.00.00`): "Contribuyentes sin Valores
  Tributarios", ruta `cobranza/contribuyentes_sin_valores` (ya registrada en BD como
  `id_acceso='04.13.00'`, `doform2='cobranza/contribuyentes_sin_valores'`, perfil `0000001` con acceso).
- Ejecuta `EXEC RENTAS.SP_MVALORES @msquery = 13, @ano_val = '<año>'`.
- El usuario pide interfaz similar a `predios-contribuyentes`: botón **Procesar** + tabla de
  resultados + combo de años **2000 → año actual** (descendente) cuyo valor se envía al SP.

## Objective
Implementar la pantalla "Contribuyentes sin Valores Tributarios" dentro de Cobranza De Deuda
(`cobranza/contribuyentes_sin_valores`), replicando el patrón de `predios-contribuyentes`:
sección botón **Procesar** + sección tabla de resultados paginada + botón **Exportar a Excel**.

## Problem / Why
El usuario necesita listar los contribuyentes con recibos cobrables pero **sin valores tributarios**
registrados (predial) para un año seleccionable. La consulta ya existe en el SP
`Rentas.sp_Mvalores` (branch `contribuyentes_sin_valor_por_año`, `msquery=13`); falta exponerla por
HTTP y construir la vista.

## Scope
- **Consulta exacta del SP** (`IF @MSQUERY = 13 GOTO contribuyentes_sin_valor_por_año`):
  - Fuente: `CAJA.MRECIBOS` (estado '0', tipo/tipo_rec '02.01', `ANNO = @ano_val`) con `NOT EXISTS`
    de valores prediales (`RENTAS.MVALORES` `ID_VALOR='01'`, `NESTADO=1`, mismo `CODIGO`/`ANNO`/`TIPO_REC`).
  - 11 columnas: `Codigo, Categoria, Nombre, Direccion, Junta, Anno, periodos, TOTAL_INSOL,
    TOTAL_INTERES, TOTAL_COSTO_EMIS, TOTAL_GENERAL`.
  - Sin paginación en BD → **paginación en memoria** (patrón predios-contribuyentes).
  - Verificado en BD real: **28.060 filas** para `@ano_val='2023'` (evidencia msquery=13 ejecutado).
  - `@ano_val` es `char(4)` — siempre se envía; un año sin datos devuelve 0 filas.
- Backend: módulo Nest `backend/src/cobranza/contribuyentes-sin-valores/`
  (module, controller, service, DTO/types, spec), registrado en `app.module.ts`.
  Ruta HTTP: `POST /api/cobranza/contribuyentes-sin-valores/search`.
  Contrato: `{ success, data, total, page, pageSize, totalPages }`.
- Frontend: `frontend/src/actions/cobranza/contribuyentes-sin-valores.ts` (server action con
  `authFetch`) + página `frontend/src/app/dashboard/cobranza/contribuyentes_sin_valores/page.tsx`
  con sección botón Procesar + sección tabla resultados + export Excel.
  Combo de años: **2026 (año actual) → 2000** descendente, default año actual.

## Constraints
- Seguir el patrón de `predios-contribuyentes` (estructura, `JwtAuthGuard`, manejo de errores
  `{ success, error }`, paginación en memoria en el service, mapeo null → ''/0).
- Export a Excel: patrón predios-contribuyentes — re-consulta completa con `pageSize` modo export
  (`100000`), dynamic import `xlsx`, 11 columnas en español, archivo
  `contribuyentes-sin-valores-YYYY-MM-DD.xlsx`.
- `pageSize` DTO = selector de modo: `20` grilla / `100000` export (patrón canónico; NUNCA `.max(100)`).
- Idioma: UI/errores/comentarios/commits en español; identificadores en inglés.
- No exponer credenciales de BD.
- Ejecutar SIEMPRE vía `this.db.executeProcedure('Rentas.sp_Mvalores', { msquery: 13, ano_val })`.
  `@ano_val` es `char(4)`: enviar string de 4 dígitos.

## Delivery strategy
- **feature-branch-chain** (cacheado de la sesión): traker `feat/contribuyentes-sin-valores`
  acumula el estado final; slices desde merge-base DEV con diff limpio; solo el traker mergea a DEV.
- Forecast autorizado: backend ~230 líneas (BE) + frontend ~520 (FE) → excede 400, justifica
  slices BE/FE.
- TDD: modo estándar; runners: backend Jest + build, frontend Vitest + tsc + lint.

## Tasks
- [x] **T1 — Backend contribuyentes-sin-valores**: crear module/controller/service/DTO+types/spec
      en `backend/src/cobranza/contribuyentes-sin-valores/`, registrar en `app.module.ts`.
      Endpoint POST `search` (paginado en memoria sobre
      `executeProcedure('Rentas.sp_Mvalores', { msquery: 13, ano_val })`).
      Checks: jest spec local 10/10 pass (spot check orquestador), `npm run build` exit 0,
      tsc 0 nuevos (backend baseline 25), eslint 0 en archivos nuevos. Autorizado.
      Commit: work-unit en rama `feat/contribuyentes-sin-valores`.
- [ ] **T2 — Frontend contribuyentes-sin-valores**: server action + página con sección botón
      Procesar y sección tabla resultados (11 columnas) + paginación + botón Exportar a Excel
      (re-consulta completa con 100000, `xlsx` dynamic import, `exportSeq` anti-carrera).
      Combo de años 2026→2000 descendente, default año actual, enviado en Procesar y Export.
      Checks: tsc 12 errores = baseline (0 nuevos), eslint 0 en archivos nuevos, vitest 18/203
      = baseline (sin regresión), spot check orquestador. Commit work-unit en la rama.

## Route declaration
- Exploración: orquestador inline (SP verificado en BD, menú 04.13.00 verificado, patrón frontend leído).
- T1: delegated writer (general) — 6 archivos (5 nuevos + app.module).
- T2: delegated writer (general) — 2 archivos.

## Acceptance criteria
- La consulta devuelve las 11 columnas del SP en el orden dado, paginada.
- La página muestra botón Procesar, combo de años 2000→año actual descendente, tabla de
  resultados paginada y export Excel.
- Backend protegido con JwtAuthGuard; respuestas con contrato `{ success, data/error }`.
- Tests backend verdes; frontend compila y pasa lint.

## Next step
- T1 y T2 pendientes de ejecución (rama `feat/contribuyentes-sin-valores` creada desde DEV).