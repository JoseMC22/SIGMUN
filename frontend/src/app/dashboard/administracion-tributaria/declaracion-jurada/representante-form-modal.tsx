"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, User, MapPin } from "lucide-react";
import {
  getTiposDocumentoAction,
  getTiposContribuyenteAction,
  getDistritosAction,
  getTiposInteriorAction,
  getTiposEdificacionAction,
  getTiposIngresoAction,
  getTiposAgrupamientoAction,
  buscarContribuyentePorDocAction,
  guardarRepresentanteAction,
  obtenerRepresentantePorIdAction,
  type TipoDocumentoOption,
  type TipoContribuyenteOption,
  type DistritoOption,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import ViaBusquedaModal from "./via-busqueda-modal";
import type { MviaItem } from "@/actions/administracion-tributaria/declaracion-jurada";

// ─── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Código del contribuyente principal (va en el payload del SP). */
  codigoContribuyente?: string;
  /** Id del representante a editar (sp_Mrepresentante @busc=6). Si viene,
   *  el modal carga los datos y graba en modo actualización. */
  idRepresentanteInicial?: string;
  /** Callback con el id del representante creado/actualizado. */
  onSaved?: (id: string) => void;
}

interface RepresentanteForm {
  nombreRazon: string;
  paterno: string;
  materno: string;
  documento: string;
  numero: string;
  codigoRepresentante: string;
  tipoRepresentante: string;
  // Domicilio fiscal
  distrito: string;
  zonaCod: string;
  zonaNom: string;
  urbCod: string;
  urbNom: string;
  viaCod: string;
  viaNom: string;
  mz: string;
  lote: string;
  subLote: string;
  numDomicilio: string;
  dpto: string;
  letra1: string;
  numero2: string;
  letra2: string;
  piso: string;
  tipoInterior: string;
  numInterior: string;
  letraInterior: string;
  tipoEdificacion: string;
  nombreEdificacion: string;
  tipoIngreso: string;
  nombreIngreso: string;
  tipoAgrupamiento: string;
  nombreAgrupamiento: string;
  referencia: string;
}

const emptyRepresentante: RepresentanteForm = {
  nombreRazon: "",
  paterno: "",
  materno: "",
  documento: "",
  numero: "",
  codigoRepresentante: "",
  tipoRepresentante: "",
  distrito: "",
  zonaCod: "",
  zonaNom: "",
  urbCod: "",
  urbNom: "",
  viaCod: "",
  viaNom: "",
  mz: "",
  lote: "",
  subLote: "",
  numDomicilio: "",
  dpto: "",
  letra1: "",
  numero2: "",
  letra2: "",
  piso: "",
  tipoInterior: "",
  numInterior: "",
  letraInterior: "",
  tipoEdificacion: "",
  nombreEdificacion: "",
  tipoIngreso: "",
  nombreIngreso: "",
  tipoAgrupamiento: "",
  nombreAgrupamiento: "",
  referencia: "",
};

// ─── FieldGroup ────────────────────────────────────────────

function FieldGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
        {icon}
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

// ─── Component ─────────────────────────────────────────────

