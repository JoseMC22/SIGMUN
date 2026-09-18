"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  XCircle,
  LogOut,
  Search,
  Loader2,
  AlertCircle,
  FileUp,
  FileText,
} from "lucide-react";
import {
  listarTiposValorAction,
  listarNotificadoresAction,
  listarParentescosAction,
  validarValorAction,
  listarTributosAction,
  detalleCargoAction,
  grabarCargoAction,
  subirCargoNotificacionAction,
  type TipoValorOption,
  type NotificadorOption,
  type ParentescoOption,
} from "@/actions/notificaciones/cargos-notificaciones";

// ── Static catalogs (provided by the user, not DB-driven) ──

const VISITAS = [
  { value: "1", label: "Primera" },
  { value: "2", label: "Segunda" },
];

const SITUACIONES = [
  { value: "0", label: "Sí estuvo Presente" },
  { value: "1", label: "No estuvo Presente" },
  { value: "2", label: "No se ubicó la Dirección" },
];

const TABS = ["Datos de Recepción", "Aviso de Visita", "Cedulón", "Acta Registro"];

// ── Helpers ─────────────────────────────────────────────────

/** Case-insensitive column lookup over a dynamic SP row. */
function getField(
  row: Record<string, unknown> | undefined,
  ...names: string[]
): string {
  if (!row) return "";
  const key = Object.keys(row).find((k) => {
    const lower = k.toLowerCase();
    return names.some((n) => lower === n.toLowerCase());
  });
  return key !== undefined ? String(row[key] ?? "") : "";
}

/** Pad a numeric code to 7 chars with leading zeros (SP expects this width). */
function padNumValor(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.padStart(7, "0");
}

/** Normaliza fechas del SP ('dd/MM/yyyy hh:mm:ss tt' o ISO) a 'yyyy-mm-dd'. */
function toInputDate(value: string): string {
  if (!value) return "";
  const latam = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (latam) return `${latam[3]}-${latam[2]}-${latam[1]}`;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return "";
}

const EMPTY_DETALLE = {
  codigo: "",
  doc_identidad: "",
  contribuyente: "",
  direccion: "",
  monto: "",
  nestado: "",
};

/** Etiqueta legible del estado del valor (campo nestado del SP). */
function etiquetaEstado(nestado: string): string | null {
  if (nestado === "2") return "ANULADO";
  if (nestado === "9") return "PAGADO";
  return null;
}

// ── Main Page ───────────────────────────────────────────────

