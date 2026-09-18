"use client";

import { useState, useCallback, useEffect } from "react";
import { Scale, Search, Loader2, PlusCircle, CheckCircle2, Clock, Send, Eye, X, FileText, FileSpreadsheet, Pencil, Save, AlertTriangle, History } from "lucide-react";
import {
  fetchTramitesBomberos,
  crearSolicitudLegal,
  actualizarSolicitudLegal,
  evaluarRespuestaOficinaAction,
  fetchHistorialRespuestasAction,
  fetchEstadoSolicitudes,
  TramiteBomberosRow,
  EstadoSolicitudRow,
  HistorialRespuestaRow,
} from "@/actions/asesoria-legal";
import { FileUploaderNAS } from "@/presentation/components/file-uploader-nas";
import { FileViewerModal } from "@/presentation/components/file-viewer-modal";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const OFICINAS_DISPONIBLES = [
  { id: "1", nombre: "Cobranza" },
  { id: "2", nombre: "Registro" },
  { id: "3", nombre: "Coactivo" },
];

interface TramiteAgrupado {
  iCodSolicitud: number;
  iCodTramite: number;
  cCodificacion: string;
  cObservacionLegal: string;
  fFecSolicitud: string;
  cEstadoCabecera: string;
  cobranza: { enviado: boolean; respondido: boolean; detalle?: string; respuesta?: string; fechaRespuesta?: string; rutaArchivo?: string; nombreArchivo?: string };
  registro: { enviado: boolean; respondido: boolean; detalle?: string; respuesta?: string; fechaRespuesta?: string; rutaArchivo?: string; nombreArchivo?: string };
  coactivo: { enviado: boolean; respondido: boolean; detalle?: string; respuesta?: string; fechaRespuesta?: string; rutaArchivo?: string; nombreArchivo?: string };
  rawItems: EstadoSolicitudRow[];
}

const formatDateLocal = (dateStr: string | Date | undefined | null) => {
  if (!dateStr) return "-";
  const str = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  // Quitar la Z final si existiera para tratar la fecha como hora local del servidor
  const cleanStr = str.replace(/Z$/, "").replace(/T/, " ");
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString("es-PE");
};

