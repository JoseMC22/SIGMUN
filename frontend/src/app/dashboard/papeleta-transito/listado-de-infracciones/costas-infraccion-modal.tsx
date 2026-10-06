"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Loader2,
  Save,
  AlertCircle,
  ReceiptText,
  Search,
  Printer,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
} from "lucide-react";
import {
  listarCostasAction,
  consultarBandejaCostasAction,
  grabarCostaAction,
  eliminarCostasAction,
  autocompletarConceptoCostasAction,
  obtenerDatosContribuyenteCostasAction,
  type CostaItem,
  type BandejaCostaItem,
  type ConceptoCosta,
} from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  ninfrac: string | null;
  codigo: string;
  nombreInfractor?: string;
  numeroPapeleta?: string;
  onClose: () => void;
}

interface FormState {
  idcosta: string;
  idrecibo: string;
  expediente: string;
  conceptoId: string;
  conceptoNombre: string;
  tipo: string;
  subtipo: string;
  cantidad: string;
  monto: string;
  anno: string;
  periodo: string;
  observacion: string;
}

const EMPTY_FORM: FormState = {
  idcosta: "",
  idrecibo: "",
  expediente: "",
  conceptoId: "",
  conceptoNombre: "",
  tipo: "",
  subtipo: "",
  cantidad: "0",
  monto: "0.00",
  anno: "",
  periodo: "01",
  observacion: "",
};

// Header info shared between views
function ContribuyenteHeader({
  codigo,
  nombreInfractor,
}: {
  codigo: string;
  nombreInfractor?: string;
}) {
  const [numDoc, setNumDoc] = useState<string>("-");
  const [domicilio, setDomicilio] = useState<string>("-");

  useEffect(() => {
    if (codigo) {
      obtenerDatosContribuyenteCostasAction(codigo, "").then(res => {
        if (res.success && res.data) {
          setNumDoc(res.data.num_docu || "-");
          setDomicilio(res.data.Dir_Fisca || "-");
        }
      }).catch(console.error);
    }
  }, [codigo]);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 text-xs shadow-sm">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <div>
          <span className="font-semibold text-slate-600">Código:</span>{" "}
          <span className="font-mono text-slate-800">{codigo}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600">Contribuyente:</span>{" "}
          <span className="font-medium text-slate-800 uppercase">{nombreInfractor || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600">Nro. Documento:</span>{" "}
          <span className="font-mono text-slate-800">{numDoc}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600">Domicilio Fiscal:</span>{" "}
          <span className="text-slate-800">{domicilio}</span>
        </div>
      </div>
    </div>
  );
}