export default function RepresentanteFormModal({
  isOpen,
  onClose,
  codigoContribuyente = "",
  idRepresentanteInicial,
  onSaved,
}: Props) {
  const esEdicion = !!idRepresentanteInicial && idRepresentanteInicial.trim().length > 0;

  const [form, setForm] = useState<RepresentanteForm>(emptyRepresentante);

  // ── Combo state ──
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoOption[]>([]);
  const [tiposContri, setTiposContri] = useState<TipoContribuyenteOption[]>([]);
  const [distritos, setDistritos] = useState<DistritoOption[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [edicionLoading, setEdicionLoading] = useState(false);

  // ── Combo Domicilio Fiscal state ──
  const [tiposInterior, setTiposInterior] = useState<{ value: string; label: string }[]>([]);
  const [tiposEdificacion, setTiposEdificacion] = useState<{ value: string; label: string }[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<{ value: string; label: string }[]>([]);
  const [tiposAgrupamiento, setTiposAgrupamiento] = useState<{ value: string; label: string }[]>([]);

  // ── Search/vía/save state ──
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [viaModalOpen, setViaModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [operador, setOperador] = useState("");
  const [estacion, setEstacion] = useState("");

  const onChange = (field: keyof RepresentanteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleViaSelect = (via: MviaItem) => {
    onChange("viaCod", via.codVia);
    onChange("viaNom", via.via);
    onChange("zonaCod", via.idZona);
    onChange("zonaNom", via.zona);
    onChange("urbCod", via.idUrba);
    onChange("urbNom", via.urbanizacion);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  // ── Reset + load combos on open ──
  useEffect(() => {
    if (!isOpen) return;

    setForm(emptyRepresentante);
    setSearchMessage(null);
    setSearchLoading(false);
    setViaModalOpen(false);
    setSaveMessage(null);

    const user = getStoredUser();
    setOperador(user?.username ?? "");
    checkSessionAction().then((s) => {
      setEstacion(s?.hostname ?? "");
    });

    let cancelled = false;
    setCombosLoading(true);

    Promise.all([
      getTiposDocumentoAction(),
      getTiposContribuyenteAction(),
      getDistritosAction(),
      getTiposInteriorAction(),
      getTiposEdificacionAction(),
      getTiposIngresoAction(),
      getTiposAgrupamientoAction(),
    ])
      .then(([docRes, contriRes, distRes, interiorRes, edifRes, ingRes, agrupRes]) => {
        if (cancelled) return;
        if (docRes.success) setTiposDoc(docRes.data);
        if (contriRes.success) setTiposContri(contriRes.data);
        if (distRes.success) setDistritos(distRes.data);
        if (interiorRes.success) setTiposInterior(interiorRes.data);
        if (edifRes.success) setTiposEdificacion(edifRes.data);
        if (ingRes.success) setTiposIngreso(ingRes.data);
        if (agrupRes.success) setTiposAgrupamiento(agrupRes.data);
      })
      .finally(() => {
        if (!cancelled) setCombosLoading(false);
      });

    // ── Modo edición: cargar datos del representante (sp_Mrepresentante @busc=6) ──
    if (esEdicion && idRepresentanteInicial) {
      setEdicionLoading(true);
      obtenerRepresentantePorIdAction(idRepresentanteInicial.trim()).then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setSaveMessage({ type: "error", text: res.error });
          setEdicionLoading(false);
          return;
        }
        const c = res.data;
        setForm({
          nombreRazon: c.nombres,
          paterno: c.paterno,
          materno: c.materno,
          documento: c.idDocu,
          numero: c.numDoc,
          codigoRepresentante: c.codigo,
          tipoRepresentante: c.idTipoRelacion,
          distrito: c.idDist,
          zonaCod: c.idZona,
          zonaNom: c.nomZona,
          urbCod: c.idUrba,
          urbNom: c.nomUrba,
          viaCod: c.idVia,
          viaNom: c.nomVia,
          mz: c.manzana,
          lote: c.lote,
          subLote: c.subLote,
          numDomicilio: c.numero,
          dpto: c.departam,
          letra1: c.letra1,
          numero2: c.numero2,
          letra2: c.letra2,
          piso: c.piso,
          tipoInterior: c.tipoInteriorId,
          numInterior: c.numeroInterno,
          letraInterior: c.letraInterno,
          tipoEdificacion: c.tipoEdificacionId,
          nombreEdificacion: c.nombreEdificio,
          tipoIngreso: c.tipoIngresoId,
          nombreIngreso: c.nombreIngreso,
          tipoAgrupamiento: c.tipoAgrupamientoId,
          nombreAgrupamiento: c.nombreAgrupamiento,
          referencia: c.referencia,
        });
        setEdicionLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, esEdicion, idRepresentanteInicial]);

  const buscarContribuyente = async () => {
    const numero = form.numero.trim();
    if (!numero) {
      setSearchMessage({ type: "error", text: "Ingrese un número de documento." });
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);

    try {
      const res = await buscarContribuyentePorDocAction(numero);
      if (!res.success) {
        setSearchMessage({ type: "error", text: res.error });
        return;
      }
      if (res.data.encontrado) {
        onChange("codigoRepresentante", res.data.codigo);
        onChange("nombreRazon", res.data.nombres.toUpperCase());
        onChange("paterno", res.data.paterno.toUpperCase());
        onChange("materno", res.data.materno.toUpperCase());
        if (res.data.codigo) onChange("numero", res.data.num_doc);
        setSearchMessage({ type: "success", text: "Contribuyente encontrado correctamente." });
      } else {
        setSearchMessage({ type: "error", text: "El Dni no se encuentra registrado en nuestra base de datos." });
      }
    } catch {
      setSearchMessage({ type: "error", text: "Error al consultar el servicio. Intente nuevamente." });
    } finally {
      setSearchLoading(false);
    }
  };

  const grabar = async () => {
    const r = form;
    const esActualizacion = !!r.codigoRepresentante && r.codigoRepresentante.trim().length > 0;
    const motivo = `Acción - ${esActualizacion ? "Actualización" : "Ingreso"} Representante - Operador ${operador} - Estación : ${estacion}`;

    const esICA = r.distrito === "012";
    const cvia = esICA ? r.viaCod : "";
    const nvia = r.viaNom;
    const tvia = esICA ? "" : r.viaCod;
    const curba = esICA ? r.urbCod : "";
    const nurba = r.urbNom;
    const turba = esICA ? "" : r.urbCod;

    const payload = {
      tip: esActualizacion ? "2" : "1",
      codigo: codigoContribuyente?.trim() ?? "",
      id: r.codigoRepresentante ?? "",
      cod_repre: r.codigoRepresentante ?? "",
      id_docu: r.documento ?? "",
      num_doc: r.numero ?? "",
      nombres: r.nombreRazon ?? "",
      paterno: r.paterno ?? "",
      materno: r.materno ?? "",
      id_dist: r.distrito ?? "",
      tipourb: turba,
      des_urb: nurba,
      tipovia: tvia,
      des_via: nvia,
      id_zona: r.zonaCod ?? "",
      id_urba: curba,
      id_via: cvia,
      referencia: r.referencia ?? "",
      manzana: r.mz ?? "",
      lote: r.lote ?? "",
      sub_lote: r.subLote ?? "",
      numero: r.numDomicilio ?? "",
      departam: r.dpto ?? "",
      nestado: "",
      operador: operador ?? "",
      estacion: estacion ?? "",
      id_tipo_relacion: r.tipoRepresentante ?? "",
      tipo_interior_id: r.tipoInterior ?? "",
      tipo_edificio_id: r.tipoEdificacion ?? "",
      tipo_ingreso_id: r.tipoIngreso ?? "",
      tipo_agrupamiento_id: r.tipoAgrupamiento ?? "",
      letra1: r.letra1 ?? "",
      letra2: r.letra2 ?? "",
      numero2: r.numero2 ?? "",
      nombre_ingreso: r.nombreIngreso ?? "",
      nombre_agrupamiento: r.nombreAgrupamiento ?? "",
      nombre_edificio: r.nombreEdificacion ?? "",
      piso: r.piso ?? "",
      numero_interno: r.numInterior ?? "",
      letra_interno: r.letraInterior ?? "",
    };

    try {
      const res = await guardarRepresentanteAction(payload);
      if (!res.success) {
        setSaveMessage({ type: "error", text: res.error });
        return;
      }
      if (res.data?.id) {
        onSaved?.(res.data.id);
      }
      setSaveMessage({ type: "success", text: "Representante guardado correctamente." });
      setTimeout(() => {
        onClose();
        setSaveMessage(null);
      }, 1500);
    } catch {
      setSaveMessage({ type: "error", text: "Error al guardar el representante. Intente nuevamente." });
    }
  };

  if (!isOpen) return null;

  const repInputClass =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
  const repLabelClass =
    "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !combosLoading && !edicionLoading) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              {esEdicion ? "Editar Representante" : "Agregar Representante"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-4 py-2.5 space-y-2.5">
          {/* ══ Datos personales ══ */}
          <FieldGroup title="Datos personales" icon={<User size={13} />}>
              {/* Tipo de Representante */}
              <div>
                <label htmlFor="r-tipo" className={repLabelClass}>
                  Tipo de Representante
                </label>
                <select
                  id="r-tipo"
                  value={form.tipoRepresentante}
                  onChange={(e) => onChange("tipoRepresentante", e.target.value)}
                  className={repInputClass}
                  disabled={combosLoading || edicionLoading}
                >
                  <option value="">Seleccionar...</option>
                  {tiposContri.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código del representante (hidden) — se llena con la lupa "Buscar Contribuyente" */}
              <input
                type="hidden"
                name="txtcodrepre"
                id="txtcodrepre"
                value={form.codigoRepresentante}
              />

              {/* Documento */}
              <div className="grid grid-cols-[1fr_2fr] gap-1.5">
                <div>
                  <label htmlFor="r-doc-tipo" className={repLabelClass}>
                    Tipo Documento
                  </label>
                  <select
                    id="r-doc-tipo"
                    value={form.documento}
                    onChange={(e) => onChange("documento", e.target.value)}
                    className={repInputClass}
                    disabled={combosLoading || edicionLoading}
                  >
                    <option value="">Seleccionar...</option>
                    {tiposDoc.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="r-doc-num" className={repLabelClass}>
                    Número
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="r-doc-num"
                      type="text"
                      maxLength={15}
                      value={form.numero}
                      onChange={(e) => onChange("numero", e.target.value)}
                      placeholder="Número de documento"
                      className={repInputClass}
                      disabled={edicionLoading}
                    />
                    <button
                      type="button"
                      onClick={buscarContribuyente}
                      disabled={searchLoading || edicionLoading}
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-sat-amber bg-white p-1.5 text-sat-amber transition hover:bg-sat-amber/5 focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98]"
                      title="Buscar contribuyente"
                      aria-label="Buscar contribuyente"
                    >
                      {searchLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Search size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {searchMessage && (
                <div
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${
                    searchMessage.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  {searchMessage.text}
                </div>
              )}

              {/* Nombre / Razón Social */}
              <div>
                <label htmlFor="r-razon" className={repLabelClass}>
                  Nombre o Razón Social
                </label>
                <input
                  id="r-razon"
                  type="text"
                  maxLength={100}
                  value={form.nombreRazon}
                  onChange={(e) => onChange("nombreRazon", e.target.value.toUpperCase())}
                  placeholder="Nombre o razón social"
                  className={repInputClass}
                  disabled={edicionLoading}
                />
              </div>

              {/* Paterno + Materno */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="r-paterno" className={repLabelClass}>
                    Apellido Paterno
                  </label>
                  <input
                    id="r-paterno"
                    type="text"
                    maxLength={100}
                    value={form.paterno}
                    onChange={(e) => onChange("paterno", e.target.value.toUpperCase())}
                    placeholder="Apellido paterno"
                    className={repInputClass}
                    disabled={edicionLoading}
                  />
                </div>
                <div>
                  <label htmlFor="r-materno" className={repLabelClass}>
                    Apellido Materno
                  </label>
                  <input
                    id="r-materno"
                    type="text"
                    maxLength={100}
                    value={form.materno}
                    onChange={(e) => onChange("materno", e.target.value.toUpperCase())}
                    placeholder="Apellido materno"
                    className={repInputClass}
                    disabled={edicionLoading}
                  />
                </div>
              </div>
          </FieldGroup>

          {/* ══ Domicilio fiscal ══ */}
          <FieldGroup title="Domicilio fiscal" icon={<MapPin size={13} />}>
            {/* Distrito */}
            <div>
              <label htmlFor="r-distrito" className={repLabelClass}>
                Distrito
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  id="r-distrito"
                  value={form.distrito}
                  onChange={(e) => onChange("distrito", e.target.value)}
                  className={repInputClass}
                  disabled={combosLoading || edicionLoading}
                >
                  <option value="">Seleccionar...</option>
                  {distritos.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setViaModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sat-amber bg-white px-3 py-1.5 text-xs font-medium text-sat-amber transition hover:bg-sat-amber/5 focus:outline-none focus:ring-2 focus:ring-sat-amber/40 active:scale-[0.98]"
                >
                  <Search size={13} />
                  Búsqueda
                </button>
              </div>
            </div>

            {/* Zona */}
            <div>
              <label className={repLabelClass}>Zona</label>
              <div className="grid grid-cols-[110px_1fr] gap-1.5">
                <input
                  type="text"
                  value={form.zonaCod}
                  readOnly
                  placeholder="Código"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
                <input
                  type="text"
                  value={form.zonaNom}
                  readOnly
                  placeholder="Nombre"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Urbanización */}
            <div>
              <label className={repLabelClass}>Urbanización</label>
              <div className="grid grid-cols-[110px_1fr] gap-1.5">
                <input
                  type="text"
                  value={form.urbCod}
                  readOnly
                  placeholder="Código"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
                <input
                  type="text"
                  value={form.urbNom}
                  readOnly
                  placeholder="Nombre"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Vía */}
            <div>
              <label className={repLabelClass}>Vía</label>
              <div className="grid grid-cols-[110px_1fr] gap-1.5">
                <input
                  type="text"
                  value={form.viaCod}
                  readOnly
                  placeholder="Código"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
                <input
                  type="text"
                  value={form.viaNom}
                  readOnly
                  placeholder="Nombre"
                  className={`${repInputClass} bg-slate-100 cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Mz + Lote + Sub Lote + Número + Dpto */}
            <div className="grid grid-cols-5 gap-1.5">
              <div>
                <label className={repLabelClass}>Mz</label>
                <input type="text" value={form.mz} onChange={(e) => onChange("mz", e.target.value.toUpperCase())} maxLength={12} placeholder="Mz" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Lote</label>
                <input type="text" value={form.lote} onChange={(e) => onChange("lote", e.target.value.toUpperCase())} maxLength={12} placeholder="Lote" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Sub Lote</label>
                <input type="text" value={form.subLote} onChange={(e) => onChange("subLote", e.target.value.toUpperCase())} maxLength={12} placeholder="Sub Lote" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Número</label>
                <input type="text" value={form.numDomicilio} onChange={(e) => onChange("numDomicilio", e.target.value.toUpperCase())} maxLength={12} placeholder="Número" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Dpto</label>
                <input type="text" value={form.dpto} onChange={(e) => onChange("dpto", e.target.value.toUpperCase())} maxLength={12} placeholder="Dpto" className={repInputClass} />
              </div>
            </div>

            {/* Letra 1 + Num 2 + Letra 2 + Piso */}
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className={repLabelClass}>Letra 1</label>
                <input type="text" value={form.letra1} onChange={(e) => onChange("letra1", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 1" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Num 2</label>
                <input type="text" value={form.numero2} onChange={(e) => onChange("numero2", e.target.value.toUpperCase())} maxLength={10} placeholder="Num 2" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Letra 2</label>
                <input type="text" value={form.letra2} onChange={(e) => onChange("letra2", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra 2" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Piso</label>
                <input type="text" value={form.piso} onChange={(e) => onChange("piso", e.target.value.toUpperCase())} maxLength={10} placeholder="Piso" className={repInputClass} />
              </div>
            </div>

            {/* Tipo Interior + Num + Letra */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-1.5">
              <div>
                <label className={repLabelClass}>Tipo de Interior</label>
                <select value={form.tipoInterior} onChange={(e) => onChange("tipoInterior", e.target.value)} className={repInputClass}>
                  <option value="">Seleccionar...</option>
                  {tiposInterior.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={repLabelClass}>Num Interior</label>
                <input type="text" value={form.numInterior} onChange={(e) => onChange("numInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Num" className={repInputClass} />
              </div>
              <div>
                <label className={repLabelClass}>Letra Interior</label>
                <input type="text" value={form.letraInterior} onChange={(e) => onChange("letraInterior", e.target.value.toUpperCase())} maxLength={10} placeholder="Letra" className={repInputClass} />
              </div>
            </div>

            {/* Tipo Edificación + Nombre Edificación */}
            <div className="grid grid-cols-[1fr_2fr] gap-1.5">
              <div>
                <label className={repLabelClass}>Tipo de Edificación</label>
                <select value={form.tipoEdificacion} onChange={(e) => onChange("tipoEdificacion", e.target.value)} className={repInputClass}>
                  <option value="">Seleccionar...</option>
                  {tiposEdificacion.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={repLabelClass}>Nombre de Edificación</label>
                <input type="text" value={form.nombreEdificacion} onChange={(e) => onChange("nombreEdificacion", e.target.value.toUpperCase())} placeholder="Nombre de edificación" className={repInputClass} />
              </div>
            </div>

            {/* Tipo Ingreso + Nombre Ingreso */}
            <div className="grid grid-cols-[1fr_2fr] gap-1.5">
              <div>
                <label className={repLabelClass}>Tipo de Ingreso</label>
                <select value={form.tipoIngreso} onChange={(e) => onChange("tipoIngreso", e.target.value)} className={repInputClass}>
                  <option value="">Seleccionar...</option>
                  {tiposIngreso.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={repLabelClass}>Nombre de Ingreso</label>
                <input type="text" value={form.nombreIngreso} onChange={(e) => onChange("nombreIngreso", e.target.value.toUpperCase())} placeholder="Nombre de ingreso" className={repInputClass} />
              </div>
            </div>

            {/* Tipo Agrupamiento + Nombre Agrupamiento */}
            <div className="grid grid-cols-[1fr_2fr] gap-1.5">
              <div>
                <label className={repLabelClass}>Tipo de Agrupamiento</label>
                <select value={form.tipoAgrupamiento} onChange={(e) => onChange("tipoAgrupamiento", e.target.value)} className={repInputClass}>
                  <option value="">Seleccionar...</option>
                  {tiposAgrupamiento.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={repLabelClass}>Nombre de Agrupamiento</label>
                <input type="text" value={form.nombreAgrupamiento} onChange={(e) => onChange("nombreAgrupamiento", e.target.value.toUpperCase())} placeholder="Nombre de agrupamiento" className={repInputClass} />
              </div>
            </div>

            {/* Referencia */}
            <div>
              <label className={repLabelClass}>Referencia</label>
              <input type="text" value={form.referencia} onChange={(e) => onChange("referencia", e.target.value.toUpperCase())} maxLength={400} placeholder="Referencia" className={repInputClass} />
            </div>
          </FieldGroup>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-4 py-2 shrink-0 space-y-2">
          {saveMessage && (
            <div
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${
                saveMessage.type === "error"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/30"
            >
              Cerrar Formulario
            </button>
            <button
              type="button"
              onClick={grabar}
              disabled={combosLoading || edicionLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Grabar Datos
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de búsqueda de vías ── */}
      <ViaBusquedaModal
        isOpen={viaModalOpen}
        onClose={() => setViaModalOpen(false)}
        onSelect={handleViaSelect}
      />

      {edicionLoading && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg">
            <Loader2 size={14} className="animate-spin text-sat-cyan" />
            <span className="text-xs font-medium text-slate-500">Cargando datos del representante...</span>
          </div>
        </div>
      )}
    </div>
  );
}