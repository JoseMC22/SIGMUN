"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PrediosPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Paginador de la grilla. Anterior se deshabilita en la página 1 y Siguiente en
 * la última. No se renderiza cuando hay una sola página.
 */
export function PrediosPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: PrediosPaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <span className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{from}</span>
        {" – "}
        <span className="font-semibold text-slate-700">{to}</span> de{" "}
        <span className="font-semibold text-slate-700">{total}</span> resultados
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Anterior"
        >
          <ChevronLeft size={13} />
          Anterior
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
              p === page
                ? "bg-sat-cyan text-white shadow-sm"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Siguiente"
        >
          Siguiente
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
