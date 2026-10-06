# Feature: Grids de tabs 1ra. Inscripción cargados desde BD (post-guardado)

Replica fiel de los controllers legados Zend: gridpisos (sp_VistaPred @msquery=2),
gridinstalacion (sp_MInstalacion @busc=4), griddocumentos (sp_Docu @msquery=4).

## Scope
- Backend: 3 métodos service + 3 endpoints GET + tipos.
- Frontend: 3 actions + tipos de filas.
- Modal: tras guardar exitosamente, recargar pisos/instalaciones/documentos desde BD
  usando codigo/codPred/anexo/subAnexo devueltos por GuardarPredioResult.
- NO commit. Verificación: npx tsc --noEmit en backend y frontend.

## Tasks
1. [x] Backend service: getPredioPisos / getPredioInstalaciones / getPredioDocumentos
2. [x] Backend controller: GET predio/pisos, predio/instalaciones, predio/documentos
3. [x] Frontend actions + tipos
4. [x] Modal: loadGrids post-save
5. [x] tsc limpio en ambos paquetes

Estado: completado (sin commit; review nativa pospuesta por decisión del usuario).
