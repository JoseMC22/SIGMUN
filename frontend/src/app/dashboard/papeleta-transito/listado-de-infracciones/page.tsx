"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  PackageX,
  AlertCircle,
  RotateCcw,
  Eye,
  Pencil,
  Printer,
  FileText,
  RefreshCw,
  BookOpen,
  Receipt,
  Upload,
  Plus,
  Stamp,
  FileSpreadsheet,
  CreditCard,
  Layers,
  Send,
  Trash2,
} from "lucide-react";
import { checkSessionAction } from "@/actions/auth/auth";
import { searchInfraccionesAction, obtenerDatosReporteEstadoCuentaAction, obtenerDatosReporteResolucionSancionAction } from "@/actions/papeleta-transito/listado-de-infracciones";
import { gravamenSinPlacaAction, imprimirRecordPendienteAction, verFraccionamientoAction, generarLiquidacionAction, eliminarPapeletaAction, cargarDetalleInfraccionAction } from "@/actions/papeleta-transito/acciones-infraccion";
import { obtenerPlantillaEstadoCuentaAction, obtenerPlantillaResolucionSancionAction, obtenerPlantillaRecordAction } from "@/actions/papeleta-transito/reportes-infracciones";
import { construirHtmlReporteEstadoCuenta, construirConfigPdfEstadoCuenta } from "./reportes/EstadoCuenta/reporte-estado-cuenta";
import { construirHtmlReporteResolucion, construirConfigPdfResolucion } from "./reportes/ResolucionSancion/reporte-resolucion";
import { construirHtmlReporteRecord, construirConfigPdfRecord } from "./reportes/RecordPendiente/reporte-record";
import type { ReportePdfConfig } from "@/lib/reportes/reporte-service";
import ReporteViewerModal from "@/components/reportes/reporte-viewer-modal";
import NuevaInfraccionModal from "./nueva-infraccion-modal";
import FraccionarPapeletaModal from "./fraccionar-papeleta-modal";
import VerFraccionamientoModal from "./ver-fraccionamiento-modal";
import ImportarExcelModal from "./importar-excel-modal";
import DetalleInfraccionModal from "./detalle-infraccion-modal";
import ResolucionSancionModal from "./resolucion-sancion-modal";
import CambioEstadoModal from "./cambio-estado-modal";
import CertGravamenModal from "./cert-gravamen-modal";
import CertGravamenSinPlacaModal from "./cert-gravamen-sin-placa-modal";
import EnvioCoactivoModal from "./envio-coactivo-modal";

// ─── Types ────────────────────────────────────────────────

interface InfraccionRow {
  id: string;
  placa: string;
  propietario: string;
  conductor: string;
  tipoVehiculo: string;
  codigoInfraccion: string;
  numeroInfraccion: string;
  codigo: string;
  estadoImpresion: string;
  estImpresion1: string;
  codigoInfra: string;
  fecha: string;
  monto: string;
  estado: string;
  edt: string;
  imp: string;
  gnr: string;
  cmb: string;
  codigoPropietario: string;
  idRecibo: string;
  tipo: string;
  tipoRec: string;
}

// ─── Status badge ─────────────────────────────────────────

