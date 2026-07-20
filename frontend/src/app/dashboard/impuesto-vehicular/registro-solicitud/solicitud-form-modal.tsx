'use client';

import { useState, useEffect } from 'react';
import { getSolicitudDetailAction, saveSolicitudAction } from '@/actions/registro-solicitud';
import RequisitosAsignadosModal from './requisitos-asignados-modal';

interface SolicitudDetail {
  id_solicitud: string;
  anio: string;
  codigo: string;
  nombre: string;
  tipo_doc: string;
  num_doc: string;
  tipo_persona: string;
  tipo_contri: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  telefono1: string;
  telefono2: string;
  celular: string;
  correo: string;
  petitorio: string;
  hecho: string;
  derecho: string;
  num_recibo: string;
  fecha_recibo: string;
}

interface Props {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  codigo: string;
  idSolicitud?: string;
}

type Tab = 'datos' | 'objetivo';

// ─── Sub-components defined OUTSIDE to prevent remount on every render ────────

function ReadOnly({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`text-[11px] font-bold text-slate-700`}>{label}:</label>
      <div className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 h-[26px] flex items-center overflow-hidden whitespace-nowrap">
        {value || ''}
      </div>
    </div>
  );
}

function FormTextArea({
  label, value, onChange, rows = 3, className = ''
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`text-[11px] font-bold text-slate-700`}>{label}:</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

function FormInput({
  label, value, onChange, placeholder = '', type = 'text', className = ''
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: 'text' | 'date'; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`text-[11px] font-bold text-slate-700`}>{label}:</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-800 h-[26px] focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_DETAIL: SolicitudDetail = {
  id_solicitud: '',
  anio: '',
  codigo: '',
  nombre: '',
  tipo_doc: '',
  num_doc: '',
  tipo_persona: '',
  tipo_contri: '',
  direccion: '',
  distrito: '',
  provincia: '',
  departamento: '',
  telefono1: '',
  telefono2: '',
  celular: '',
  correo: '',
  petitorio: '',
  hecho: '',
  derecho: '',
  num_recibo: '',
  fecha_recibo: '',
};

// Funciones para convertir fechas
const formatDateToInput = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const formatDateToBackend = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return '';
};

export default function SolicitudFormModal({ isOpen, onClose, codigo, idSolicitud }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('datos');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SolicitudDetail>(EMPTY_DETAIL);
  const [fechaReciboInput, setFechaReciboInput] = useState('');
  
  const [isRequisitosOpen, setIsRequisitosOpen] = useState(false);

  const currentYear = String(new Date().getFullYear());

  useEffect(() => {
    if (!isOpen || !codigo) return;
    setActiveTab('datos');
    setError(null);
    setLoading(true);
    setDetail({ ...EMPTY_DETAIL, anio: currentYear });
    setFechaReciboInput('');
    getSolicitudDetailAction(codigo, idSolicitud).then((res) => {
      if (res.success && res.data) {
        const data = res.data as SolicitudDetail;
        setDetail(data);
        setFechaReciboInput(formatDateToInput(data.fecha_recibo));
      }
    }).finally(() => setLoading(false));
  }, [isOpen, codigo, idSolicitud]);

  const setField = (key: keyof SolicitudDetail, value: string) =>
    setDetail((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveSolicitudAction({
        codigo,
        id_solicitud: idSolicitud,
        petitorio: detail.petitorio,
        hecho: detail.hecho,
        derecho: detail.derecho,
        num_recibo: detail.num_recibo,
        fecha_recibo: fechaReciboInput,
        anio: detail.anio || currentYear,
      });
      if (res.success) {
        onClose(true);
      } else {
        setError((res as any).error ?? 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-50 border border-blue-200 shadow-2xl w-full max-w-[800px] flex flex-col rounded-sm" style={{ maxHeight: '95vh' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <h2 className="text-[16px] font-bold text-slate-800">
              {idSolicitud ? 'Editar Solicitud' : 'Nueva Solicitud'}
            </h2>
            <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-sm w-6 h-6 flex items-center justify-center leading-none transition-colors">✕</button>
          </div>

          <div className="px-4 py-2 bg-white flex items-center">
             <h3 className="text-[13px] font-bold text-slate-700">
              AÑO DE LA SOLICITUD : <span className="text-slate-900">{detail.anio || currentYear}</span>
            </h3>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pt-2 bg-white border-b border-slate-200">
            {(['datos', 'objetivo'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[12px] font-semibold rounded-t-md transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'datos' ? 'Datos del Solicitante' : 'Objetivo de Solicitud'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 px-4 py-4 bg-white border border-slate-200 m-4 rounded-md overflow-y-auto shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Cargando...</div>
            ) : activeTab === 'datos' ? (
              <div className="flex flex-col gap-1.5 max-w-3xl">
                <ReadOnly label="Codigo" value={detail.codigo} className="w-1/3" />
                <ReadOnly label="Nombre" value={detail.nombre} />
                
                <div className="flex gap-4">
                  <ReadOnly label="Tipo Documento" value={detail.tipo_doc} className="flex-1" />
                  <ReadOnly label="Nro. Documento" value={detail.num_doc} className="flex-1" />
                </div>
                
                <div className="flex gap-4">
                  <ReadOnly label="Tipo Persona" value={detail.tipo_persona} className="flex-1" />
                  <ReadOnly label="Tipo Contribuyente" value={detail.tipo_contri} className="flex-1" />
                </div>

                <ReadOnly label="Dirección" value={detail.direccion} />

                <div className="flex gap-4">
                  <ReadOnly label="Distrito" value={detail.distrito} className="flex-1" />
                  <ReadOnly label="Provincia" value={detail.provincia} className="flex-1" />
                  <ReadOnly label="Departamento" value={detail.departamento} className="flex-1" />
                </div>

                <div className="flex gap-4">
                  <ReadOnly label="Nro. Telefono 1" value={detail.telefono1} className="flex-1" />
                  <ReadOnly label="Nro. Telefono 2" value={detail.telefono2} className="flex-1" />
                  <ReadOnly label="Nro. Celular" value={detail.celular} className="flex-1" />
                </div>
                
                <ReadOnly label="Correo Electronico" value={detail.correo} className="w-2/3" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <FormTextArea label="Petitorio" value={detail.petitorio} onChange={(v) => setField('petitorio', v)} rows={3} />
                <FormTextArea label="Fundamento de Hecho" value={detail.hecho} onChange={(v) => setField('hecho', v)} rows={3} />
                <FormTextArea label="Fundamento de Derecho" value={detail.derecho} onChange={(v) => setField('derecho', v)} rows={3} />
                <div className="flex gap-4 mt-2">
                  <FormInput label="N° Recibo" value={detail.num_recibo} onChange={(v) => setField('num_recibo', v)} className="flex-1" />
                  <FormInput label="Fecha de Recibo" value={fechaReciboInput} onChange={(v) => setFechaReciboInput(v)} type="date" className="flex-1" />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-[11px] rounded-sm">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => onClose(false)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-[12px] rounded hover:bg-slate-50 transition-colors shadow-sm">
              Cancelar
            </button>
            {idSolicitud && (
              <button onClick={() => setIsRequisitosOpen(true)} className="px-4 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 text-[12px] rounded hover:bg-slate-200 transition-colors shadow-sm ml-auto">
                Requisitos
              </button>
            )}
          </div>
        </div>
      </div>

      {isRequisitosOpen && idSolicitud && (
        <RequisitosAsignadosModal
          isOpen={isRequisitosOpen}
          onClose={() => setIsRequisitosOpen(false)}
          idSolicitud={idSolicitud}
        />
      )}
    </>
  );
}
