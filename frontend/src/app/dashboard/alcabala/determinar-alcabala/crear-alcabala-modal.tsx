"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import {
  searchContribuyenteAction,
  searchPredioAction,
  getUitAction,
  getTipoCambioAction,
  type ContribuyenteItem,
  type PredioItem,
} from "@/actions/alcabala/determinar-alcabala";

// ── Types ──────────────────────────────────────────────────

interface CrearAlcabalaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contribuyente: ContribuyenteItem | null;
}

type SearchTarget = "comprador" | "vendedor";

// ── Style tokens (matching project patterns) ───────────────

const sectionBtn =
  "flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider border border-slate-200 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20";

const sectionContent = "px-1 pt-2 pb-1.5 space-y-1";

const fieldLabel =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.0 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

const inputMono = `${inputClass} font-mono text-[10px]`;

const searchBtnClass =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-sat-cyan focus:outline-none focus:ring-2 focus:ring-sat-cyan/20";

const primaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed";

const secondaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]";

// ── ContribuyenteSearchPopup ────────────────────────────────

interface SearchPopupProps {
  target: SearchTarget;
  onSelect: (item: ContribuyenteItem, target: SearchTarget) => void;
  onPredioSelect: (item: PredioItem, target: SearchTarget) => void;
  onClose: () => void;
  /** Contract date (fechaContrato); its year is sent as @anio to sp_DJAlcabala */
  fechaContrato: string;
  /** Keeps the form's fechaContrato in sync while the popup is open */
  onFechaContratoChange: (value: string) => void;
}

