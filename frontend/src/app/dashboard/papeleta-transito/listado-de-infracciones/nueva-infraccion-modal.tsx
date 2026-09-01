"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Save, Loader2, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import {
  nuevaInfraccionAction,
  consultaPropietarioAction,
  consultaConductorAction,
  consultaPlacaAction,
  consultaPoliciaAction,
  consultaLugarAction,
  validarPlacaAction,
  grabarConProAction,
  grabarJucaAction,
  consultaInfraccionesAction,
  obtenerCombosLugarAction,
  obtenerCombosPlacaAction,
  grabarPlacaAction,
} from "@/actions/papeleta-transito/acciones-infraccion";

// ── Types ─────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Si viene poblado, abre el form en modo edición */
  editData?: Record<string, string>;
  readOnly?: boolean;
}

type LookupPanel = "propietario" | "conductor" | "placa" | "policia" | "lugar" | "infraccion" | null;


interface PagedResult<T> {
  total: number;
  rows: T[];
}

// ── Lookup Panel Component ────────────────────────────────

interface LookupProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function LookupPanel({ title, onClose, children }: LookupProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col rounded-xl bg-white shadow-xl border border-slate-200 animate-fade-in">
      <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy to-slate-700 px-3 py-2 rounded-t-xl shrink-0">
        <span className="text-xs font-semibold text-white">{title}</span>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  onPage: (p: number) => void;
}

function Pagination({ total, page, limit, onPage }: PaginationProps) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
      <span>{total} resultados</span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onPage(page - 1)}
          className="rounded border border-slate-200 p-0.5 hover:bg-slate-100 disabled:opacity-40">
          <ChevronLeft size={12} />
        </button>
        <span>Pág {page}/{pages}</span>
        <button disabled={page === pages} onClick={() => onPage(page + 1)}
          className="rounded border border-slate-200 p-0.5 hover:bg-slate-100 disabled:opacity-40">
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────

