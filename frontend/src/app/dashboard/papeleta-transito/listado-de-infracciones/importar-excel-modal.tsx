"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Download } from "lucide-react";
import {
  gridImportarExcelAction,
  importarExcelAction,
  type ImportarExcelRegistro,
} from "@/actions/papeleta-transito/acciones-infraccion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  exitosos?: number;
  fallidos?: number;
  mensajes?: string[];
}

type GridSource = "db" | "file";

export default function ImportarExcelModal({ isOpen, onClose, onSuccess }: Props) {
  const [loadingDb, setLoadingDb] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<ImportarExcelRegistro[]>([]);
  const [gridSource, setGridSource] = useState<GridSource>("db");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  // On open: load existing records from DB
  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setError(null);
    loadDbGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadDbGrid = async () => {
    setLoadingDb(true);
    setError(null);
    try {
      const res = await gridImportarExcelAction();
      if (res.success) {
        setGrid(res.data);
        setGridSource("db");
        setCurrentPage(1);
      } else {
        setError(res.error);
        setGrid([]);
      }
    } finally {
      setLoadingDb(false);
    }
  };

  const handleClose = () => {
    if (!loadingImport) {
      setGrid([]);
      setResult(null);
      setError(null);
      setFileName(null);
      setCurrentPage(1);
      if (fileRef.current) fileRef.current.value = "";
      onClose();
    }
  };

  const parseExcelText = (text: string): ImportarExcelRegistro[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const firstLine = lines[0];
    const hasHeader =
      firstLine.toLowerCase().includes("placa") || firstLine.toLowerCase().includes("conductor");
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines
      .map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          id: cols[0] ?? "",
          licencia: cols[1] ?? "",
          conductor: cols[2] ?? "",
          doc: cols[3] ?? "",
          domicilio: cols[4] ?? "",
          fecha: cols[5] ?? "",
          papeleta: cols[6] ?? "",
          infracc: (cols[7] ?? "").replace("-", "."),
          placa: (cols[8] ?? "").replace("-", ""),
          marca: cols[9] ?? "",
          oficio: cols[10] ?? "",
        };
      })
      .filter((r) => r.placa || r.infracc);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseExcelText(text);
      if (parsed.length === 0) {
        setError(
          "No se encontraron registros válidos. El archivo debe estar en formato CSV (MS DOS) con extensión .txt"
        );
        return;
      }
      setGrid(parsed);
      setGridSource("file");
      setCurrentPage(1);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (grid.length === 0 || gridSource !== "file") return;
    setLoadingImport(true);
    setError(null);
    try {
      const res = await importarExcelAction(grid);
      if (res.success) {
        setResult(res.data as ImportResult);
        onSuccess();
        // Reload DB grid after import
        await loadDbGrid();
      } else {
        setError(res.error);
      }
    } catch {
      setError("Error de conexión durante la importación.");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleExport = () => {
    if (grid.length === 0) return;
    const SEP = ";";
    const headers = [
      "ID",
      "Licencia",
      "Conductor",
      "Documento",
      "Domicilio",
      "Fecha",
      "Papeleta",
      "Infraccion",
      "Placa",
      "Marca",
      "Oficio",
    ];
    const csvContent = [
      `sep=${SEP}`,
      headers.join(SEP),
      ...grid.map((r) =>
        [
          r.id ?? "",
          r.licencia ?? "",
          `"${(r.conductor ?? "").replace(/"/g, '""')}"`,
          r.doc ?? "",
          `"${(r.domicilio ?? "").replace(/"/g, '""')}"`,
          r.fecha ?? "",
          r.papeleta ?? "",
          r.infracc ?? "",
          r.placa ?? "",
          r.marca ?? "",
          r.oficio ?? "",
        ].join(SEP)
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `importacion_excel_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(grid.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, grid.length);
  const currentItems = grid.slice(startIndex, endIndex);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loadingImport) handleClose();
      }}
      tabIndex={-1}
    >
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl border border-slate-200 animate-fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Importar de Excel a SQL
            </span>
            {gridSource === "db" && grid.length > 0 && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/80">
                {grid.length} reg. en base de datos
              </span>
            )}
            {gridSource === "file" && (
              <span className="rounded-full bg-sat-cyan/30 px-2 py-0.5 text-[10px] text-cyan-200">
                {grid.length} reg. del archivo
              </span>
            )}
          </div>
          {!loadingImport && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3 min-h-[380px]">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 space-y-1">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={14} />
                <span className="text-xs font-semibold">Importación completada</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
                <div className="text-center">
                  <p className="text-emerald-500">Exitosos</p>
                  <p className="font-bold text-emerald-700">{result.exitosos ?? 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-red-500">Fallidos</p>
                  <p className="font-bold text-red-700">{result.fallidos ?? 0}</p>
                </div>
              </div>
              {(result.mensajes ?? []).length > 0 && (
                <div className="mt-1 max-h-24 overflow-y-auto text-[10px] text-red-600 space-y-0.5">
                  {(result.mensajes ?? []).map((m, i) => (
                    <p key={i}>{m}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grid */}
          {loadingDb ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-xs">Cargando registros de la base de datos...</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden">
              {grid.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-10 bg-slate-50 text-slate-400">
                  <FileSpreadsheet size={36} className="text-slate-300" />
                  <p className="text-xs text-center">
                    No hay registros en la tabla temporal.
                    <br />
                    Cargue un archivo para importar nuevos registros.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-[11px] border-collapse min-w-[900px]">
                      <thead className="bg-slate-100/90 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-10">#</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-24">Licencia</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold">Conductor</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-28">Doc.</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold">Domicilio</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-24">Fecha</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-28">N.º Infrac.</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-18">Cód.</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-22">Placa</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-24">Marca</th>
                          <th className="text-left px-2.5 py-2 text-slate-600 font-semibold w-20">Oficio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentItems.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 text-slate-400 font-mono">{startIndex + i + 1}</td>
                            <td className="px-2.5 py-1.5 text-slate-600 font-mono">{row.licencia || "—"}</td>
                            <td className="px-2.5 py-1.5 text-slate-700 font-medium truncate max-w-[140px]">
                              {row.conductor || "—"}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-600 font-mono">{row.doc || "—"}</td>
                            <td
                              className="px-2.5 py-1.5 text-slate-600 truncate max-w-[160px]"
                              title={row.domicilio}
                            >
                              {row.domicilio || "—"}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-500 font-mono">{row.fecha || "—"}</td>
                            <td className="px-2.5 py-1.5 text-slate-700 font-mono">{row.papeleta || "—"}</td>
                            <td className="px-2.5 py-1.5 text-slate-700 font-semibold font-mono">
                              {row.infracc || "—"}
                            </td>
                            <td className="px-2.5 py-1.5 text-slate-800 font-bold font-mono">{row.placa || "—"}</td>
                            <td className="px-2.5 py-1.5 text-slate-600">{row.marca || "—"}</td>
                            <td className="px-2.5 py-1.5 text-slate-600 font-mono">{row.oficio || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-[11px] font-medium text-slate-600">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-1.5 py-0.5 rounded border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-mono transition"
                      >
                        {"<<"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-1.5 py-0.5 rounded border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-mono transition"
                      >
                        {"<"}
                      </button>
                      <span className="mx-1">
                        Pág.{" "}
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (v >= 1 && v <= totalPages) setCurrentPage(v);
                          }}
                          className="w-9 rounded border border-slate-300 bg-white px-1 py-0.5 text-center font-bold text-slate-800 text-[11px]"
                        />{" "}
                        de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-1.5 py-0.5 rounded border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-mono transition"
                      >
                        {">"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-1.5 py-0.5 rounded border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed font-mono transition"
                      >
                        {">>"}
                      </button>
                    </div>
                    <span>
                      {grid.length > 0 ? startIndex + 1 : 0}–{endIndex} de {grid.length} registros
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2.5 shrink-0">
          <p className="text-[10px] text-slate-500">
            El archivo Excel debe ser grabado con formato <strong>CSV (MS DOS)</strong> y cambiar la extensión a{" "}
            <strong>.txt</strong> antes de importar.
          </p>

          <div className="rounded-lg border border-slate-300/80 bg-white px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap">
            {/* Cargar Excel — only enabled when grid came from file */}
            <button
              type="button"
              onClick={handleImport}
              disabled={loadingImport || grid.length === 0 || gridSource !== "file"}
              className="inline-flex items-center gap-1.5 rounded bg-sat-cyan px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              title={gridSource === "db" ? "Primero seleccione un archivo para importar" : undefined}
            >
              {loadingImport ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              Cargar Excel
            </button>

            {/* Seleccionar archivo */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loadingImport}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
            >
              <FileSpreadsheet size={13} />
              {fileName ? fileName : "Seleccionar archivo"}
            </button>

            {/* Recargar desde DB */}
            <button
              type="button"
              onClick={loadDbGrid}
              disabled={loadingDb || loadingImport}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
              title="Recargar registros desde la base de datos"
            >
              <RefreshCw size={13} className={loadingDb ? "animate-spin" : ""} />
              Actualizar
            </button>

            {/* Exportar */}
            <button
              type="button"
              onClick={handleExport}
              disabled={grid.length === 0}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <Download size={13} />
              Exportar
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loadingImport}
              className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
            >
              Cerrar
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
