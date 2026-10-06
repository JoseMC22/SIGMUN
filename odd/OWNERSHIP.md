# Manifiesto de Ownership — SIGMUN multi-agente

Motivo de este archivo: varias features las implementan agentes distintos en el
**mismo working tree**, y se pisaron entre sí (pérdida de interfaces, JSX roto,
`tsc` global en rojo). Esta es la fuente de verdad de **quién toca qué**.

**Contrato de entrada (obligatorio):** todo agente que vaya a escribir archivos en
este repo lee este manifiesto **antes de la primera escritura**, verifica que sus
archivos objetivo están libres (§4) y registra su fila en la tabla del módulo
correspondiente. Un agente que no actualizó su fila **no tiene reserva**.

---

## 0. Regla anti-cruce general (aplica a TODO el repo)

1. **Un escritor por archivo.** Si dos features necesitan el mismo archivo, se
   serializan (una termina, la otra sigue). No existen ediciones "rápidas" ajenas.
2. **Nunca editar un archivo ya modificado por otro agente y sin commitear.**
   La evidencia de cruce es `git status` con el archivo en `M` de otro. Antes de
   escribir: `git status --porcelain -- <tus-archivos>`; si aparecen sucios y no
   son tuyos, parás y coordinás con el orquestador.
3. **Los archivos puente no se tocan (§2 por módulo).** Cada agente expone sus
   endpoints/types/componentes en archivos **propios de su feature** y documenta
   el *diff de integración* en su `odd/tasks/<feature>.md`; el orquestador
   (sesión padre) aplica el pegado en los puentes.
4. **Verificación centralizada.** Los agentes NO corren `tsc`/build/lint global
   como criterio de éxito: lo corre el orquestador al final, cuando todos los
   writers terminaron. El agente verifica solo su alcance (tests propios,
   type-check acotado si existe).
5. **Feature en worktree aislada** (`subagent` con `isolation: "worktree"`) si
   toca >8 archivos, o si hay otro agente activo en el mismo módulo.
6. **Un type-check en rojo no es culpa del último que escribió.** Se reporta y
   se coordina; no se "arregla" código ajeno a ciegas.
7. **Un commit por work-unit en tu rama de feature** deja evidencia limpia de
   qué tocó cada agente; nunca commits que incluyan archivos de otro.

---

## 1. Anatomía de un módulo (patrón repetido en todos los submenús)

Cada submenú del dashboard sigue la misma forma; sus archivos puente son
predecibles:

```
backend/src/<modulo>/
    <modulo>.module.ts              # puente (imports/providers globales)
    <caso-uso>/<caso-uso>.service.ts     # MUCHAS veces compartido → puente
    <caso-uso>/<caso-uso>.controller.ts  # rutas compartidas → puente
    <caso-uso>/dto/*.types.ts            # tipos compartidos → puente

frontend/src/actions/<modulo>.ts    o   actions/<modulo>/*.ts   # barrel → puente
frontend/src/app/dashboard/<modulo>/
    page.tsx / layout.tsx                # puente (registro de rutas/tabs)
    <feature>/...                        # archivos propios por feature
frontend/src/components/<modulo>/...     # modales/host compartidos → puente
```

**Regla práctica:** si un archivo importa cosas de más de una feature, es puente.
Si una página/modal "host" renderiza componentes de varias features, es puente.

---

## 2. Archivos puente PROHIBIDOS por módulo

Editar un puente requiere pedirlo al orquestador, que integra en serie.

### Módulo: Administración Tributaria / Declaración Jurada

| Archivo puente | Cambio permitido sin permiso |
|---|---|
| `frontend/src/actions/administracion-tributaria/declaracion-jurada.ts` | Ninguno — orquestador |
| `backend/.../declaracion-jurada.service.ts` | Ninguno — orquestador |
| `backend/.../declaracion-jurada.controller.ts` | Ninguno — orquestador |
| `backend/.../dto/declaracion-jurada.types.ts` | Ninguno — orquestador |
| `frontend/.../declaracion-jurada-detalle-modal.tsx` | Ninguno — host de modales |

### Resto de submenús (misma regla, distinto nombre)

Aplica el patrón de §1: son puentes, por defecto, `<modulo>.module.ts`,
`<caso-uso>.service.ts`, `<caso-uso>.controller.ts`, `dto/*.types.ts`,
el barrel de `frontend/src/actions/<modulo>/`, el `page.tsx`/`layout.tsx` del
submenú y cualquier modal "host" de detalle. Antes de escribir en un módulo
sin fila aquí, el agente **declara sus puentes en su `odd/tasks/<feature>.md`**
y le pide confirmación al orquestador.

Módulos activos del repo: `administracion-tributaria`, `alcabala`,
`asesoria-legal`, `fiscalizacion-tributaria`, `impuesto-vehicular`,
`mantenimiento-tablas`, `notificaciones`, `papeleta-transito`,
`reportes-gerenciales`, `seguridad`, `menu`, `auth`, `storage`, `common`,
`database`, `types`.

**Puentes transversales (los más peligrosos):** `backend/src/common/**`,
`backend/src/database/**`, `backend/src/types/**`, `backend/src/app.module.ts`,
`frontend/src/app/dashboard/layout.tsx`,
`frontend/src/app/dashboard/dashboard-client-layout.tsx`,
`frontend/src/actions/menu.ts`, `frontend/src/components/lib|hooks/**` —
estos los edita **solo el orquestador**, sin excepción, porque un cambio ahí
cruza todos los submenús a la vez.

---

## 3. Ownership por feature — Módulo Declaración Jurada

| Feature | Archivos propios | Owner |
|---|---|---|
| Baja de Predio | `baja-predio-modal.tsx`, `adquiriente-busqueda-modal.tsx`, `ver-baja-predio-modal.tsx`, `historial-baja-predio-modal.tsx`, `reportes/Descargo/*`, `dto/baja-predio.dto.ts` | **el Gentleman** |
| Historial Predio (reporte DJ) | `historial-predio-modal.tsx`, `reportes/DeclaracionPredio/*` | **agente "historial predio"** |
| 1ra. Inscripción | `primera-inscripcion-modal.tsx`, `dto/guardar-predio.dto.ts` | **agente opencode** |
| Hoja de Resumen | `hoja-resumen-form-modal.tsx` | (libre) |
| Determinación | `determinacion-modal.tsx` | (libre) |

Si un archivo figura en dos filas, el que ya lo está tocando gana y el otro espera.

## 4. Ownership por feature — otros submenús

Plantilla: cada agente registra su fila **antes de escribir**. Módulos sin filas
están libres; dos agentes en el mismo submenú exigen worktree aislado (§0.5).

| Submenú | Feature | Archivos propios | Owner |
|---|---|---|---|
| (ej.) alcabala | (ej.) liquidación | `alcabala/liquidacion/**`, `dto/liquidacion.dto.ts` | (nombre del agente) |
| | | | |

---

## 5. Checklist antes de delegar a un agente

- [ ] ¿La feature tiene archivos propios? (no depende solo de puentes)
- [ ] ¿Los archivos que va a tocar están libres en §3/§4 y limpios en `git status`?
- [ ] ¿El agente leyó este manifiesto y sabe que NO corre `tsc` global ni
      "arregla" errores ajenos?
- [ ] ¿Su `odd/tasks/<feature>.md` declara sus puentes y documenta el diff de
      integración en ellos?
- [ ] ¿Si hay otro agente activo en el mismo submenú, usa worktree aislado?