export default function NuevaInfraccionModal({ isOpen, onClose, onSuccess, editData, readOnly = false }: Props) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<LookupPanel>(null);

  // ── Form state (mirrors ingpapeleta.phtml fields) ─────
  const [form, setForm] = useState({
    // Acta de control
    acta: false,
    // Papeleta
    seriePapel: new Date().getFullYear().toString(),
    taloPapel: "01",
    numeroPapel: "",
    oficio: "",
    // Fecha y hora (por defecto la fecha y hora actual)
    fechaAplicacion: new Date().toISOString().split("T")[0],
    hora: new Date().getHours().toString().padStart(2, "0"),
    minuto: new Date().getMinutes().toString().padStart(2, "0"),
    // Infracción
    codigoInfraccion: "",
    importe: "",
    detalleInfraccion: "",
    meses: "",
    resolucion: "",
    obsResolucion: "",
    fechaResolucion: "",
    // Adicionales
    dosaje: "",
    grado: "",
    retener: false,
    // Lugar
    idLugar: "",
    lugar: "",
    referencia: "",
    // Conductor
    codigoConductor: "",
    dniConductor: "",
    licenciaConductor: "",
    nombreConductor: "",
    direccionConductor: "",
    dirConductorEditable: false,
    // Placa
    idPlaca: "",
    placa: "",
    placaSecundaria: "",
    // Vehículo (auto-fill)
    marca: "",
    tipoVehiculo: "",
    color: "",
    anio: "",
    // Observaciones + policía
    detalle: "",
    cipAuto: "",
    // Propietario
    codigoPropietario: "",
    presento: false,
    nombrePropietario: "",
    dniPropietario: "",
    tipoPropiedad: "",
    direccionPropietario: "",
    // Estado
    estadoAnterior: "",
  });

  // ── Lookup state ──────────────────────────────────────
  const [propBusq, setPropBusq] = useState("");
  const [propResult, setPropResult] = useState<PagedResult<any> | null>(null);
  const [propPage, setPropPage] = useState(1);
  const [propLoading, setPropLoading] = useState(false);

  const [condBusq, setCondBusq] = useState("");
  const [condDni, setCondDni] = useState("");
  const [condResult, setCondResult] = useState<PagedResult<any> | null>(null);
  const [condPage, setCondPage] = useState(1);
  const [condLoading, setCondLoading] = useState(false);

  const [placaBusq, setPlacaBusq] = useState("");
  const [placaResult, setPlacaResult] = useState<PagedResult<any> | null>(null);
  const [placaPage, setPlacaPage] = useState(1);
  const [placaLoading, setPlacaLoading] = useState(false);

  const [polBusq, setPolBusq] = useState("");
  const [polResult, setPolResult] = useState<PagedResult<any> | null>(null);
  const [polPage, setPolPage] = useState(1);
  const [polLoading, setPolLoading] = useState(false);

  // Lugar state
  const [lugTipoVia, setLugTipoVia] = useState("");
  const [lugVia, setLugVia] = useState("");
  const [lugTipoLugar, setLugTipoLugar] = useState("");
  const [lugLugar, setLugLugar] = useState("");
  const [lugCuadra, setLugCuadra] = useState("");
  const [lugResult, setLugResult] = useState<PagedResult<any> | null>(null);
  const [lugPage, setLugPage] = useState(1);
  const [lugLoading, setLugLoading] = useState(false);

  // Combos dinámicos desde BD papeleta.lugar_infrac (msquery=3 y msquery=4)
  const [comboVias, setComboVias] = useState<Array<{ id: string; descripcion: string }>>([]);
  const [comboLugares, setComboLugares] = useState<Array<{ id: string; descripcion: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      obtenerCombosLugarAction().then((res) => {
        if (res.success && res.data) {
          setComboVias(res.data.tiposVia ?? []);
          setComboLugares(res.data.tiposLugar ?? []);
        }
      });
    }
  }, [isOpen]);

  // Submodal Nueva Calle y Junta
  const [showNuevaJuca, setShowNuevaJuca] = useState(false);
  const [jucaForm, setJucaForm] = useState({ tipoVia: "", via: "", tipoLugar: "", lugar: "" });
  const [jucaLoading, setJucaLoading] = useState(false);

  // Submodal Nueva Placa
  const [showNuevaPlaca, setShowNuevaPlaca] = useState(false);
  const [placaForm, setPlacaForm] = useState({
    codplac: "", codplac1: "", tipvehi: "", codmarc: "", codcolo: "", aniofab: "",
    formalidad: "Informal", estado: "1",
  });
  const [placaCombos, setPlacaCombos] = useState<{ tipos: any[]; marcas: any[]; colores: any[] }>({
    tipos: [], marcas: [], colores: [],
  });
  const [nuevaPlacaLoading, setNuevaPlacaLoading] = useState(false);
  const [nuevaPlacaError, setNuevaPlacaError] = useState<string | null>(null);

  useEffect(() => {
    if (showNuevaPlaca) {
      obtenerCombosPlacaAction().then((res) => {
        if (res.success && res.data) {
          setPlacaCombos({
            tipos: res.data.tipos ?? [],
            marcas: res.data.marcas ?? [],
            colores: res.data.colores ?? [],
          });
        }
      });
    }
  }, [showNuevaPlaca]);

  // Submodal Nuevo Conductor / Persona
  const [showNuevoConductor, setShowNuevoConductor] = useState(false);
  const [condForm, setCondForm] = useState({
    tipoPersona: "NATURAL",
    tipoDoc: "DNI",
    apPaterno: "",
    apMaterno: "",
    nombres: "",
    dniRuc: "",
    licencia: "",
    noPresentoLicencia: false,
    domicilio: "",
    idlugar: "",
    dnumero: "",
    dmanzana: "",
    dlote: "",
  });
  const [newCondLoading, setNewCondLoading] = useState(false);

  // Submodal Buscar Domicilio (vía y calle) — igual al nuevadomicilio del antiguo.
  // domicilioOrigin indica desde qué form se abrió ('cond' = conductor, 'prop' = propietario)
  const [domicilioOrigin, setDomicilioOrigin] = useState<"cond" | "prop">("cond");
  const [showBuscarDomicilio, setShowBuscarDomicilio] = useState(false);
  const [domTipoVia, setDomTipoVia] = useState("");
  const [domVia, setDomVia] = useState("");
  const [domTipoLugar, setDomTipoLugar] = useState("");
  const [domLugar, setDomLugar] = useState("");
  const [domNumero, setDomNumero] = useState("");
  const [domManzana, setDomManzana] = useState("");
  const [domLote, setDomLote] = useState("");
  const [domResult, setDomResult] = useState<PagedResult<any> | null>(null);
  const [domPage, setDomPage] = useState(1);
  const [domLoading, setDomLoading] = useState(false);

  // Submodal Nuevo Propietario
  const [showNuevoPropietario, setShowNuevoPropietario] = useState(false);
  const [propForm, setPropForm] = useState({
    cmbTipoPer: "01", tipoDoc: "DNI", apPaterno: "", apMaterno: "", nombres: "", dniRuc: "",
    tarjeta: "", noPresentoTarjeta: false, domicilio: "",
    idlugar: "", dnumero: "", dmanzana: "", dlote: "",
  });
  const [newPropLoading, setNewPropLoading] = useState(false);

  // Infraccion / Escala de Multas state
  const [infracBusq, setInfracBusq] = useState("");
  const [infracResult, setInfracResult] = useState<PagedResult<any> | null>(null);
  const [infracPage, setInfracPage] = useState(1);
  const [infracLoading, setInfracLoading] = useState(false);

  const upd = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));

  useEffect(() => {
    if (isOpen && editData) {
      const formatToDateInput = (val?: unknown) => {
        if (!val) return "";
        const str = String(val).trim();
        if (!str) return "";
        const clean = str.split("T")[0].split(" ")[0];
        if (clean.includes("/")) {
          const parts = clean.split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d.length === 4) return `${d}-${m.padStart(2, "0")}-${y.padStart(2, "0")}`;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
        }
        return clean;
      };

      const parseBooleanFlag = (val: unknown): boolean => {
        if (val === true || val === 1 || val === "1" || val === "true") return true;
        return false;
      };

      setForm({
        acta: parseBooleanFlag(editData.acta),
        seriePapel: String(editData.seriePapel ?? new Date().getFullYear().toString()),
        taloPapel: String(editData.taloPapel ?? "01"),
        numeroPapel: String(editData.numeroPapel ?? ""),
        oficio: String(editData.oficio ?? ""),
        fechaAplicacion: formatToDateInput(editData.fechaAplicacion) || new Date().toISOString().split("T")[0],
        hora: String(editData.hora ?? ""),
        minuto: String(editData.minuto ?? ""),
        codigoInfraccion: String(editData.codigoInfraccion ?? ""),
        importe: String(editData.importe ?? ""),
        detalleInfraccion: String(editData.detalleInfraccion ?? ""),
        meses: String(editData.meses ?? ""),
        resolucion: String(editData.resolucion ?? ""),
        obsResolucion: String(editData.obsResolucion ?? ""),
        fechaResolucion: String(editData.fechaResolucion ?? ""),
        dosaje: String(editData.dosaje ?? ""),
        grado: String(editData.grado ?? ""),
        retener: parseBooleanFlag(editData.retener),
        idLugar: String(editData.idLugar ?? ""),
        lugar: String(editData.lugar ?? ""),
        referencia: String(editData.referencia ?? ""),
        codigoConductor: String(editData.codigoConductor ?? ""),
        dniConductor: String(editData.dniConductor ?? editData.rucConductor ?? ""),
        licenciaConductor: String(editData.licenciaConductor ?? ""),
        nombreConductor: String(editData.nombreConductor ?? ""),
        direccionConductor: String(editData.direccionConductor ?? ""),
        dirConductorEditable: Boolean(editData.dirConductorEditable),
        idPlaca: String(editData.idPlaca ?? ""),
        placa: String(editData.placa ?? editData.numeroPlaca ?? ""),
        placaSecundaria: String(editData.placaSecundaria ?? ""),
        marca: String(editData.marca ?? editData.marcaVehiculo ?? ""),
        tipoVehiculo: String(editData.tipoVehiculo ?? ""),
        color: String(editData.color ?? editData.colorVehiculo ?? ""),
        anio: String(editData.anio ?? editData.anioVehiculo ?? ""),
        detalle: String(editData.detalle ?? ""),
        cipAuto: String(editData.cipAuto ?? ""),
        codigoPropietario: String(editData.codigoPropietario ?? ""),
        presento: parseBooleanFlag(editData.presento),
        nombrePropietario: String(editData.nombrePropietario ?? ""),
        dniPropietario: String(editData.dniPropietario ?? editData.rucPropietario ?? ""),
        tipoPropiedad: String(editData.tipoPropiedad ?? ""),
        direccionPropietario: String(editData.direccionPropietario ?? ""),
        estadoAnterior: String(editData.estadoAnterior ?? ""),
      });
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const showResolucion =
    form.codigoInfraccion === "M.40A" ||
    form.codigoInfraccion === "M.40B" ||
    form.codigoInfraccion === "M.40C";

  // ── Lookup search functions ───────────────────────────

  async function searchPropietario(page = 1) {
    setPropLoading(true);
    setPropPage(page);
    const res = await consultaPropietarioAction({ propieta: propBusq, page, limit: 10 });
    if (res.success && res.data) setPropResult(res.data as PagedResult<any>);
    setPropLoading(false);
  }

  async function searchConductor(page = 1) {
    setCondLoading(true);
    setCondPage(page);
    const res = await consultaConductorAction({ conductor: condBusq, dni: condDni, page, limit: 10 });
    if (res.success && res.data) setCondResult(res.data as PagedResult<any>);
    setCondLoading(false);
  }

  async function searchPlaca(page = 1) {
    setPlacaLoading(true);
    setPlacaPage(page);
    const res = await consultaPlacaAction({ placa: placaBusq, page, limit: 10 });
    if (res.success && res.data) setPlacaResult(res.data as PagedResult<any>);
    setPlacaLoading(false);
  }

  async function searchPolicia(page = 1) {
    setPolLoading(true);
    setPolPage(page);
    const res = await consultaPoliciaAction({ cip: polBusq, page, limit: 10 });
    if (res.success && res.data) setPolResult(res.data as PagedResult<any>);
    setPolLoading(false);
  }

  async function searchLugar(page = 1) {
    setLugLoading(true);
    setLugPage(page);
    const res = await consultaLugarAction({
      cmbtipocalle: lugTipoVia,
      ncalle: lugVia,
      cmbtipolugar: lugTipoLugar,
      nlugar: lugLugar,
      page,
      limit: 10,
    });
    if (res.success && res.data) setLugResult(res.data as PagedResult<any>);
    setLugLoading(false);
  }

  async function searchInfraccion(page = 1) {
    setInfracLoading(true);
    setInfracPage(page);
    const res = await consultaInfraccionesAction({ busqueda: infracBusq, page, limit: 15 });
    if (res.success && res.data) setInfracResult(res.data as PagedResult<any>);
    setInfracLoading(false);
  }

  function selectInfraccion(row: any) {
    setForm((prev) => ({
      ...prev,
      codigoInfraccion: row.codigo,
      detalleInfraccion: row.tenor,
      importe: row.monto && row.monto !== "0.00" ? row.monto : prev.importe,
    }));
    setActivePanel(null);
  }

  async function handleGrabarJuca() {
    if (!jucaForm.via || !jucaForm.lugar) return;
    setJucaLoading(true);
    const res = await grabarJucaAction({
      tipoCalle: jucaForm.tipoVia,
      nombreCalle: jucaForm.via,
      tipoLugar: jucaForm.tipoLugar,
      nombreLugar: jucaForm.lugar,
    });
    setJucaLoading(false);
    if (res.success) {
      setShowNuevaJuca(false);
      searchLugar(1);
    }
  }

  async function handleGrabarPlaca() {
    setNuevaPlacaError(null);
    if (!placaForm.codplac.trim()) {
      setNuevaPlacaError("Debe ingresar el número de Placa.");
      return;
    }
    setNuevaPlacaLoading(true);
    const res = await grabarPlacaAction({
      mquery: 1,
      codplac: placaForm.codplac,
      codplac1: placaForm.codplac1,
      tipvehi: placaForm.tipvehi,
      codmarc: placaForm.codmarc,
      codcolo: placaForm.codcolo,
      aniofab: placaForm.aniofab,
      formalidad: placaForm.formalidad,
      estado: placaForm.estado,
    });
    setNuevaPlacaLoading(false);
    if (res.success) {
      alert(res.message || "Placa registrada correctamente.");
      setShowNuevaPlaca(false);
      setPlacaForm({ codplac: "", codplac1: "", tipvehi: "", codmarc: "", codcolo: "", aniofab: "", formalidad: "Informal", estado: "1" });
      searchPlaca(1);
    } else {
      setNuevaPlacaError((res as any).error ?? (res as any).message ?? "Error al grabar la placa");
    }
  }

  async function handleGrabarConductor() {
    if (!condForm.apPaterno || !condForm.dniRuc) return;
    setNewCondLoading(true);
    const res = await grabarConProAction({
      tipoPer: "C",
      cmbTipoPer: condForm.tipoPersona === "JURIDICA" ? "03" : "01",
      apPaterno: condForm.apPaterno,
      apMaterno: condForm.apMaterno,
      nombres: condForm.nombres,
      dniRuc: condForm.dniRuc,
      licencia: condForm.licencia,
      domicilio: condForm.domicilio,
      numero: condForm.dnumero,
      manzana: condForm.dmanzana,
      lote: condForm.dlote,
      idLugar: condForm.idlugar,
    });
    setNewCondLoading(false);
    if (res.success) {
      setShowNuevoConductor(false);
      searchConductor(1);
    } else {
      alert((res as any).error ?? (res as any).message ?? "Error al grabar el conductor");
    }
  }

  async function handleGrabarPropietario() {
    if (!propForm.apPaterno || !propForm.dniRuc) return;
    setNewPropLoading(true);
    const res = await grabarConProAction({
      tipoPer: "P",
      cmbTipoPer: propForm.cmbTipoPer,
      apPaterno: propForm.apPaterno,
      apMaterno: propForm.apMaterno,
      nombres: propForm.nombres,
      dniRuc: propForm.dniRuc,
      tarjeta: propForm.tarjeta,
      domicilio: propForm.domicilio,
      numero: propForm.dnumero,
      manzana: propForm.dmanzana,
      lote: propForm.dlote,
      idLugar: propForm.idlugar,
    });
    setNewPropLoading(false);
    if (res.success) {
      setShowNuevoPropietario(false);
      searchPropietario(1);
    } else {
      alert((res as any).error ?? (res as any).message ?? "Error al grabar el propietario");
    }
  }

  // ── Select from lookup ────────────────────────────────

  function selectPropietario(row: any) {
    setForm((prev) => ({
      ...prev,
      codigoPropietario: String(row.idpropie ?? row.idcontrib ?? row.codigo ?? "").trim(),
      nombrePropietario: String(row.propietario ?? row.nomcontrib ?? row.nombre ?? "").replace(/[\t\r\n]+/g, " ").trim(),
      dniPropietario: String(row.docu ?? row.dniruc ?? row.dni ?? "").trim(),
      tipoPropiedad: String(row.tarjeta ?? row.tpropiedad ?? "").trim(),
      direccionPropietario: String(row.direccion ?? row.domicilio ?? "").replace(/[\t\r\n]+/g, " ").trim(),
    }));
    setActivePanel(null);
  }

  function selectConductor(row: any) {
    setForm((prev) => ({
      ...prev,
      codigoConductor: String(row.idconduc ?? row.codigo ?? "").trim(),
      nombreConductor: String(row.conductor ?? row.nombre ?? "").replace(/[\t\r\n]+/g, " ").trim(),
      dniConductor: String(row.docu ?? row.dniruc ?? row.dni ?? "").trim(),
      licenciaConductor: String(row.licencia ?? "").trim(),
      direccionConductor: String(row.direccion ?? row.domicilio ?? "").replace(/[\t\r\n]+/g, " ").trim(),
    }));
    setActivePanel(null);
  }

  function selectPlaca(row: any) {
    setForm((prev) => ({
      ...prev,
      idPlaca: String(row.idtramplac ?? row.id ?? row.codplac ?? "").trim(),
      placa: String(row.codplac ?? row.placa ?? "").trim(),
      placaSecundaria: String(row.codplacSec ?? row.placasec ?? row.placaSecundaria ?? "").trim(),
      tipoVehiculo: String(row.desvehi ?? row.tipoVehiculo ?? "").trim(),
      marca: String(row.desmarc ?? row.marca ?? "").trim(),
      anio: String(row.aniofab ?? row.anio ?? "").trim(),
      color: String(row.descolor ?? row.color ?? "").trim(),
    }));
    setActivePanel(null);
  }

  function selectPolicia(row: any) {
    setForm((prev) => ({ ...prev, cipAuto: String(row.ncip ?? row.cip ?? row.codigo ?? "").trim() }));
    setActivePanel(null);
  }

  function selectLugar(row: any) {
    const viaStr = `${row.tvia || row.tipovia || ""} ${row.via || row.calle || ""}`.trim();
    const lugarStr = `${row.tlugar || row.tipolugar || ""} ${row.lugar || row.nomlugar || ""}`.trim();
    const fullLugar = [viaStr, lugarStr].filter(Boolean).join(" - ").replace(/[\t\r\n]+/g, " ").trim();
    setForm((prev) => ({
      ...prev,
      idLugar: String(row.id ?? row.idlugar ?? "").trim(),
      lugar: String(fullLugar || row.desclugar || "").replace(/[\t\r\n]+/g, " ").trim(),
    }));
    setActivePanel(null);
  }

  // ── Buscar Domicilio (vía/calle) del conductor ─────────────
  // Legacy: Papeletatransito01Controller::consultalugarAction
  // SP: papeleta.lugar_infrac (@msquery=1 total, @msquery=2 filas)
  async function searchDomicilio(page = 1) {
    setDomLoading(true);
    setDomPage(page);
    const res = await consultaLugarAction({
      cmbtipocalle: domTipoVia,
      ncalle: domVia,
      cmbtipolugar: domTipoLugar,
      nlugar: domLugar,
      page,
      limit: 10,
    });
    if (res.success && res.data) setDomResult(res.data as PagedResult<any>);
    setDomLoading(false);
  }

  // Al escoger un lugar se construye el domicilio (igual que el JS js_domicilio_pape.js del antiguo):
  // "tvia via tlugar lugar" + opcional "Nro. x", "Mz. y", "Lt. z"
  function seleccionarDomicilio(row: any) {
    let direccion = `${row.tvia ?? ""} ${row.via ?? ""} ${row.tlugar ?? ""} ${row.lugar ?? ""}`.replace(/\s+/g, " ").trim();
    let dnumero = "";
    let dmanzana = "";
    let dlote = "";
    if (domNumero.trim()) {
      direccion += ` Nro. ${domNumero.trim()}`;
      dnumero = domNumero.trim();
    }
    if (domManzana.trim()) {
      direccion += ` Mz. ${domManzana.trim()}`;
      dmanzana = domManzana.trim();
    }
    if (domLote.trim()) {
      direccion += ` Lt. ${domLote.trim()}`;
      dlote = domLote.trim();
    }
    if (domicilioOrigin === "prop") {
      setPropForm((prev) => ({
        ...prev,
        domicilio: direccion,
        idlugar: String(row.id ?? "").trim(),
        dnumero,
        dmanzana,
        dlote,
      }));
    } else {
      setCondForm((prev) => ({
        ...prev,
        domicilio: direccion,
        idlugar: String(row.id ?? "").trim(),
        dnumero,
        dmanzana,
        dlote,
      }));
    }
    setShowBuscarDomicilio(false);
  }

  // ── Submit ────────────────────────────────────────────

  function handleSubmit() {
    if (!form.placa || !form.numeroPapel.trim() || !form.codigoInfraccion || !form.importe || !form.fechaAplicacion) {
      setError("N° de Papeleta, Placa, fecha de infracción, código de infracción y monto son requeridos.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const horaMin = `${form.hora}:${form.minuto}`;
      const result = await nuevaInfraccionAction({
        operacion: editData ? 1 : 0,
        papeleta: String(editData?.id ?? editData?.numeroInfraccion ?? form.numeroPapel).trim(),
        placa: form.placa,
        seriePapel: form.seriePapel,
        numeroPapel: form.numeroPapel,
        taloPapel: form.taloPapel,
        oficio: form.oficio,
        fechaAplicacion: form.fechaAplicacion,
        horaMin,
        codigoInfraccion: form.codigoInfraccion,
        importe: parseFloat(form.importe),
        detalleInfraccion: form.detalleInfraccion,
        dosaje: form.dosaje,
        grado: form.grado,
        retener: form.retener ? 1 : 0,
        idLugar: form.idLugar,
        lugar: form.lugar,
        referencia: form.referencia,
        codigoPropietario: form.codigoPropietario,
        presento: form.presento ? 1 : 0,
        nombrePropietario: form.nombrePropietario,
        tipoProp: form.tipoPropiedad,
        direccionProp: form.direccionPropietario,
        codigoConductor: form.codigoConductor,
        nombreConductor: form.nombreConductor,
        licenciaConductor: form.licenciaConductor,
        direccionConductor: form.direccionConductor,
        idPlaca: form.idPlaca,
        cipAuto: form.cipAuto,
        detalle: form.detalle,
        resolucion: showResolucion ? form.resolucion : undefined,
        observaResolucion: showResolucion ? form.obsResolucion : undefined,
        fechaResolucion: showResolucion ? form.fechaResolucion : undefined,
        meses: showResolucion ? form.meses : undefined,
      });
      if (result.success) {
        alert(result.message || "Infracción registrada correctamente.");
        onSuccess();
        onClose();
      } else {
        setError((result as any).error ?? (result as any).message ?? "Error al registrar");
      }
    });
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-[11px]">

        {/* Modal Header Moderno */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-4 py-2 shrink-0">
          <span className="text-xs font-semibold text-white tracking-tight">
            {readOnly ? "11Visualizar Infracción" : editData ? "11Modificar Infracción" : "Nueva Infracción"}
          </span>
          {!loading && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white transition">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Modal Body - Fondo rosado/rojo (#fde8e8) para infracción bloqueada/cancelada en visualización */}
        <div className={`relative p-3 overflow-hidden flex-1 select-none ${readOnly ? "bg-[#fde8e8]" : "bg-white"}`}>
          {/* Overlay Panel de Búsquedas */}
          {activePanel === "propietario" && (
            <LookupPanel title="Búsqueda de Propietario" onClose={() => setActivePanel(null)}>
              <div className="flex gap-1.5 mb-2">
                <input value={propBusq} onChange={(e) => setPropBusq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPropietario(1)}
                  placeholder="Nombre o DNI del propietario…"
                  className="w-full rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-black font-medium focus:border-sat-cyan focus:ring-1 focus:ring-sat-cyan/30 focus:outline-none" />
                <button onClick={() => searchPropietario(1)} className="rounded-md border border-slate-400 bg-sat-navy text-white px-3 py-1 text-xs font-bold hover:bg-slate-800 flex items-center gap-1">
                  {propLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
              </div>
              {propResult && (
                <>
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-left border-b border-slate-300">
                        <th className="px-2 py-1">Cod.</th>
                        <th className="px-2 py-1">Propietario</th>
                        <th className="px-2 py-1">Doc.</th>
                        <th className="px-2 py-1">Tarjeta</th>
                        <th className="px-2 py-1">Dirección</th>
                        <th className="px-2 py-1 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propResult.rows.map((row: any, idx: number) => (
                        <tr key={row.idpropie || idx} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-black transition">
                          <td className="px-2 py-1 font-mono font-bold text-black">{row.idpropie || row.idcontrib || row.codigo}</td>
                          <td className="px-2 py-1 font-bold text-black">{row.propietario || row.nomcontrib}</td>
                          <td className="px-2 py-1 text-black font-semibold">{row.docu || row.dniruc}</td>
                          <td className="px-2 py-1 text-black">{row.tarjeta || row.tpropiedad}</td>
                          <td className="px-2 py-1 text-black">{row.direccion || row.domicilio}</td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => selectPropietario(row)}
                              className="rounded bg-sat-cyan px-2 py-0.5 text-white hover:bg-cyan-600 font-bold transition text-[10px]">
                              ✓ Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination total={propResult.total} page={propPage} limit={10} onPage={(p) => searchPropietario(p)} />
                </>
              )}
              <div className="mt-3 flex justify-between items-center border-t border-slate-300 pt-2">
                <button type="button" onClick={() => setActivePanel(null)} className="rounded border border-slate-400 bg-white px-3 py-1 text-xs text-black font-bold hover:bg-slate-100">
                  Cerrar
                </button>
                <button type="button" onClick={() => setShowNuevoPropietario(true)}
                  className="rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs font-bold text-black hover:bg-slate-200">
                  Nuevo registro
                </button>
              </div>
            </LookupPanel>
          )}

          {activePanel === "infraccion" && (
            <LookupPanel title="Listado de Multas" onClose={() => setActivePanel(null)}>
              <div className="flex gap-2 items-center mb-3">
                <span className="font-bold text-black text-xs shrink-0">Busqueda de Infracción:</span>
                <input value={infracBusq} onChange={(e) => setInfracBusq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchInfraccion(1)}
                  placeholder="Código o tenor de la infracción…"
                  className="flex-1 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-black font-semibold focus:border-sat-cyan focus:ring-1 focus:ring-sat-cyan/30 focus:outline-none" />
                <button onClick={() => searchInfraccion(1)} className="rounded-md border border-slate-400 bg-sat-navy px-3 py-1 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1">
                  {infracLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
              </div>
              {infracResult && (
                <>
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-[10px] border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-100 text-black text-left border-b border-slate-300 font-bold">
                          <th className="px-2 py-1.5 w-16">Código</th>
                          <th className="px-2 py-1.5">Tenor de la Infraccion</th>
                          <th className="px-2 py-1.5 text-center w-16">% valor</th>
                          <th className="px-2 py-1.5 text-center w-20">Vehiculo</th>
                          <th className="px-2 py-1.5 text-right w-20">U.I.T.</th>
                          <th className="px-2 py-1.5 text-center w-12">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infracResult.rows.map((row: any, idx: number) => (
                          <tr key={row.id || idx} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-black transition">
                            <td className="px-2 py-1 font-bold text-black">{row.codigo}</td>
                            <td className="px-2 py-1 text-black font-medium">{row.tenor}</td>
                            <td className="px-2 py-1 text-center font-bold text-black">{row.porcentaje}</td>
                            <td className="px-2 py-1 text-center font-semibold text-black">{row.vehiculo || "TODOS"}</td>
                            <td className="px-2 py-1 text-right font-bold text-black">{row.uit || "5500.00"}</td>
                            <td className="px-2 py-1 text-center">
                              <button type="button" onClick={() => selectInfraccion(row)}
                                className="inline-flex items-center justify-center p-1 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 transition" title="Seleccionar">
                                ✓
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination total={infracResult.total} page={infracPage} limit={15} onPage={(p) => searchInfraccion(p)} />
                </>
              )}
            </LookupPanel>
          )}

          {activePanel === "conductor" && (
            <LookupPanel title="Conductor / Maestro de Conductor" onClose={() => setActivePanel(null)}>
              <div className="flex gap-1.5 mb-2">
                <span className="font-bold text-black text-xs shrink-0 self-center">Conductor</span>
                <input value={condBusq} onChange={(e) => setCondBusq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchConductor(1)}
                  placeholder="Nombre del conductor…"
                  className="w-full rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-black font-medium focus:border-sat-cyan focus:outline-none" />
                <span className="font-bold text-black text-xs shrink-0 self-center">Doc.</span>
                <input value={condDni} onChange={(e) => setCondDni(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchConductor(1)}
                  placeholder="DNI…"
                  className="w-28 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-black font-semibold focus:border-sat-cyan focus:outline-none" />
                <button onClick={() => searchConductor(1)} className="rounded-md border border-slate-400 bg-sat-navy text-white px-3 py-1 text-xs font-bold hover:bg-slate-800">
                  {condLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
              </div>
              {condResult && (
                <>
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-left border-b border-slate-300">
                        <th className="px-2 py-1">Id</th>
                        <th className="px-2 py-1">Conductor</th>
                        <th className="px-2 py-1">Documento</th>
                        <th className="px-2 py-1 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {condResult.rows.map((row: any) => (
                        <tr key={row.idconduc} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-black transition">
                          <td className="px-2 py-1 text-black font-mono font-bold">{row.idconduc}</td>
                          <td className="px-2 py-1 font-bold text-black">{row.conductor}</td>
                          <td className="px-2 py-1 text-black font-semibold">{row.docu}</td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => selectConductor(row)}
                              className="rounded bg-sat-cyan px-2 py-0.5 text-white hover:bg-cyan-600 font-bold transition text-[10px]">
                              +...
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination total={condResult.total} page={condPage} limit={10} onPage={(p) => searchConductor(p)} />
                </>
              )}
              <div className="mt-3 flex justify-between items-center border-t pt-2">
                <button type="button" onClick={() => setActivePanel(null)} className="rounded border border-slate-400 bg-white px-3 py-1 text-xs text-black font-bold hover:bg-slate-100">
                  Cerrar
                </button>
                <button type="button" onClick={() => setShowNuevoConductor(true)}
                  className="rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs font-bold text-black hover:bg-slate-200">
                  Nuevo registro
                </button>
              </div>
            </LookupPanel>
          )}

          {/* Submodal Flotante e Independiente: Nuevo Ingreso (Conductor/Persona) */}
          {showNuevoConductor && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-[11px] animate-scale-up">
                <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-3 py-2">
                  <span className="text-xs font-bold text-white tracking-tight">Nueva Ingreso</span>
                  <button type="button" onClick={() => setShowNuevoConductor(false)} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 space-y-2 bg-white text-black font-semibold">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs items-center">
                    <span className="font-bold text-black">Tipo de Persona</span>
                    <select
                      value={condForm.tipoPersona}
                      onChange={(e) => setCondForm({ ...condForm, tipoPersona: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    >
                      <option value="NATURAL">NATURAL</option>
                      <option value="JURIDICA">JURIDICA</option>
                    </select>

                    <span className="font-bold text-black">Ap. Paterno / Razon Social *</span>
                    <input
                      value={condForm.apPaterno}
                      onChange={(e) => setCondForm({ ...condForm, apPaterno: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Ap. Materno</span>
                    <input
                      value={condForm.apMaterno}
                      onChange={(e) => setCondForm({ ...condForm, apMaterno: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Nombre(s) *</span>
                    <input
                      value={condForm.nombres}
                      onChange={(e) => setCondForm({ ...condForm, nombres: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Tipo Documento</span>
                    <select
                      value={condForm.tipoDoc}
                      onChange={(e) => setCondForm({ ...condForm, tipoDoc: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">CARNET EXT.</option>
                    </select>

                    <span className="font-bold text-black">Nro Documento *</span>
                    <input
                      value={condForm.dniRuc}
                      onChange={(e) => setCondForm({ ...condForm, dniRuc: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">N° Licencia</span>
                    <div className="col-span-2 flex items-center gap-3">
                      <input
                        disabled={condForm.noPresentoLicencia}
                        value={condForm.licencia}
                        onChange={(e) => setCondForm({ ...condForm, licencia: e.target.value })}
                        className={`flex-1 rounded border px-2 py-1 text-black font-bold focus:outline-none ${condForm.noPresentoLicencia ? "bg-slate-100 border-slate-300" : "border-slate-400 bg-white focus:border-sat-cyan"}`}
                      />
                      <label className="flex items-center gap-1 text-[11px] font-bold text-black cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={condForm.noPresentoLicencia}
                          onChange={(e) => setCondForm({ ...condForm, noPresentoLicencia: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-400 text-sat-cyan"
                        />
                        No presentó Licencia
                      </label>
                    </div>

                    <span className="font-bold text-black">Domicilio</span>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <input
                        value={condForm.domicilio}
                        onChange={(e) => setCondForm({ ...condForm, domicilio: e.target.value })}
                        className="flex-1 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setDomicilioOrigin("cond"); setShowBuscarDomicilio(true); }}
                        className="shrink-0 h-7 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-black transition flex items-center gap-1"
                        title="Buscar vía y calle del domicilio"
                      >
                        <Search size={12} /> Buscar
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-start gap-2 pt-3 border-t border-slate-300 mt-3">
                    <button
                      type="button"
                      onClick={handleGrabarConductor}
                      disabled={newCondLoading}
                      className="px-4 py-1.5 bg-sat-cyan text-white rounded-md text-xs font-bold hover:bg-cyan-600 transition flex items-center gap-1"
                    >
                      {newCondLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Grabar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNuevoConductor(false)}
                      className="px-4 py-1.5 border border-slate-400 rounded-md text-xs font-bold text-black hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submodal Flotante e Independiente: Nuevo Ingreso (Propietario) */}
          {showNuevoPropietario && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-[11px] animate-scale-up">
                <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-3 py-2">
                  <span className="text-xs font-bold text-white tracking-tight">Nuevo Ingreso — Propietario</span>
                  <button type="button" onClick={() => setShowNuevoPropietario(false)} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 space-y-2 bg-white text-black font-semibold">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs items-center">
                    <span className="font-bold text-black">Tipo de Persona</span>
                    <select
                      value={propForm.cmbTipoPer}
                      onChange={(e) => setPropForm({ ...propForm, cmbTipoPer: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    >
                      <option value="01">Natural</option>
                      <option value="03">Juridica</option>
                    </select>

                    <span className="font-bold text-black">Ap. Paterno / Razon Social *</span>
                    <input
                      value={propForm.apPaterno}
                      onChange={(e) => setPropForm({ ...propForm, apPaterno: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Ap. Materno</span>
                    <input
                      value={propForm.apMaterno}
                      onChange={(e) => setPropForm({ ...propForm, apMaterno: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Nombre(s) *</span>
                    <input
                      value={propForm.nombres}
                      onChange={(e) => setPropForm({ ...propForm, nombres: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">Tipo Documento</span>
                    <select
                      value={propForm.tipoDoc}
                      onChange={(e) => setPropForm({ ...propForm, tipoDoc: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">CARNET EXT.</option>
                    </select>

                    <span className="font-bold text-black">Nro Documento *</span>
                    <input
                      value={propForm.dniRuc}
                      onChange={(e) => setPropForm({ ...propForm, dniRuc: e.target.value })}
                      className="col-span-2 rounded border border-slate-400 bg-white px-2 py-1 text-black font-bold focus:border-sat-cyan focus:outline-none"
                    />

                    <span className="font-bold text-black">N° T. Propiedad/TIV</span>
                    <div className="col-span-2 flex items-center gap-3">
                      <input
                        disabled={propForm.noPresentoTarjeta}
                        value={propForm.tarjeta}
                        onChange={(e) => setPropForm({ ...propForm, tarjeta: e.target.value })}
                        className={`flex-1 rounded border px-2 py-1 text-black font-bold focus:outline-none ${propForm.noPresentoTarjeta ? "bg-slate-100 border-slate-300" : "border-slate-400 bg-white focus:border-sat-cyan"}`}
                      />
                      <label className="flex items-center gap-1 text-[11px] font-bold text-black cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={propForm.noPresentoTarjeta}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPropForm({
                              ...propForm,
                              noPresentoTarjeta: checked,
                              tarjeta: checked ? "No tiene Tarjeta" : "",
                            });
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-400 text-sat-cyan"
                        />
                        No presentó Tarjeta de Propiedad
                      </label>
                    </div>

                    <span className="font-bold text-black">Domicilio</span>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <input
                        value={propForm.domicilio}
                        onChange={(e) => setPropForm({ ...propForm, domicilio: e.target.value })}
                        className="flex-1 rounded border border-slate-400 bg-white px-2 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setDomicilioOrigin("prop"); setShowBuscarDomicilio(true); }}
                        className="shrink-0 h-7 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-black transition flex items-center gap-1"
                        title="Buscar vía y calle del domicilio"
                      >
                        <Search size={12} /> Buscar
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-start gap-2 pt-3 border-t border-slate-300 mt-3">
                    <button
                      type="button"
                      onClick={handleGrabarPropietario}
                      disabled={newPropLoading}
                      className="px-4 py-1.5 bg-sat-cyan text-white rounded-md text-xs font-bold hover:bg-cyan-600 transition flex items-center gap-1"
                    >
                      {newPropLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Grabar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNuevoPropietario(false)}
                      className="px-4 py-1.5 border border-slate-400 rounded-md text-xs font-bold text-black hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submodal Buscar Domicilio (vía y calle) — igual al nuevadomicilio del antiguo */}
          {showBuscarDomicilio && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2">
              <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-[11px] animate-scale-up flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-3 py-2 shrink-0">
                  <span className="text-xs font-bold text-white tracking-tight">Nueva Domicilio — Búsqueda de Vía y Calle</span>
                  <button type="button" onClick={() => setShowBuscarDomicilio(false)} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-3 space-y-2 bg-white text-black font-semibold overflow-y-auto">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-24 font-bold text-black">Tipo de Vía</span>
                      <select
                        value={domTipoVia}
                        onChange={(e) => setDomTipoVia(e.target.value)}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      >
                        <option value="">[SELECCIONE]</option>
                        {comboVias.map((v) => (
                          <option key={v.id} value={v.id}>{v.descripcion}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-24 font-bold text-black">Vía</span>
                      <input
                        value={domVia}
                        onChange={(e) => setDomVia(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && searchDomicilio(1)}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-24 font-bold text-black">Tipo de Lugar</span>
                      <select
                        value={domTipoLugar}
                        onChange={(e) => setDomTipoLugar(e.target.value)}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      >
                        <option value="">[SELECCIONE]</option>
                        {comboLugares.map((l) => (
                          <option key={l.id} value={l.id}>{l.descripcion}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-24 font-bold text-black">Lugar</span>
                      <input
                        value={domLugar}
                        onChange={(e) => setDomLugar(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && searchDomicilio(1)}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-20 font-bold text-black">Número</span>
                      <input
                        value={domNumero}
                        onChange={(e) => setDomNumero(e.target.value.toUpperCase())}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-20 font-bold text-black">Manzana</span>
                      <input
                        value={domManzana}
                        onChange={(e) => setDomManzana(e.target.value.toUpperCase())}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-20 font-bold text-black">Lote</span>
                      <input
                        value={domLote}
                        onChange={(e) => setDomLote(e.target.value.toUpperCase())}
                        className="flex-1 rounded border border-slate-400 bg-white px-1.5 py-1 text-black font-semibold focus:border-sat-cyan focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => searchDomicilio(1)}
                      className="inline-flex items-center gap-1 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-600 transition"
                    >
                      {domLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBuscarDomicilio(false)}
                      className="rounded-md border border-slate-400 bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                  </div>

                  {domResult && (
                    <>
                      <table className="w-full text-[10px] border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-100 text-black font-bold text-left border-b border-slate-300">
                            <th className="px-2 py-1">Tipo Vía</th>
                            <th className="px-2 py-1">Vía</th>
                            <th className="px-2 py-1">Tipo Lugar</th>
                            <th className="px-2 py-1">Lugar</th>
                            <th className="px-2 py-1 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {domResult.rows.map((row: any, idx: number) => (
                            <tr key={row.id || idx} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-black transition">
                              <td className="px-2 py-1 text-black">{row.tvia}</td>
                              <td className="px-2 py-1 font-bold text-black">{row.via}</td>
                              <td className="px-2 py-1 text-black">{row.tlugar}</td>
                              <td className="px-2 py-1 font-semibold text-black">{row.lugar}</td>
                              <td className="px-2 py-1 text-center">
                                <button type="button" onClick={() => seleccionarDomicilio(row)}
                                  className="rounded bg-sat-cyan px-2 py-0.5 text-white hover:bg-cyan-600 font-bold transition text-[10px]">
                                  Escoger
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <Pagination total={domResult.total} page={domPage} limit={10} onPage={(p) => searchDomicilio(p)} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePanel === "lugar" && (
            <LookupPanel title="Lugar de Infracción" onClose={() => setActivePanel(null)}>
              <div className="space-y-1.5 mb-2 bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-slate-900">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-20 font-semibold text-slate-800">Tipo de Via:</span>
                    <select value={lugTipoVia} onChange={(e) => setLugTipoVia(e.target.value)} className="w-full rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 font-semibold">
                      <option value="">[SELECCIONE]</option>
                      {comboVias.map((v) => (
                        <option key={v.id} value={v.id}>{v.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-12 font-semibold text-slate-800">Via:</span>
                    <input value={lugVia} onChange={(e) => setLugVia(e.target.value)} className="w-full rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 font-semibold" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-20 font-semibold text-slate-800">Tipo Lugar:</span>
                    <select value={lugTipoLugar} onChange={(e) => setLugTipoLugar(e.target.value)} className="w-full rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 font-semibold">
                      <option value="">[SELECCIONE]</option>
                      {comboLugares.map((l) => (
                        <option key={l.id} value={l.id}>{l.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-12 font-semibold text-slate-800">Lugar:</span>
                    <input value={lugLugar} onChange={(e) => setLugLugar(e.target.value)} className="w-full rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 font-semibold" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-20 font-semibold text-slate-800">Cuadra:</span>
                    <input value={lugCuadra} onChange={(e) => setLugCuadra(e.target.value)} className="w-20 rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 font-semibold" />
                  </div>
                  <button type="button" onClick={() => searchLugar(1)} className="rounded bg-sat-navy text-white px-4 py-1 text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1">
                    {lugLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                  </button>
                </div>
              </div>

              {lugResult && (
                <>
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 text-left border-b border-slate-300 font-semibold">
                        <th className="px-2 py-1">Id</th>
                        <th className="px-2 py-1">Tvia</th>
                        <th className="px-2 py-1">Via</th>
                        <th className="px-2 py-1">Tlugar</th>
                        <th className="px-2 py-1">Lugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lugResult.rows.map((row: any) => (
                        <tr key={row.id} onClick={() => selectLugar(row)}
                          className="cursor-pointer hover:bg-sat-cyan/10 border-b border-slate-200 text-slate-900 transition">
                          <td className="px-2 py-1 font-mono text-slate-900 font-semibold">{row.id}</td>
                          <td className="px-2 py-1 text-slate-900 font-semibold">{row.tvia}</td>
                          <td className="px-2 py-1 font-semibold text-slate-900">{row.via}</td>
                          <td className="px-2 py-1 text-slate-900 font-semibold">{row.tlugar}</td>
                          <td className="px-2 py-1 text-slate-900 font-semibold">{row.lugar}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination total={lugResult.total} page={lugPage} limit={10} onPage={(p) => searchLugar(p)} />
                </>
              )}

              <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-300">
                <button type="button" onClick={() => setActivePanel(null)} className="rounded border border-slate-400 bg-white px-3 py-1 text-xs text-slate-800 font-semibold hover:bg-slate-100">
                  Cerrar
                </button>
                <button type="button" onClick={() => setShowNuevaJuca(true)}
                  className="rounded border border-sat-cyan bg-cyan-50 px-3 py-1 text-xs font-semibold text-sat-navy hover:bg-cyan-100">
                  Nueva calle y Junta
                </button>
              </div>
            </LookupPanel>
          )}

          {activePanel === "placa" && (
            <LookupPanel title="Placa / Maestro de Conductor" onClose={() => setActivePanel(null)}>
              <div className="flex gap-2 items-center mb-3">
                <span className="font-semibold text-slate-800 text-xs shrink-0">Placa:</span>
                <input value={placaBusq} onChange={(e) => setPlacaBusq(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && searchPlaca(1)}
                  placeholder="Número de Placa…"
                  className="flex-1 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-slate-900 font-bold uppercase focus:border-sat-cyan focus:outline-none" />
                <button type="button" onClick={() => searchPlaca(1)} className="rounded-md border border-slate-400 bg-sat-navy text-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1">
                  {placaLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
              </div>
              {placaResult && (
                <>
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold text-left border-b border-slate-300">
                        <th className="px-2 py-1">Id</th>
                        <th className="px-2 py-1">Placa</th>
                        <th className="px-2 py-1">TipoVehiculo</th>
                        <th className="px-2 py-1">Marca</th>
                        <th className="px-2 py-1 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placaResult.rows.map((row: any, idx: number) => (
                        <tr key={row.idtramplac || idx} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-slate-900 transition">
                          <td className="px-2 py-1 text-slate-900 font-mono font-semibold">{row.idtramplac}</td>
                          <td className="px-2 py-1 text-slate-900 font-bold uppercase">{row.codplac || row.placa}</td>
                          <td className="px-2 py-1 font-semibold text-slate-900">{row.desvehi || row.tipoVehiculo}</td>
                          <td className="px-2 py-1 text-slate-900 font-semibold">{row.desmarc || row.marca}</td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => selectPlaca(row)}
                              className="rounded-full bg-cyan-600 p-1 text-white hover:bg-cyan-700 font-bold transition text-[10px]" title="Seleccionar">
                              ✓
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination total={placaResult.total} page={placaPage} limit={10} onPage={(p) => searchPlaca(p)} />
                </>
              )}
              <div className="mt-3 flex justify-between items-center border-t border-slate-300 pt-2">
                <button type="button" onClick={() => setActivePanel(null)} className="rounded border border-slate-400 bg-white px-3 py-1 text-xs text-slate-800 font-semibold hover:bg-slate-100">
                  Cerrar
                </button>
                <button type="button" onClick={() => setShowNuevaPlaca(true)}
                  className="rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-200">
                  Nueva Placa
                </button>
              </div>
            </LookupPanel>
          )}

          {activePanel === "policia" && (
            <LookupPanel title="Policia" onClose={() => setActivePanel(null)}>
              <div className="flex gap-2 items-center mb-3">
                <span className="font-semibold text-slate-800 text-xs shrink-0">Policia:</span>
                <input value={polBusq} onChange={(e) => setPolBusq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPolicia(1)}
                  placeholder="CIP o Nombre de Policía…"
                  className="flex-1 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-sat-cyan focus:outline-none" />
                <button type="button" onClick={() => searchPolicia(1)} className="rounded-md border border-slate-400 bg-sat-navy text-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1">
                  {polLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
              </div>
              {polResult && (
                <>
                  <table className="w-full text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold text-left border-b border-slate-300">
                        <th className="px-2 py-1">Id</th>
                        <th className="px-2 py-1">CIP</th>
                        <th className="px-2 py-1">Policia</th>
                        <th className="px-2 py-1 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {polResult.rows.map((row: any, idx: number) => (
                        <tr key={row.ncip || idx} className="hover:bg-sat-cyan/10 border-b border-slate-200 text-slate-900 transition">
                          <td className="px-2 py-1 font-mono text-slate-900 font-semibold">{row.id || idx + 1}</td>
                          <td className="px-2 py-1 font-mono font-semibold text-slate-900">{row.ncip || row.cip}</td>
                          <td className="px-2 py-1 font-semibold text-slate-900">{row.datos || row.policia}</td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => selectPolicia(row)}
                              className="rounded-full bg-cyan-600 p-1 text-white hover:bg-cyan-700 font-bold transition text-[10px]" title="Seleccionar">
                              ✓
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination total={polResult.total} page={polPage} limit={10} onPage={(p) => searchPolicia(p)} />
                </>
              )}
              <div className="mt-3 flex justify-between items-center border-t border-slate-300 pt-2">
                <button type="button" onClick={() => setActivePanel(null)} className="rounded border border-slate-400 bg-white px-3 py-1 text-xs text-slate-800 font-semibold hover:bg-slate-100">
                  Cerrar
                </button>
              </div>
            </LookupPanel>
          )}

          {/* Submodal Flotante: Nueva Placa (igual al formuplaca del antiguo) */}
          {showNuevaPlaca && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2">
              <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-[11px] animate-scale-up">
                <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-3 py-2">
                  <span className="text-xs font-bold text-white tracking-tight">Nueva Placa</span>
                  <button type="button" onClick={() => setShowNuevaPlaca(false)} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 space-y-2.5 bg-white text-black font-bold">
                  {nuevaPlacaError && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-red-600 text-xs font-bold">
                      {nuevaPlacaError}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Placa</span>
                    <input value={placaForm.codplac} onChange={(e) => setPlacaForm({ ...placaForm, codplac: e.target.value.toUpperCase() })}
                      className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold uppercase focus:border-sat-cyan focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Tipo</span>
                    <select value={placaForm.tipvehi} onChange={(e) => setPlacaForm({ ...placaForm, tipvehi: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none">
                      <option value="">[SELECCIONE]</option>
                      {placaCombos.tipos.map((t) => (
                        <option key={t.id} value={t.id}>{t.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Marca</span>
                    <select value={placaForm.codmarc} onChange={(e) => setPlacaForm({ ...placaForm, codmarc: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none">
                      <option value="">[SELECCIONE]</option>
                      {placaCombos.marcas.map((m) => (
                        <option key={m.id} value={m.id}>{m.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Año de Fabricación</span>
                    <input value={placaForm.aniofab} maxLength={4} onChange={(e) => setPlacaForm({ ...placaForm, aniofab: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Color</span>
                    <select value={placaForm.codcolo} onChange={(e) => setPlacaForm({ ...placaForm, codcolo: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none">
                      <option value="">[SELECCIONE]</option>
                      {placaCombos.colores.map((c) => (
                        <option key={c.id} value={c.id}>{c.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Formalidad</span>
                    <input value={placaForm.formalidad} readOnly className="flex-1 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-black font-bold" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 font-bold text-black">Placa Secundaria</span>
                    <input value={placaForm.codplac1} onChange={(e) => setPlacaForm({ ...placaForm, codplac1: e.target.value.toUpperCase() })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold uppercase focus:border-sat-cyan focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="w-28 font-bold text-black">Estado</span>
                    <label className="flex items-center gap-1 font-bold text-black cursor-pointer">
                      <input type="radio" name="placaEstado" checked={placaForm.estado === "1"} onChange={() => setPlacaForm({ ...placaForm, estado: "1" })} className="text-sat-cyan" />
                      Activo
                    </label>
                    <label className="flex items-center gap-1 font-bold text-black cursor-pointer">
                      <input type="radio" name="placaEstado" checked={placaForm.estado === "0"} onChange={() => setPlacaForm({ ...placaForm, estado: "0" })} className="text-sat-cyan" />
                      Inactivo
                    </label>
                  </div>
                  <div className="flex justify-start gap-2 pt-3 border-t border-slate-300 mt-2">
                    <button type="button" onClick={handleGrabarPlaca} disabled={nuevaPlacaLoading} className="px-4 py-1.5 bg-sat-cyan text-white rounded-md text-xs font-bold hover:bg-cyan-600 transition flex items-center gap-1">
                      {nuevaPlacaLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                    </button>
                    <button type="button" onClick={() => setShowNuevaPlaca(false)} className="px-4 py-1.5 border border-slate-400 rounded-md text-xs font-bold text-black hover:bg-slate-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submodal Flotante e Independiente: Búsqueda de Calle y Junta */}
          {showNuevaJuca && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xs p-2">
              <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-[11px] animate-scale-up">
                <div className="flex items-center justify-between bg-gradient-to-r from-sat-navy via-[#1b2b4a] to-slate-800 px-3 py-2">
                  <span className="text-xs font-bold text-white tracking-tight">Busqueda de Calle y Junta</span>
                  <button type="button" onClick={() => setShowNuevaJuca(false)} className="rounded p-0.5 text-white/60 hover:text-white hover:bg-white/10">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 space-y-3 bg-white text-black font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-bold text-black">Tipo de Via</span>
                    <select value={jucaForm.tipoVia} onChange={(e) => setJucaForm({ ...jucaForm, tipoVia: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none">
                      <option value="">[SELECCIONE]</option>
                      {comboVias.map((v) => (
                        <option key={v.id} value={v.id}>{v.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-bold text-black">Via</span>
                    <input value={jucaForm.via} onChange={(e) => setJucaForm({ ...jucaForm, via: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-bold text-black">Tipo de Lugar</span>
                    <select value={jucaForm.tipoLugar} onChange={(e) => setJucaForm({ ...jucaForm, tipoLugar: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none">
                      <option value="">[SELECCIONE]</option>
                      {comboLugares.map((l) => (
                        <option key={l.id} value={l.id}>{l.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-bold text-black">Lugar</span>
                    <input value={jucaForm.lugar} onChange={(e) => setJucaForm({ ...jucaForm, lugar: e.target.value })} className="flex-1 rounded border border-slate-400 px-2 py-1 text-xs text-black font-bold focus:border-sat-cyan focus:outline-none" />
                  </div>
                  <div className="flex justify-start gap-2 pt-3 border-t border-slate-300 mt-2">
                    <button type="button" onClick={handleGrabarJuca} disabled={jucaLoading} className="px-4 py-1.5 bg-sat-cyan text-white rounded-md text-xs font-bold hover:bg-cyan-600 transition flex items-center gap-1">
                      {jucaLoading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Grabar
                    </button>
                    <button type="button" onClick={() => setShowNuevaJuca(false)} className="px-4 py-1.5 border border-slate-400 rounded-md text-xs font-bold text-black hover:bg-slate-100">
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Content - Distribución horizontal idéntica, letras en negro nítido */}
          <fieldset disabled={readOnly} className="space-y-1.5 text-black text-[11px] leading-tight font-medium disabled:opacity-90">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-red-600 text-xs font-bold">
                {error}
              </div>
            )}

            {/* Fila 1: Checkbox Acta de Control | Serie, Talonario, N° Papeleta y Oficio | Fecha y Hora de Infraccion */}
            <div className="flex items-center gap-3 py-0.5">
              <label className="flex items-center gap-1.5 font-semibold text-blue-700 cursor-pointer shrink-0">
                <input type="checkbox" checked={form.acta} onChange={(e) => upd("acta", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-400 text-blue-600" />
                Acta de Control
              </label>

              <div className="flex items-center gap-1">
                <span className="text-slate-800 font-medium">Serie, Talonario, N° Papeleta y Oficio</span>
                <input readOnly={!form.acta} value={form.seriePapel} onChange={(e) => upd("seriePapel", e.target.value.toUpperCase())}
                  className={`w-12 h-6 rounded border px-1 text-center font-semibold text-xs uppercase ${form.acta ? "border-slate-400 bg-white text-slate-900" : "border-slate-300 bg-slate-100 text-slate-800"}`} />
                <span className="text-slate-600 font-medium">-</span>
                <input value={form.taloPapel} onChange={(e) => upd("taloPapel", e.target.value)} maxLength={2}
                  className="w-8 h-6 rounded border border-slate-400 bg-white px-1 text-center font-semibold text-xs text-slate-900" />
                <span className="text-slate-600 font-medium">-</span>
                <input value={form.numeroPapel} onChange={(e) => upd("numeroPapel", e.target.value)} maxLength={6}
                  className="w-20 h-6 rounded border border-slate-400 bg-white px-1 text-center font-semibold text-xs text-slate-900" />
                <span className="text-slate-600 font-medium">-</span>
                <input value={form.oficio} onChange={(e) => upd("oficio", e.target.value)}
                  className="w-20 h-6 rounded border border-slate-400 bg-white px-1 text-xs text-slate-900 font-semibold" />
              </div>

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-slate-800 font-medium">Fecha y Hora de Infracción</span>
                <input type="date" value={form.fechaAplicacion} onChange={(e) => upd("fechaAplicacion", e.target.value)}
                  className="h-6 rounded border border-slate-400 bg-white px-1 text-xs text-slate-900 font-semibold" />
                <input value={form.hora} onChange={(e) => upd("hora", e.target.value)} maxLength={2}
                  className="w-7 h-6 rounded border border-slate-400 bg-white px-1 text-center text-xs text-slate-900 font-semibold" />
                <span className="text-slate-600 font-medium">:</span>
                <input value={form.minuto} onChange={(e) => upd("minuto", e.target.value)} maxLength={2}
                  className="w-7 h-6 rounded border border-slate-400 bg-white px-1 text-center text-xs text-slate-900 font-semibold" />
                <span className="text-[10px] text-slate-600 font-normal">(HH:MM) 00-23 Horas</span>
              </div>
            </div>

            {/* Fila 2: Codigo Infracc. | Importe en S/. | Meses / Resolución (si aplica) */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Código Infracc.</span>
                <input value={form.codigoInfraccion} onChange={(e) => upd("codigoInfraccion", e.target.value.toUpperCase())}
                  className="w-16 h-6 rounded border border-slate-400 bg-white px-1.5 font-bold uppercase text-xs text-slate-900" />
                <button type="button" onClick={() => { setActivePanel("infraccion"); searchInfraccion(1); }} className="h-6 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                  ...
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Importe en S/.</span>
                <input type="number" step="0.01" min="0" value={form.importe} onChange={(e) => upd("importe", e.target.value)}
                  className="w-28 h-6 rounded border border-slate-400 bg-white px-1.5 text-right font-bold text-xs text-slate-900" />
              </div>

              {showResolucion && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-800 font-medium">Meses:</span>
                    <input value={form.meses} onChange={(e) => upd("meses", e.target.value)}
                      className="w-12 h-6 rounded border border-slate-400 bg-white px-1 text-xs text-slate-900 font-semibold" />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-slate-800 font-medium">Resolución:</span>
                    <input value={form.resolucion} onChange={(e) => upd("resolucion", e.target.value)}
                      className="w-full h-6 rounded border border-slate-400 bg-white px-1.5 text-xs text-slate-900 font-semibold" />
                  </div>
                </>
              )}
            </div>

            {/* Fila condicional Obs Resolución / Fecha Resolución */}
            {showResolucion && (
              <div className="flex items-center gap-4 py-0.5">
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-slate-800 font-medium">Observaciones:</span>
                  <input value={form.obsResolucion} onChange={(e) => upd("obsResolucion", e.target.value)}
                    className="w-full h-6 rounded border border-slate-400 bg-white px-1.5 text-xs text-slate-900 font-semibold" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-800 font-medium">Fecha Resolución:</span>
                  <input type="date" value={form.fechaResolucion} onChange={(e) => upd("fechaResolucion", e.target.value)}
                    className="h-6 rounded border border-slate-400 bg-white px-1 text-xs text-slate-900 font-semibold" />
                </div>
              </div>
            )}

            {/* Fila 3: Detalle Infracción Textarea */}
            <div className="py-0.5">
              <textarea value={form.detalleInfraccion} onChange={(e) => upd("detalleInfraccion", e.target.value)}
                rows={2} maxLength={250} placeholder="Detalle de la infracción..."
                className="w-full rounded-md border border-slate-400 bg-white p-1.5 text-xs font-normal text-slate-900 resize-none focus:border-sat-cyan focus:ring-1 focus:ring-sat-cyan/20 focus:outline-none" />
            </div>

            {/* Fila 4: Dosaje Etilico N° | Grado de Alcohol | Retención de brevete */}
            <div className="flex items-center gap-6 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Dosaje Etilico N°:</span>
                <input value={form.dosaje} onChange={(e) => upd("dosaje", e.target.value)}
                  className="w-32 h-6 rounded border border-slate-400 bg-white px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Grado de Alcohol:</span>
                <input value={form.grado} onChange={(e) => upd("grado", e.target.value)}
                  className="w-32 h-6 rounded border border-slate-400 bg-white px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                <input type="checkbox" checked={form.retener} onChange={(e) => upd("retener", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-400 text-sat-cyan" />
                Retención de brevete
              </label>
            </div>

            {/* Fila 5: Lugar/Av./Jr./Cdra: */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Lugar/Av./Jr./Cdra:</span>
              <input readOnly value={form.lugar} className="flex-1 h-6 rounded border border-slate-300 bg-slate-100 px-2 text-xs font-semibold text-slate-900" />
              <button type="button" onClick={() => { setActivePanel("lugar"); searchLugar(1); }} className="h-6 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                ...
              </button>
            </div>

            {/* Fila 6: Referencia: */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Referencia:</span>
              <input value={form.referencia} onChange={(e) => upd("referencia", e.target.value)}
                className="flex-1 h-6 rounded border border-slate-400 bg-white px-2 text-xs text-slate-900 font-semibold focus:border-sat-cyan focus:outline-none" />
            </div>

            {/* Fila 7: Codigo Conductor | DNI/RUC | Lic. de Conducir */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Codigo Conductor:</span>
                <input readOnly value={form.codigoConductor} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
                <button type="button" onClick={() => { setActivePanel("conductor"); searchConductor(1); }} className="h-6 px-2 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                  ***
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">DNI/RUC:</span>
                <input readOnly value={form.dniConductor} className="w-24 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Lic. de Conducir:</span>
                <input readOnly value={form.licenciaConductor} className="w-32 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
              </div>
            </div>

            {/* Fila 8: Datos del Conductor: */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Datos del Conductor:</span>
              <input readOnly value={form.nombreConductor} className="flex-1 h-6 rounded border border-slate-300 bg-slate-100 px-2 font-semibold text-xs text-slate-900" />
            </div>

            {/* Fila 9: Dirección: + Icono Editar */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Dirección:</span>
              <input
                readOnly={!form.dirConductorEditable}
                value={form.direccionConductor}
                onChange={(e) => upd("direccionConductor", e.target.value)}
                className={`flex-1 h-6 rounded border px-2 text-xs font-semibold text-slate-900 ${form.dirConductorEditable ? "border-slate-400 bg-white focus:border-sat-cyan focus:outline-none" : "border-slate-300 bg-slate-100"}`}
              />
              <button type="button" title="Habilitar edición" onClick={() => upd("dirConductorEditable", !form.dirConductorEditable)}
                className={`p-1 rounded border transition ${form.dirConductorEditable ? "bg-sat-cyan/10 border-sat-cyan text-sat-cyan" : "border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800"}`}>
                <Pencil size={12} />
              </button>
            </div>

            {/* Fila 10: Placa | Placa Secundaria */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Placa:</span>
                <input readOnly value={form.idPlaca} className="w-16 min-w-[50px] h-6 rounded border border-slate-300 bg-slate-100 px-1 font-semibold text-xs text-slate-900 text-center" />
                <input readOnly value={form.placa} className="w-24 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-bold text-xs uppercase text-slate-900" />
                <button type="button" onClick={() => { setActivePanel("placa"); searchPlaca(1); }} className="h-6 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                  ...
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Placa Secundaria:</span>
                <input readOnly value={form.placaSecundaria} className="w-24 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
              </div>
            </div>

            {/* Fila 11: Marca | Tipo de Veh. | Color | Año */}
            <div className="flex items-center gap-3 py-0.5">
              <div className="flex items-center gap-1">
                <span className="text-slate-800 font-medium">Marca:</span>
                <input readOnly value={form.marca} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-800 font-medium">Tipo de Veh.:</span>
                <input readOnly value={form.tipoVehiculo} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-800 font-medium">Color:</span>
                <input readOnly value={form.color} className="w-24 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-800 font-medium">Año:</span>
                <input readOnly value={form.anio} className="w-16 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
            </div>

            {/* Fila 12: Observaciones | CIP Policia */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-slate-800 font-medium shrink-0">Observaciones:</span>
                <input value={form.detalle} onChange={(e) => upd("detalle", e.target.value)}
                  className="w-full h-6 rounded border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-900 focus:border-sat-cyan focus:outline-none" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium shrink-0">CIP Policia:</span>
                <input readOnly value={form.cipAuto} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
                <button type="button" onClick={() => { setActivePanel("policia"); searchPolicia(1); }} className="h-6 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                  ...
                </button>
              </div>
            </div>

            {/* Fila 13: Cod. Propietario | No presento Tarjeta de Propiedad */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">Cod. Propietario</span>
                <input readOnly value={form.codigoPropietario} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 font-semibold text-xs text-slate-900" />
                <button type="button" onClick={() => { setActivePanel("propietario"); searchPropietario(1); }} className="h-6 px-2.5 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-800 transition">
                  ...
                </button>
              </div>
              <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                <input type="checkbox" checked={form.presento} onChange={(e) => upd("presento", e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-400 text-sat-cyan" />
                No presento Tarjeta de Propiedad
              </label>
            </div>

            {/* Fila 14: Propietario: */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Propietario:</span>
              <input readOnly value={form.nombrePropietario ?? ""} className="flex-1 h-6 rounded border border-slate-300 bg-slate-100 px-2 font-semibold text-xs text-slate-900" />
            </div>

            {/* Fila 15: DNI/RUC | T. Propiedad/TIV */}
            <div className="flex items-center gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">DNI/RUC:</span>
                <input readOnly value={form.dniPropietario ?? ""} className="w-28 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 font-medium">T. Propiedad/TIV:</span>
                <input readOnly value={form.tipoPropiedad ?? ""} className="w-40 h-6 rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-900 font-semibold" />
              </div>
            </div>

            {/* Fila 16: Dirección (Propietario) */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Dirección:</span>
              <input readOnly value={form.direccionPropietario ?? ""} className="flex-1 h-6 rounded border border-slate-300 bg-slate-100 px-2 text-xs text-slate-900 font-semibold" />
            </div>

            {/* Fila 17: Estado Anterior: */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-slate-800 font-medium shrink-0">Estado Anterior:</span>
              <input readOnly value={form.estadoAnterior ?? ""} className="w-40 h-6 rounded border border-slate-300 bg-slate-100 px-2 text-xs text-slate-900 font-semibold" />
            </div>
          </fieldset>
        </div>

        {/* Footer Moderno en Blanco/Slate */}
        <div className="flex items-center justify-between border-t border-slate-300 px-4 py-2.5 shrink-0 bg-slate-100 rounded-b-xl text-black">
          <div className="flex items-center gap-4 text-xs font-bold text-black">
            <span>Usuario: <strong className="text-black font-bold">JMOZO</strong></span>
            <span>Estacion: <strong className="text-black font-bold">NIMAGEN01</strong></span>
            <span>Fecha: <strong className="text-black font-bold">{new Date().toLocaleDateString('es-PE')}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="rounded-md border border-slate-400 bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-slate-200 disabled:opacity-50 transition">
              Cancelar
            </button>
            {!readOnly && (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-600 disabled:opacity-60 transition">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Grabar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

