import React from 'react';
import { AviationPart, TagColor } from '../types';
import { generateQRDataUri } from '../utils/QRGenerator';

interface PrintTemplateProps {
  part: AviationPart;
  t: any;
}

const PrintHeader: React.FC<{ part: AviationPart, qrDataUri: string, t: (key: string) => string }> = ({ part, qrDataUri, t }) => {
  const titles = {
    [TagColor.YELLOW]: "SERVICEABLE MATERIAL / MATERIAL APROBADO",
    [TagColor.GREEN]: "REPAIRABLE MATERIAL / MATERIAL REPARABLE",
    [TagColor.WHITE]: "REMOVED NO DEFECT / REMOVIDO SIN FALLA",
    [TagColor.RED]: "REJECTED MATERIAL / MATERIAL RECHAZADO",
  };
  return (
    <div className="grid grid-cols-12 border-b-2 border-black mb-1 pb-1">
      <div className="col-span-3 flex items-center">
        <div className="flex items-center gap-2">
          <div className="text-left">
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">INVENTORY</h1>
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">PART</h1>
            <p className="text-[5px] font-bold mt-0.5 tracking-widest uppercase text-slate-500">Aviation Technical Record</p>
          </div>
        </div>
      </div>
      {/* QR CODE - Upper Right with Quiet Zone */}
      <div className="col-span-2 flex items-center justify-center">
        <div className="p-1 bg-white border border-black">
          <img
            src={qrDataUri}
            alt="QR Code"
            className="w-[70px] h-[70px]"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-[4px] text-center font-bold text-slate-600 mt-0.5">SCAN TO TRACK</p>
        </div>
      </div>
      <div className="col-span-7 flex items-center justify-end">
        <div className="border-[2px] border-black px-4 py-1.5 bg-gray-50/50">
          <h2 className="text-lg font-black uppercase tracking-tight text-right leading-none">{titles[part.tagColor]}</h2>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; className?: string }> = ({ title, className = "" }) => (
  <div className={`col-span-12 py-0.5 px-2 mb-0.5 mt-1 bg-slate-900 text-white flex items-center ${className}`}>
    <span className="text-[7px] font-black uppercase tracking-[0.1em]">{title}</span>
  </div>
);

const Field: React.FC<{ label: string; value?: string; full?: boolean; className?: string; span?: number; labelWidth?: string; minHeight?: string }> = ({ label, value, full, className = "", span, labelWidth = "w-1/3", minHeight = "min-h-[1.4rem]" }) => {
  const colSpan = span ? `col-span-${span}` : (full ? 'col-span-12' : 'col-span-6');
  return (
    <div className={`border border-black flex items-stretch ${colSpan}`}>
      <div className={`${labelWidth} border-r border-black bg-gray-50/80 p-1 flex items-center`}>
        <span className="text-[6px] font-bold uppercase text-slate-600 leading-tight">{label}</span>
      </div>
      <div className={`flex-1 p-1 flex items-center overflow-hidden ${minHeight} bg-white`}>
        <span className={`text-[10px] font-black uppercase break-all leading-tight ${className}`}>{value || ''}</span>
      </div>
    </div>
  );
};

const TimesCycleBox: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex flex-col border border-black min-h-[42px] bg-white">
    <div className="bg-gray-100/80 border-b border-black py-0.5 px-1 text-center">
      <span className="text-[6px] font-bold uppercase text-slate-600">{label}</span>
    </div>
    <div className="flex-1 flex items-center justify-center p-1">
      <span className="text-[12px] font-black font-mono text-slate-900">{value || '---'}</span>
    </div>
  </div>
);

const TimesCyclesGrid: React.FC<{ part: AviationPart }> = ({ part }) => (
  <div className="col-span-12 grid grid-cols-6 mt-0.5">
    <TimesCycleBox label="TAT / T.T" value={part.ttTat} />
    <TimesCycleBox label="TSO" value={part.tso} />
    <TimesCycleBox label="T. REM" value={part.trem} />
    <TimesCycleBox label="TOTAL / TC" value={part.tc} />
    <TimesCycleBox label="CSO" value={part.cso} />
    <TimesCycleBox label="C. REM" value={part.crem} />
  </div>
);

