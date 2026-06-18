# Convenciones de Código — SIGMUN

## Regla Obligatoria: SDD antes de codear

**No se escribe código sin una sesión SDD primero.**

Antes de arrancar cualquier cambio (feature, fix, refactor, chore):

1. Abrir SDD con el agente: `/sdd-new "descripción del cambio"`
2. El agente genera: exploración → propuesta → spec → diseño → tareas
3. **Revisar y aprobar** el plan antes de implementar
4. Recién ahí ejecutar: `/sdd-apply` para implementar

Esto aplica sin importar el tamaño del cambio. Cambios triviales (típos, renombres) pueden saltarlo, pero ante la duda, SDD siempre.

**Para colaboradores que usen IA:** la sesión SDD la maneja el agente automáticamente. Solo tenés que iniciarla con `/sdd-new "lo que necesitás"`.

## Idioma

| Contexto | Idioma |
|----------|--------|
| Código (variables, funciones, clases, archivos, tipos) | Inglés |
| Comentarios en código | Español |
| Texto visible al usuario (UI) | Español |
| Commits | Inglés (conventional commits) |
| Documentación | Español |

## Commits — Conventional Commits

Formato: `tipo(alcance): descripción en presente`

```
feat(perfiles): add edit modal with modulos/accesos tables
fix(login): handle null token on session restore
refactor(seguridad): extract search logic to service
chore(deps): update nestjs to v11
```

**Tipos permitidos:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`

**Reglas:**
- Descripción en presente, máximo 72 caracteres
- No usar `Co-Authored-By` ni atribuciones de IA
- Commits atómicos: un cambio lógico por commit

## Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos TS/TSX | kebab-case | `perfil-edit-modal.tsx` |
| Clases | PascalCase | `PerfilesService` |
| Funciones/variables | camelCase | `getPerfiles()` |
| Interfaces/Types | PascalCase | `PerfilResponse` |
| Carpetas | kebab-case | `perfiles/` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES` |

## Prohibiciones

- ❌ **`any`** — prohibido en producción. Excepción solo en tests con comentario `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- ❌ **Strings concatenados en queries SQL** — siempre usar consultas parametrizadas
- ❌ **`.env` o secrets** en commits
- ❌ **Co-Authored-By** en commits
- ❌ **CSS modules, styled-components** — solo Tailwind CSS v4

## Estructura de archivos

- 1 clase/componente por archivo
- El nombre del archivo refleja la exportación principal
- Tests al lado del archivo que prueban: `perfiles.service.ts` → `perfiles.service.spec.ts`
