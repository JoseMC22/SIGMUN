"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { X, Loader2, MapPin, FileText, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import {
  getCombosPredioAction,
  guardarPredioAction,
  getPredioPisosAction,
  getPredioInstalacionesAction,
  getPredioDocumentosAction,
  getValorPisoAction,
  type PredioCombosData,
  type ValorPisoResult,
  type PredioPisoItem,
  type PredioInstalItem,
  type PredioDocItem,
  type MviaItem,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { getStoredUser } from "@/lib/api";
import { checkSessionAction } from "@/actions/auth/auth";
import { useModalStack, isTopModal } from "@/hooks/use-modal-topmost";
import ViaBusquedaModal from "./via-busqueda-modal";

// ─── Props ──────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigoContribuyente: string;
  razonSocial: string;
  annoSeleccionado: string;
  tipoMov?: "N" | "I";
  onSaved?: () => void;
}

// ─── Estados ────────────────────────────────────────────

interface PredioForm {
  // Ubicación
  cbtipopredio: string;
  txtCvia: string;
  txtVia: string;
  txtCp: string;
  txtSector: string;
  txtArancel: string;
  txtDir: string;
  txtNro: string;
  txtDpto: string;
  txtMza: string;
  txtLte: string;
  txtSubLte: string;
  txtFrontis: string;
  txtNro2: string;
  txtLetra: string;
  txtLetra2: string;
  txtFondo: string;
  // Características
  cmbUso: string;
  cmbTipPredio: string;
  cmbEstadoConst: string;
  cmbCondicion: string;
  cmbCondicionpredio: string;
  cmbInterior: string;
  cmbSituacionPredio: string;
  cmbTipoAdqui: string;
  cmbMotivoReg: string;
  cmbMotivoDec: string;
  txtNroCond: string;
  txtNroPiso: string;
  txtAreaTerreno: string;
  txtAreaComun: string;
  txtPorcenPropiedad: string;
  txtPorcenConstruccion: string;
  txtAreaUso: string;
  txtFecAdqui: string;
  txtFecTrans: string;
  txtLuz: string;
  txtAgua: string;
  txtObs: string;
  txtObservacionPredio: string;
  chAfectoPred: boolean;
  chbVendido: boolean;
  chbLicencia: boolean;
  chbConformidad: boolean;
  chbDeclaracionFab: boolean;
  chCalPredial: boolean;
  chCalArbitrio: boolean;
  // Condición especial
  txtDocEspecial: string;
  txtNroDocEspecial: string;
  txtFechDocEspecial: string;
  txtFechDocEspecialInicial: string;
  txtFechDocEspecialFinal: string;
  // Situación / Fiscalización
  txtSituacionDocumento: string;
  txtSituacionNroDoc: string;
  txtSituacionFechDoc: string;
  txtFechaFisca: string;
  txtNroFisca: string;
  // Edificio / Ingreso / Agrupamiento
  cmbTipoEdificio: string;
  txtNomEdificio: string;
  txtPiso: string;
  txtNumeroInterno: string;
  txtLetraInterno: string;
  cmbTipoIngreso: string;
  txtNomIngreso: string;
  cmbTipoAgrupamiento: string;
  txtNomAgrupamiento: string;
  // Arbitrios
  txtArbAfecto: boolean;
  txtUbiPar: string;
  cbAfectMesDesde: string;
  cbAfectMesHasta: string;
  txtArbObs: string;
  cb_limpieza: string;
  cb_barrido: string;
  cb_parque: string;
  cb_serenazgo: string;
  // Resumen del predio (legado: bloque superior, solo lectura en 1ra. inscripción)
  txtTerreno: string;
  txtConstruccion: string;
  txtInstalaciones: string;
  txtAutovaluo: string;
  txtBarrido: string;
  txtRecoleccion: string;
  txtParques: string;
  txtSerenazgo: string;
}

interface PisoRow {
  idpisos: string;
  cidindi: string;
  nropiso: string;
  mescons: string;
  aniocons: string;
  iddepcl: string;
  iddepma: string;
  iddepco: string;
  esmuros: string;
  estecho: string;
  acapiso: string;
  acapuer: string;
  acareve: string;
  acabanio: string;
  instele: string;
  arconde: string;
  uconant: string;
  umedida: string;
  referencia: string;
}

interface InstalRow {
  idinsta: string;
  cidindi: string;
  cidinst: string;
  cidnomb: string;
  mescons: string;
  aniocons: string;
  iddepcl: string;
  iddepma: string;
  iddepco: string;
  dmlargo: string;
  dmancho: string;
  dmaltos: string;
  protota: string;
  vunimed: string;
  vdescri: string;
  referenciainst: string;
}

interface DocRow {
  iddoc: string;
  idreg: string;
  docnombre: string;
  docdetalle: string;
}

const TABS: readonly string[] = [
  "Ubicación de Predio",
  "Características",
  "Construcciones",
  "Instalaciones",
  "Arbitrios",
  "Documentos",
];

const MESES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

// ─── Referencia de tipos de edificación (1)-(7) — textos del legado predios_pisos.phtml ───

const TIPOS_EDIFICACION_REF: readonly { title: string; items: readonly { codigo: string; descripcion: string }[] }[] = [
  { title: "Muros y Columnas (1)", items: [
    { codigo: "A", descripcion: "Estructura Laminares Curvadas de Concreto Armado que incluyen en una sola armadura la cimentacion y el techo" },
    { codigo: "B", descripcion: "Columna y viga de concreto armado y/o metalica" },
    { codigo: "C", descripcion: "Placa de Concreto, Albañileria armada, ladrillo o similar, con columnas de amarre" },
    { codigo: "D", descripcion: "Ladrillo o similar" },
    { codigo: "E", descripcion: "Adobe, Tapial o quincha" },
    { codigo: "F", descripcion: "Madera" },
    { codigo: "G", descripcion: "Pircado con mezcla de barro" },
  ] },
  { title: "Techo (2)", items: [
    { codigo: "A", descripcion: "Losa o aligerado de concreto armado con luces mayores de 6M, o que soporten carros o maquinarias" },
    { codigo: "B", descripcion: "Aligerado o losas de concreto armado inclinadas" },
    { codigo: "C", descripcion: "Aligerado o losas de concreto armado horizontales" },
    { codigo: "D", descripcion: "Calamina metalica, fibrocemento sobre viga metalica" },
    { codigo: "E", descripcion: "Madera con material impermeabilizante" },
    { codigo: "F", descripcion: "Calamina metalica, fibrocemento sobre viga metalica o tejas sobre vigería de madera corriente" },
    { codigo: "G", descripcion: "Madera Rustica o Caña con torta de Barro" },
    { codigo: "H", descripcion: "Sin Techo" },
  ] },
  { title: "Piso (3)", items: [
    { codigo: "A", descripcion: "Mármol importado porcelanato" },
    { codigo: "B", descripcion: "Mármol nac, parquet fino, ceramica import, madera fina" },
    { codigo: "C", descripcion: "Madera fina machihembrada, terrazo" },
    { codigo: "D", descripcion: "Parquet guayacan, ceramica nac, loseta veneciana 40x40" },
    { codigo: "E", descripcion: "Parquet de 2da., loseta veneciana 30x30 lajas de cemento con canto rodado" },
    { codigo: "F", descripcion: "Loseta corriente o tipo corcho, canto rodado" },
    { codigo: "G", descripcion: "Loseta vinilica, cemento bruñado colorado" },
    { codigo: "H", descripcion: "Cemento pulido, ladrillo corriente, entablado corriente" },
    { codigo: "I", descripcion: "Tierra compactada" },
  ] },
  { title: "Puerta Ventana (4)", items: [
    { codigo: "A", descripcion: "Aluminio pesado con perfiles especiales madera fina ornamental (caoba cedro o pino selecto) cristales" },
    { codigo: "B", descripcion: "Aluminio o madera fina (caoba o similar) de diseño especial, vidrio polarizado curvado" },
    { codigo: "C", descripcion: "Aluminio o madera fina (caoba o similar) vidrio polarizado" },
    { codigo: "D", descripcion: "Ventanas de aluminio, puertas de madera selecta, vidrio transparente" },
    { codigo: "E", descripcion: "Ventanas de fierro, puertas de madera selecta (caoba o similar) vidrio transparente" },
    { codigo: "F", descripcion: "Ventanas de fierro o aluminio industrial, puertas contraplacadas de madera (cedro o similar) vidrio transparente semidoble o simple" },
    { codigo: "G", descripcion: "Madera corriente con marcos en puertas y ventanas de PVC o madera corriente" },
    { codigo: "H", descripcion: "Madera rústica" },
    { codigo: "I", descripcion: "Sin puertas ni ventanas" },
  ] },
  { title: "Revestimiento (5)", items: [
    { codigo: "A", descripcion: "Mármol importado, madera fina (caoba o similar) bladoza acústico en techo similar" },
    { codigo: "B", descripcion: "Mármol nacional madera fina (caoba o similar) enchapes en techo" },
    { codigo: "C", descripcion: "Superficie caravista obtenida mediante encofrado especial, enchapes en techo" },
    { codigo: "D", descripcion: "Enchape de madera o laminado, piedra o material vitrificado" },
    { codigo: "E", descripcion: "Superficie de ladrillo caravista" },
    { codigo: "F", descripcion: "Tarrageo frotachado y/o yeso moldurado, pintura lavable" },
    { codigo: "G", descripcion: "Estucado de yeso y/o barro, pintura al temple o agua" },
    { codigo: "H", descripcion: "Pintado en ladrillo rústico, placa de concreto similar" },
    { codigo: "I", descripcion: "Sin revestimiento en ladrillo, adobe o similar" },
  ] },
  { title: "Baños (6)", items: [
    { codigo: "A", descripcion: "Baños completos de lujo importado con enchape fino (adobe o similar)" },
    { codigo: "B", descripcion: "Baños completos importado con mayólica o cerámico decorativo importado" },
    { codigo: "C", descripcion: "Baños completos nacionales de color con mayólica o cerámico nacional de color" },
    { codigo: "D", descripcion: "Baño completo nacional blanco con mayólica blanca" },
    { codigo: "E", descripcion: "Baños con mayólicas blanca o parcial" },
    { codigo: "F", descripcion: "Baños blanco sin mayólica" },
    { codigo: "G", descripcion: "Sanitarios básicos de losa de segunda, fierro fundido o granito" },
    { codigo: "H", descripcion: "Pintado en ladrillo rústico, placa de concreto similar" },
    { codigo: "I", descripcion: "Sin aparatos sanitarios" },
  ] },
  { title: "Instalaciones Eléctricas y Sanitarias (7)", items: [
    { codigo: "A", descripcion: "Aire acondicionado, iluminación especial sist. Hidroneumatico agua caliente y fría, intercomunicador, alarmas ascensor, desague por bombeo, teléfono" },
    { codigo: "B", descripcion: "Sistema de bombeo de agua potable, ascensor, teléfono, agua caliente y fría" },
    { codigo: "C", descripcion: "Igual punto [B] sin ascensor" },
    { codigo: "D", descripcion: "Agua fría, agua caliente, corriente trifásica, teléfono" },
    { codigo: "E", descripcion: "Agua fría, agua caliente, corriente monofásica, teléfono" },
    { codigo: "F", descripcion: "Agua fría, corriente monofásica" },
    { codigo: "G", descripcion: "Agua fría, corriente monofásica sin emportrar" },
    { codigo: "H", descripcion: "Sin instalación eléctrica ni sanitaria" },
  ] },
];

