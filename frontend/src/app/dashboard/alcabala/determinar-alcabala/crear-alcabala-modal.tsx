"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import {
  searchContribuyenteAction,
  searchPrediosAction,
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
  "flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider border border-slate-200 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20";

const sectionContent = "px-1 pt-3 pb-2 space-y-3";

const fieldLabel =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

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
  initialFechaContrato?: string;
  onFechaContratoChange?: (iso: string) => void;
  onSelect: (item: ContribuyenteItem, target: SearchTarget) => void;
  onSelectPredio: (predio: PredioItem) => void; // vendedor phase 2
  onClose: () => void;
}

// Same search-criteria options as the main Determinar Alcabala page.
type PopupTipoBusqueda = "C" | "N" | "R" | "D" | "P";

function ContribuyenteSearchPopup({ target, initialFechaContrato = "", onSelect, onSelectPredio, onFechaContratoChange, onClose }: SearchPopupProps) {
  // Mirrors the main page's search bar distribution: a Tipo Búsqueda select,
  // then either a single field (C/R/D) or the three name fields (N).
  const [tipoBusqueda, setTipoBusqueda] = useState<PopupTipoBusqueda>("C");
  const [busqueda, setBusqueda] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [nombres, setNombres] = useState("");
  const [fechaContrato, setFechaContrato] = useState(initialFechaContrato);
  const [results, setResults] = useState<ContribuyenteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ── Vendedor single-step flow state (predio results) ──
  const [predios, setPredios] = useState<PredioItem[]>([]);
  const [predioLoading, setPredioLoading] = useState(false);
  const [predioError, setPredioError] = useState<string | null>(null);
  const [predioSearched, setPredioSearched] = useState(false);

  const cancelled = useRef(false);

  // Vendedor-only search option: "Código Predio" (tipo_busqueda='P', 9 dígitos).
  const tipoBusquedaOptions: { value: PopupTipoBusqueda; label: string }[] = [
    { value: "C", label: "Código" },
    { value: "N", label: "Nombre" },
    { value: "R", label: "Razón Social" },
    { value: "D", label: "Documento" },
    ...(target === "vendedor"
      ? ([{ value: "P", label: "Código Predio" }] as { value: PopupTipoBusqueda; label: string }[])
      : []),
  ];

  const isCodigo = tipoBusqueda === "C";
  const isNombre = tipoBusqueda === "N";
  const isPredio = tipoBusqueda === "P";

  const hasCriteria = isNombre
    ? !!(paterno.trim() || materno.trim() || nombres.trim())
    : !!busqueda.trim();



  // Validate contract date: non-empty, parseable, not in the future.
  const esFechaValida = (iso: string): boolean => {
    if (!iso) return false;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return false;
    return true;
  };

  const handleBusquedaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isCodigo || isPredio) {
        val = val.replace(/\D/g, "").slice(0, isPredio ? 9 : 7);
      } else {
        val = val.toUpperCase();
      }
      setBusqueda(val);
    },
    [isCodigo, isPredio],
  );

  const formatCodigo = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(7, "0");
  }, []);

  const formatCodigoPredio = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(9, "0");
  }, []);

  const resetCriteria = useCallback(() => {
    setBusqueda("");
    setPaterno("");
    setMaterno("");
    setNombres("");
    // The vendedor flow needs the contract date (@anio) for the predio search,
    // so switching the search-type combo must not discard it.
    if (target === "comprador") {
      setFechaContrato("");
    }
    setResults([]);
    setError(null);
    setSearched(false);
  }, [target]);

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

  // Cancelled flag — prevents state updates after unmount.
  // Reset to false on mount: React StrictMode double-invokes effects in dev
  // (mount → cleanup → mount), so without this reset the flag gets stuck `true`
  // after mount and freezes the search spinner (state never finishes updating).
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!hasCriteria) return;
    const anio = fechaContrato ? fechaContrato.slice(0, 4) : "";

    if (target === "vendedor") {
      // The vendedor flow requires a valid contract date (@anio).
      if (!esFechaValida(fechaContrato)) return;

      setPredioLoading(true);
      setPredioError(null);
      setPredioSearched(true);
      try {
        let res;
        if (tipoBusqueda === "C") {
          res = await searchPrediosAction(formatCodigo(busqueda), anio, "c", { codPred: "" });
        } else if (tipoBusqueda === "N") {
          res = await searchPrediosAction("", anio, "n", { paterno, materno, nombres });
        } else if (tipoBusqueda === "D") {
          res = await searchPrediosAction("", anio, "d", { numDoc: busqueda });
        } else if (tipoBusqueda === "R") {
          res = await searchPrediosAction("", anio, "r", { razon: busqueda });
        } else {
          // P — código predio (9 dígitos con ceros a la izquierda)
          res = await searchPrediosAction("", anio, "P", { codPred: formatCodigoPredio(busqueda) });
        }
        if (cancelled.current) return;
        if (res.success) {
          setPredios(res.data);
          if (res.data.length === 0) {
            setPredioError("No se encontraron predios");
          }
        } else {
          setPredios([]);
          setPredioError(res.error ?? "Error al buscar predios");
        }
      } catch {
        if (cancelled.current) return;
        setPredios([]);
        setPredioError("Error de conexión");
      } finally {
        if (!cancelled.current) setPredioLoading(false);
      }
      return;
    }

    // Comprador — keep the existing contribuyente search.
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
      if (cancelled.current) return;
      if (res.success) {
        setResults(res.data);
        if (res.data.length === 0) {
          setError("No se encontraron contribuyentes");
        }
      } else {
        setResults([]);
        setError(res.error ?? "Error al buscar");
      }
    } catch {
      if (cancelled.current) return;
      setResults([]);
      setError("Error de conexión");
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [target, fechaContrato, tipoBusqueda, busqueda, isCodigo, isNombre, paterno, materno, nombres, hasCriteria, formatCodigo, formatCodigoPredio]);

  // Vendedor flow (single step): pressing Buscar runs the predio search SP
  // directly, so there is no contribuyente list for the vendedor target.

  const handleContribuyenteClick = (item: ContribuyenteItem) => {
    // Only the comprador path reaches here — the vendedor shows predios, not contribuyentes.
    if (target === "comprador") {
      onSelect(item, "comprador");
    }
  };

  const handlePredioClick = (item: PredioItem) => {
    onSelectPredio(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-[72.8rem] rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Buscar Contribuyente
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

        {/* Same distribution as the main Determinar Alcabala search bar */}
        <div className="p-4 space-y-3">
          <div className="w-[200px]">
            <label htmlFor="search-fechaContrato" className={fieldLabel}>
              Fecha Contrato
            </label>
            <input
              id="search-fechaContrato"
              type="date"
              value={fechaContrato}
              onChange={(e) => {
                setFechaContrato(e.target.value);
                onFechaContratoChange?.(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="w-[160px] shrink-0">
              <label htmlFor="search-tipoBusqueda" className={fieldLabel}>
                Tipo Búsqueda
              </label>
              <select
                id="search-tipoBusqueda"
                value={tipoBusqueda}
                onChange={(e) => {
                  setTipoBusqueda(e.target.value as PopupTipoBusqueda);
                  resetCriteria();
                }}
                className={inputClass}
              >
                {tipoBusquedaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Single input for C, R, D, P */}
            {!isNombre && (
              <div className="flex-1">
                <label htmlFor="search-busqueda" className={fieldLabel}>
                  {isCodigo ? "Código (7 dígitos)" : isPredio ? "Código Predio (9 dígitos)" : "Búsqueda"}
                </label>
                <input
                  id="search-busqueda"
                  type="text"
                  inputMode={isCodigo || isPredio ? "numeric" : "text"}
                  value={busqueda}
                  onChange={handleBusquedaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isCodigo ? "Ej: 0279126" : isPredio ? "Ej: 010195288" : "Ingrese término de búsqueda"}
                  className={`${inputClass} ${isCodigo || isPredio ? "font-mono" : ""}`}
                  autoFocus
                />
              </div>
            )}
            {/* Three name fields for N */}
            {isNombre && (
              <>
                <div className="flex-1">
                  <label htmlFor="search-paterno" className={fieldLabel}>
                    Ap. Paterno
                  </label>
                  <input
                    id="search-paterno"
                    type="text"
                    value={paterno}
                    onChange={(e) => setPaterno(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="PATERNO"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="search-materno" className={fieldLabel}>
                    Ap. Materno
                  </label>
                  <input
                    id="search-materno"
                    type="text"
                    value={materno}
                    onChange={(e) => setMaterno(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="MATERNO"
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="search-nombres" className={fieldLabel}>
                    Nombres
                  </label>
                  <input
                    id="search-nombres"
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="NOMBRES"
                    className={inputClass}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleSearch}
              disabled={
                (target === "vendedor" ? predioLoading : loading) ||
                !hasCriteria ||
                (target === "vendedor" && !esFechaValida(fechaContrato))
              }
              className={primaryBtnClass}
            >
              {(target === "vendedor" ? predioLoading : loading) ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Search size={13} />
              )}
              Buscar
            </button>
          </div>
        </div>

        {/* Results — a single results block per target */}
        <div className="max-h-80 overflow-y-auto border-t border-slate-100 px-4 pb-4">
          {target === "comprador" ? (
            <>
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

              {!loading && searched && results.length > 0 && (
                <div className="mt-3 space-y-1">
                  {results.map((item, idx) => (
                    <button
                      key={`${item.codigo}-${idx}`}
                      type="button"
                      onClick={() => handleContribuyenteClick(item)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-700 transition hover:bg-slate-50 hover:border-sat-cyan/30"
                    >
                      <span className="font-mono font-medium">{item.codigo}</span>{" "}
                      — {item.nombres} {item.paterno} {item.materno}
                      <span className="ml-2 text-[10px] text-slate-400">
                        ({item.numDoc})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!loading && !searched && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Complete al menos un criterio y presione Buscar
                </p>
              )}
            </>
          ) : (
            <>
              {predioLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-sat-cyan" />
                </div>
              )}

              {predioError && !predioLoading && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
                  {predioError}
                </div>
              )}

              {!predioLoading && predioSearched && predios.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-[11px] text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">Código</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Nombres</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Cód. Predio</th>
                        <th className="px-2 py-1.5 text-right font-semibold">% Propiedad</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Dirección</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predios.map((item, idx) => (
                        <tr
                          key={`${item.codPred}-${idx}`}
                          onClick={() => handlePredioClick(item)}
                          className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 hover:border-sat-cyan/30"
                        >
                          <td className="px-2 py-2 font-mono">{item.codigo}</td>
                          <td className="px-2 py-2">{item.nombres}</td>
                          <td className="px-2 py-2 font-mono">{item.codPred}</td>
                          <td className="px-2 py-2 text-right font-mono">{item.porcenPropiedad}</td>
                          <td className="px-2 py-2">{item.predial}</td>
                          <td className="px-2 py-2">{item.tipoPred}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!predioLoading && predioSearched && predios.length === 0 && !predioError && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  No hay predios para mostrar
                </p>
              )}

              {!predioLoading && !predioSearched && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Complete los criterios y presione Buscar para listar los predios
                </p>
              )}
            </>
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
      ? `${contribuyente.nombres} ${contribuyente.paterno} ${contribuyente.materno}`
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
    porcTransferencia: '100',
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
          ? `${contribuyente.nombres} ${contribuyente.paterno} ${contribuyente.materno}`
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
        porcTransferencia: '100',
      });
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, contribuyente]);

  // ── Auto-calc montoAlcabala ──
  useEffect(() => {
    const calc = Math.max(
      0,
      (montos.montoAfecto - montos.montoInafecto) * 0.03,
    );
    setMontos((prev) => ({ ...prev, montoAlcabala: Math.round(calc * 100) / 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montos.montoAfecto, montos.montoInafecto]);

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

  // The vendedor flow never reaches this callback: pressing Buscar in the
  // vendedor popup runs the predio search directly, and the selected predio is
  // handled by handlePredioSelect. So only the comprador branch is relevant.
  const handleSearchSelect = (item: ContribuyenteItem, target: SearchTarget) => {
    if (target === "comprador") {
      setComprador({
        codigoCompra: item.codigo,
        nombres: `${item.nombres} ${item.paterno} ${item.materno}`,
        numDoc: item.numDoc,
        direccFiscal: item.direccion,
      });
      // Comprador flow ends here — close the popup.
      setSearchOpen(false);
    }
  };

  // ── Predio selection (vendedor single-step flow) ──
  const handlePredioSelect = (predio: PredioItem) => {
    // The predio belongs to the vendedor contribuyente, so auto-fill the
    // vendedor form from the predio's contribuyente info, then the predio fields.
    setVendedor((prev) => ({
      ...prev,
      codigoVenta: predio.codigo,
      nombres1: predio.nombres,
    }));
    setPredio((prev) => ({
      ...prev,
      codPred: predio.codPred,
      anioPred: predio.anno,
      tipoPred: predio.tipoPred,
      direccionPredio: predio.predial,
      anexo: predio.anexo,
      subAnexo: predio.subAnexo,
    }));
    // Close the popup.
    setSearchOpen(false);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Convert the raw string to a number only here; empty/invalid -> omit
    // so the backend DTO default (0) applies. No clamping on the input.
    const porcRaw = montos.porcTransferencia.trim();
    const porcTransferencia =
      porcRaw !== '' && !Number.isNaN(Number(porcRaw))
        ? Number(porcRaw)
        : undefined;

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
      porcTransferencia: porcTransferencia,
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
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* ── Section: Comprador ── */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("comprador")}
                className={sectionBtn}
                aria-label={openSections.comprador ? "Colapsar Comprador" : "Expandir Comprador"}
              >
                Comprador
                {openSections.comprador ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.comprador && (
                <div className={sectionContent}>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label htmlFor="codigoCompra" className={fieldLabel}>
                        Código Compra
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="codigoCompra"
                          type="text"
                          value={comprador.codigoCompra}
                          onChange={(e) =>
                            setComprador((prev) => ({
                              ...prev,
                              codigoCompra: e.target.value,
                            }))
                          }
                          className={inputMono}
                        />
                        <button
                          type="button"
                          onClick={() => openSearch("comprador")}
                          disabled={comprador.codigoCompra !== ""}
                          className={`${searchBtnClass} disabled:text-slate-300 disabled:cursor-not-allowed`}
                          aria-label="Buscar contribuyente comprador"
                          title={
                            comprador.codigoCompra !== ""
                              ? "El comprador proviene del contribuyente seleccionado"
                              : "Buscar contribuyente"
                          }
                        >
                          <Search size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label htmlFor="nombres" className={fieldLabel}>
                        Nombres
                      </label>
                      <input
                        id="nombres"
                        type="text"
                        value={comprador.nombres}
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            nombres: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="numDoc" className={fieldLabel}>
                        N° Documento
                      </label>
                      <input
                        id="numDoc"
                        type="text"
                        value={comprador.numDoc}
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            numDoc: e.target.value,
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="direccFiscal" className={fieldLabel}>
                        Dirección Fiscal
                      </label>
                      <input
                        id="direccFiscal"
                        type="text"
                        value={comprador.direccFiscal}
                        onChange={(e) =>
                          setComprador((prev) => ({
                            ...prev,
                            direccFiscal: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
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
                Vendedor
                {openSections.vendedor ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {openSections.vendedor && (
                <div className={sectionContent}>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label htmlFor="codigoVenta" className={fieldLabel}>
                        Código Venta
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="codigoVenta"
                          type="text"
                          value={vendedor.codigoVenta}
                          onChange={(e) =>
                            setVendedor((prev) => ({
                              ...prev,
                              codigoVenta: e.target.value,
                            }))
                          }
                          className={inputMono}
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
                    <div className="col-span-3">
                      <label htmlFor="nombres1" className={fieldLabel}>
                        Nombres
                      </label>
                      <input
                        id="nombres1"
                        type="text"
                        value={vendedor.nombres1}
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            nombres1: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="numDoc1" className={fieldLabel}>
                        N° Documento
                      </label>
                      <input
                        id="numDoc1"
                        type="text"
                        value={vendedor.numDoc1}
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            numDoc1: e.target.value,
                          }))
                        }
                        className={inputMono}
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="direccFiscal1" className={fieldLabel}>
                        Dirección Fiscal
                      </label>
                      <input
                        id="direccFiscal1"
                        type="text"
                        value={vendedor.direccFiscal1}
                        onChange={(e) =>
                          setVendedor((prev) => ({
                            ...prev,
                            direccFiscal1: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
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
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label htmlFor="codPred" className={fieldLabel}>
                        Código Predio
                      </label>
                      <div className="flex gap-1">
                        <input
                          id="codPred"
                          type="text"
                          value={predio.codPred}
                          disabled
                          onChange={(e) =>
                            setPredio((prev) => ({
                              ...prev,
                              codPred: e.target.value.toUpperCase(),
                            }))
                          }
                          className={inputMono}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="anioPred" className={fieldLabel}>
                        Año Predio
                      </label>
                      <input
                        id="anioPred"
                        type="text"
                          value={predio.anioPred}
                          disabled
                          onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            anioPred: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                        placeholder="2026"
                        className={inputClass}
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
                          disabled
                          onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            tipoPred: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
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
                          disabled
                          onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            anexo: e.target.value,
                          }))
                        }
                        className={inputMono}
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
                          disabled
                          onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            subAnexo: e.target.value,
                          }))
                        }
                        className={inputMono}
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
                          disabled
                          onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            direccionPredio: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label htmlFor="fechaContrato" className={fieldLabel}>
                        Fecha Contrato
                      </label>
                      <input
                        id="fechaContrato"
                        type="date"
                        value={predio.fechaContrato}
                        disabled
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            fechaContrato: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
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
                    <div>
                      <label htmlFor="transferencia" className={fieldLabel}>
                        Transferencia
                      </label>
                      <input
                        id="transferencia"
                        type="text"
                        value={predio.transferencia}
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            transferencia: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="porcTransferencia" className={fieldLabel}>
                        Porc. de Transf. (%)
                      </label>
                      <input
                        id="porcTransferencia"
                        type="text"
                        inputMode="decimal"
                        value={montos.porcTransferencia}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          setMontos((prev) => ({
                            ...prev,
                            porcTransferencia: e.target.value,
                          }))
                        }
                        className={inputMono}
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
                  <div className="grid grid-cols-4 gap-3">
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

      {/* Search popup (contribuyente for comprador, and 2-phase vendedor+predio) */}
      {searchOpen && (
        <ContribuyenteSearchPopup
          target={searchTarget}
          initialFechaContrato={predio.fechaContrato}
          onFechaContratoChange={(iso) =>
            setPredio((p) => ({ ...p, fechaContrato: iso }))
          }
          onSelect={handleSearchSelect}
          onSelectPredio={handlePredioSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