function StatusBadge({ estado }: { estado: string }) {
  const upper = estado.toUpperCase();
  let color = "";
  let dotColor = "";

  if (upper === "CANCELADA" || upper === "ANULADA") {
    color = "bg-red-50 text-red-700 ring-1 ring-red-300/40";
    dotColor = "bg-red-500";
  } else if (upper === "PENDIENTE") {
    color = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40";
    dotColor = "bg-emerald-500";
  } else if (upper === "COAC" || upper === "CAPTURA") {
    color = "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300/40";
    dotColor = "bg-indigo-500";
  } else if (upper === "PRESCRITA") {
    color = "bg-amber-50 text-amber-700 ring-1 ring-amber-300/40";
    dotColor = "bg-amber-500";
  } else if (upper === "EMIT. R. SANCION") {
    color = "bg-blue-50 text-blue-700 ring-1 ring-blue-300/40";
    dotColor = "bg-blue-500";
  } else if (upper === "FRACC - ORD.") {
    color = "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300/40";
    dotColor = "bg-yellow-600";
  } else if (upper) {
    color = "bg-slate-50 text-slate-600 ring-1 ring-slate-300/40";
    dotColor = "bg-slate-400";
  }

  if (!upper) return <span className="text-[10px] text-slate-400">—</span>;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {estado}
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-12 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`px-3 py-3 border-b border-slate-100 ${i === 4 ? "border-b-0" : ""}`}>
            <div className="grid grid-cols-12 gap-4">
              {[...Array(12)].map((_, j) => (
                <div key={j} className="h-3.5 bg-slate-100 rounded" style={{ width: "80%" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function ListadoDeInfraccionesPage() {
  const [filters, setFilters] = useState({
    placa: "",
    propietario: "",
    infrac: "",
    anioInfraccion: String(new Date().getFullYear()),
    conductor: "",
    dniConductor: "",
  });

  const [data, setData] = useState<InfraccionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [usuarioLogueado, setUsuarioLogueado] = useState<string>("SISTEMA");

  useEffect(() => {
    checkSessionAction().then((res) => {
      if (res.authenticated && res.user) {
        const nombreUsr = res.user.usuario || res.user.username || res.user.nombre || "SISTEMA";
        setUsuarioLogueado(nombreUsr);
      }
    });
  }, []);
  const [showNuevaInfraccion, setShowNuevaInfraccion] = useState(false);
  const [showFraccionar, setShowFraccionar] = useState(false);
  const [showVerFraccionamiento, setShowVerFraccionamiento] = useState(false);
  const [showImportarExcel, setShowImportarExcel] = useState(false);
  const [showDetalleInfraccion, setShowDetalleInfraccion] = useState(false);
  const [showEditarInfraccion, setShowEditarInfraccion] = useState(false);
  const [showResolucionSancion, setShowResolucionSancion] = useState(false);
  const [showCambioEstado, setShowCambioEstado] = useState(false);
  const [showCambioEstadoReadOnly, setShowCambioEstadoReadOnly] = useState(false);
  const [showCertGravamen, setShowCertGravamen] = useState(false);
  const [showCertGravamenSinPlaca, setShowCertGravamenSinPlaca] = useState(false);
  const [gravamenSinPlacaValor, setGravamenSinPlacaValor] = useState("0");
  const [showEnvioCoactivo, setShowEnvioCoactivo] = useState(false);
  const [editData, setEditData] = useState<Record<string, string> | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Reporte states ────────────────────────────────────────
  const [reporteHtml, setReporteHtml] = useState<string | null>(null);
  const [reportePdf, setReportePdf] = useState<ReportePdfConfig | null>(null);
  const [reporteLoading, setReporteLoading] = useState(false);

  const cerrarReporte = () => {
    setReporteHtml(null);
    setReportePdf(null);
  };

  const executeSearch = useCallback(
    async (pageNum: number, filtersOverride?: typeof filters) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchInfraccionesAction(filtersOverride ?? filters, pageNum, pageSize);
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error);
          setData([]);
        }
      } catch {
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filters, pageSize],
  );

  useEffect(() => {
    // En el sistema antiguo no se cargan datos al entrar, únicamente cuando se presiona el botón Buscar...
    setInitialLoading(false);
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    const cleared = {
      placa: "",
      propietario: "",
      infrac: "",
      anioInfraccion: String(new Date().getFullYear()),
      conductor: "",
      dniConductor: "",
    };
    setFilters(cleared);
    setData([]);
    setTotal(0);
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  // ── Search Form ─────────────────────────────────────────

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Filtros de búsqueda
        </span>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {/* Placa */}
          <div className="md:col-span-2">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Placa</label>
            <input type="text" placeholder="Ej: ABC-123"
              value={filters.placa}
              onChange={(e) => handleFilterChange("placa", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Propietario */}
          <div className="md:col-span-2">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Propietario</label>
            <input type="text" placeholder="Nombre"
              value={filters.propietario}
              onChange={(e) => handleFilterChange("propietario", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Conductor */}
          <div className="md:col-span-2">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Conductor</label>
            <input type="text" placeholder="Nombre"
              value={filters.conductor}
              onChange={(e) => handleFilterChange("conductor", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* DNI Conductor */}
          <div className="md:col-span-1">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">DNI</label>
            <input type="text" placeholder="DNI"
              value={filters.dniConductor}
              onChange={(e) => handleFilterChange("dniConductor", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Año Infracción */}
          <div className="md:col-span-1">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Año</label>
            <input type="text" placeholder="Año"
              value={filters.anioInfraccion}
              onChange={(e) => handleFilterChange("anioInfraccion", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* N° Papeleta de Infracción */}
          <div className="md:col-span-2">
            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">N° Papeleta</label>
            <input type="text" placeholder="N° Papeleta"
              value={filters.infrac}
              onChange={(e) => handleFilterChange("infrac", e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 font-medium placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button type="button" onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Search size={12} />
              Buscar
            </button>
            <button type="button" onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
            >
              Limpiar
            </button>
            <span className="text-[9px] text-slate-400 leading-none">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Action handlers ──────────────────────────────────────

  const selectedRow = data.find((r) => r.id === selectedRowId) ?? null;

  const requireRow = (action: string): boolean => {
    if (!selectedRow) {
      alert(`Seleccione una infracción para "${action}".`);
      return false;
    }
    return true;
  };

  const handleExcelASql = () => {
    setShowImportarExcel(true);
  };

  const handleNuevaInfraccion = () => {
    setShowNuevaInfraccion(true);
  };

  const handleGenerarGravamen = async () => {
    const placa = filters.placa.trim();
    if (!placa) {
      alert("ℹ️ Ingrese el Número de Placa en el campo de búsqueda.");
      return;
    }
    setActionLoading(true);
    try {
      const result = await gravamenSinPlacaAction(placa);
      if (result.success) {
        setGravamenSinPlacaValor(String(result.data ?? "0"));
        setShowCertGravamenSinPlaca(true);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch {
      alert("❌ Error de conexión al generar gravamen.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImprimirRecordPendiente = async () => {
    const placa = filters.placa.trim() || selectedRow?.placa || "";
    const conductor = filters.conductor.trim() || selectedRow?.conductor || "";
    const dni = filters.dniConductor.trim() || (selectedRow as any)?.dniConductor || (selectedRow as any)?.dni || "";

    setReporteLoading(true);
    try {
      const [plantilla, result] = await Promise.all([
        obtenerPlantillaRecordAction(),
        imprimirRecordPendienteAction({
          placa,
          conductor,
          dni,
          estado: "",
        }),
      ]);

      if (!plantilla.success) {
        alert(`Error al cargar plantilla: ${plantilla.error}`);
        return;
      }

      if (result.success && result.data) {
        const d = result.data;
        const rows = d.rows ?? [];
        const items = rows.map((r: any) => {
          const valInsol = r.infraccion === "M.40" ? 0 : (r.valor ?? 0);
          const desc = r.infraccion === "M.40" ? 0 : (r.descuento ?? 0);
          const totalFinal = r.infraccion === "M.40" ? 0 : (r.total ?? (valInsol - desc));
          return {
            papeleta: String(r.papeleta ?? "-"),
            placa: String(r.placa ?? "-"),
            infraccion: String(r.infraccion ?? "-"),
            fecha: String(r.fecha ?? "-"),
            propietario: String(r.propietario ?? "-"),
            valor: valInsol,
            descuento: desc,
            montoFinal: totalFinal,
            estado: String(r.estado ?? "PENDIENTE"),
          };
        });

        const primerItem = rows[0] ?? {};
        const datosReporte: import("./reportes/RecordPendiente/reporte-record").DatosRecordPendiente = {
          codigo: String(primerItem.codigo ?? "-"),
          infractor: String(primerItem.infractor ?? (conductor || "-")),
          items,
          totalDescuento: d.totalDescuento ?? 0,
          totalCostas: 0,
          totalImporte: d.importeTotal ?? 0,
          usuario: usuarioLogueado,
        };

        setReporteHtml(construirHtmlReporteRecord(datosReporte, plantilla.data));
        setReportePdf(construirConfigPdfRecord(datosReporte));
      } else {
        alert(`❌ ${result.error ?? result.message}`);
      }
    } catch {
      alert("❌ Error al generar el Récord Pendiente del Infractor.");
    } finally {
      setReporteLoading(false);
    }
  };

  const handleFraccionarPapeleta = () => {
    if (!requireRow("Fraccionar Papeleta")) return;
    setShowFraccionar(true);
  };

  const handleVerFraccionamiento = () => {
    if (!requireRow("Ver Fraccionamiento")) return;
    setShowVerFraccionamiento(true);
  };

  const handleEnvioCoactivo = () => {
    if (!requireRow("Envío a Coactivo")) return;
    setShowEnvioCoactivo(true);
  };

  // ── Row action button handlers ────────────────────────────

  // 1. Visualizar Infracción (Eye)
  const handleVisualizarInfraccion = async (row: InfraccionRow) => {
    setSelectedRowId(row.id);
    setActionLoading(true);
    try {
      const res = await cargarDetalleInfraccionAction(row.id);
      if (res.success && res.data) {
        setEditData(res.data as Record<string, string>);
        setShowDetalleInfraccion(true);
      } else {
        alert(res.error ?? res.message ?? "No se encontró el detalle de la infracción.");
      }
    } catch {
      alert("Error de conexión al cargar detalle.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Modificar Infracción (Pencil)
  const handleModificarInfraccion = async (row: InfraccionRow) => {
    if (row.edt === "N") {
      alert(`No puede modificar una infracción ${row.estado}`);
      return;
    }
    setSelectedRowId(row.id);
    setActionLoading(true);
    try {
      const res = await cargarDetalleInfraccionAction(row.id);
      if (res.success && res.data) {
        setEditData(res.data as Record<string, string>);
        setShowEditarInfraccion(true);
      } else {
        alert(res.error ?? res.message ?? "No se encontró la infracción.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Imprimir Resolución de Sanción (Printer)
  const handleImprimirResolucionSancion = async (row: InfraccionRow) => {
    if (row.imp === "N") {
      alert(`No puede imprimir una RS para infracción ${row.estado}`);
      return;
    }
    setReporteLoading(true);
    try {
      const [plantilla, datosRes] = await Promise.all([
        obtenerPlantillaResolucionSancionAction(),
        obtenerDatosReporteResolucionSancionAction({ idtramctas: row.id }),
      ]);
      if (!plantilla.success) { alert(`Error al cargar plantilla: ${plantilla.error}`); return; }
      if (!datosRes.success) { alert(`Error al obtener datos: ${datosRes.error}`); return; }
      const d = datosRes.data ?? {};
      setReporteHtml(construirHtmlReporteResolucion({
        nroSancion: d.nrosanc ?? "-",
        nroPapeleta: d.numero ?? row.id,
        fecAplicacion: d.fecapli ?? row.fecha,
        codInfraccion: d.codinfr ?? row.codigoInfra,
        detalleInfraccion: d.detalleinf ?? "-",
        placa: d.codplac ?? row.placa,
        nombreInfractor: d.nomcond ?? row.conductor,
        direccionInfractor: d.direcccond ?? "-",
        montoMuta: parseFloat(d.valpape ?? "0") || 0,
        montoEnLetras: d.monto_soles ?? "",
        fechaEmision: d.fechnow ?? new Date().toLocaleDateString("es-PE"),
      }, plantilla.data));
      setReportePdf(construirConfigPdfResolucion({
        nroSancion: d.nrosanc ?? "-",
        nroPapeleta: d.numero ?? row.id,
        fecAplicacion: d.fecapli ?? row.fecha,
        codInfraccion: d.codinfr ?? row.codigoInfra,
        detalleInfraccion: d.detalleinf ?? "-",
        placa: d.codplac ?? row.placa,
        nombreInfractor: d.nomcond ?? row.conductor,
        direccionInfractor: d.direcccond ?? "-",
        montoMuta: parseFloat(d.valpape ?? "0") || 0,
      }));
    } catch {
      alert("Error al generar reporte de Resolución de Sanción.");
    } finally {
      setReporteLoading(false);
    }
  };

  // 4. Generar Resolución de Sanción (FileText)
  const handleGenerarResolucionSancion = (row: InfraccionRow) => {
    if (row.gnr === "N") {
      alert(`No puede Generar una RS para infracción ${row.estado}`);
      return;
    }
    setShowResolucionSancion(true);
  };

  // 5. Cambio de Estado (RefreshCw)
  const handleCambioEstado = (row: InfraccionRow) => {
    if (row.cmb === "N") {
      alert(`No puede Cambiar el Estado de una infracción ${row.estado}`);
      setShowCambioEstadoReadOnly(true);
      return;
    }
    setShowCambioEstado(true);
  };

  // 6. Certificado/Gravamen (BookOpen)
  const handleCertGravamen = (row: InfraccionRow) => {
    setShowCertGravamen(true);
  };

  // 7. Imprimir Estado de Cuenta (Receipt)
  const handleImprimirEstadoCuenta = async (row: InfraccionRow) => {
    if (row.imp === "N") {
      alert(`No puede imprimir una infracción ${row.estado}`);
      return;
    }
    if (row.codigoInfra === "M.40") {
      alert("Temporalmente no se puede liquidar esta infracción.");
      return;
    }
    if (row.conductor === "PROVISIONAL PROVISIONAL PROVISIONAL") {
      alert("Ingrese la información del conductor.");
      return;
    }
    setReporteLoading(true);
    try {
      const codigoClean = (row.codigo ?? "").trim();
      let infracClean = (row.codigoInfraccion ?? "").trim().replace(/\s+/g, "");
      const parts = infracClean.split("-");
      if (parts.length === 3 && /^\d+$/.test(parts[2])) {
        infracClean = `${parts[0]}-${parts[1]}-${parts[2].padStart(6, "0")}`;
      }

      const [plantilla, datosRes] = await Promise.all([
        obtenerPlantillaEstadoCuentaAction(),
        obtenerDatosReporteEstadoCuentaAction({
          ninfrac: infracClean || row.id,
          codigo: codigoClean,
          placa: row.placa,
          conductor: row.conductor,
        }),
      ]);
      if (!plantilla.success) { alert(`Error al cargar plantilla: ${plantilla.error}`); return; }
      if (!datosRes.success) { alert(`Error al obtener datos: ${datosRes.error}`); return; }

      let nroLiq = "";
      // Disparar generación de liquidación en segundo plano sin bloquear el UI ni esperar su respuesta
      generarLiquidacionAction({
        codigo: codigoClean,
        infraccion: infracClean,
        usuario: usuarioLogueado,
        idrecibo: row.idRecibo?.trim() ?? "",
      }).then((res) => {
        if (res.success && res.nliqui) {
          nroLiq = res.nliqui;
        }
      }).catch(() => {});

      const rows: any[] = Array.isArray(datosRes.data) ? datosRes.data : [];
      const items = rows.map((r: any) => {
        const isArr = Array.isArray(r);
        // Si viene como array (PHP style) o como objeto (mssql name mapping):
        // row[8]=imp_insol, row[10]=imp_reaj, row[12]=total, row[7]=anno, etc.
        const numPapeleta = isArr ? String(r[7] ?? r[6] ?? row.id) : String(r.cod_pred ?? r.papeleta ?? r.numero ?? row.id).trim();
        const fecInfraccion = isArr ? String(r[13] ?? r[14] ?? "-") : String(r.fecapli ?? "-");
        const codInfraccion = isArr ? String(r[15] ?? r[16] ?? "-") : String(r.infracc ?? r.codinfr ?? "-").trim();
        const placa = isArr ? String(r[17] ?? row.placa) : String(r.cod_pred1 ?? r.codplac ?? row.placa).trim();

        const valInsol = isArr ? (parseFloat(r[8] ?? 0) || 0) : (parseFloat(r.imp_insol ?? 0) || 0);
        // imp_reaj viene como un número (ej: -294.8), tomamos su valor absoluto para la propiedad descuento
        const rawReaj = isArr ? (parseFloat(r[10] ?? 0) || 0) : (parseFloat(r.imp_reaj ?? 0) || 0);
        const desc = Math.abs(rawReaj);
        const sald = isArr ? (parseFloat(r[12] ?? 0) || 0) : (parseFloat(r.total ?? r.saldo ?? 0) || (valInsol - desc));

        return {
          numPapeleta,
          fecInfraccion,
          fecVencimiento: "-",
          codInfraccion,
          placa,
          tributo: isArr ? String(r[3] ?? "") : String(r.tipode1 ?? r.tributo ?? r.tipo ?? ""),
          valPapeleta: valInsol,
          descuento: desc,
          insoluto: valInsol,
          reincidencia: 0,
          costas: 0,
          saldoDeuda: sald,
          estado: "PENDIENTE",
        };
      });
      const totalValPape = items.reduce((s, i) => s + i.valPapeleta, 0);
      const totalDescuento = items.reduce((s, i) => s + i.descuento, 0);
      const totalDeuda = items.reduce((s, i) => s + i.saldoDeuda, 0);
      const totalInsoluto = totalValPape - totalDescuento;
      const nombreSp = rows[0]?.nombre ?? rows[0]?.nomcond ?? "";
      const domicilioSp = rows[0]?.domicilio ?? rows[0]?.direccion ?? "";
      const datosReporte: import("./reportes/EstadoCuenta/reporte-estado-cuenta").DatosEstadoCuenta = {
        codigo: row.codigo,
        nombre: nombreSp || row.conductor || row.propietario || "-",
        domicilio: domicilioSp || "-",
        nombreInfractor: row.conductor || row.propietario,
        numDoc: "",
        placa: row.placa,
        usuario: usuarioLogueado,
        nroLiquidacion: nroLiq,
        items,
        totalValPape,
        totalDescuento,
        totalDeuda,
        totalInsoluto,
      };
      setReporteHtml(construirHtmlReporteEstadoCuenta(datosReporte, plantilla.data));
      setReportePdf(construirConfigPdfEstadoCuenta(datosReporte));
    } catch {
      alert("Error al generar reporte de Estado de Cuenta.");
    } finally {
      setReporteLoading(false);
    }
  };

  const handleEliminarPapeleta = async (row: InfraccionRow) => {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar la papeleta de infracción ${row.codigoInfraccion} (Placa: ${row.placa})?`
    );
    if (!confirmar) return;
    setActionLoading(true);
    try {
      const result = await eliminarPapeletaAction(row.id);
      if (result.success) {
        alert("✅ Infracción eliminada correctamente.");
        executeSearch(page);
      } else {
        alert(`❌ Error: ${result.error ?? "No se pudo eliminar la infracción."}`);
      }
    } catch {
      alert("❌ Error de conexión al eliminar la infracción.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Action toolbar ───────────────────────────────────────

  const renderToolbar = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Acciones
        </span>
      </div>
      <div className="p-2.5 flex flex-col gap-2">
        {/* Fila 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleNuevaInfraccion}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
            >
              <Plus size={13} />
              Nueva Infracción
            </button>
            <button type="button" onClick={handleExcelASql}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
            >
              <Upload size={13} />
              De Excel a SQL
            </button>
            <button type="button" onClick={handleGenerarGravamen}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!filters.placa.trim()}
            >
              <Stamp size={13} />
              Generar Gravamen No Registrado
            </button>
          </div>
          <div>
            <button type="button" onClick={handleImprimirRecordPendiente}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
            >
              <FileSpreadsheet size={13} />
              Imprimir Record Pendiente
            </button>
          </div>
        </div>

        {/* Fila 2 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <button type="button" onClick={handleFraccionarPapeleta}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedRow}
          >
            <CreditCard size={13} />
            Fraccionar Papeleta
          </button>
          <button type="button" onClick={handleVerFraccionamiento}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedRow}
          >
            <Layers size={13} />
            Ver Fraccionamiento
          </button>

          {selectedRow && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <span className="text-[10px] text-slate-400">
                Seleccionado: <span className="font-semibold text-slate-600">{selectedRow.codigoInfraccion}</span>
                {" "}({selectedRow.placa})
              </span>
              <button type="button" onClick={() => setSelectedRowId(null)}
                className="text-[10px] text-red-400 hover:text-red-600 transition ml-1"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── Results table ───────────────────────────────────────

  const renderTableHeader = () => (
    <colgroup>
      <col className="w-[3%]" />
      <col className="w-[4%]" />
      <col className="w-[11%]" />
      <col className="w-[6%]" />
      <col className="w-[5%]" />
      <col className="w-[6%]" />
      <col className="w-[7%]" />
      <col className="w-[5%]" />
      <col className="w-[16%]" />
      <col className="w-[8%]" />
      <col className="w-[8%]" />
      <col className="w-[7%]" />
      <col className="w-[17%]" />
    </colgroup>
  );

  const renderTableBody = () => (
    <tbody className="divide-y divide-slate-100">
      {data.map((row, idx) => {
        const isSelected = row.id === selectedRowId;
        return (
          <tr
            key={`${row.id}-${row.placa}-${row.codigoInfraccion}-${idx}`}
            onClick={() => setSelectedRowId(isSelected ? null : row.id)}
            className={`transition cursor-pointer ${
              isSelected
                ? "bg-sat-cyan/5 hover:bg-sat-cyan/10"
                : idx % 2 === 0
                  ? "bg-white hover:bg-slate-50"
                  : "bg-slate-50/40 hover:bg-slate-50"
            }`}
          >
            <td className="px-1 py-1.5 text-center">
              <input
                type="radio"
                name="selectRow"
                checked={isSelected}
                onChange={() => setSelectedRowId(isSelected ? null : row.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-3 w-3 cursor-pointer accent-sat-cyan"
              />
            </td>
          <td className="px-2 py-1.5 text-[10px] text-slate-400 text-center font-mono w-8">
            {(page - 1) * pageSize + idx + 1}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono font-semibold text-slate-700 truncate">
            {row.codigoInfraccion}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono font-semibold text-slate-700 truncate">
            {row.placa}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-mono text-slate-500 truncate">
            {row.codigoInfra}
          </td>
          <td className="px-2 py-1.5 text-[11px] font-semibold text-slate-700 text-right truncate">
            {row.monto}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">
            {row.fecha}
          </td>
          <td className="px-2 py-1.5 text-[10px] font-mono text-slate-500 truncate">
            {row.codigo}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={row.conductor}>
            {row.conductor}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-500 truncate">
            {row.tipoVehiculo}
          </td>
          <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate" title={row.propietario}>
            {row.propietario}
          </td>
          <td className="px-2 py-1.5">
            <StatusBadge estado={row.estado} />
          </td>
          <td className="px-1 py-1.5">
            <div className="flex items-center gap-1">
              <button type="button" title="Visualizar Infracción"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleVisualizarInfraccion(row); }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-sat-cyan transition">
                <Eye size={13} />
              </button>
              <button type="button" title="Modificar Infracción"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleModificarInfraccion(row); }}
                className={`rounded p-1 transition ${row.edt === "N" ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-sat-cyan"}`}>
                <Pencil size={13} />
              </button>
              {/* TODO: Ocultar temporalmente — Resolución de Sanción no está lista para producción
              <button type="button" title="Imprimir Resolución de Sanción"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleImprimirResolucionSancion(row); }}
                className={`rounded p-1 transition ${row.imp === "N" ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-sat-cyan"}`}>
                <Printer size={13} />
              </button>
              <button type="button" title="Resolución de Sanción"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleGenerarResolucionSancion(row); }}
                className={`rounded p-1 transition ${row.gnr === "N" ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-sat-cyan"}`}>
                <FileText size={13} />
              </button>
              */}
              <button type="button" title="Cambio de Estado"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleCambioEstado(row); }}
                className={`rounded p-1 transition ${row.cmb === "N" ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-sat-cyan"}`}>
                <RefreshCw size={13} />
              </button>
              <button type="button" title="Certificado/Gravamen"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleCertGravamen(row); }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-sat-cyan transition">
                <BookOpen size={13} />
              </button>
              <button type="button" title="Imprimir Estado de Cuenta"
                onClick={(e) => { e.stopPropagation(); setSelectedRowId(row.id); handleImprimirEstadoCuenta(row); }}
                className={`rounded p-1 transition ${row.imp === "N" ? "text-slate-300 cursor-not-allowed" : "text-slate-400 hover:bg-slate-100 hover:text-sat-cyan"}`}>
                <Receipt size={13} />
              </button>
            </div>
          </td>
        </tr>
        );
      })}
    </tbody>
  );

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse min-w-[1100px]" data-testid="infracciones-grid" role="grid">
          {renderTableHeader()}
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              <th className="text-center text-[10px] font-semibold text-white/70 uppercase px-2 py-2.5 border-b border-white/5 w-6" />
              <th className="text-center text-[10px] font-semibold text-white/70 uppercase px-2 py-2.5 border-b border-white/5 w-8">#</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Infracción</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Placa</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Cód. Inf.</th>
              <th className="text-right text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Monto</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Fecha</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Cód.</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Conductor</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Tipo Veh.</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Propietario</th>
              <th className="text-left text-[10px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">Estado</th>
              <th className="text-center text-[10px] font-semibold text-white/70 uppercase px-2 py-2.5 border-b border-white/5">Acciones</th>
            </tr>
          </thead>
          {renderTableBody()}
        </table>
      </div>
    </div>
  );

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <FileWarning size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "infracción" : "infracciones"}
      </span>
    </div>
  );

  // ── Pagination ──────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Anterior"
          >
            <ChevronLeft size={13} />
            Anterior
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                p === page
                  ? "bg-sat-cyan text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Siguiente"
          >
            Siguiente
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  // ── Empty state ──────────────────────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <PackageX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">
        No se encontraron infracciones
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Intente ajustar los filtros de búsqueda
      </p>
    </div>
  );

  // ── Error state ──────────────────────────────────────────

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button
        type="button"
        onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} />
        Reintentar
      </button>
    </div>
  );

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileWarning size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Listado de Infracciones
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Papeleta Tránsito — Consulta de infracciones viajeras
            </p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {/* Action toolbar */}
      {!initialLoading && renderToolbar()}

      {/* Results info */}
      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
        </div>
      )}

      {/* Loading state */}
      {loading && initialLoading && <TableSkeleton />}

      {/* Loading overlay for subsequent searches */}
      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
              <span className="text-xs font-medium text-slate-500">
                Buscando...
              </span>
            </div>
          </div>
          {renderGrid()}
          {renderPagination()}
        </div>
      )}

      {/* Error state */}
      {!loading && error && renderErrorState()}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && !initialLoading && (
        renderEmptyState()
      )}

      {/* Populated grid */}
      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      <NuevaInfraccionModal
        isOpen={showNuevaInfraccion}
        onClose={() => setShowNuevaInfraccion(false)}
        onSuccess={() => executeSearch(page)}
      />
      <FraccionarPapeletaModal
        isOpen={showFraccionar}
        infraccion={selectedRow}
        onClose={() => setShowFraccionar(false)}
        onSuccess={() => { executeSearch(page); setSelectedRowId(null); }}
      />
      <VerFraccionamientoModal
        isOpen={showVerFraccionamiento}
        codigo={selectedRow?.codigo || (selectedRow as any)?.codigoInfractor || (selectedRow as any)?.codigoConductor || null}
        propietarioNombre={selectedRow?.conductor || selectedRow?.propietario || ""}
        onClose={() => setShowVerFraccionamiento(false)}
      />
      <ImportarExcelModal
        isOpen={showImportarExcel}
        onClose={() => setShowImportarExcel(false)}
        onSuccess={() => executeSearch(page)}
      />

      {/* ── Row action modals ──────────────────────────────── */}
      <NuevaInfraccionModal
        isOpen={showDetalleInfraccion}
        editData={editData}
        readOnly={true}
        onClose={() => setShowDetalleInfraccion(false)}
        onSuccess={() => setShowDetalleInfraccion(false)}
      />
      <NuevaInfraccionModal
        isOpen={showEditarInfraccion}
        editData={editData}
        readOnly={false}
        onClose={() => setShowEditarInfraccion(false)}
        onSuccess={() => {
          setShowEditarInfraccion(false);
          executeSearch(page);
        }}
      />
      <ResolucionSancionModal
        isOpen={showResolucionSancion}
        ninfrac={selectedRow?.id ?? null}
        onClose={() => setShowResolucionSancion(false)}
        onSuccess={() => executeSearch(page)}
      />
      <CambioEstadoModal
        isOpen={showCambioEstado}
        ninfrac={selectedRow?.id ?? null}
        editable={true}
        onClose={() => setShowCambioEstado(false)}
        onSuccess={() => executeSearch(page)}
      />
      <CambioEstadoModal
        isOpen={showCambioEstadoReadOnly}
        ninfrac={selectedRow?.id ?? null}
        editable={false}
        onClose={() => setShowCambioEstadoReadOnly(false)}
        onSuccess={() => executeSearch(page)}
      />
      <CertGravamenModal
        isOpen={showCertGravamen}
        ninfrac={selectedRow?.id ?? null}
        usuario={selectedRow?.codigo ?? ""}
        noadeudo={selectedRow?.estadoImpresion ?? ""}
        gravamen={selectedRow?.estImpresion1 ?? ""}
        onClose={() => setShowCertGravamen(false)}
      />
      <CertGravamenSinPlacaModal
        isOpen={showCertGravamenSinPlaca}
        placa={filters.placa.trim()}
        valorGravamen={gravamenSinPlacaValor}
        onClose={() => setShowCertGravamenSinPlaca(false)}
      />
      <EnvioCoactivoModal
        isOpen={showEnvioCoactivo}
        ninfrac={selectedRow?.id ?? null}
        onClose={() => setShowEnvioCoactivo(false)}
        onSuccess={() => executeSearch(page)}
      />

      {/* ── Reporte viewer (Estado de Cuenta / Resolución de Sanción) ── */}
      <ReporteViewerModal
        isOpen={reporteHtml !== null}
        onClose={cerrarReporte}
        html={reporteHtml ?? ""}
        pdfConfig={reportePdf}
      />

      {/* ── Reporte loading overlay ── */}
      {reporteLoading && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
            <span className="text-xs font-medium text-slate-500">Generando reporte...</span>
          </div>
        </div>
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
            <span className="text-xs font-medium text-slate-500">Procesando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