export default function CargosNotificacionesPage() {
  // ── Combos ────────────────────────────────────────────────
  const [tiposValor, setTiposValor] = useState<TipoValorOption[]>([]);
  const [notificadores, setNotificadores] = useState<NotificadorOption[]>([]);
  const [parentescos, setParentescos] = useState<ParentescoOption[]>([]);
  const [combosLoaded, setCombosLoaded] = useState(false);

  // ── Form: identificación del valor ────────────────────────
  const [idValor, setIdValor] = useState("");
  const [numValor, setNumValor] = useState("");
  const [anoValor, setAnoValor] = useState("");
  const [validando, setValidando] = useState(false);

  // ── Form: cargo ───────────────────────────────────────────
  const [idNotificador, setIdNotificador] = useState("");
  const [anoCargo, setAnoCargo] = useState("");
  const [cargoExistente, setCargoExistente] = useState(false);

  // Nro Cargo = idTipoValor + 5 dígitos derechos de numValor
  const numCargo = idValor && numValor ? `${idValor}${numValor.padStart(5, "0").slice(-5)}` : "";

  // ── Detalle del valor (rellenado por Validar) ─────────────
  const [detalle, setDetalle] = useState(EMPTY_DETALLE);
  const [tributos, setTributos] = useState<Record<string, unknown>[]>([]);

  // ── Situación / Visita ────────────────────────────────────
  const [situacion, setSituacion] = useState("");
  const [nroVisita, setNroVisita] = useState("");

  // ── Aviso de Visita ───────────────────────────────────────
  const [fVisita1, setFVisita1] = useState("");
  const [hVisita1, setHVisita1] = useState("");
  const [fVisita2, setFVisita2] = useState("");
  const [hVisita2, setHVisita2] = useState("");

  // ── Cedulón ───────────────────────────────────────────────
  const [fCedulon, setFCedulon] = useState("");
  const [hCedulon, setHCedulon] = useState("");
  const [dirCedulon, setDirCedulon] = useState("");
  const [nPisos, setNPisos] = useState("");
  const [cFachada, setCFachada] = useState("");
  const [nSuministro, setNSuministro] = useState("");
  const [obsCedulon, setObsCedulon] = useState("");

  // ── Acta de Registro ──────────────────────────────────────
  const [finalizarProceso, setFinalizarProceso] = useState(false);

  // ── Datos de Recepción ────────────────────────────────────
  const [fNotifica, setFNotifica] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [nombres, setNombres] = useState("");
  const [docIdentidad, setDocIdentidad] = useState("");
  const [firma, setFirma] = useState("");
  const [direcFiscal, setDirecFiscal] = useState("");
  const [observacion, setObservacion] = useState("");

  // ── UI state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);
  // ── Tab enabling rules by Nro Visita + Situación ─────────
  // 0=Datos, 1=Aviso, 2=Cedulón, 3=Acta Registro
  const TAB_RULES: Record<string, number> = {
    "1|0": 0,
    "1|1": 1,
    "2|0": 0,
    "2|1": 2,
    "1|2": 3,
    "2|2": 3,
  };
  const allowedTab = TAB_RULES[`${nroVisita}|${situacion}`] ?? null;
  // Cuando la pestaña Datos está desactivada, sus controles quedan solo-lectura
  const datosLocked = allowedTab !== 0;

  useEffect(() => {
    if (allowedTab !== null && activeTab !== allowedTab) {
      setActiveTab(allowedTab);
    }
  }, [allowedTab, activeTab]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Subir Cargo Notificación (NAS) ────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Load combos on mount (setTimeout to satisfy lint rule) ─
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        const [tv, nf, pr] = await Promise.all([
          listarTiposValorAction(),
          listarNotificadoresAction(),
          listarParentescosAction(),
        ]);
        if (tv.success) setTiposValor(tv.data);
        if (nf.success) setNotificadores(nf.data);
        if (pr.success) setParentescos(pr.data);
        setCombosLoaded(true);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // ── Validar valor tributario ──────────────────────────────
  const handleValidar = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setCargoExistente(false);
    if (!idValor) {
      setError("Debe seleccionar un Tipo de Valor");
      return;
    }
    setValidando(true);
    try {
      const filters = {
        id_valor: idValor,
        num_valor: numValor,
        ano_valor: anoValor ? Number(anoValor) : undefined,
      };
      const [res, trib] = await Promise.all([
        validarValorAction(filters),
        listarTributosAction(filters),
      ]);
      if (res.success && res.data.length > 0) {
        const first = res.data[0];
        setDetalle({
          codigo: getField(first, "codigo", "code"),
          doc_identidad: getField(first, "nro_documento", "documento", "num_doc", "doc_identidad"),
          contribuyente: getField(first, "contribuyente", "nombre", "razon_social"),
          direccion: getField(first, "direccion", "direc_fiscal", "dir"),
          monto: getField(first, "total", "monto", "monto_valor"),
          nestado: getField(first, "nestado", "n_estado", "estado"),
        });
        const etiqueta = etiquetaEstado(getField(first, "nestado", "n_estado", "estado"));
        if (etiqueta) {
          setError(`El valor está ${etiqueta} — no se puede grabar el cargo`);
        }
        // Si el valor ya tiene un cargo registrado, precargar el formulario (busc=10)
        if (!etiqueta && getField(first, "nestado", "n_estado", "estado") === "1") {
          const det = await detalleCargoAction(filters);
          const cargo = det.success && det.data.length > 0 ? det.data[0] : null;
          if (cargo) {
            setCargoExistente(true);
            setIdNotificador(getField(cargo, "id_notificador"));
            setNroVisita(getField(cargo, "nro_visita"));
            setSituacion(getField(cargo, "flg_situacion"));
            setFNotifica(toInputDate(getField(cargo, "f_notifica")));
            const rawPar = getField(cargo, "id_parentesco").trim();
            setParentesco(rawPar && !isNaN(Number(rawPar)) ? String(Number(rawPar)) : rawPar);
            setNombres(getField(cargo, "nombre"));
            setDocIdentidad(getField(cargo, "nro_documento"));
            setFirma(getField(cargo, "id_firma"));
            setDirecFiscal(getField(cargo, "direc_fiscal"));
            setObservacion(getField(cargo, "observacion"));
            setFVisita1(toInputDate(getField(cargo, "f_visita1")));
            setHVisita1(getField(cargo, "h_visita1").trim());
            setFVisita2(toInputDate(getField(cargo, "f_visita2")));
            setHVisita2(getField(cargo, "h_visita2").trim());
            setFCedulon(toInputDate(getField(cargo, "f_cedulon")));
            setHCedulon(getField(cargo, "h_cedulon").trim());
            setDirCedulon(getField(cargo, "dir_cedulon"));
            setNPisos(getField(cargo, "n_pisos"));
            setCFachada(getField(cargo, "c_fachada"));
            setNSuministro(getField(cargo, "n_suministro"));
            setObsCedulon(getField(cargo, "otros_cedulon"));
            setFinalizarProceso(getField(cargo, "derivar_drft").trim() === "1");
          }
        }
      } else {
        setDetalle(EMPTY_DETALLE);
        setError(res.error ?? "No se encontró el valor");
      }
      // La tabla de tributos proviene de su propia SP (ssp_dvalores @msquery=4);
      // se excluyen los registros cuyo id sea 0 (fila de control/encabezado).
      const tribRows = (trib.data || []).filter((row) => {
        const rowId = getField(row, "id");
        return rowId !== "" && rowId !== "0";
      });
      setTributos(trib.success ? tribRows : []);
    } catch {
      setError("Error al validar el valor");
    } finally {
      setValidando(false);
    }
  }, [idValor, numValor, anoValor]);

  // ── Grabar cargo ──────────────────────────────────────────
  const buildCargoPayload = useCallback(() => {
    return {
      actualizar: cargoExistente || undefined,
      codigo: detalle.codigo || undefined,
      id_valor: idValor,
      num_valor: numValor,
      ano_valor: anoValor ? Number(anoValor) : undefined,
      num_cargo: numCargo,
      ano_cargo: anoCargo ? Number(anoCargo) : undefined,
      id_notificador: idNotificador ? Number(idNotificador) : undefined,
      monto: detalle.monto ? Number(detalle.monto) : undefined,
      flg_situacion: situacion || undefined,
      nro_visita: nroVisita || undefined,
      f_visita1: fVisita1 || undefined,
      h_visita1: hVisita1 || undefined,
      f_visita2: fVisita2 || undefined,
      h_visita2: hVisita2 || undefined,
      f_cedulon: fCedulon || undefined,
      h_cedulon: hCedulon || undefined,
      dir_cedulon: dirCedulon || undefined,
      n_pisos: nPisos ? Number(nPisos) : undefined,
      c_fachada: cFachada || undefined,
      n_suministro: nSuministro || undefined,
      otros: obsCedulon || undefined,
      derivar_drft: finalizarProceso ? "1" : "0",
      estado: "1",
      f_notifica: fNotifica || undefined,
      id_parentesco: parentesco ? Number(parentesco) : undefined,
      nombre: nombres || undefined,
      nro_documento: docIdentidad || undefined,
      id_firma: firma ? Number(firma) : undefined,
      direc_fiscal: direcFiscal || undefined,
      observacion: observacion || undefined,
    };
  }, [detalle, idValor, numValor, anoValor, numCargo, anoCargo, idNotificador,
    situacion, nroVisita, fNotifica, parentesco, nombres, docIdentidad, firma,
    direcFiscal, observacion, cargoExistente, fVisita1, hVisita1, fVisita2, hVisita2,
    fCedulon, hCedulon, dirCedulon, nPisos, cFachada, nSuministro, obsCedulon,
    finalizarProceso]);

  const handleGrabar = useCallback(async () => {
    setError(null);
    setSuccess(null);
    // Validación: todos los campos del formulario deben estar llenos
    const faltantes: string[] = [];
    if (!idValor) faltantes.push("Tipo Valor");
    if (!numValor) faltantes.push("Nro Valor");
    if (!anoValor) faltantes.push("Año Valor");
    if (!idNotificador) faltantes.push("Notificador");
    if (!detalle.codigo) faltantes.push("valor validado");
    if (!situacion) faltantes.push("Situación");
    if (!nroVisita) faltantes.push("Nro Visita");
    if (!fNotifica) faltantes.push("Fecha Notificación");
    if (!parentesco) faltantes.push("Parentesco");
    if (!firma) faltantes.push("Firmó");
    if (!nombres.trim()) faltantes.push("Nombres");
    if (!docIdentidad.trim()) faltantes.push("Doc. Identidad");
    if (!direcFiscal.trim()) faltantes.push("Dirección Fiscal");
    if (faltantes.length > 0) {
      setError(`Complete los campos requeridos: ${faltantes.join(", ")}`);
      return;
    }
    const etiquetaEstadoBloqueado = etiquetaEstado(detalle.nestado);
    if (etiquetaEstadoBloqueado) {
      setError(`No se puede grabar: el valor está ${etiquetaEstadoBloqueado}`);
      return;
    }
    setSaving(true);
    try {
      const payload = buildCargoPayload();
      const res = await grabarCargoAction(payload);
      if (res.success) {
        setSuccess(res.message ?? "Cargo registrado correctamente");
        // Limpiar en el caso de éxito
        resetForm();
      } else {
        setError(res.error ?? "Error al grabar el cargo");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSaving(false);
    }
  }, [detalle, idValor, numValor, anoValor, idNotificador, situacion, nroVisita,
    fNotifica, parentesco, nombres, docIdentidad, firma, direcFiscal,
    buildCargoPayload]);

  const resetForm = () => {
    setCargoExistente(false);
    setIdValor("");
    setNumValor("");
    setAnoValor("");
    setIdNotificador("");
    setAnoCargo("");
    setDetalle(EMPTY_DETALLE);
    setTributos([]);
    setSituacion("");
    setNroVisita("");
    setFNotifica("");
    setParentesco("");
    setNombres("");
    setDocIdentidad("");
    setFirma("");
    setDirecFiscal("");
    setObservacion("");
    setFVisita1("");
    setHVisita1("");
    setFVisita2("");
    setHVisita2("");
    setFCedulon("");
    setHCedulon("");
    setDirCedulon("");
    setNPisos("");
    setCFachada("");
    setNSuministro("");
    setObsCedulon("");
    setFinalizarProceso(false);
  };

  const handleCancelar = () => {
    setError(null);
    setSuccess(null);
    resetForm();
  };

  // ── Subir Cargo Notificación (NAS) ────────────────────────
  const handleSubirClick = () => {
    setError(null);
    setSuccess(null);
    if (!numCargo || !anoCargo) {
      setError("Primero valide el valor para obtener el Nro y Año de Cargo");
      return;
    }
    setUploadFile(null);
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("cargo", JSON.stringify(buildCargoPayload()));
      // id_acceso del submenú: lo persiste AccessProvider (sigmun:lastIdAcceso)
      // al navegar por el sidebar; fallback al código de Cargos de Notificaciones.
      const idAcceso =
        sessionStorage.getItem("sigmun:lastIdAcceso") ?? "23.01.00";
      formData.append("id_acceso", idAcceso);
      const res = await subirCargoNotificacionAction(formData);
      if (res.success) {
        setUploadOpen(false);
        setUploadFile(null);
        setSuccess(
          `${res.message ?? "Cargo de notificación subido correctamente"}${
            res.filename ? ` — ${res.filename}` : ""
          }`,
        );
      } else {
        setUploadError(res.error ?? "Error al subir el archivo");
      }
    } catch {
      setUploadError("Error de conexión con el servidor");
    } finally {
      setUploading(false);
    }
  };

  // Se oculta la primera columna del recordset (normalmente el id de control).
  const tributoHeaders =
    tributos.length > 0 ? Object.keys(tributos[0]).slice(1) : [];

  // ── Render helpers ────────────────────────────────────────
  const label = (text: string, w = "w-24") => (
    <label className={`${w} text-slate-600`}>{text}</label>
  );

  const inputCls =
    "border border-slate-300 rounded px-2 py-1 leading-tight text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">Cargos de Notificación</h1>
            <p className="text-xs text-white/50 font-inter">Registro de cargos de notificación</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sección Superior: Filtros y Validación */}
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              {label("Tipo Valor")}
              <select
                value={idValor}
                onChange={(e) => setIdValor(e.target.value)}
                className={`${inputCls} flex-1 min-w-0`}
                disabled={!combosLoaded}
              >
                <option value=""></option>
                {tiposValor.map((t) => (
                  <option key={t.id_valor} value={t.id_valor}>{t.nomb_val}</option>
                ))}
              </select>
              {label("Nro Valor", "w-auto pl-2")}
              <input
                type="text"
                value={numValor}
                onChange={(e) =>
                  setNumValor(e.target.value.replace(/\D/g, "").slice(0, 7))
                }
                onBlur={(e) => {
                  if (e.target.value) setNumValor(padNumValor(e.target.value));
                }}
                className={`${inputCls} w-24 text-center font-mono`}
                placeholder="999999"
                maxLength={7}
              />
              {label("Año Valor", "w-auto pl-2")}
              <input
                type="text"
                value={anoValor}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setAnoValor(v);
                  setAnoCargo(v);
                }}
                className={`${inputCls} w-16 text-center font-mono`}
                placeholder="9999"
                maxLength={4}
              />
              <button
                type="button"
                onClick={handleValidar}
                disabled={validando}
                className="inline-flex items-center gap-1.5 rounded bg-gray-50 border border-gray-300 px-4 py-1 hover:bg-gray-100 text-gray-700 shadow-sm disabled:opacity-50"
              >
                {validando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Validar
              </button>
            </div>

            <div className="flex items-center gap-2">
              {label("Notificador")}
              <select
                value={idNotificador}
                onChange={(e) => setIdNotificador(e.target.value)}
                className={`${inputCls} flex-1`}
                disabled={!combosLoaded}
              >
                <option value=""></option>
                {notificadores.map((n) => (
                  <option key={n.codigo_autoridad} value={n.codigo_autoridad}>{n.notificador}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {label("Nro Cargo")}
              <input
                type="text"
                value={numCargo}
                readOnly
                className={`${inputCls} w-24 text-center font-mono bg-gray-50`}
                placeholder="999999"
              />
              <span className="text-slate-600 ml-2">Año Cargo</span>
              <input
                type="text"
                value={anoCargo}
                readOnly
                className={`${inputCls} w-16 text-center font-mono bg-gray-50`}
                placeholder="9999"
              />
              <span className="mx-2 text-gray-400">...</span>
              <span className="text-slate-600 ml-auto">Monto Valor</span>
              <input
                type="text"
                value={detalle.monto}
                readOnly
                className={`${inputCls} w-32 bg-gray-50 text-right`}
                placeholder="999999"
              />
            </div>
          </div>
        </div>

        {/* Notificación de error / éxito */}
        {(error || success) && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {error ? <AlertCircle size={14} /> : <Save size={14} />}
            <span className="font-medium">{error ?? success}</span>
          </div>
        )}

        {/* Sección: Detalle del Valor Tributario */}
        <div className="border border-gray-300 rounded p-4 relative pt-6 bg-white/50">
          <span className="absolute -top-3 left-4 bg-gray-100 px-2 text-gray-700 font-bold italic">Detalle del Valor Tributario</span>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-[10px] gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 whitespace-nowrap">Código</span>
                <input type="text" value={detalle.codigo} readOnly className={`${inputCls} w-22 bg-gray-50`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 whitespace-nowrap">Contribuyente</span>
                <input type="text" value={detalle.contribuyente} readOnly className={`${inputCls} w-150 bg-gray-50`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 whitespace-nowrap">Documento Identidad</span>
                <input type="text" value={detalle.doc_identidad} readOnly className={`${inputCls} w-30 bg-gray-50`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-30 text-slate-600">Dirección</span>
              <input type="text" value={detalle.direccion} readOnly className={`${inputCls} w-250 bg-gray-50`} />
            </div>
          </div>

          {/* Tabla de Tributos */}
          <div className="mt-4 border border-gray-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse bg-white leading-tight">
              <thead className="bg-white border-b border-gray-300 text-gray-600 text-xs uppercase font-bold">
                {tributoHeaders.length > 0 ? (
                  <tr>
                    {tributoHeaders.map((h) => (
                      <th key={h} className="px-3 py-1 border-r border-gray-300">{h}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-1 border-r border-gray-300">Tributo</th>
                    <th className="px-3 py-1 border-r border-gray-300">Año</th>
                    <th className="px-3 py-1 border-r border-gray-300">Periodo</th>
                    <th className="px-3 py-1 border-r border-gray-300 text-right">Imp. Insol</th>
                    <th className="px-3 py-1 border-r border-gray-300 text-right">Imp. Reaj</th>
                    <th className="px-3 py-1 border-r border-gray-300 text-right">Costo Emis.</th>
                    <th className="px-3 py-1 border-r border-gray-300 text-right">Interés</th>
                    <th className="px-3 py-1 text-right">Total</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tributos.length > 0 ? (
                  tributos.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      {tributoHeaders.map((h) => (
                        <td key={h} className="px-3 py-1 border-r border-gray-300 text-sm text-slate-600">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-100 last:border-0 h-24">
                    <td colSpan={8} className="px-3 py-1 italic text-gray-400 text-sm">....</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección: Situación y Visita */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Nro Visita</span>
            <select
              value={nroVisita}
              onChange={(e) => setNroVisita(e.target.value)}
              className={`${inputCls} w-24`}
            >
              <option value=""></option>
              {VISITAS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-slate-600">Situación</span>
            <select
              value={situacion}
              onChange={(e) => setSituacion(e.target.value)}
              className={`${inputCls} w-60`}
            >
              <option value=""></option>
              {SITUACIONES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs de Recepción */}
        <div className="border border-gray-300 rounded bg-white/50">
          <div className="flex border-b border-gray-300 bg-gray-50 overflow-x-auto">
            {TABS.map((tab, idx) => {
              const disabled = allowedTab === null || allowedTab !== idx;
              return (
              <button
                key={tab}
                onClick={() => !disabled && setActiveTab(idx)}
                disabled={disabled}
                className={`px-4 py-2 text-xs font-bold border-r border-gray-300 whitespace-nowrap ${
                  disabled
                    ? "text-gray-300 cursor-not-allowed bg-gray-100"
                    : activeTab === idx ? "bg-white text-gray-800" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
              );
            })}
          </div>

          {activeTab === 0 && (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-x-[10px] gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 whitespace-nowrap">Fecha Notificación</span>
                  <input
                    type="date"
                    value={fNotifica}
                    onChange={(e) => setFNotifica(e.target.value)}
                    readOnly={datosLocked}
                    className={`${inputCls} w-40 bg-gray-50`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 whitespace-nowrap">Parentesco</span>
                  <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} disabled={datosLocked} className={`${inputCls} w-50 bg-gray-50`}>
                    <option value=""></option>
                    {parentescos.map((p) => (
                      <option key={p.tipo_relacion_id} value={p.tipo_relacion_id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 whitespace-nowrap">Firmó</span>
                  <select value={firma} onChange={(e) => setFirma(e.target.value)} disabled={datosLocked} className={`${inputCls} w-24`}>
                    <option value=""></option>
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 whitespace-nowrap">Doc. Identidad</span>
                  <input type="text" value={docIdentidad} onChange={(e) => setDocIdentidad(e.target.value)} readOnly={datosLocked} className={`${inputCls} w-30 bg-gray-50`} />
                </div>

                <div className="flex items-center gap-2 basis-full">
                  <span className="text-slate-600 whitespace-nowrap">Nombres</span>
                  <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} readOnly={datosLocked} className={`${inputCls} w-150 bg-gray-50`} />
                  <button type="button" disabled={datosLocked} onClick={() => { setNombres(detalle.contribuyente); setDocIdentidad(detalle.doc_identidad); }} className="px-2 py-1 border border-gray-300 rounded bg-gray-50 disabled:opacity-50">...</button>
                </div>
                <div className="flex items-center gap-2 basis-full">
                  <span className="text-slate-600 whitespace-nowrap">Dirección Fiscal</span>
                  <input type="text" value={direcFiscal} onChange={(e) => setDirecFiscal(e.target.value)} readOnly={datosLocked} className={`${inputCls} w-150 bg-gray-50`} />
                  <button type="button" disabled={datosLocked} onClick={() => setDirecFiscal(detalle.direccion)} className="px-2 py-1 border border-gray-300 rounded bg-gray-50 disabled:opacity-50">...</button>
                </div>

                <div className="flex items-center gap-2 basis-full">
                  <span className="text-slate-600 whitespace-nowrap">Observación</span>
                  <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)} readOnly={datosLocked} className={`${inputCls} w-150 bg-gray-50`} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="p-4 flex justify-center">
              <div className="grid grid-cols-[auto_auto_auto_auto] items-center gap-x-3 gap-y-3">
                <span className="text-slate-600 whitespace-nowrap text-right">Fecha Primera Visita</span>
                <input
                  type="date"
                  value={fVisita1}
                  onChange={(e) => setFVisita1(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-40 bg-gray-50`}
                />
                <span className="text-slate-600 whitespace-nowrap text-right">Hora Primera Visita</span>
                <input
                  type="time"
                  value={hVisita1}
                  onChange={(e) => setHVisita1(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-28 bg-gray-50`}
                />
                <span className="text-slate-600 whitespace-nowrap text-right">Fecha Próxima Visita</span>
                <input
                  type="date"
                  value={fVisita2}
                  onChange={(e) => setFVisita2(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-40 bg-gray-50`}
                />
                <span className="text-slate-600 whitespace-nowrap text-right">Hora Próxima Visita</span>
                <input
                  type="time"
                  value={hVisita2}
                  onChange={(e) => setHVisita2(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-28 bg-gray-50`}
                />
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="p-4 flex justify-left">
              <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-3">
                <span className="text-slate-600 whitespace-nowrap text-right">Fecha Notificación</span>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={fCedulon}
                    onChange={(e) => setFCedulon(e.target.value)}
                    readOnly={activeTab !== allowedTab}
                    className={`${inputCls} w-40 bg-gray-50`}
                  />
                  <span className="text-slate-600 whitespace-nowrap text-right">Hora Entrega</span>
                  <input
                    type="time"
                    value={hCedulon}
                    onChange={(e) => setHCedulon(e.target.value)}
                    readOnly={activeTab !== allowedTab}
                    className={`${inputCls} w-28 bg-gray-50`}
                  />
                </div>

                <span className="text-slate-600 whitespace-nowrap text-right">Dirección Fiscal</span>
                <input
                  type="text"
                  value={dirCedulon}
                  onChange={(e) => setDirCedulon(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-96 bg-gray-50`}
                />

                <span className="text-slate-600 whitespace-nowrap text-right">Nro de Pisos</span>
                <input
                  type="text"
                  value={nPisos}
                  onChange={(e) => setNPisos(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-20 text-center bg-gray-50`}
                />

                <span className="text-slate-600 whitespace-nowrap text-right">Color de Fachada</span>
                <input
                  type="text"
                  value={cFachada}
                  onChange={(e) => setCFachada(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-60 bg-gray-50`}
                />

                <span className="text-slate-600 whitespace-nowrap text-right">Nro Suministro</span>
                <input
                  type="text"
                  value={nSuministro}
                  onChange={(e) => setNSuministro(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-40 bg-gray-50`}
                />

                <span className="text-slate-600 whitespace-nowrap text-right">Observación</span>
                <input
                  type="text"
                  value={obsCedulon}
                  onChange={(e) => setObsCedulon(e.target.value)}
                  readOnly={activeTab !== allowedTab}
                  className={`${inputCls} w-300 bg-gray-50`}
                />
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="p-4 flex justify-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={finalizarProceso}
                  onChange={(e) => setFinalizarProceso(e.target.checked)}
                  disabled={activeTab !== allowedTab}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-slate-600">Finalizar el proceso de notificación</span>
              </label>
            </div>
          )}
        </div>

        {/* Botón de Acción Especial */}
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            onClick={handleSubirClick}
          >
            <FileUp size={14} />
            Subir Cargo Notificación
          </button>
        </div>
      </div>

      {/* Modal: Subir Cargo Notificación */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 rounded shadow-xl p-5 w-[480px]">
            <div className="flex items-center gap-2 mb-4">
              <FileUp size={16} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-700">Subir Cargo Notificación</h2>
            </div>
            <div className="space-y-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  setUploadError(null);
                  e.target.value = "";
                }}
                className="text-sm text-slate-600"
              />
              {uploadFile && (
                <div className="text-xs text-slate-500 font-mono">
                  {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} />
                  {uploadError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 text-sm"
                >
                  <XCircle size={13} />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 text-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
                  Subir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Acciones Finales */}
      <div className="bg-gray-100 border-t border-gray-300 p-4 flex justify-center gap-8">
        <button
          type="button"
          onClick={handleGrabar}
          disabled={saving || detalle.nestado === "2" || detalle.nestado === "9"}
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Grabar
        </button>
        <button
          type="button"
          onClick={handleCancelar}
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center"
        >
          <XCircle size={14} />
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 w-32 py-1.5 border border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-colors justify-center"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>
    </div>
  );
}
