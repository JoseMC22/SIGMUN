"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getContribuyenteAction,
  getMultasAction,
  eliminarMultaAction,
  type ContribuyenteHeader,
  type MultaRow,
} from "@/actions/cobranza/multa-tributaria";
import { getStoredUser, getPcName, fetchPcName } from "@/lib/api";
import GenerarMultaModal from "./generar-multa-modal";

const PAGE_SIZE = 10;

interface Props {
  codigo: string;
  nombre: string;
  onClose: () => void;
}

function money(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatearFecha(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatearFechaHora(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Editar y eliminar siguen ocultos/deshabilitados en los mismos casos que el
 * legacy (js_Multastribu_formu.js): recibo pagado o anulado, multa anulada, o
 * multa fraccionada.
 */
function puedeModificar(row: MultaRow): boolean {
  if (row.estadoMulta === "0") return false;
  if (row.estadoRecibo === "1" || row.estadoRecibo === "2") return false;
  if (row.frac === "1") return false;
  return true;
}

export default function MultasModal({ codigo, nombre, onClose }: Props) {
  const [header, setHeader] = useState<ContribuyenteHeader | null>(null);
  const [rows, setRows] = useState<MultaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<{ idMulta?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MultaRow | null>(null);
  const [auditInfo, setAuditInfo] = useState<{ open: boolean; data: MultaRow | null }>({
    open: false,
    data: null,
  });
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      const result = await getMultasAction(codigo, pageNum, PAGE_SIZE);
      if (result.success) {
        setRows(result.data);
        setTotal(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } else {
        setError(result.error ?? "Error al consultar las multas");
        setRows([]);
        setTotal(0);
        setTotalPages(0);
      }
      setLoading(false);
    },
    [codigo],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void load(1);
      void getContribuyenteAction(codigo).then((r) => {
        if (r.success && r.data) setHeader(r.data);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [codigo, load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const motivo = deleteMotivo.trim();
    if (!motivo) {
      setDeleteError("Ingrese el motivo de la eliminación");
      return;
    }
    // Auditoria de quien anulo: mismo criterio que en generar-multa-modal.
    const operador = getStoredUser()?.username ?? "";
    const estacion = (await fetchPcName()) || getPcName();
    if (!operador) {
      setDeleteError(
        "No se pudo obtener el usuario actual. Inicie sesión nuevamente.",
      );
      return;
    }
    if (!estacion) {
      setDeleteError(
        "No se pudo identificar la estación (hostname). Configure el nombre de la PC.",
      );
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const result = await eliminarMultaAction(
      codigo,
      confirmDelete.idMulta,
      motivo,
      operador,
      estacion,
    );
    setDeleting(false);
    if (result.success) {
      setConfirmDelete(null);
      setDeleteMotivo("");
      setNotice(result.message ?? "Multa eliminada");
      void load(page);
    } else {
      setDeleteError(result.error ?? "No se pudo eliminar la multa");
    }
  };

  const handleSaved = () => {
    setForm(null);
    setNotice("Operación realizada correctamente");
    void load(page);
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Multas tributarias del contribuyente"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[88vh] flex flex-col animate-fade-in">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Multas tributarias
            </h2>
            <p className="text-[11px] text-slate-500">
              {codigo} — {header?.nombres || nombre}
            </p>
            {header && (
              <p className="text-[10px] text-slate-400">
                Doc. {header.numDoc} · {header.direccion}
              </p>
            )}
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

        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setForm({});
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600"
            >
              <Plus size={12} />
              Nueva multa tributaria
            </button>
            <button
              type="button"
              onClick={() => void load(page)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw size={12} />
              Actualizar
            </button>
          </div>
          <span className="text-[11px] text-slate-500">
            {total} {total === 1 ? "multa" : "multas"}
          </span>
        </div>

        {notice && (
          <div className="mx-4 mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
              <AlertCircle size={22} />
              <p className="mt-2 text-xs">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              El contribuyente no tiene multas tributarias registradas.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse min-w-[900px]">
                <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                  <tr>
                    {[
                      "Nro.",
                      "Año",
                      "Fecha",
                      "Motivo",
                      "Monto",
                      "Estado multa",
                      "Estado recibo",
                      "Obligación",
                      "Acciones",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[9px] font-semibold text-white/90 uppercase px-2 py-2 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const editable = puedeModificar(row);
                    return (
                      <tr
                        key={row.idMulta}
                        className={`${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        } ${row.estadoMulta === "0" ? "text-red-500" : "text-slate-600"}`}
                      >
                        <td className="px-2 py-1 text-[10px]">{row.nroMulta}</td>
                        <td className="px-2 py-1 text-[10px]">{row.anio}</td>
                        <td className="px-2 py-1 text-[10px] whitespace-nowrap">
                          {formatearFecha(row.fecMulta)}
                        </td>
                        <td className="px-2 py-1 text-[10px]">{row.motivo}</td>
                        <td className="px-2 py-1 text-[10px] text-right whitespace-nowrap">
                          {money(row.monto)}
                        </td>
                        <td className="px-2 py-1 text-[10px]">
                          {row.estadoMulta === "1" ? "VIGENTE" : "ANULADA"}
                        </td>
                        <td className="px-2 py-1 text-[10px]">
                          {row.estadoRecibo === "0"
                            ? "EMITIDO"
                            : row.estadoRecibo === "1"
                              ? "PAGADO"
                              : row.estadoRecibo === "2"
                                ? "ANULADO"
                                : row.estadoRecibo}
                        </td>
                        <td className="px-2 py-1 text-[10px]">
                          {row.obligacion || "—"}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => {
                                setNotice(null);
                                setForm({ idMulta: row.idMulta });
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Editar multa"
                            >
                              <Pencil size={10} />
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteMotivo("");
                                setConfirmDelete(row);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Eliminar multa"
                            >
                              <Trash2 size={10} />
                              Eliminar
                            </button>
                            {row.estadoMulta === "0" && (
                              <button
                                type="button"
                                onClick={() => setAuditInfo({ open: true, data: row })}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100"
                                title="Ver datos de la eliminación"
                              >
                                <AlertCircle size={10} />
                                Auditoría
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          <span className="text-[11px] text-slate-500">
            {total === 0 ? "Sin registros" : `Mostrando ${from} – ${to} de ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={12} />
              Anterior
            </button>
            <span className="px-2 text-[11px] text-slate-500">
              {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void load(page + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {form && (
        <GenerarMultaModal
          codigo={codigo}
          idMulta={form.idMulta}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md animate-fade-in rounded-lg bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Trash2 size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Eliminar multa {confirmDelete.nroMulta}
              </h3>
            </div>
            <div className="px-4 py-4 text-xs text-slate-600">
              <p>
                Se anulará la multa <strong>{confirmDelete.nroMulta}</strong> del
                año {confirmDelete.anio} por{" "}
                <strong>S/ {money(confirmDelete.monto)}</strong>.
              </p>
              <p className="mt-2 text-slate-400">
                Esta acción es lógica: el recibo queda ANULADO y la multa deja de
                estar vigente.
              </p>
              <div className="mt-3">
                <label
                  htmlFor="motivoEliminacion"
                  className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5 leading-none"
                >
                  Motivo de la eliminación *
                </label>
                <textarea
                  id="motivoEliminacion"
                  rows={2}
                  maxLength={250}
                  value={deleteMotivo}
                  onChange={(e) => setDeleteMotivo(e.target.value)}
                  placeholder="Indique el motivo por el que se anula la multa"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
              {deleteError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-red-600">
                  {deleteError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteMotivo("");
                }}
                disabled={deleting}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || !deleteMotivo.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={12} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {auditInfo.open && auditInfo.data && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm animate-fade-in rounded-lg bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <AlertCircle size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Datos de eliminación — multa {auditInfo.data.nroMulta}
              </h3>
            </div>
            <div className="space-y-3 px-4 py-4 text-xs">
              <div>
                <p className="mb-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400">
                  Motivo de la eliminación
                </p>
                <p className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-2 text-slate-700">
                  {auditInfo.data.motivoEliminacion || "Sin motivo registrado"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400">
                    Operador
                  </p>
                  <p className="font-medium text-slate-700">
                    {auditInfo.data.operadorAct || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400">
                    Estación
                  </p>
                  <p className="font-medium text-slate-700">
                    {auditInfo.data.estacionAct || "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider text-slate-400">
                  Fecha de anulación
                </p>
                <p className="font-medium text-slate-700">
                  {formatearFechaHora(auditInfo.data.fechaAct ?? "")}
                </p>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setAuditInfo({ open: false, data: null })}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