const emptyForm: PredioForm = {
  // Ubicación
  cbtipopredio: "1",
  txtCvia: "", txtVia: "", txtCp: "", txtSector: "", txtArancel: "",
  txtDir: "", txtNro: "", txtDpto: "", txtMza: "", txtLte: "", txtSubLte: "",
  txtFrontis: "0", txtNro2: "", txtLetra: "", txtLetra2: "", txtFondo: "0",
  // Características
  cmbUso: "", cmbTipPredio: "", cmbEstadoConst: "", cmbCondicion: "",
  cmbCondicionpredio: "", cmbInterior: "", cmbSituacionPredio: "", txtNroCond: "0", txtNroPiso: "0",
  cmbTipoAdqui: "", cmbMotivoReg: "", cmbMotivoDec: "",
  txtAreaTerreno: "0", txtAreaComun: "0", txtPorcenPropiedad: "100",
  txtPorcenConstruccion: "100", txtAreaUso: "0",
  txtFecAdqui: "", txtFecTrans: "", txtLuz: "", txtAgua: "", txtObs: "",
  txtObservacionPredio: "",
  chAfectoPred: false, chbVendido: false, chbLicencia: false,
  chbConformidad: false, chbDeclaracionFab: false,
  chCalPredial: false, chCalArbitrio: false,
  // Condición especial
  txtDocEspecial: "", txtNroDocEspecial: "", txtFechDocEspecial: "",
  txtFechDocEspecialInicial: "", txtFechDocEspecialFinal: "",
  // Situación / Fiscalización
  txtSituacionDocumento: "", txtSituacionNroDoc: "", txtSituacionFechDoc: "",
  txtFechaFisca: "", txtNroFisca: "",
  // Edificio / Ingreso / Agrupamiento
  cmbTipoEdificio: "", txtNomEdificio: "", txtPiso: "", txtNumeroInterno: "",
  txtLetraInterno: "", cmbTipoIngreso: "", txtNomIngreso: "",
  cmbTipoAgrupamiento: "", txtNomAgrupamiento: "",
  // Arbitrios
  txtArbAfecto: false, cbAfectMesDesde: "", cbAfectMesHasta: "", txtArbObs: "",
  txtUbiPar: "",
  cb_limpieza: "", cb_barrido: "", cb_parque: "", cb_serenazgo: "",
  // Resumen del predio (legado: bloque superior)
  txtTerreno: "0", txtConstruccion: "0", txtInstalaciones: "0", txtAutovaluo: "0",
  txtBarrido: "", txtRecoleccion: "", txtParques: "", txtSerenazgo: "",
};

const emptyPiso: PisoRow = {
  idpisos: "", cidindi: "", nropiso: "", mescons: "", aniocons: "",
  iddepcl: "", iddepma: "", iddepco: "", esmuros: "", estecho: "", acapiso: "",
  acapuer: "", acareve: "", acabanio: "", instele: "", arconde: "0",
  uconant: "0", umedida: "", referencia: "",
};

const emptyInstal: InstalRow = {
  idinsta: "", cidindi: "", cidinst: "", cidnomb: "", mescons: "", aniocons: "",
  iddepcl: "", iddepma: "", iddepco: "", dmlargo: "", dmancho: "", dmaltos: "",
  protota: "", vunimed: "", vdescri: "", referenciainst: "",
};

const emptyDoc: DocRow = { iddoc: "", idreg: "0", docnombre: "", docdetalle: "" };

// ─── Ayudantes visuales ─────────────────────────────────

