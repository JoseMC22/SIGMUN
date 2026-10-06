# Feature: Reporte Descargo (Baja de Predio) como reporte HTML imprimible

Reemplaza el window.open a rptdescargo Jasper por el patrón de plantillas HTML del
stack (reportes/<Nombre>/ + ReporteViewerModal).

## Scope
- Backend: GET declaracion-jurada/baja-predio/reporte-descargo
  (Rentas.BajasPredio @buscar=2, params codigo/anno/cod_pred/anexo/sub_anexo/dj_predial2;
  mapeo por NOMBRE de columna — los 29 fields del jrxml son el contrato).
- Plantillas: reportes/Descargo/ (plantilla + css + builder + test builder).
- Action: reporte-descargo.ts (lee plantilla, patrón reporte-representantes.ts).
- ver-baja-predio-modal.tsx: botón Reporte abre ReporteViewerModal con el HTML.
- Logo: /logo_sat_2026.jpeg (public).
- NO commit. tsc backend+frontend + vitest del builder.

## Tasks
1. [ ] Backend tipo+service+endpoint (mapa por nombre)
2. [ ] Plantilla HTML+CSS replicando rptdescargo.jrxml
3. [ ] Builder + config PDF + test
4. [ ] Action plantilla + action datos
5. [ ] Wiring botón Reporte → ReporteViewerModal
6. [ ] tsc + tests limpios
