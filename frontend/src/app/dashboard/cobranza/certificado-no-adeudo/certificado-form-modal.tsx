"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import {
  generarCertificadoAction,
  getAniosDeudaAction,
  getContribuyenteAction,
  getDetalleCertificadoAction,
  getPrediosAction,
  getTiposDeudaAction,
  getTiposPeriodoAction,
  type ContribuyenteHeader,
  type ContribuyenteRow,
  type DetalleCertificadoItem,
  type DetalleRow,
  type TipoDeudaRow,
  type TipoPeriodoRow,
} from "@/actions/cobranza/certificado-no-adeudo";

export interface CertificadoFormTarget {
  certNro: string;
  certAnio: string;
  idTbl: string;
}

interface Props {
  contribuyente: ContribuyenteRow;
  certificado?: CertificadoFormTarget;
  onClose: () => void;
  onSaved: () => void;
}

const TIPO_DEUDA_VEHICULO = "00.30";

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none";
const labelCls =
  "block text-[9px] font-semibold uppercase tracking-wider mb-0.5 leading-none text-slate-400";

function nombreContribuyente(row: ContribuyenteRow): string {
  return [row.paterno, row.materno, row.nombres].filter(Boolean).join(" ").trim();
}

function claveFila(row: DetalleRow): string {
  return [row.codigo, row.anio, row.codPred, row.anexo, row.subAnexo].join("|");
}