function FieldGroup({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/40 px-2.5 pb-2 pt-0.5">
      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-sat-navy">
        {icon && <>{icon}</>}
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Lbl({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
const labelClass =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-px leading-none";
const readonlyClass =
  "w-full rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-500 cursor-not-allowed";

function Inp({
  value,
  onChange,
  readOnly,
  type = "text",
  maxLength,
  placeholder,
  inputMode,
  className = "",
  onBlur,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  className?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      readOnly={readOnly}
      maxLength={maxLength}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`${inputClass} ${className}`}
    />
  );
}

function NumInp({
  value,
  onChange,
  maxLength,
  readOnly,
  className = "",
  decimal = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  maxLength?: number;
  readOnly?: boolean;
  className?: string;
  decimal?: boolean;
}) {
  // Legacy CampoDinero mask is decimal: allow digits and a single dot for decimal fields.
  const sanitize = (v: string) => {
    const cleaned = decimal ? v.replace(/[^\d.]/g, "") : v.replace(/\D/g, "");
    if (!decimal) return cleaned;
    const parts = cleaned.split(".");
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  };
  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={value}
      maxLength={maxLength ?? 14}
      readOnly={readOnly}
      onChange={(e) => onChange?.(sanitize(e.target.value))}
      className={`${inputClass} ${className}`}
    />
  );
}

function Sel({
  value,
  onChange,
  options,
  disabled,
  className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`${inputClass} ${className}`}
    >
      <option value="">Seleccionar...</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Chk({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300 accent-sat-cyan"
      />
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
    </label>
  );
}

function rellenarceros(v: string, n: number) {
  return v.padStart(n, "0").slice(-n);
}

// ═══ Modal ═══════════════════════════════════════════════

export default function PrimeraInscripcionModal({
  isOpen,
  onClose,
  codigoContribuyente,
  razonSocial,
  annoSeleccionado,
  tipoMov = "N",
  onSaved,
}: Props) {
  const modalId = useModalStack(isOpen);
  const topModal = isTopModal(modalId);
  const rootRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [combos, setCombos] = useState<PredioCombosData | null>(null);
  const [combosLoading, setCombosLoading] = useState(false);
  const [viaModalOpen, setViaModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  // Claves del predio (legado: Cod. Predio / Anexo-SubAnexo; vacías en alta 'N')
  const [codPred, setCodPred] = useState("");
  const [anexo, setAnexo] = useState("");
  const [subAnexo, setSubAnexo] = useState("");
  const [fechaMod, setFechaMod] = useState("");

  const [f, setF] = useState<PredioForm>(emptyForm);
  const [pisos, setPisos] = useState<PisoRow[]>([]);
  const [pisosEditing, setPisosEditing] = useState<number | null>(null);
  const [instal, setInstal] = useState<InstalRow[]>([]);
  const [instalEditing, setInstalEditing] = useState<number | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docsEditing, setDocsEditing] = useState<number | null>(null);
  const [operador, setOperador] = useState("");
  const [estacion, setEstacion] = useState("");
  const [refTiposOpen, setRefTiposOpen] = useState(false);
  const [valorPiso, setValorPiso] = useState<ValorPisoResult | { incomplete: true } | null>(null);

  // ── Carga inicial ──
  useEffect(() => {
    if (!isOpen) return;
    setF(emptyForm);
    setPisos([]); setPisosEditing(null);
    setInstal([]); setInstalEditing(null);
    setDocs([]); setDocsEditing(null);
    setActiveTab(0);
    setSaveMessage(null); setSaving(false);
    setCodPred(""); setAnexo(""); setSubAnexo(""); setFechaMod("");
    setValorPiso(null);

    const user = getStoredUser();
    setOperador(user?.username ?? "");
    checkSessionAction().then((s) => setEstacion(s?.hostname ?? ""));

    let cancelled = false;
    setCombosLoading(true);
    getCombosPredioAction(annoSeleccionado).then((res) => {
      if (cancelled) return;
      if (res.success) setCombos(res.data);
      else setSaveMessage({ type: "error", text: res.error });
    }).finally(() => {
      if (!cancelled) setCombosLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, annoSeleccionado]);

  // Ocultar tab Construcciones si el predio es sin construcción (estado = '01')
  useEffect(() => {
    if (f.cmbEstadoConst === "01" && activeTab === 2) setActiveTab(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.cmbEstadoConst]);

  // Escape cierra solo si este modal es el tope de la pila
  useEffect(() => {
    if (!isOpen || !topModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !combosLoading && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, topModal, combosLoading, saving, onClose]);

  // Foco al abrirse
  useEffect(() => {
    if (isOpen) rootRef.current?.focus();
  }, [isOpen]);

  const visibleTabs = TABS.filter((_, i) => !(i === 2 && f.cmbEstadoConst === "01"));
  const annoNum = parseInt(annoSeleccionado, 10) || 0;
  // Σ Area Construcción del grid de pisos (legado: areaconst_total en loadGridConst)
  const areaConstTotal = pisos.reduce((a, p) => a + (Number(p.arconde) || 0), 0).toFixed(2);

  // ── Vía ──
  const handleViaSelect = (via: MviaItem) => {
    setF((prev) => ({
      ...prev,
      txtCvia: via.codVia,
      txtVia: via.via,
      txtCp: via.urbanizacion,
      txtSector: via.zona,
      txtArancel: via.arancel,
    }));
  };

  // ── Validaciones ──
  const validarGuardar = (): string | null => {
    if (!f.cmbUso) return "Debe Seleccionar Tipo del Predio";
    if (!f.txtObservacionPredio || f.txtObservacionPredio.trim().length < 10)
      return "Debe Ingresar una Observación y debe ser mayor a 10 caracteres";
    if (!f.cmbEstadoConst) return "Debe Seleccionar Estado de Construccion del Predio";
    if (!f.cmbCondicion) return "Debe Seleccionar Condicion de la Propiedad del Predio";
    if (!f.txtAreaTerreno || Number(f.txtAreaTerreno) <= 0)
      return "Debe Ingresar el Area de Terreno del Predio";
    if (!f.txtAreaComun || Number(f.txtAreaComun) <= 0)
      return "Debe Ingresar un Valor al Area Comun";
    if (!f.txtPorcenPropiedad) return "Debe Ingresar Porcentage de la Propiedad";
    if (Number(f.txtPorcenPropiedad) < 0 || Number(f.txtPorcenPropiedad) > 100)
      return "El % de Propiedad debe estar entre 0 y 100";
    if (Number(f.txtPorcenConstruccion) < 0 || Number(f.txtPorcenConstruccion) > 100)
      return "El % de Construcción debe estar entre 0 y 100";
    if (f.txtArbAfecto) {
      if (!f.cbAfectMesDesde) return "Debe Seleccionar Mes de Inicio para Arbitrios";
      if (!f.cbAfectMesHasta) return "Debe Seleccionar Mes Final para Arbitrios";
      if (Number(f.cbAfectMesDesde) - Number(f.cbAfectMesHasta) > 0)
        return "El Ultimo Mes de Afectacion no puede ser menor al mes inicial";
    }
    if (!f.cb_limpieza) return "Debe Seleccionar uso para Limpieza Publica";
    if (!f.cb_barrido) return "Debe Seleccionar uso para Relleno Sanitario";
    if (!f.cb_parque && annoNum >= 2005)
      return "Debe Seleccionar uso para Parques y Jardines";
    if (!f.cb_serenazgo) return "Debe Seleccionar uso para Serenazgo";
    return null;
  };

  const validarPiso = (p: PisoRow): string | null => {
    if (!p.nropiso.trim() || p.nropiso.trim() === "000") return "Debe Ingresar un Nivel que no sea 0";
    if (!p.cidindi) return "Debe Seleccionar un Tipo de Nivel";
    if (!p.iddepcl) return "Debe Seleccionar un Tipo de Construcción";
    if (!p.iddepma) return "Debe Seleccionar un Tipo de Materiales";
    if (!p.iddepco) return "Debe Seleccionar un Tipo de Estado de Depreciación";
    if (!p.aniocons.trim() || Number(p.aniocons) <= 0) return "Debe Ingresar el Año de Construcción";
    if (!p.esmuros) return "Debe Ingresar el Tipo de Edificación para Muros";
    if (!p.estecho) return "Debe Ingresar el Tipo de Edificación para Techos";
    if (!p.acapiso && annoNum < 2024) return "Debe Ingresar el Tipo de Edificación para Piso < 2024";
    if (!p.acapuer) return "Debe Ingresar el Tipo de Edificación para Puertas";
    if (!p.acareve && annoNum < 2024)
      return "Debe Ingresar el Tipo de Edificación para Revestimientos";
    if (!p.acabanio && annoNum < 2024) return "Debe Ingresar el Tipo de Edificación para Baño";
    if (!p.instele && annoNum < 2024)
      return "Debe Ingresar el Tipo de Edificación para Instalaciones";
    if (!p.arconde.trim() || Number(p.arconde) <= 0) return "Debe Ingresar el Area de Construcción";
    if (!p.uconant.trim()) return "Debe Ingresar el Area Comun Construida";
    return null;
  };

  const validarInstal = (i: InstalRow): string | null => {
    if (!i.cidinst) return "Debe seleccionar una instalación";
    if (!i.iddepcl) return "Debe seleccionar el tipo de clasificación";
    if (!i.iddepma) return "Debe seleccionar el tipo de materiales";
    if (!i.iddepco) return "Debe seleccionar el estado de depreciación";
    if (!i.dmaltos) return "Debe ingresar el alto de la instalación";
    if (!i.dmlargo) return "Debe ingresar el largo de la instalación";
    if (!i.dmancho) return "Debe ingresar el ancho de la instalación";
    if (!i.aniocons) return "Debe ingresar el año de la instalación";
    if (!i.protota) return "Debe ingresar la cantidad de la instalación";
    return null;
  };

  // ── Grids ──
  const addPiso = () => {
    const err = validarPiso(fPiso);
    if (err) { setSaveMessage({ type: "error", text: `Piso: ${err}` }); return; }
    if (pisosEditing !== null) {
      setPisos((prev) => prev.map((p, i) => (i === pisosEditing ? fPiso : p)));
      setPisosEditing(null);
    } else {
      setPisos((prev) => [...prev, { ...fPiso, idpisos: "" }]);
    }
    setFPiso(emptyPiso);
    setSaveMessage(null);
  };

  const addInstal = () => {
    const err = validarInstal(fInstal);
    if (err) { setSaveMessage({ type: "error", text: `Instalación: ${err}` }); return; }
    if (instalEditing !== null) {
      setInstal((prev) => prev.map((p, i) => (i === instalEditing ? fInstal : p)));
      setInstalEditing(null);
    } else {
      setInstal((prev) => [...prev, { ...fInstal }]);
    }
    setFInstal(emptyInstal);
    setSaveMessage(null);
  };

  const addDoc = () => {
    if (!fDoc.docnombre.trim()) { setSaveMessage({ type: "error", text: "Ingresá el nombre del documento" }); return; }
    if (docsEditing !== null) {
      setDocs((prev) => prev.map((p, i) => (i === docsEditing ? fDoc : p)));
      setDocsEditing(null);
    } else {
      setDocs((prev) => [...prev, { ...fDoc, idreg: "0" }]);
    }
    setFDoc(emptyDoc);
    setSaveMessage(null);
  };

  // Form states para cada grilla (vía useState separados)
  const [fPiso, setFPiso] = useState<PisoRow>(emptyPiso);
  const [fInstal, setFInstal] = useState<InstalRow>(emptyInstal);
  const [fDoc, setFDoc] = useState<DocRow>(emptyDoc);

  const onDetalleInstalChange = (value: string) => {
    const parts = value.split("-");
    const label = combos?.detalle_inst.find((o) => o.value === value)?.label ?? "";
    setFInstal((prev) => ({
      ...prev,
      cidinst: parts[0] ?? "",
      vunimed: parts[1] ?? "",
      cidnomb: label,
    }));
  };

  // ── Guardar ──
  const grabar = async () => {
    if (saving) return;
    const err = validarGuardar();
    if (err) { setSaveMessage({ type: "error", text: err }); return; }
    setSaving(true);
    setSaveMessage(null);

    const ch = (v: boolean) => (v ? "1" : "");
    const payload = {
      tipo_mov: tipoMov,
      codigo: codigoContribuyente,
      anno: annoSeleccionado,
      operador,
      estacion,
      hd_codigo: codigoContribuyente,
      hd_idanexo: "", hd_anexo: "", hd_subanexo: "",
      hd_codigo2: "", hd_idanexo2: "", hd_anexo2: "", hd_subanexo2: "",
      cbtipopredio: f.cbtipopredio,
      txtCvia: f.txtCvia, txtVia: f.txtVia, txtCp: f.txtCp, txtSector: f.txtSector,
      txtArancel: f.txtArancel, txtDir: f.txtDir, txtNro: f.txtNro, txtDpto: f.txtDpto,
      txtMza: f.txtMza, txtLte: f.txtLte, txtSubLte: f.txtSubLte, txtFrontis: f.txtFrontis,
      txtNro2: f.txtNro2, txtLetra: f.txtLetra, txtLetra2: f.txtLetra2, txtFondo: f.txtFondo,
      txtUbiPar: f.txtUbiPar,
      cmbUso: f.cmbUso, cmbTipPredio: f.cmbTipPredio, cmbEstadoConst: f.cmbEstadoConst,
      cmbCondicion: f.cmbCondicion, cmbCondicionpredio: f.cmbCondicionpredio,
      cmbInterior: f.cmbInterior, cmbSituacionPredio: f.cmbSituacionPredio,
      txtNroCond: f.txtNroCond,
      txtAreaTerreno: f.txtAreaTerreno, txtAreaComun: f.txtAreaComun,
      txtPorcenPropiedad: f.txtPorcenPropiedad, txtPorcenConstruccion: f.txtPorcenConstruccion,
      txtAreaUso: f.txtAreaUso,
      txtFecAdqui: f.txtFecAdqui, txtFecTrans: f.txtFecTrans,
      txtLuz: f.txtLuz, txtAgua: f.txtAgua, txtObs: f.txtObs,
      txtObservacionPredio: f.txtObservacionPredio,
      chAfectoPred: ch(f.chAfectoPred), chbVendido: ch(f.chbVendido),
      chbLicencia: ch(f.chbLicencia), chbConformidad: ch(f.chbConformidad),
      chbDeclaracionFab: ch(f.chbDeclaracionFab),
      chCalPredial: ch(f.chCalPredial), chCalArbitrio: ch(f.chCalArbitrio),
      txtDocEspecial: f.txtDocEspecial, txtNroDocEspecial: f.txtNroDocEspecial,
      txtFechDocEspecial: f.txtFechDocEspecial,
      txtFechDocEspecialInicial: f.txtFechDocEspecialInicial,
      txtFechDocEspecialFinal: f.txtFechDocEspecialFinal,
      txtSituacionDocumento: f.txtSituacionDocumento,
      txtSituacionNroDoc: f.txtSituacionNroDoc,
      txtSituacionFechDoc: f.txtSituacionFechDoc,
      txtFechaFisca: f.txtFechaFisca, txtNroFisca: f.txtNroFisca,
      cmbTipoEdificio: f.cmbTipoEdificio, txtNomEdificio: f.txtNomEdificio,
      txtPiso: f.txtPiso, txtNumeroInterno: f.txtNumeroInterno,
      txtLetraInterno: f.txtLetraInterno, cmbTipoIngreso: f.cmbTipoIngreso,
      txtNomIngreso: f.txtNomIngreso, cmbTipoAgrupamiento: f.cmbTipoAgrupamiento,
      txtNomAgrupamiento: f.txtNomAgrupamiento,
      cb_limpieza: f.cb_limpieza, cb_barrido: f.cb_barrido, cb_parque: f.cb_parque,
      cb_serenazgo: f.cb_serenazgo,
      txtArbAfecto: ch(f.txtArbAfecto),
      cbAfectMesDesde: f.cbAfectMesDesde, cbAfectMesHasta: f.cbAfectMesHasta,
      txtArbObs: f.txtArbObs,
      Const: pisos, Instal: instal, Doc: docs,
    };

    const res = await guardarPredioAction(payload);
    setSaving(false);
    if (!res.success) { setSaveMessage({ type: "error", text: res.error }); return; }
    setSaveMessage({ type: "success", text: res.data.mensaje });
    setCodPred(res.data.codPred ?? "");
    setAnexo(res.data.anexo ?? "");
    setSubAnexo(res.data.subAnexo ?? "");
    // Reload the three grids from persisted data (legacy gridpisos/gridinstal/griddoc)
    await loadGrids(res.data.codigo, res.data.codPred, res.data.anexo, res.data.subAnexo);
    setTimeout(() => {
      onSaved?.();
      onClose();
    }, 1500);
  };

  // Reload pisos / instalaciones / documentos from the server after a save.
  // Each grid keeps its existing rows on failure and surfaces a non-blocking warning.
  // Piso valuation (legacy itemclick → Rentas/valorpiso). Incomplete hides the panel
  // and surfaces the legacy's alert message as a transient info notice.
  const fetchValorPiso = async (p: PisoRow) => {
    const res = await getValorPisoAction({
      nivel: p.nropiso, idDepcla: p.iddepcl, idDepmat: p.iddepma, idDepcon: p.iddepco,
      muros: p.esmuros, techos: p.estecho, pisos: p.acapiso, puertas: p.acapuer,
      revestim: p.acareve, banos: p.acabanio, instElect: p.instele,
      areaConst: p.arconde, areaComun: p.uconant, anoc: p.aniocons, anno: annoSeleccionado,
    });
    if (!res.success) { setValorPiso(null); return; }
    if ('incomplete' in res.data) {
      setValorPiso(null);
      setSaveMessage({ type: "info", text: "Datos Incompletos para Visualizar el Valor del Piso" });
      return;
    }
    setValorPiso(res.data);
  };

  const loadGrids = async (codigo: string, codPred: string, anexo: string, subAnexo: string) => {
    const params = { codigo, anno: annoSeleccionado, codPred, anexo, subAnexo };
    const [pisosRes, instalRes, docsRes] = await Promise.all([
      getPredioPisosAction(params),
      getPredioInstalacionesAction(params),
      getPredioDocumentosAction(params),
    ]);
    if (pisosRes.success) {
      setPisos(pisosRes.data);
      setFPiso(emptyPiso);
      setPisosEditing(null);
    } else {
      console.warn("loadGrids pisos:", pisosRes.error);
    }
    if (instalRes.success) {
      setInstal(instalRes.data);
      setFInstal(emptyInstal);
      setInstalEditing(null);
    } else {
      console.warn("loadGrids instalaciones:", instalRes.error);
    }
    if (docsRes.success) {
      setDocs(docsRes.data);
      setFDoc(emptyDoc);
      setDocsEditing(null);
    } else {
      console.warn("loadGrids documentos:", docsRes.error);
    }
    if (!pisosRes.success || !instalRes.success || !docsRes.success) {
      setSaveMessage({ type: "error", text: "Se guardó, pero no se pudieron recargar todas las grillas." });
    }
  };

  // ── Limpiar formularios de grilla ──
  const cancelPiso = () => { setFPiso(emptyPiso); setPisosEditing(null); setSaveMessage(null); };
  const cancelInstal = () => { setFInstal(emptyInstal); setInstalEditing(null); setSaveMessage(null); };
  const cancelDoc = () => { setFDoc(emptyDoc); setDocsEditing(null); setSaveMessage(null); };

  // ── Rústicos / Inquilinos (legado: AgregarRustico / AgregarInquilino) ──
  // Los popups rentas/rustico y rentas/inquilino aún no están migrados: se replica
  // el aviso del legado cuando el predio no está guardado.
  const abrirRusticos = () => {
    if (!codPred) {
      setSaveMessage({ type: "info", text: "Debe registrar el predio antes de ingresar caracteristicas de PR!" });
      return;
    }
    setSaveMessage({ type: "info", text: "El módulo de Rústicos aún no está migrado." });
  };
  const abrirInquilinos = () => {
    if (!codPred) {
      setSaveMessage({ type: "info", text: "Debe registrar el predio antes de registrar inquilinos!" });
      return;
    }
    setSaveMessage({ type: "info", text: "El módulo de Inquilinos aún no está migrado." });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onKeyDown={(e) => { if (e.key === "Escape") { if (topModal && !combosLoading && !saving) onClose(); } }}
      tabIndex={-1}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-[1200px] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 rounded-full bg-sat-cyan" />
            <FileText size={14} className="text-sat-cyan" />
            <h2 className="font-outfit text-sm font-bold tracking-tight text-white">
              1ra. Inscripción — Predio Nuevo
            </h2>
            <span className="ml-1 text-[10px] text-white/50">— {codigoContribuyente}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Datos del contribuyente + resumen del predio (legado: bloque superior) */}
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/60 px-4 py-2">
            <div className="grid grid-cols-6 gap-x-3 gap-y-1 text-[11px]">
              <div>
                <Lbl>Código</Lbl>
                <div className="font-mono font-semibold text-slate-700">{codigoContribuyente}</div>
              </div>
              <div className="col-span-2">
                <Lbl>Contribuyente</Lbl>
                <div className="text-slate-700 truncate">{razonSocial}</div>
              </div>
              <div>
                <Lbl>Cod. Predio</Lbl>
                <div className="font-mono text-slate-700">{codPred || "—"}</div>
              </div>
              <div>
                <Lbl>Anexo</Lbl>
                <div className="font-mono text-slate-700">{anexo || subAnexo ? `${anexo}-${subAnexo}` : "—"}</div>
              </div>
              <div>
                <Lbl>Año</Lbl>
                <div className="font-mono text-slate-700">{annoSeleccionado}</div>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-x-3 gap-y-1 text-[11px]">
              <div>
                <Lbl>Vía</Lbl>
                <Inp value={f.txtVia} readOnly className="font-mono" placeholder="—" />
              </div>
              <div>
                <Lbl>C. Via</Lbl>
                <Inp value={f.txtCvia} readOnly className="font-mono" placeholder="—" />
              </div>
              <div>
                <Lbl>Arancel</Lbl>
                <Inp value={f.txtArancel} readOnly placeholder="0" />
              </div>
              <div>
                <Lbl>V. Terreno</Lbl>
                <Inp value={f.txtTerreno} readOnly placeholder="0" />
              </div>
              <div>
                <Lbl>V. Construcción</Lbl>
                <Inp value={f.txtConstruccion} readOnly placeholder="0" />
              </div>
              <div>
                <Lbl>V. Instalaciones</Lbl>
                <Inp value={f.txtInstalaciones} readOnly placeholder="0" />
              </div>
              <div>
                <Lbl>Autovalúo</Lbl>
                <Inp value={f.txtAutovaluo} readOnly placeholder="0" />
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-x-3 gap-y-1 text-[11px]">
              <div>
                <Lbl>Barrido</Lbl>
                <Inp value={f.txtBarrido} readOnly placeholder="—" />
              </div>
              <div>
                <Lbl>Recolección</Lbl>
                <Inp value={f.txtRecoleccion} readOnly placeholder="—" />
              </div>
              <div>
                <Lbl>Parques</Lbl>
                <Inp value={f.txtParques} readOnly placeholder="—" />
              </div>
              <div>
                <Lbl>Serenazgo</Lbl>
                <Inp value={f.txtSerenazgo} readOnly placeholder="—" />
              </div>
              <div>
                <Lbl>Area Const.</Lbl>
                <Inp value={areaConstTotal} readOnly />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-2">
            <div className="flex overflow-x-auto">
              {visibleTabs.map((tab, i) => {
                const realIndex = TABS.indexOf(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(realIndex)}
                    className={`px-3 py-2 text-[11px] font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === realIndex
                        ? "border-sat-cyan text-sat-navy"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {combosLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-sat-cyan" />
                <span className="ml-2 text-xs text-slate-500">Cargando combos del predio...</span>
              </div>
            )}

            {!combosLoading && activeTab === 0 && (
              <>
                <FieldGroup title="Ubicación de Predio">
                  <div className="grid grid-cols-6 gap-2">
                    <div>
                      <Lbl>Tipo Predio</Lbl>
                      <Sel value={f.cbtipopredio} onChange={(v) => setF({ ...f, cbtipopredio: v })} options={[{ value: "1", label: "Predio Urbano" }, { value: "2", label: "Predio Rustico" }]} />
                    </div>
                    <div className="col-span-2">
                      <Lbl>Vía</Lbl>
                      <div className="flex gap-1">
                        <Inp value={f.txtVia} readOnly className="font-mono" placeholder="Buscar vía" />
                        <button
                          type="button"
                          onClick={() => setViaModalOpen(true)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sat-amber px-2 py-1 text-[10px] font-medium text-white transition hover:bg-[#d98707] disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                          <MapPin size={11} /> Buscar
                        </button>
                      </div>
                    </div>
                    <div>
                      <Lbl>C. Vía</Lbl>
                      <Inp value={f.txtCvia} readOnly className="font-mono" placeholder="—" />
                    </div>
                    <div>
                      <Lbl>C. Urbana</Lbl>
                      <Inp value={f.txtCp} readOnly placeholder="—" />
                    </div>
                    <div>
                      <Lbl>Sector</Lbl>
                      <Inp value={f.txtSector} readOnly placeholder="—" />
                    </div>
                    <div>
                      <Lbl>Referencia / Dirección</Lbl>
                      <Inp value={f.txtDir} onChange={(v) => setF({ ...f, txtDir: v.toUpperCase() })} placeholder="Referencia" />
                    </div>
                    <div>
                      <Lbl>Nro.</Lbl>
                      <Inp value={f.txtNro} onChange={(v) => setF({ ...f, txtNro: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Mza</Lbl>
                      <Inp value={f.txtMza} onChange={(v) => setF({ ...f, txtMza: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Lote</Lbl>
                      <Inp value={f.txtLte} onChange={(v) => setF({ ...f, txtLte: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Sub Lote</Lbl>
                      <Inp value={f.txtSubLte} onChange={(v) => setF({ ...f, txtSubLte: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Dpto</Lbl>
                      <Inp value={f.txtDpto} onChange={(v) => setF({ ...f, txtDpto: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Nro. 2</Lbl>
                      <Inp value={f.txtNro2} onChange={(v) => setF({ ...f, txtNro2: v.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                      <Lbl>Letra</Lbl>
                      <Inp value={f.txtLetra} onChange={(v) => setF({ ...f, txtLetra: v.toUpperCase() })} maxLength={1} />
                    </div>
                    <div>
                      <Lbl>Letra 2</Lbl>
                      <Inp value={f.txtLetra2} onChange={(v) => setF({ ...f, txtLetra2: v.toUpperCase() })} maxLength={1} />
                    </div>
                    <div>
                      <Lbl>Fondo</Lbl>
                      <NumInp value={f.txtFondo} onChange={(v) => setF({ ...f, txtFondo: v })} />
                    </div>
                    <div>
                      <Lbl>Frontis</Lbl>
                      <NumInp value={f.txtFrontis} onChange={(v) => setF({ ...f, txtFrontis: v })} decimal />
                    </div>
                  </div>
                </FieldGroup>
                <FieldGroup title="Edificio / Ingreso / Agrupamiento">
                  <div className="grid grid-cols-4 gap-2">
                    <div><Lbl>Tipo Edificación</Lbl><Sel value={f.cmbTipoEdificio} onChange={(v) => setF({ ...f, cmbTipoEdificio: v })} options={combos?.cmbTipoEdificio ?? []} /></div>
                    <div><Lbl>Nombre Edificio</Lbl><Inp value={f.txtNomEdificio} onChange={(v) => setF({ ...f, txtNomEdificio: v.toUpperCase() })} maxLength={60} /></div>
                    <div><Lbl>Piso</Lbl><NumInp value={f.txtPiso} onChange={(v) => setF({ ...f, txtPiso: v })} /></div>
                    <div><Lbl>Nro. Interno</Lbl><Inp value={f.txtNumeroInterno} onChange={(v) => setF({ ...f, txtNumeroInterno: v.toUpperCase() })} maxLength={20} /></div>
                    <div><Lbl>Letra Interno</Lbl><Inp value={f.txtLetraInterno} onChange={(v) => setF({ ...f, txtLetraInterno: v.toUpperCase() })} maxLength={1} /></div>
                    <div><Lbl>Tipo Ingreso</Lbl><Sel value={f.cmbTipoIngreso} onChange={(v) => setF({ ...f, cmbTipoIngreso: v })} options={combos?.cmbTipoIngreso ?? []} /></div>
                    <div><Lbl>Nombre Ingreso</Lbl><Inp value={f.txtNomIngreso} onChange={(v) => setF({ ...f, txtNomIngreso: v.toUpperCase() })} maxLength={60} /></div>
                    <div><Lbl>Tipo Agrupamiento</Lbl><Sel value={f.cmbTipoAgrupamiento} onChange={(v) => setF({ ...f, cmbTipoAgrupamiento: v })} options={combos?.cmbTipoAgrupamiento ?? []} /></div>
                    <div className="col-span-4"><Lbl>Nombre Agrupamiento</Lbl><Inp value={f.txtNomAgrupamiento} onChange={(v) => setF({ ...f, txtNomAgrupamiento: v.toUpperCase() })} maxLength={60} /></div>
                  </div>
                </FieldGroup>
              </>
            )}

            {!combosLoading && activeTab === 1 && (
              <>
                <FieldGroup title="Características del Predio">
                  <div className="grid grid-cols-4 gap-2">
                    <div><Lbl>Uso Predio</Lbl><Sel value={f.cmbUso} onChange={(v) => setF({ ...f, cmbUso: v })} options={combos?.cmbUso ?? []} /></div>
                    <div><Lbl>Tipo Predio</Lbl><Sel value={f.cmbTipPredio} onChange={(v) => setF({ ...f, cmbTipPredio: v })} options={combos?.cmbTipPredio ?? []} /></div>
                    <div><Lbl>Estado Construcción</Lbl><Sel value={f.cmbEstadoConst} onChange={(v) => setF({ ...f, cmbEstadoConst: v })} options={combos?.cmbEstadoConst ?? []} /></div>
                    <div><Lbl>Condición Propiedad</Lbl><Sel value={f.cmbCondicion} onChange={(v) => setF({ ...f, cmbCondicion: v })} options={combos?.cmbCondicion ?? []} /></div>
                    <div><Lbl>Cond. Predio</Lbl><Sel value={f.cmbCondicionpredio} onChange={(v) => setF({ ...f, cmbCondicionpredio: v })} options={combos?.cmbCondicionpredio ?? []} /></div>
                    <div><Lbl>Tipo Interior</Lbl><Sel value={f.cmbInterior} onChange={(v) => setF({ ...f, cmbInterior: v })} options={combos?.cmbInterior ?? []} /></div>
                    <div><Lbl>Situación Predio</Lbl><Sel value={f.cmbSituacionPredio} onChange={(v) => setF({ ...f, cmbSituacionPredio: v })} options={combos?.cmbSituacionPredio ?? []} /></div>
                    <div><Lbl>Nro. Condominantes</Lbl>
                      <Inp value={f.txtNroCond} readOnly={f.cmbCondicion !== "05"} onChange={(v) => setF({ ...f, txtNroCond: v.replace(/\D/g, "") })} inputMode="numeric" className={f.cmbCondicion !== "05" ? "bg-slate-50" : ""} />
                    </div>
                    <div><Lbl>Nro. Pisos</Lbl><Inp value={f.txtNroPiso} readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Área Terreno (m²)</Lbl><NumInp value={f.txtAreaTerreno} onChange={(v) => setF({ ...f, txtAreaTerreno: v })} decimal /></div>
                    <div><Lbl>Área Común (m²)</Lbl><NumInp value={f.txtAreaComun} onChange={(v) => setF({ ...f, txtAreaComun: v })} decimal /></div>
                    <div><Lbl>% Propiedad</Lbl><NumInp value={f.txtPorcenPropiedad} onChange={(v) => setF({ ...f, txtPorcenPropiedad: v })} decimal maxLength={6} /></div>
                    <div><Lbl>% Construcción</Lbl><NumInp value={f.txtPorcenConstruccion} onChange={(v) => setF({ ...f, txtPorcenConstruccion: v })} decimal maxLength={6} /></div>
                    <div><Lbl>Área Uso (m²)</Lbl><NumInp value={f.txtAreaUso} onChange={(v) => setF({ ...f, txtAreaUso: v })} decimal /></div>
                    <div><Lbl>Fec. Compra</Lbl><input type="date" value={f.txtFecAdqui} onChange={(e) => setF({ ...f, txtFecAdqui: e.target.value })} className={inputClass} /></div>
                    <div><Lbl>Fec. Transferencia</Lbl><input type="date" value={f.txtFecTrans} onChange={(e) => setF({ ...f, txtFecTrans: e.target.value })} className={inputClass} /></div>
                    <div><Lbl>Suministro Luz</Lbl><Inp value={f.txtLuz} onChange={(v) => setF({ ...f, txtLuz: v.toUpperCase() })} maxLength={60} /></div>
                    <div><Lbl>Suministro Agua</Lbl><Inp value={f.txtAgua} onChange={(v) => setF({ ...f, txtAgua: v.toUpperCase() })} maxLength={60} /></div>
                  </div>
                </FieldGroup>
                <FieldGroup title="Observación" icon={<span className="text-[10px] text-red-400">Debe ser mayor a 10 caracteres</span>}>
                  <textarea
                    value={f.txtObservacionPredio}
                    onChange={(e) => setF({ ...f, txtObservacionPredio: e.target.value.toUpperCase() })}
                    maxLength={400}
                    className={`${inputClass} min-h-[60px] resize-y`}
                    placeholder="Observación obligatoria (mínimo 10 caracteres)"
                  />
                </FieldGroup>
                <FieldGroup title="Observaciones Generales">
                  <Inp value={f.txtObs} onChange={(v) => setF({ ...f, txtObs: v.toUpperCase() })} maxLength={400} placeholder="Observación general" />
                </FieldGroup>
                <FieldGroup title="Condición Especial">
                  <div className="grid grid-cols-4 gap-2">
                    <div><Lbl>Tipo Doc. Especial</Lbl><Inp value={f.txtDocEspecial} onChange={(v) => setF({ ...f, txtDocEspecial: v.toUpperCase() })} /></div>
                    <div><Lbl>Nro. Doc. Especial</Lbl><Inp value={f.txtNroDocEspecial} onChange={(v) => setF({ ...f, txtNroDocEspecial: v.toUpperCase() })} /></div>
                    <div><Lbl>Fecha Doc. Especial</Lbl><input type="date" value={f.txtFechDocEspecial} onChange={(e) => setF({ ...f, txtFechDocEspecial: e.target.value })} className={inputClass} /></div>
                    <div><Lbl>Fecha Inicio</Lbl><input type="date" value={f.txtFechDocEspecialInicial} onChange={(e) => setF({ ...f, txtFechDocEspecialInicial: e.target.value })} className={inputClass} /></div>
                    <div className="col-span-2"><Lbl>Fecha Fin</Lbl><input type="date" value={f.txtFechDocEspecialFinal} onChange={(e) => setF({ ...f, txtFechDocEspecialFinal: e.target.value })} className={inputClass} /></div>
                  </div>
                </FieldGroup>
                <FieldGroup title="Situación del Predio / Fiscalización">
                  <div className="grid grid-cols-4 gap-2">
                    <div><Lbl>Situación Predio</Lbl><Inp value={f.txtSituacionDocumento} onChange={(v) => setF({ ...f, txtSituacionDocumento: v.toUpperCase() })} /></div>
                    <div><Lbl>Situación Nro. Doc</Lbl><Inp value={f.txtSituacionNroDoc} onChange={(v) => setF({ ...f, txtSituacionNroDoc: v.toUpperCase() })} /></div>
                    <div><Lbl>Situación Fecha</Lbl><input type="date" value={f.txtSituacionFechDoc} onChange={(e) => setF({ ...f, txtSituacionFechDoc: e.target.value })} className={inputClass} /></div>
                    <div><Lbl>Fiscalización</Lbl><Inp value={f.txtFechaFisca} onChange={(v) => setF({ ...f, txtFechaFisca: v.toUpperCase() })} /></div>
                    <div><Lbl>Nro. Fiscalización</Lbl><Inp value={f.txtNroFisca} onChange={(v) => setF({ ...f, txtNroFisca: v.toUpperCase() })} /></div>
                  </div>
                </FieldGroup>
                <FieldGroup title="Adquisición / Verificaciones">
                  <div className="grid grid-cols-4 gap-2">
                    <div><Lbl>Tipo Adquisición</Lbl><Sel value={f.cmbTipoAdqui} onChange={(v) => setF({ ...f, cmbTipoAdqui: v })} options={combos?.cmbTipoAdqui ?? []} /></div>
                    <div><Lbl>Motivo Régimen</Lbl><Sel value={f.cmbMotivoReg} onChange={(v) => setF({ ...f, cmbMotivoReg: v })} options={combos?.cmbMotivoReg ?? []} /></div>
                    <div><Lbl>Motivo Declaración</Lbl><Sel value={f.cmbMotivoDec} onChange={(v) => setF({ ...f, cmbMotivoDec: v })} options={combos?.cmbMotivoDec ?? []} /></div>
                  </div>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    <Chk label="Afecto Predial" checked={f.chAfectoPred} onChange={(v) => setF({ ...f, chAfectoPred: v })} />
                    <Chk label="Licencia Conformidad" checked={f.chbLicencia} onChange={(v) => setF({ ...f, chbLicencia: v })} />
                    <Chk label="Conformidad Obra" checked={f.chbConformidad} onChange={(v) => setF({ ...f, chbConformidad: v })} />
                    <Chk label="Declaración Fábrica" checked={f.chbDeclaracionFab} onChange={(v) => setF({ ...f, chbDeclaracionFab: v })} />
                    <Chk label="Vendido" checked={f.chbVendido} onChange={(v) => setF({ ...f, chbVendido: v })} />
                    <Chk label="Calcular Predial" checked={f.chCalPredial} onChange={(v) => setF({ ...f, chCalPredial: v })} />
                    <Chk label="Calcular Arbitrios" checked={f.chCalArbitrio} onChange={(v) => setF({ ...f, chCalArbitrio: v })} />
                  </div>
                </FieldGroup>
              </>
            )}

            {!combosLoading && activeTab === 2 && (
              <FieldGroup title="Construcciones / Pisos">
                <div className="grid grid-cols-8 gap-2 mb-2 items-end">
                  <div><Lbl>Nivel</Lbl><NumInp value={fPiso.nropiso} onChange={(v) => setFPiso({ ...fPiso, nropiso: rellenarceros(v, 3) })} maxLength={3} /></div>
                  <div><Lbl>Tipo Nivel</Lbl><Sel value={fPiso.cidindi} onChange={(v) => setFPiso({ ...fPiso, cidindi: v })} options={combos?.cb_tiponivel ?? []} /></div>
                  <div><Lbl>Mes</Lbl><NumInp value={fPiso.mescons} onChange={(v) => setFPiso({ ...fPiso, mescons: rellenarceros(v, 2) })} maxLength={2} /></div>
                  <div><Lbl>Año</Lbl><NumInp value={fPiso.aniocons} onChange={(v) => setFPiso({ ...fPiso, aniocons: v })} /></div>
                  <div><Lbl>Clasif.</Lbl><Sel value={fPiso.iddepcl} onChange={(v) => setFPiso({ ...fPiso, iddepcl: v })} options={combos?.cb_clasifica ?? []} /></div>
                  <div><Lbl>Material</Lbl><Sel value={fPiso.iddepma} onChange={(v) => setFPiso({ ...fPiso, iddepma: v })} options={combos?.cb_material ?? []} /></div>
                  <div><Lbl>Estado</Lbl><Sel value={fPiso.iddepco} onChange={(v) => setFPiso({ ...fPiso, iddepco: v })} options={combos?.cb_estado ?? []} /></div>
                  <div className="col-span-2">
                    <Lbl>7 tipos edificación (1-9)</Lbl>
                    <div className="grid grid-cols-7 gap-1">
                      {([
                        ["Muros", "esmuros"], ["Techos", "estecho"], ["Pisos", "acapiso"], ["Puertas", "acapuer"],
                        ["Revestim.", "acareve"], ["Baño", "acabanio"], ["Instal.", "instele"],
                      ] as [string, keyof PisoRow][]).map(([label, field]) => (
                        <div key={field}>
                          <NumInp value={fPiso[field]} onChange={(v) => setFPiso({ ...fPiso, [field]: v })} className="h-7" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div><Lbl>Área Const.</Lbl><NumInp value={fPiso.arconde} onChange={(v) => setFPiso({ ...fPiso, arconde: v })} decimal /></div>
                  <div><Lbl>Área Común</Lbl><NumInp value={fPiso.uconant} onChange={(v) => setFPiso({ ...fPiso, uconant: v })} decimal /></div>
                  <div><Lbl>U. Medida</Lbl><Sel value={fPiso.umedida} onChange={(v) => setFPiso({ ...fPiso, umedida: v })} options={combos?.cb_unidad_medida ?? []} /></div>
                  <div className="col-span-2"><Lbl>Referencia</Lbl><Inp value={fPiso.referencia} onChange={(v) => setFPiso({ ...fPiso, referencia: v.toUpperCase() })} /></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={addPiso} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-3 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                    {pisosEditing !== null ? <Pencil size={11} /> : <Plus size={11} />}
                    {pisosEditing !== null ? "Actualizar Piso" : "Agregar Piso"}
                  </button>
                  <button type="button" onClick={cancelPiso} className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50">Cancelar</button>
                  <button type="button" onClick={() => setRefTiposOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50">
                    <BookOpen size={11} /> Referencia tipos (1-7)
                  </button>
                  <span className="text-[10px] text-slate-500">Σ Área Construcción: {areaConstTotal} m²</span>
                </div>
                {valorPiso && !('incomplete' in valorPiso) && (
                  <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                    <div><Lbl>Valor Unit.</Lbl><Inp value={valorPiso.valorUnit} readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Valor A. Const.</Lbl><Inp value={valorPiso.valorAreaConst} readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Incremento</Lbl><Inp value={valorPiso.incremento} readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Valor A. Com.</Lbl><Inp value="0.00" readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Depreciación</Lbl><Inp value={valorPiso.depreciacion} readOnly className="bg-slate-50" /></div>
                    <div><Lbl>Valor del Piso</Lbl><Inp value={valorPiso.valorAreaConst} readOnly className="bg-slate-50 font-semibold" /></div>
                    <div><Lbl>Valor Unit. Deprec.</Lbl><Inp value={valorPiso.valorUnitDeprec} readOnly className="bg-slate-50" /></div>
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-500 uppercase">
                      <tr>
                        {["Nivel", "Tipo", "Mes", "Año", "Cls", "Mat", "Con", "Muros", "Techos", "Pisos", "Puertas", "Revest.", "Baños", "Instal.", "Area Con.", "Area Com.", "UMed", "Referencia", ""].map((h) => (
                          <th key={h} className="px-1 py-1 text-center border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pisos.length === 0 && (
                        <tr><td colSpan={19} className="px-2 py-4 text-center text-slate-400">Sin pisos registrados</td></tr>
                      )}
                      {pisos.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setFPiso(p); setPisosEditing(i); void fetchValorPiso(p); }}>
                          <td className="px-1 py-1 text-center">{p.nropiso}</td>
                          <td className="px-1 py-1 text-center">{p.cidindi}</td>
                          <td className="px-1 py-1 text-center">{p.mescons}</td>
                          <td className="px-1 py-1 text-center">{p.aniocons}</td>
                          <td className="px-1 py-1 text-center">{p.iddepcl}</td>
                          <td className="px-1 py-1 text-center">{p.iddepma}</td>
                          <td className="px-1 py-1 text-center">{p.iddepco}</td>
                          <td className="px-1 py-1 text-center">{p.esmuros}</td>
                          <td className="px-1 py-1 text-center">{p.estecho}</td>
                          <td className="px-1 py-1 text-center">{p.acapiso}</td>
                          <td className="px-1 py-1 text-center">{p.acapuer}</td>
                          <td className="px-1 py-1 text-center">{p.acareve}</td>
                          <td className="px-1 py-1 text-center">{p.acabanio}</td>
                          <td className="px-1 py-1 text-center">{p.instele}</td>
                          <td className="px-1 py-1 text-right">{p.arconde}</td>
                          <td className="px-1 py-1 text-right">{p.uconant}</td>
                          <td className="px-1 py-1 text-center">{p.umedida}</td>
                          <td className="px-1 py-1 truncate max-w-[100px]">{p.referencia}</td>
                          <td className="px-1 py-1 text-center">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setPisos((prev) => prev.filter((_, j) => j !== i)); setSaveMessage({ type: "success", text: "Piso eliminado" }); }} className="text-red-500 hover:text-red-700"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {refTiposOpen && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
                    {TIPOS_EDIFICACION_REF.map((group) => (
                      <div key={group.title}>
                        <div className="mb-1 text-[10px] font-semibold text-sat-navy">{group.title}</div>
                        <table className="w-full text-[9px]">
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.codigo}>
                                <td className="w-4 pr-1 align-top font-semibold text-slate-600">{item.codigo}</td>
                                <td className="text-slate-500">{item.descripcion}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </FieldGroup>
            )}

            {!combosLoading && activeTab === 3 && (
              <FieldGroup title="Instalaciones">
                <div className="grid grid-cols-6 gap-2 mb-2 items-end">
                  <div className="col-span-1"><Lbl>Instalación</Lbl><Sel value={fInstal.cidinst} onChange={onDetalleInstalChange} options={combos?.detalle_inst ?? []} /></div>
                  <div><Lbl>Mes</Lbl><NumInp value={fInstal.mescons} onChange={(v) => setFInstal({ ...fInstal, mescons: rellenarceros(v, 2) })} maxLength={2} /></div>
                  <div><Lbl>Año</Lbl><NumInp value={fInstal.aniocons} onChange={(v) => setFInstal({ ...fInstal, aniocons: v })} /></div>
                  <div><Lbl>Clasif.</Lbl><Sel value={fInstal.iddepcl} onChange={(v) => setFInstal({ ...fInstal, iddepcl: v })} options={combos?.cb_clasifica ?? []} /></div>
                  <div><Lbl>Material</Lbl><Sel value={fInstal.iddepma} onChange={(v) => setFInstal({ ...fInstal, iddepma: v })} options={combos?.cb_material ?? []} /></div>
                  <div><Lbl>Estado</Lbl><Sel value={fInstal.iddepco} onChange={(v) => setFInstal({ ...fInstal, iddepco: v })} options={combos?.cb_estado ?? []} /></div>
                  <div><Lbl>Largo</Lbl><NumInp value={fInstal.dmlargo} onChange={(v) => setFInstal({ ...fInstal, dmlargo: v })} decimal /></div>
                  <div><Lbl>Ancho</Lbl><NumInp value={fInstal.dmancho} onChange={(v) => setFInstal({ ...fInstal, dmancho: v })} decimal /></div>
                  <div><Lbl>Alto</Lbl><NumInp value={fInstal.dmaltos} onChange={(v) => setFInstal({ ...fInstal, dmaltos: v })} decimal /></div>
                  <div><Lbl>Cant.</Lbl><NumInp value={fInstal.protota} onChange={(v) => setFInstal({ ...fInstal, protota: v })} decimal /></div>
                  <div><Lbl>U. Medida</Lbl><Inp value={fInstal.vunimed} readOnly className="bg-slate-50" /></div>
                  <div><Lbl>Valor Total</Lbl><NumInp value={fInstal.vdescri} onChange={(v) => setFInstal({ ...fInstal, vdescri: v })} decimal /></div>
                  <div className="col-span-2"><Lbl>Descripción</Lbl><Inp value={fInstal.cidnomb} readOnly className="bg-slate-50" /></div>
                  <div className="col-span-2"><Lbl>Referencia</Lbl><Inp value={fInstal.referenciainst} onChange={(v) => setFInstal({ ...fInstal, referenciainst: v.toUpperCase() })} /></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={addInstal} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-3 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                    {instalEditing !== null ? <Pencil size={11} /> : <Plus size={11} />}
                    {instalEditing !== null ? "Actualizar Instal." : "Agregar Instal."}
                  </button>
                  <button type="button" onClick={cancelInstal} className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50">Cancelar</button>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-500 uppercase">
                      <tr>
                        {["Inst.", "Descripción", "Mes", "Año", "Cls", "Mat", "Con", "Largo", "Ancho", "Alto", "Cant.", "U.Med", "Valor", "Referencia", ""].map((h) => (
                          <th key={h} className="px-1 py-1 text-center border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {instal.length === 0 && (
                        <tr><td colSpan={15} className="px-2 py-4 text-center text-slate-400">Sin instalaciones registradas</td></tr>
                      )}
                      {instal.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setFInstal(p); setInstalEditing(i); }}>
                          <td className="px-1 py-1 text-center">{p.cidinst}</td>
                          <td className="px-1 py-1 truncate max-w-[120px]">{p.cidnomb}</td>
                          <td className="px-1 py-1 text-center">{p.mescons}</td>
                          <td className="px-1 py-1 text-center">{p.aniocons}</td>
                          <td className="px-1 py-1 text-center">{p.iddepcl}</td>
                          <td className="px-1 py-1 text-center">{p.iddepma}</td>
                          <td className="px-1 py-1 text-center">{p.iddepco}</td>
                          <td className="px-1 py-1 text-center">{p.dmlargo}</td>
                          <td className="px-1 py-1 text-center">{p.dmancho}</td>
                          <td className="px-1 py-1 text-center">{p.dmaltos}</td>
                          <td className="px-1 py-1 text-center">{p.protota}</td>
                          <td className="px-1 py-1 text-center">{p.vunimed}</td>
                          <td className="px-1 py-1 text-right">{p.vdescri}</td>
                          <td className="px-1 py-1 truncate max-w-[100px]">{p.referenciainst}</td>
                          <td className="px-1 py-1 text-center">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setInstal((prev) => prev.filter((_, j) => j !== i)); setSaveMessage({ type: "success", text: "Instalación eliminada" }); }} className="text-red-500 hover:text-red-700"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FieldGroup>
            )}

            {!combosLoading && activeTab === 4 && (
              <FieldGroup title="Arbitrios / Usos de Servicios">
                <div className="grid grid-cols-4 gap-2">
                  <Chk label="Afecto Arbitrios" checked={f.txtArbAfecto} onChange={(v) => setF({ ...f, txtArbAfecto: v })} />
                  <div><Lbl>Mes Desde</Lbl><Sel value={f.cbAfectMesDesde} onChange={(v) => setF({ ...f, cbAfectMesDesde: v })} options={MESES.map((m) => ({ value: m, label: m }))} /></div>
                  <div><Lbl>Mes Hasta</Lbl><Sel value={f.cbAfectMesHasta} onChange={(v) => setF({ ...f, cbAfectMesHasta: v })} options={MESES.map((m) => ({ value: m, label: m }))} /></div>
                  <div><Lbl>Ubi. Paralela</Lbl><Inp value={f.txtUbiPar} onChange={(v) => setF({ ...f, txtUbiPar: v.toUpperCase() })} /></div>
                  <div className="col-span-4"><Lbl>Observación Arbitrios</Lbl><Inp value={f.txtArbObs} onChange={(v) => setF({ ...f, txtArbObs: v.toUpperCase() })} maxLength={200} /></div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div><Lbl>Limpieza Pública</Lbl><Sel value={f.cb_limpieza} onChange={(v) => setF({ ...f, cb_limpieza: v })} options={combos?.cb_limpieza ?? []} /></div>
                  <div><Lbl>Barrido / Relleno</Lbl><Sel value={f.cb_barrido} onChange={(v) => setF({ ...f, cb_barrido: v })} options={combos?.cb_barrido ?? []} /></div>
                  <div><Lbl>Parques y Jardines</Lbl><Sel value={f.cb_parque} onChange={(v) => setF({ ...f, cb_parque: v })} options={combos?.cb_parque ?? []} /></div>
                  <div><Lbl>Serenazgo</Lbl><Sel value={f.cb_serenazgo} onChange={(v) => setF({ ...f, cb_serenazgo: v })} options={combos?.cb_serenazgo ?? []} /></div>
                </div>
              </FieldGroup>
            )}

            {!combosLoading && activeTab === 5 && (
              <FieldGroup title="Documentos de Sustento">
                <div className="text-[10px] text-slate-500 mb-1">
                  Nota: el catálogo de documentos de sustento del legado no está migrado. Ingresá el <strong>Cód. Doc</strong> (id_doc del catálogo) + nombre + detalle; las filas sin código se omiten al guardar.
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2 items-end">
                  <div><Lbl>Cód. Doc</Lbl><NumInp value={fDoc.iddoc} onChange={(v) => setFDoc({ ...fDoc, iddoc: v })} /></div>
                  <div><Lbl>Nro. Registro</Lbl><NumInp value={fDoc.idreg} readOnly className="bg-slate-50" /></div>
                  <div><Lbl>Documento</Lbl><Inp value={fDoc.docnombre} onChange={(v) => setFDoc({ ...fDoc, docnombre: v.toUpperCase() })} /></div>
                  <div><Lbl>Detalle</Lbl><Inp value={fDoc.docdetalle} onChange={(v) => setFDoc({ ...fDoc, docdetalle: v.toUpperCase() })} /></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={addDoc} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-3 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                    {docsEditing !== null ? <Pencil size={11} /> : <Plus size={11} />}
                    {docsEditing !== null ? "Actualizar Doc" : "Agregar Doc"}
                  </button>
                  <button type="button" onClick={cancelDoc} className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50">Cancelar</button>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-500 uppercase">
                      <tr><th className="px-2 py-1 text-center border-b border-slate-200">Cód. Doc</th><th className="px-2 py-1 text-center border-b border-slate-200">Nro. Reg.</th><th className="px-2 py-1 text-left border-b border-slate-200">Documento</th><th className="px-2 py-1 text-left border-b border-slate-200">Detalle</th><th className="px-2 py-1 text-center border-b border-slate-200">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docs.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Sin documentos registrados</td></tr>
                      )}
                      {docs.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setFDoc(p); setDocsEditing(i); }}>
                          <td className="px-2 py-1 text-center">{p.iddoc}</td>
                          <td className="px-2 py-1 text-center">{p.idreg}</td>
                          <td className="px-2 py-1">{p.docnombre}</td>
                          <td className="px-2 py-1 truncate max-w-[200px]">{p.docdetalle}</td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setDocs((prev) => prev.filter((_, j) => j !== i)); setSaveMessage({ type: "success", text: "Documento eliminado" }); }} className="text-red-500 hover:text-red-700"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FieldGroup>
            )}
          </div>

          {/* ── Footer ── */}
          {saveMessage && (
            <div className="shrink-0 bg-slate-50/60 px-4 pb-1 text-[11px] font-medium">
              <span className={saveMessage.type === "error" ? "text-red-600" : saveMessage.type === "info" ? "text-sky-700" : "text-emerald-600"}>
                {saveMessage.text}
              </span>
            </div>
          )}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/60 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px]">
              <div>
                <Lbl>Usuario</Lbl>
                <div className="font-mono font-semibold uppercase text-slate-700">{operador || "—"}</div>
              </div>
              <div>
                <Lbl>Estación</Lbl>
                <div className="font-mono font-semibold uppercase text-slate-700">{estacion || "—"}</div>
              </div>
              <div>
                <Lbl>Última Modificación</Lbl>
                <div className="font-mono text-slate-700">{fechaMod || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={grabar}
                disabled={saving || combosLoading}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Grabando..." : "Grabar Datos"}
              </button>
              <button
                type="button"
                onClick={abrirRusticos}
                disabled={saving}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Rusticos
              </button>
              <button
                type="button"
                onClick={abrirInquilinos}
                disabled={saving}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Inquilinos
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Búsqueda de vías ── */}
      <ViaBusquedaModal isOpen={viaModalOpen} onClose={() => setViaModalOpen(false)} onSelect={handleViaSelect} />
    </div>
  );
}
