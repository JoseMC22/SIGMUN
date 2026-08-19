"use client";

interface DocumentoRDModalProps {
  data: any[];
  onClose: () => void;
}

export function DocumentoRDModal({ data, onClose }: DocumentoRDModalProps) {
  const registro = data[0] || {};

  const handlePrint = () => {
    const printContainer = document.getElementById('rd-print-container');
    if (!printContainer) return;

    // Remember original parent to restore later
    const originalParent = printContainer.parentElement;
    const originalNextSibling = printContainer.nextSibling;

    // Move to body so it's the ONLY thing on the page
    document.body.appendChild(printContainer);
    printContainer.style.display = 'block';

    const cleanup = () => {
      printContainer.style.display = 'none';
      // Move back to original position
      if (originalNextSibling) {
        originalParent?.insertBefore(printContainer, originalNextSibling);
      } else {
        originalParent?.appendChild(printContainer);
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    window.print();

    // Fallback cleanup
    setTimeout(cleanup, 2000);
  };

  // ── Helper: format currency ──
  const fmt = (v: any) => `S/. ${Number(v ?? 0).toFixed(2)}`;

  // ── Single document copy ──
  const renderDocumento = () => (
    <div className="bg-white text-black leading-tight" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* ── HEADER: Logo + institution lines ── */}
      <div className="flex items-start gap-3 mb-0.5">
        {/* Logo placeholder */}
        <div className="flex-shrink-0 w-[49px] h-[49px] border border-slate-300 rounded overflow-hidden flex items-center justify-center">
          <img src="/logo_sat_2026.jpeg" alt="Logo SAT" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[10px] font-bold text-sat-navy leading-tight">
            SERVICIO DE ADMINISTRACIÓN TRIBUTARIA
          </div>
          <div className="text-[9px] font-bold text-sat-navy leading-tight">
            DEPARTAMENTO DE REGISTRO Y FISCALIZACIÓN
          </div>
          <div className="text-[8px] font-semibold text-slate-700 leading-tight">
            SUB GERENCIA DE OPERACIONES
          </div>
        </div>
        <div className="flex-shrink-0 w-[40px]" />
      </div>

      {/* ── PAGE HEADER: numerOP ── */}
      <div className="text-center mb-1">
        <span className="text-[10px] font-bold text-sat-navy underline">
          {registro.numerOP || "N° O.P. _________"}
        </span>
      </div>

      <hr className="border-black mb-0.5" />

      {/* ── SECTION I: DEL CONTRIBUYENTE ── */}
      <div className="mb-0.5">
        <div className="text-[8px] font-bold text-sat-navy mb-0.5">
          I.- DEL CONTRIBUYENTE:
        </div>
        <table className="w-full text-[8px] border-collapse" style={{ tableLayout: "fixed" }}>
          <tbody>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 w-[140px] align-top">CÓDIGO:</td>
              <td className="py-0.5 text-slate-900">{registro.codigo || "-"}</td>
            </tr>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 align-top">CÓDIGO DE PREDIO:</td>
              <td className="py-0.5 text-slate-900">{registro.codpred || "-"}</td>
            </tr>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 align-top">
                Documento Identidad / RUC:
              </td>
              <td className="py-0.5 text-slate-900">{registro.num_doc || "-"}</td>
            </tr>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 align-top">
                Apellidos y Nombres / Razón Social:
              </td>
              <td className="py-0.5 text-slate-900">{registro.nombre || "-"}</td>
            </tr>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 align-top">Domicilio Fiscal:</td>
              <td className="py-0.5 text-slate-900">{registro.dirfiscal || "-"}</td>
            </tr>
            <tr>
              <td className="font-bold text-slate-800 py-0.5 pr-2 align-top">Teléfono:</td>
              <td className="py-0.5 text-slate-900">{registro.fono || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr className="border-slate-300 mb-1" />

      {/* ── SECTION II: MOTIVO DE LA DETERMINACIÓN ── */}
      <div className="mb-0.5">
        <div className="text-[8px] font-bold text-sat-navy mb-0.5">
          II.- MOTIVO DE LA DETERMINACIÓN:
        </div>
        <p className="text-[7.5px] leading-[1.4] text-slate-900 text-justify">
          POR NO HABER REALIZADO EL PAGO DEL IMPUESTO DE ALCABALA, CONFORME A LEY EN EL PLAZO ESTABLECIDO, POR LA ADQUISICIÓN DE LA PROPIEDAD UBICADA EN{" "}
          <span className="font-bold">{registro.direccion_predio || "________"}</span>;
          MEDIANTE DOCUMENTO DE TRANSFERENCIA CELEBRADA DE FECHA{" "}
          <span className="font-bold">{registro.fechacontrato || "________"}</span>.
        </p>
      </div>

      <hr className="border-slate-300 mb-0.5" />

      {/* ── SECTION III: Financial boxes ── */}
      <div className="mb-1">
        <div className="text-[8px] font-bold text-sat-navy mb-0.5">
          III.- DETALLE DE LA DEUDA:
        </div>
        <div className="grid grid-cols-7 gap-[6px]">
          {/* VALOR PREDIO */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">
              VALOR PREDIO (B. IMP.)
            </div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">
              {fmt(registro.valortotal)}
            </div>
          </div>
          {/* INAFECTACIÓN 10 UIT */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">
              INAFECTACIÓN 10 UIT
            </div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">
              {fmt(registro.monto_inafecto)}
            </div>
          </div>
          {/* IMPORTE APLICARSE */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">
              IMPORTE APLICARSE
            </div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">
              {fmt(registro.monto_afecto)}
            </div>
          </div>
          {/* TASA APLICABLE */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">
              TASA APLICABLE
            </div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">
              {registro.tasa || "-"}%
            </div>
          </div>
        {/* </div>
        <div className="grid grid-cols-3 gap-[5px] mt-[6px]"> */}
          {/* INSOLUTO */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">INSOLUTO</div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">
              {fmt(registro.monto_alcabala)}
            </div>
          </div>
          {/* INTERÉS */}
          <div className="border border-sat-navy px-1.5 pt-1 pb-0.5 text-center">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">INTERÉS</div>
            <div className="text-[6px] font-bold text-slate-900 mt-0.5">{fmt(registro.mora)}</div>
          </div>
          {/* TOTAL A CANCELAR */}
          <div className="border-2 border-sat-navy px-1.5 pt-1 pb-0.5 text-center bg-slate-50">
            <div className="text-[6px] font-bold text-sat-navy leading-tight">TOTAL A CANCELAR</div>
            <div className="text-[6px] font-extrabold text-sat-navy mt-0.5">
              {fmt(registro.total)}
            </div>
          </div>
        </div>
      </div>

      {/* ── TRAMO section ── */}
      <div className="mb-0.5 border border-slate-300 p-0.5">
        <div className="text-[7px] text-slate-800">
          <span className="font-bold">TRAMO:</span>{" "}
          <span className="font-semibold">HASTA LAS 10 UIT S/. </span>
          <span className="font-bold">{Number(registro.monto_inafecto ?? 0).toFixed(2)}</span>
          <span className="font-bold text-green-700 ml-1">EXONERADA</span>
        {/* </div>
        <div className="text-[7px] text-slate-700 mt-0.5"> */}
          T. A. = 3% (BASE IMPONIBLE – 10 UIT)
        </div>
      </div>

      <hr className="border-slate-300 mb-0.5" />

      {/* ── SECTION IV + NOTIFICATION BOX side by side ── */}
      <div className="grid grid-cols-[1fr_0.9fr] gap-2 mb-0">
        {/* Left: Base Legal + Requerimiento + Notificación + Lugar de Pago */}
        <div>
          {/* BASE LEGAL */}
          <div className="mb-0.5">
            <div className="text-[8px] font-bold text-sat-navy mb-1">IV.- BASE LEGAL:</div>
            <ul className="text-[7px] text-slate-800 list-disc ml-3 space-y-[1px]">
              <li>Art. 194° - 195° de la Constitución Política del Perú</li>
              <li>
                Arts. 21° al 29° de la Ley de Tributación Municipal D. L. 776 y su Modificatoria
                D.L. 952
              </li>
              <li>
                Art. 76° - 77° - Inc. 1 al 7 D.S. 133-2013-EF TUO del Código Tributario
              </li>
              <li>Art. 69° - 70° Ley N° 27972 Ley Orgánica de Municipalidades</li>
              <li>Ley 26979</li>
            </ul>
          </div>

          <hr className="border-slate-300 mb-0.5" />

          {/* REQUERIMIENTO */}
          <div className="mb-0.5">
            <p className="text-[6.5px] leading-[1.4] text-slate-900 text-justify">
              <span className="font-bold">REQUIERASE</span> al obligado al pago de la deuda
              tributaria consignada en el presente documento, al pago de la misma dentro del plazo
              de <span className="font-bold">VEINTE (20) días</span> hábiles contados a partir de la
              notificación del presente requerimiento; so pena de iniciarse la ejecución coactiva de
              acuerdo a las normas tributarias vigentes.
            </p>
          </div>

          {/* NOTIFICACIÓN */}
          <div className="mb-0.5">
            <p className="text-[7px] leading-[1.4] text-slate-900 text-justify">
              <span className="font-bold">NOTIFICADO</span> que quede no debe sorprenderle la
              ejecución coactiva de acuerdo al Art. 118° al 124° del TUO del Código Tributario
              aprobado por D.S. N° 133-2013-EF y su modificatoria, la cual se hará efectiva
              vencido el plazo concedido sin que se haya pagado la deuda consignada.
            </p>
          </div>

          {/* LUGAR DE PAGO */}
          <div className="mb-0.5 text-[7px] text-slate-800">
            <span className="font-bold">LUGAR DE PAGO:</span>{" "}
            Avenida José Matías Manzanilla N°421
          </div>

          {/* Firma VoBo + Sello */}
          <div className="text-center mt-1">
            {/* <div className="text-[7px] text-slate-700 mb-1">
              {new Date().toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div> */}
            {/* <div className="border-t border-black w-40 mx-auto" />
            <div className="text-[7px] font-bold text-slate-800 mt-0.5">
              VoBo. Sub Gerencia de Operaciones
            </div> */}
            <div className="text-[6px] text-slate-600 mt-0.5">Sello de Registro</div>
            <div className="w-[60px] h-[60px] border border-dashed border-slate-400 mx-auto mt-0.5 bg-slate-50 flex items-center justify-center text-[6px] text-slate-400">
              SELLO
            </div>
          </div>
        </div>

        {/* Right: Cuadro de Notificaciones */}
        <div className="border border-sat-navy p-1.5 self-start">
          <div className="text-[7px] font-bold text-sat-navy mb-1 text-center">NOTIFICACIONES</div>
          <table className="w-full text-[7px] border-collapse" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5 w-[90px] align-top">
                  Fecha de Recepción:
                </td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5 align-top">
                  Apellidos y Nombre:
                </td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5">FIRMA Recepción:</td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5">Parentesco:</td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5 align-top">
                  Notificado por:
                </td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5">FIRMA Notificador:</td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
              <tr>
                <td className="font-bold text-slate-800 py-1 pr-0.5">DNI Notificador:</td>
                <td className="py-1 border-b border-slate-400 text-transparent">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Print-only styles ── */}
      <style>{`
        @media print {
          body > *:not(#rd-print-container) {
            display: none !important;
          }
          #rd-print-container {
            display: block !important;
            width: 100% !important;
            background: white !important;
          }
          #rd-print-container .rd-copia {
            height: 135mm !important;
            max-height: 135mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            border-bottom: 1px dashed #999 !important;
            padding-bottom: 0mm !important;
            margin-bottom: 0 !important;
          }
          #rd-print-container .rd-copia:last-child {
            border-bottom: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm 10mm 5mm 10mm;
          }
        }
      `}</style>

      {/* ── Print container: visible only on print ── */}
      <div
        id="rd-print-container"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          display: "none",
        }}
      >
        <div className="rd-copia">
          {renderDocumento()}
        </div>
        <div className="rd-copia">
          {renderDocumento()}
        </div>
      </div>

      {/* ── Screen-only modal ── */}
      <div
        className="rd-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Documento RD Alcabala"
      >
        <div className="relative mx-4 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sat-navy to-[#1e3050] px-5 py-3 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3.5 bg-sat-cyan rounded-full" />
              <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">
                Documento RD Alcabala
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <span className="text-sm">✕</span>
            </button>
          </div>

          {/* Documento scrollable area */}
          <div className="flex-1 overflow-auto bg-slate-100 p-4">
            <div className="mx-auto max-w-[700px] border border-slate-300 bg-white p-5 shadow-sm print:shadow-none print:border-0 print:p-0">
              {renderDocumento()}
            </div>
            <div className="mx-auto max-w-[700px] border border-slate-300 bg-white p-5 shadow-sm mt-4 print:shadow-none print:border-0 print:p-0">
              {renderDocumento()}
            </div>
          </div>

          {/* Footer con botones */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3 rounded-b-xl">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-md bg-sat-cyan px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              <span className="text-xs">🖨️</span>
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sat-cyan/40 active:scale-[0.98]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
