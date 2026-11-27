"use client";

import React, { useState } from "react";
import {
  BookOpen,
  X,
  Send,
  Building,
  HelpCircle,
  FileCheck,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface ManualUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualUsuarioModal: React.FC<ManualUsuarioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"flujo" | "solicitud" | "responder" | "evaluacion" | "preguntas">("flujo");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sat-navy via-[#1e3050] to-sat-navy px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <BookOpen className="h-5 w-5 text-sat-cyan" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Manual de Usuario - Asesoría Legal</h2>
              <p className="text-xs text-white/70">
                Guía interactiva para la solicitud, respuesta, tributos 1:N y evaluación de informes de fiscalización
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Navegación de Pestañas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto">
          {[
            { id: "flujo", label: "1. Flujo General", icon: ChevronRight },
            { id: "solicitud", label: "2. Emisión de Solicitud", icon: Send },
            { id: "responder", label: "3. Atención de Oficinas", icon: Building },
            { id: "evaluacion", label: "4. Evaluación y Dictamen", icon: FileCheck },
            { id: "preguntas", label: "5. Preguntas Frecuentes", icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "border-sat-cyan text-sat-navy bg-white shadow-xs"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon size={14} className={isActive ? "text-sat-cyan" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido Dinámico con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700 text-xs leading-relaxed space-y-6">
          {activeTab === "flujo" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
                <h3 className="text-sm font-bold text-sat-navy mb-1 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-sat-cyan" />
                  Propósito del Módulo
                </h3>
                <p className="text-slate-600">
                  El módulo de <strong>Asesoría Legal</strong> coordina los requerimientos de información
                  tributaria a las áreas operativas (<strong>Cobranza</strong>, <strong>Registro</strong> y <strong>Coactivo</strong>)
                  para emitir dictámenes y resoluciones sobre trámites (Prescripciones, Deducciones, Beneficios, etc.), soportando múltiples tributos y rangos de años independientes.
                </p>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pasos del Circuito Legal</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-navy text-white font-bold text-xs">
                    1
                  </div>
                  <strong className="block text-slate-900 text-xs">Recepción de Trámite</strong>
                  <p className="text-[11px] text-slate-500">
                    Trámites derivados formalmente a Asesoría Legal con sus tributos asociados (Predial, Arbitrios, etc.).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-navy text-white font-bold text-xs">
                    2
                  </div>
                  <strong className="block text-slate-900 text-xs">Generar Requerimiento</strong>
                  <p className="text-[11px] text-slate-500">
                    Asesoría Legal redacta el requerimiento, selecciona las oficinas y emite las solicitudes.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-navy text-white font-bold text-xs">
                    3
                  </div>
                  <strong className="block text-slate-900 text-xs">Atención por Área</strong>
                  <p className="text-[11px] text-slate-500">
                    Cobranza, Registro y Coactivo visualizan los conceptos y años, redactan su informe y adjuntan su archivo en NAS.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sat-navy text-white font-bold text-xs">
                    4
                  </div>
                  <strong className="block text-slate-900 text-xs">Matriz y Consolidado PDF</strong>
                  <p className="text-[11px] text-slate-500">
                    Legal califica como <strong>Conforme</strong> u <strong>Observado</strong>, y genera el <strong>PDF Consolidado</strong> oficial del expediente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "solicitud" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-sat-cyan" />
                Cómo emitir una Solicitud de Información
              </h3>
              <p className="text-slate-600">
                Desde la pantalla <strong>Solicitud de Información</strong>:
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-sat-navy">A</span>
                  <div>
                    <strong className="text-slate-800">Seleccionar el Trámite:</strong>
                    <p className="text-slate-600 text-[11px]">
                      Ubicá el trámite en la tabla principal y haz clic en el botón <strong>«Solicitar»</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-sat-navy">B</span>
                  <div>
                    <strong className="text-slate-800">Verificar Conceptos / Tributos:</strong>
                    <p className="text-slate-600 text-[11px]">
                      Aparecerá el bloque con los tributos discriminados (ej. <em>PREDIAL: 2021-2026, ARBITRIOS: 2021-2026</em>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-sat-navy">C</span>
                  <div>
                    <strong className="text-slate-800">Instrucción y Oficinas Destino:</strong>
                    <p className="text-slate-600 text-[11px]">
                      Redactá la observación general de Asesoría Legal y tildá las oficinas requeridas (Cobranza, Registro, Coactivo) con su indicación específica si aplica.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-sat-navy">D</span>
                  <div>
                    <strong className="text-slate-800">Enviar Requerimiento:</strong>
                    <p className="text-slate-600 text-[11px]">
                      Presioná <strong>«Enviar Solicitudes»</strong>. El estado se actualizará y pasará a control en tiempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "responder" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building size={16} className="text-sat-cyan" />
                Atención desde las Oficinas (Cobranza, Registro, Coactivo)
              </h3>
              <p className="text-slate-600">
                Cada oficina ingresa a <strong>«Responder Solicitud»</strong>:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <strong className="text-sat-navy text-xs block">1. Bandeja de Requerimientos</strong>
                  <p className="text-[11px] text-slate-600">
                    Verán los requerimientos dirigidos a su área, con la columna <strong>Años / Tributos</strong> detallando los conceptos específicos a liquidar o informar.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <strong className="text-sat-navy text-xs block">2. Carga de Respuesta y Sustento</strong>
                  <p className="text-[11px] text-slate-600">
                    Al seleccionar el trámite con <strong>«Atender»</strong>, redactan el informe técnico y pueden adjuntar el documento de respaldo en el NAS institucional.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                <strong>Subsanación si está Observado:</strong> Si Asesoría Legal observó una respuesta anterior, la oficina verá la alerta con el motivo de observación y el botón para corregir y remitir el nuevo pronunciamiento.
              </div>
            </div>
          )}

          {activeTab === "evaluacion" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck size={16} className="text-sat-cyan" />
                Evaluación, Visto Bueno y PDF Consolidado
              </h3>
              <p className="text-slate-600">
                Asesoría Legal supervisa las respuestas en tiempo real desde el modal de detalle (ícono del ojo):
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Conforme (Visto Bueno)
                  </span>
                  <span className="text-[11px] text-slate-600">Asesoría Legal valida la información técnica remitida y la aprueba para el dictamen.</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Observado (Corrección)
                  </span>
                  <span className="text-[11px] text-slate-600">Se devuelve la respuesta a la oficina con la nota de observación correspondiente.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/70 text-slate-800 space-y-1.5">
                <strong className="text-xs font-bold block text-sat-navy">Generación de PDF Consolidado:</strong>
                <p className="text-[11px] text-slate-700">
                  Presionando el botón rojo <strong>«PDF»</strong> en la fila de cualquier trámite con respuestas, el sistema generará y descargará el <strong>Informe Consolidado en PDF</strong> listo con membrete, detalle de áreas y casillas de firma.
                </p>
              </div>
            </div>
          )}

          {activeTab === "preguntas" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle size={16} className="text-sat-cyan" />
                Preguntas Frecuentes
              </h3>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <strong className="text-slate-900 text-xs">¿Por qué algunos trámites tienen varios tributos y otros solo un rango de años?</strong>
                <p className="text-[11px] text-slate-600">
                  El sistema cuenta con retrocompatibilidad: los trámites nuevos usan el modelo 1:N (tabla <code>Tra_M_Tramite_Tributos</code>) para discriminar Predial, Arbitrios y otros tributos de forma independiente. Los trámites anteriores leen automáticamente su rango histórico.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <strong className="text-slate-900 text-xs">¿Puedo modificar una solicitud de información enviada?</strong>
                <p className="text-[11px] text-slate-600">
                  Sí, siempre y cuando ninguna de las oficinas haya emitido respuesta aún. Se puede editar presionando el botón amarillo de edición en la tabla o modal.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                <strong className="text-slate-900 text-xs">¿Dónde se guardan los archivos e informes adjuntados?</strong>
                <p className="text-[11px] text-slate-600">
                  Todos los archivos se suben y gestionan directamente en el servidor de archivos NAS institucional, permitiendo su descarga y visualización en cualquier momento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[11px] text-slate-500 font-mono">
            SIGMUN • Módulo de Asesoría Legal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-sat-navy px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3050] transition cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
