# Flujo de Reportes Imprimibles (Vista Previa + Impresión + PDF)

Guía de arquitectura para generar reportes en el frontend de SIGMUN a partir de
plantillas HTML, con vista previa a pantalla completa, impresión aislada del
dashboard y descarga en PDF.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Plantillas (archivos, UNA subcarpeta por reporte)                │
│    frontend/src/app/dashboard/<submenu>/reportes/<Reporte>/         │
│    ├── plantilla-<reporte>.html   → HTML con marcadores {{clave}}    │
│    ├── estilos-<reporte>.css      → estilos de la plantilla          │
│    └── reporte-<reporte>.ts       → builder: llena + config PDF      │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Server Action (lee plantillas desde el filesystem)               │
│    frontend/src/actions/administracion-tributaria/reporte-*.ts      │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Servicio compartido (genérico, sin lógica de negocio)            │
│    frontend/src/lib/reportes/reporte-service.ts                     │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Modal de vista previa (genérico, reutilizable)                   │
│    frontend/src/components/reportes/reporte-viewer-modal.tsx        │
│    ├── Imprimir       → window.print() con CSS que aísla #reporte   │
│    └── Guardar en PC  → generarPdf(config) + descargarPdf()         │
└─────────────────────────────────────────────────────────────────────┘
```

## Responsabilidades por capa

### 1. Plantillas (por reporte)

Viven en una carpeta `reportes/` del submenú, con **una subcarpeta por reporte**
(por ejemplo `reportes/Representante/`). Así un submenú puede tener varias
plantillas sin mezclarse. No se guardan en base de datos, para que sean
versionables y revisables en git.

**Formato de almacenamiento (HTML o TSX):** la plantilla es un concepto flexible.
Cada reporte puede almacenarse como:

- **HTML** (default actual): `plantilla-<reporte>.html` + `estilos-<reporte>.css`
  leídos por la server action, o
- **TSX**: un componente React que renderiza el reporte y exporta su propia
  `ReportePdfConfig`.

El contrato para el consumidor (el modal) es **siempre un string HTML ya
llenado** más una `ReportePdfConfig`. Si un reporte usa TSX, el builder lo
convierte a HTML (p. ej. `renderToStaticMarkup`) y el resto del flujo no cambia.
La server action solo aplica para plantillas de archivo (HTML); para TSX el
builder puede generarlo en el cliente sin fs.

- **HTML**: fragmento con marcadores `{{clave}}` para valores y `{{bloque}}`
  para fragmentos crudos (p. ej. filas de tabla). El `<link>` de estilos usa
  ruta relativa; el builder lo reemplaza por un `<style>` inline.
- **CSS**: los textos llevan **color explícito** (no heredado). El dashboard
  global define `body { color: var(--foreground) }` y en `prefers-color-scheme:
  dark` el foreground es casi blanco: si el sistema del usuario está en dark
  mode, un texto sin color propio se ve blanco sobre el fondo blanco del
  reporte (invisible). Siempre definir `color` en los elementos de texto.
- **Builder** (`reporte-<reporte>.ts`): función pura que toma los datos del SP
  y la plantilla, y devuelve:
  - el HTML final llenado (string),
  - la `ReportePdfConfig` para el PDF descargable.

### 2. Server Action

Lee las plantillas con `node:fs/promises` (ruta absoluta con `process.cwd()` +
`src/app/dashboard/.../reportes/`). Devuelve `{ success: true, data: { html, css } }`
o `{ success: false, error }`. Así el cliente nunca accede al filesystem.

### 3. Servicio compartido (`src/lib/reportes/reporte-service.ts`)

Sin lógica de negocio, reutilizable para cualquier reporte:

| Función | Uso |
|---|---|
| `escapeHtml(texto)` | Escapa `& < > " '` (seguridad al inyectar valores) |
| `llenarPlantilla(template, valores)` | Reemplaza `{{clave}}` escapando; vacío → `-` |
| `reemplazarBloques(template, bloques)` | Reemplaza `{{bloque}}` con HTML crudo (filas) |
| `generarPdf(config)` | jsPDF A4 (landscape default) + autotable |
| `descargarPdf(doc, filename)` | Dispara la descarga en el navegador |

