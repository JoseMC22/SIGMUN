# SIGMUN — Reglas de código para revisión

Sistema Integral de Gestión Municipal (SAT ICA). Monorepo: backend NestJS + frontend Next.js, SQL Server con `mssql`, package manager pnpm.

Este archivo es el `.RULES_FILE` de gga: se envía como criterio de revisión en cada commit. Aplicá solo lo que el diff puede violar; no exijas cambios fuera del alcance del commit.

## Prioridad de enforcement (de mayor a menor)

1. Seguridad
2. Contrato API
3. Tipado y lint
4. Validación de datos
5. Testing
6. UI/UX y accesibilidad
7. Observabilidad

Ante conflicto entre reglas, gana la de menor número.

## Reglas duras (bloqueantes)

- **Secretos**: nunca credenciales, tokens, connection strings ni API keys hardcodeadas. Solo variables de entorno tipadas y validadas.
- **SQL**: prohibida la concatenación de input de usuario en queries. Usar parámetros (`request.input(...)`) o query builder.
- **Autorización**: todo endpoint nuevo verifica autenticación y permisos antes de tocar datos. Sin `@Public()` implícito.
- **Contrato API**: respuestas de error con el envelope canónico del proyecto y HTTP status correcto. No inventar formatos nuevos por endpoint.
- **Validación**: todo input externo (body, query, params) se valida con Zod en el boundary y se mapea a dominio. Prohibido pasar `any` a la capa de servicio.
- **Tipado**: prohibido `any` explícito, `as any` y `@ts-ignore` sin justificación documentada. `strict` se respeta.
- **Logs**: sin datos personales, tokens ni cuerpos completos de request. Usar logging estructurado con `correlationId`.

## Testing

- Herramientas: Vitest (frontend) y Jest (backend).
- Todo comportamiento nuevo o corregido llega con su test; bug fix sin test de regresión se rechaza.
- Cobertura objetivo: >= 80% en módulos críticos (auth, cobranza, certificados, pagos).
- Prohibido `test.skip` / `it.only` en código commiteado.

## UI/UX

- Usar los tokens del design system SAT ICA; prohibidos colores y tipografías hardcodeadas fuera de tokens.
- Componentes con foco visible, labels accesibles y contraste WCAG AA.
- No introducir librerías de UI nuevas sin justificación en el commit.

## Proceso

- SDD obligatorio antes de escribir código (excepto typos y renombres mecánicos).
- Multi-agente: leer `odd/OWNERSHIP.md` antes de escribir; un archivo tiene un solo escritor.
- Commits en Conventional Commits, en inglés, sin atribución de IA ni `Co-Authored-By`.
- No mezclar refactors masivos con cambios funcionales en el mismo commit.

## Detalle

Los estándares completos viven en `openspec/standards/`: `ARCHITECTURE.md`, `API.md`, `CODING.md`, `TESTING.md`, `UI-UX.md`.
