# Feature: Ver Baja Predio (modal predios de baja)

Legacy: frmbajapredio "Ver Baja Predio" → mantbajapre/consulta (Rentas.sp_Verbaja @busc=5),
Exportar Excel via SheetJS en cliente (grid data), Reporte PDF rptdescargo vía NEXT_PUBLIC_REPORT_URL.

## Scope
- Backend: getBajasPredio(codigo) sp_Verbaja @busc=5, mapa posicional legado:
  codigo[0] anno[1] cod_pred[2] anexo[4] sub_anexo[5] direccion[12]
  fechdescargo[9] fech_declaracion[13] dj_predial[19] codhistorial[20]
- Controller: GET declaracion-jurada/baja-predio/lista?codigo=
- Frontend: action getBajasPredioAction + type VerBajaPredioItem
- Modal ver-baja-predio-modal.tsx (z-[70], useModalStack/isTopModal, sin backdrop-close):
  grid paginado ×10 (cliente), columnas legadas, botón Exportar Excel (SheetJS),
  acción por fila Reporte PDF (nombrereporte=rptdescargo), acción Historial DESHABILITADA
  (faltan controllers cargarhistorialpu/pisos/instalaciones + restaurarregistro).
- Wiring: btnCargabaja "Ver Baja Predio" en declaracion-jurada-detalle-modal.tsx.
- NO commit. Verificación: npx tsc --noEmit backend + frontend.

## Tasks
1. [x] Backend service + endpoint + tipos
2. [x] Frontend action + tipos
3. [x] Modal ver-baja-predio (grid + Excel + PDF; Historial deshabilitado — faltan controllers legados)
4. [x] Wiring btnCargabaja
5. [x] tsc limpio (tambien se reparo import faltante useModalStack/isTopModal en contribuyente-modal.tsx, error preexistente)

Pendiente: historial baja predio requiere controllers rentas/cargarhistorialpu|pisos|instalaciones + restaurarregistro.
