"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import {
  X,
  Loader2,
  FileText,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Eye,
  Users,
  History,
} from "lucide-react";
import {
  getPeriodosAction,
  getPeriodoDetalleAction,
  getPrediosDJAction,
  obtenerHojaResumenAction,
  type PeriodoAnnoItem,
  type PeriodoDetalleData,
  type PredioDJItemData,
  type HojaResumenData,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getTiposUsoAction } from "@/actions/reportes-gerenciales/predios-uso";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import { toNum } from "@/lib/num";
import HojaResumenFormModal from "./hoja-resumen-form-modal";
import DeterminacionModal from "./determinacion-modal";

// ─── Types ────────────────────────────────────────────────

interface ContribuyenteInfo {
  codigo: string;
  nombre: string;
  documento: string;
  domicilio: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contribuyente: ContribuyenteInfo;
}

// ─── Modal ────────────────────────────────────────────────

export default function DeclaracionJuradaDetalleModal({
  isOpen,
  onClose,
  contribuyente,
}: Props) {
  const modalId = useModalStack(isOpen);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── State ──
  const [periodos, setPeriodos] = useState<PeriodoAnnoItem[]>([]);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [periodosError, setPeriodosError] = useState<string | null>(null);

  const [annoSeleccionado, setAnnoSeleccionado] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<PeriodoDetalleData | null>(null);
  const [predios, setPredios] = useState<PredioDJItemData[]>([]);
  const [tiposUso, setTiposUso] = useState<Map<string, string>>(new Map());
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  const [predioFilter, setPredioFilter] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);

  // ── Hoja de Resumen (Nuevo HR / Editar HR) ──
  const [hrModalOpen, setHrModalOpen] = useState(false);
  const [hrExistente, setHrExistente] = useState<HojaResumenData | null>(null);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrMessage, setHrMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // ── Load periods on open ──
  useEffect(() => {
    if (!isOpen) return;
    setPeriodos([]);
    setAnnoSeleccionado(null);
    setDetalle(null);
    setPredios([]);
    setPredioFilter("");
    setDetalleError(null);

    let cancelled = false;
    (async () => {
      setPeriodosLoading(true);
      setPeriodosError(null);
      const result = await getPeriodosAction(contribuyente.codigo);
      if (cancelled) return;
      if (result.success) {
        setPeriodos(result.data);
        // Auto-select latest year
        if (result.data.length > 0) {
          const latest = result.data[0].anno;
          setAnnoSeleccionado(latest);
          loadDetalle(contribuyente.codigo, latest);
        }
      } else {
        setPeriodosError(result.error);
      }
      setPeriodosLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isOpen, contribuyente.codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load detail + predios when year changes ──
  const loadDetalle = useCallback(
    async (codigo: string, anno: string) => {
      setDetalleLoading(true);
      setDetalleError(null);
      setDetalle(null);
      setPredios([]);

      const [usoRes, detRes, predRes] = await Promise.all([
        getTiposUsoAction(),
        getPeriodoDetalleAction(codigo, anno),
        getPrediosDJAction(codigo, anno),
      ]);

      if (usoRes.success) {
        setTiposUso(
          new Map(usoRes.data.map((u) => [normUsoCode(u.id_uso), u.descripcion])),
        );
      }
      if (detRes.success) setDetalle(detRes.data);
      if (predRes.success) setPredios(predRes.data);

      if (!detRes.success && !predRes.success) {
        setDetalleError("Error al cargar datos del período.");
      } else if (!detRes.success) {
        setDetalleError(detRes.error);
      }

      setDetalleLoading(false);
      setPredioFilter("");
      filterInputRef.current?.focus();
    },
    [],
  );

  const handleAnnoClick = (anno: string) => {
    setAnnoSeleccionado(anno);
    loadDetalle(contribuyente.codigo, anno);
  };

  // ── Determinación ──
  const [detModalOpen, setDetModalOpen] = useState(false);

  // ── Editar HR: carga la Hoja de Resumen existente y abre el modal ──
  const editarHojaResumen = async () => {
    if (!annoSeleccionado || hrLoading) return;
    setHrLoading(true);
    setHrMessage(null);
    const res = await obtenerHojaResumenAction(contribuyente.codigo, annoSeleccionado);
    setHrLoading(false);
    if (!res.success) {
      setHrMessage({ type: "error", text: res.error });
      return;
    }
    setHrExistente(res.data);
    setHrModalOpen(true);
  };

  // ── Escape key ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopModal(modalId)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, modalId, onClose]);

  // ── Filter predios ──
  const prediosFiltrados = predioFilter.trim()
    ? predios.filter(
        (p) =>
          p.direccion.toUpperCase().includes(predioFilter.toUpperCase()) ||
          p.codPred.toUpperCase().includes(predioFilter.toUpperCase()),
      )
    : predios;

  // ── Traducir código de uso a descripción (formato titular) ──
  const usoLabel = (uso: string) =>
    titleCaseUso(tiposUso.get(normUsoCode(uso)) ?? uso);

  // ── Derived totals ──
  const totalPredios = Number(detalle?.nroPredi ?? 0);
  const totalAutoavaluo = toNum(detalle?.totAutoavaluo);
  const totalBaseImponible = toNum(detalle?.baseImponible);
  const totalImpAnual = toNum(detalle?.impAnual);
  const totalImpTrim = toNum(detalle?.impTrime);
  const totalCostoEmi = toNum(detalle?.costoEmi);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[85vh] w-full max-w-[1100px] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-cyan-300" />
            <FileText size={14} className="text-cyan-300" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Declaración Jurada
            </h2>
            <span className="ml-1 text-[10px] text-white/50">
              — {contribuyente.codigo}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Content (offset for header) ── */}
        <div className="flex w-full pt-[42px]">
          {/* ── Left: Períodos ── */}
          <div className="w-[100px] shrink-0 border-r border-slate-200 bg-slate-50/60 flex flex-col">
            <div className="px-2.5 py-2 border-b border-slate-200 bg-slate-100/80">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                Períodos
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {periodosLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-slate-300" />
                </div>
              )}
              {periodosError && (
                <div className="px-2 py-4 text-center">
                  <AlertCircle size={14} className="mx-auto mb-1 text-red-300" />
                  <p className="text-[10px] text-red-400">{periodosError}</p>
                </div>
              )}
              {!periodosLoading && !periodosError && periodos.length === 0 && (
                <p className="px-2 py-4 text-center text-[10px] text-slate-400">
                  Sin períodos
                </p>
              )}
              {periodos.map((p) => (
                <button
                  key={p.anno}
                  type="button"
                  onClick={() => handleAnnoClick(p.anno)}
                  className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                    annoSeleccionado === p.anno
                      ? "bg-sat-cyan/10 text-sat-cyan border-r-2 border-sat-cyan"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {annoSeleccionado === p.anno && (
                    <ChevronRight size={10} className="shrink-0 text-sat-cyan" />
                  )}
                  {p.anno}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: Main content ── */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* ── Contributor info bar ── */}
            <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                <div>
                  <span className="text-slate-400 font-semibold">Código: </span>
                  <span className="font-mono font-semibold text-slate-700">{contribuyente.codigo}</span>
                </div>
                <div className="max-w-[300px]">
                  <span className="text-slate-400 font-semibold">Contribuyente: </span>
                  <span className="text-slate-700 truncate">{contribuyente.nombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Nro. Documento: </span>
                  <span className="text-slate-700">{contribuyente.documento}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Régimen: </span>
                  <span className="text-slate-700">{detalle?.porInafec ?? ""}</span>
                </div>
                <div className="max-w-[350px]">
                  <span className="text-slate-400 font-semibold">Domicilio Fiscal: </span>
                  <span className="text-slate-700 truncate">{contribuyente.domicilio}</span>
                </div>
              </div>
            </div>

            {/* ── Loading overlay ── */}
            {detalleLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-xl">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
                  <Loader2 size={14} className="animate-spin text-sat-cyan" />
                  <span className="text-xs font-medium text-slate-500">Cargando...</span>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {!detalleLoading && detalleError && (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle size={20} className="mb-2 text-red-300" />
                <p className="text-xs text-red-500">{detalleError}</p>
                <button
                  type="button"
                  onClick={() => annoSeleccionado && loadDetalle(contribuyente.codigo, annoSeleccionado)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100"
                >
                  <RotateCcw size={10} /> Reintentar
                </button>
              </div>
            )}

            {/* ── No selection ── */}
            {!detalleLoading && !detalleError && !annoSeleccionado && (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={28} className="mb-2 text-slate-200" />
                <p className="text-xs text-slate-400">Seleccione un período</p>
              </div>
            )}

            {/* ── Content area ── */}
            {!detalleLoading && !detalleError && annoSeleccionado && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* ── Filter + Period label ── */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-white">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Periodo:
                  </span>
                  <span className="text-[11px] font-bold text-sat-navy">{annoSeleccionado}</span>
                  <div className="flex-1" />
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    Filtrar Predios:
                  </span>
                  <input
                    ref={filterInputRef}
                    type="text"
                    value={predioFilter}
                    onChange={(e) => setPredioFilter(e.target.value)}
                    placeholder="Dirección o código..."
                    className="w-[200px] rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>

                {/* ── Predios Grid ── */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full table-fixed border-collapse whitespace-nowrap text-[11px]">
                    <colgroup>
                      {/* Acciones */}
                      <col style={{ width: "8%" }} />
                      {/* Tipo */}
                      <col style={{ width: "4%" }} />
                      {/* Cód. Predio */}
                      <col style={{ width: "8%" }} />
                      {/* Anexo */}
                      <col style={{ width: "8%" }} />
                      {/* Dirección */}
                      <col style={{ width: "37%" }} />
                      {/* Uso Predio */}
                      <col style={{ width: "9%" }} />
                      {/* % */}
                      <col style={{ width: "4%" }} />
                      {/* Arancel */}
                      <col style={{ width: "6%" }} />
                      {/* Area(m2) */}
                      <col style={{ width: "6%" }} />
                      {/* Autoavalúo */}
                      <col style={{ width: "8%" }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-sat-navy to-[#1e3050]">
                      <tr>
                        <th
                          rowSpan={2}
                          className="px-1 py-2 text-center text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[8%]"
                        >
                          Acciones
                        </th>
                        <th
                          colSpan={5}
                          className="px-2 py-1.5 text-center text-[10px] font-semibold text-white/90 uppercase border-b border-white/5"
                        >
                          Predio
                        </th>
                        <th
                          colSpan={4}
                          className="px-2 py-1.5 text-center text-[10px] font-semibold text-white/90 uppercase border-b border-white/5"
                        >
                          Valores
                        </th>
                      </tr>
                      <tr>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[4%]">
                          Tipo
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[7%]">
                          Cód. Predio
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[6%]">
                          Anexo
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[40%]">
                          Dirección
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[9%]">
                          Uso Predio
                        </th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[4%]">
                          %
                        </th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[6%]">
                          Arancel
                        </th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[6%]">
                          Area(m2)
                        </th>
                        <th className="px-2 py-2 text-right text-[10px] font-semibold text-white/90 uppercase border-b border-white/5 w-[8%]">
                          Autoavalúo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prediosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-[11px] text-slate-400">
                            {predioFilter ? "No se encontraron predios con ese filtro" : "Sin predios registrados"}
                          </td>
                        </tr>
                      )}
                      {prediosFiltrados.map((p, idx) => {
                        const isVendido = p.predioVendido.trim() === "1";
                        return (
                          <tr
                            key={`${p.codPred}-${p.anexo}-${idx}`}
                            className={`transition hover:bg-slate-50 ${
                              isVendido
                                ? "bg-red-50/60"
                                : idx % 2 === 0
                                ? "bg-white"
                                : "bg-slate-50/40"
                            }`}
                          >
                            <td className="px-1 py-1">
                              {/* TODO: conectar con las pantallas de la app nueva (Características / Propietarios / Reporte HR / Historial aún no implementadas) */}
                              <div className="flex items-center justify-start gap-[1px]">
                                <button
                                  type="button"
                                  title="Características"
                                  className="rounded p-[2px] text-slate-500 transition hover:bg-slate-200 hover:text-sat-navy"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Propietarios"
                                  className="rounded p-[2px] text-slate-500 transition hover:bg-slate-200 hover:text-sat-navy"
                                >
                                  <Users size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Reporte HR"
                                  className="rounded p-[2px] text-slate-500 transition hover:bg-slate-200 hover:text-sat-navy"
                                >
                                  <FileText size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Historial de Predios"
                                  className="rounded p-[2px] text-slate-500 transition hover:bg-slate-200 hover:text-sat-navy"
                                >
                                  <History size={12} />
                                </button>
                              </div>
                            </td>
                            <ScrollTd className="font-mono text-slate-600">
                              {p.tipo}
                            </ScrollTd>
                            <ScrollTd className="font-mono text-slate-700">
                              {p.codPred}
                            </ScrollTd>
                            <ScrollTd className="text-slate-600">
                              {p.anexo}
                            </ScrollTd>
                            <ScrollTd className="text-slate-700">
                              {p.direccion}
                            </ScrollTd>
                            <ScrollTd className="text-slate-600">
                              {usoLabel(p.uso)}
                            </ScrollTd>
                            <ScrollTd className="text-right font-mono text-slate-600">
                              {Math.round(toNum(p.porcenPropiedad))}
                            </ScrollTd>
                            <ScrollTd className="text-right font-mono text-slate-600">
                              {p.arancel}
                            </ScrollTd>
                            <ScrollTd className="text-right font-mono text-slate-600">
                              {p.areaTerreno}
                            </ScrollTd>
                            <ScrollTd className="text-right font-mono text-slate-700 font-medium">
                              {toNum(p.totalAutoavaluo).toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </ScrollTd>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>                

                {/* ── Action buttons + Cuponera ── */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap gap-4">
                    {/* ── Acciones de Predio ── */}
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
                      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
                        Acciones de Predio
                      </legend>
                      <div className="grid grid-cols-3 gap-1.5">
                        <ActionBtn id="btnNuevoHr" label="Nuevo HR" onClick={() => {
                          setHrMessage(null);
                          setHrExistente(null);
                          setHrModalOpen(true);
                        }} />
                        <ActionBtn id="btnNuevoPu" label="1ra. Inscripción" />
                        <ActionBtn id="btnEliminarPu" label="Baja de Predio" />
                        <ActionBtn id="btnEditarHr" label="Editar HR" onClick={editarHojaResumen} />
                        <ActionBtn id="btnInscripcion" label="Inscripción" />
                        <ActionBtn id="btnCargabaja" label="Ver Baja Predio" />
                        <ActionBtn id="btnDeterminacion" label="Determinación" onClick={() => {
                          if (!contribuyente?.codigo || !annoSeleccionado) return;
                          setDetModalOpen(true);
                        }} />
                        <ActionBtn id="btnhimpresiones" label="Rep. Impresos" />
                        <ActionBtn id="btnVenta" label="Cese de Predio" />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm border border-slate-400 bg-red-500" />
                        Predio Cesado
                      </div>
                      {hrLoading && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Loader2 size={12} className="animate-spin text-sat-cyan" />
                          Buscando Hoja de Resumen...
                        </div>
                      )}
                      {hrMessage && (
                        <div
                          className={`mt-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${
                            hrMessage.type === "error"
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          }`}
                        >
                          {hrMessage.text}
                        </div>
                      )}
                    </fieldset>

                    {/* ── Cuponera ── */}
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
                      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
                        Cuponera
                      </legend>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                        <CuponCheck id="chHR" label="HR" />
                        <CuponCheck id="chHLP" label="HLP" />
                        <CuponCheck id="chCARGO" label="Cargo" />
                        <CuponCheck id="chPU" label="PU" />
                        <CuponCheck id="chHLA" label="HLA" />
                        <CuponCheck id="chOI" label="OI" />
                        <CuponCheck id="chPR" label="PR" />
                        <CuponCheck id="chCARA" label="Carátula" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-3 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 active:scale-[0.98]"
                        >
                          Imprimir Selección
                        </button>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input type="checkbox" id="chVIRT" className="h-3 w-3 rounded border-slate-300 accent-sat-cyan" />
                          <span className="text-[10px] font-medium text-slate-600">VIRTUAL</span>
                        </label>
                      </div>
                    </fieldset>

                    {/* ── Resumen ── */}
                    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
                      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
                        Resumen
                      </legend>
                      <div className="space-y-0.5">
                        <SummaryRow label="Nro. Predios" value={String(totalPredios)} />
                        <SummaryRow label="Total Autoavalúo" value={totalAutoavaluo.toLocaleString("es-PE", { minimumFractionDigits: 2 })} />
                        <SummaryRow label="Base Imponible" value={totalBaseImponible.toLocaleString("es-PE", { minimumFractionDigits: 2 })} />
                        <SummaryRow label="Impuesto Anual" value={totalImpAnual.toLocaleString("es-PE", { minimumFractionDigits: 2 })} />
                        <SummaryRow label="Impuesto Trim." value={totalImpTrim.toLocaleString("es-PE", { minimumFractionDigits: 2 })} />
                        <SummaryRow label="Costo Emisión" value={totalCostoEmi.toLocaleString("es-PE", { minimumFractionDigits: 2 })} />
                      </div>
                    </fieldset>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Hoja de Resumen (Nuevo HR / Editar HR) ── */}
      <HojaResumenFormModal
        isOpen={hrModalOpen}
        onClose={() => {
          setHrModalOpen(false);
          setHrExistente(null);
        }}
        codigoContribuyente={contribuyente.codigo}
        numeroDoc={contribuyente.documento}
        razonSocial={contribuyente.nombre}
        direccion={contribuyente.domicilio}
        annoSeleccionado={annoSeleccionado}
        hrExistente={hrExistente}
        onSaved={() => {
          setHrMessage({ type: "success", text: "Hoja de Resumen guardada correctamente." });
          if (annoSeleccionado) loadDetalle(contribuyente.codigo, annoSeleccionado);
        }}
      />

      {/* ── Modal Determinación (Impuesto Predial / Arbitrios) ── */}
      <DeterminacionModal
        isOpen={detModalOpen}
        onClose={() => setDetModalOpen(false)}
        codigoContribuyente={contribuyente?.codigo ?? ""}
        razonSocial={contribuyente?.nombre ?? ""}
        direccion={contribuyente?.domicilio ?? ""}
        annoSeleccionado={annoSeleccionado}
      />
    </div>
  );
}

// ─── Summary Item ─────────────────────────────────────────

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400 font-semibold">{label}:</span>
      <span className="text-[11px] font-bold text-sat-navy">{value}</span>
    </div>
  );
}

// ─── Summary Row (compact, for fieldset) ─────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px]">
      <span className="text-slate-400 font-semibold">{label}:</span>
      <span className="font-bold text-sat-navy tabular-nums">{value}</span>
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────

function ActionBtn({ id, label, onClick }: { id: string; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 active:scale-[0.97]"
    >
      {label}
    </button>
  );
}

// ─── Cuponera Checkbox ────────────────────────────────────

function CuponCheck({ id, label }: { id: string; label: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        className="h-3 w-3 rounded border-slate-300 accent-sat-cyan"
      />
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </label>
  );
}

// ─── Uso: normalizar código para el catálogo ───────────────
// El SP de predios puede devolver el uso como código ("01" / "1"); se normaliza
// para cruzarlo con el catálogo de tipos de uso (id_uso -> descripcion).

function normUsoCode(v: string): string {
  const t = v.trim();
  return /^\d+$/.test(t) ? String(Number(t)) : t;
}

// Convierte "CASA HABITACION" → "Casa Habitacion" para la columna Uso Predio.
function titleCaseUso(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

// ─── Scrollable Table Cell ────────────────────────────────
// La celda no salta de línea: si el contenido excede el ancho de la columna,
// aparece un scroll horizontal dentro de la propia celda para ver el resto.

function ScrollTd({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <td className={`px-2 py-1.5 ${className}`}>
      <div className="overflow-x-auto whitespace-nowrap [scrollbar-width:thin]">
        {children}
      </div>
    </td>
  );
}
