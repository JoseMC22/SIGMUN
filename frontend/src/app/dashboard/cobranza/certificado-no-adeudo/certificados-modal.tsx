"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  X,
} from "lucide-react";
import {
  getCertificadosAction,
  type CertificadoRow,
  type ContribuyenteRow,
} from "@/actions/cobranza/certificado-no-adeudo";
import CertificadoFormModal, {
  type CertificadoFormTarget,
} from "./certificado-form-modal";

interface Props {
  contribuyente: ContribuyenteRow;
  onClose: () => void;
}

/** ISO `YYYY-MM-DD` a `dd/mm/yyyy` sin construir una Date (evita el corrimiento de zona horaria). */
function formatearFecha(iso: string): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

function nombreContribuyente(row: ContribuyenteRow): string {
  return [row.paterno, row.materno, row.nombres].filter(Boolean).join(" ").trim();
}

function GridSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-md border border-slate-200"
      data-testid="certificado-certificados-loading"
    >
      <div className="bg-slate-100 px-3 py-2">
        <div className="h-3 w-32 rounded bg-slate-200" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex gap-3 border-t border-slate-100 px-3 py-2"
        >
          {[...Array(6)].map((_, j) => (
            <div key={j} className="h-3 flex-1 rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CertificadosModal({ contribuyente, onClose }: Props) {
  const [certificados, setCertificados] = useState<CertificadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<{
    certificado?: CertificadoFormTarget;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getCertificadosAction(contribuyente.codigo);
    if (result.success) {
      setCertificados(result.data ?? []);
    } else {
      setCertificados([]);
      setError(result.error ?? "Error al consultar los certificados");
    }
    setLoading(false);
  }, [contribuyente.codigo]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleSaved = () => {
    setForm(null);
    setNotice("Operación realizada correctamente");
    void load();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Certificados del contribuyente"
    >
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl animate-fade-in">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Certificados de no adeudo
            </h2>
            <p className="text-[11px] text-slate-500">
              {contribuyente.codigo} — {nombreContribuyente(contribuyente)}
            </p>
            <p className="text-[10px] text-slate-400">
              Doc. {contribuyente.numDoc} · {contribuyente.direccion}
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

        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setError(null);
              setForm({});
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40"
          >
            <Plus size={12} />
            Nuevo certificado
          </button>
          <span className="text-[11px] text-slate-500">
            {certificados.length}{" "}
            {certificados.length === 1 ? "certificado" : "certificados"}
          </span>
        </div>

        {notice && (
          <div className="mx-4 mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <GridSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12 animate-fade-in">
              <div className="mb-2 rounded-full bg-red-100 p-2.5">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <p className="text-[12px] font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-700"
              >
                <RotateCcw size={12} />
                Reintentar
              </button>
            </div>
          ) : certificados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-12 animate-fade-in">
              <div className="mb-2 rounded-full bg-slate-100 p-2.5">
                <SearchX size={20} className="text-slate-300" />
              </div>
              <p className="text-[12px] font-medium text-slate-500">
                El contribuyente no tiene certificados registrados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table
                className="w-full min-w-[980px] border-collapse"
                data-testid="certificado-certificados-grid"
              >
                <thead className="bg-gradient-to-r from-sat-navy to-[#1e3050]">
                  <tr>
                    {[
                      "Código",
                      "Certificado",
                      "Año",
                      "Tipo Deuda",
                      "Tipo Periodo",
                      "Observación",
                      "Fecha Impresión",
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap border-b border-white/5 px-2 py-2 text-left text-[9px] font-semibold uppercase text-white/90"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left text-[9px] font-semibold uppercase text-white/90">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificados.map((row, idx) => (
                    <tr
                      key={`${row.idTbl}-${row.certNro}-${row.certAnio}-${idx}`}
                      className={`transition hover:bg-slate-50 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.codigo}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.numCertif}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.certAnio}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.tipoDeudaDescripcion}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.tipoPeriodoDescripcion}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-slate-600">
                        {row.observacion}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 text-[10px] text-slate-600">
                        {formatearFecha(row.fechaImpresion)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setError(null);
                            setForm({
                              certificado: {
                                certNro: row.certNro,
                                certAnio: row.certAnio,
                                idTbl: row.idTbl,
                              },
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                          title="Editar Certificado"
                          aria-label="Editar Certificado"
                        >
                          <Pencil size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form && (
        <CertificadoFormModal
          contribuyente={contribuyente}
          certificado={form.certificado}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