// ── Bandeja View ────────────────────────────────────────────────────────────────
function BandejaView({
  codigo,
  nombreInfractor,
  onClose,
  onOpenDetail,
}: {
  codigo: string;
  nombreInfractor?: string;
  onClose: () => void;
  onOpenDetail: (mode: "view" | "add", targetExp?: string | null) => void;
}) {
  const [bandejaItems, setBandejaItems] = useState<BandejaCostaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBandeja = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await consultarBandejaCostasAction(codigo);
      if (res.success) setBandejaItems(res.data ?? []);
      else setError(res.error ?? "Error al cargar la bandeja de costas.");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => { loadBandeja(); }, [loadBandeja]);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-sat-navy px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-sat-cyan" />
          <h2 className="text-sm font-bold text-white">Bandeja Costas</h2>
        </div>
        <button type="button" onClick={onClose}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">
        <ContribuyenteHeader codigo={codigo} nombreInfractor={nombreInfractor} />

        {error && (
          <div className="flex items-center gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-center font-semibold w-10">#</th>
                <th className="px-3 py-2 text-left font-semibold">Expediente</th>
                <th className="px-3 py-2 text-center font-semibold w-24">Período</th>
                <th className="px-3 py-2 text-right font-semibold w-28">Monto</th>
                <th className="px-3 py-2 text-center font-semibold w-24">Estado Costa</th>
                <th className="px-3 py-2 text-center font-semibold w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Loader2 size={16} className="animate-spin inline mr-2" />Cargando...
                  </td>
                </tr>
              ) : bandejaItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No se encontraron costas procesales registradas para este contribuyente.
                  </td>
                </tr>
              ) : (
                bandejaItems.map((item, idx) => {
                  const montoNum = parseFloat(item.monto || "0") || 0;
                  return (
                    <tr key={item.idrecibo ? `rec-${item.idrecibo}-${idx}` : `exp-${idx}`}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-medium text-slate-800">{item.expediente || "-"}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-600">{item.periodo || "-"}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{montoNum.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-600">{item.estadocosta || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => onOpenDetail("view", item.expediente)} title="Ver / Editar Detalle"
                            className="inline-flex items-center justify-center h-6 w-6 rounded bg-amber-400 hover:bg-amber-500 text-white transition shadow-sm">
                            <Edit2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-200 bg-white shrink-0">
        <button type="button" onClick={() => onOpenDetail("add", null)}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition">
          <Plus size={13} /> Nuevo
        </button>
        <button type="button" onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Detail / Costas Contribuyente View ──────────────────────────────────────────
function DetailView({
  ninfrac,
  codigo,
  nombreInfractor,
  numeroPapeleta,
  onClose,
  onBack,
}: {
  ninfrac: string | null;
  codigo: string;
  nombreInfractor?: string;
  numeroPapeleta?: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const [costas, setCostas] = useState<CostaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCosta, setSelectedCosta] = useState<CostaItem | null>(null);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [domicilio, setDomicilio] = useState<string>("");
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<ConceptoCosta[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCostas = useCallback(async (overrideExp?: string) => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch costas directly for this contribuyente (pass overrideExp if defined, or empty to get all)
      const targetExp = overrideExp !== undefined ? overrideExp : "";
      const res = await listarCostasAction(codigo, targetExp);
      if (res.success) {
        const list = res.data ?? [];
        setCostas(list);
        if (list.length > 0) {
          const c = list[0];
          setSelectedCosta(c);
          setForm((prev) => ({
            ...prev,
            idcosta: c.idcosta,
            idrecibo: c.idrecibo || "",
            expediente: c.expediente || targetExp,
            conceptoId: c.tipo || "",
            conceptoNombre: c.conceptos || "",
            tipo: c.tipo || "",
            subtipo: c.subtipo || "",
            cantidad: c.cantidad || "0",
            monto: c.monto || "0.00",
            anno: c.anno || "",
            periodo: c.periodo || prev.periodo || "01",
            observacion: c.observacion || prev.observacion || "",
          }));
          setAutocompleteQuery(c.conceptos || "");
        } else if (targetExp) {
          setForm((prev) => ({ ...prev, expediente: targetExp }));
        }
      } else {
        setError(res.error ?? "Error al cargar costas.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [codigo]);


  useEffect(() => {
    setMode("view");
    loadCostas();
    if (codigo) {
      obtenerDatosContribuyenteCostasAction(codigo, "").then((res) => {
        if (res.success && res.data?.Dir_Fisca) {
          setDomicilio(res.data.Dir_Fisca);
        }
      }).catch(console.error);
    }
  }, [loadCostas, codigo, numeroPapeleta, ninfrac]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleConceptoSearch = (value: string) => {
    setAutocompleteQuery(value);
    // Only update concepto-related fields, never touch expediente/anno/observacion
    setForm((prev) => ({ ...prev, conceptoNombre: value, conceptoId: "" }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const res = await autocompletarConceptoCostasAction(value);
        if (res.success) { setAutocompleteResults(res.data ?? []); setShowDropdown(true); }
      } finally { setAutocompleteLoading(false); }
    }, 300);
  };

  const handleSelectConcepto = (item: ConceptoCosta) => {
    const parts = item.name.split("|");
    const desc = parts[1] && parts[1].trim() !== "" ? parts[1].trim() : item.id;
    const precio = parseFloat(parts[3] ?? "0") || 0;
    setAutocompleteQuery(desc);
    // Only update concepto-related fields, preserve expediente/anno/observacion
    setForm((prev) => ({
      ...prev,
      conceptoId: item.id,
      conceptoNombre: desc,
      tipo: item.id,
      subtipo: item.id,
      monto: precio > 0 ? String(precio) : prev.monto,
    }));
    setShowDropdown(false);
    setAutocompleteResults([]);
  };

  const handleStartAdd = () => {
    setSelectedCosta(null);
    setForm({ ...EMPTY_FORM });
    setAutocompleteQuery("");
    setMode("add");
  };


  const handleStartEdit = () => {
    if (!selectedCosta) return;
    setForm({
      idcosta: selectedCosta.idcosta,
      idrecibo: selectedCosta.idrecibo || "",
      expediente: selectedCosta.expediente || form.expediente || numeroPapeleta || ninfrac || "",
      conceptoId: selectedCosta.tipo || "",
      conceptoNombre: selectedCosta.conceptos || "",
      tipo: selectedCosta.tipo || "",
      subtipo: selectedCosta.subtipo || "",
      cantidad: selectedCosta.cantidad || "0",
      monto: selectedCosta.monto || "0.00",
      anno: selectedCosta.anno || form.anno || new Date().getFullYear().toString(),
      periodo: selectedCosta.periodo || "01",
      observacion: selectedCosta.observacion || "",
    });
    setAutocompleteQuery(selectedCosta.conceptos || "");
    setMode("edit");
  };

  const handleCancelForm = () => {
    setMode("view");
  };

  const handleSave = async () => {
    if (!form.conceptoNombre && !form.tipo) { alert("Seleccione un concepto de costa."); return; }
    if (!form.expediente.trim()) { alert("Debe ingresar el número de expediente."); return; }
    const expTarget = form.expediente;
    const annoTarget = form.anno || new Date().getFullYear().toString();
    setSaving(true);
    try {
      const res = await grabarCostaAction({
        idcosta: form.idcosta,
        idrecibo: form.idrecibo,
        expediente: expTarget,
        codigo,
        anno: annoTarget,
        periodo: form.periodo || "01",
        observacion: form.observacion,
        tipo: form.tipo || form.conceptoId,
        subtipo: form.subtipo || form.conceptoId,
        cantidad: form.cantidad,
        monto: form.monto,
      });
      if (res.success) {
        alert("Costa guardada correctamente.");
        await loadCostas(expTarget);
        handleCancelForm();
      } else {
        const msg = res.error || (res as any).message || "Consulte el log del sistema.";
        alert("Error al grabar la costa: " + msg);
      }
    } catch (err) {
      console.error("[handleSave] error:", err);
      alert("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCosta) return;
    if (!window.confirm("¿Desea eliminar la costa seleccionada?")) return;
    setDeleting(true);
    try {
      const res = await eliminarCostasAction([{ idcosta: selectedCosta.idcosta }]);
      if (res.success) { setSelectedCosta(null); setMode("view"); await loadCostas(); }
      else alert("Error al eliminar: " + (res.error ?? ""));
    } catch { alert("Error de conexión."); }
    finally { setDeleting(false); }
  };

  const totalCostas = costas.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);

  const handleImprimirReporte = async () => {
    try {
      const { obtenerPlantillaCostasAction } = await import(
        "@/actions/papeleta-transito/reportes-infracciones"
      );
      const { construirHtmlReporteCostas } = await import(
        "./reportes/Costas/reporte-costas"
      );
      const { descargarPdfDesdeHtml } = await import(
        "@/lib/reportes/reporte-service"
      );

      const resPlantilla = await obtenerPlantillaCostasAction();
      if (!resPlantilla.success) {
        alert(resPlantilla.error);
        return;
      }

      const htmlFinal = construirHtmlReporteCostas(
        {
          codigo,
          nombreInfractor,
          domicilio,
          expediente: form.expediente || numeroPapeleta || ninfrac || "",
          anno: form.anno,
          periodo: form.periodo,
          observacion: form.observacion,
          items: costas,
        },
        resPlantilla.data
      );

      await descargarPdfDesdeHtml(htmlFinal, `Reporte_Costas_${codigo}.pdf`);
    } catch (err) {
      console.error("Error al generar el reporte de costas:", err);
      alert("Error al generar el reporte en PDF.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-sat-navy px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} title="Volver a la vista principal"
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition">
            <ArrowLeft size={15} />
          </button>
          <ReceiptText size={16} className="text-sat-cyan" />
          <h2 className="text-sm font-bold text-white">Costas</h2>
        </div>
        <button type="button" onClick={onClose}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        <ContribuyenteHeader codigo={codigo} nombreInfractor={nombreInfractor} />

        {/* Expediente / Año / Período / Observación */}
        <div className="bg-white border border-slate-200 rounded-md p-3 text-xs shadow-sm">
          <div className="grid grid-cols-3 gap-3 items-start">
            <div>
              <label className="block font-semibold text-slate-600 mb-0.5">Expediente_:</label>
              <input type="text"
                value={form.expediente}
                onChange={(e) => setForm((f) => ({ ...f, expediente: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sat-cyan" />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block font-semibold text-slate-600 mb-0.5">Año:</label>
                <input type="text"
                  value={form.anno}
                  onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sat-cyan" />
              </div>
              <div className="w-1/2">
                <label className="block font-semibold text-slate-600 mb-0.5">Período:</label>
                <input type="text"
                  value={form.periodo}
                  onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sat-cyan" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-0.5">Observacion:</label>
              <textarea rows={2}
                placeholder="Ingrese observación..."
                value={form.observacion}
                onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 resize-none text-xs focus:outline-none focus:ring-1 focus:ring-sat-cyan" />
            </div>
          </div>
        </div>

        {/* Detalle de Pago */}
        <fieldset className="border border-slate-200 rounded-md p-3 bg-white shadow-sm">
          <legend className="px-2 text-xs font-semibold text-sat-navy">Detalle de Pago:</legend>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 border border-slate-200 rounded overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Descripcion</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-20">UITc</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-20">Cantidad</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-24">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">
                      <Loader2 size={16} className="animate-spin inline mr-1" /> Cargando...
                    </td></tr>
                  ) : costas.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400 italic">
                      No hay registros.
                    </td></tr>
                  ) : (
                    costas.map((c, idx) => {
                      const isSel = selectedCosta?.idcosta === c.idcosta;
                      return (
                        <tr key={c.idcosta ? `costa-${c.idcosta}-${idx}` : `costa-${idx}`}
                          onClick={() => {
                            setSelectedCosta(c);
                            setForm((f) => ({
                              ...f,
                              idcosta: c.idcosta,
                              idrecibo: c.idrecibo || "",
                              expediente: c.expediente || "",
                              conceptoId: c.tipo || "",
                              conceptoNombre: c.conceptos || "",
                              tipo: c.tipo || "",
                              subtipo: c.subtipo || "",
                              cantidad: c.cantidad || "0",
                              monto: c.monto || "0.00",
                              anno: c.anno || "",
                              periodo: c.periodo || "01",
                              observacion: c.observacion || "",
                            }));
                            setAutocompleteQuery(c.conceptos || "");
                            setMode("edit");
                          }}
                          className={`cursor-pointer border-b border-slate-100 transition-colors ${isSel ? "bg-sat-cyan/15 font-medium" : "hover:bg-slate-50"}`}>
                          <td className="px-2 py-1.5 text-slate-800">{c.conceptos || "-"}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-slate-600">{parseFloat(c.uit1 || "0").toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-slate-600">{c.cantidad}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-800">{parseFloat(c.monto || "0").toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="col-span-1 space-y-2 text-xs flex flex-col justify-center pl-2 border-l border-slate-100">
              {[
                { label: "Monto de la Deuda:", value: "0.00" },
                { label: "Gastos:", value: "0.00" },
                { label: "Costas Procesales:", value: totalCostas.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-600 text-[11px]">{label}</span>
                  <input type="text" readOnly value={value}
                    className="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-right font-mono text-slate-700 text-xs" />
                </div>
              ))}
              <hr className="border-slate-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 text-[11px]">Monto Total:</span>
                <input type="text" readOnly value={totalCostas.toFixed(2)}
                  className="w-20 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-right font-mono font-bold text-sat-navy text-xs" />
              </div>
            </div>
          </div>

          {/* Botonera dinamica */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
            {mode === "view" ? (
              <>
                <button type="button" onClick={handleStartAdd}
                  className="rounded border border-slate-300 bg-white hover:bg-slate-100 px-4 py-1 text-xs font-semibold text-sat-navy transition shadow-sm">
                  Agregar
                </button>
                <button type="button" onClick={handleStartEdit} disabled={!selectedCosta}
                  className="rounded border border-slate-300 bg-white hover:bg-slate-100 px-4 py-1 text-xs font-semibold text-sat-navy transition disabled:opacity-40 shadow-sm">
                  Editar
                </button>
                <button type="button" onClick={handleDelete} disabled={!selectedCosta || deleting}
                  className="rounded border border-slate-300 bg-white hover:bg-red-50 hover:text-red-600 px-4 py-1 text-xs font-semibold text-slate-700 transition disabled:opacity-40 shadow-sm">
                  {deleting ? <Loader2 size={12} className="animate-spin inline" /> : "Eliminar"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1 rounded bg-sat-navy px-4 py-1 text-xs font-semibold text-white hover:bg-sat-navy/90 disabled:opacity-40 shadow-sm">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
                <button type="button" onClick={handleCancelForm}
                  className="rounded border border-slate-300 bg-white px-4 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm">
                  Cancelar
                </button>
                <button type="button" onClick={handleDelete} disabled={!selectedCosta || deleting}
                  className="rounded border border-slate-300 bg-white hover:bg-red-50 hover:text-red-600 px-4 py-1 text-xs font-semibold text-amber-600 transition disabled:opacity-40 shadow-sm">
                  {deleting ? <Loader2 size={12} className="animate-spin inline" /> : "Eliminar"}
                </button>
              </>
            )}
          </div>

          {/* Inline add/edit form – dentro del fieldset, debajo de la botonera */}
          {(mode === "add" || mode === "edit") && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-600">Tipo</label>
                  <input type="text" readOnly value={form.tipo}
                    className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 font-mono text-xs text-slate-600 text-center cursor-not-allowed" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-600">Subtipo</label>
                  <input type="text" readOnly value={form.subtipo}
                    className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 font-mono text-xs text-slate-600 text-center cursor-not-allowed" />
                </div>
                <div className="col-span-6 relative" ref={autocompleteRef}>
                  <label className="block text-[10px] font-semibold text-slate-600">Concepto</label>
                  <div className="relative">
                    <input type="text" value={autocompleteQuery}
                      onChange={(e) => handleConceptoSearch(e.target.value)}
                      placeholder="Buscar concepto..."
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 pr-6 font-mono text-xs" />
                    <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  {autocompleteLoading && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Buscando...
                    </p>
                  )}
                  {showDropdown && autocompleteResults.length > 0 && (
                    <div className="absolute left-0 bottom-full z-50 mb-1 w-full max-h-40 overflow-y-auto rounded border border-slate-300 bg-white shadow-xl">
                      {autocompleteResults.map((item, idx) => {
                        const parts = item.name.split("|");
                        const label = parts[1] && parts[1].trim() !== "" ? parts[1].trim() : (item.name || item.id);
                        return (
                          <button key={item.id ? `ac-${item.id}-${idx}` : `ac-${idx}`} type="button"
                            className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-sky-50 hover:text-sat-navy border-b border-slate-100 transition-colors uppercase"
                            onClick={() => handleSelectConcepto(item)}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600">Monto</label>
                  <input type="number" step="0.01" value={form.monto}
                    onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-600">Cant.</label>
                  <input type="number" value={form.cantidad}
                    onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-600">Total</label>
                  <input type="text" readOnly
                    value={(parseFloat(form.monto || "0") * (parseFloat(form.cantidad || "0") || 0)).toFixed(2)}
                    className="w-full rounded border border-slate-300 bg-slate-100 px-2 py-1 text-right font-mono font-semibold text-xs text-sat-navy cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {error && (
          <div className="flex items-center gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-200 bg-white shrink-0">
        <button type="button" onClick={handleImprimirReporte}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition">
          <Printer size={13} /> Reporte
        </button>
        <button type="button" onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition">
          Salir
        </button>
      </div>
    </div>
  );
}

export default function CostasInfraccionModal({
  isOpen,
  ninfrac,
  codigo,
  nombreInfractor,
  numeroPapeleta,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3">
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        <DetailView
          ninfrac={ninfrac}
          codigo={codigo}
          nombreInfractor={nombreInfractor}
          numeroPapeleta={numeroPapeleta}
          onClose={onClose}
          onBack={onClose}
        />
      </div>
    </div>
  );
}