export default function SolicitudInformacionPage() {
  // Filtros de búsqueda para Bomberos
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterCodigo, setFilterCodigo] = useState("");
  const [filterCodificacion, setFilterCodificacion] = useState("");
  const [filterEstadoLegal, setFilterEstadoLegal] = useState("");

  // Trámites Bomberos
  const [tramites, setTramites] = useState<TramiteBomberosRow[]>([]);
  const [loadingTramites, setLoadingTramites] = useState(false);
  const [selectedTramite, setSelectedTramite] = useState<TramiteBomberosRow | null>(null);

  // Formulario Solicitud
  const [observacionLegal, setObservacionLegal] = useState("");
  const [selectedOficinas, setSelectedOficinas] = useState<{ cCodAreaDestino: string; cDetalleSolicitud: string }[]>([]);
  const [adjuntoSolicitud, setAdjuntoSolicitud] = useState<{ cNombreArchivo: string; cRutaArchivo: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Solicitudes para matriz de control
  const [estadoSolicitudes, setEstadoSolicitudes] = useState<EstadoSolicitudRow[]>([]);

  // Modal Detalle y Edición
  const [modalDetalle, setModalDetalle] = useState<TramiteAgrupado | null>(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editObservacionLegal, setEditObservacionLegal] = useState("");
  const [editOficinasDetalle, setEditOficinasDetalle] = useState<Record<string, string>>({});
  const [editAdjuntoSolicitud, setEditAdjuntoSolicitud] = useState<{ cNombreArchivo: string; cRutaArchivo: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Evaluación de Respuesta por Legal
  const [evaluandoOficinaId, setEvaluandoOficinaId] = useState<number | null>(null);
  const [observandoOficinaId, setObservandoOficinaId] = useState<number | null>(null);
  const [notaObservacionText, setNotaObservacionText] = useState("");

  // Modal Historial de Envíos
  const [modalHistorial, setModalHistorial] = useState<{ ofiNombre: string; iCodSolicitudOficina: number } | null>(null);
  const [historialItems, setHistorialItems] = useState<HistorialRespuestaRow[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const handleVerHistorial = async (ofiNombre: string, iCodSolicitudOficina: number) => {
    setModalHistorial({ ofiNombre, iCodSolicitudOficina });
    setLoadingHistorial(true);
    try {
      const data = await fetchHistorialRespuestasAction(iCodSolicitudOficina);
      setHistorialItems(data);
    } catch {
      setHistorialItems([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleOpenModalDetalle = (item: TramiteAgrupado) => {
    setModalDetalle(item);
    setIsEditingModal(false);
    setEditObservacionLegal(item.cObservacionLegal || "");
    const map: Record<string, string> = {};
    item.rawItems.forEach((i) => {
      map[i.cCodAreaDestino] = i.cDetalleSolicitud || "";
    });
    setEditOficinasDetalle(map);
    setEditAdjuntoSolicitud(null);
    setEditError(null);
    setEditSuccess(null);
    setObservandoOficinaId(null);
    setNotaObservacionText("");
  };

  const handleGuardarEdicionSolicitud = async () => {
    if (!modalDetalle) return;
    setSavingEdit(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const oficinasDestino = modalDetalle.rawItems.map((i) => ({
        cCodAreaDestino:
          i.iCodOficina !== undefined
            ? String(i.iCodOficina)
            : i.cCodAreaDestino === "Cobranza"
            ? "1"
            : i.cCodAreaDestino === "Registro"
            ? "2"
            : i.cCodAreaDestino === "Coactivo"
            ? "3"
            : "1",
        cDetalleSolicitud: editOficinasDetalle[i.cCodAreaDestino] || "",
      }));

      await actualizarSolicitudLegal(modalDetalle.iCodSolicitud, editObservacionLegal, oficinasDestino);
      setEditSuccess("Solicitud actualizada exitosamente.");
      setIsEditingModal(false);
      loadData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al actualizar la solicitud");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEvaluarRespuesta = async (iCodSolicitudOficina: number, nFlgEstado: number, cNotaObservacion?: string) => {
    setEvaluandoOficinaId(iCodSolicitudOficina);
    setEditError(null);
    setEditSuccess(null);
    try {
      await evaluarRespuestaOficinaAction(iCodSolicitudOficina, nFlgEstado, cNotaObservacion);
      setEditSuccess(nFlgEstado === 3 ? "Conforme registrado exitosamente." : "Respuesta Observada. Devuelta a la oficina para corrección.");
      setObservandoOficinaId(null);
      setNotaObservacionText("");
      
      // Recargar datos y actualizar la vista del modal en vivo sin cerrarlo
      const [tramitesData, estadosData] = await Promise.all([
        fetchTramitesBomberos(filterDesde, filterHasta, filterCodigo, filterCodificacion, filterEstadoLegal),
        fetchEstadoSolicitudes(),
      ]);
      setTramites(tramitesData);
      setEstadoSolicitudes(estadosData);

      // Actualizar los datos internos del modal activo
      if (modalDetalle) {
        const cod = modalDetalle.cCodificacion;
        const nuevosItems = estadosData.filter((e) => e.cCodificacion === cod);
        setModalDetalle((prev) => prev ? {
          ...prev,
          rawItems: nuevosItems,
        } : null);
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al evaluar la respuesta");
    } finally {
      setEvaluandoOficinaId(null);
    }
  };

  // Visor de Archivos NAS Modal
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoadingTramites(true);
    try {
      const [tramitesData, estadosData] = await Promise.all([
        fetchTramitesBomberos(filterDesde, filterHasta, filterCodigo, filterCodificacion, filterEstadoLegal),
        fetchEstadoSolicitudes(),
      ]);
      setTramites(tramitesData);
      setEstadoSolicitudes(estadosData);
    } catch {
      setTramites([]);
      setEstadoSolicitudes([]);
    } finally {
      setLoadingTramites(false);
    }
  }, [filterDesde, filterHasta, filterCodigo, filterCodificacion, filterEstadoLegal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setQuickDateRange = (preset: "hoy" | "7dias" | "mes") => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const hasta = formatDate(today);
    let desde = hasta;

    if (preset === "7dias") {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      desde = formatDate(past);
    } else if (preset === "mes") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      desde = formatDate(firstDay);
    }

    setFilterDesde(desde);
    setFilterHasta(hasta);
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rowsToExport = Object.values(tramitesAgrupadosMap).map((item) => {
        return {
          "N° Trámite": item.cCodificacion,
          "Fecha Solic.": item.fFecSolicitud ? new Date(item.fFecSolicitud).toLocaleDateString("es-PE") : "-",
          "Indicación Legal": item.cObservacionLegal || "-",
          "Cobranza": item.cobranza.enviado ? (item.cobranza.respondido ? `ATN (${item.cobranza.fechaRespuesta ? new Date(item.cobranza.fechaRespuesta).toLocaleString("es-PE") : ""})` : "PND") : "NO SOLICITADO",
          "Registro": item.registro.enviado ? (item.registro.respondido ? `ATN (${item.registro.fechaRespuesta ? new Date(item.registro.fechaRespuesta).toLocaleString("es-PE") : ""})` : "PND") : "NO SOLICITADO",
          "Coactivo": item.coactivo.enviado ? (item.coactivo.respondido ? `ATN (${item.coactivo.fechaRespuesta ? new Date(item.coactivo.fechaRespuesta).toLocaleString("es-PE") : ""})` : "PND") : "NO SOLICITADO",
          "Tiene Adjunto NAS": item.cobranza.rutaArchivo || item.registro.rutaArchivo || item.coactivo.rutaArchivo ? "SÍ" : "NO",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rowsToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Solicitudes Legal");
      XLSX.writeFile(wb, `Reporte_Asesoria_Legal_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Error al exportar Excel:", err);
    }
  };

  const handleResetFilters = () => {
    setFilterDesde("");
    setFilterHasta("");
    setFilterCodigo("");
    setFilterCodificacion("");
    setFilterEstadoLegal("");
    setTimeout(loadData, 50);
  };

  // Agrupar respuestas por Solicitud / Trámite para la matriz
  const tramitesAgrupadosMap = estadoSolicitudes.reduce((acc, current) => {
    const key = current.cCodificacion;
    if (!acc[key]) {
      acc[key] = {
        iCodSolicitud: current.iCodSolicitud,
        iCodTramite: current.iCodTramite,
        cCodificacion: current.cCodificacion,
        cObservacionLegal: current.cObservacionLegal,
        fFecSolicitud: current.fFecSolicitud,
        cEstadoCabecera: current.cEstadoCabecera,
        cobranza: { enviado: false, respondido: false },
        registro: { enviado: false, respondido: false },
        coactivo: { enviado: false, respondido: false },
        rawItems: [],
      };
    }

    acc[key].rawItems.push(current);

    const ofiId = current.cCodAreaDestino;
    const isRespondido = current.cEstadoOficina === "RESPONDIDO" || current.cEstadoOficina === "CONFORME" || current.cEstadoOficina === "OBSERVADO";
    const info = {
      enviado: true,
      respondido: isRespondido,
      estadoOficina: current.cEstadoOficina,
      detalle: current.cDetalleSolicitud,
      respuesta: current.cRespuesta,
      fechaRespuesta: current.fFecRespuesta,
      rutaArchivo: current.cRutaArchivo,
      nombreArchivo: current.cNombreArchivo,
    };

    if (ofiId === "Cobranza" || ofiId === "1") acc[key].cobranza = info;
    else if (ofiId === "Registro" || ofiId === "2") acc[key].registro = info;
    else if (ofiId === "Coactivo" || ofiId === "3") acc[key].coactivo = info;

    return acc;
  }, {} as Record<string, TramiteAgrupado>);

  const handleToggleOficina = (idArea: string) => {
    if (selectedOficinas.some((o) => o.cCodAreaDestino === idArea)) {
      setSelectedOficinas(selectedOficinas.filter((o) => o.cCodAreaDestino !== idArea));
    } else {
      setSelectedOficinas([...selectedOficinas, { cCodAreaDestino: idArea, cDetalleSolicitud: "" }]);
    }
  };

  const handleUpdateDetalleOficina = (idArea: string, detalle: string) => {
    setSelectedOficinas(
      selectedOficinas.map((o) => (o.cCodAreaDestino === idArea ? { ...o, cDetalleSolicitud: detalle } : o))
    );
  };

  const handleCrearSolicitud = async () => {
    if (!selectedTramite) return;
    if (selectedOficinas.length === 0) {
      setSubmitError("Debe seleccionar al menos una oficina de destino");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await crearSolicitudLegal({
        iCodTramite: selectedTramite.iCodTramite,
        cCodificacion: selectedTramite.cCodificacion,
        ccodigo: selectedTramite.ccodigo,
        fFecDesde: selectedTramite.fFecDesde,
        fFecHasta: selectedTramite.fFecHasta,
        cObservacionLegal: observacionLegal,
        oficinasDestino: selectedOficinas,
      });

      setSubmitSuccess(`Solicitud enviada a ${selectedOficinas.length} oficina(s) correctamente.`);
      setSelectedTramite(null);
      setObservacionLegal("");
      setSelectedOficinas([]);
      setAdjuntoSolicitud(null);
      loadData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const renderBadgeEstadoLegal = (estado?: string) => {
    switch (estado) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={9} /> PENDIENTE
          </span>
        );
      case "EN PROCESO":
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            EN PROCESO
          </span>
        );
      case "ATENDIDO":
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={9} /> ATENDIDO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            SIN SOLICITUD
          </span>
        );
    }
  };

  const renderOficinaCell = (info: {
    enviado: boolean;
    respondido: boolean;
    estadoOficina?: string;
    fechaRespuesta?: string;
    rutaArchivo?: string;
    nombreArchivo?: string;
  }) => {
    if (!info.enviado) return <span className="text-slate-300 text-[10px] font-mono">—</span>;

    const isObservado = info.estadoOficina === "OBSERVADO";

    if (info.respondido) {
      let fechaFormateada = "";
      if (info.fechaRespuesta) {
        const str = typeof info.fechaRespuesta === "string" ? info.fechaRespuesta : new Date(info.fechaRespuesta).toISOString();
        const cleanStr = str.replace(/Z$/, "").replace(/T/, " ");
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
          fechaFormateada = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      }

      return (
        <div className="flex flex-col items-center">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isObservado
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isObservado ? <AlertTriangle size={10} className="text-amber-700" /> : <CheckCircle2 size={10} className="text-emerald-600" />}
            {isObservado ? "OBS" : "ATN"}
          </span>
          {fechaFormateada && (
            <span className="text-[10px] font-mono text-slate-600 mt-0.5 leading-none font-bold">
              {fechaFormateada}
            </span>
          )}
          {info.rutaArchivo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewerFile({
                  url: `/api/storage/download/${info.rutaArchivo}`,
                  name: info.nombreArchivo || "Documento Adjunto NAS",
                });
              }}
              className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[8px] font-bold hover:bg-sky-100 transition shadow-2xs"
              title={`Ver Adjunto NAS: ${info.nombreArchivo || "Documento"}`}
            >
              <Eye size={9} className="text-sky-600" />
              <FileText size={9} className="text-sky-600" /> Adjunto
            </button>
          )}
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold">
        <Clock size={9} className="text-amber-600 animate-pulse" /> PND
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Unificado */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Scale size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Solicitar Información
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Consola única para derivar requerimientos a oficinas y monitorear respuestas en tiempo real
            </p>
          </div>
        </div>
      </div>

      {/* Panel de Filtros de Búsqueda */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Search size={13} className="text-sat-cyan" />
          Filtros de Búsqueda
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>Fecha Desde</label>
            <input
              type="date"
              value={filterDesde}
              onChange={(e) => setFilterDesde(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha Hasta</label>
            <input
              type="date"
              value={filterHasta}
              onChange={(e) => setFilterHasta(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cód. Contribuyente (ccodigo)</label>
            <input
              type="text"
              value={filterCodigo}
              onChange={(e) => setFilterCodigo(e.target.value)}
              placeholder="Ej: 0352415"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>N° Trámite (cCodificacion)</label>
            <input
              type="text"
              value={filterCodificacion}
              onChange={(e) => setFilterCodificacion(e.target.value)}
              placeholder="Ej: 202600192"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Legal</label>
            <select
              value={filterEstadoLegal}
              onChange={(e) => setFilterEstadoLegal(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Todos --</option>
              <option value="SIN SOLICITUD">SIN SOLICITUD</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN PROCESO">EN PROCESO</option>
              <option value="ATENDIDO">ATENDIDO</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Rápido:</span>
            <button
              type="button"
              onClick={() => setQuickDateRange("hoy")}
              className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setQuickDateRange("7dias")}
              className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              onClick={() => setQuickDateRange("mes")}
              className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Este Mes
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              Exportar a Excel
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              Limpiar Filtros
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loadingTramites}
              className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition shadow-sm"
            >
              {loadingTramites ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tabla Unificada Completa */}
        <div className={`${selectedTramite ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm custom-scrollbar">
            <table className="w-full min-w-[1100px] table-fixed border-collapse">
              <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                <tr>
                  <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-1.5 py-2.5 w-[6.2%]">
                    N° Trámite
                  </th>
                  <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-1.5 py-2.5 w-[4.8%]">
                    Cód. Contrib.
                  </th>
                  <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-1.5 py-2.5 w-[7.5%]">
                    Fecha Doc.
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[4.5%]">
                    Desde
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[4.5%]">
                    Hasta
                  </th>
                  <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-2 py-2.5 w-[31%]">
                    Contribuyente / Asunto
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[9.5%]">
                    Estado Legal
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[8%]">
                    Cobranza
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[8%]">
                    Registro
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1 py-2.5 w-[8%]">
                    Coactivo
                  </th>
                  <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-1.5 py-2.5 w-[12%]">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tramites.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400">
                      {loadingTramites ? "Buscando trámites..." : "No se encontraron trámites con los criterios ingresados."}
                    </td>
                  </tr>
                ) : (
                  tramites.map((t, idx) => {
                    const infoAgrupada = tramitesAgrupadosMap[t.cCodificacion];
                    const fecRegObj = t.fFecRegistro ? new Date(t.fFecRegistro) : null;
                    const fechaRegStr = fecRegObj
                      ? `${String(fecRegObj.getDate()).padStart(2, "0")}/${String(fecRegObj.getMonth() + 1).padStart(2, "0")}/${fecRegObj.getFullYear()}`
                      : "-";

                    const anioDesde = t.fFecDesde ? String(t.fFecDesde).substring(0, 4) : "-";
                    const anioHasta = t.fFecHasta ? String(t.fFecHasta).substring(0, 4) : "-";

                    return (
                      <tr
                        key={t.iCodTramite}
                        className={`transition hover:bg-slate-50 ${
                          selectedTramite?.iCodTramite === t.iCodTramite ? "bg-cyan-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-2 py-2 text-[13.5px] font-mono font-bold text-sat-navy tracking-tight truncate">
                          {t.cCodificacion}
                        </td>
                        <td className="px-2 py-2 text-[12.5px] font-mono font-bold text-sat-cyan tracking-tight truncate">
                          {t.ccodigo || "-"}
                        </td>
                        <td className="px-2 py-2 text-[11px] font-mono text-slate-600 truncate">
                          {fechaRegStr}
                        </td>
                        <td className="px-1 py-2 text-[11px] font-mono font-bold text-slate-700 text-center truncate">
                          {anioDesde}
                        </td>
                        <td className="px-1 py-2 text-[11px] font-mono font-bold text-slate-700 text-center truncate">
                          {anioHasta}
                        </td>
                        <td className="px-2.5 py-2 text-[12px]">
                          <div className="font-medium text-slate-800 truncate">{t.nombre_contribuyente || t.ccodigo}</div>
                          <div className="text-[11px] text-slate-500 truncate">{t.cAsunto}</div>
                        </td>

                        {/* Estado Legal General */}
                        <td className="px-2 py-2 text-center">
                          {renderBadgeEstadoLegal(t.cEstadoSolicitudLegal)}
                        </td>

                        {/* Cobranza Status */}
                        <td className="px-2 py-2 text-center">
                          {renderOficinaCell(infoAgrupada?.cobranza ?? { enviado: false, respondido: false })}
                        </td>

                        {/* Registro Status */}
                        <td className="px-2 py-2 text-center">
                          {renderOficinaCell(infoAgrupada?.registro ?? { enviado: false, respondido: false })}
                        </td>

                        {/* Coactivo Status */}
                        <td className="px-2 py-2 text-center">
                          {renderOficinaCell(infoAgrupada?.coactivo ?? { enviado: false, respondido: false })}
                        </td>

                        {/* Acciones: Solicitar o Ver Respuestas */}
                        <td className="px-2 py-2 text-center flex items-center justify-center gap-1">
                          {infoAgrupada ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 cursor-not-allowed border border-slate-200"
                                title={`Solicitado el ${formatDateLocal(infoAgrupada.fFecSolicitud)}`}
                              >
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                Solicitado
                              </button>
                              <span className="text-[9px] font-mono text-slate-400 font-medium">
                                {formatDateLocal(infoAgrupada.fFecSolicitud)}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedTramite(t)}
                              className="inline-flex items-center gap-1 rounded bg-sat-cyan px-2 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 shadow-2xs cursor-pointer"
                              title="Nueva Solicitud"
                            >
                              <PlusCircle size={11} />
                              Solicitar
                            </button>
                          )}

                          {infoAgrupada && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenModalDetalle(infoAgrupada)}
                                className="inline-flex items-center justify-center p-1.5 rounded bg-sky-50 text-sky-700 border border-sky-200 transition hover:bg-sky-100 cursor-pointer shadow-2xs"
                                title="Ver Respuestas y Detalle de Solicitud"
                              >
                                <Eye size={13} />
                              </button>

                              {(() => {
                                const totalRespondidas = infoAgrupada.rawItems.filter((i) => i.cEstadoOficina === "RESPONDIDO").length;
                                if (totalRespondidas === 0) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleOpenModalDetalle(infoAgrupada);
                                        setIsEditingModal(true);
                                      }}
                                      className="inline-flex items-center justify-center p-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200 transition hover:bg-amber-100 cursor-pointer shadow-2xs"
                                      title="Editar Solicitud de Información"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    type="button"
                                    disabled
                                    className="inline-flex items-center justify-center p-1.5 rounded bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50"
                                    title="Edición bloqueada: Una o más oficinas ya han respondido"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Formulario cuando se hace clic en Solicitar */}
        {selectedTramite && (
          <div className="lg:col-span-5 space-y-3 animate-in fade-in duration-200">
            <div className="rounded-lg border border-sat-cyan/30 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-sat-navy uppercase">
                  Solicitar Información: {selectedTramite.cCodificacion}
                </h3>
                <button
                  onClick={() => setSelectedTramite(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className={labelClass}>Observaciones / Indicación del Área Legal</label>
                <textarea
                  rows={2}
                  value={observacionLegal}
                  onChange={(e) => setObservacionLegal(e.target.value)}
                  placeholder="Instrucción general para las oficinas solicitadas..."
                  className={inputClass}
                />
              </div>

              {/* Adjuntar Archivo al NAS para la solicitud */}
              <FileUploaderNAS
                label="Adjuntar Documento / Requerimiento en NAS"
                cCodificacion={selectedTramite.cCodificacion}
                currentFileName={adjuntoSolicitud?.cNombreArchivo}
                onUploadSuccess={(data) => setAdjuntoSolicitud({ cNombreArchivo: data.cNombreArchivo, cRutaArchivo: data.cRutaArchivo })}
                onRemove={() => setAdjuntoSolicitud(null)}
              />

              <div>
                <label className={labelClass}>Seleccionar Oficinas Destino</label>
                <div className="space-y-2 mt-1">
                  {OFICINAS_DISPONIBLES.map((ofi) => {
                    const selected = selectedOficinas.find((o) => o.cCodAreaDestino === ofi.id);
                    return (
                      <div key={ofi.id} className="rounded border border-slate-200 p-2 text-xs bg-slate-50/50 space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => handleToggleOficina(ofi.id)}
                            className="rounded border-slate-300 text-sat-cyan focus:ring-sat-cyan"
                          />
                          {ofi.nombre}
                        </label>
                        {selected && (
                          <input
                            type="text"
                            value={selected.cDetalleSolicitud}
                            onChange={(e) => handleUpdateDetalleOficina(ofi.id, e.target.value)}
                            placeholder={`Detalle específico para ${ofi.nombre}...`}
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {submitError && (
                <div className="rounded bg-red-50 p-2 text-[11px] text-red-600 border border-red-200">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="rounded bg-emerald-50 p-2 text-[11px] text-emerald-700 border border-emerald-200">
                  {submitSuccess}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTramite(null)}
                  className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearSolicitud}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar Solicitudes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE RESPUESTAS Y EDICIÓN (Ojito) */}
      {modalDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-sat-navy">
                  Detalle de Respuestas — Trámite: <span className="font-mono text-sat-cyan">{modalDetalle.cCodificacion}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Solicitado el {formatDateLocal(modalDetalle.fFecSolicitud)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const totalRespondidas = modalDetalle.rawItems.filter((i) => i.cEstadoOficina === "RESPONDIDO").length;
                  if (totalRespondidas === 0 && !isEditingModal) {
                    return (
                      <button
                        type="button"
                        onClick={() => setIsEditingModal(true)}
                        className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600 transition shadow-xs cursor-pointer"
                        title="Editar indicación o detalle antes que respondan las oficinas"
                      >
                        <Pencil size={12} />
                        Editar Solicitud
                      </button>
                    );
                  } else if (totalRespondidas > 0) {
                    return (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        🔒 Edición Bloqueada (Oficinas respondieron)
                      </span>
                    );
                  }
                  return null;
                })()}

                <button
                  onClick={() => setModalDetalle(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Mensajes de error/éxito de edición */}
            {editError && (
              <div className="rounded bg-red-50 p-2 text-[11px] text-red-600 border border-red-200">
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="rounded bg-emerald-50 p-2 text-[11px] text-emerald-700 border border-emerald-200">
                {editSuccess}
              </div>
            )}

            {/* LÍNEA DE TIEMPO VISUAL */}
            {(() => {
              const totalOficinas = modalDetalle.rawItems.length;
              const respondidas = modalDetalle.rawItems.filter((i) => i.cEstadoOficina === "RESPONDIDO").length;
              const esCompletado = respondidas === totalOficinas && totalOficinas > 0;

              return (
                <div className="rounded-xl bg-slate-50/90 p-4 border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
                    Flujo y Estado del Requerimiento
                  </span>
                  <div className="relative flex items-center justify-between max-w-md mx-auto">
                    {/* Barra de Fondo */}
                    <div className="absolute left-6 right-6 top-3.5 h-1 bg-slate-200 -z-0 rounded-full" />
                    {/* Barra de Progreso */}
                    <div
                      className="absolute left-6 top-3.5 h-1 bg-gradient-to-r from-emerald-500 to-sat-cyan -z-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          totalOficinas === 0
                            ? 0
                            : Math.min(100, (respondidas / totalOficinas) * 85 + (respondidas > 0 ? 15 : 0))
                        }%`,
                      }}
                    />

                    {/* Hito 1: Creado */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-200">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 mt-1.5">Enviado</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(modalDetalle.fFecSolicitud).toLocaleDateString("es-PE")}
                      </span>
                    </div>

                    {/* Hito 2: En Revisión */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shadow-md transition-colors ${
                          esCompletado
                            ? "bg-emerald-500 text-white shadow-emerald-200"
                            : respondidas > 0
                            ? "bg-sat-cyan text-white shadow-cyan-200 ring-4 ring-cyan-100"
                            : "bg-amber-500 text-white shadow-amber-200 ring-4 ring-amber-100"
                        }`}
                      >
                        {esCompletado ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 mt-1.5">En Revisión</span>
                      <span className="text-[9px] font-semibold text-sat-cyan">
                        {respondidas} de {totalOficinas} respondidas
                      </span>
                    </div>

                    {/* Hito 3: Atendida */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                          esCompletado
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 mt-1.5">Atendida</span>
                      <span className="text-[9px] font-medium text-slate-400">
                        {esCompletado ? "Completada" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* MODO EDICIÓN vs MODO LECTURA */}
            {isEditingModal ? (
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center gap-1 text-amber-800 font-bold text-xs uppercase">
                  <Pencil size={13} />
                  <span>Modo Edición de Solicitud Legal</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Indicación / Observación de Legal
                  </label>
                  <textarea
                    rows={3}
                    value={editObservacionLegal}
                    onChange={(e) => setEditObservacionLegal(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 focus:border-sat-cyan focus:outline-none"
                    placeholder="Ingrese la observación o indicación general de Asesoría Legal..."
                  />
                </div>

                {/* Adjuntar o Cambiar Documento de Requerimiento (NAS) */}
                <FileUploaderNAS
                  label="Adjuntar / Cambiar Documento de Requerimiento (NAS)"
                  cCodificacion={modalDetalle.cCodificacion}
                  currentFileName={editAdjuntoSolicitud?.cNombreArchivo}
                  onUploadSuccess={(data) => setEditAdjuntoSolicitud({ cNombreArchivo: data.cNombreArchivo, cRutaArchivo: data.cRutaArchivo })}
                  onRemove={() => setEditAdjuntoSolicitud(null)}
                />

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Detalle por Oficina
                  </label>
                  {modalDetalle.rawItems.map((ofi) => (
                    <div key={ofi.iCodSolicitudOficina} className="space-y-1">
                      <span className="text-[11px] font-bold text-sat-navy">{ofi.cCodAreaDestino}:</span>
                      <input
                        type="text"
                        value={editOficinasDetalle[ofi.cCodAreaDestino] || ""}
                        onChange={(e) =>
                          setEditOficinasDetalle({
                            ...editOficinasDetalle,
                            [ofi.cCodAreaDestino]: e.target.value,
                          })
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-sat-cyan focus:outline-none"
                        placeholder={`Especifique qué solicita a ${ofi.cCodAreaDestino}...`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingModal(false)}
                    className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardarEdicionSolicitud}
                    disabled={savingEdit}
                    className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                  >
                    {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            ) : (
              <>
                {modalDetalle.cObservacionLegal && (
                  <div className="rounded-md bg-slate-50 p-3 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">Indicación / Observación de Legal:</span>
                    <p className="text-slate-600 font-mono text-[11px]">{modalDetalle.cObservacionLegal}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Respuestas por Oficina:</h4>
                  {modalDetalle.rawItems.map((ofi) => (
                    <div key={ofi.iCodSolicitudOficina} className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-sat-navy">{ofi.cCodAreaDestino}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              ofi.nFlgEstado === 3 || ofi.cEstadoOficina === "CONFORME"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : ofi.nFlgEstado === 4 || ofi.cEstadoOficina === "OBSERVADO"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : ofi.cEstadoOficina === "RESPONDIDO"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {ofi.nFlgEstado === 3 || ofi.cEstadoOficina === "CONFORME" ? (
                              <>
                                <CheckCircle2 size={11} className="text-emerald-700" /> CONFORME
                              </>
                            ) : ofi.nFlgEstado === 4 || ofi.cEstadoOficina === "OBSERVADO" ? (
                              <>
                                <AlertTriangle size={11} className="text-amber-700" /> OBSERVADO
                              </>
                            ) : ofi.cEstadoOficina === "RESPONDIDO" ? (
                              <>
                                <CheckCircle2 size={11} className="text-sky-600" /> RESPONDIDO
                              </>
                            ) : (
                              <>
                                <Clock size={11} className="text-slate-400" /> PENDIENTE
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-slate-400 font-semibold text-[10px] uppercase block">Requerimiento:</span>
                          <p className="text-slate-700 font-mono text-[11px]">{ofi.cDetalleSolicitud || "Sin especificación"}</p>
                        </div>

                        {ofi.cRespuesta ? (
                          <div className="rounded-md bg-slate-50/80 p-3 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                              <span className="text-slate-600 font-bold text-[10px] uppercase">
                                Respuesta Registrada ({formatDateLocal(ofi.fFecRespuesta)}):
                              </span>
                              <button
                                type="button"
                                onClick={() => handleVerHistorial(ofi.cCodAreaDestino, ofi.iCodSolicitudOficina)}
                                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[9.5px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs"
                                title="Ver historial de respuestas anteriores"
                              >
                                <History size={10} /> Historial
                              </button>
                            </div>

                            <p className="text-slate-800 font-mono text-[11px] whitespace-pre-wrap">{ofi.cRespuesta}</p>

                            {ofi.cNotaObservacion && (
                              <div className="rounded bg-amber-50/90 p-2 border border-amber-200 text-[11px] text-amber-900">
                                <span className="font-bold block text-[9.5px] uppercase text-amber-800">Observación enviada a la oficina:</span>
                                {ofi.cNotaObservacion}
                              </div>
                            )}

                            {/* Fila de Documento Adjunto + Acciones principales */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                              {ofi.cRutaArchivo ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewerFile({
                                      url: `/api/storage/download/${ofi.cRutaArchivo}`,
                                      name: ofi.cNombreArchivo || "Documento Adjunto NAS",
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-700 shadow-2xs cursor-pointer"
                                  title="Ver Archivo Adjunto en Visor"
                                >
                                  <FileText size={11} className="text-sat-cyan" />
                                  <span className="max-w-[180px] truncate">{ofi.cNombreArchivo || "Ver Adjunto NAS"}</span>
                                  <Eye size={11} className="ml-0.5 text-slate-300" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Sin archivo adjunto</span>
                              )}

                              {/* Acciones de Evaluación de Legal (Visto Bueno vs Pedir Corrección) */}
                              {ofi.cEstadoOficina === "RESPONDIDO" && ofi.nFlgEstado !== 3 && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                  {observandoOficinaId === ofi.iCodSolicitudOficina ? (
                                    <div className="w-full space-y-2 rounded-md bg-amber-50 p-2.5 border border-amber-300 mt-2">
                                      <label className="block text-[10px] font-bold text-amber-900 uppercase">
                                        Indique el motivo de la observación:
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={notaObservacionText}
                                        onChange={(e) => setNotaObservacionText(e.target.value)}
                                        placeholder="Escriba qué debe precisar o corregir la oficina..."
                                        className="w-full rounded border border-amber-300 bg-white p-1.5 text-xs text-slate-800 focus:outline-none"
                                      />
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setObservandoOficinaId(null);
                                            setNotaObservacionText("");
                                          }}
                                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          disabled={evaluandoOficinaId === ofi.iCodSolicitudOficina}
                                          onClick={() => handleEvaluarRespuesta(ofi.iCodSolicitudOficina, 4, notaObservacionText)}
                                          className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                                        >
                                          {evaluandoOficinaId === ofi.iCodSolicitudOficina && <Loader2 size={11} className="animate-spin" />}
                                          Enviar Observación
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        disabled={evaluandoOficinaId === ofi.iCodSolicitudOficina}
                                        onClick={() => setObservandoOficinaId(ofi.iCodSolicitudOficina)}
                                        className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50/80 px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                                        title="Pedir corrección o aclaración"
                                      >
                                        <AlertTriangle size={11} className="text-amber-700" /> Observar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={evaluandoOficinaId === ofi.iCodSolicitudOficina}
                                        onClick={() => handleEvaluarRespuesta(ofi.iCodSolicitudOficina, 3)}
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                                        title="Dar Visto Bueno (Conforme)"
                                      >
                                        {evaluandoOficinaId === ofi.iCodSolicitudOficina ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                        Conforme
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-600 italic mt-1">Aún no ha registrado respuesta.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalDetalle(null)}
                className="rounded bg-sat-navy px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Respuestas */}
      {modalHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="text-sat-cyan" size={18} />
                <h3 className="text-sm font-bold text-sat-navy">
                  Historial de Envíos — <span className="text-sat-cyan">{modalHistorial.ofiNombre}</span>
                </h3>
              </div>
              <button
                onClick={() => setModalHistorial(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {loadingHistorial ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : historialItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay envíos registrados.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {historialItems.map((item, idx) => (
                  <div
                    key={item.iCodRespuesta}
                    className={`rounded-lg p-3 border text-xs space-y-1.5 ${
                      idx === 0
                        ? "bg-emerald-50/80 border-emerald-200"
                        : "bg-slate-50 border-slate-200 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase text-slate-600 flex items-center gap-1">
                        Envío #{historialItems.length - idx} {idx === 0 && "(Último - Vigente)"}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {formatDateLocal(item.fFecRespuesta)}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-800 whitespace-pre-wrap">{item.cRespuesta}</p>
                    {item.cRutaArchivo && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                          <FileText size={12} className="text-slate-500" />
                          {item.cNombreArchivo || "Adjunto NAS"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setViewerFile({
                              url: `/api/storage/download/${item.cRutaArchivo}`,
                              name: item.cNombreArchivo || "Documento NAS",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye size={10} /> Ver Archivo
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalHistorial(null)}
                className="rounded bg-sat-navy px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor Modal de Archivos NAS */}
      {viewerFile && (
        <FileViewerModal
          isOpen={!!viewerFile}
          onClose={() => setViewerFile(null)}
          fileUrl={viewerFile.url}
          fileName={viewerFile.name}
        />
      )}
    </div>
  );
}
