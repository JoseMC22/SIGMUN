# Proposal: Nuevo submenú "Accesos" en Seguridad

## Intent

Agregar el submenú "Accesos" bajo Seguridad para listar y buscar registros de acceso del sistema (menús, módulos, objetos), replicando el patrón exacto de Perfiles y Usuarios. Este cambio prepara la base CRUD — los botones de acción (Editar, Eliminar) se renderizan pero no ejecutan lógica.

## Scope

### In Scope
- Página de listado con 5 filtros: Acceso (text), Nombre (text), Menú (select con SP), Módulo (select en cascada), Tipo (fijo M/O)
- Búsqueda paginada vía `[Acceso].[SP_MAcceso]` busc=5 (datos) y busc=6 (totales)
- Carga en cascada Menú→Módulo: Menú via busc=8, Módulo via busc=9 con @id_acceso del menú seleccionado
- Columnas renderizadas: id_acceso, orden, nombre, id_objeto, icono, doform, nestado
- Botones Editar (Pencil) y Eliminar (Trash2) por fila — placeholder sin handler
- Modal `acceso-edit-modal.tsx` — estructura vacía (isOpen, onClose, onSaved, null id)
- Backend completo: controller, service, DTOs, types
- Server Action `accesos.ts`
- Registro en `SeguridadModule`

### Out of Scope
- Lógica de guardar, editar, eliminar accesos
- Modal con formulario de edición real
- Pruebas automatizadas (tests)
- Permisos, roles o validaciones de negocio específicas

## Proposal Question Round

**Assumptions needing your validation:**
1. **Estado (nestado)**: el valor llega como número desde el SP — se mapea a badge "Activo/Inactivo" igual que en Perfiles/Usuarios?
2. **Icono y doform**: se renderizan tal cual como texto en sus columnas, sin componente visual especial?
3. **El modal de edición**: lo creamos con la interfaz vacía (isOpen, onClose, onSaved) pero sin ningún campo interno — correcto?
4. **Navegación sidebar**: el ítem "Accesos" ya existe en el menú del sidebar o hay que agregarlo?

## Capabilities

> Contract between proposal and specs phases. `sdd-spec` reads this to know which spec files to create.

### New Capabilities
- `seguridad-accesos`: listado paginado y búsqueda de accesos del sistema con filtros combinados y cascada Menú→Módulo

### Modified Capabilities
- None

## Approach

Replicar el patrón exacto de Perfiles/Usuarios en archivo y nomenclatura:

1. **Frontend page**: monolítico "use client" con estados (filters, data, loading, error, modal, etc.), search form en Card, grid con colgroup, StatusBadge, paginador, TableSkeleton, empty/error states
2. **Cascada Menú→Módulo**: al montar, fetch Menús vía action. Al cambiar Menú, reset Módulo + refetch con abort de request anterior
3. **Backend**: Controller `@Controller('seguridad/accesos')` + Service con `executeProcedure` para busc=5/6/8/9. Zod DTO opcional para búsqueda, tipos separados
4. **Server Action**: wrapper tipado que serializa cookies y llama al backend POST search

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/app/dashboard/seguridad/accesos/page.tsx` | New | Listado completo con filtros, grid, paginación |
| `frontend/src/app/dashboard/seguridad/accesos/acceso-edit-modal.tsx` | New | Modal placeholder |
| `frontend/src/actions/accesos.ts` | New | Server Actions (search, fetchMenus, fetchModulos) |
| `backend/src/seguridad/accesos/accesos.controller.ts` | New | POST search, GET menus, GET modulos |
| `backend/src/seguridad/accesos/accesos.service.ts` | New | Lógica de SPs y paginación |
| `backend/src/seguridad/accesos/dto/search-acceso.dto.ts` | New | Zod schema: id_acceso?, nombre?, menu?, pantalla?, orden?, page, pageSize |
| `backend/src/seguridad/accesos/dto/accesos.types.ts` | New | SpAccesoRow, AccesoRow, PaginatedResponse, MenuOption, ModuloOption |
| `backend/src/seguridad/seguridad.module.ts` | Modified | Importar AccesosModule o registrar controller+service |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SP `[Acceso].[SP_MAcceso]` no existe o firma distinta | Med | Validar SP existente antes de arrancar implementación |
| Race condition en cascada Menú→Módulo | Bajo | AbortController + ref跳过 si cambia antes de responder |
| El busc=8/9 retorna columnas distintas a las esperadas | Bajo | Verificar columnas `id_acceso, nommenu` en busc=8 antes de escribir frontend |

## Rollback Plan

Revertir el commit del cambio. No hay migraciones de BD, cambios en tablas existentes, ni modificaciones a otros módulos — rollback es limpio vía `git revert`.

## Dependencies

- SP `[Acceso].[SP_MAcceso]` debe existir en BD con busc=5,6,8,9 funcionales
- Convención de `DatabaseService.executeProcedure()` ya implementada y probada

## Success Criteria

- [ ] Página carga con filtros vacíos y tabla paginada con datos reales
- [ ] Select Menú se puebla al cargar (busc=8), Módulo se inicializa vacío
- [ ] Al seleccionar un Menú, Módulo se repuebla (busc=9 con @id_acceso)
- [ ] Búsqueda con cualquier combinación de filtros retorna datos correctos
- [ ] Paginación navega correctamente (anterior/siguiente/páginas)
- [ ] Botones Editar y Eliminar se renderizan en cada fila sin error
- [ ] Modal de edición se abre/cierra sin error