function ContribuyenteSearchPopup({ target, onSelect, onPredioSelect, onClose, fechaContrato, onFechaContratoChange }: SearchPopupProps) {
  // Contract year derived from the fechaContrato prop — feeds @anio to the SPs
  const anio = fechaContrato.slice(0, 4);
  // ── Tipo de búsqueda (unificado: Contribuyente + Predio) ──
  type TipoBusqueda = "C" | "N" | "R" | "D" | "P";
  const TIPO_BUSQUEDA_OPTIONS: { value: TipoBusqueda; label: string }[] = [
    { value: "C", label: "Código" },
    { value: "N", label: "Nombre" },
    { value: "R", label: "Razón Social" },
    { value: "D", label: "Documento" },
    { value: "P", label: "Código Predio" },
  ];
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>("C");

  // ── Contribuyente state (N, R, D) ──
  const [busqueda, setBusqueda] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [nombres, setNombres] = useState("");

  // ── Results ──
  const [results, setResults] = useState<ContribuyenteItem[]>([]);
  const [predioResults, setPredioResults] = useState<PredioItem[]>([]);

  // ── Shared state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCodigo = tipoBusqueda === "C";
  const isNombre = tipoBusqueda === "N";
  // C (Código) and P (Código Predio) are both predio searches — same code
  // input + predio results grid, different search term (7 vs 9 digits)
  const isPredio = tipoBusqueda === "C" || tipoBusqueda === "P";
  const isPredioCodigo = tipoBusqueda === "P";

  const canSearch = isNombre
    ? !!(paterno.trim() || materno.trim() || nombres.trim())
    : !!busqueda.trim();

  const formatCodigo = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(7, "0");
  }, []);

  // Predio codes (cod_pred) are NINE digits — e.g. '010195288'
  const formatCodPred = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(9, "0");
  }, []);

  // Shared reset for the search area — stale results must not linger while
  // the user edits the term (matches the date-change/dropdown handlers)
  const resetSearchResults = useCallback(() => {
    setSearched(false);
    setResults([]);
    setPredioResults([]);
    setError(null);
  }, []);

  const handleBusquedaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isCodigo) {
        val = val.replace(/\D/g, "").slice(0, 7);
      } else if (isPredioCodigo) {
        val = val.replace(/\D/g, "").slice(0, 9);
      } else {
        val = val.toUpperCase();
      }
      setBusqueda(val);
      resetSearchResults();
    },
    [isCodigo, isPredioCodigo, resetSearchResults],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, [tipoBusqueda]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── Contribuyente search (C, N, R, D) ──
  const handleContribuyenteSearch = useCallback(async () => {
    if (!canSearch) return;
    // Contract date must be entered first — its year feeds @anio to the SP
    if (!anio) {
      setSearched(false);
      setResults([]);
      setError("Debe ingresar primero la fecha del contrato");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const searchVal = isCodigo ? formatCodigo(busqueda) : busqueda;
      const res = await searchContribuyenteAction(
        tipoBusqueda,
        isNombre ? undefined : searchVal,
        isNombre ? paterno : undefined,
        isNombre ? materno : undefined,
        isNombre ? nombres : undefined,
      );
      if (res.success) {
        setResults(res.data);
        if (res.data.length === 0) setError("No se encontraron contribuyentes");
      } else {
        setResults([]);
        setError(res.error ?? "Error al buscar");
      }
    } catch {
      setResults([]);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [tipoBusqueda, busqueda, isCodigo, isNombre, paterno, materno, nombres, canSearch, formatCodigo, anio]);

  // ── Predio search (C = Código, P = Código Predio) ──
  const handlePredioSearch = useCallback(async () => {
    if (!busqueda.trim()) return;
    // Contract date must be entered first — its year feeds @anio to the SP
    if (!anio) {
      setSearched(false);
      setPredioResults([]);
      setError("Debe ingresar primero la fecha del contrato");
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = isPredioCodigo
        ? await searchPredioAction(
            undefined,
            anio || undefined,
            "P",
            formatCodPred(busqueda) || undefined,
          )
        : await searchPredioAction(
            formatCodigo(busqueda) || undefined,
            anio || undefined,
            "c",
          );
      if (res.success) {
        setPredioResults(res.data);
        if (res.data.length === 0) setError("No se encontraron predios");
      } else {
        setPredioResults([]);
        setError(res.error ?? "Error al buscar");
      }
    } catch {
      setPredioResults([]);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [busqueda, anio, isPredioCodigo, formatCodigo, formatCodPred]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isPredio) handlePredioSearch();
      else handleContribuyenteSearch();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isPredio ? "Buscar Predio" : "Buscar Contribuyente"}
        className="relative z-10 w-full max-w-4xl rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            {isPredio ? "Buscar Predio" : "Buscar Contribuyente"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

{/* Search inputs - single row: dropdown left, inputs right */}
          <div className="flex items-end gap-4 mb-2 px-4">
            {/* Tipo búsqueda dropdown - fixed width */}
            <div className="w-[150px] flex-shrink-0">
              <label htmlFor="tipoBusqueda" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                Tipo Búsqueda
              </label>
              <select
                id="tipoBusqueda"
                value={tipoBusqueda}
                onChange={(e) => {
                  setTipoBusqueda(e.target.value as TipoBusqueda);
                  setBusqueda("");
                  setPaterno("");
                  setMaterno("");
                  setNombres("");
                  setSearched(false);
                  setError(null);
                  setResults([]);
                  setPredioResults([]);
                }}
                className="h-[30px] w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              >
                {TIPO_BUSQUEDA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Contrato - fixed width; its year feeds @anio to the SPs */}
            <div className="w-[160px] flex-shrink-0">
              <label htmlFor="fechaContratoSearch" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                Fecha Contrato
              </label>
              <input
                id="fechaContratoSearch"
                type="date"
                value={fechaContrato}
                onChange={(e) => {
                  onFechaContratoChange(e.target.value);
                  setSearched(false);
                  setResults([]);
                  setPredioResults([]);
                  setError(null);
                }}
                className="h-[30px] w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
              />
            </div>

            {/* Dynamic inputs - takes remaining space */}
            <div className="flex-1 flex items-end gap-3 min-w-0">
              {!isNombre && !isPredio && (
                <div className="flex w-full items-end justify-between gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="text"
                    value={busqueda}
                    onChange={handleBusquedaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ingrese término de búsqueda"
                    className={`${inputClass} h-[30px] px-3 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleContribuyenteSearch}
                    disabled={loading || !canSearch || !anio}
                    title={!anio ? "Ingrese primero la fecha del contrato" : undefined}
                    className={`${primaryBtnClass} h-[30px] flex-shrink-0 whitespace-nowrap`}
                  >
                    {loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Search size={13} />
                    )}
                    Buscar
                  </button>
                </div>
              )}
              {isNombre && (
                <div className="flex w-full items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="paterno" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                      Ap. Paterno
                    </label>
                    <input
                      ref={inputRef}
                      id="paterno"
                      type="text"
                      value={paterno}
                      onChange={(e) => {
                        setPaterno(e.target.value.toUpperCase());
                        resetSearchResults();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="PATERNO"
                      className={`${inputClass} h-[30px] px-3`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor="materno" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                      Ap. Materno
                    </label>
                    <input
                      id="materno"
                      type="text"
                      value={materno}
                      onChange={(e) => {
                        setMaterno(e.target.value.toUpperCase());
                        resetSearchResults();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="MATERNO"
                      className={`${inputClass} h-[30px] px-3`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor="nombres" className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
                      Nombres
                    </label>
                    <input
                      id="nombres"
                      type="text"
                      value={nombres}
                      onChange={(e) => {
                        setNombres(e.target.value.toUpperCase());
                        resetSearchResults();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="NOMBRES"
                      className={`${inputClass} h-[30px] px-3`}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleContribuyenteSearch}
                      disabled={loading || !canSearch || !anio}
                      title={!anio ? "Ingrese primero la fecha del contrato" : undefined}
                      className={`${primaryBtnClass} h-[30px] whitespace-nowrap`}
                    >
                      {loading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Search size={13} />
                      )}
                      Buscar
                    </button>
                  </div>
                </div>
              )}
              {isPredio && (
                <div className="flex w-full items-end justify-between gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={busqueda}
                    onChange={handleBusquedaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isPredioCodigo ? "Ej: 010195288" : "Ej: 0279126"}
                    className={`${inputMono} h-[30px] px-3 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handlePredioSearch}
                    disabled={loading || !canSearch || !anio}
                    title={!anio ? "Ingrese primero la fecha del contrato" : undefined}
                    className={`${primaryBtnClass} h-[30px] flex-shrink-0 whitespace-nowrap`}
                  >
                    {loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Search size={13} />
                    )}
                    Buscar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto border-t border-slate-100 px-4 pb-4 mt-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-sat-cyan" />
              </div>
            )}

            {error && !loading && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
                {error}
              </div>
            )}

            {/* Contribuyente results (table matching page.tsx) */}
            {!loading && !isPredio && searched && results.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                    <tr>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                        Código
                      </th>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[18%]">
                        Nombre
                      </th>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[15%]">
                        Ap. Paterno
                      </th>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[15%]">
                        Ap. Materno
                      </th>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[12%]">
                        N° Doc
                      </th>
                      <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2 border-b border-white/5 w-[22%]">
                        Dirección
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((item, idx) => (
                      <tr
                        key={`contrib-${item.codigo}-${idx}`}
                        onClick={() => onSelect(item, target)}
                        className={`transition cursor-pointer hover:bg-slate-50 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-3 py-2 text-[11px] font-mono text-slate-700 truncate">
                          {item.codigo}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-700 truncate font-medium">
                          {item.nombres}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {item.paterno}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {item.materno}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {item.numDoc}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate">
                          {item.direccion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Predio results (grid) */}
            {!loading && isPredio && searched && predioResults.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Nombres</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Código Predio</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-slate-500 uppercase tracking-wider">% Prop</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 uppercase tracking-wider">N° Documento</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Dirección Predio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predioResults.map((item, idx) => (
                      <tr
                        key={`predio-${item.codigo}-${item.codPred}-${idx}`}
                        onClick={() => onPredioSelect(item, target)}
                        className="border-b border-slate-100 cursor-pointer transition hover:bg-sat-cyan/5 hover:border-sat-cyan/30"
                      >
                        <td className="px-2 py-1.5 font-mono font-medium text-slate-700">{item.codigo}</td>
                        <td className="px-2 py-1.5 text-slate-700">{item.nombres}</td>
                        <td className="px-2 py-1.5 font-mono text-slate-600">{item.codPred}</td>
                        <td className="px-2 py-1.5 text-right text-slate-600">{item.porcenPropiedad}%</td>
                        <td className="px-2 py-1.5 font-mono text-slate-600">{item.numDoc}</td>
                        <td className="px-2 py-1.5 text-slate-600">{item.direccionPredio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !searched && !error && (
              <p className="mt-3 text-center text-[11px] text-slate-400">
                {!anio
                  ? "Ingrese primero la fecha del contrato para realizar la búsqueda"
                  : "Ingrese criterios y presione Buscar"}
              </p>
            )}
          </div>
      </div>
    </div>
  );
}

// ── CrearAlcabalaModal ──────────────────────────────────────

export default function CrearAlcabalaModal({
  open,
  onClose,
  onSuccess,
  contribuyente,
}: CrearAlcabalaModalProps) {
  // ── Collapsible sections state ──
  const [openSections, setOpenSections] = useState({
    comprador: true,
    vendedor: true,
    predio: true,
    montos: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ── Form state ──
  const [comprador, setComprador] = useState({
    codigoCompra: contribuyente?.codigo ?? "",
    nombres: contribuyente
      ? `${contribuyente.paterno} ${contribuyente.materno} ${contribuyente.nombres} `
      : "",
    numDoc: contribuyente?.numDoc ?? "",
    direccFiscal: contribuyente?.direccion ?? "",
  });

  const [vendedor, setVendedor] = useState({
    codigoVenta: "",
    nombres1: "",
    numDoc1: "",
    direccFiscal1: "",
  });

  const [predio, setPredio] = useState({
    codPred: "",
    anioPred: "",
    tipoPred: "",
    direccionPredio: "",
    fechaContrato: "",
    contrato: "",
    transferencia: "",
    observacion: "",
    anexo: "",
    subAnexo: "",
  });

  const [montos, setMontos] = useState({
    montoInafecto: 0,
    montoAfecto: 0,
    montoAlcabala: 0,
    autoavaluo: 0,
  });

  // Display-only currency helpers for the Montos section: dollar value typed by
  // the user, SUNAT tipo de cambio fetched on demand, and the year's UIT auto-
  // loaded from sp_DJAlcabala (buscar=1). None of these are persisted.
  const [moneda, setMoneda] = useState({
    valorDolares: "",
    tipoCambio: "",
    uit: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Search popup state ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<SearchTarget>("comprador");

  // ── Reset form when opened ──
  useEffect(() => {
    if (open) {
      setComprador({
        codigoCompra: contribuyente?.codigo ?? "",
        nombres: contribuyente
          ? `${contribuyente.paterno} ${contribuyente.materno} ${contribuyente.nombres} `
          : "",
        numDoc: contribuyente?.numDoc ?? "",
        direccFiscal: contribuyente?.direccion ?? "",
      });
      setVendedor({
        codigoVenta: "",
        nombres1: "",
        numDoc1: "",
        direccFiscal1: "",
      });
      setPredio({
        codPred: "",
        anioPred: "",
        tipoPred: "",
        direccionPredio: "",
        fechaContrato: "",
        contrato: "",
        transferencia: "",
        observacion: "",
        anexo: "",
        subAnexo: "",
      });
      setMontos({
        montoInafecto: 0,
        montoAfecto: 0,
        montoAlcabala: 0,
        autoavaluo: 0,
      });
      setMoneda({
        valorDolares: "",
        tipoCambio: "",
        uit: "",
      });
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, contribuyente]);

  // ── Auto-calc montoAlcabala ──
  useEffect(() => {
    // montoAlcabala is only meaningful while the UIT-derived chain is active:
    // without a valid UIT the derived amounts are reset to "0.00" by the UIT
    // effect, and this effect must NOT overwrite those resets with a numeric 0
    // (or anything derived from stale montos).
    const uit = parseFloat(moneda.uit);
    if (isNaN(uit) || uit <= 0) return;
    const calc = Math.max(
      0,
      (montos.montoAfecto - montos.montoInafecto) * 0.03,
    );
    setMontos((prev) => ({ ...prev, montoAlcabala: Math.round(calc * 100) / 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda.uit, montos.montoAfecto, montos.montoInafecto]);

  // ── Auto-calc anioPred from fechaContrato ──
  useEffect(() => {
    if (predio.fechaContrato) {
      const year = predio.fechaContrato.slice(0, 4);
      setPredio((prev) => ({ ...prev, anioPred: year }));
    } else {
      setPredio((prev) => ({ ...prev, anioPred: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predio.fechaContrato]);

  // Reset the display-only UIT and every amount derived from it
  // (Inafecto = 10 × UIT → Afecto → Alcabala) to the chain's "0.00" zero
  // representation. Called whenever the UIT is unavailable — fetch failure or
  // no valid 4-digit year. Both montos effects bail on an invalid UIT, so
  // these resets are never recomputed from stale values.
  const resetUitDerivedMontos = useCallback(() => {
    setMoneda((prev) => ({ ...prev, uit: "" }));
    setMontos((prev) => ({
      ...prev,
      montoInafecto: "0.00",
      montoAfecto: "0.00",
      montoAlcabala: "0.00",
    }));
  }, []);

  // ── Auto-load the year's UIT from sp_DJAlcabala (buscar=1) ──
  useEffect(() => {
    let cancelled = false;
    if (/^\d{4}$/.test(predio.anioPred)) {
      getUitAction(predio.anioPred).then((res) => {
        if (cancelled) return;
        if (res.success) {
          setMoneda((prev) => ({ ...prev, uit: res.uit }));
          setSubmitError(null);
        } else {
          // A failed fetch must NOT keep the previous year's UIT: a stale UIT
          // would feed montoInafecto (10 × UIT) from the wrong year and get
          // persisted. Clear it, reset every derived amount ("0.00" is the
          // chain's zero representation), and surface the error (submitError
          // pattern).
          resetUitDerivedMontos();
          setSubmitError(
            res.error ||
              `No se pudo obtener la UIT del año ${predio.anioPred}`,
          );
        }
      });
    } else {
      // anioPred is not a valid 4-digit year (e.g. the contract date was
      // cleared after a successful UIT load): the UIT and every amount derived
      // from it must reset too — a stale montoInafecto (10 × UIT) would still
      // be submitted and persisted.
      resetUitDerivedMontos();
    }
    return () => {
      cancelled = true;
    };
  }, [predio.anioPred]);

  // ── Auto-set Transferencia when TC is fetched and USD > 0 ──
  const consultarTipoCambio = async () => {
    if (!predio.fechaContrato) {
      setSubmitError("Primero ingrese la fecha del contrato");
      return;
    }
    if (!moneda.valorDolares || parseFloat(moneda.valorDolares) <= 0) {
      setSubmitError("Ingrese un Valor en Dólares válido");
      return;
    }
    setSubmitError(null);
    const res = await getTipoCambioAction(predio.fechaContrato);
    if (res.success && res.venta) {
      const tc = parseFloat(res.venta);
      const usd = parseFloat(moneda.valorDolares);
      if (!isNaN(tc) && !isNaN(usd) && usd > 0) {
        const transferenciaCalc = (usd * tc).toFixed(2);
        setMoneda((prev) => ({ ...prev, tipoCambio: res.venta }));
        setPredio((prev) => ({ ...prev, transferencia: transferenciaCalc }));
      } else {
        setMoneda((prev) => ({ ...prev, tipoCambio: res.venta }));
      }
    } else {
      setSubmitError(res.error || "Error al obtener tipo de cambio");
    }
  };

  // ── Reactive Montos chain: UIT → Inafecto → Afecto → Alcabala ──
  useEffect(() => {
    const uit = parseFloat(moneda.uit);
    const transferencia = parseFloat(predio.transferencia);
    const autoavaluo = parseFloat(montos.autoavaluo);

    // Every derived amount starts from the UIT (Inafecto = 10 × UIT, then
    // Afecto and Alcabala). Without a valid UIT the cascade is unknowable —
    // bail out so the UIT effect's "0.00" failure resets are NOT recomputed
    // from a stale or zeroed montoInafecto (which would turn Afecto into the
    // full base and Alcabala into 3% of it, persisting wrong figures).
    if (isNaN(uit) || uit <= 0) return;

    // Inafecto = 10 × UIT
    const inafectoStr = (uit * 10).toFixed(2);
    setMontos((prev) => {
      if (prev.montoInafecto === inafectoStr) return prev;
      return { ...prev, montoInafecto: inafectoStr };
    });

    // Afecto = (Transferencia || Autoavaluo) - Inafecto
    const base =
      !isNaN(transferencia) && transferencia > 0
        ? transferencia
        : !isNaN(autoavaluo)
          ? autoavaluo
          : 0;
    const inafectoNum = parseFloat(montos.montoInafecto);
    if (!isNaN(base) && !isNaN(inafectoNum)) {
      const afecto = Math.max(0, base - inafectoNum).toFixed(2);
      setMontos((prev) => {
        if (prev.montoAfecto === afecto) return prev;
        return { ...prev, montoAfecto: afecto };
      });
    }

    // Alcabala = Afecto * 3%
    // Always update, mirroring the montoAfecto step above: when Afecto drops to
    // 0 (e.g. transferencia == montoInafecto), the value must be "0.00" — not
    // the last positive Alcabala, which would be persisted as monto_alcabala.
    const afectoNum = parseFloat(montos.montoAfecto);
    if (!isNaN(afectoNum)) {
      const alcabala = (Math.max(0, afectoNum) * 0.03).toFixed(2);
      setMontos((prev) => {
        if (prev.montoAlcabala === alcabala) return prev;
        return { ...prev, montoAlcabala: alcabala };
      });
    }
  }, [moneda.uit, predio.transferencia, montos.autoavaluo, montos.montoInafecto, montos.montoAfecto]);

  // ── Escape key ──
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // ── Search popup handlers ──
  const openSearch = (target: SearchTarget) => {
    setSearchTarget(target);
    setSearchOpen(true);
  };

  const handleSearchSelect = (item: ContribuyenteItem, target: SearchTarget) => {
    if (target === "comprador") {
      setComprador({
        codigoCompra: item.codigo,
        nombres: `${item.paterno} ${item.materno} ${item.nombres} `,
        numDoc: item.numDoc,
        direccFiscal: item.direccion,
      });
    } else {
      setVendedor({
        codigoVenta: item.codigo,
        nombres1: `${item.paterno} ${item.materno} ${item.nombres} `,
        numDoc1: item.numDoc,
        direccFiscal1: item.direccion,
      });
    }
    setSearchOpen(false);
  };

  const handlePredioSelect = (item: PredioItem, target: SearchTarget) => {
    setVendedor({
      codigoVenta: item.codigo,
      nombres1: item.nombres,
      numDoc1: item.numDoc,
      direccFiscal1: item.direccFiscal,
    });
    setPredio((prev) => ({
      ...prev,
      codPred: item.codPred,
      anioPred: item.anno,
      tipoPred: item.tipoPred,
      direccionPredio: item.direccionPredio,
      anexo: item.anexo,
      subAnexo: item.subAnexo,
    }));
    setMontos((prev) => ({
      ...prev,
      autoavaluo: item.totalAutoavaluo,
    }));
    setSearchOpen(false);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const result = await crearAlcabalaAction({
      codigoCompra: comprador.codigoCompra,
      nombres: comprador.nombres,
      numDoc: comprador.numDoc,
      direccFiscal: comprador.direccFiscal,
      codigoVenta: vendedor.codigoVenta,
      nombres1: vendedor.nombres1,
      numDoc1: vendedor.numDoc1,
      direccFiscal1: vendedor.direccFiscal1,
      codPred: predio.codPred,
      anioPred: predio.anioPred,
      tipoPred: predio.tipoPred,
      direccionPredio: predio.direccionPredio,
      fechaContrato: predio.fechaContrato,
      contrato: predio.contrato,
      transferencia: predio.transferencia,
      observacion: predio.observacion,
      montoInafecto: montos.montoInafecto,
      montoAfecto: montos.montoAfecto,
      montoAlcabala: montos.montoAlcabala,
      autoavaluo: montos.autoavaluo,
      anexo: predio.anexo,
      subAnexo: predio.subAnexo,
    });

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setSubmitError(result.error ?? "Error al crear alcabala. Intente nuevamente.");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 shrink-0">
            <h2 className="text-sm font-bold text-slate-800">
              Nueva Alcabala
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-1 space-y-1">
            {/* ── Section: Comprador ── */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("comprador")}
                className={sectionBtn}
                aria-label={openSections.comprador ? "Colapsar Comprador" : "Expandir Comprador"}
              >
                datos del Comprador
                {openSections.comprador ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.comprador && (
                <div className={sectionContent}>
                  <div className="grid grid-cols-[15fr_85fr] gap-3">
                    <div>
                      <label htmlFor="codigoCompra" className={fieldLabel}>
                        Código Compra
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="codigoCompra"
                          type="text"
                          value={comprador.codigoCompra}
                          readOnly
                          onChange={(e) =>
                            setComprador((prev) => ({
                              ...prev,
                              codigoCompra: e.target.value,
                            }))
                          }
                          className={`${inputMono} bg-slate-100`}
                        />
                        <button
                          type="button"
                          disabled
                          onClick={() => openSearch("comprador")}
                          className={`${searchBtnClass} disabled:cursor-not-allowed disabled:opacity-40`}
                          aria-label="Buscar contribuyente comprador"
                          title="Buscar contribuyente"
                        >
                          <Search size={13} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="nombres" className={fieldLabel}>
                        Nombres del Comprador
                      </label>
                      <input
                        id="nombres"
                        type="text"
                        value={comprador.nombres}
                        readOnly
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            nombres: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[15fr_85fr] gap-3">
                    <div>
                      <label htmlFor="numDoc" className={fieldLabel}>
                        N° Documento
                      </label>
                      <input
                        id="numDoc"
                        type="text"
                        value={comprador.numDoc}
                        readOnly
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            numDoc: e.target.value,
                          }))
                        }
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="direccFiscal" className={fieldLabel}>
                        Dirección Fiscal del comprador
                      </label>
                      <input
                        id="direccFiscal"
                        type="text"
                        value={comprador.direccFiscal}
                        readOnly
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            direccFiscal: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: Vendedor ── */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("vendedor")}
                className={sectionBtn}
                aria-label={openSections.vendedor ? "Colapsar Vendedor" : "Expandir Vendedor"}
              >
                datos del Vendedor
                {openSections.vendedor ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.vendedor && (
                <div className={sectionContent}>
                  <div className="grid grid-cols-[15fr_85fr] gap-3">
                    <div>
                      <label htmlFor="codigoVenta" className={fieldLabel}>
                        Código Venta
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="codigoVenta"
                          type="text"
                          value={vendedor.codigoVenta}
                          readOnly
                          onChange={(e) =>
                            setVendedor((prev) => ({
                              ...prev,
                              codigoVenta: e.target.value,
                            }))
                          }
                          className={`${inputMono} bg-slate-100`}
                        />
                        <button
                          type="button"
                          onClick={() => openSearch("vendedor")}
                          className={searchBtnClass}
                          aria-label="Buscar contribuyente vendedor"
                          title="Buscar contribuyente"
                        >
                          <Search size={13} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="nombres1" className={fieldLabel}>
                        Nombres del vendedor
                      </label>
                      <input
                        id="nombres1"
                        type="text"
                        value={vendedor.nombres1}
                        readOnly
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            nombres1: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[15fr_85fr] gap-3">
                    <div>
                      <label htmlFor="numDoc1" className={fieldLabel}>
                        N° Documento
                      </label>
                      <input
                        id="numDoc1"
                        type="text"
                        value={vendedor.numDoc1}
                        readOnly
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            numDoc1: e.target.value,
                          }))
                        }
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="direccFiscal1" className={fieldLabel}>
                        Dirección Fiscal vendedor
                      </label>
                      <input
                        id="direccFiscal1"
                        type="text"
                        value={vendedor.direccFiscal1}
                        readOnly
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            direccFiscal1: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: Predio / Contrato ── */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("predio")}
                className={sectionBtn}
                aria-label={openSections.predio ? "Colapsar Predio / Contrato" : "Expandir Predio / Contrato"}
              >
                Predio / Contrato
                {openSections.predio ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.predio && (
                <div className={sectionContent}>
                  <div className="grid grid-cols-6 gap-3">
                    <div>
                      <label htmlFor="fechaContrato" className={fieldLabel}>
                        Fecha Contrato
                      </label>
                      <input
                        id="fechaContrato"
                        type="date"
                        value={predio.fechaContrato}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            fechaContrato: e.target.value,
                          }))
                        }
                        className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label htmlFor="anioPred" className={fieldLabel}>
                        Año Predio
                      </label>
                      <input
                        id="anioPred"
                        type="text"
                        value={predio.anioPred}
                        readOnly
                        placeholder="Auto"
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="codPred" className={fieldLabel}>
                        Código Predio
                      </label>
                      <input
                        id="codPred"
                        type="text"
                        value={predio.codPred}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            codPred: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="tipoPred" className={fieldLabel}>
                        Tipo Predio
                      </label>
                      <input
                        id="tipoPred"
                        type="text"
                        value={predio.tipoPred}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            tipoPred: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="anexo" className={fieldLabel}>
                        Anexo
                      </label>
                      <input
                        id="anexo"
                        type="text"
                        value={predio.anexo}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            anexo: e.target.value,
                          }))
                        }
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                   <div>
                      <label htmlFor="subAnexo" className={fieldLabel}>
                        Sub Anexo
                      </label>
                      <input
                        id="subAnexo"
                        type="text"
                        value={predio.subAnexo}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            subAnexo: e.target.value,
                          }))
                        }
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1">
                    <div>
                      <label htmlFor="direccionPredio" className={fieldLabel}>
                        Dirección Predio
                      </label>
                      <input
                        id="direccionPredio"
                        type="text"
                        value={predio.direccionPredio}
                        readOnly
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            direccionPredio: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} bg-slate-100`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1">
                    <div>
                      <label htmlFor="contrato" className={fieldLabel}>
                        Contrato
                      </label>
                      <input
                        id="contrato"
                        type="text"
                        value={predio.contrato}
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            contrato: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1">
                    <div>
                      <label htmlFor="observacion" className={fieldLabel}>
                        Observación
                      </label>
                      <input
                        id="observacion"
                        type="text"
                        value={predio.observacion}
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            observacion: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: Montos ── */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("montos")}
                className={sectionBtn}
                aria-label={openSections.montos ? "Colapsar Montos" : "Expandir Montos"}
              >
                Montos
                {openSections.montos ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.montos && (
                <div className={sectionContent}>
                  <p className="text-[10px] text-slate-400 italic">
                    Monto Alcabala se calcula automáticamente: (Monto Afecto - Monto Inafecto) × 3%
                  </p>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label htmlFor="transferencia" className={fieldLabel}>
                        Transferencia
                      </label>
                      <input
                        id="transferencia"
                        type="number"
                        min={0}
                        value={predio.transferencia}
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            transferencia: e.target.value,
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div>
                      <label htmlFor="autoavaluo" className={fieldLabel}>
                        Autoavaluo
                      </label>
                      <input
                        id="autoavaluo"
                        type="number"
                        min={0}
                        value={montos.autoavaluo}
                        onChange={(e) =>
                          setMontos((prev) => ({
                            ...prev,
                            autoavaluo: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div>
                      <label htmlFor="montoInafecto" className={fieldLabel}>
                        Monto Inafecto
                      </label>
                      <input
                        id="montoInafecto"
                        type="number"
                        min={0}
                        value={montos.montoInafecto}
                        onChange={(e) =>
                          setMontos((prev) => ({
                            ...prev,
                            montoInafecto: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div>
                      <label htmlFor="montoAfecto" className={fieldLabel}>
                        Monto Afecto
                      </label>
                      <input
                        id="montoAfecto"
                        type="number"
                        min={0}
                        value={montos.montoAfecto}
                        onChange={(e) =>
                          setMontos((prev) => ({
                            ...prev,
                            montoAfecto: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div>
                      <label htmlFor="montoAlcabala" className={fieldLabel}>
                        Monto Alcabala
                      </label>
                      <input
                        id="montoAlcabala"
                        type="number"
                        readOnly
                        value={montos.montoAlcabala}
                        className={`${inputMono} bg-slate-100 text-emerald-700 font-bold`}
                      />
                    </div>
                  </div>
                  {/* Display-only currency helpers: dollar value + TC consult
                      (SUNAT) and the year's UIT (sp_DJAlcabala buscar=1) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="valorDolares" className={fieldLabel}>
                        Valor en Dólares
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="valorDolares"
                          type="number"
                          min={0}
                          value={moneda.valorDolares}
                          onChange={(e) =>
                            setMoneda((prev) => ({
                              ...prev,
                              valorDolares: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              consultarTipoCambio();
                            }
                          }}
                          className={inputMono}
                        />
                        <button
                          type="button"
                          onClick={consultarTipoCambio}
                          title="Consultar TC y convertir"
                          className={searchBtnClass}
                          aria-label="Consultar tipo de cambio"
                        >
                          ⇄
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="tipoCambio" className={fieldLabel}>
                        Tipo de Cambio
                      </label>
                      <input
                        id="tipoCambio"
                        type="text"
                        readOnly
                        value={moneda.tipoCambio}
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                    <div>
                      <label htmlFor="uit" className={fieldLabel}>
                        UIT
                      </label>
                      <input
                        id="uit"
                        type="text"
                        readOnly
                        value={moneda.uit}
                        className={`${inputMono} bg-slate-100`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-medium text-red-600">
                {submitError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={secondaryBtnClass}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={primaryBtnClass}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search popup */}
      {searchOpen && (
        <ContribuyenteSearchPopup
          target={searchTarget}
          onSelect={handleSearchSelect}
          onPredioSelect={handlePredioSelect}
          onClose={() => setSearchOpen(false)}
          fechaContrato={predio.fechaContrato}
          onFechaContratoChange={(v) =>
            setPredio((prev) => ({ ...prev, fechaContrato: v }))
          }
        />
      )}
    </>
  );
}
