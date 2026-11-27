import {
  llenarPlantilla,
  escapeHtml,
  reemplazarBloques,
  type ReportePdfConfig,
} from "@/lib/reportes/reporte-service";
import type { PlantillaReporteData } from "@/actions/administracion-tributaria/reporte-descargo";

export function construirHtmlReportePredio(
  data: Record<string, unknown>,
  docsHtml: string,
  plantilla: PlantillaReporteData,
): string {
  const v = (k: string) => data[k] !== undefined && data[k] !== null ? String(data[k]).trim() : "";

  // ── Generar tabla de construcciones (pisos) ──
  const pisosHtml = `
    <table class="reporte-table">
      <thead>
        <tr>
          <th style="width:5%">N°</th>
          <th style="width:8%">Piso</th>
          <th style="width:12%">Muros</th>
          <th style="width:12%">Techo</th>
          <th style="width:12%">Piso</th>
          <th style="width:12%">Puertas</th>
          <th style="width:12%">Revest.</th>
          <th style="width:10%">Baños</th>
          <th style="width:10%">Inst.Eléc</th>
          <th style="width:8%" class="text-right">Área Const.</th>
          <th style="width:8%" class="text-right">Área Común</th>
          <th style="width:8%" class="text-center">Año</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td class="text-center">101</td>
          <td>Columna y viga concreto</td>
          <td>Aligerado concreto armado</td>
          <td>Cerámica nacional</td>
          <td>Aluminio madera selecta</td>
          <td>Estucado yeso pintura</td>
          <td>Baño completo nacional</td>
          <td>Agua fría, caliente, trifásica</td>
          <td class="text-right">120.00</td>
          <td class="text-right">8.00</td>
          <td class="text-center">2018</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td class="text-center">201</td>
          <td>Columna y viga concreto</td>
          <td>Aligerado concreto armado</td>
          <td>Cerámica nacional</td>
          <td>Aluminio madera selecta</td>
          <td>Estucado yeso pintura</td>
          <td>Baño completo nacional</td>
          <td>Agua fría, caliente, trifásica</td>
          <td class="text-right">110.00</td>
          <td class="text-right">7.00</td>
          <td class="text-center">2018</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Generar tabla de instalaciones ──
  const instalacionesHtml = `
    <table class="reporte-table">
      <thead>
        <tr>
          <th style="width:8%">N°</th>
          <th style="width:20%">Instalación</th>
          <th style="width:12%">Clasificación</th>
          <th style="width:12%">Materiales</th>
          <th style="width:10%">Estado</th>
          <th style="width:8%" class="text-right">Largo</th>
          <th style="width:8%" class="text-right">Ancho</th>
          <th style="width:8%" class="text-right">Alto</th>
          <th style="width:8%" class="text-right">Cant.</th>
          <th style="width:8%" class="text-center">Año</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center">1</td>
          <td>Cisterna</td>
          <td>Almacenamiento</td>
          <td>Concreto</td>
          <td>Bueno</td>
          <td class="text-right">3.00</td>
          <td class="text-right">2.50</td>
          <td class="text-right">2.00</td>
          <td class="text-right">1</td>
          <td class="text-center">2018</td>
        </tr>
        <tr>
          <td class="text-center">2</td>
          <td>Tanque Elevado</td>
          <td>Presurización</td>
          <td>Fibra de vidrio</td>
          <td>Bueno</td>
          <td class="text-right">1.50</td>
          <td class="text-right">1.50</td>
          <td class="text-right">2.00</td>
          <td class="text-right">1</td>
          <td class="text-center">2018</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Usar la plantilla HTML externa ──
  let html = plantilla.html;

  // Inyectar el CSS externo en lugar del <link> al archivo CSS
  html = html.replace(
    `<link rel="stylesheet" href="./estilos-declaracion-predio.css">`,
    `<style>${plantilla.css}</style>`,
  );

  // ── Llenar marcadores simples {{clave}} con llenarPlantilla ──
  html = llenarPlantilla(html, {
    anno: v("anno"),
    dj_nro: v("dj_nro"),
    codigo: v("codigo"),
    tipo_predio: v("tipo_predio"),
    cod_pred: v("cod_pred"),
    anexo: v("anexo"),
    sub_anexo: v("sub_anexo"),
    estado: v("estado"),
    condicion: v("condicion"),
    tipo_adquisicion: v("tipo_adquisicion"),
    porcen_propiedad: v("porcen_propiedad"),
    fecha_adquisicion: v("fecha_adquisicion"),
    fecha_afectacion: v("fecha_afectacion"),
    arancel: v("arancel"),
    area_terreno: v("area_terreno"),
    area_comun: v("area_comun"),
    Frente: v("Frente"),
    Ubicacion_predio: v("Ubicacion_predio"),
    uso: v("uso"),
    Area_uso: v("Area_uso"),
    Mes_inicio: v("Mes_inicio"),
    Mes_hasta: v("Mes_hasta"),
    val_total_terreno: v("val_total_terreno"),
    val_total_constru: v("val_total_constru"),
    val_total_instala: v("val_total_instala"),
    total_autoavaluo: v("total_autoavaluo"),
    direccion_predio: v("direccion_predio"),
    motivo_registro: v("Motivo_Registro"),
    condicion_especial: v("condicion_especial"),
    situacion_predio: v("situacion_predio"),
    nro_ficha_fizcalizacion: v("nro_ficha_fizcalizacion"),
    fecha_impresion: new Date().toLocaleString("es-PE"),
    observacion:
      v("observacion") ??
      "PREDIO CON DOS PISOS CONSTRUIDOS, ÁREA COMÚN EN PRIMER NIVEL. AUTVALÚO DECLARADO SEGÚN TABLAS DE VALORES VIGENTES. SIN OBSERVACIONES PENDIENTES.",
    glosa:
      v("glosa") ?? "PRIMERA INSCRIPCIÓN DE PREDIO URBANO CON CONSTRUCCIÓN DE DOS NIVELES.",
    fecha_fiscalizacion: v("fecha_fiscalizacion") ?? "",
    glosa_fiscalizacion:
      v("glosa_fiscalizacion") ??
      "PREDIO VERIFICADO EN CAMPO. CONSTRUCCIONES Y AREAS COINCIDEN CON LO DECLARADO. SIN OBSERVACIONES.",
    operador: v("operador") ?? "JMARTINEZ",
    nombre_declarante: v("nombre") ?? "JUAN CARLOS GARCÍA PÉREZ",
    dni_declarante: v("dni") ?? "42891563",
    tipo_doc: v("tipo_doc") ?? v("tipo_documento") ?? "DNI",
    dni: v("dni") ?? "42891563",
    nombre: v("nombre") ?? "JUAN CARLOS GARCÍA PÉREZ",
    tipo_contri: v("tipo_contri") ?? "Persona Natural",
    subtipo_contri: v("subtipo_contri") ?? "Propietario",
    direccion_fiscal: v("direcion_fiscal") ?? v("direccion_fiscal") ?? "",
  });

  // ── Reemplazar bloques HTML crudos (tablas dinámicas) ──
  html = reemplazarBloques(html, {
    pisos_table: pisosHtml,
    instalaciones_table: instalacionesHtml,
    docs_table: docsHtml,
  });

  return html;
}

