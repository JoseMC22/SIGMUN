"use client";

import { useState, useEffect, useCallback } from "react";
import { X, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getContribuyenteAction,
  searchCartasAction,
} from "@/actions/fiscalizacion-tributaria/cartas-requerimiento";
import ModalNuevaCarta from "./modal-nueva-carta";

// ── Types ──────────────────────────────────────────────────

interface ContribuyenteInfo {
  codigo: string;
  nombreCompleto: string;
}

interface CartaRequerimientoItem {
  idCarta: number;
  nroCarta: string;
  anio: string;
  dia: string;
  mes: string;
  year: string;
  detalle: string;
  row: number;
}

// ── Props ──────────────────────────────────────────────────

interface ModalGenerarProps {
  open: boolean;
  onClose: () => void;
  codigo: string;
}

// ── Component ──────────────────────────────────────────────

export default function ModalGenerar({ open, onClose, codigo }: ModalGenerarProps) {
  const [contribuyente, setContribuyente] = useState<ContribuyenteInfo | null>(null);
  const [cartas, setCartas] = useState<CartaRequerimientoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingContribuyente, setLoadingContribuyente] = useState(false);
  const [loadingCartas, setLoadingCartas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevaCartaOpen, setNuevaCartaOpen] = useState(false);
  const [editingCartaId, setEditingCartaId] = useState<number | null>(null);

  const PAGE_SIZE = 10;

  // ── Fetch contribuyente ──

  const fetchContribuyente = useCallback(async (cod: string) => {
    setLoadingContribuyente(true);
    try {
      const result = await getContribuyenteAction(cod);
      if (result.success) {
        setContribuyente(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setLoadingContribuyente(false);
    }
  }, []);

  // ── Fetch cartas ──

  const fetchCartas = useCallback(
    async (cod: string, pageNum: number) => {
      setLoadingCartas(true);
      try {
        const result = await searchCartasAction(cod, pageNum, PAGE_SIZE);
        if (result.success) {
          setCartas(result.data);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error);
        }
      } catch {
        setError("Error de conexion");
      } finally {
        setLoadingCartas(false);
      }
    },
    [],
  );

  // ── Initial fetch when open or codigo changes ──

  useEffect(() => {
    if (!open || !codigo) return;
    setContribuyente(null);
    setCartas([]);
    setTotal(0);
    setPage(1);
    setTotalPages(0);
    setError(null);
    fetchContribuyente(codigo);
    fetchCartas(codigo, 1);
  }, [open, codigo, fetchContribuyente, fetchCartas]);

  // ── Fetch cartas on page change ──

  useEffect(() => {
    if (!open || !codigo || page === 1) return;
    fetchCartas(codigo, page);
  }, [page, open, codigo, fetchCartas]);

  // ── Escape key handler ──

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If nueva-carta modal is open, only close that one
        if (nuevaCartaOpen) {
          setNuevaCartaOpen(false);
          setEditingCartaId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, nuevaCartaOpen]);

  // ── Don't render when closed ──

  if (!open) return null;

  const isLoading = loadingContribuyente || loadingCartas;

  // ── Pagination ──

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-[11px] text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span>{" "}
          resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeft size={11} />
            Anterior
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`min-w-[24px] rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                p === page
                  ? "bg-sat-cyan text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Siguiente"
          >
            Siguiente
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    );
  };

  // ── Loading skeleton ──

  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
      <div className="animate-pulse">
        <div className="h-24 rounded bg-slate-100" />
      </div>
      <p className="text-[10px] text-slate-400 text-center">Cargando...</p>
    </div>
  );

  // ── Empty state ──

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="mb-2 rounded-full bg-slate-100 p-2">
        <UserX size={18} className="text-slate-300" />
      </div>
      <p className="text-[11px] font-medium text-slate-500">
        No hay cartas de requerimiento para este contribuyente
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            Cartas de Requerimiento
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
          {/* Error state */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-600">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && !contribuyente && renderSkeleton()}

          {/* ── GroupField: Contribuyente ── */}
          {contribuyente && (
            <div className="rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Contribuyente
                </span>
              </div>
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-semibold text-slate-500">Código:</span>
                  <span className="font-mono font-medium text-slate-700">{contribuyente.codigo}</span>
                  <span className="text-slate-300">|</span>
                  <span className="font-semibold text-slate-500">Nombre:</span>
                  <span className="text-slate-700">{contribuyente.nombreCompleto}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── GroupField: Cartas de Requerimiento ── */}
          {contribuyente && (
            <div className="rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Cartas de Requerimiento
                  </span>
                </div>
                {!isLoading && (
                  <span className="text-[9px] text-slate-400">
                    {total} {total === 1 ? "carta" : "cartas"}
                  </span>
                )}
              </div>

              <div className="relative">
                {loadingCartas && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-lg">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
                      <span className="text-[10px] font-medium text-slate-500">Buscando...</span>
                    </div>
                  </div>
                )}

                {cartas.length === 0 && !loadingCartas && renderEmptyState()}

                {cartas.length > 0 && (
                  <table className="w-full table-fixed border-collapse" data-testid="modal-cartas-grid">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[8%]" />
                      <col className="w-[14%]" />
                      <col className="w-[33%]" />
                      <col className="w-[33%]" />
                    </colgroup>
                    <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                      <tr>
                        <th className="text-left text-[10px] font-semibold uppercase text-white/90 px-2 py-2 border-b border-white/5">NroCarta</th>
                        <th className="text-left text-[10px] font-semibold uppercase text-white/90 px-2 py-2 border-b border-white/5">Año</th>
                        <th className="text-left text-[10px] font-semibold uppercase text-white/90 px-2 py-2 border-b border-white/5">Fecha de Inspeccion</th>
                        <th className="text-left text-[10px] font-semibold uppercase text-white/90 px-2 py-2 border-b border-white/5">Motivo</th>
                        <th className="text-center text-[10px] font-semibold uppercase text-white/90 px-2 py-2 border-b border-white/5">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cartas.map((carta, idx) => (
                        <tr
                          key={carta.idCarta}
                          className={`transition hover:bg-slate-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          }`}
                        >
                          <td className="px-2 py-1.5 text-[10px] font-medium text-slate-800 truncate">{carta.nroCarta}</td>
                          <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{carta.anio}</td>
                          <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{`${carta.dia}/${carta.mes}/${carta.year}`}</td>
                          <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate">{carta.detalle}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setEditingCartaId(carta.idCarta); setNuevaCartaOpen(true); }}
                                className="inline-flex items-center gap-1 rounded-md border border-sat-cyan/30 bg-sat-cyan/5 px-2 py-0.5 text-[9px] font-medium text-sat-cyan transition hover:bg-sat-cyan/10 hover:border-sat-cyan/50"
                                aria-label="Editar"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => alert("Por desarrollar")}
                                className="inline-flex items-center gap-1 rounded-md border border-red-300/30 bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-500 transition hover:bg-red-100 hover:border-red-300/50"
                                aria-label="Eliminar"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination inside the GroupField */}
              {renderPagination()}
            </div>
          )}
        </div>

        {/* Footer - action buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={() => setNuevaCartaOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
          >
            Nueva Carta Req.
          </button>
          <button
            type="button"
            onClick={() => alert("Por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-navy px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#003a73] focus:outline-none focus:ring-2 focus:ring-sat-navy/40 active:scale-[0.98]"
          >
            Carta Req. Sin Numero
          </button>
          <button
            type="button"
            onClick={() => alert("Por desarrollar")}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-amber px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#d98707] focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98]"
          >
            Ver Actas
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
          >
            Salir
          </button>
        </div>

        {/* Nueva Carta Req. modal */}
        <ModalNuevaCarta
          open={nuevaCartaOpen}
          onClose={() => { setNuevaCartaOpen(false); setEditingCartaId(null); }}
          codigo={codigo}
          idCarta={editingCartaId ?? undefined}
        />
      </div>
    </div>
  );
}
