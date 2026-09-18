"use client";

import { useState, useCallback, useEffect } from "react";
import { Send, CheckCircle2, Search, Loader2, MessageSquare, Building, Inbox, Clock, Eye, X, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { fetchEstadoSolicitudes, responderSolicitudLegal, EstadoSolicitudRow } from "@/actions/asesoria-legal";
import { checkSessionAction } from "@/actions/auth/auth";
import { FileUploaderNAS } from "@/presentation/components/file-uploader-nas";
import { FileViewerModal } from "@/presentation/components/file-viewer-modal";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const ALL_OFICINAS = [
  { id: 1, nombre: "Cobranza" },
  { id: 2, nombre: "Registro" },
  { id: 3, nombre: "Coactivo" },
];

export default function ResponderSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<EstadoSolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterCodificacion, setFilterCodificacion] = useState("");
  const [filterEstadoOficina, setFilterEstadoOficina] = useState(""); // "" | "PENDIENTE" | "RESPONDIDO"
  const [selectedOficinaId, setSelectedOficinaId] = useState<number>(1);
  const [availableOficinas, setAvailableOficinas] = useState(ALL_OFICINAS);

  // Formulario Responder
  const [selectedSolicitud, setSelectedSolicitud] = useState<EstadoSolicitudRow | null>(null);
  const [respuestaText, setRespuestaText] = useState("");
  const [adjunto, setAdjunto] = useState<{ cNombreArchivo: string; cRutaArchivo: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal Ver Respuesta
  const [modalVerRespuesta, setModalVerRespuesta] = useState<EstadoSolicitudRow | null>(null);

  // Visor de Archivos NAS Modal
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  // Cargar sesión del usuario para determinar su oficina y permisos
  useEffect(() => {
    async function initSession() {
      try {
        const session = await checkSessionAction();
        if (session?.authenticated && session.user) {
          const user = session.user;
          const profile = (user.profileName || "").toUpperCase();
          const area = (user.areaName || "").toUpperCase();
          const roles: string[] = Array.isArray(user.roles) ? user.roles.map((r: string) => String(r).toUpperCase()) : [];

          const isSuperUser =
            profile.includes("ADMIN") ||
            profile.includes("GERENCIA") ||
            profile.includes("DESARROLLO") ||
            profile.includes("LEGAL") ||
            roles.some((r: string) => r.includes("ADMIN") || r.includes("SUPER"));

          if (!isSuperUser) {
            let matchedOficinaId: number | null = null;
            if (area.includes("COACTIV") || profile.includes("COACTIV")) {
              matchedOficinaId = 3;
            } else if (area.includes("REGISTRO") || profile.includes("REGISTRO")) {
              matchedOficinaId = 2;
            } else if (area.includes("COBRANZA") || profile.includes("COBRANZA")) {
              matchedOficinaId = 1;
            }

            if (matchedOficinaId) {
              setSelectedOficinaId(matchedOficinaId);
              setAvailableOficinas(ALL_OFICINAS.filter((ofi) => ofi.id === matchedOficinaId));
            }
          }
        }
      } catch (err) {
        console.error("Error al obtener sesión de usuario:", err);
      }
    }
    initSession();
  }, []);

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
      const rowsToExport = solicitudesFiltradas.map((item) => {
        return {
          "N° Trámite": item.cCodificacion,
          "Código": item.ccodigo || "-",
          "Oficina": item.cCodAreaDestino,
          "Estado": item.cEstadoOficina,
          "Fecha Recepción": item.fFecEnvio ? new Date(item.fFecEnvio).toLocaleString("es-PE") : "-",
          "Detalle Solicitado": item.cDetalleSolicitud || "-",
          "Respuesta Registrada": item.cRespuesta || "-",
          "Fecha Respuesta": item.fFecRespuesta ? new Date(item.fFecRespuesta).toLocaleString("es-PE") : "-",
          "Archivo Adjunto NAS": item.cRutaArchivo ? item.cNombreArchivo || "SÍ" : "NO",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rowsToExport);
      const wb = XLSX.utils.book_new();
      const currentOficinaNombre = ALL_OFICINAS.find((o) => o.id === selectedOficinaId)?.nombre || "Oficina";
      XLSX.utils.book_append_sheet(wb, ws, `Bandeja ${currentOficinaNombre}`);
      XLSX.writeFile(wb, `Bandeja_${currentOficinaNombre}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Error al exportar Excel:", err);
    }
  };

  const fetchSolicitudes = useCallback(async () => {
    return fetchEstadoSolicitudes(
      undefined,
      filterCodificacion || undefined,
      selectedOficinaId
    );
  }, [filterCodificacion, selectedOficinaId]);

  useEffect(() => {
    let ignore = false;
    fetchSolicitudes()
      .then((data) => {
        if (!ignore) setSolicitudes(data);
      })
      .catch(() => {
        if (!ignore) setSolicitudes([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [fetchSolicitudes]);

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      setSolicitudes(await fetchSolicitudes());
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, [fetchSolicitudes]);

  const handleResetFilters = () => {
    setFilterDesde("");
    setFilterHasta("");
    setFilterCodificacion("");
    setFilterEstadoOficina("");
    setLoading(true);
    void loadSolicitudes();
  };

  const handleResponder = async () => {
    if (!selectedSolicitud) return;
    if (!respuestaText.trim()) {
      setSubmitError("Ingrese el texto de respuesta o informe requerido");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await responderSolicitudLegal(
        selectedSolicitud.iCodSolicitudOficina,
        respuestaText,
        adjunto?.cNombreArchivo,
        adjunto?.cRutaArchivo
      );
      setSubmitSuccess("Respuesta e informe adjunto registrados y enviados exitosamente a Asesoría Legal.");
      setSelectedSolicitud(null);
      setRespuestaText("");
      setAdjunto(null);
      void loadSolicitudes();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al enviar la respuesta");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado local por fecha y estado de oficina
  const solicitudesFiltradas = solicitudes.filter((item) => {
    if (filterEstadoOficina && item.cEstadoOficina !== filterEstadoOficina) {
      return false;
    }
    if (filterDesde) {
      const itemFecha = item.fFecEnvio ? item.fFecEnvio.substring(0, 10) : "";
      if (itemFecha && itemFecha < filterDesde) return false;
    }
    if (filterHasta) {
      const itemFecha = item.fFecEnvio ? item.fFecEnvio.substring(0, 10) : "";
      if (itemFecha && itemFecha > filterHasta) return false;
    }
    return true;
  });

  const currentOficinaNombre = ALL_OFICINAS.find((o) => o.id === selectedOficinaId)?.nombre || "Oficina";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
              <MessageSquare size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
                Atención de Solicitudes — Bandeja de {currentOficinaNombre}
              </h1>
              <p className="text-xs text-white/50 font-inter">
                Requerimientos asignados por Asesoría Legal a la oficina seleccionada
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Completo */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        {/* Selector de Oficina con Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1">
            <Building size={12} className="text-sat-cyan" /> Oficina:
          </span>
          {availableOficinas.map((ofi) => (
            <button
              key={ofi.id}
              onClick={() => {
                setSelectedSolicitud(null);
                setSelectedOficinaId(ofi.id);
              }}
              className={`px-3.5 py-1 rounded-md text-xs font-bold transition ${selectedOficinaId === ofi.id
                  ? "bg-sat-navy text-sat-cyan shadow-sm border border-sat-cyan/30"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              {ofi.nombre}
            </button>
          ))}
        </div>

        {/* Criterios de Búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className={labelClass}>Estado de Atención</label>
            <select
              value={filterEstadoOficina}
              onChange={(e) => setFilterEstadoOficina(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Todos --</option>
              <option value="PENDIENTE">PENDIENTE (Atender)</option>
              <option value="RESPONDIDO">RESPONDIDO</option>
              <option value="OBSERVADO">OBSERVADO (Por Corregir)</option>
              <option value="CONFORME">CONFORME (Aprobado)</option>
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
              onClick={() => {
                setLoading(true);
                void loadSolicitudes();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition shadow-xs"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table Column */}
        <div className={`${selectedSolicitud ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm custom-scrollbar">
            <table className="w-full min-w-[700px] table-fixed border-collapse">
              <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                <tr>
                  <th className="text-left text-xs font-bold text-white uppercase px-2.5 py-2.5 w-[16%]">
                    N° Trámite
                  </th>
                  <th className="text-left text-xs font-bold text-white uppercase px-2.5 py-2.5 w-[14%]">
                    Cód. Contrib.
                  </th>
                  <th className="text-left text-xs font-bold text-white uppercase px-2.5 py-2.5 w-[16%]">
                    Fecha Envío
                  </th>
                  <th className="text-left text-xs font-bold text-white uppercase px-2.5 py-2.5 w-[36%]">
                    Requerimiento Específico
                  </th>
                  <th className="text-center text-xs font-bold text-white uppercase px-2.5 py-2.5 w-[18%]">
                    Estado / Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-xs text-slate-400">
                      <Inbox size={24} className="mx-auto mb-2 opacity-40" />
                      {loading ? "Cargando requerimientos..." : `No hay requerimientos para ${currentOficinaNombre}.`}
                    </td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map((s, idx) => (
                    <tr
                      key={s.iCodSolicitudOficina}
                      className={`transition hover:bg-slate-50 ${selectedSolicitud?.iCodSolicitudOficina === s.iCodSolicitudOficina
                          ? "bg-cyan-50/60"
                          : idx % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/40"
                        }`}
                    >
                      <td className="px-2.5 py-2.5 text-sm font-mono font-bold text-sat-navy tracking-tight truncate">
                        {s.cCodificacion}
                      </td>
                      <td className="px-2.5 py-2.5 text-[13px] font-mono font-bold text-sat-cyan tracking-tight truncate">
                        {s.ccodigo || "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-slate-600 truncate">
                        {s.fFecEnvio ? new Date(s.fFecEnvio).toLocaleString("es-PE") : "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-[11px] text-slate-600 truncate">
                        {s.cDetalleSolicitud || "Sin especificación"}
                      </td>
                      <td className="px-2 py-2.5 text-center flex items-center justify-center gap-1">
                        {s.nFlgEstado === 3 ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-2xs">
                              <CheckCircle2 size={11} className="text-emerald-700" /> Conforme
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalVerRespuesta(s)}
                              className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 border border-sky-200 transition hover:bg-sky-100 cursor-pointer shadow-2xs"
                              title="Ver Respuesta Aprobada por Legal"
                            >
                              <Eye size={11} />
                            </button>
                          </>
                        ) : s.nFlgEstado === 4 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSolicitud(s);
                                setRespuestaText("");
                                setAdjunto(null);
                                setSubmitError(null);
                                setSubmitSuccess(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-white border border-amber-600 text-[10px] font-bold hover:bg-amber-600 transition cursor-pointer shadow-xs animate-pulse"
                              title="Respuesta Observada por Legal: Hacer clic para redactar nueva respuesta corregida"
                            >
                              <AlertTriangle size={11} className="text-white" /> Observado (Corregir)
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalVerRespuesta(s)}
                              className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 border border-sky-200 transition hover:bg-sky-100 cursor-pointer shadow-2xs"
                              title="Ver Respuesta Enviada"
                            >
                              <Eye size={11} />
                            </button>
                          </>
                        ) : s.cEstadoOficina === "RESPONDIDO" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSolicitud(s);
                                setRespuestaText(s.cRespuesta || "");
                                setSubmitError(null);
                                setSubmitSuccess(null);
                                if (s.cRutaArchivo) {
                                  setAdjunto({ cNombreArchivo: s.cNombreArchivo || "Documento Adjunto", cRutaArchivo: s.cRutaArchivo });
                                } else {
                                  setAdjunto(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
                              title="Hacer clic para editar respuesta enviada"
                            >
                              <CheckCircle2 size={11} className="text-emerald-600" /> Respondido (Editar)
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalVerRespuesta(s)}
                              className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 border border-sky-200 transition hover:bg-sky-100 cursor-pointer shadow-2xs"
                              title="Ver Respuesta Enviada"
                            >
                              <Eye size={11} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSolicitud(s);
                              setRespuestaText(s.cRespuesta || "");
                            }}
                            className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-amber-600 shadow-xs"
                          >
                            <Send size={11} />
                            Atender
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Panel cuando se selecciona una solicitud */}
        {selectedSolicitud && (
          <div className="lg:col-span-5 space-y-3 animate-in fade-in duration-200">
            <div className="rounded-lg border border-sat-cyan/30 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-sat-navy uppercase flex items-center gap-1.5">
                  {selectedSolicitud.nFlgEstado === 4 ? (
                    <>
                      <AlertTriangle size={13} className="text-amber-600" />
                      Corregir Respuesta Observada ({currentOficinaNombre})
                    </>
                  ) : (
                    <>
                      <Send size={13} className="text-sat-cyan" />
                      Atender Requerimiento ({currentOficinaNombre})
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setSelectedSolicitud(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="rounded bg-slate-50 p-2.5 border border-slate-200 text-xs space-y-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Trámite:</span>
                  <span className="font-mono font-bold text-sat-navy">{selectedSolicitud.cCodificacion}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Detalle Solicitado por Legal:</span>
                  <p className="text-slate-600 font-mono text-[11px]">{selectedSolicitud.cDetalleSolicitud || "Sin especificación"}</p>
                </div>
                {selectedSolicitud.nFlgEstado === 4 && selectedSolicitud.cNotaObservacion && (
                  <div className="mt-2 rounded bg-amber-50 p-2 border border-amber-300 text-amber-900">
                    <span className="font-bold flex items-center gap-1 text-[10px] uppercase text-amber-800">
                      <AlertTriangle size={12} /> Solicitud Observada por Asesoría Legal:
                    </span>
                    <p className="text-[11px] mt-0.5 font-medium">{selectedSolicitud.cNotaObservacion}</p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Respuesta de la Oficina / Informe Técnico *</label>
                <textarea
                  rows={4}
                  value={respuestaText}
                  onChange={(e) => setRespuestaText(e.target.value)}
                  placeholder={`Ingrese el sustento o informe de ${currentOficinaNombre} para Asesoría Legal...`}
                  className={inputClass}
                />
              </div>

              {/* Adjunto de Archivo / Informe técnico al NAS */}
              <FileUploaderNAS
                label="Adjuntar Informe / Documento Digital (NAS)"
                cCodificacion={selectedSolicitud.cCodificacion}
                oficina={currentOficinaNombre}
                currentFileName={adjunto?.cNombreArchivo}
                onUploadSuccess={(data) => setAdjunto({ cNombreArchivo: data.cNombreArchivo, cRutaArchivo: data.cRutaArchivo })}
                onRemove={() => setAdjunto(null)}
              />

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
                  onClick={() => {
                    setSelectedSolicitud(null);
                    setAdjunto(null);
                  }}
                  className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResponder}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar Respuesta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ver Respuesta de la Oficina */}
      {modalVerRespuesta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-sat-navy">
                  Detalle de Respuesta — <span className="font-mono text-sat-cyan">{modalVerRespuesta.cCodificacion}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Oficina: <span className="font-bold text-slate-600">{currentOficinaNombre}</span>
                </p>
              </div>
              <button
                onClick={() => setModalVerRespuesta(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* LÍNEA DE TIEMPO VISUAL */}
            <div className="rounded-xl bg-slate-50/90 p-3.5 border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5 text-center">
                Flujo de Atención por la Oficina
              </span>
              <div className="relative flex items-center justify-between max-w-sm mx-auto">
                <div className="absolute left-6 right-6 top-3.5 h-1 bg-slate-200 -z-0 rounded-full" />
                <div
                  className={`absolute left-6 top-3.5 h-1 -z-0 rounded-full transition-all duration-500 ${modalVerRespuesta.cEstadoOficina === "RESPONDIDO"
                      ? "w-full bg-gradient-to-r from-emerald-500 to-sat-cyan"
                      : "w-1/2 bg-amber-500"
                    }`}
                />

                {/* Hito 1: Recibido */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs shadow-xs">
                    <CheckCircle2 size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 mt-1">Recibido</span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {modalVerRespuesta.fFecEnvio ? new Date(modalVerRespuesta.fFecEnvio).toLocaleDateString("es-PE") : "Enviado"}
                  </span>
                </div>

                {/* Hito 2: Atendido */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs transition-colors ${modalVerRespuesta.cEstadoOficina === "RESPONDIDO"
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-amber-500 text-white shadow-xs ring-4 ring-amber-100"
                      }`}
                  >
                    {modalVerRespuesta.cEstadoOficina === "RESPONDIDO" ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 mt-1">Respuesta</span>
                  <span className="text-[9px] font-semibold text-sat-cyan">
                    {modalVerRespuesta.cEstadoOficina === "RESPONDIDO" ? "Enviada" : "Pendiente"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded bg-slate-50 p-2.5 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Requerimiento de Asesoría Legal:</span>
                <p className="text-slate-700">{modalVerRespuesta.cDetalleSolicitud || "Sin especificación"}</p>
                {modalVerRespuesta.fFecEnvio && (
                  <span className="text-[10px] text-slate-400 font-mono block mt-1">
                    Enviado: {new Date(modalVerRespuesta.fFecEnvio).toLocaleString("es-PE")}
                  </span>
                )}
              </div>

              <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-800 font-bold text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Respuesta Registrada:
                  </span>
                  {modalVerRespuesta.fFecRespuesta && (
                    <span className="text-[10px] font-mono font-semibold text-emerald-700">
                      {new Date(modalVerRespuesta.fFecRespuesta).toLocaleString("es-PE")}
                    </span>
                  )}
                </div>
                <p className="text-emerald-900 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {modalVerRespuesta.cRespuesta || "Sin respuesta escrita registrada."}
                </p>

                {modalVerRespuesta.cRutaArchivo && (
                  <div className="pt-2 border-t border-emerald-200/60 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setViewerFile({
                          url: `/api/storage/download/${modalVerRespuesta.cRutaArchivo}`,
                          name: modalVerRespuesta.cNombreArchivo || "Documento Adjunto NAS",
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-xs cursor-pointer"
                    >
                      <Eye size={13} />
                      Previsualizar Adjunto NAS ({modalVerRespuesta.cNombreArchivo || "Documento"})
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalVerRespuesta(null)}
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