### 4. Modal de vista previa (`src/components/reportes/reporte-viewer-modal.tsx`)

- Overlay `fixed inset-0 z-[100]` (cubre el dashboard y cualquier modal padre).
- Renderiza el HTML con `dangerouslySetInnerHTML` en `#reporte-print`.
- **Imprimir**: `window.print()` + CSS `@media print` que oculta todo con
  `visibility: hidden` excepto `#reporte-print` (técnica estándar para imprimir
  solo el reporte).
- **Guardar en la PC**: `generarPdf(pdfConfig)` + `descargarPdf(doc, filename)`.
- El contenedor fuerza `colorScheme: "light"` y `text-slate-800` para que el
  navegador no invierta colores dentro del reporte.

## Cómo agregar un reporte nuevo (paso a paso)

1. **Subcarpeta**: creá `reportes/<NombreReporte>/` dentro del submenú
   (por ejemplo `reportes/Representante/`).
2. **Plantilla**: creá `plantilla-<reporte>.html` y `estilos-<reporte>.css`
   dentro de esa subcarpeta. Alternativa: componente `plantilla-<reporte>.tsx`
   si preferís almacenarla como JSX (ver sección "Formato de almacenamiento").
3. **Builder**: creá `reporte-<reporte>.ts` en la misma subcarpeta con:
   - `construirHtmlReporte<X>(data, plantilla): string` — llena la plantilla
     (filas con `reemplazarBloques`, valores con `llenarPlantilla`, y reemplazá
     el `<link>` por `<style>{css}</style>`).
   - `construirConfigPdf<X>(data): ReportePdfConfig`.
4. **Server Action**: creá `src/actions/<modulo>/reporte-<reporte>.ts` leyendo
   las plantillas con fs (ruta apuntando a la subcarpeta del reporte) y
   devolviendo `{ html, css }`.
5. **Conectar**: en el modal/página, al hacer clic en Imprimir:
   - cargá la plantilla con la action,
   - `construirHtmlReporte<X>(data, tpl.data)` → HTML,
   - `construirConfigPdf<X>(data)` → config PDF,
   - abrí `<ReporteViewerModal isOpen html pdfConfig onClose />`.
6. **Tests**: al menos para el builder (HTML llenado, escape, filas, filas
   vacías, PDF config) y el modal (print, guardar, error). Ver más abajo.

## Ejemplo de referencia

- `frontend/src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/Representante/`
  — `plantilla-representantes.html`, `estilos-representantes.css`,
  `reporte-representantes.ts` (reporte completo de representantes).
- `frontend/src/actions/administracion-tributaria/reporte-representantes.ts`
  — action que lee las plantillas.
- `frontend/src/components/reportes/reporte-viewer-modal.tsx` — modal genérico.

## Gotchas conocidos

- **Dark mode / colores**: siempre `color` explícito en el CSS de la plantilla.
  El modal fuerza `colorScheme: light` como respaldo.
- **jsPDF 4.x** necesita `dompurify` como dependencia directa del frontend
  (lo importa dinámicamente; Webpack falla si no está declarado).
  → `pnpm add dompurify --filter frontend`.
- **`vi.spyOn` en Vitest conserva la implementación original**: `doc.save()`
  escribe archivos reales. Usar `.mockReturnValue(doc)` para evitarlo.
- **Mockear `node:fs/promises`**: el módulo transpilado puede leer vía el export
  `default`; el mock debe exponerlo (`default: { readFile }` y `readFile`) con
  una única función compartida (`vi.hoisted`) para que `mockRejectedValueOnce`
  aplique.
- **CSS de impresión**: la técnica de `visibility` (ocultar `body *`, mostrar
  `#reporte-print`) funciona con modales; no usar `display: none` (rompe la
  re-posición del reporte).
