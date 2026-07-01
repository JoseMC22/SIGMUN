# Guía para Desarrolladores — SIGMUN

Flujo completo para laburar: desde clonar el proyecto hasta crear un Pull Request y arrancar la siguiente feature.

---

## Índice

1. [Estructura del repo](#1-estructura-del-repo)
2. [Primera vez: clonar e instalar](#2-primera-vez-clonar-e-instalar)
3. [Antes de arrancar una feature](#3-antes-de-arrancar-una-feature)
4. **[\*OBLIGATORIO\*] Sesión SDD antes de codear](#4-obligatorio-sesión-sdd-antes-de-codear)**
5. [Crear una rama de feature](#5-crear-una-rama-de-feature)
6. [Laburar y commitear](#6-laburar-y-commitear)
7. [Subir la rama y crear PR](#7-subir-la-rama-y-crear-pr)
8. [Después del merge: limpiar](#8-después-del-merge-limpiar)
9. [Arrancar otra feature nueva](#9-arrancar-otra-feature-nueva)
10. [Resumen de comandos](#10-resumen-de-comandos)
11. [Errores comunes](#11-errores-comunes)

---

## 1. Estructura del repo

```
main  (producción)   → protegida, solo el maintainer mergea acá
  └── DEV (integración)  ← acá van todos los PRs de features
        └── feat/modulo_usuarios  ← tu rama de feature
        └── fix/error-login       ← tu rama de fix
```

**REGLAS DE ORO:**

- ❌ **NUNCA trabajes directo sobre `main`** — está protegida, no podés pushear igual
- ❌ **NUNCA crees una rama desde `main`** — siempre desde `DEV`
- ✅ **Siempre creás tu rama desde `DEV`** y el PR va contra `DEV`
- ✅ **El maintainer se encarga de mergear `DEV` a `main`** cuando todo anda bien

---

## 2. Primera vez: clonar e instalar

```bash
git clone https://github.com/JoseMC22/SIGMUN.git
cd SIGMUN
pnpm install (en caso error ejecutar npx pnpm install)
```

Configurar identidad (solo la primera vez):

```bash
git config user.name "Tu Nombre"
git config user.email "tu@email.com"
```

---

## 3. Antes de arrancar una feature

Prate siempre en `DEV` y traé los últimos cambios:

```bash
git checkout DEV
git pull origin DEV
```

Verificá que estás bien parado:

```bash
git branch --show-current
# → debe mostrar "DEV"
```

Los comandos de arriba los repetís **cada vez que arrancás una feature nueva**.

---

## 4. [OBLIGATORIO] Sesión SDD antes de codear

**No se escribe código sin planificar primero con SDD.**

Cuando tengas que hacer un cambio (feature, fix, refactor, lo que sea), lo primero es abrir SDD con el agente:

```
/sdd-new "descripción de lo que necesito hacer"
```

El agente se encarga de:
1. Explorar el código existente
2. Generar una propuesta con alcance y enfoque
3. Escribir la especificación técnica
4. Diseñar la solución
5. Romper el cambio en tareas concretas

**Una vez que revisás y aprobás el plan**, recién ahí pasás al paso siguiente.

> Si el cambio es mínimo (corregir un típo, renombrar una variable), podés saltar SDD. Pero ante la duda, SDD siempre.

---

## 5. Crear una rama de feature

Desde `DEV`, creá tu rama:

```bash
git checkout -b <tipo>/<descripcion>
```

Siempre con **minúsculas y guiones**, sin espacios.

| Tipo | Cuándo usarlo | Ejemplo |
|------|--------------|---------|
| `feat` | Nueva funcionalidad | `feat/reporte-asistencia` |
| `fix` | Corrección de bug | `fix/error-login-null` |
| `refactor` | Refactorización | `refactor/extraer-servicio-auth` |
| `chore` | Mantenimiento / tooling | `chore/actualizar-dependencias` |
| `docs` | Documentación | `docs/guia-despliegue` |

Ejemplo completo:

```bash
git checkout DEV
git che
git checkout -b feat/modulo-usuarios
```

Ya estás en tu rama, listo para laburar.

---

## 6. Laburar y commitear

Hacé tus cambios, después verifico el estado:

```bash
git status
git diff
```

### Ejecutar tests antes de commitear

```bash
# Frontend (Vitest)
pnpm --filter frontend test

# Backend (Jest)
pnpm --filter backend test
```

Si los tests fallan, corregí antes de continuar.

### Hacer commit

```bash
git add -A
git commit -m "tipo(alcance): descripción en presente"
```

Ejemplos:

```
feat(seguridad): add Usuarios CRUD with edit modal
fix(login): handle null token on session restore
refactor(perfiles): extract search logic to service
```

Formato: `tipo(alcance): descripción`. Máximo 72 caracteres. No usar `Co-Authored-By` ni atribuciones de IA.

### Buenas prácticas

- Commits chicos y atómicos — un commit por cambio lógico
- Código y mensajes en inglés
- Testeá antes de commitear

---

## 7. Subir la rama y crear PR

### Subir a GitHub

```bash
git push -u origin feat/modulo-usuarios
```

El output te muestra un link directo para crear el PR. También podés usar GitHub CLI:

```bash
gh pr create \
  --base DEV \
  --title "feat(usuarios): modulo completo con CRUD" \
  --body "## Resumen

Descripción de los cambios.

## Test Plan

- [ ] Tests pasan
- [ ] Probado manualmente"
```

**Importante:** el PR va contra `DEV`, no contra `main`.

Después de abrir el PR, el maintainer lo revisa, si está bien lo mergea y te avisa. Esperá ese aviso antes de seguir.

---

## 8. Después del merge: limpiar

Cuando el maintainer te confirma que el PR se mergeó, limpiá tu rama local:

```bash
git checkout DEV
git pull origin DEV
git branch -d feat/modulo-usuarios
```

Eso es todo. La rama remota la puede borrar GitHub automáticamente si tiene esa opción al mergear, o la borra el maintainer.

**¿Qué pasó acá?**

1. `git checkout DEV` — te parás en DEV
2. `git pull origin DEV` — bajás los cambios mergeados (tu feature ya está en DEV)
3. `git branch -d feat/modulo-usuarios` — borrás tu rama local porque ya no la necesitás

Si el branch no se borra porque tenés cambios sin commitear, Git te avisa. Si querés forzar el borrado (solo si ya mergeaste):

```bash
git branch -D feat/modulo-usuarios
```

---

## 9. Arrancar otra feature nueva

Esto es **exactamente lo mismo que el paso 3**. Ya estás en `DEV` con todo actualizado. Solo repetís:

```bash
# Ya deberías estar en DEV del paso anterior
git pull origin DEV
git checkout -b feat/otra-funcionalidad
```

Y arrancás de nuevo desde el paso 6.

**El ciclo completo para cada feature:**

```
DEV → SDD (/sdd-new) → crear rama → laburar → commit → push → PR → merge → borrar rama → DEV (actualizado) → repetir...
```

Nunca tocás `main`. Nunca creás desde `main`. Todo desde `DEV`.

---

## 10. Resumen de comandos

```bash
# === PRIMERA VEZ ===
git clone https://github.com/JoseMC22/SIGMUN.git
cd SIGMUN
pnpm install

# === CADA FEATURE NUEVA ===
git checkout DEV
git pull origin DEV

# [OBLIGATORIO] Sesión SDD antes de codear
/sdd-new "descripción del cambio"

git checkout -b feat/mi-feature

# === TRABAJAR ===
# (editás archivos)
git status
git diff

# === TESTS ===
pnpm --filter frontend test
pnpm --filter backend test

# === COMMIT ===
git add -A
git commit -m "feat(alcance): descripción"

# === PUSH + PR ===
git push -u origin feat/mi-feature
# Después abrí el PR en GitHub contra DEV

# === DESPUÉS DEL MERGE ===
git checkout DEV
git pull origin DEV
git branch -d feat/mi-feature

# La próxima feature arranca desde "CADA FEATURE NUEVA" de nuevo
```

---

## 11. Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Trabajar sobre `DEV` directo | No crear rama de feature | Siempre creá `git checkout -b feat/...` |
| PR apunta a `main` | No verificar el base del PR | En GitHub, cambiá la base a `DEV` |
| No puedo pushear a `main` | `main` está protegida | OK, es normal. El PR va contra `DEV` |
| Merge conflict | No actualizaste tu rama | `git pull origin DEV` estando en tu rama feature |
| `git branch -d` no borra | Cambios sin commitear o sin mergear | Si ya mergeaste, usá `-D` en vez de `-d` |
| Tests fallan | Commitear sin testear | Siempre `pnpm test` antes del commit |
