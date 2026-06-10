# Guía para Maintainers — SIGMUN

Flujo completo para revisar y fusionar Pull Requests de otros desarrolladores.

---

## Índice

1. [Responsabilidades del maintainer](#1-responsabilidades-del-maintainer)
2. [Recibir un Pull Request](#2-recibir-un-pull-request)
3. [Checklist de revisión](#3-checklist-de-revisión)
4. [Probar los cambios localmente](#4-probar-los-cambios-localmente)
5. [Aprobar o solicitar cambios](#5-aprobar-o-solicitar-cambios)
6. [Fusionar (merge) el PR](#6-fusionar-merge-el-pr)
7. [Limpiar después del merge](#7-limpiar-después-del-merge)
8. [Proteger la rama main (recomendado)](#8-proteger-la-rama-main-recomendado)
9. [Resumen de comandos](#9-resumen-de-comandos)

---

## 1. Responsabilidades del maintainer

- **Revisar PRs en un plazo razonable** (idealmente < 48 hrs hábiles)
- **Verificar que los cambios no rompan funcionalidad existente**
- **Asegurar calidad del código** antes de mergear
- **Mantener el historial de commits limpio**
- **Dar feedback constructivo** — explicar el por qué, no solo el qué

---

## 2. Recibir un Pull Request

Cuando un desarrollador abre un PR, llega una notificación por:

- **Email** (si tenés configuradas las notificaciones de GitHub)
- **Dashboard de GitHub** en https://github.com/JoseMC22/SIGMUN/pulls

### Vista rápida del PR

```bash
# Ver lista de PRs abiertos
gh pr list

# Ver detalles de un PR específico
gh pr view <número>

# Ver los cambios (diff)
gh pr diff <número>
```

---

## 3. Checklist de revisión

Antes de mergear, verificá cada punto:

### Estructura y calidad

- [ ] **Rama correcta** — el nombre sigue `tipo/descripción` (ej: `feat/usuarios-crud`)
- [ ] **Commits atómicos** — cada commit hace una sola cosa
- [ ] **Mensajes de commit** siguen `tipo(alcance): descripción`
- [ ] **Sin archivos basura** — no hay `.env`, `node_modules`, archivos de build
- [ ] **Código en inglés**, comentarios/UI en español

### Funcionalidad

- [ ] **Los tests pasan** — ejecutar localmente (ver sección 4)
- [ ] **No rompe funcionalidad existente** — probar flujos relacionados
- [ ] **Manejo de errores** — los errores no quedan silenciosos
- [ ] **Casos borde cubiertos** — valores vacíos, nulos, caracteres especiales

### Seguridad (crítico)

- [ ] **No hay consultas SQL concatenadas** — usar parámetros
- [ ] **No se exponen datos sensibles** en logs o respuestas de API
- [ ] **Validación en backend** — nunca confiar solo en validación frontend

### Convenciones del proyecto

- [ ] Sigue el `sigmun-standard` skill si está definido
- [ ] Usa los mismos patrones que el resto del código (misma estructura de carpetas, naming, etc.)
- [ ] No introduce dependencias nuevas sin justificación

---

## 4. Probar los cambios localmente

```bash
# 1. Traer la rama del desarrollador
git fetch origin
git checkout <nombre-de-la-rama>

# 2. Instalar dependencias si cambió
pnpm install

# 3. Ejecutar tests
pnpm --filter frontend test
pnpm --filter backend test

# 4. (Opcional) Compilar para verificar TypeScript
pnpm --filter frontend build
pnpm --filter backend build
```

### Si encontrás problemas

```bash
# Ver el diff completo
git diff main...<nombre-de-la-rama>

# Ver commits en la rama
git log main..<nombre-de-la-rama> --oneline

# Ver cambios de un archivo específico
git diff main...<nombre-de-la-rama> -- <archivo>
```

---

## 5. Aprobar o solicitar cambios

### Si todo está bien ✅

1. En GitHub, hacer clic en **"Review changes"**
2. Seleccionar **"Approve"**
3. Agregar un comentario opcional (ej: "LGTM, buen trabajo")
4. Hacer clic en **"Submit review"**

### Si hay cambios necesarios ❌

1. En GitHub, hacer clic en **"Review changes"**
2. Seleccionar **"Request changes"**
3. En el comentario, **explicar qué hay que cambiar y por qué**
4. Ser específico: "En la línea 42 de `archivo.ts`, la validación de email no cubre el caso X"

**Buen feedback:**
- "El manejo de error en `loadCatalogs` no cubre el caso donde el fetch falla. Podemos agregar un `try/catch` como en el resto del módulo."

**Mal feedback:**
- "Esto está mal, arreglalo."

---

## 6. Fusionar (merge) el PR

Una vez aprobado y con todos los checks verdes:

### Opción A: Desde GitHub

1. Ir al PR: `https://github.com/JoseMC22/SIGMUN/pull/<número>`
2. Hacer clic en **"Merge pull request"**
3. Confirmar haciendo clic en **"Confirm merge"**

### Opción B: Desde terminal

```bash
# Merge con commit de merge (recomendado)
gh pr merge <número> --merge \
  --subject "feat(alcance): descripción" \
  --body "PR merged after review"
```

### Estrategias de merge

| Estrategia | Comando gh | Cuándo usarla |
|-----------|------------|--------------|
| **Merge commit** (recomendado) | `--merge` | Mantiene historial completo con el PR como un commit visible |
| **Squash** | `--squash` | Varios commits chicos → un solo commit limpio en main |
| **Rebase** | `--rebase` | Historial lineal, sin commits de merge |

Para este proyecto se recomienda **Merge commit** para mantener trazabilidad de qué PR introdujo cada cambio.

---

## 7. Limpiar después del merge

Después de mergear, eliminá la rama remota:

### Desde GitHub

El mismo botón de merge ofrece **"Delete branch"** — hacer clic.

### Desde terminal

```bash
# Eliminar rama remota
git push origin --delete <nombre-de-la-rama>

# Localmente en tu máquina (opcional)
git branch -d <nombre-de-la-rama>
```

También avisale al desarrollador que puede eliminar su rama local:

```bash
git checkout main
git pull origin main
git branch -d <nombre-de-la-rama>
```

---

## 8. Proteger la rama main (recomendado)

Para evitar que alguien (incluyéndote) pushee directamente a `main`:

1. Ir a: `https://github.com/JoseMC22/SIGMUN/settings/branches`
2. Hacer clic en **"Add branch protection rule"**
3. En **"Branch name pattern"** ingresar: `main`
4. Marcar:
   - ✅ **Require a pull request before merging**
   - ✅ **Dismiss stale pull request approvals when new commits are pushed**
   - ✅ **Require status checks** (si hay CI configurado)
   - ✅ **Do not allow bypassing the above settings**
5. Hacer clic en **"Create"**

Esto fuerza a que **todo** cambio a `main` pase por PR con revisión.

---

## 9. Resumen de comandos

```bash
# Ver PRs pendientes
gh pr list

# Ver detalles de un PR
gh pr view <número>
gh pr diff <número>

# Traer la rama del desarrollador
git fetch origin
git checkout <nombre-de-la-rama>

# Tests
pnpm --filter frontend test
pnpm --filter backend test

# Revisar cambios
git diff main...<nombre-de-la-rama>
git log main..<nombre-de-la-rama> --oneline

# Merge
gh pr merge <número> --merge \
  --subject "feat(alcance): descripción"

# Limpiar
git push origin --delete <nombre-de-la-rama>
git branch -d <nombre-de-la-rama>

# Volver a main
git checkout main
git pull origin main
```

---

## Errores comunes

| Situación | Qué hacer |
|-----------|-----------|
| PR con tests rotos | No mergear. Pedir que los arregle y marcar "Request changes" |
| Rama desactualizada vs main | Pedir al desarrollador que haga `git pull origin main` en su rama |
| Conflictos de merge | Pedir al desarrollador que resuelva los conflictos localmente |
| PR demasiado grande (>400 líneas) | Considerar si se puede dividir en PRs más chicos para facilitar la revisión |
| Dudas sobre la implementación | Preguntar directamente en el PR, no por mensaje privado — así queda documentado |
