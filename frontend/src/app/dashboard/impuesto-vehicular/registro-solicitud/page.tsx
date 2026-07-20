"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Pencil,
  // Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserX,
  AlertCircle,
  RotateCcw,
  Loader2,
  Plus,
  FileText,
} from "lucide-react";
import { searchContribuyentesAction, deleteContribuyenteAction } from "@/actions/registro-solicitud";
import RegistroSolicitudEditModal from "./registro-solicitud-edit-modal";
import ConfirmDialog from "@/components/confirm-dialog";
import SolicitudesListModal from "./solicitudes-list-modal";

interface ContribuyenteRow {
  codigo: string;
  numDoc: string;
  nombres: string;
  paterno: string;
  materno: string;
  tipoDocumento: string;
  distrito: string;
  direccionFiscal: string;
  tipoDetalle: string;
  gestion: string;
  estado: string;
  codPred?: string;
  anexo?: string;
  subAnexo?: string;
  placa?: string;
}

function StatusBadge({ estado }: { estado: string }) {
  const isActive = estado === "ACTIVADO";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40"
          : "bg-red-50 text-red-700 ring-1 ring-red-300/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-400"
        }`}
      />
      {isActive ? "ACTIVADO" : "DESACTIVADO"}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" data-testid="loading-spinner">
      <div className="animate-pulse">
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2.5">
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-3/4" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`px-3 py-3 border-b border-slate-100 ${
              i === 4 ? "border-b-0" : ""
            }`}
          >
            <div className="grid grid-cols-7 gap-4">
              {[...Array(7)].map((_, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-slate-100 rounded"
                  style={{ width: j === 0 ? "60%" : j === 3 ? "40%" : "80%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegistroSolicitudPage() {
  const [filters, setFilters] = useState({
    tipo_busqueda: "C",
    codigo: "",
    nombres: "",
    paterno: "",
    materno: "",
    num_doc: "",
    razon: "",
    cod_pred: "",
    placa: "",
    anno: new Date().getFullYear().toString(),
    cod_via: "",
    urbbus: "",
    nro: "",
    dpto: "",
    mza: "",
    lte: "",
    sublote: "",
  });

  const [data, setData] = useState<ContribuyenteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmNombre, setDeleteConfirmNombre] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCodigo, setEditCodigo] = useState<string | null>(null);

  const [solicitudesModalOpen, setSolicitudesModalOpen] = useState(false);
  const [solicitudesCodigo, setSolicitudesCodigo] = useState('');
  const [solicitudesNombre, setSolicitudesNombre] = useState('');

  const openSolicitudesModal = (codigo: string, nombre: string) => {
    setSolicitudesCodigo(codigo);
    setSolicitudesNombre(nombre);
    setSolicitudesModalOpen(true);
  };

  const openEditModal = (codigo: string | null) => {
    setEditCodigo(codigo);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditCodigo(null);
  };

  const handleSaved = () => {
    executeSearch(page);
  };

  const promptDelete = (codigo: string, nombres: string) => {
    setDeleteConfirmId(codigo);
    setDeleteConfirmNombre(nombres);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmNombre("");
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;

    setDeleting(id);
    const res = await deleteContribuyenteAction(id, "BAJA VOLUNTARIA");
    setDeleting(null);
    cancelDelete();

    if (res.success) {
      executeSearch(page);
    } else {
      alert(`Error al eliminar: ${res.error}`);
    }
  };

  const executeSearch = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const activeFilters: Record<string, any> = {};
        Object.entries(filters).forEach(([key, value]) => {
          if (value) activeFilters[key] = value;
        });

        const result = await searchContribuyentesAction(activeFilters, pageNum, pageSize);
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        } else {
          setError(result.error);
          setData([]);
        }
      } catch {
        setError("Error de conexión");
        setData([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filters, pageSize],
  );

  useEffect(() => {
    executeSearch(1);
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => {
      if (field === "tipo_busqueda") {
        return {
          tipo_busqueda: value,
          codigo: "",
          nombres: "",
          paterno: "",
          materno: "",
          num_doc: "",
          razon: "",
          cod_pred: "",
          placa: "",
          anno: new Date().getFullYear().toString(),
          cod_via: "",
          urbbus: "",
          nro: "",
          dpto: "",
          mza: "",
          lte: "",
          sublote: "",
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSearch = () => {
    setPage(1);
    executeSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    executeSearch(newPage);
  };

  const renderSearchForm = () => {
    const searchType = filters.tipo_busqueda;
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 1992; y <= currentYear; y++) {
      years.push(y);
    }

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Filtros de búsqueda
          </span>
        </div>
        <div className="p-3">
          {/* Criterios Radio Buttons */}
          <div className="mb-3 border-b border-slate-100 pb-2.5">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Criterios:
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="C"
                  checked={searchType === "C" || searchType === ""}
                  onChange={() => handleFilterChange("tipo_busqueda", "C")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Código</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="N"
                  checked={searchType === "N"}
                  onChange={() => handleFilterChange("tipo_busqueda", "N")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Nombres</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="R"
                  checked={searchType === "R"}
                  onChange={() => handleFilterChange("tipo_busqueda", "R")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Razón Social</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="D"
                  checked={searchType === "D"}
                  onChange={() => handleFilterChange("tipo_busqueda", "D")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Documento</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="P"
                  checked={searchType === "P"}
                  onChange={() => handleFilterChange("tipo_busqueda", "P")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Dirección Predio</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="radio"
                  name="tipo_busqueda"
                  value="V"
                  checked={searchType === "V"}
                  onChange={() => handleFilterChange("tipo_busqueda", "V")}
                  className="h-3.5 w-3.5 border-slate-300 text-sat-cyan focus:ring-sat-cyan/20"
                />
                <span className="text-[11px] font-medium text-slate-600">Placa</span>
              </label>
            </div>
          </div>

          {/* Inputs Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {(searchType === "C" || searchType === "") && (
              <div className="md:col-span-4">
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Código</label>
                <input type="text" placeholder="Código"
                  value={filters.codigo}
                  onChange={(e) => handleFilterChange("codigo", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {searchType === "N" && (
              <>
                <div className="md:col-span-3">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Nombres</label>
                  <input type="text" placeholder="Nombres"
                    value={filters.nombres}
                    onChange={(e) => handleFilterChange("nombres", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Paterno</label>
                  <input type="text" placeholder="Ap. Paterno"
                    value={filters.paterno}
                    onChange={(e) => handleFilterChange("paterno", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Materno</label>
                  <input type="text" placeholder="Ap. Materno"
                    value={filters.materno}
                    onChange={(e) => handleFilterChange("materno", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                  />
                </div>
              </>
            )}

            {searchType === "R" && (
              <div className="md:col-span-4">
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Razón Social</label>
                <input type="text" placeholder="Razón Social"
                  value={filters.razon}
                  onChange={(e) => handleFilterChange("razon", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {searchType === "D" && (
              <div className="md:col-span-4">
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Documento</label>
                <input type="text" placeholder="N° Documento"
                  value={filters.num_doc}
                  onChange={(e) => handleFilterChange("num_doc", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {searchType === "V" && (
              <div className="md:col-span-4">
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Placa</label>
                <input type="text" placeholder="N° Placa"
                  value={filters.placa}
                  onChange={(e) => handleFilterChange("placa", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none"
                />
              </div>
            )}

            {searchType === "P" && (
              <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-9 gap-2">
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Cod. Pred</label>
                  <input type="text" placeholder="Cód. Pred"
                    value={filters.cod_pred}
                    onChange={(e) => handleFilterChange("cod_pred", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Año</label>
                  <select
                    value={filters.anno}
                    onChange={(e) => handleFilterChange("anno", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Vía</label>
                  <input type="text" placeholder="Nombre Vía"
                    value={filters.cod_via}
                    onChange={(e) => handleFilterChange("cod_via", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Urb.</label>
                  <input type="text" placeholder="Urb"
                    value={filters.urbbus}
                    onChange={(e) => handleFilterChange("urbbus", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Nro</label>
                  <input type="text" placeholder="Nro"
                    value={filters.nro}
                    onChange={(e) => handleFilterChange("nro", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Dpto</label>
                  <input type="text" placeholder="Dpto"
                    value={filters.dpto}
                    onChange={(e) => handleFilterChange("dpto", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">M/L/S</label>
                  <div className="flex gap-1">
                    <input type="text" placeholder="M" title="Manzana"
                      value={filters.mza}
                      onChange={(e) => handleFilterChange("mza", e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-md border border-slate-300 bg-white px-1 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20 text-center"
                    />
                    <input type="text" placeholder="L" title="Lote"
                      value={filters.lte}
                      onChange={(e) => handleFilterChange("lte", e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-md border border-slate-300 bg-white px-1 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20 text-center"
                    />
                    <input type="text" placeholder="S" title="Sublote"
                      value={filters.sublote}
                      onChange={(e) => handleFilterChange("sublote", e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-md border border-slate-300 bg-white px-1 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sat-cyan/20 text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 ${searchType === 'P' ? 'md:col-span-12 md:justify-end' : 'md:col-span-2'}`}>
              <button type="button" onClick={handleSearch}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
              >
                <Search size={12} />
                Buscar
              </button>
              <span className="text-[9px] text-slate-400 leading-none">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[8px] text-slate-500">↵</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResultsBar = () => (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Users size={13} className="text-slate-400" />
      <span>
        Se encontraron{" "}
        <span className="font-semibold text-slate-700">{total}</span>{" "}
        {total === 1 ? "contribuyente" : "contribuyentes"}
      </span>
    </div>
  );

  const renderTableHeader = () => {
    const searchType = filters.tipo_busqueda;
    if (searchType === "P") {
      return (
        <colgroup>
          <col className="w-[4%]" />
          <col className="w-[10%]" />
          <col className="w-[25%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[19%]" />
          <col className="w-[10%]" />
        </colgroup>
      );
    }
    if (searchType === "V") {
      return (
        <colgroup>
          <col className="w-[4%]" />
          <col className="w-[10%]" />
          <col className="w-[30%]" />
          <col className="w-[12%]" />
          <col className="w-[24%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
      );
    }
    return (
      <colgroup>
        <col className="w-[4%]" />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[25%]" />
        <col className="w-[12%]" />
        <col className="w-[15%]" />
        <col className="w-[10%]" />
      </colgroup>
    );
  };

  const renderGridHeaderRow = () => {
    const searchType = filters.tipo_busqueda;
    if (searchType === "P") {
      return (
        <tr>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">#</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nombre</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código Pred.</th>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Anexo</th>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Sub. Anex.</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Dirección</th>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acciones</th>
        </tr>
      );
    }
    if (searchType === "V") {
      return (
        <tr>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">#</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nombres</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nro. Doc.</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Dirección</th>
          <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Placa</th>
          <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acciones</th>
        </tr>
      );
    }
    return (
      <tr>
        <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-2 py-2.5 border-b border-white/5">#</th>
        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Código</th>
        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">T. Contrib</th>
        <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Tipo/Gestor</th>
        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nombres</th>
        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Nro. Documento</th>
        <th className="text-left text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Dirección</th>
        <th className="text-center text-[11px] font-semibold text-white/90 uppercase px-3 py-2.5 border-b border-white/5">Acciones</th>
      </tr>
    );
  };

  const renderGrid = () => (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <table className="w-full table-fixed border-collapse" data-testid="contribuyentes-grid" role="grid">
        {renderTableHeader()}
        <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
          {renderGridHeaderRow()}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => {
            const searchType = filters.tipo_busqueda;
            if (searchType === "P") {
              return (
                <tr key={`${row.codigo}-${row.codPred}-${idx}`} className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500 font-mono">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">{row.codigo}</td>
                  <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">{row.nombres}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.codPred}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-600 truncate">{row.anexo}</td>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-600 truncate">{row.subAnexo}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.direccionFiscal}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <StatusBadge estado={row.estado} />
                      <button type="button" onClick={() => openEditModal(row.codigo)}
                        className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan ml-1"
                        aria-label="Editar" title="Editar contribuyente"
                      >
                        <Pencil size={13} />
                      </button>
                      <button type="button"
                        onClick={() => openSolicitudesModal(row.codigo, `${row.paterno} ${row.materno} ${row.nombres}`)}
                        className="rounded p-1 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                        aria-label="Solicitudes" title="Ver solicitudes"
                      >
                        <FileText size={13} />
                      </button>
                      {/*
                      <button type="button" onClick={() => promptDelete(row.codigo, row.nombres)}
                        disabled={deleting === row.codigo}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Eliminar" title="Eliminar contribuyente"
                      >
                        {deleting === row.codigo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                      */}
                    </div>
                  </td>
                </tr>
              );
            }
            if (searchType === "V") {
              return (
                <tr key={`${row.codigo}-${row.placa}-${idx}`} className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                  <td className="px-2 py-1.5 text-[11px] text-center text-slate-500 font-mono">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">{row.codigo}</td>
                  <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">{row.nombres}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.numDoc}</td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.direccionFiscal}</td>
                  <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">{row.placa}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <StatusBadge estado={row.estado} />
                      <button type="button" onClick={() => openEditModal(row.codigo)}
                        className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan ml-1"
                        aria-label="Editar" title="Editar contribuyente"
                      >
                        <Pencil size={13} />
                      </button>
                      <button type="button"
                        onClick={() => openSolicitudesModal(row.codigo, row.nombres)}
                        className="rounded p-1 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                        aria-label="Solicitudes" title="Ver solicitudes"
                      >
                        <FileText size={13} />
                      </button>
                      {/*
                      <button type="button" onClick={() => promptDelete(row.codigo, row.nombres)}
                        disabled={deleting === row.codigo}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Eliminar" title="Eliminar contribuyente"
                      >
                        {deleting === row.codigo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                      */}
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.codigo} className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                <td className="px-2 py-1.5 text-[11px] text-center text-slate-500 font-mono">{(page - 1) * pageSize + idx + 1}</td>
                <td className="px-2 py-1.5 text-[11px] font-mono text-slate-600 truncate">{row.codigo}</td>
                <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.tipoDetalle}</td>
                <td className="px-2 py-1.5 text-[11px] text-center text-slate-600 truncate">{row.gestion}</td>
                <td className="px-2 py-1.5 text-[11px] font-medium text-slate-800 truncate">
                  {row.paterno} {row.materno} {row.nombres}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.numDoc}</td>
                <td className="px-2 py-1.5 text-[11px] text-slate-600 truncate">{row.direccionFiscal}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <StatusBadge estado={row.estado} />
                    <button type="button" onClick={() => openEditModal(row.codigo)}
                      className="rounded p-1 text-slate-400 transition hover:bg-sat-cyan/10 hover:text-sat-cyan ml-1"
                      aria-label="Editar" title="Editar contribuyente"
                    >
                      <Pencil size={13} />
                    </button>
                    <button type="button"
                      onClick={() => openSolicitudesModal(row.codigo, `${row.paterno} ${row.materno} ${row.nombres}`)}
                      className="rounded p-1 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                      aria-label="Solicitudes" title="Ver solicitudes"
                    >
                      <FileText size={13} />
                    </button>
                    {/*
                    <button type="button" onClick={() => promptDelete(row.codigo, `${row.paterno} ${row.materno} ${row.nombres}`)}
                      disabled={deleting === row.codigo}
                      className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Eliminar" title="Eliminar contribuyente"
                    >
                      {deleting === row.codigo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                    */}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages: number[] = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-xs text-slate-500">
          Mostrando <span className="font-semibold text-slate-700">{from}</span>
          {" – "}
          <span className="font-semibold text-slate-700">{to}</span> de{" "}
          <span className="font-semibold text-slate-700">{total}</span> resultados
        </span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeft size={13} /> Anterior
          </button>
          {pages.map((p) => (
            <button key={p} type="button" onClick={() => handlePageChange(p)}
              className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                p === page
                  ? "bg-sat-cyan text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
          <button type="button" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Siguiente"
          >
            Siguiente <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <UserX size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">No se encontraron contribuyentes</p>
      <p className="mt-1 text-xs text-slate-400">Intente ajustar los filtros de búsqueda</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16 animate-fade-in">
      <div className="mb-3 rounded-full bg-red-100 p-3">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-600">{error}</p>
      <button type="button" onClick={handleSearch}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/40"
      >
        <RotateCcw size={13} /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <Users size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Registro de Solicitud y DD-JJ</h1>
            <p className="text-xs text-white/50 font-inter">Administración de contribuyentes</p>
          </div>
        </div>
      </div>

      {renderSearchForm()}

      {!loading && !error && !initialLoading && data.length > 0 && (
        <div className="flex items-center justify-between">
          {renderResultsBar()}
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 active:scale-[0.98]"
            >
              <RotateCcw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
            </button>
            <button type="button" onClick={() => openEditModal(null)}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <Plus size={14} /> Nuevo Contribuyente
            </button>
          </div>
        </div>
      )}

      {loading && initialLoading && <TableSkeleton />}

      {loading && !initialLoading && (
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sat-cyan border-t-transparent" />
              <span className="text-xs font-medium text-slate-500">Buscando...</span>
            </div>
          </div>
          {renderGrid()}
          {renderPagination()}
        </div>
      )}

      {!loading && error && renderErrorState()}

      {!loading && !error && data.length === 0 && !initialLoading && renderEmptyState()}

      {!loading && !error && data.length > 0 && (
        <>
          {renderGrid()}
          {renderPagination()}
        </>
      )}



      <RegistroSolicitudEditModal
        isOpen={editModalOpen}
        codigo={editCodigo}
        onClose={closeEditModal}
        onSaved={handleSaved}
      />

      <SolicitudesListModal
        isOpen={solicitudesModalOpen}
        onClose={() => setSolicitudesModalOpen(false)}
        codigo={solicitudesCodigo}
        nombreContribuyente={solicitudesNombre}
      />

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Eliminar Contribuyente"
        message={`¿Está seguro de eliminar el contribuyente "${deleteConfirmNombre}" (${deleteConfirmId})?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="No"
        loading={deleting !== null}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