export default function CertificadoFormModal({
  contribuyente,
  certificado,
  onClose,
  onSaved,
}: Props) {
  const esEdicion = Boolean(certificado);

  const [header, setHeader] = useState<ContribuyenteHeader | null>(null);
  const [tiposDeuda, setTiposDeuda] = useState<TipoDeudaRow[]>([]);
  const [tiposPeriodo, setTiposPeriodo] = useState<TipoPeriodoRow[]>([]);
  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([]);

  const [tipoDeuda, setTipoDeuda] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [aniosDeuda, setAniosDeuda] = useState("");

  const [detalles, setDetalles] = useState<DetalleRow[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [detallesCargadosPara, setDetallesCargadosPara] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(esEdicion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esVehiculo = tipoDeuda === TIPO_DEUDA_VEHICULO;
  const restantes = 100 - observacion.length;

  const certNro = certificado?.certNro;
  const certAnio = certificado?.certAnio;
  const certIdTbl = certificado?.idTbl;

  // La grilla de predios esta cargando mientras la consulta en curso no
  // corresponde a la ultima combinacion de tipo de deuda y anio.
  const claveConsulta =
    tipoDeuda && aniosDeuda ? `${tipoDeuda}|${aniosDeuda}` : null;
  const prediosLoading =
    claveConsulta !== null && claveConsulta !== detallesCargadosPara;

  // Cabecera del contribuyente y catalogos del formulario.
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const [contribuyenteRes, deudaRes, periodoRes, aniosRes] =
        await Promise.all([
          getContribuyenteAction(contribuyente.codigo),
          getTiposDeudaAction(),
          getTiposPeriodoAction(),
          getAniosDeudaAction(),
        ]);
      if (cancel) return;
      if (contribuyenteRes.success && contribuyenteRes.data) {
        setHeader(contribuyenteRes.data);
      }
      if (deudaRes.success) setTiposDeuda(deudaRes.data ?? []);
      if (periodoRes.success) setTiposPeriodo(periodoRes.data ?? []);
      if (aniosRes.success) setAniosDisponibles(aniosRes.data ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, [contribuyente.codigo]);

  // Detalle del certificado en edicion: preselecciona los datos del formulario.
  useEffect(() => {
    if (!certNro || !certAnio) return;
    let cancel = false;
    void (async () => {
      const result = await getDetalleCertificadoAction(certNro, certAnio);
      if (cancel) return;
      if (!result.success || !result.data) {
        setError(result.error ?? "No se encontró el certificado");
        setLoading(false);
        return;
      }
      const detalle = result.data;
      setTipoDeuda(detalle.tipoDeuda);
      setTipoPeriodo(String(detalle.tipoPeriodo));
      setObservacion(detalle.observacion);
      setAniosDeuda(detalle.anioDeuda);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [certNro, certAnio]);

  // Predios o vehiculos del contribuyente para el tipo de deuda y anio elegidos.
  useEffect(() => {
    if (!tipoDeuda || !aniosDeuda) return;
    const clave = `${tipoDeuda}|${aniosDeuda}`;
    let cancel = false;
    void (async () => {
      const result = await getPrediosAction({
        codigo: contribuyente.codigo,
        anio: aniosDeuda,
        tipoDeuda,
        ...(certIdTbl ? { idTbl: certIdTbl } : {}),
      });
      if (cancel) return;
      if (result.success) {
        const filas = result.data ?? [];
        setDetalles(filas);
        // Las filas que el backend marco como incluidas arrancan seleccionadas.
        setSeleccion(
          new Set(
            filas
              .filter((row) => row.chekeado === "1")
              .map((row) => claveFila(row)),
          ),
        );
      } else {
        setDetalles([]);
        setSeleccion(new Set());
        setError(result.error ?? "Error al consultar los predios");
      }
      setDetallesCargadosPara(clave);
    })();
    return () => {
      cancel = true;
    };
  }, [tipoDeuda, aniosDeuda, contribuyente.codigo, certIdTbl]);

  const detallesSeleccionados = useMemo<DetalleCertificadoItem[]>(
    () =>
      detalles
        .filter((row) => seleccion.has(claveFila(row)))
        .map((row) => ({
          codigo: row.codigo,
          anio: row.anio,
          codPred: row.codPred,
          anexo: row.anexo,
          subAnexo: row.subAnexo,
        })),
    [detalles, seleccion],
  );

  const toggleFila = (row: DetalleRow) => {
    const clave = claveFila(row);
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const limpiarDetalles = () => {
    setDetalles([]);
    setSeleccion(new Set());
  };

  const handleTipoDeudaChange = (valor: string) => {
    setTipoDeuda(valor);
    limpiarDetalles();
  };

  const handleAniosDeudaChange = (valor: string) => {
    setAniosDeuda(valor);
    limpiarDetalles();
  };

  const handleGenerar = async () => {
    setError(null);
    if (!tipoDeuda) {
      setError("Seleccione el tipo de deuda");
      return;
    }
    if (!tipoPeriodo) {
      setError("Seleccione el periodo");
      return;
    }
    if (!observacion.trim()) {
      setError("Ingrese la observación");
      return;
    }
    if (!aniosDeuda) {
      setError("Seleccione el año de deuda");
      return;
    }

    setSaving(true);
    const result = await generarCertificadoAction({
      codigo: contribuyente.codigo,
      tipoDeuda,
      tipoPeriodo: Number(tipoPeriodo),
      observacion: observacion.trim(),
      aniosDeuda,
      detalles: detallesSeleccionados,
      ...(certificado
        ? {
            certNro: Number(certificado.certNro),
            certAnio: certificado.certAnio,
          }
        : {}),
    });
    setSaving(false);

    if (result.code === "DEUDA") {
      const importe =
        result.montoDeuda !== undefined
          ? ` Importe pendiente: ${result.montoDeuda.toFixed(2)}`
          : "";
      setError(
        `${result.message ?? "El contribuyente tiene deuda pendiente"}${importe}`,
      );
      return;
    }
    if (result.success) {
      onSaved();
      return;
    }
    setError(result.error ?? "No se pudo registrar el certificado");
  };

  const datosContribuyente = {
    codigo: header?.codigo ?? contribuyente.codigo,
    documento: header?.numDoc ?? contribuyente.numDoc,
    nombre: header?.nombres ?? nombreContribuyente(contribuyente),
    direccion: header?.direccion ?? contribuyente.direccion,
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={
        esEdicion ? "Editar certificado de no adeudo" : "Nuevo certificado de no adeudo"
      }
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl animate-fade-in">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {esEdicion
                ? "Editar certificado de no adeudo"
                : "Nuevo certificado de no adeudo"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {contribuyente.codigo} — {nombreContribuyente(contribuyente)}
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

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Datos del contribuyente
                </legend>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label htmlFor="certCodigo" className={labelCls}>
                      Código
                    </label>
                    <input
                      id="certCodigo"
                      readOnly
                      value={datosContribuyente.codigo}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                  <div>
                    <label htmlFor="certDocumento" className={labelCls}>
                      Documento
                    </label>
                    <input
                      id="certDocumento"
                      readOnly
                      value={datosContribuyente.documento}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="certContribuyente" className={labelCls}>
                      Contribuyente
                    </label>
                    <input
                      id="certContribuyente"
                      readOnly
                      value={datosContribuyente.nombre}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label htmlFor="certDireccion" className={labelCls}>
                      Dirección
                    </label>
                    <input
                      id="certDireccion"
                      readOnly
                      value={datosContribuyente.direccion}
                      className={`${inputCls} bg-slate-50`}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Datos del certificado
                </legend>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label htmlFor="certTipoDeuda" className={labelCls}>
                      Tipo de deuda
                    </label>
                    <select
                      id="certTipoDeuda"
                      value={tipoDeuda}
                      onChange={(e) => handleTipoDeudaChange(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione</option>
                      {tiposDeuda.map((tipo) => (
                        <option key={tipo.tipo} value={tipo.tipo}>
                          {tipo.detalle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="certPeriodo" className={labelCls}>
                      Periodo
                    </label>
                    <select
                      id="certPeriodo"
                      value={tipoPeriodo}
                      onChange={(e) => setTipoPeriodo(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione</option>
                      {tiposPeriodo.map((periodo) => (
                        <option key={periodo.idTbl} value={String(periodo.idTbl)}>
                          {periodo.detalle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="certObservacion" className={labelCls}>
                      Observaciones
                    </label>
                    <textarea
                      id="certObservacion"
                      rows={2}
                      maxLength={100}
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      className={inputCls}
                      placeholder="Detalle del certificado"
                    />
                    <p className="mt-0.5 text-right text-[9px] text-slate-400">
                      {restantes} caracteres restantes
                    </p>
                  </div>
                  <div>
                    <label htmlFor="certAnioDeuda" className={labelCls}>
                      Año de deuda
                    </label>
                    <select
                      id="certAnioDeuda"
                      value={aniosDeuda}
                      onChange={(e) => handleAniosDeudaChange(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccione</option>
                      {aniosDisponibles.map((anio) => (
                        <option key={anio} value={anio}>
                          {anio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {esVehiculo ? "Vehículos" : "Predios"}
                </legend>

                {!tipoDeuda || !aniosDeuda ? (
                  <p className="py-4 text-center text-[11px] text-slate-400">
                    Seleccione tipo de deuda y anio para ver predios
                  </p>
                ) : prediosLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : detalles.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400">
                    No se encontraron {esVehiculo ? "vehículos" : "predios"} para
                    el año seleccionado.
                  </p>
                ) : (
                  <div className="overflow-auto rounded border border-slate-200">
                    <table
                      className="w-full min-w-[520px] border-collapse"
                      data-testid="certificado-detalles-grid"
                    >
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="w-8 px-2 py-1.5" />
                          {esVehiculo ? (
                            <>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Veh. Placa
                              </th>
                              <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Categoría | Marca | Modelo
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Código Predio
                              </th>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Anexo
                              </th>
                              <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Dirección Predio
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalles.map((row) => {
                          const clave = claveFila(row);
                          return (
                            <tr key={clave} className="text-[10px] text-slate-600">
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={seleccion.has(clave)}
                                  onChange={() => toggleFila(row)}
                                  aria-label={`Seleccionar ${row.codPred}`}
                                />
                              </td>
                              <td className="px-2 py-1">{row.codPred}</td>
                              {esVehiculo ? (
                                <td className="px-2 py-1">{row.detalles}</td>
                              ) : (
                                <>
                                  <td className="whitespace-nowrap px-2 py-1">
                                    {row.anexos}
                                  </td>
                                  <td className="px-2 py-1">{row.direccion}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Salir
          </button>
          <button
            type="button"
            onClick={() => void handleGenerar()}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            Generar
          </button>
        </div>
      </div>
    </div>
  );
}
