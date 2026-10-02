# Feature: Tabs 1ra. Inscripción — verificación contra vistas legado y mejoras de diseño

Verificación de las 6 vistas legado (ubicacion_pu, predios_pu, predios_pisos,
predios_instalac, predios_arbitrios, predios_docnexo) contra primera-inscripcion-modal.tsx.
Alcance: aplicar mejoras. NO commit. Verificación: npx tsc --noEmit en frontend.

## Tasks
1. [x] Nro. Pisos readonly en Características (campo legado faltante, display-only)
2. [x] Decimales: prop decimal en NumInp para áreas/%/frontis y dimensiones de grids (regresión vs máscara CampoDinero del legado)
3. [x] Validación % Propiedad/Construcción entre 0 y 100 (data-v-min/max del legado)
4. [x] Panel de referencia tipos de edificación (1)-(7) colapsable en Construcciones (mejora de diseño)
5. [x] tsc limpio en frontend

Estado: completado (sin commit, decisión del usuario). Pendiente (fuera de alcance): panel de
valoración del piso (Valor Unit./Incremento/Depreciación) necesita endpoint rentas/valorpiso —
no existe en el backend; trabajo separado.