const CheckboxField: React.FC<{ label: string; checked: boolean; }> = ({ label, checked }) => (
  <div className="flex items-center gap-1.5 px-2 border-r border-black last:border-r-0 flex-1 justify-center py-1">
    <div className="w-3 h-3 border border-black flex items-center justify-center bg-white">
      {checked && <div className="w-1.5 h-1.5 bg-black" />}
    </div>
    <span className="text-[7px] font-bold uppercase text-slate-800">{label}</span>
  </div>
);

const SignaturesSection: React.FC<{ part: AviationPart }> = ({ part }) => (
  <div className="col-span-12 grid grid-cols-12 mt-2 border border-black">
    {/* Tech Column */}
    <div className="col-span-6 border-r border-black">
      <div className="bg-slate-50 border-b border-black p-0.5 text-center">
        <span className="text-[7px] font-black uppercase text-slate-600">TECHNICAL CERTIFICATION / CERTIFICACIÓN TÉCNICA</span>
      </div>
      <div className="grid grid-cols-12 h-20">
        <div className="col-span-5 p-1.5 flex flex-col justify-between border-r border-black bg-gray-50/30">
          <div>
            <p className="text-[6px] font-bold text-slate-400 uppercase leading-none mb-1">NAME / LIC:</p>
            <p className="text-[10px] font-black uppercase leading-tight text-slate-900 mb-1">{part.technicianName}</p>
            <div className="bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded text-center">
              <p className="text-[9px] font-black text-indigo-700 uppercase tracking-tight">LIC: {part.technicianLicense}</p>
            </div>
          </div>
        </div>
        <div className="col-span-7 flex items-center justify-center bg-white relative p-1">
          <p className="text-[5px] font-bold absolute top-1 left-2 text-slate-300 uppercase">SIGNATURE</p>
          {part.technicianSignature && <img src={part.technicianSignature} className="h-full w-full object-contain" alt="Signature" />}
        </div>
      </div>
    </div>
    {/* Inspector Column */}
    <div className="col-span-6">
      <div className="bg-slate-50 border-b border-black p-0.5 text-center">
        <span className="text-[7px] font-black uppercase text-slate-600">FINAL INSPECTION / INSPECCIÓN FINAL</span>
      </div>
      <div className="grid grid-cols-12 h-20">
        <div className="col-span-5 p-1.5 flex flex-col justify-between border-r border-black bg-gray-50/30">
          <div>
            <p className="text-[6px] font-bold text-slate-400 uppercase leading-none mb-1">NAME / LIC:</p>
            <p className="text-[10px] font-black uppercase leading-tight text-slate-900 mb-1">{part.inspectorName}</p>
            <div className="bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded text-center">
              <p className="text-[9px] font-black text-emerald-700 uppercase tracking-tight">LIC: {part.inspectorLicense}</p>
            </div>
          </div>
        </div>
        <div className="col-span-7 flex items-center justify-center bg-white relative p-1">
          <p className="text-[5px] font-bold absolute top-1 left-2 text-slate-300 uppercase">STAMP / SIG</p>
          {part.inspectorSignature && <img src={part.inspectorSignature} className="h-full w-full object-contain" alt="Stamp" />}
        </div>
      </div>
    </div>
  </div>
);

