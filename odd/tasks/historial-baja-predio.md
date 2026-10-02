# Feature: Historial Baja Predio — fase 2 (grids con datos + Restaurar)

SP: [Rentas].[BajasPredio] @buscar=5 (PU) / 6 (pisos) / 7 (instalaciones)
con @codhistorial; restaurar @buscar=8 (@codhistorial=cod_baja, @anno=anno fila,
@cod_pred/@anexo/@sub_anexo/@codigo cabecera, @annobaja=año cabecera,
@usuariorestaura, @pcrestaura). Respuesta restaurar: row[0]=='Exito' → success+row[1].
Mapeos posicionales: ver controllers legados (PU 0-18, pisos 0-23, instal 0-20).
PU: legacy bug porc_propiedad vs porcen_propiedad → usamos porc_propiedad (dato real).
Restaurar: confirm + lazo por fila, cierre y refetch del padre si todo ok.

## Tasks
6. [x] Backend 3 grids + restaurar (tipos/SP/endpoints)
7. [x] Frontend actions (3 grids + restaurar)
8. [x] Modal: cargar grids, habilitar Restaurar con ConfirmDialog
9. [x] Wiring onRestored en ver-baja modal
10. [x] tsc backend limpio; frontend limpio para archivos de este feature
      (bloqueado globalmente por historial-predio-modal.tsx de opencode: JSX roto L97/L211)

Legacy: rentas/historicobajapredio popup (frmbajapredio + js_historicobajapredio.js).

## Scope fase 1
- Backend: GET declaracion-jurada/baja-predio/historial-cabecera
  · sp_rentasmain @buscar=3 @codigo → nombre contribuyente = row[1] (posicional)
  · sp_rentasmain @buscar=9 @codigo/@cod_pred/@anno/@anexo/@sub_anexo → direccion = row[0]
- Modal historial-baja-predio-modal.tsx: fieldset "Datos Generales del Predios:"
  (Código, Contribuyente, Código Pred., Anexo "xxxx-xxxx", Dirección Pred., Año),
  3 grids con TODAS las columnas legadas (PU 19, Pisos 25, Instalaciones 21),
  checkbox multi en grid PU (checkOnly) que resalta filas por anno en Pisos/Instalaciones,
  botón Restaurar DESHABILITADO (pending restaurarregistro), Cerrar.
- Grids sin datos por ahora (estado "pendiente de contrato SP" hace wired luego).
- Wiring: habilitar ícono Historial en ver-baja-predio-modal (abre este modal con la fila).
- Convenciones modales (z > ver-baja, useModalStack/isTopModal, sin backdrop close).

## Tasks
1. [ ] Backend cabecera (buscar 3 + 9) + tipos
2. [ ] Action cabecera
3. [ ] Modal historial (cabecera + 3 grids + highlight por año + restaurar disabled)
4. [ ] Wiring ícono historial en ver-baja modal
5. [ ] tsc limpio
