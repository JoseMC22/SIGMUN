"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  X,
  Building2,
  Car,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Play,
  Loader2,
  Printer,
} from "lucide-react";
import {
  generarGenerarOpAction,
  getGenerarOpPdfAction,
  procesarGenerarOpAction,
  type GenerarOpRow,
  type ProcesarOpRow,
} from "@/actions/cobranza/generar-op";
import { abrirPdfBase64 } from "@/lib/op-pdf";
import {
  buildAnnosPack,
  buildTrimestresPack,
  formatFechaDdMmAaaa,
} from "./op-params";
import {
  agruparPorAnio,
  num,
  subtotalizar,
  totalFila,
  type SubtotalCorte,
} from "./resultado-cortes";

// Modal de generación de orden de pago.
//
// "Procesar" proyecta el estado de cuenta (solo lectura). "Generar OP" llama
// al backend, que re-proyecta server-side y ejecuta Rentas.sp_Genera_OP /
// sp_Genera_OPVEH: crea la OP real y devuelve su número. La grilla se conserva
// después de generar como constancia de los recibos incluidos.

/** Tributo destino de la orden de pago. */
export type TipoOp = "predial" | "vehicular";

// Rango de años que ofrece el formulario.
const ANIO_MIN = 2016;

const TRIMESTRES = [1, 2, 3, 4] as const;

// Columnas de la proyección que devuelve Caja.sp_EstCta_Rentasop_proyectado.
// El SP devuelve ~27 columnas; acá se muestran las que arman el detalle de la
// orden de pago. El importe total no viene del SP: se calcula como en el resto
// de la familia (rd-alcabala), imp_reaj + mora + costo_emis.
type ResultadoKind = "text" | "mono" | "money" | "factor";

const RESULTADO_COLS: { key: string; header: string; kind: ResultadoKind }[] = [
  { key: "des_tipo", header: "Tributo", kind: "text" },
  { key: "cod_pred", header: "Predio", kind: "mono" },
  { key: "anexo", header: "Anexo", kind: "mono" },
  { key: "sub_anexo", header: "Subanexo", kind: "mono" },
  { key: "periodo", header: "Periodo", kind: "text" },
  { key: "imp_insol", header: "Insoluto", kind: "money" },
  { key: "fact_reaj", header: "Fac. Reaj.", kind: "factor" },
  { key: "imp_reaj", header: "Imp. Reaj.", kind: "money" },
  { key: "fact_mora", header: "Fac. Mora", kind: "factor" },
  { key: "mora", header: "Interés", kind: "money" },
  { key: "costo_emis", header: "Costo Emis.", kind: "money" },
];

// Las columnas identificatorias encabezan la tabla (tributo, predio, anexo,
// subanexo, periodo): los cortes y subtotales las puentean con un colSpan.
const COLS_IDENT = Math.max(
  0,
  RESULTADO_COLS.findIndex((c) => c.kind === "money"),
);

// Columnas de importe del subtotal, mapeadas 1 a 1 con SubtotalCorte.
const SUBTOTAL_KEY: Record<string, keyof SubtotalCorte> = {
  imp_insol: "imp_insol",
  imp_reaj: "imp_reaj",
  mora: "mora",
  costo_emis: "costo_emis",
};

function formatCelda(value: unknown, kind: ResultadoKind): string {
  if (value === null || value === undefined || value === "") return "";
  if (kind === "money") return num(value).toFixed(2);
  if (kind === "factor") return num(value).toFixed(4);
  return String(value);
}

function celdaCls(kind: ResultadoKind): string {
  const base = "whitespace-nowrap px-2 py-1 text-[10px] text-slate-600";
  if (kind === "money" || kind === "factor") {
    return `${base} font-mono text-right`;
  }
  if (kind === "mono") return `${base} font-mono`;
  return base;
}

// Fecha de hoy en horario local. `toISOString` usa UTC y adelanta/atrasa el día
// según la zona: se arma con los componentes locales.
function hoyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nombreContribuyente(row: GenerarOpRow): string {
  const partes = [row.nombres, row.paterno, row.materno]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return partes.join(" ") || String(row.razon ?? "");
}

function nombreCompleto(row: GenerarOpRow): string {
  return nombreContribuyente(row) || "—";
}

/** Esquina superior izquierda del área de contenido del shell. */
type OffsetContenido = { left: number; top: number };

