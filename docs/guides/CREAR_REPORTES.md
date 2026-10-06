# Guía — Crear reportes imprimibles en SIGMUN

Cómo crear un nuevo reporte (vista previa + impresión + PDF "Guardar en la PC")
siguiendo el patrón establecido con el Convenio de Fraccionamiento y el
Convenio Simulado. Reemplaza el enfoque viejo de generar PDF con
`jsPDF.autotable`: ahora el PDF se genera **desde el mismo HTML** de la vista
previa, así no hay diferencia entre lo que se ve y lo que se guarda.

---

## Índice

1. [Arquitectura del patrón](#1-arquitectura-del-patrón)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Paso 1 — Plantilla HTML](#3-paso-1--plantilla-html)
4. [Paso 2 — CSS](#4-paso-2--css)
5. [Paso 3 — Builder (TypeScript)](#5-paso-3--builder-typescript)
6. [Paso 4 — Server action](#6-paso-4--server-action)
7. [Paso 5 — Integrar con el visor](#7-paso-5--integrar-con-el-visor)
8. [Footer del PDF (gotcha crítico)](#8-footer-del-pdf-gotcha-crítico)
9. [Convenciones](#9-convenciones)
10. [Resumen del flujo](#10-resumen-del-flujo)

---

## 1. Arquitectura del patrón

```
[Server action]  lee plantilla.html + estilos.css del filesystem
      │  devuelve { html, css, pdfConfig, filename }
      ▼
[Builder TS]     llena {{placeholders}} y genera bloques HTML
      │   (reporte-*.ts en la carpeta del reporte)
      ▼
[ReporteViewerModal]  muestra con dangerouslySetInnerHTML
      │   botón "Imprimir"  → window.print()
      │   botón "Guardar en la PC" → descargarPdfDesdeHtml()
      ▼
[reporte-service.ts]   iframe oculto → jsPDF doc.html() → PDF A4
```

El HTML que se muestra en la vista previa **es exactamente el mismo string**
que se pasa a `descargarPdfDesdeHtml()` al guardar el PDF.

---

## 2. Estructura de archivos

Cada reporte vive en una carpeta propia bajo:

```
frontend/src/app/dashboard/administracion-tributaria/declaracion-jurada/reportes/
  <NombreReporte>/
    plantilla-<nombre>.html     ← plantilla con {{placeholders}}
    estilos-<nombre>.css        ← CSS aislado del reporte
    reporte-<nombre>.ts         ← builder que llena la plantilla
```

Archivos compartidos (NO tocar, reutilizar):

- `frontend/src/lib/reportes/reporte-service.ts`
  - `descargarPdfDesdeHtml(html, filename, orientation)` — genera el PDF
  - `escapeHtml`, `llenarPlantilla`, `reemplazarBloques` — helpers de plantillas
  - `type ReportePdfConfig`
- `frontend/src/components/reportes/reporte-viewer-modal.tsx` — visor genérico
- `frontend/src/actions/administracion-tributaria/reporte-convenio.ts` — ejemplo
  de server action que lee plantilla + css (y `reporte-convenio-simulado.ts`)

Referencias existentes (copiar estructura):

- `reportes/Convenio/` — plantilla-convenio.html, estilos-convenio.css,
  reporte-convenio.ts
- `reportes/ConvenioSimulado/` — plantilla-convenio-simulado.html,
  estilos-convenio-simulado.css, reporte-convenio-simulado.ts

---

## 3. Paso 1 — Plantilla HTML

- HTML **completo** (`<!DOCTYPE html>`, `<head>` con charset y `<link
  rel="stylesheet" href="./estilos-<nombre>.css">`, `<body>`).
- Valores dinámicos como `{{placeholder}}`.
- Bloques grandes generados por código (filas de tablas, bloques
  condicionales) como `{{nombreBloque}}` — **sin** intentar anidar
  placeholders sueltos dentro del bloque; el builder genera el bloque entero.
- El footer va en un `<div class="conv-footer">` (o `.footer`) con dos
  `<span>`: izquierda = "Elaborado por: ...", derecha = "Impreso: ...".
  **Es obligatorio para el PDF** (ver sección 8).
- Imágenes: usar rutas servidas por la app, NO archivos locales del
  filesystem. Ejemplo: `{{logoUrl}}` → `/logo_sat_2026.jpeg` (en
  `frontend/public/`).

---

## 4. Paso 2 — CSS

- Archivo aparte (`estilos-<nombre>.css`), aislado por clases propias del
  reporte — no usar clases de Tailwind dentro de la plantilla.
- El builder reemplaza el `<link rel="stylesheet">` por un `<style>`
  inline con el contenido del CSS (así el visor no depende del path).
- Para que el reporte aproveche el ancho al imprimir:
  - `body { margin: 0; padding: 0; }`
  - `.documento { width: 100%; max-width: none; margin: 0; }`
  - Evitar `max-width` fijos que centren el contenido.
- Celdas de tabla con texto: `text-align: center` en `th` y `td` si se
  quiere el mismo look del Convenio; los bloques de datos personales usan
  `text-align: left`.
- Fuentes: Arial/Helvetica default; Times para zonas formales (título,
  firma, footer). El footer se copia al PDF por computed style.

---

## 5. Paso 3 — Builder (TypeScript)

En `reporte-<nombre>.ts`:

```ts
import { escapeHtml, llenarPlantilla, reemplazarBloques } from "@/lib/reportes/reporte-service";

export function construirHtmlReporte<Nombre>(data, plantilla): string {
  // 1. Generar bloques HTML condicionales/iterativos con reemplazarBloques
  const conBloques = reemplazarBloques(plantilla.html, {
    filasTabla,       // HTML de filas ya generado
    bloque2,          // bloque condicional (o "")
    // ...
  });

  // 2. Llenar placeholders simples (SIEMPRE escapar valores de datos)
  const conValores = llenarPlantilla(conBloques, {
    logoUrl: "/logo_sat_2026.jpeg",
    codigo: get("codigo"),
    // ...
  });

  // 3. Inline del CSS (reemplaza el <link> por <style>)
  return conValores.replace(
    '<link rel="stylesheet" href="./estilos-<nombre>.css">',
    `<style>${plantilla.css}</style>`,
  );
}
```

Reglas del builder:

- **Siempre** escapar datos del backend con `escapeHtml` (no confiar en el
  origen). Los placeholders simples se escapan con `llenarPlantilla`; los
  bloques HTML ya armados se insertan con `reemplazarBloques` (raw).
- Acceso a columnas del SP: los stored procedures legacy emiten nombres con
  mayúsculas variables (`CodResp` vs `codResp`). Usar un helper `get(key)`
  con lookup case-insensitive (ver `reporte-convenio.ts`).
- Montos con el formato legacy: `fmtMonto(n)` → `"1 234.56"` (espacio miles,
  punto decimal), implementado localmente en el builder del Convenio.
- Fecha/hora de impresión: `dd/MM/yyyy HH:mm:ss`.
- **Bloques condicionales según el tipo de reporte** (ej. PIT): generar el
  bloque HTML completo cuando la condición se cumple, o `""` si no, e
  insertarlo en la plantilla con `reemplazarBloques`. Ejemplo real — las
  DISPOSICIONES COMPLEMENTARIAS del Convenio se agregan **solo para
  reportes PIT** (`convenio.startsWith("PIT")`, la misma condición que
  decide INFRACTOR/PROPIETARIO) y deben quedar **debajo del apartado de
  firmas** (la plantilla ubica `{{disposiciones}}` después del
  `conv-firma`). Ojo: NO usar `codigo.startsWith("P")` como condición — el
  código es el de la persona (no indica el tipo de reporte).

PDF config (obsoleto para el visor actual, mantener solo compatibilidad):
`construirConfigPdfConvenio()` genera un `ReportePdfConfig` con
`columnas`/`filas` para jsPDF.autotable — ya NO se usa para generar el
Convenio, el visor guarda desde HTML. Si un reporte nuevo no necesita
compatibilidad, puede omitirse y pasar `pdfConfig: null` al visor.

---

## 6. Paso 4 — Server action

Modelo: `frontend/src/actions/administracion-tributaria/reporte-convenio.ts`.
- Leer la plantilla y el CSS del filesystem (fs/promises).
- Devolver `{ html, css, pdfConfig, filename }` (tipos exportados desde ahí).
- Los datos del reporte llegan desde el backend (ej. `getReporteConvenio`).

---

## 7. Paso 5 — Integrar con el visor

```tsx
<ReporteViewerModal
  isOpen={...}
  onClose={...}
  html={reporte.html}               // string completo ya llenado + CSS inline
  pdfConfig={pdfConfig}             // null deshabilita "Guardar en la PC"
/>
```

- El visor hace `dangerouslySetInnerHTML` con el HTML (el builder ya escapó
  los datos, así que es seguro).
- Impresión: `window.print()` con `PRINT_CSS` que oculta el resto de la app
  y muestra solo `#reporte-print`.
- "Guardar en la PC" llama `descargarPdfDesdeHtml(html, pdfConfig.filename,
  pdfConfig.orientacion)` con el mismo `html` de la vista previa.

---

## 8. Footer del PDF (gotcha crítico)

**Síntoma**: al guardar el PDF, "Elaborado por: ..." / "Impreso: ..." salen
cortados por la mitad (solo la parte superior o inferior del texto).

**Causa**: `jsPDF.html()` con `autoPaging: "text"` IGNORA la opción
`pagebreak: { avoid: [...] }`. Si el footer cae justo en el límite de
página, jsPDF lo parte.

**Solución implementada en `descargarPdfDesdeHtml`** (no requiere acción por
reporte):

1. Antes de `pdf.html()`, busca `.conv-footer, .footer` en el iframe.
2. Extrae sus dos `<span>` (izquierda/derecha) y copia del computed style:
   fuente (Times si el CSS dice `serif`, si no Helvetica), tamaño (px → pt,
   `* 0.75`), color y si tiene `border-top`.
3. **Remueve el footer del DOM** (no se rasteriza con el cuerpo).
4. Rasteriza el cuerpo con `pdf.html()`.
5. En la **última página**, dibuja el footer con `pdf.text()`: izquierda en
   `x=10`, derecha alineada a `pageWidth - 10`, `y = pageHeight - 8`, con la
   línea superior si el CSS la tenía.

**Convención para reportes nuevos**: usar siempre el footer con clase
`conv-footer` o `footer`, dos `<span>`, y el "Elaborado por" en el primero.
Así el PDF sale completo automáticamente.

---

## 9. Convenciones

- **Nombres**: `plantilla-<nombre>.html`, `estilos-<nombre>.css`,
  `reporte-<nombre>.ts` (archivos compartidos quedan como están).
- **Clases con prefijo del reporte**: `conv-*` en Convenio, `footer-*` en
  Simulado — evitar colisiones (los estilos de cada reporte solo aplican a
  su propio HTML porque se renderizan en un iframe aislado).
- **Idioma**: UI/copy en español (neutral, este módulo es del SAT-ICA).
- **Código/comentarios**: español, consistente con el módulo existente.
- **No** usar Tailwind dentro de la plantilla HTML del reporte.
- **Escape siempre** los datos del backend.
- **El logo** se sirve desde `frontend/public/` con ruta absoluta.

---

## 10. Resumen del flujo

1. Hook/modal pide el reporte → server action lee plantilla + css.
2. Builder arma HTML lleno (escapa datos, inline CSS, bloques generados).
3. UI llama a `ReporteViewerModal` con `html` + `pdfConfig`.
4. Vista previa = ese HTML; imprimir = `window.print()` sobre `#reporte-print`.
5. Guardar PDF = `descargarPdfDesdeHtml(html, filename, orientacion)` que
   rasteriza el mismo HTML y dibuja el footer completo en la última página.

---

*Documentado a partir de la implementación del reporte Convenio de
Fraccionamiento (SAT-ICA). Consultar `reporte-convenio.ts` y
`reporte-service.ts` como referencia viva.*