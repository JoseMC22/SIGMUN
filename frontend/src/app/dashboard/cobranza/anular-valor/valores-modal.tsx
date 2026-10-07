"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, Loader2, FileText, Trash2 } from "lucide-react";
import {
  getValoresByCodigoAction,
  anularValorAction,
  type ValorEmitido,
} from "@/actions/cobranza/anular-valor";
import { getStoredUser } from "@/lib/api";
import { validateMotivo, MOTIVO_MAX } from "./motivo-validation";

// Columnas del modal, pedidas por el usuario: tipo de documento, número de
// valor, año, monto, estado y (fase 2) la acción de anular. El backend
// devuelve 16 campos; acá se muestran 5 + la columna de acción.
const MODAL_COLS: { header: string; key: string; money?: boolean }[] = [
  { header: "Tipo Doc.", key: "nomb_val" },
  { header: "Nro Valor", key: "num_val" },
  { header: "Año", key: "ano_val" },
  { header: "Monto", key: "MontoTotal", money: true },
  { header: "Estado", key: "nestado" },
  { header: "Acción", key: "accion" },
];

function celda(v: ValorEmitido, col: (typeof MODAL_COLS)[number]) {
  const raw = v[col.key];
  if (raw === null || raw === undefined || raw === "") return "";
  if (col.money && !Number.isNaN(Number(raw))) return Number(raw).toFixed(2);
  return String(raw);
}

interface ValoresModalProps {
  codigo: string;
  nombre: string;
  onClose: () => void;
}

export default function ValoresModal({
  codigo,
  nombre,
  onClose,
}: ValoresModalProps) {
  const [data, setData] = useState<ValorEmitido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Anulación (fase 2): fila objetivo + motivo en curso
  const [anularRow, setAnularRow] = useState<ValorEmitido | null>(null);
  const [motivo, setMotivo] = useState("");
  const [anularError, setAnularError] = useState<string | null>(null);
  const [anularLoading, setAnularLoading] = useState(false);

  const motivoCheck = validateMotivo(motivo);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getValoresByCodigoAction(codigo);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error ?? "Error al consultar los valores");
        setData([]);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirAnular = (row: ValorEmitido) => {
    setAnularRow(row);
    setMotivo("");
    setAnularError(null);
  };

  const cerrarAnular = () => {
    setAnularRow(null);
    setMotivo("");
    setAnularError(null);
  };

  const confirmarAnulacion = async () => {
    if (!anularRow || !motivoCheck.valid || anularLoading) return;
    setAnularLoading(true);
    setAnularError(null);
    try {
      const res = await anularValorAction({
        Codigo: codigo,
        IdValor: String(anularRow.id_valor ?? ""),
        NumVal: String(anularRow.num_val ?? ""),
        AnoVal: String(anularRow.ano_val ?? ""),
        Motivo: motivo.trim(),
        Operador: getStoredUser()?.username ?? "",
      });
      if (res.success) {
        cerrarAnular();
        // Recarga el listado del modal con el estado ya Anulado
        await load();
      } else {
        // El error se muestra dentro del modal de motivo, sin perderlo
        setAnularError(res.error ?? "Error al anular el valor");
      }
    } catch {
      setAnularError("Error de conexión con el servidor");
    } finally {
      setAnularLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Con el modal de motivo abierto, Escape cierra solo ese.
      if (anularRow) {
        cerrarAnular();
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anularRow, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Valores emitidos de ${codigo}`}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-sat-navy to-[#1e3050] rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-white/80 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                Valores emitidos · {codigo}
              </h2>
              <p className="text-[11px] text-white/60 truncate">{nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto p-3">
          {loading ? (
            <div
              className="flex items-center justify-center py-12"
              data-testid="valores-loading"
            >
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">
                Consultando valores...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-2 rounded-full bg-red-100 p-2">
                <AlertCircle size={18} className="text-red-400" />
              </div>
              <p className="text-xs font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-md bg-red-600 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-xs font-medium text-slate-500">
                Sin valores emitidos para este código
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] text-slate-500">
                Se encontraron{" "}
                <span className="font-semibold text-slate-700">
                  {data.length}
                </span>{" "}
                {data.length === 1 ? "valor" : "valores"}
              </p>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table
                  className="w-full border-collapse min-w-[700px]"
                  data-testid="valores-grid"
                >
                  <thead className="bg-slate-100">
                    <tr>
                      {MODAL_COLS.map((col) => (
                        <th
                          key={col.key}
                          className="text-left text-[9px] font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200 whitespace-nowrap"
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                      <tr
                        key={`${row.num_val}-${row.ano_val}-${idx}`}
                        className="transition hover:bg-slate-50"
                      >
                        {MODAL_COLS.map((col) =>
                          col.key === "accion" ? (
                            <td
                              key="accion"
                              className="px-2 py-1 text-center"
                            >
                              {/* Solo filas Pendiente: el backend rechaza el resto */}
                              {row.nestado === "Pendiente" ? (
                                <button
                                  type="button"
                                  onClick={() => abrirAnular(row)}
                                  aria-label={`Anular valor ${row.num_val}`}
                                  title="Anular valor"
                                  className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : null}
                            </td>
                          ) : (
                            <td
                              key={col.key}
                              className={`px-2 py-1 text-[10px] truncate ${
                                col.money
                                  ? "text-right font-mono text-slate-700"
                                  : "text-slate-600"
                              }`}
                            >
                              {celda(row, col)}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de motivo (fase 2): montado dentro del diálogo principal,
          con stopPropagation para no burbujeear al cierre del listado */}
      {anularRow && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (!anularLoading) cerrarAnular();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Anular valor con motivo"
        >
          <div
            className="w-full max-w-md animate-fade-in rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-gradient-to-r from-sat-navy to-[#1e3050] px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-white">
                  Anular valor {anularRow.num_val} · {anularRow.ano_val}
                </h3>
                <p className="truncate text-[11px] text-white/60">
                  {anularRow.nomb_val} · {codigo}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarAnular}
                aria-label="Cerrar"
                className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <label
                htmlFor="motivo-anulacion"
                className="mb-1 block text-[11px] font-medium text-slate-600"
              >
                Motivo de la anulación
              </label>
              <textarea
                id="motivo-anulacion"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={MOTIVO_MAX}
                rows={4}
                placeholder="Detalle el motivo de la anulación (mínimo 20 caracteres)"
                className="w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sat-cyan focus:outline-none focus:ring-1 focus:ring-sat-cyan"
              />
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-[11px] text-red-500">{motivoCheck.error}</p>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">
                  {motivo.trim().length}/{MOTIVO_MAX}
                </span>
              </div>

              {anularError && (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 px-2 py-1.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="text-[11px] font-medium text-red-600">
                    {anularError}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5">
              <button
                type="button"
                onClick={cerrarAnular}
                disabled={anularLoading}
                className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarAnulacion()}
                disabled={!motivoCheck.valid || anularLoading}
                className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {anularLoading && <Loader2 size={12} className="animate-spin" />}
                {anularLoading ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
