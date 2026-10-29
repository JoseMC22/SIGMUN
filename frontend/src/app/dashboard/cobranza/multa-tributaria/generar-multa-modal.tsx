"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, Plus, Trash2, Save } from "lucide-react";
import {
  getContribuyenteAction,
  getDetalleMultaAction,
  getFechaAction,
  getInfraccionAction,
  getTributosAction,
  getUitAction,
  grabarMultaAction,
  type ContribuyenteHeader,
  type GrabarMultaItem,
  type MultaDetalle,
  type TributoRow,
} from "@/actions/cobranza/multa-tributaria";
import { getStoredUser, getPcName, fetchPcName } from "@/lib/api";

interface Props {
  codigo: string;
  idMulta?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface MultaDraft {
  key: string;
  periodo: string;
  importe: number;
  emision: number;
  subtotal: number;
  glosa: string;
  fechaVencimiento: string;
  tipo: string;
  tipoRec: string;
  descripcion: string;
}

const HOY = new Date();
const ANIO_ACTUAL = HOY.getFullYear();
const MES_ACTUAL = HOY.getMonth();

/**
 * Ultimo dia habil (lunes a viernes) de un mes.
 * `mes` es 0-based (0 = enero). Devuelve ISO `YYYY-MM-DD`.
 * Se calcula en UTC para que el resultado no dependa del timezone del runtime.
 */
function ultimoDiaHabil(anio: number, mes: number): string {
  const d = new Date(Date.UTC(anio, mes + 1, 0));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** ISO `YYYY-MM-DD` a `dd/mm/yyyy` para mostrar. */
function isoADmy(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const VENCIMIENTO_DEFAULT = ultimoDiaHabil(ANIO_ACTUAL, MES_ACTUAL);

/** Glosa sugerida para una multa nueva; el usuario puede editarla. */
const OBSERVACION_DEFAULT =
  'ART. 176 NUM. 02 - TUO DEL CODIGO TRIBUTARIO APROBADO MEDIANTE D.D. NRO. 133-2013-EF " NO PRESENTAR OTRAS DECLARACIONES O COMUNICACIONES DENTRO DE LOS PLAZOS ESTABLECIDOS"';

const ANIOS: number[] = [];
for (let y = ANIO_ACTUAL; y >= 1992; y--) ANIOS.push(y);

const PERIODOS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const money = (value: number) =>
  value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const labelCls =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

export default function GenerarMultaModal({
  codigo,
  idMulta,
  onClose,
  onSaved,
}: Props) {
  const esEdicion = Boolean(idMulta);

  const [header, setHeader] = useState<ContribuyenteHeader | null>(null);
  const [tributos, setTributos] = useState<TributoRow[]>([]);
  const [anno, setAnno] = useState(String(ANIO_ACTUAL));
  const [uit, setUit] = useState<number | null>(null);
  const [tributoId, setTributoId] = useState("");
  const [importe, setImporte] = useState("");
  const [emision, setEmision] = useState("0");
  const [fechaVencimiento, setFechaVencimiento] = useState(
    VENCIMIENTO_DEFAULT,
  );
  const [fechaEmision, setFechaEmision] = useState("");
  const [observacion, setObservacion] = useState(
    esEdicion ? "" : OBSERVACION_DEFAULT,
  );
  const [estacion, setEstacion] = useState("");
  const [periodo, setPeriodo] = useState("01");

  const [detalle, setDetalle] = useState<MultaDetalle | null>(null);
  const [multas, setMultas] = useState<MultaDraft[]>([]);

  const [loading, setLoading] = useState(esEdicion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cabecera, catalogo de tributos y fecha del servidor.
  useEffect(() => {
    void getContribuyenteAction(codigo).then((r) => {
      if (r.success && r.data) setHeader(r.data);
    });
    void getTributosAction().then((r) => {
      if (r.success && r.data.length > 0) {
        setTributos(r.data);
        setTributoId((prev) => prev || r.data[0].id);
      }
    });
    void getFechaAction().then((r) => {
      if (r.success && r.data) setFechaEmision(r.data);
    });
  }, [codigo]);

  // El backend resuelve el hostname real de esta maquina; se pide al abrir para
  // tenerlo listo antes de grabar (auditoria en caja.mrecibos.estacion).
  useEffect(() => {
    let cancelled = false;
    void fetchPcName().then((name) => {
      if (!cancelled) setEstacion(name || "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // UIT por anio. En alta, el anio manda el importe sugerido y la fecha de
  // vencimiento (ultimo dia habil), igual que el legacy.
  useEffect(() => {
    if (!anno || (esEdicion && !detalle)) return;
    let cancel = false;
    const t = setTimeout(() => {
      void getUitAction(anno).then((uitRes) => {
        if (cancel) return;
        const valor = uitRes.data?.valorUit ?? null;
        setUit(valor);
        if (!esEdicion) {
          if (valor !== null) setImporte(String(valor));
          setFechaVencimiento(ultimoDiaHabil(Number(anno), MES_ACTUAL));
        }
      });
    }, 0);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [anno, esEdicion, detalle]);

  // Carga del detalle en edicion.
  useEffect(() => {
    if (!idMulta) return;
    let cancel = false;
    void (async () => {
      setLoading(true);
      const d = await getDetalleMultaAction(codigo, idMulta);
      if (cancel) return;
      const det = d.data ?? null;
      if (!det) {
        setError(d.error ?? "No se encontró la multa");
        setLoading(false);
        return;
      }
      setDetalle(det);
      setAnno(det.anno);
      setTributoId(det.tributo);
      setImporte(String(det.insoluto));
      setEmision(String(det.derechoEmision));
      setFechaVencimiento(det.fechaVencimiento);
      setFechaEmision(det.fechaEmision);
      setObservacion(det.glosa);

      const inf = await getInfraccionAction(codigo, det.anno, idMulta);
      if (cancel) return;
      if (inf.success && inf.data) {
        setMultas([
          {
            key: "edit",
            periodo: inf.data.periodos || "01",
            importe: inf.data.importe,
            emision: inf.data.emision,
            subtotal: inf.data.subTotal,
            glosa: inf.data.glosa,
            fechaVencimiento: inf.data.fechaVencimiento,
            tipo: inf.data.tributo,
            tipoRec: inf.data.subTributo,
            descripcion: `${inf.data.anno} · ${inf.data.tributoConcepto}`,
          },
        ]);
        setPeriodo(inf.data.periodos || "01");
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [idMulta, codigo]);

  const handleAnnoChange = (nuevo: string) => {
    setAnno(nuevo);
  };

  const handleTributoChange = (nuevo: string) => {
    setTributoId(nuevo);
    if (!esEdicion && uit !== null) setImporte(String(uit));
  };

  const validateForm = (): string | null => {
    if (!anno) return "Seleccione el año";
    if (!tributoId) return "Seleccione el tributo";
    const imp = Number(importe);
    if (!Number.isFinite(imp) || imp <= 0)
      return "El importe debe ser mayor a 0";
    if (!observacion.trim()) return "La observación es obligatoria";
    if (!fechaVencimiento) return "Seleccione la fecha de vencimiento";
    return null;
  };

  const handleAgregar = () => {
    const invalid = validateForm();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (multas.some((m) => m.periodo === periodo)) {
      setError(`El periodo ${periodo} ya está agregado`);
      return;
    }
    const [tipo, tipoRec] = tributoId.split("*");
    const imp = Number(importe);
    const emi = Number(emision) || 0;
    setMultas((prev) => [
      ...prev,
      {
        key: `${periodo}-${Date.now()}`,
        periodo,
        importe: imp,
        emision: emi,
        subtotal: imp + emi,
        glosa: observacion.trim(),
        fechaVencimiento,
        tipo,
        tipoRec,
        descripcion: `${anno} · ${
          tributos.find((t) => t.id === tributoId)?.concepto ?? "MULTA TRIBUTARIA"
        }`,
      },
    ]);
    setError(null);
  };

  const handleGrabar = async () => {
    setError(null);

    let items: GrabarMultaItem[];

    if (esEdicion) {
      const invalid = validateForm();
      if (invalid) {
        setError(invalid);
        return;
      }
      const [tipo, tipoRec] = tributoId.split("*");
      const imp = Number(importe);
      const emi = Number(emision) || 0;
      items = [
        {
          tipo,
          tipoRec,
          periodo: multas[0]?.periodo ?? "01",
          importeOriginal: imp + emi,
          insoluto: imp,
          derechoEmision: emi,
          glosa: observacion.trim(),
          fechaVencimiento,
          gradualidad: 0,
        },
      ];
    } else {
      if (multas.length === 0) {
        setError("Agregue al menos una multa a la grilla");
        return;
      }
      items = multas.map((m) => ({
        tipo: m.tipo,
        tipoRec: m.tipoRec,
        periodo: m.periodo,
        importeOriginal: m.subtotal,
        insoluto: m.importe,
        derechoEmision: m.emision,
        glosa: m.glosa,
        fechaVencimiento: m.fechaVencimiento,
        gradualidad: 0,
      }));
    }

    // Lo que se graba es lo mismo que se muestra: usuario de la sesion y la
    // estacion resuelta al abrir el modal (o el fallback sincrono del cache).
    const operador = getStoredUser()?.username ?? "";
    const estacionResolved = estacion || getPcName();
    if (!operador) {
      setError("No se pudo obtener el usuario actual. Inicie sesión nuevamente.");
      return;
    }
    if (!estacionResolved) {
      setError(
        "No se pudo identificar la estación (hostname). Configure el nombre de la PC.",
      );
      return;
    }

    setSaving(true);
    const result = await grabarMultaAction({
      idMulta,
      codigo,
      anno,
      operador,
      estacion: estacionResolved,
      multas: items,
    });
    setSaving(false);
    if (result.success) {
      onSaved();
    } else {
      setError(result.error ?? "No se pudo grabar la multa");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={esEdicion ? "Editar multa tributaria" : "Nueva multa tributaria"}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {esEdicion ? "Editar multa tributaria" : "Nueva multa tributaria"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {codigo} — {header?.nombres ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                  <AlertCircle size={13} />
                  {error}
                </div>
              )}

              {/* Datos de la multa */}
              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Datos de la multa
                </legend>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label htmlFor="anno" className={labelCls}>
                      Año
                    </label>
                    <select
                      id="anno"
                      value={anno}
                      disabled={esEdicion}
                      onChange={(e) => handleAnnoChange(e.target.value)}
                      className={inputCls}
                    >
                      {ANIOS.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uit" className={labelCls}>
                      UIT
                    </label>
                    <input
                      id="uit"
                      readOnly
                      value={uit === null ? "—" : money(uit)}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="tributo" className={labelCls}>
                      Tributo
                    </label>
                    <select
                      id="tributo"
                      value={tributoId}
                      onChange={(e) => handleTributoChange(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione...</option>
                      {tributos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.concepto}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="periodo" className={labelCls}>
                      Periodo
                    </label>
                    <select
                      id="periodo"
                      value={periodo}
                      disabled={esEdicion}
                      onChange={(e) => setPeriodo(e.target.value)}
                      className={inputCls}
                    >
                      {PERIODOS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="importe" className={labelCls}>
                      Importe (S/)
                    </label>
                    <input
                      id="importe"
                      type="number"
                      step="0.01"
                      min="0"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="emision" className={labelCls}>
                      Derecho emisión (S/)
                    </label>
                    <input
                      id="emision"
                      type="number"
                      step="0.01"
                      min="0"
                      value={emision}
                      onChange={(e) => setEmision(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="fechaVencimiento" className={labelCls}>
                      F. Vencimiento
                    </label>
                    <input
                      id="fechaVencimiento"
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="fechaEmision" className={labelCls}>
                      F. Emisión
                    </label>
                    <input
                      id="fechaEmision"
                      readOnly
                      value={isoADmy(fechaEmision)}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label htmlFor="observacion" className={labelCls}>
                      Observación *
                    </label>
                    <textarea
                      id="observacion"
                      rows={2}
                      maxLength={200}
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      className={inputCls}
                      placeholder="Motivo de la multa"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Grilla de multas */}
              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Multas a {esEdicion ? "actualizar" : "generar"}
                </legend>

                {multas.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400">
                    {esEdicion
                      ? "Cargando detalle..."
                      : "Agregue periodos con el botón Agregar."}
                  </p>
                ) : (
                  <div className="overflow-auto rounded border border-slate-200">
                    <table className="w-full border-collapse min-w-[760px]">
                      <thead className="bg-slate-100">
                        <tr>
                          {[
                            "Periodo",
                            "Año / Concepto",
                            "Importe",
                            "Emisión",
                            "Subtotal",
                            "F. Venc.",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                          {!esEdicion && <th className="px-2 py-1.5" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {multas.map((m) => (
                          <tr key={m.key} className="text-[10px] text-slate-600">
                            <td className="px-2 py-1 whitespace-nowrap">
                              {m.periodo}
                            </td>
                            <td className="px-2 py-1">{m.descripcion}</td>
                            <td className="px-2 py-1 text-right whitespace-nowrap">
                              {money(m.importe)}
                            </td>
                            <td className="px-2 py-1 text-right whitespace-nowrap">
                              {money(m.emision)}
                            </td>
                            <td className="px-2 py-1 text-right whitespace-nowrap">
                              {money(m.subtotal)}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              {isoADmy(m.fechaVencimiento)}
                            </td>
                            {!esEdicion && (
                              <td className="px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMultas((prev) =>
                                      prev.filter((x) => x.key !== m.key),
                                    )
                                  }
                                  className="text-red-500 transition hover:text-red-700"
                                  title="Quitar"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {!esEdicion && (
              <button
                type="button"
                onClick={handleAgregar}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={12} />
                Agregar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Salir
            </button>
            <button
              type="button"
              onClick={() => void handleGrabar()}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              {esEdicion ? "Guardar" : "Generar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
