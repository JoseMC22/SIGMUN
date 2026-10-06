# Feature: Valorización del piso (1ra. Inscripción) — réplica del legado rentas/valorpiso

Réplica fiel del controller legado Zend valorpisoAction: rentas.calculo_piso @msquery=1,
16 params (el legado leía @mes pero NUNCA lo pasaba al SP), @estado=1 fijo, areacons sin
comas y float, areacom vacío → incompleto (el legado echo "*"), 5 columnas posicionales.
Panel readonly de 7 campos en el tab Construcciones, mostrado al click en una fila del grid
(vía viva del legado: itemclick → valorpiso; el calcValorPiso del JS era código muerto).

## Scope
- Backend: 1 método service (getValorPiso) + 1 endpoint GET predio/valorpiso + tipos.
- Frontend: 1 action (getValorPisoAction) + panel de valorización en el tab 2.
- Panel: Valor Unit., Valor A. Const. (=col 5), Incremento, Valor A. Com. (=0.00 fijo, como
  el legado), Depreciación, Valor del Piso (=col 5, como el legado), Valor Unit. Deprec.
- NO commit. Verificación: npx tsc --noEmit en backend y frontend.

## Tasks
1. [x] Backend service: getValorPiso (rentas.calculo_piso @msquery=1)
2. [x] Backend controller: GET predio/valorpiso
3. [x] Frontend action + tipos
4. [x] Modal: panel de valorización al click en fila de pisos
5. [x] tsc limpio en ambos paquetes (mis archivos cero errores; ver estado)

Estado: completado (sin commit, decisión del usuario). Verificación: 6/6 piezas por grep,
backend tsc exit 0, mis 2 archivos frontend con cero errores. BLOQUEANTE fuera de alcance:
historial-predio-modal.tsx (untracked, trabajo en curso de la sesión concurrente pi agent)
queda roto (TS2657/TS17008) y bloquea el gate tsc a nivel repo — esa sesión debe
terminarlo. Pendiente: verificación runtime del SP rentas.calculo_piso (sin DB desde aquí).
