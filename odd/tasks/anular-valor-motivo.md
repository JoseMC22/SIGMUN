# Feature: ver motivo de anulación (anular-valor-motivo)

## Objetivo
En el modal de valores emitidos, las filas con estado `Anulado` muestran botón
"Ver motivo" que abre un modal con el texto del motivo.

## Fuente verificada (sondas read-only 2026-10-07, DEV 192.168.3.205/Base_sigmun)
`Rentas.SP_Mvalores @msquery=14` (rama `mostrar_motivo_anulacion`, SP modificado
hoy 15:57):
```sql
select observacion from RENTAS.MVALORES_MOTIVO
where ID_VALOR = @id_valor and num_val = @num_val and ANO_VAL = @ano_val
```
Params: `@id_valor char(2)`, `@num_val char(7)`, `@ano_val char(4)`. Sin `@codigo`.
Medido: `01/0010975/2025` -> 1 fila `[{observacion: "Se procede a anular..."}]`.
Puede devolver 0..N filas de una sola columna.

## Alcance
- **Backend** `cobranza/anular-valor/`: `POST /motivo` con
  `{IdValor, NumVal, AnoVal}` (mismas longitudes que anular: 2/7/4),
  `service.getMotivo()` -> `string[]` (observacion trim, sin vacíos).
  Sin throw: `{success:false, error}` como `getValores`.
- **Frontend**: action `getMotivoAnulacionAction`; en `valores-modal.tsx`
  botón "Ver motivo" solo si `nestado === 'Anulado'`; modal de solo lectura
  con el texto (o "Sin motivo registrado" si viene vacío). Escape cierra
  el modal superior primero.
- No se toca anular (fase 2) ni el listado.

## TDD / runners (strict_tdd de `sdd-init/sigmun`)
Backend `pnpm --filter backend test` (Jest), frontend `pnpm --filter frontend test`
(Vitest). RED -> GREEN -> REFACTOR con evidencia.

## Criterios de aceptación
1. Solo filas `Anulado` ofrecen "Ver motivo"; Pendiente sigue con anular.
2. El modal muestra el/los textos de `observacion` tal cual los devuelve el SP.
3. Sin motivo (0 filas) muestra mensaje honesto, no error.
4. SP caído -> `success:false` sin throw, la UI muestra error con reintentar.

## Checks
- `npx jest src/cobranza/anular-valor`
- `npx tsc --noEmit` (backend y frontend, 0 errores nuevos en el módulo)
- `npx vitest run` de los specs tocados
- `npx next build` (si el cambio lo amerita; modal ya existe en el output)

## Progreso
- 2026-10-07: doc creado, SP verificado. TDD RED (backend 2 suites no compilaban, frontend 4 failed) -> GREEN.
- Commit pendiente: `POST /motivo` + `getMotivo` + action + botón/modal ver-motivo.

## Resultados de verificación (observados)
- `npx jest src/cobranza/anular-valor`: **37/37** (5 suites; +7 nuevos: 4 getMotivo + 3 dto).
- `tsc --noEmit` backend y frontend: **0 errores** en `anular-valor`/`cobranza`.
- Vitest módulo: **14/14** (motivo 4 + anular 5 + validación 5). Los `*.test.ts` de frontend no se commitean (`.gitignore:50`, convención del repo).
- ESLint no disponible en este entorno (sin `eslint` en root/backend con flat config).
