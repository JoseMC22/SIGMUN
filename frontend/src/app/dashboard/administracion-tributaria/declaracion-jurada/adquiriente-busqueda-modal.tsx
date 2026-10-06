"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2, ChevronLeft, ChevronRight, Users, Check } from "lucide-react";
import {
  buscarAdquirientesGridAction,
  type AdquirienteGridItem,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (record: AdquirienteGridItem) => void;
}

// Legacy rdCriteriobus radio values (mantbusbajapre.phtml, verified):
// "Z" Código (txtCriteriobus), "X" Nombres (nombre/paterno/materno),
// "Y" Razón Social (txtCriterioRazonbus), "V" Documento (txtDocumentobus).
// The SP sp_Mcontribuyentebaja filters by @tipo_busqueda; sending anything
// else makes it ignore the criterion and return every row.
const CRITERIOS = [
  { value: "Z", label: "Código" },
  { value: "X", label: "Nombres" },
  { value: "Y", label: "Razón Social" },
  { value: "V", label: "Documento" },
] as const;

const PAGE_SIZE = 10;

export default function AdquirienteBusquedaModal({ isOpen, onClose, onSelect }: Props) {
  const [tipoBusqueda, setTipoBusqueda] = useState<string>("Z");
  const [codigo, setCodigo] = useState("");
  const [nombres, setNombres] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [razon, setRazon] = useState("");
  const [numDoc, setNumDoc] = useState("");

  const [data, setData] = useState<AdquirienteGridItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  // Register in the modal stack: ESC must close ONLY the topmost modal,
  // never the parent baja-predio modal underneath (project convention).
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);

  // Escape closes this modal only when it is the top of the stack.
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, topModal]);

  // Legacy zero-pads the código criterion to 7 digits on Enter/blur before
  // searching ('0000000'.substring(0, 7 - len) + valor).
  const padCodigo = (v: string) => {
    const t = v.trim();
    return t.length > 0 ? t.padStart(7, "0") : t;
  };

  const buildCriterios = useCallback(
    (currentPage: number) => ({
      tipo_busqueda: tipoBusqueda,
      codigo: tipoBusqueda === "Z" ? padCodigo(codigo) : "",
      nombres: tipoBusqueda === "X" ? nombres : "",
      paterno: tipoBusqueda === "X" ? paterno : "",
      materno: tipoBusqueda === "X" ? materno : "",
      razon: tipoBusqueda === "Y" ? razon : "",
      num_doc: tipoBusqueda === "V" ? numDoc : "",
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [tipoBusqueda, codigo, nombres, paterno, materno, razon, numDoc],
  );

  const fetchData = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      setError(null);
      const res = await buscarAdquirientesGridAction(buildCriterios(currentPage));
      if (res.success) {
        setData(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else {
        setError(res.error);
        setData([]);
        setTotal(0);
        setTotalPages(0);
      }
      setLoading(false);
    },
    [buildCriterios],
  );

  // Reset on open (no auto-search: legacy requires pressing Buscar)
  const resetState = () => {
    setTipoBusqueda("Z");
    setCodigo("");
    setNombres("");
    setPaterno("");
    setMaterno("");
    setRazon("");
    setNumDoc("");
    setData([]);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
    setError(null);
  };

  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  const handleSearch = () => {
    // Legacy blur handler: código gets zero-padded before searching.
    if (tipoBusqueda === "Z") setCodigo((c) => padCodigo(c));
    setPage(1);
    fetchData(1);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape is handled by the window listener gated by the modal stack.
    if (e.key === "Enter") handleSearch();
  };

  const handleSelect = (record: AdquirienteGridItem) => {
    onSelect(record);
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] uppercase text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[80vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              Búsqueda de Adquirientes
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-3 space-y-3">
          {/* Criterios */}
          <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
            <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
              <Users size={13} />
              Criterio de búsqueda
            </legend>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {CRITERIOS.map((c) => (
                <label key={c.value} className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
                  <input
                    type="radio"
                    name="rdCriteriobus"
                    value={c.value}
                    checked={tipoBusqueda === c.value}
                    onChange={(e) => setTipoBusqueda(e.target.value)}
                    className="h-3.5 w-3.5 accent-cyan-600"
                  />
                  {c.label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-2 md:grid-cols-4">
              {tipoBusqueda === "Z" && (
                <div className="col-span-2">
                  <label className={labelClass}>Código</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => setCodigo((c) => padCodigo(c))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Código del contribuyente"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              )}
              {tipoBusqueda === "X" && (
                <>
                  <div>
                    <label className={labelClass}>Nombres</label>
                    <input
                      type="text"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="Nombres"
                      className={inputClass}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido Paterno</label>
                    <input
                      type="text"
                      value={paterno}
                      onChange={(e) => setPaterno(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="Apellido paterno"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido Materno</label>
                    <input
                      type="text"
                      value={materno}
                      onChange={(e) => setMaterno(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="Apellido materno"
                      className={inputClass}
                    />
                  </div>
                </>
              )}
              {tipoBusqueda === "Y" && (
                <div className="col-span-2">
                  <label className={labelClass}>Razón Social</label>
                  <input
                    type="text"
                    value={razon}
                    onChange={(e) => setRazon(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Razón social"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              )}
              {tipoBusqueda === "V" && (
                <div className="col-span-2">
                  <label className={labelClass}>Nro Documento</label>
                  <input
                    type="text"
                    value={numDoc}
                    onChange={(e) => setNumDoc(e.target.value.replace(/\D/g, ""))}
                    maxLength={11}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Número de documento"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sat-amber px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#d98707] focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  Buscar
                </button>
              </div>
            </div>
          </fieldset>

          {/* ── Grid (gridBajapred legacy: Código, Nombres, Nro Documento, Dirección) ── */}
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-2 py-1.5 text-center" />
                  <th className="px-2.5 py-1.5">Código</th>
                  <th className="px-2.5 py-1.5">Nombres</th>
                  <th className="px-2.5 py-1.5">Nro Documento</th>
                  <th className="px-2.5 py-1.5">Dirección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      <Loader2 size={16} className="mx-auto mb-1 animate-spin text-sat-cyan" />
                      Cargando...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-red-500 text-[11px]">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-[11px]">
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={`${row.codigo}-${idx}`}
                      className="transition hover:bg-sat-cyan/5 cursor-pointer"
                      onDoubleClick={() => handleSelect(row)}
                      title="Doble clic para seleccionar"
                    >
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelect(row); }}
                          className="rounded-md bg-sat-cyan/10 p-1 text-sat-cyan transition hover:bg-sat-cyan/20"
                          title="Seleccionar adquiriente"
                          aria-label={`Seleccionar ${row.codigo}`}
                        >
                          <Check size={13} />
                        </button>
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-600">{row.codigo}</td>
                      <td className="px-2.5 py-1.5 font-medium text-slate-800">{row.nombres}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">{row.documento}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">{row.direccion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginador ── */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Mostrando {data.length} de {total} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <span className="px-2 font-medium text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Siguiente"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
