"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Pencil, Trash2, CheckCircle2, Plus, Loader2, AlertCircle, Search, X } from "lucide-react";
import {
  listarNotificadoresAction,
  activarEliminarNotificadorAction,
  type NotificadorRow,
} from "@/actions/notificaciones/mantenimiento-notificadores";
import StatusBadge, { isActivo } from "./status-badge";
import NotificadorFormModal from "./notificador-form-modal";
import ConfirmDialog from "@/components/confirm-dialog";

// ─── Props ───────────────────────────────────────────────────

interface Props {
  initialData: NotificadorRow[];
}

// ─── Grid ────────────────────────────────────────────────────

export function NotificadorGrid({ initialData }: Props) {
  const [data, setData] = useState<NotificadorRow[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"nuevo" | "modificar">("nuevo");
  const [editRow, setEditRow] = useState<NotificadorRow | undefined>(undefined);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<NotificadorRow | null>(null);

  const refetch = useCallback(async (nombre?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listarNotificadoresAction(nombre);
      if (res.success) {
        setData(res.data ?? []);
      } else {
        setError(res.error ?? "Error al cargar notificadores");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce del input de búsqueda: dispara el SP @busc=11 con @nombre al
  // dejar de tipear (300ms). Input en mayúsculas como el resto del módulo.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      const upper = value.toUpperCase();
      setSearchTerm(upper);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => refetch(upper || undefined), 300);
    },
    [refetch],
  );

  // Limpia el temporizador pendiente al desmontar el componente.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const openNuevo = () => {
    setModalMode("nuevo");
    setEditRow(undefined);
    setModalOpen(true);
  };

  const openModificar = (row: NotificadorRow) => {
    setModalMode("modificar");
    setEditRow(row);
    setModalOpen(true);
  };

  const confirmToggle = async () => {
    if (!confirmRow) return;
    const estado = isActivo(confirmRow.estado) ? 0 : 1;
    setTogglingId(confirmRow.codigo_autoridad);
    try {
      const res = await activarEliminarNotificadorAction(
        confirmRow.codigo_autoridad,
        estado,
      );
      if (res.success) {
        await refetch();
      } else {
        setError(res.error ?? "Error al cambiar el estado del notificador");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setTogglingId(null);
      setConfirmRow(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {data.length} notificador(es)
          </span>
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-56 rounded-md border border-slate-300 bg-white py-1.5 pl-6 pr-8 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  refetch();
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openNuevo}
          className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
        >
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {/* Error bar */}
      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
          <AlertCircle size={14} />
          <span className="text-[11px] font-medium">{error}</span>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full table-fixed border-collapse" role="grid">
          <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
            <tr>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5">
                Inicial
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5">
                Notificador
              </th>
              <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5">
                Estado
              </th>
              <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-[11px] text-slate-400"
                >
                  No hay notificadores registrados
                </td>
              </tr>
            )}
            {data.map((row) => {
              const activo = isActivo(row.estado);
              const isToggling = togglingId === row.codigo_autoridad;
              return (
                <tr
                  key={row.codigo_autoridad}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-3 py-1.5 text-[11px] font-mono text-slate-600">
                    {row.iniciales}
                  </td>
                  <td className="px-3 py-1.5 text-[11px] font-medium text-slate-800">
                    {row.notificador}
                  </td>
                  <td className="px-3 py-1.5">
                    <StatusBadge estado={row.estado} />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openModificar(row)}
                        disabled={!activo}
                        aria-label="Modificar"
                        title={
                          activo
                            ? "Modificar"
                            : "Solo se puede modificar un notificador activado"
                        }
                        className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRow(row)}
                        disabled={isToggling}
                        aria-label={activo ? "Eliminar" : "Activar"}
                        className={`inline-flex items-center gap-1 rounded p-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          activo
                            ? "text-red-500 hover:bg-red-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : activo ? (
                          <Trash2 size={13} />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        <span className="text-[10px] font-medium">
                          {activo ? "Eliminar" : "Activar"}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      <NotificadorFormModal
        isOpen={modalOpen}
        mode={modalMode}
        initial={editRow}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmRow !== null}
        title={
          isActivo(confirmRow?.estado ?? "")
            ? "Eliminar Notificador"
            : "Activar Notificador"
        }
        message={`¿Está seguro de ${
          isActivo(confirmRow?.estado ?? "") ? "eliminar" : "activar"
        } el notificador "${confirmRow?.notificador}"?`}
        confirmLabel={
          isActivo(confirmRow?.estado ?? "") ? "Sí, eliminar" : "Sí, activar"
        }
        cancelLabel="No"
        loading={togglingId !== null}
        onConfirm={confirmToggle}
        onCancel={() => setConfirmRow(null)}
      />
    </div>
  );
}

export default NotificadorGrid;
