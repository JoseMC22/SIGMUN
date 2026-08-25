"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import { crearAlcabalaAction } from "@/actions/alcabala/crear-alcabala";
import {
  searchContribuyenteAction,
  type ContribuyenteItem,
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
  onSelect: (item: ContribuyenteItem, target: SearchTarget) => void;
  onClose: () => void;
}

// Same search-criteria options as the main Determinar Alcabala page.
type PopupTipoBusqueda = "C" | "N" | "R" | "D";

const TIPO_BUSQUEDA_OPTIONS: { value: PopupTipoBusqueda; label: string }[] = [
  { value: "C", label: "Código" },
  { value: "N", label: "Nombre" },
  { value: "R", label: "Razón Social" },
  { value: "D", label: "Documento" },
];

function ContribuyenteSearchPopup({ target, onSelect, onClose }: SearchPopupProps) {
  // Mirrors the main page's search bar distribution: a Tipo Búsqueda select,
  // then either a single field (C/R/D) or the three name fields (N).
  const [tipoBusqueda, setTipoBusqueda] = useState<PopupTipoBusqueda>("C");
  const [busqueda, setBusqueda] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [nombres, setNombres] = useState("");
  const [results, setResults] = useState<ContribuyenteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const isCodigo = tipoBusqueda === "C";
  const isNombre = tipoBusqueda === "N";

  const hasCriteria = isNombre
    ? !!(paterno.trim() || materno.trim() || nombres.trim())
    : !!busqueda.trim();

  const handleBusquedaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isCodigo) {
        val = val.replace(/\D/g, "").slice(0, 7);
      } else {
        val = val.toUpperCase();
      }
      setBusqueda(val);
    },
    [isCodigo],
  );

  const formatCodigo = useCallback((val: string): string => {
    return val.replace(/\D/g, "").padStart(7, "0");
  }, []);

  const resetCriteria = useCallback(() => {
    setBusqueda("");
    setPaterno("");
    setMaterno("");
    setNombres("");
    setResults([]);
    setError(null);
    setSearched(false);
  }, []);

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

  const handleSearch = useCallback(async () => {
    if (!hasCriteria) return;
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
        if (res.data.length === 0) {
          setError("No se encontraron contribuyentes");
        }
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
  }, [tipoBusqueda, busqueda, isCodigo, isNombre, paterno, materno, nombres, hasCriteria, formatCodigo]);

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
      <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white shadow-2xl">
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
        <div className="p-4">
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
                {TIPO_BUSQUEDA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Single input for C, R, D */}
            {!isNombre && (
              <div className="flex-1">
                <label htmlFor="search-busqueda" className={fieldLabel}>
                  {isCodigo ? "Código (7 dígitos)" : "Búsqueda"}
                </label>
                <input
                  id="search-busqueda"
                  type="text"
                  inputMode={isCodigo ? "numeric" : "text"}
                  value={busqueda}
                  onChange={handleBusquedaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isCodigo ? "Ej: 0279126" : "Ingrese término de búsqueda"}
                  className={`${inputClass} ${isCodigo ? "font-mono" : ""}`}
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
              disabled={loading || !hasCriteria}
              className={primaryBtnClass}
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

        {/* Results */}
        <div className="max-h-80 overflow-y-auto border-t border-slate-100 px-4 pb-4">
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
                  onClick={() => onSelect(item, target)}
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

  const handleSearchSelect = (item: ContribuyenteItem, target: SearchTarget) => {
    if (target === "comprador") {
      setComprador({
        codigoCompra: item.codigo,
        nombres: `${item.nombres} ${item.paterno} ${item.materno}`,
        numDoc: item.numDoc,
        direccFiscal: item.direccion,
      });
    } else {
      setVendedor({
        codigoVenta: item.codigo,
        nombres1: `${item.nombres} ${item.paterno} ${item.materno}`,
        numDoc1: item.numDoc,
        direccFiscal1: item.direccion,
      });
    }
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
                      <input
                        id="codPred"
                        type="text"
                        value={predio.codPred}
                        onChange={(e) =>
                          setPredio((prev) => ({
                            ...prev,
                            codPred: e.target.value.toUpperCase(),
                          }))
                        }
                        className={inputMono}
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

      {/* Search popup */}
      {searchOpen && (
        <ContribuyenteSearchPopup
          target={searchTarget}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
