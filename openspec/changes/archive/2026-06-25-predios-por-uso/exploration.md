## Exploration: Submenú "Predios por Uso" en Reportes Gerenciales

### Current State

**Menú "Reportes Gerenciales":**
- Es un módulo del sistema que se carga dinámicamente desde la BD vía SP `[Acceso].[sp_LogOut]` con `buscar: 4`
- En el sidebar (`frontend/src/presentation/components/sidebar.tsx`) se mapea al icono `BarChart3` de lucide-react
- **No tiene submenús implementados** — no existe ningún backend module, frontend page, ni server action bajo un path de reportes
- La navegación sidebar es completamente dinámica: carga módulos y submenús desde el backend según permisos del usuario

**Sistema de navegación actual:**
- `frontend/src/actions/menu.ts`: Server actions `fetchModulesAction()` (`GET /menu/modules`) y `fetchSubmenusAction(moduleId)` (`GET /menu/modules/:id/submenus`)
- `backend/src/menu/`: MenuController (3 endpoints) + MenuService (llama a `[Acceso].[sp_LogOut]` con `buscar:4` para módulos, `buscar:8` para submenús)
- Los módulos se cachean 30 min en Redis/memoria via `@nestjs/cache-manager`
- Los submenús retornan: `id`, `title`, `path`, `icon`, `form` — donde `path` es la ruta `dashboard/{path}` en el frontend

**Estado del dominio "Predios por Uso":**
- No existe código relacionado en el proyecto (backend ni frontend)
- La única referencia a "predio" está en strings de prueba (test fixtures) y un placeholder en el dashboard
- No hay módulo backend para catastro, predios, o reportes
- No hay SQL files en el repo — toda la lógica de BD vive en stored procedures existentes en SQL Server

### Affected Areas

**Si el submenú ya existe en la BD:**

| Area | Acción | Descripción |
|------|--------|-------------|
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.controller.ts` | New | Endpoints para el reporte (POST search) con JwtAuthGuard |
| `backend/src/reportes-gerenciales/predios-por-uso/predios-uso.service.ts` | New | Lógica de negocio, llamadas a SP |
| `backend/src/reportes-gerenciales/predios-por-uso/dto/` | New | Zod schema + tipos TypeScript |
| `backend/src/reportes-gerenciales/reportes-gerenciales.module.ts` | New | NestJS module que agrupa los reportes |
| `backend/src/app.module.ts` | Modify | Importar ReportesModule |
| `frontend/src/actions/reportes-gerenciales/predios-uso.ts` | New | Server Action(s) para buscar datos del reporte |
| `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/page.tsx` | New | Página "use client" con tabla, filtros, paginación |
| `frontend/src/app/dashboard/reportes-gerenciales/predios-por-uso/predios-uso.test.tsx` | New | Tests del componente |
| `openspec/standards/` (varios) | Read | Guías de UI/UX, API, Testing |

**Si el submenú NO existe en la BD:**
- Se requiere además una entrada en la tabla de accesos (DB change) para registrar el submenú bajo "Reportes Gerenciales"

### Approaches

1. **Replicar patrón accesos-submenu (recomendado)** — Crear backend completo (controller+service+dto+module) + frontend page monolítica "use client" + server actions
   - Pros: Patrón probado 3 veces (Perfiles, Usuarios, Accesos); estructura clara; consistente con el resto del sistema
   - Cons: Puede ser mucho boilerplate si el reporte es solo de lectura
   - Effort: Medium (~400-500 líneas)

2. **Server Component puro con Server Actions** — Si el reporte es solo lectura (sin estado interactivo complejo), se puede hacer con Server Component + Server Actions para los filtros
   - Pros: Menos código cliente; mejor performance; más simple si no hay interacción compleja
   - Cons: Rompe el patrón existente (todo es "use client"); requiere waterfall de datos
   - Effort: Medium

3. **Backend mínimo + Frontend completo** — Si el SP ya existe y solo requiere un wrapper backend mínimo
   - Pros: Rápido de implementar
   - Cons: Puede ser frágil si el SP cambia; inconsistente con el patrón de capas
   - Effort: Low-Medium

### Recommendation

**Approach 1** — Replicar el patrón exacto de `accesos-submenu`:

- Crear backend module `reportes-gerenciales/` con controller, service, DTOs (Zod schema + tipos), siguiendo la misma estructura que `seguridad/accesos/`
- Crear frontend page monolítica "use client" (como `accesos/page.tsx`) con tabla, filtros, paginación, estados loading/empty/error
- Crear server actions en `frontend/src/actions/reportes-gerenciales/predios-uso.ts`
- Registrar `ReportesModule` en `app.module.ts`

**Requisito previo crítico**: Verificar en BD:
1. Que exista el submenú "Predios por Uso" registrado bajo el módulo "Reportes Gerenciales" en la tabla de accesos
2. Que exista el stored procedure que provee los datos del reporte (o identificar cuál SP usar)
3. Identificar los parámetros y columnas del SP para definir DTOs correctamente

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Submenú no existe en BD | High | Verificar con DBA antes de arrancar; si no existe, incluir script DB en el cambio |
| SP para el reporte no existe o tiene firma distinta | High | Validar SP existente y sus columnas antes de implementar |
| No hay módulo "Reportes Gerenciales" en backend (es solo un módulo de navegación) | Medium | Este es el CASO: crear el módulo `reportes-gerenciales/` desde cero |
| El path del submenú no está definido (no sabemos qué ruta usará) | Medium | Verificar en BD el campo `doform2` del submenú para conocer la ruta exacta |

### Ready for Proposal

**Yes** — con la condición de que se validen los 3 puntos del "Requisito previo crítico" antes o durante la fase de proposal. El orchestrator debe contactar al DBA o verificar la BD para:
1. Confirmar existencia del submenú "Predios por Uso" en la tabla de accesos
2. Identificar el stored procedure que provee los datos
3. Conocer la estructura de columnas que retorna el SP
