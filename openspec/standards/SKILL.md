name: "sigmun-standard"
description: "Aplica los estándares técnicos y de diseño de SIGMUN. Invocar al desarrollar nuevas funcionalidades, diseñar la UI/UX o revisar código del proyecto."

# SIGMUN Estándares Técnicos y de Diseño

Este skill centraliza todos los lineamientos del proyecto SIGMUN (SAT ICA). Cargalo al iniciar cualquier tarea de desarrollo, revisión o diseño para mantener consistencia.

## Archivos de detalle

- `ARCHITECTURE.md` — Clean Architecture, NestJS backend, Next.js frontend, capas
- `UI-UX.md` — Sistema de diseño SAT, colores, tipografía, shadcn/ui, glassmorphism
- `CODING.md` — Convenciones de código, nomenclatura, commits, idioma
- `API.md` — Contratos API, errores canónicos, validación Zod
- `TESTING.md` — Testing con Vitest y Jest, cobertura, patrones

## Regla fundamental (antes que todo)

**SDD es obligatorio antes de escribir código.** No se implementa nada sin pasar por `/sdd-new` primero. Esto aplica a cualquier cambio: features, fixes, refactors, chores. La excepción son cambios triviales (típos, renombres mecánicos).

El flujo correcto es: `/sdd-new "cambio"` → aprobar plan → `/sdd-apply`.

## Enforcement Priority (orden de importancia)

0. **SDD obligatorio:** Planificar antes de codear (ver regla fundamental arriba)
1. **Seguridad:** Autenticación, autorización, inyección SQL, secrets, CSRF
2. **Contrato API:** Error envelope canónico, HTTP codes, Zod validation
3. **Tipado/Lint:** Prohibido `any`, imports limpios, strict mode
4. **Validación:** Zod schemas compartidas, mapeo a dominio
5. **Testing:** >=80% cobertura en módulos críticos
6. **UI/UX:** Colores SAT, tipografía, glassmorphism, accesibilidad WCAG AA
7. **Observabilidad:** Logging estructurado, correlationIds

## Loading instruction

Leer los archivos de detalle relevantes según la tarea antes de escribir código:

- Para **backend**: leer `ARCHITECTURE.md` + `API.md` + `TESTING.md`
- Para **frontend**: leer `ARCHITECTURE.md` + `UI-UX.md` + `API.md` + `TESTING.md`
- Para **código en general**: leer `CODING.md`