const PrintTemplate: React.FC<PrintTemplateProps> = ({ part, t }) => {
  const shelfLifeDate = part?.shelfLife ? new Date(part.shelfLife).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

  // Generate SCANNABLE QR code using external API
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wca.app';
  const scanUrl = `${baseUrl}/inventario/scan/${part.id}`;
  // Use QR Server API - guaranteed to be scannable
  const qrDataUri = generateQRDataUri(scanUrl, 150);

  const getTagColorHex = (tag: TagColor) => {
    switch (tag) {
      case TagColor.YELLOW: return '#eab308'; // yellow-500
      case TagColor.GREEN: return '#10b981'; // emerald-500
      case TagColor.WHITE: return '#cbd5e1'; // slate-300
      case TagColor.RED: return '#f43f5e'; // rose-500
      default: return '#6366f1'; // indigo-500
    }
  };

  return (
    <div className="w-[210mm] mx-auto bg-white text-black p-0 font-sans print:w-full print:m-0">
      <style>{`
        @page { size: A4; margin: 5mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-card { box-shadow: none !important; border-width: 8px !important; }
        }
      `}</style>

      <div
        className="print-card flex flex-col border-[10px] p-5 h-full max-h-[285mm] box-border"
        style={{ borderColor: getTagColorHex(part.tagColor) }}
      >
        <PrintHeader part={part} qrDataUri={qrDataUri} t={t} />

        <div className="grid grid-cols-12 w-full gap-y-0.5">
          {/* 01. ADMINISTRATIVE RECORD / DATOS DE REGISTRO */}
          <SectionHeader title="01. ADMINISTRATIVE RECORD / DATOS DE REGISTRO" />
          <Field label="ORGANIZATION / ORG" value={part.organization || "World Class Aviation"} span={8} labelWidth="w-1/3" />
          <Field label="REG. DATE" value={part.registrationDate ? new Date(part.registrationDate).toLocaleDateString('en-US') : ''} span={4} labelWidth="w-1/2" />
          <Field label="PHONE / TEL" value={part.companyPhone} span={6} labelWidth="w-1/3" />
          <Field label="EMAIL" value={part.companyEmail} span={6} labelWidth="w-1/4" />

          {/* 02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA */}
          <SectionHeader title="02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA" />
          <div className="col-span-12 grid grid-cols-12 gap-0.5">
            <div className="col-span-7 grid grid-cols-12 gap-y-0.5">
              <Field label="PART NAME / NOMBRE" value={part.partName} full minHeight="min-h-[2.8rem]" labelWidth="w-1/4" />
              <Field label="P/N (PART NUMBER)" value={part.pn} span={12} labelWidth="w-1/4" />
              <Field label="S/N (SERIAL NUMBER)" value={part.sn} span={12} labelWidth="w-1/4" />
              <Field label="BRAND / MARCA" value={part.brand} span={12} labelWidth="w-1/4" />
              <Field label="MODEL / MODELO" value={part.model} span={12} labelWidth="w-1/4" />
            </div>
            <div className="col-span-5 border border-black p-0.5 flex items-center justify-center bg-white overflow-hidden max-h-[148px]">
              {part.photo ? (
                <img src={part.photo} className="w-full h-full object-contain" alt="Part" />
              ) : (
                <div className="text-[6px] font-black text-slate-300 uppercase text-center">NO PHOTO<br />AVAILABLE</div>
              )}
            </div>
          </div>

          {/* MANDATORY PHYSICAL LOCATION - ALL CARD TYPES */}
          {(() => {
            // Determine label based on card type
            let locationLabel = 'LOCATION / UBICACIÓN';
            if (part.tagColor === TagColor.YELLOW) {
              locationLabel = 'FINAL LOCATION / POSICIÓN FINAL';
            } else if (part.tagColor === TagColor.WHITE || part.tagColor === TagColor.GREEN) {
              locationLabel = 'STORAGE LOC / LUGAR DE ALMACÉN';
            } else if (part.tagColor === TagColor.RED) {
              locationLabel = 'QUARANTINE / ZONA CUARENTENA';
            }

            // Get location value with fallback
            const locationValue = part.location || part.physicalStorageLocation || 'PENDIENTE / POR DEFINIR';

            return (
              <div className="col-span-12 border-2 border-black bg-amber-50 flex items-stretch mt-1">
                <div className="w-1/4 border-r-2 border-black bg-slate-900 p-1.5 flex items-center">
                  <span className="text-[7px] font-black uppercase text-white tracking-wide">{locationLabel}</span>
                </div>
                <div className="flex-1 p-2 flex items-center bg-white">
                  <span className="text-[14px] font-black uppercase text-slate-900 tracking-tight">{locationValue}</span>
                </div>
              </div>
            );
          })()}

          {/* 03. TIMES AND CYCLES / TIEMPOS Y CICLOS */}
          <SectionHeader title="03. TIMES AND CYCLES / TIEMPOS Y CICLOS" />
          <TimesCyclesGrid part={part} />

          {/* 04. CONDITION & REMOVAL / CONDICIÓN Y REMOCIÓN */}
          <SectionHeader title="04. CONDITION & REMOVAL / CONDICIÓN Y REMOCIÓN" />
          {part.tagColor === TagColor.YELLOW && (
            <Field label="SHELF LIFE / FECHA VENC." value={shelfLifeDate} full className="text-rose-600 font-black" labelWidth="w-1/4" />
          )}
          {(part.tagColor === TagColor.GREEN || part.tagColor === TagColor.WHITE) && (
            <div className="col-span-12 flex border border-black bg-white overflow-hidden min-h-[1.5rem]">
              <div className="w-1/4 bg-gray-50 p-1 border-r border-black flex items-center justify-center">
                <span className="text-[6px] font-bold uppercase text-slate-600">REASON:</span>
              </div>
              {part.tagColor === TagColor.GREEN ? (
                <>
                  <CheckboxField label="TIME" checked={part.removalReason === 'TIME'} />
                  <CheckboxField label="FAILURE" checked={part.removalReason === 'FAILURE'} />
                  <CheckboxField label="CONDITION" checked={part.removalReason === 'CONDITION'} />
                  <CheckboxField label="OTHER" checked={part.removalReason === 'OTHER'} />
                </>
              ) : (
                <>
                  <CheckboxField label="STG" checked={part.removalReason === 'STORAGE'} />
                  <CheckboxField label="T.SH" checked={part.removalReason === 'TROUBLESHOOTING'} />
                  <CheckboxField label="ASST" checked={part.removalReason === 'ASSISTANCE'} />
                  <CheckboxField label="OTH" checked={part.removalReason === 'OTHER'} />
                </>
              )}
            </div>
          )}
          {part.tagColor === TagColor.WHITE && (
            <Field label="STORAGE LOC / ALMACÉN" value={part.physicalStorageLocation || part.location} full labelWidth="w-1/4" />
          )}
          {part.tagColor === TagColor.RED && (
            <Field label="REJECTION / MOTIVO" value={part.rejectionReason} full className="text-rose-600 font-bold" labelWidth="w-1/4" />
          )}

          {/* 05. TECH REPORTS & REMARKS / REPORTES Y OBSERVACIONES */}
          <SectionHeader title="05. TECH REPORTS & REMARKS / REPORTES Y OBSERVACIONES" />
          {part.tagColor === TagColor.GREEN && (
            <div className="col-span-12 border border-black p-1.5 min-h-[40px] bg-white">
              <p className="text-[5px] font-bold text-slate-400 uppercase leading-none mb-1">TECH REPORT / REPORTE TÉCNICO:</p>
              <p className="text-[9px] font-medium leading-tight">{part.technicalReport || 'N/A'}</p>
            </div>
          )}
          <div className="col-span-12 border border-black p-1.5 min-h-[35px] bg-white">
            <p className="text-[5px] font-bold text-slate-400 uppercase leading-none mb-1">REMARKS / OBSERVACIONES:</p>
            <p className="text-[9px] font-medium leading-tight">{part.observations || 'N/A'}</p>
          </div>

          <SignaturesSection part={part} />

          <div className="col-span-12 p-2 mt-2 border border-black text-center bg-gray-50/80">
            <p className="text-[7px] font-black uppercase tracking-tight leading-tight">
              {part.tagColor === TagColor.YELLOW ? (
                "WORLD CLASS AVIATION CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents. Approved for use as SERVICEABLE MATERIAL. / CERTIFICA que este componente / material cumple con los requisitos de los manuales aplicables y documentos de referencia vigentes. Aprueba este componente como MATERIAL APROBADO para uso."
              ) : part.tagColor === TagColor.GREEN ? (
                "WORLD CLASS AVIATION CERTIFIES that this component/material meets internal manuals and reference document requirements. / CERTIFICA que este componente / material cumple con los requisitos de manuales internos y documentos de referencia."
              ) : part.tagColor === TagColor.WHITE ? (
                "REMOVED FOR DESCRIBED REASON AND MEETS CURRENT REQUIREMENTS. / REMOVIDO POR LA RAZÓN DESCRITA Y CUMPLE CON REQUISITOS VIGENTES."
              ) : (
                "DOES NOT MEET APPLICABLE REQUIREMENTS. REJECTED FOR USE. / NO CUMPLE REQUISITOS APLICABLES. RECHAZADO PARA USO."
              )}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-2 flex justify-between items-center text-[6px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex gap-4 items-center">
            {/* QR CODE */}
            <div className="flex flex-col items-center">
              <img
                src={generateQRDataUri(`${window.location.origin}/#/scan/${part.id}`, 60)}
                alt="QR Code"
                className="w-[60px] h-[60px] border border-black"
              />
              <span className="text-[5px] mt-1">SCAN FOR QUICK ACTION</span>
            </div>
            <div className="flex flex-col gap-1">
              <span>RECORD ID: {part.id}</span>
              <span>VER: 6.0.0-QR</span>
            </div>
          </div>
          <div className="bg-slate-100 px-2 py-0.5 rounded italic">
            DIGITALLY GENERATED DOCUMENT - SECURE AVIATION CERTIFICATION LAYER
          </div>
          <span>DATE: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PrintTemplate;