// useLayoutEffect advierte durante el SSR; en el cliente evita el salto de un
// frame antes de medir el contenedor.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 transition focus:border-sat-cyan focus:ring-2 focus:ring-sat-cyan/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
const labelCls =
  "block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 leading-none";

interface Props {
  tipo: TipoOp;
  contribuyente: GenerarOpRow;
  onClose: () => void;
}

/** OP emitida para un corte (año) en la corrida actual del modal. */
interface OpGenerada {
  anno: string;
  numVal: string;
  anoVal: string;
  idValor: string;
  total: number;
}

export default function GenerarOpModal({ tipo, contribuyente, onClose }: Props) {
  const anioActual = new Date().getFullYear();
  const anios = useMemo(
    () =>
      Array.from({ length: anioActual - ANIO_MIN + 1 }, (_, i) => ANIO_MIN + i),
    [anioActual],
  );

  const [fecha, setFecha] = useState(hoyLocal());
  const [anioDesde, setAnioDesde] = useState(anioActual);
  const [anioHasta, setAnioHasta] = useState(anioActual);
  const [trimestres, setTrimestres] = useState<number[]>([]);

  // Resultado de la última pulsación de "Procesar" (datos) o "Generar OP"
  // (OPs creadas, una por año marcado). En "generadas" se conservan las filas
  // que se mostraron antes de generar, como constancia de los recibos.
  const [resultado, setResultado] = useState<
    | { kind: "error"; msg: string; detail?: string }
    | { kind: "data"; rows: ProcesarOpRow[]; total: number }
    | {
        kind: "generadas";
        items: OpGenerada[];
        rows: ProcesarOpRow[];
        /** Años que fallaron en esta corrida; los éxitos se conservan. */
        fallos?: { anno: string; msg: string }[];
      }
    | null
  >(null);
  // Claves de corte (anno o "sin-anio") marcadas para generar.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  // OPs ya emitidas en esta sesión del modal, por clave de corte.
  const [generados, setGenerados] = useState<
    Record<string, { idValor: string; numVal: string; anoVal: string }>
  >({});
  // Corte que se está emitiendo; null cuando no hay generación en curso.
  const [generandoAnio, setGenerandoAnio] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  // Clave `numVal-anoVal` del PDF que se está abriendo.
  const [abriendoPdf, setAbriendoPdf] = useState<string | null>(null);
  const [pdfAviso, setPdfAviso] = useState<string | null>(null);

  // Cortes por año de la última consulta: se recalculan solo cuando cambian
  // los resultados, no en cada render del modal.
  const cortes = useMemo(
    () =>
      resultado?.kind === "data" || resultado?.kind === "generadas"
        ? agruparPorAnio(resultado.rows)
        : [],
    [resultado],
  );
  const totalGeneral = useMemo(
    () =>
      subtotalizar(
        resultado?.kind === "data" || resultado?.kind === "generadas"
          ? resultado.rows
          : [],
      ),
    [resultado],
  );

  // El modal se centra sobre el área de contenido del shell, no sobre el
  // viewport: el sidebar ocupa 240px (64px colapsado) y, con el panel casi a
  // todo el ancho, centrarlo contra la pantalla lo montaría encima del sidebar.
  // Se mide en vivo porque el sidebar se colapsa y el offset cambia.
  const [offsetContenido, setOffsetContenido] =
    useState<OffsetContenido | null>(null);

  useIsomorphicLayoutEffect(() => {
    const contenido = document.querySelector("main");
    if (!contenido) return;

    const medir = () => {
      const rect = contenido.getBoundingClientRect();
      setOffsetContenido({ left: rect.left, top: rect.top });
    };

    medir();
    window.addEventListener("resize", medir);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", medir);
    }

    // Cubre el colapso del sidebar, que cambia el ancho de <main>.
    const observer = new ResizeObserver(medir);
    observer.observe(contenido);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const codigo = String(contribuyente.codigo ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Clave con la que se indexan la selección y las OPs generadas. */
  const claveCorte = (anno: string) => anno || "sin-anio";

  /** Etiqueta legible del corte en banners. */
  const etiquetaAnio = (anno: string) => (anno ? `Año ${anno}` : "Sin año");

  /** Descarta el resultado y cualquier selección/OP de la corrida anterior. */
  const reiniciar = () => {
    setResultado(null);
    setSeleccion(new Set());
    setGenerados({});
  };

  const toggleSeleccion = (clave: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const toggleTrimestre = (t: number) => {
    setTrimestres((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort(),
    );
    reiniciar();
  };

  /** Validaciones compartidas por "Procesar" y "Generar OP". */
  const validar = (): string | null => {
    if (!fecha) return "Ingrese la fecha de la orden.";
    if (anioDesde > anioHasta) {
      return "El año desde no puede ser mayor que el año hasta.";
    }
    if (trimestres.length === 0) return "Seleccione al menos un trimestre.";
    return null;
  };

  /**
   * Pide el PDF de la OP y lo abre en una pestaña nueva. Si el backend no
   * responde, no rompe el flujo: el banner con el número queda visible y se
   * avisa que el PDF no se pudo abrir.
   */
  const abrirPdf = async (idValor: string, numVal: string, anoVal: string) => {
    setAbriendoPdf(`${numVal}-${anoVal}`);
    setPdfAviso(null);
    try {
      const base64 = await getGenerarOpPdfAction(idValor, numVal, anoVal);
      if (!base64) {
        setPdfAviso(
          "No se pudo abrir el PDF de la OP. Probá de nuevo con «Ver OP».",
        );
        return;
      }
      abrirPdfBase64(base64);
    } catch {
      setPdfAviso(
        "No se pudo abrir el PDF de la OP. Probá de nuevo con «Ver OP».",
      );
    } finally {
      setAbriendoPdf(null);
    }
  };

  const generar = async () => {
    const error = validar();
    if (error) {
      setResultado({ kind: "error", msg: error });
      return;
    }

    // Solo los cortes marcados y todavía no emitidos. El orden es el de
    // `cortes` (años ascendente, "sin año" al final).
    const seleccionados = cortes.filter((corte) => {
      const clave = claveCorte(corte.anno);
      return seleccion.has(clave) && !generados[clave];
    });
    if (seleccionados.length === 0) {
      setResultado({ kind: "error", msg: "Seleccione al menos un año." });
      return;
    }

    const fechaDdMmAaaa = formatFechaDdMmAaaa(fecha);
    const annosPack = buildAnnosPack(anioDesde, anioHasta);
    const perioPack = buildTrimestresPack(trimestres);
    // Filas ya proyectadas: se conservan visibles después de generar.
    const filasPrevias =
      resultado?.kind === "data" || resultado?.kind === "generadas"
        ? resultado.rows
        : [];
    const itemsPrevios =
      resultado?.kind === "generadas" ? resultado.items : [];

    const exitos: OpGenerada[] = [];
    const fallos: { anno: string; msg: string }[] = [];

    // Una llamada (y una OP) por corte: nunca se mezclan filas de dos años.
    for (const corte of seleccionados) {
      const clave = claveCorte(corte.anno);
      setGenerandoAnio(clave);
      const idRecibos = corte.rows
        .map((row) => Number(row.idrecibo))
        .filter((id) => Number.isInteger(id) && id > 0);

      try {
        const result = await generarGenerarOpAction({
          codigo,
          nombre: nombreContribuyente(contribuyente),
          dirFiscal: String(contribuyente.dirfiscal ?? ""),
          numDoc: String(contribuyente.num_doc ?? ""),
          fechaProyectada: fechaDdMmAaaa,
          annos: annosPack,
          perio: perioPack,
          tipo,
          idRecibos,
        });
        if (!result.success || !result.num_val || !result.ano_val) {
          fallos.push({
            anno: corte.anno,
            msg: result.error ?? "Error al generar la orden de pago",
          });
          continue;
        }
        exitos.push({
          anno: corte.anno,
          numVal: result.num_val,
          anoVal: result.ano_val,
          idValor: result.id_valor ?? (tipo === "vehicular" ? "11" : "01"),
          total: result.total ?? corte.rows.length,
        });
      } catch {
        fallos.push({
          anno: corte.anno,
          msg: "Error de conexión con el servidor",
        });
      }
    }

    setGenerandoAnio(null);

    if (exitos.length === 0) {
      setResultado({
        kind: "error",
        msg:
          fallos
            .map((f) => `${etiquetaAnio(f.anno)}: ${f.msg}`)
            .join(" · ") || "Error al generar la orden de pago",
      });
      return;
    }

    const nuevosGenerados = { ...generados };
    for (const item of exitos) {
      nuevosGenerados[claveCorte(item.anno)] = {
        idValor: item.idValor,
        numVal: item.numVal,
        anoVal: item.anoVal,
      };
    }
    setGenerados(nuevosGenerados);

    setSeleccion((prev) => {
      const next = new Set(prev);
      for (const item of exitos) next.delete(claveCorte(item.anno));
      return next;
    });

    setResultado({
      kind: "generadas",
      items: [...itemsPrevios, ...exitos],
      rows: filasPrevias,
      ...(fallos.length > 0 ? { fallos } : {}),
    });

    // Un solo éxito: abrir su PDF. Con varios, el usuario los abre desde el
    // banner para no inundar de pestañas.
    if (exitos.length === 1) {
      const [item] = exitos;
      void abrirPdf(item.idValor, item.numVal, item.anoVal);
    }
  };

  const procesar = async () => {
    const error = validar();
    if (error) {
      setResultado({ kind: "error", msg: error });
      return;
    }

    const fechaDdMmAaaa = formatFechaDdMmAaaa(fecha);
    const annosPack = buildAnnosPack(anioDesde, anioHasta);
    // @perio y @annos viajan entre comillas dobles: el SP las convierte en
    // literales al armar su in (...) dinámico.
    const perioPack = buildTrimestresPack(trimestres);

    setProcesando(true);
    setResultado(null);
    try {
      const result = await procesarGenerarOpAction({
        codigo,
        tipo,
        fechaProyectada: fechaDdMmAaaa,
        annos: annosPack,
        perio: perioPack,
      });
      if (!result.success) {
        setResultado({
          kind: "error",
          msg: result.error ?? "Error al procesar la orden de pago",
          detail: result.detail,
        });
        return;
      }
      setResultado({ kind: "data", rows: result.data, total: result.total });
      setSeleccion(new Set());
      setGenerados({});
    } catch {
      setResultado({
        kind: "error",
        msg: "Error de conexión con el servidor",
      });
    } finally {
      setProcesando(false);
    }
  };

  const Icon = tipo === "predial" ? Building2 : Car;
  const titulo = tipo === "predial" ? "OP Predial" : "OP Vehicular";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Generar ${titulo} de ${codigo}`}
      data-testid="generar-op-modal"
    >
      <div
        className="flex max-h-[90%] w-full max-w-[1400px] flex-col rounded-lg bg-white shadow-xl animate-fade-in"
        // Con items-center/justify-center el espacio libre se reparte a ambos
        // lados del margen, así que el panel queda centrado en el área que
        // empieza en el offset del contenido y no en el viewport.
        style={{
          marginLeft: offsetContenido?.left ?? 0,
          marginTop: offsetContenido?.top ?? 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-gradient-to-r from-sat-navy to-[#1e3050] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon size={16} className="shrink-0 text-white/80" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">
                Generar {titulo} · {codigo}
              </h2>
              <p className="truncate text-[11px] text-white/60">
                {nombreCompleto(contribuyente)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto p-4">
          {/* Datos del contribuyente */}
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-3 w-0.5 rounded-full bg-sat-cyan" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                Datos del contribuyente
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <div>
                <span className={labelCls}>Código</span>
                <p className="text-[11px] font-medium text-slate-700">
                  {codigo || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className={labelCls}>Contribuyente</span>
                <p className="truncate text-[11px] font-medium text-slate-700">
                  {nombreCompleto(contribuyente)}
                </p>
              </div>
              <div>
                <span className={labelCls}>Documento</span>
                <p className="text-[11px] font-medium text-slate-700">
                  {String(contribuyente.num_doc ?? "") || "—"}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className={labelCls}>Dirección Fiscal</span>
                <p className="truncate text-[11px] text-slate-600">
                  {String(contribuyente.DireFis ?? "") || "—"}
                </p>
              </div>
              <div>
                <span className={labelCls}>Tipo Persona</span>
                <p className="text-[11px] text-slate-600">
                  {String(contribuyente.TipoPersona ?? "") || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Parámetros. Fecha y años con ancho corto y fijo: una fecha
              ocupa dd/mm/aaaa, no la mitad de la fila. El resto del ancho va
              a los trimestres, para que "Procesar" entre en la misma línea. */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[150px_92px_92px_minmax(250px,1fr)]">
            <div>
              <label htmlFor="op-fecha" className={labelCls}>
                Fecha
              </label>
              <input
                id="op-fecha"
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  reiniciar();
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="op-anio-desde" className={labelCls}>
                Año desde
              </label>
              <select
                id="op-anio-desde"
                value={anioDesde}
                onChange={(e) => {
                  setAnioDesde(Number(e.target.value));
                  reiniciar();
                }}
                className={inputCls}
              >
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="op-anio-hasta" className={labelCls}>
                Año hasta
              </label>
              <select
                id="op-anio-hasta"
                value={anioHasta}
                onChange={(e) => {
                  setAnioHasta(Number(e.target.value));
                  reiniciar();
                }}
                className={inputCls}
              >
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Trimestres</span>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1">
                {TRIMESTRES.map((t) => (
                  <label
                    key={t}
                    htmlFor={`op-trimestre-${t}`}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-slate-600"
                  >
                    <input
                      id={`op-trimestre-${t}`}
                      type="checkbox"
                      checked={trimestres.includes(t)}
                      onChange={() => toggleTrimestre(t)}
                      className="h-3 w-3 accent-sat-cyan"
                    />
                    T{t}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={procesar}
                  disabled={procesando || generandoAnio !== null}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-sat-cyan px-2 py-1 text-[10px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {procesando ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Play size={11} />
                  )}
                  {procesando ? "Procesando..." : "Procesar"}
                </button>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="rounded-md border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={13} className="text-slate-400" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Resultados
                </span>
              </div>
            </div>
            <div
              className="p-4"
              data-testid="generar-op-resultados"
              aria-live="polite"
            >
              {resultado?.kind === "error" ? (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p>{resultado.msg}</p>
                    {/* Detalle del motor SQL: el backend solo lo envía en dev,
                        y sirve para diagnosticar el contrato del SP. */}
                    {resultado.detail && (
                      <p className="mt-1 break-words font-mono text-[10px] text-red-500/90">
                        {resultado.detail}
                      </p>
                    )}
                  </div>
                </div>
              ) : resultado?.kind === "data" ||
                resultado?.kind === "generadas" ? (
                <div>
                  {resultado.kind === "generadas" && (
                    <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {resultado.items.length === 1
                            ? "OP generada"
                            : `${resultado.items.length} OPs generadas`}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {resultado.items.map((item) => {
                            const clavePdf = `${item.numVal}-${item.anoVal}`;
                            const abriendo = abriendoPdf === clavePdf;
                            return (
                              <li
                                key={clavePdf}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <span>
                                  {`${etiquetaAnio(item.anno)} · OP ${item.numVal}-${item.anoVal}`}
                                </span>
                                <span className="text-[10px] text-emerald-700/80">
                                  ({item.total}{" "}
                                  {item.total === 1 ? "recibo" : "recibos"})
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void abrirPdf(
                                      item.idValor,
                                      item.numVal,
                                      item.anoVal,
                                    )
                                  }
                                  disabled={abriendoPdf !== null}
                                  className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {abriendo ? (
                                    <Loader2
                                      size={10}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Printer size={10} />
                                  )}
                                  {abriendo ? "Abriendo..." : "Ver OP"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="mt-1">
                          La grilla queda como constancia de lo generado.
                        </p>
                        {resultado.fallos?.map((fallo) => (
                          <p
                            key={fallo.anno}
                            className="mt-1 flex items-start gap-1 text-red-700"
                          >
                            <AlertCircle
                              size={11}
                              className="mt-0.5 shrink-0"
                            />
                            <span>
                              {etiquetaAnio(fallo.anno)}: {fallo.msg}
                            </span>
                          </p>
                        ))}
                        {pdfAviso && (
                          <p className="mt-1 text-[10px] text-amber-700">
                            {pdfAviso}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {resultado.rows.length === 0 ? (
                    <p className="text-center text-[11px] text-slate-400">
                      Sin resultados para los parámetros seleccionados.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                    <table
                      className="w-full min-w-[1100px] border-collapse"
                      data-testid="generar-op-procesar-grid"
                    >
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          {RESULTADO_COLS.map((col) => (
                            <th
                              key={col.key}
                              className={`whitespace-nowrap px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 ${
                                col.kind === "money" || col.kind === "factor"
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {col.header}
                            </th>
                          ))}
                          <th className="whitespace-nowrap px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cortes.map((corte) => {
                          const clave = claveCorte(corte.anno);
                          const generado = generados[clave];
                          return (
                            <Fragment key={corte.anno || "sin-anio"}>
                              {/* Encabezado del corte por año */}
                              <tr
                                className="bg-slate-100"
                                data-testid={`generar-op-corte-${corte.anno || "sin-anio"}`}
                              >
                                <td
                                  colSpan={COLS_IDENT}
                                  className="whitespace-nowrap px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(generado) || seleccion.has(clave)}
                                      disabled={Boolean(generado)}
                                      onChange={() => toggleSeleccion(clave)}
                                      aria-label={`Seleccionar año ${corte.anno || "sin año"}`}
                                      className="h-3 w-3 accent-sat-cyan disabled:cursor-not-allowed"
                                    />
                                    <span>
                                      {corte.anno ? `Año ${corte.anno}` : "Sin año"}
                                    </span>
                                    {generado && (
                                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold normal-case tracking-normal text-emerald-700">
                                        OP {generado.numVal}-{generado.anoVal}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  colSpan={RESULTADO_COLS.length - COLS_IDENT + 1}
                                  className="whitespace-nowrap px-2 py-1 text-right text-[9px] text-slate-400"
                                >
                                  {corte.rows.length}{" "}
                                  {corte.rows.length === 1
                                    ? "registro"
                                    : "registros"}
                                </td>
                              </tr>

                              {corte.rows.map((row, idx) => (
                                <tr
                                  key={`${corte.anno}-${idx}`}
                                  className={
                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                  }
                                >
                                  {RESULTADO_COLS.map((col) => (
                                    <td
                                      key={col.key}
                                      className={`${celdaCls(col.kind)}${
                                        col.key === "des_tipo"
                                          ? " font-medium text-slate-800"
                                          : ""
                                      }`}
                                    >
                                      {formatCelda(row[col.key], col.kind)}
                                    </td>
                                  ))}
                                  <td className="whitespace-nowrap px-2 py-1 text-right text-[10px] font-mono font-semibold text-slate-700">
                                    {totalFila(row).toFixed(2)}
                                  </td>
                                </tr>
                              ))}

                              {/* Subtotal del corte: solo importes, los factores
                                  quedan en blanco porque no se suman. */}
                              <tr
                                className="bg-slate-50"
                                data-testid={`generar-op-subtotal-${corte.anno || "sin-anio"}`}
                              >
                                <td
                                  colSpan={COLS_IDENT}
                                  className="whitespace-nowrap px-2 py-1 text-right text-[10px] font-semibold text-slate-500"
                                >
                                  Subtotal {corte.anno || "sin año"}
                                </td>
                                {RESULTADO_COLS.slice(COLS_IDENT).map((col) =>
                                  SUBTOTAL_KEY[col.key] ? (
                                    <td
                                      key={col.key}
                                      className="whitespace-nowrap px-2 py-1 text-right text-[10px] font-mono font-semibold text-slate-600"
                                    >
                                      {corte.subtotal[
                                        SUBTOTAL_KEY[col.key]
                                      ].toFixed(2)}
                                    </td>
                                  ) : (
                                    <td key={col.key} className="px-2 py-1" />
                                  ),
                                )}
                                <td className="whitespace-nowrap px-2 py-1 text-right text-[10px] font-mono font-semibold text-slate-700">
                                  {corte.subtotal.total.toFixed(2)}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })}

                        {/* Total general de todos los cortes */}
                        {cortes.length > 1 && (
                          <tr className="border-t-2 border-slate-300 bg-slate-100">
                            <td
                              colSpan={COLS_IDENT}
                              className="whitespace-nowrap px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                            >
                              Total general
                            </td>
                            {RESULTADO_COLS.slice(COLS_IDENT).map((col) =>
                              SUBTOTAL_KEY[col.key] ? (
                                <td
                                  key={col.key}
                                  className="whitespace-nowrap px-2 py-1.5 text-right text-[10px] font-mono font-bold text-slate-700"
                                >
                                  {totalGeneral[
                                    SUBTOTAL_KEY[col.key]
                                  ].toFixed(2)}
                                </td>
                              ) : (
                                <td key={col.key} className="px-2 py-1.5" />
                              ),
                            )}
                            <td className="whitespace-nowrap px-2 py-1.5 text-right text-[10px] font-mono font-bold text-slate-800">
                              {totalGeneral.total.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-400">
                  Seleccione los parámetros y presione Procesar.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={generar}
            disabled={generandoAnio !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generandoAnio !== null ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={12} />
            )}
            {generandoAnio !== null ? "Generando..." : "Generar OP"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
