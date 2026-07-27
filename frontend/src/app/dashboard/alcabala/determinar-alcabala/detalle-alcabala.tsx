"use client";

import { useEffect, useState } from "react";
import { X, FileText, Loader2 } from "lucide-react";
import {
  getDetalleAlcabalaAction,
  type DetalleAlcabalaItem,
} from "@/actions/alcabala/determinar-alcabala";

// ── Types ──────────────────────────────────────────────────

interface DetalleAlcabalaProps {
  open: boolean;
  onClose: () => void;
  idAlcabala: number | null;
}

// ── Style tokens ───────────────────────────────────────────

const sectionTitle =
  "text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3";

const fieldLabel =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

const fieldValue =
  "text-[11px] font-medium text-slate-700 bg-slate-50 rounded px-2 py-1 border border-slate-200 min-h-[26px] flex items-center break-words";

const fieldValueMono = `${fieldValue} font-mono text-[10px]`;

// ── Field Component ────────────────────────────────────────

function Field({
  label,
  value,
  mono = false,
  span = 1,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <span className={fieldLabel}>{label}</span>
      <div className={mono ? fieldValueMono : fieldValue}>
        {value || "—"}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <span className={fieldLabel}>{label}</span>
      <div className={`${fieldValueMono} text-emerald-700`}>
        S/ {value.toFixed(2)}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export default function DetalleAlcabala({
  open,
  onClose,
  idAlcabala,
}: DetalleAlcabalaProps) {
  const [data, setData] = useState<DetalleAlcabalaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !idAlcabala) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDetalleAlcabalaAction(idAlcabala).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Error al cargar detalle");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, idAlcabala]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !idAlcabala) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-cyan/10">
              <FileText size={14} className="text-sat-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Detalle de Alcabala
              </h2>
              <p className="text-[10px] text-slate-400">
                ID {idAlcabala}
              </p>
            </div>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-sat-cyan" />
              <span className="ml-2 text-xs text-slate-500">Cargando detalle...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-5">
              {/* ── Comprador ── */}
              <div>
                <h3 className={sectionTitle}>Comprador</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Código Compra" value={data.codigoCompra} mono span={1} />
                  <Field label="Nombres" value={data.nombres} span={2} />
                  <Field label="Documento" value={data.documento} />
                  <Field label="N° Doc" value={data.numDoc} mono />
                  <Field label="Año" value={data.anio} />
                  <Field label="Dirección Fiscal" value={data.direccFiscal} span={2} />
                  <Field label="Distrito" value={data.distrito} />
                  <Field label="Provincia" value={data.provincia} />
                  <Field label="Departamento" value={data.departamento} />
                </div>
              </div>

              {/* ── Vendedor ── */}
              <div>
                <h3 className={sectionTitle}>Vendedor</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Código Venta" value={data.codigoVenta} mono span={1} />
                  <Field label="Nombres" value={data.nombres1} span={2} />
                  <Field label="Documento" value={data.documento1} />
                  <Field label="N° Doc" value={data.numDoc1} mono />
                  <Field label="Dirección Fiscal" value={data.direccFiscal1} span={2} />
                  <Field label="Distrito" value={data.distrito1} />
                  <Field label="Provincia" value={data.provincia1} />
                  <Field label="Departamento" value={data.departamento1} />
                </div>
              </div>

              {/* ── Predio ── */}
              <div>
                <h3 className={sectionTitle}>Predio</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Código Predio" value={data.codPred} mono />
                  <Field label="Año Predio" value={data.anioPred} />
                  <Field label="Tipo Predio" value={data.tipoPred} />
                  <Field label="Dirección Predio" value={data.direccionPredio} span={2} />
                  <Field label="Anexo" value={data.anexo} />
                  <Field label="Sub Anexo" value={data.subAnexo} />
                </div>
              </div>

              {/* ── Operación ── */}
              <div>
                <h3 className={sectionTitle}>Operación</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Fecha Contrato" value={data.fechaContrato} />
                  <Field label="Contrato" value={data.contrato} />
                  <Field label="Transferencia" value={data.transferencia} />
                  <MoneyField label="Monto Alcabala" value={data.montoAlcabala} />
                  <MoneyField label="Autoavaluo" value={data.autoavaluo} />
                  <Field label="Observación" value={data.observacion} span={2} />
                </div>
              </div>

              {/* ── Montos ── */}
              <div>
                <h3 className={sectionTitle}>Montos</h3>
                <div className="grid grid-cols-3 gap-3">
                  <MoneyField label="Monto Inafecto" value={data.montoInafecto} />
                  <MoneyField label="Monto Afecto" value={data.montoAfecto} />
                  <Field label="Flag Inafecto" value={data.flagInafecto} />
                  <Field label="Flag Check" value={data.flagCheck} />
                  <Field label="Observación Flag" value={data.observacionFlag} span={2} />
                </div>
              </div>

              {/* ── Registro ── */}
              <div>
                <h3 className={sectionTitle}>Registro</h3>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Nombre" value={data.nombre} />
                  <Field label="Dirección" value={data.direccion} span={2} />
                  <Field label="DNI" value={data.dni} mono />
                  <Field label="Tipo Doc" value={data.tipodoc} />
                  <Field label="Usuario" value={data.usuario} />
                  <Field label="Estación" value={data.estacion} />
                  <Field label="Fecha Ingreso" value={data.fechaIng} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
