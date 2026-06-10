# Guía para Desarrolladores — SIGMUN

Flujo completo para trabajar en una funcionalidad: desde clonar el proyecto hasta crear un Pull Request.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Solicitar acceso al proyecto](#2-solicitar-acceso-al-proyecto)
3. [Clonar el repositorio](#3-clonar-el-repositorio)
4. [Antes de empezar: verificar la rama actual](#4-antes-de-empezar-verificar-la-rama-actual)
5. [Crear una rama de feature](#5-crear-una-rama-de-feature)
6. [Implementar los cambios](#6-implementar-los-cambios)
7. [Ejecutar tests](#7-ejecutar-tests)
8. [Revisar los cambios](#8-revisar-los-cambios)
9. [Hacer commit](#9-hacer-commit)
10. [Subir la rama y crear PR](#10-subir-la-rama-y-crear-pr)
11. [Después del merge](#11-después-del-merge)
12. [Resumen de comandos](#12-resumen-de-comandos)

---

## 1. Requisitos previos

- **Git** instalado
- **pnpm** instalado (`npm install -g pnpm`)
- **Node.js** >= 18
- Acceso al repositorio en GitHub: `https://github.com/JoseMC22/SIGMUN`
- (Opcional) **GitHub CLI** (`gh`) para crear PRs desde terminal

---

## 2. Solicitar acceso al proyecto

1. Crear una cuenta en [GitHub](https://github.com) si no tenés una.
2. Enviar tu nombre de usuario de GitHub al maintainer del proyecto.
3. El maintainer te agregará como colaborador al repositorio.
4. Una vez agregado, aceptar la invitación desde tu email o desde https://github.com/JoseMC22/SIGMUN/invitations

---

## 3. Clonar el repositorio

```bash
git clone https://github.com/JoseMC22/SIGMUN.git
cd SIGMUN
pnpm install
```

Esto descarga el proyecto y todas sus dependencias.

---

## 4. Antes de empezar: verificar la rama actual

**REGLAS IMPORTANTES:**

- **NUNCA trabajes directamente sobre `main`** — siempre usá una rama de feature.
- **Siempre verificá en qué rama estás** antes de empezar a programar.

```bash
git branch --show-current
# → debe mostrar "main"

git pull origin main
# → asegurate de tener la última versión
```

Si estás en `main` y tenés cambios sin commitear:

```bash
# 1. Creá una rama nueva (los cambios se llevan con vos)
git checkout -b feat/mi-funcionalidad

# 2. Verificá que los cambios estén en la nueva rama
git status
```

---

## 5. Crear una rama de feature

```bash
git checkout -b <tipo>/<descripcion>
```

Ejemplos:

| Tipo | Cuándo usarlo | Ejemplo |
|------|--------------|---------|
| `feat` | Nueva funcionalidad | `feat/reporte-asistencia` |
| `fix` | Corrección de bug | `fix/error-login-null` |
| `refactor` | Refactorización | `refactor/extraer-servicio-auth` |
| `chore` | Mantenimiento / tooling | `chore/actualizar-dependencias` |
| `docs` | Documentación | `docs/guía-despliegue` |

**Regla:** usar minúsculas y guiones, sin espacios.

> **NOTA:** Anteriormente se trabajó accidentalmente en `main`. Para evitarlo, el [Maintainer](MAINTAINER_WORKFLOW.md) puede
> [proteger la rama](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
> para que nadie pueda pushear directamente.

---

## 6. Implementar los cambios

Ahora estás en tu rama de feature con `main` como base. Podés:

- **Crear archivos nuevos**
- **Modificar archivos existentes**
- **Eliminar archivos**

En cualquier momento podés ver el estado:

```bash
git status
# Muestra archivos modificados (rojo = sin stage, verde = stageado)
```

### Buenas prácticas

- **Commits pequeños y atómicos** — un commit por cambio lógico.
- **Tests primero** si el proyecto lo exige (Strict TDD).
- **Código en inglés**, comentarios y UI en español.

---

## 7. Ejecutar tests

Antes de commitear, siempre ejecutar los tests:

```bash
# Frontend (Vitest)
pnpm --filter frontend test

# Backend (Jest)
pnpm --filter backend test
```

Todos los tests deben pasar. Si fallan, corregí antes de continuar.

---

## 8. Revisar los cambios

Antes del commit, revisá qué vas a incluir:

```bash
# Archivos cambiados (resumen)
git status

# Contenido de los cambios
git diff

# Archivos nuevos (untracked)
git status --short
```

Preguntate:
- ¿Estoy incluyendo archivos que no debería (`.env`, `node_modules`, builds)?
- ¿Los mensajes de commit describen claramente el cambio?
- ¿Los tests pasan?

---

## 9. Hacer commit

```bash
git add -A
# o: git add <archivo1> <archivo2> (para stage selectivo)

git commit -m "tipo(alcance): descripción breve"

# Ejemplo:
git commit -m "feat(seguridad): add Usuarios CRUD with edit modal"
```

### Formato del mensaje

```
tipo(alcance): descripción en presente
```

| Parte | Descripción | Ejemplo |
|-------|-------------|---------|
| `tipo` | `feat`, `fix`, `refactor`, `chore`, `docs` | `feat` |
| `(alcance)` | Módulo afectado (opcional) | `(seguridad)` |
| `descripción` | Verbo en presente, máximo 72 caracteres | `add Usuarios CRUD` |

No usar `Co-Authored-By` ni atribuciones de IA en los commits.

---

## 10. Subir la rama y crear PR

### Subir la rama al remoto

```bash
git push -u origin <nombre-de-la-rama>
```

Esto sube tus commits a GitHub y muestra un link para crear el PR.

### Crear el Pull Request

#### Opción A: Desde GitHub (recomendado)

1. Abrí el link que apareció en el output del `git push`
2. Completá el formulario:
   - **Título:** mismo formato que el commit
   - **Descripción:** resumí qué hace el PR y por qué
3. Hacé clic en **"Create Pull Request"**

#### Opción B: Desde terminal con GitHub CLI

```bash
# Primera vez: autenticar
gh auth login

# Crear PR
gh pr create \
  --title "feat(alcance): descripción" \
  --body "## Resumen

Descripción de los cambios.

## Test Plan

- [ ] Tests pasan
- [ ] Probado manualmente"
```

#### Opción C: Desde el link directo

GitHub también genera un link directo después del push:
```
https://github.com/JoseMC22/SIGMUN/pull/new/<nombre-de-la-rama>
```

### ¿Qué debe contener el PR?

1. **Título claro** con el formato `tipo(alcance): descripción`
2. **Resumen** de los cambios
3. **Tabla de archivos** modificados (opcional pero útil)
4. **Test Plan** — qué verificaste antes de abrir el PR

---

## 11. Después del merge

Cuando el maintainer apruebe y mergee tu PR:

```bash
# Volver a main
git checkout main

# Traer los cambios mergeados
git pull origin main

# Eliminar la rama local (ya no sirve)
git branch -d <nombre-de-la-rama>

# Eliminar la rama remota
git push origin --delete <nombre-de-la-rama>
```

---

## 12. Resumen de comandos

```bash
# Inicio
git clone https://github.com/JoseMC22/SIGMUN.git
cd SIGMUN
pnpm install

# Cada feature
git checkout main
git pull origin main
git checkout -b feat/mi-feature

# Trabajar... (editá archivos)
git status
git diff

# Tests
pnpm --filter frontend test
pnpm --filter backend test

# Commit
git add -A
git commit -m "feat(alcance): descripción"

# Push + PR
git push -u origin feat/mi-feature

# Después del merge
git checkout main
git pull origin main
git branch -d feat/mi-feature
git push origin --delete feat/mi-feature
```

---

## Errores comunes y cómo evitarlos

| Error | Causa | Solución |
|-------|-------|----------|
| Trabajar en `main` | No verificar rama | `git branch --show-current` antes de empezar |
| Tests que no pasan | Commitear sin testear | Siempre ejecutar `pnpm test` antes del commit |
| Merge conflicts | No actualizar rama | `git pull origin main` en tu rama de feature |
| PR sin descripción | Ir al grano | Escribir al menos 3 líneas explicando qué y por qué |
