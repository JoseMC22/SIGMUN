# Feature: ESC cierra solo el modal activo (pila de modales en todo el frontend)

Bug reportado por el usuario: al presionar ESC se cierra todo hasta el padre. Modales que
manejan Escape sin registrarse en la pila (use-modal-topmost.ts) hacen que el padre crea
ser el tope y se cierre; el root-div onKeyDown ESC es ambiguo para modales anidados.

## Scope
- Frontend: 28 modales sin pila + overlays inline en páginas (delete-confirm/pass).
- Convención del proyecto (use-modal-topmost.ts): useModalStack + window listener +
  isTopModal; remover la rama ESC del root-div onKeyDown (conservar Enter en via-busqueda).
- NO tocar: los 12 modales de declaracion-jurada que ya cumplen, el hook (sin cambio de
  API), tests, backend.
- NO commit. Verificación: npx tsc --noEmit en frontend.

## Tasks
1. [x] Writer: receta aplicada a los 28 modales sin pila
2. [x] Overlays inline en páginas con pila propia
3. [x] tsc limpio en frontend

Estado: completado (sin commit, decisión del usuario). Verificación independiente (gentle-ai-verify):
PASS — rules of hooks OK en los 46 archivos, cero Escape sin gate, cero document.addEventListener;
tests: 5 suites de ESC pasando (jsdom propaga a window). Drift pre-existente corregido en
modal-generar.test.tsx (columnas Año/Fecha de Inspeccion/Motivo/Accion y Editar → abre nueva carta)
e import useCallback huérfano removido en contribuyente-modal.tsx. Nota no bloqueante:
el popup de búsqueda de crear-alcabala-modal depende del orden de montaje (sin focus management).