export function construirConfigPdfPredio(data: Record<string, unknown>): ReportePdfConfig {
  return {
    filename: `declaracion-predio-${String(data.cod_pred ?? "")}-${String(data.anno ?? "")}.pdf`,
    titulo: "Declaración Jurada Predial",
    orientacion: "portrait",
    subtitulo: [
      ["Código", String(data.codigo ?? "")],
      ["Contribuyente", String(data.nombre ?? "")],
      ["Predio", `${String(data.cod_pred ?? "")}-${String(data.anexo ?? "")}-${String(data.sub_anexo ?? "")}`],
      ["Año", String(data.anno ?? "")],
      ["Nro Declaración", String(data.dj_nro ?? "")],
    ],
    columnas: ["Campo", "Valor"],
    filas: [
      ["Estado", String(data.estado ?? "-")],
      ["Condición", String(data.condicion ?? "-")],
      ["Tipo Adquisición", String(data.tipo_adquisicion ?? "-")],
      ["Porcentaje Propiedad", String(data.porcen_propiedad ?? "-") + " %"],
      ["Fecha Adquisición", String(data.fecha_adquisicion ?? "-")],
      ["Área Terreno", String(data.area_terreno ?? "-") + " m²"],
      ["Autovalúo", String(data.total_autoavaluo ?? "-")],
      ["Dirección", String(data.direccion_predio ?? "-")],
    ],
  };
}