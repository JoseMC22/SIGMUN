"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import AlcabalasTable from "./alcabalas-table";
import type {
  ContribuyenteItem,
  AlcabalaItem,
} from "@/actions/alcabala/determinar-alcabala";

// ── Props ──────────────────────────────────────────────────

interface AlcabalasModalProps {
  open: boolean;
  onClose: () => void;
  contribuyente: ContribuyenteItem | null;
  alcabalas: AlcabalaItem[];
  loading: boolean;
  onViewDetail?: (alcabala: AlcabalaItem) => void;
  onCrearAlcabala?: () => void;
  /**
   * When true, Escape must not close this modal because a child layout
   * (visualizar/nueva alcabala) is open on top and owns the Escape key.
   */
  blockEscapeClose?: boolean;
}

// ── Component ──────────────────────────────────────────────

export default function AlcabalasModal({
  open,
  onClose,
  contribuyente,
  alcabalas,
  loading,
  onViewDetail,
  onCrearAlcabala,
  blockEscapeClose = false,
}: AlcabalasModalProps) {
  // ── Escape key handler (stops propagation to parent) ──
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !blockEscapeClose) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, blockEscapeClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            Alcabalas — {contribuyente?.codigo} {contribuyente?.nombres}{" "}
            {contribuyente?.paterno} {contribuyente?.materno}
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
        <div className="flex-1 overflow-y-auto p-4">
          <AlcabalasTable
            data={alcabalas}
            loading={loading}
            onViewDetail={onViewDetail}
            onCrearAlcabala={contribuyente ? onCrearAlcabala : undefined}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
