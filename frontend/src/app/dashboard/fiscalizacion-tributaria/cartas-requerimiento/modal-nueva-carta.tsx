"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  getContribuyenteAction,
  getTAAnioAction,
  getMotivoAction,
  getCartaReqPrediosAction,
  getFiscalizadoresAction,
  getCartaByIdAction,
} from "@/actions/fiscalizacion-tributaria/cartas-requerimiento";

// ── Types ──────────────────────────────────────────────────

interface LookupOption {
  value: string;
  label: string;
}

interface CartaReqPredio {
  codPred: string;
  anexo: string;
  subAnexo: string;
  dirPredio: string;
  confirmado: number;
  nuevaDir: number;
}

interface Fiscalizador {
  codigo: string;
  nombre: string;
  seleccionado?: number;
}

// ── Props ──────────────────────────────────────────────────

interface ModalNuevaCartaProps {
  open: boolean;
  onClose: () => void;
  codigo: string;
  idCarta?: number;
}

// ── Component ──────────────────────────────────────────────

export default function ModalNuevaCarta({ open, onClose, codigo, idCarta }: ModalNuevaCartaProps) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const currentYear = String(today.getFullYear());

  const [nro, setNro] = useState("");
  const [codigoContrib, setCodigoContrib] = useState("");
  const [contribuyente, setContribuyente] = useState("");
  const [fecha, setFecha] = useState(todayISO);
  const [hora, setHora] = useState("");
  const [desde, setDesde] = useState("");
  const [motivo, setMotivo] = useState("");
  const [anno, setAnno] = useState(currentYear);

  const [tAnioOptions, setTAnioOptions] = useState<LookupOption[]>([]);
  const [motivoOptions, setMotivoOptions] = useState<LookupOption[]>([]);
  const [predios, setPredios] = useState<CartaReqPredio[]>([]);
  const [fiscalizadores, setFiscalizadores] = useState<Fiscalizador[]>([]);
  const [selectedPredios, setSelectedPredios] = useState<Set<string>>(new Set());
  const [selectedFiscalizadores, setSelectedFiscalizadores] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<"predios" | "fiscalizadores">("predios");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = Boolean(idCarta);

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";

  const loadData = useCallback(async (cod: string, year: string) => {
    if (!cod) return;
    setLoading(true);
    setError(null);
    try {
      const [contrib, tAnio, motivoRes, prediosRes, fisca] = await Promise.all([
        getContribuyenteAction(cod),
        getTAAnioAction(),
        getMotivoAction(),
        getCartaReqPrediosAction(cod, year),
        getFiscalizadoresAction(),
      ]);

      if (contrib.success) {
        setCodigoContrib(contrib.data.codigo ?? cod);
        setContribuyente(contrib.data.nombreCompleto ?? "");
      } else {
        setError(contrib.error);
      }
      setTAnioOptions(tAnio.success ? tAnio.data : []);
      setMotivoOptions(motivoRes.success ? motivoRes.data : []);
      setPredios(prediosRes.success ? prediosRes.data : []);
      setFiscalizadores(fisca.success ? fisca.data : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEditData = useCallback(async (cartaId: number) => {
    setLoading(true);
    setError(null);
    try {
      const cartaRes = await getCartaByIdAction(cartaId);
      if (!cartaRes.success || !cartaRes.data) {
        setError(cartaRes.success ? 'Carta no encontrada' : cartaRes.error);
        return;
      }

      const carta = cartaRes.data;
      setNro(carta.nroCarta);
      setCodigoContrib(carta.codigo);
      setContribuyente(carta.contribuyente);
      setFecha(carta.fechaEmision);
      setHora(carta.horaInspec);
      setDesde(carta.anioDesde);
      setMotivo(carta.idMotivo);
      setAnno(carta.anno);

      const [contrib, tAnio, motivoRes, prediosRes, fisca] = await Promise.all([
        getContribuyenteAction(carta.codigo),
        getTAAnioAction(),
        getMotivoAction(),
        getCartaReqPrediosAction(carta.codigo, carta.anno, cartaId),
        getFiscalizadoresAction(cartaId),
      ]);

      if (contrib.success) {
        setCodigoContrib(contrib.data.codigo ?? carta.codigo);
        setContribuyente(contrib.data.nombreCompleto ?? carta.contribuyente);
      }
      setTAnioOptions(tAnio.success ? tAnio.data : []);
      setMotivoOptions(motivoRes.success ? motivoRes.data : []);
      setPredios(prediosRes.success ? prediosRes.data : []);
      setFiscalizadores(fisca.success ? fisca.data : []);
      setSelectedPredios(new Set(prediosRes.success ? prediosRes.data.map((p: any) => `${p.codPred}-${p.anexo}-${p.subAnexo}`) : []));
      setSelectedFiscalizadores(new Set(fisca.success ? fisca.data.filter((f: any) => f.seleccionado === 1).map((f: any) => f.codigo) : []));
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedPredios(new Set());
    setSelectedFiscalizadores(new Set());
    setTab("predios");
    setFecha(todayISO);
    setAnno(currentYear);
    setNro("");
    if (idCarta) {
      loadEditData(idCarta);
    } else {
      loadData(codigo, currentYear);
    }
  }, [open, idCarta, codigo, currentYear, todayISO, loadData, loadEditData]);

  // ── Escape key handler (stops propagation to parent modal) ──

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

  if (!open) return null;

  const togglePredio = (key: string) => {
    setSelectedPredios((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFiscalizador = (key: string) => {
    setSelectedFiscalizadores((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fieldLabel = (text: string) => (
    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">
      {text}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            {editing ? "Editar Carta de Requerimiento" : "Nueva Carta de Requerimiento"}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-600">
              {error}
            </div>
          )}

          {/* ── GroupField: Datos ── */}
          <div className="rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Datos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 p-3">
              {/* Nro. (disabled) */}
              <div>
                {fieldLabel("Nro.")}
                <input
                  type="text"
                  value={nro}
                  disabled
                  placeholder="Auto"
                  className={`${inputClass} bg-slate-100 text-slate-400 cursor-not-allowed`}
                />
              </div>

              {/* Codigo Contribuyente */}
              <div>
                {fieldLabel("Codigo Contribuyente")}
                <input
                  type="text"
                  value={codigoContrib}
                  readOnly
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </div>

              {/* Contribuyente (nombre) */}
              <div className="md:col-span-2">
                {fieldLabel("Contribuyente")}
                <input
                  type="text"
                  value={contribuyente}
                  readOnly
                  placeholder="Nombre del contribuyente"
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </div>

              {/* Fecha (datepicker) */}
              <div>
                {fieldLabel("Fecha")}
                {/* Native date input stands in for the shadcn datepicker; defaults to today */}
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Hora (HH:MM - HH:MM) */}
              <div>
                {fieldLabel("Hora")}
                <input
                  type="text"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  placeholder="HH:MM - HH:MM"
                  className={inputClass}
                />
              </div>

              {/* Desde (select) */}
              <div>
                {fieldLabel("Desde")}
                <select
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccione...</option>
                  {tAnioOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motivo (select) */}
              <div>
                {fieldLabel("Motivo")}
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccione...</option>
                  {motivoOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Año (readonly, current year) */}
              <div>
                {fieldLabel("Año")}
                <input
                  type="text"
                  value={anno}
                  readOnly
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </div>
            </div>
          </div>

          {/* ── GroupField: Tabs ── */}
          <div className="rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Detalle
              </span>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-3 pt-2 border-b border-slate-100">
              {[
                { key: "predios", label: "Predios" },
                { key: "fiscalizadores", label: "Fiscalizadores" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key as typeof tab)}
                  className={`rounded-t-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                    tab === t.key
                      ? "border border-b-0 border-slate-200 bg-white text-sat-cyan"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-3">
              {loading ? (
                <p className="text-[10px] text-slate-400 text-center py-6">Cargando...</p>
              ) : tab === "predios" ? (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[6%]" />
                      <col className="w-[20%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[44%]" />
                    </colgroup>
                    <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                      <tr>
                        <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-white/90 border-b border-white/5"></th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Cod. Predio</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Anexo</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Sub Anexo</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Direccion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {predios.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-6 text-center text-[10px] text-slate-400">
                            No hay predios para este contribuyente
                          </td>
                        </tr>
                      )}
                      {predios.map((p, idx) => {
                        const key = `${p.codPred}-${p.anexo}-${p.subAnexo}`;
                        const checked = selectedPredios.has(key);
                        return (
                          <tr
                            key={key}
                            className={`transition hover:bg-slate-50 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            }`}
                          >
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePredio(key)}
                                className="h-3.5 w-3.5 accent-sat-cyan"
                                aria-label={`Seleccionar predio ${p.codPred}`}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-[10px] font-medium text-slate-800 truncate">{p.codPred}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{p.anexo}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{p.subAnexo}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{p.dirPredio}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[6%]" />
                      <col className="w-[34%]" />
                      <col className="w-[60%]" />
                    </colgroup>
                    <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                      <tr>
                        <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-white/90 border-b border-white/5"></th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Codigo</th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-white/90 border-b border-white/5">Fiscalizador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fiscalizadores.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-2 py-6 text-center text-[10px] text-slate-400">
                            No hay fiscalizadores
                          </td>
                        </tr>
                      )}
                      {fiscalizadores.map((f, idx) => {
                        const checked = selectedFiscalizadores.has(f.codigo);
                        return (
                          <tr
                            key={f.codigo}
                            className={`transition hover:bg-slate-50 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            }`}
                          >
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFiscalizador(f.codigo)}
                                className="h-3.5 w-3.5 accent-sat-cyan"
                                aria-label={`Seleccionar fiscalizador ${f.codigo}`}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-[10px] font-medium text-slate-800 truncate">{f.codigo}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{f.nombre}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => alert("Guardar por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
