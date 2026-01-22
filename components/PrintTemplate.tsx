import React from 'react';
import { AviationPart, TagColor } from '../types';

interface PrintTemplateProps {
  part: AviationPart;
  t: any;
}

const PrintHeader: React.FC<{ part: AviationPart, t: any }> = ({ part, t }) => {
  const titles = {
    [TagColor.YELLOW]: "MATERIAL APROBADO / SERVICEABLE MATERIAL",
    [TagColor.GREEN]: "MATERIAL REPARABLE / REPAIRABLE MATERIAL",
    [TagColor.WHITE]: "REMOVIDO SIN FALLA / REMOVED NO DEFECT",
    [TagColor.RED]: "MATERIAL RECHAZADO / REJECTED MATERIAL",
  };
  return (
    <div className="grid grid-cols-12 border-b-2 border-black mb-2 pb-2">
      <div className="col-span-4 flex items-center">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-900 leading-none tracking-tighter">INVENTORY</h1>
            <h1 className="text-xl font-black text-slate-900 leading-none tracking-tighter">PART</h1>
            <p className="text-[5px] font-bold mt-1 tracking-widest uppercase text-slate-500">Aviation Technical Record</p>
          </div>
        </div>
      </div>
      <div className="col-span-8 flex items-center justify-end px-4">
        <div className="border-[3px] border-black px-6 py-2 bg-gray-50/50">
          <h2 className="text-xl font-black uppercase tracking-tight text-right leading-none">{titles[part.tagColor]}</h2>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; className?: string }> = ({ title, className = "" }) => (
  <div className={`col-span-12 py-1 px-2 mb-0.5 mt-2 bg-slate-900 text-white flex items-center ${className}`}>
    <span className="text-[7px] font-black uppercase tracking-[0.2em]">{title}</span>
  </div>
);

const Field: React.FC<{ label: string; value?: string; full?: boolean; className?: string; span?: number; labelWidth?: string }> = ({ label, value, full, className = "", span, labelWidth = "w-2/5" }) => {
  const colSpan = span ? `col-span-${span}` : (full ? 'col-span-12' : 'col-span-6');
  return (
    <div className={`border border-black flex items-stretch ${colSpan}`}>
      <div className={`${labelWidth} border-r border-black bg-gray-50 p-1 flex items-center`}>
        <span className="text-[6.5px] font-black uppercase text-slate-700 leading-tight">{label}</span>
      </div>
      <div className="flex-1 p-1 flex items-center overflow-hidden min-h-[1.5rem] bg-white">
        <span className={`text-[10px] font-black uppercase break-all leading-tight ${className}`}>{value || ''}</span>
      </div>
    </div>
  );
};

const TimesCycleBox: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex flex-col border border-black min-h-[50px] bg-white">
    <div className="bg-gray-100 border-b border-black py-0.5 px-1 text-center">
      <span className="text-[6px] font-black uppercase text-slate-700">{label}</span>
    </div>
    <div className="flex-1 flex items-center justify-center p-1">
      <span className="text-[13px] font-black font-mono text-slate-900">{value || '---'}</span>
    </div>
  </div>
);

const TimesCyclesGrid: React.FC<{ part: AviationPart }> = ({ part }) => (
  <div className="col-span-12 grid grid-cols-6 mt-1">
    <TimesCycleBox label="T.T / TAT" value={part.ttTat} />
    <TimesCycleBox label="TSO" value={part.tso} />
    <TimesCycleBox label="T. REM" value={part.trem} />
    <TimesCycleBox label="TC (TOTAL)" value={part.tc} />
    <TimesCycleBox label="CSO" value={part.cso} />
    <TimesCycleBox label="C. REM" value={part.crem} />
  </div>
);

const CheckboxField: React.FC<{ label: string; checked: boolean; }> = ({ label, checked }) => (
  <div className="flex items-center gap-1.5 px-3 border-r border-black last:border-r-0 flex-1 justify-center py-1">
    <div className="w-3.5 h-3.5 border border-black flex items-center justify-center bg-white shadow-sm">
      {checked && <div className="w-2 h-2 bg-black" />}
    </div>
    <span className="text-[7px] font-black uppercase text-slate-800">{label}</span>
  </div>
);

const SignaturesSection: React.FC<{ part: AviationPart }> = ({ part }) => (
  <div className="col-span-12 grid grid-cols-12 mt-4 border border-black">
    {/* Tech Column */}
    <div className="col-span-6 border-r border-black">
      <div className="bg-slate-50 border-b border-black p-1 text-center">
        <span className="text-[7px] font-black uppercase text-slate-600">CERTIFICACIÓN TÉCNICA / TECHNICAL CERTIFICATION</span>
      </div>
      <div className="grid grid-cols-12 h-28">
        <div className="col-span-5 p-2 flex flex-col justify-between border-r border-black bg-gray-50/30">
          <div>
            <p className="text-[6px] font-bold text-slate-400 uppercase leading-none mb-1">NAME / LIC:</p>
            <p className="text-[11px] font-black uppercase leading-tight text-slate-900 mb-1">{part.technicianName}</p>
            <div className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-center">
              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">LIC: {part.technicianLicense}</p>
            </div>
          </div>
        </div>
        <div className="col-span-7 p-2 flex flex-col items-center justify-center bg-white relative">
          <p className="text-[5px] font-bold absolute top-1 left-2 text-slate-300 uppercase">SIGNATURE</p>
          {part.technicianSignature && <img src={part.technicianSignature} className="h-full w-full object-contain" alt="Signature" />}
        </div>
      </div>
    </div>
    {/* Inspector Column */}
    <div className="col-span-6">
      <div className="bg-slate-50 border-b border-black p-1 text-center">
        <span className="text-[7px] font-black uppercase text-slate-600">INSPECCIÓN FINAL / FINAL INSPECTION</span>
      </div>
      <div className="grid grid-cols-12 h-28">
        <div className="col-span-5 p-2 flex flex-col justify-between border-r border-black bg-gray-50/30">
          <div>
            <p className="text-[6px] font-bold text-slate-400 uppercase leading-none mb-1">NAME / LIC:</p>
            <p className="text-[11px] font-black uppercase leading-tight text-slate-900 mb-1">{part.inspectorName}</p>
            <div className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-center">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">LIC: {part.inspectorLicense}</p>
            </div>
          </div>
        </div>
        <div className="col-span-7 p-2 flex flex-col items-center justify-center bg-white relative">
          <p className="text-[5px] font-bold absolute top-1 left-2 text-slate-300 uppercase">STAMP / SIG</p>
          {part.inspectorSignature && <img src={part.inspectorSignature} className="h-full w-full object-contain" alt="Stamp" />}
        </div>
      </div>
    </div>
  </div>
);

const PrintTemplate: React.FC<PrintTemplateProps> = ({ part, t }) => {
  const shelfLifeDate = part?.shelfLife ? new Date(part.shelfLife).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

  const getTagColorHex = (tag: TagColor) => {
    switch (tag) {
      case TagColor.YELLOW: return '#eab308'; // yellow-500
      case TagColor.GREEN: return '#10b981'; // emerald-500
      case TagColor.WHITE: return '#cbd5e1'; // slate-300
      case TagColor.RED: return '#f43f5e'; // rose-500
      default: return '#6366f1'; // indigo-500
    }
  };

  const renderBody = () => {
    return (
      <div className="grid grid-cols-12 w-full gap-y-0.5">
        {/* IDENTIFICACIÓN TÉCNICA + FOTO */}
        <SectionHeader title="01. IDENTIFICACIÓN TÉCNICA / TECHNICAL IDENTIFICATION" />
        <div className="col-span-12 grid grid-cols-12 gap-0.5">
          <div className="col-span-8 grid grid-cols-12 gap-y-0.5">
            <Field label="NOMBRE / PART NAME" value={part.partName} full />
            <Field label="P/N (PART NUMBER)" value={part.pn} span={6} />
            <Field label="S/N (SERIAL NUMBER)" value={part.sn} span={6} />
            <Field label="MARCA / BRAND" value={part.brand} span={6} />
            <Field label="MODELO / MODEL" value={part.model} span={6} />
          </div>
          <div className="col-span-4 border border-black p-1 flex items-center justify-center bg-white min-h-[105px]">
            {part.photo ? (
              <img src={part.photo} className="w-full h-full object-cover rounded-sm" alt="Part" />
            ) : (
              <div className="text-[6px] font-black text-slate-300 uppercase text-center">NO PHOTO<br />AVAILABLE</div>
            )}
          </div>
        </div>

        {/* TIEMPOS Y CICLOS */}
        <SectionHeader title="02. TIEMPOS Y CICLOS / TIMES AND CYCLES" />
        <TimesCyclesGrid part={part} />

        {/* REGISTRO Y ORGANIZACIÓN */}
        <SectionHeader title="03. DATOS DE REGISTRO / ADMINISTRATIVE RECORD" />
        <Field label="ORGANIZACIÓN / ORG" value={part.organization || "World Class Aviation"} span={8} />
        <Field label="REG. DATE" value={part.registrationDate ? new Date(part.registrationDate).toLocaleDateString() : ''} span={4} />
        <Field label="TEL / PHONE" value={part.companyPhone} span={6} />
        <Field label="EMAIL" value={part.companyEmail} span={6} />

        {/* CONDICIÓN ESPECÍFICA */}
        <SectionHeader title="04. CONDICIÓN Y REMOCIÓN / CONDITION & REMOVAL" />
        {part.tagColor === TagColor.YELLOW && (
          <Field label="FECHA VENCIMIENTO / SHELF LIFE" value={shelfLifeDate} full className="text-rose-600 font-black" />
        )}
        {(part.tagColor === TagColor.GREEN || part.tagColor === TagColor.WHITE) && (
          <div className="col-span-12 flex border border-black bg-white overflow-hidden">
            <div className="w-1/4 bg-gray-50 p-1 border-r border-black flex items-center justify-center">
              <span className="text-[6.5px] font-black uppercase text-slate-700">REASON:</span>
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
          <Field label="ALMACENAMIENTO / STORAGE LOC" value={part.physicalStorageLocation || part.location} full />
        )}
        {part.tagColor === TagColor.RED && (
          <Field label="MOTIVO RECHAZO / REJECTION" value={part.rejectionReason} full className="text-rose-600 font-bold" />
        )}

        {/* REPORTES / OBSERVACIONES */}
        <SectionHeader title="05. REPORTES Y OBSERVACIONES / TECH REPORTS & REMARKS" />
        {part.tagColor === TagColor.GREEN && (
          <div className="col-span-12 border border-black p-2 min-h-[60px] bg-white">
            <p className="text-[6px] font-bold text-slate-400 uppercase mb-1">REPORTE TÉCNICO / TECH REPORT:</p>
            <p className="text-[9px] font-medium leading-relaxed">{part.technicalReport || 'N/A'}</p>
          </div>
        )}
        <div className="col-span-12 border border-black p-2 min-h-[50px] bg-white">
          <p className="text-[6px] font-bold text-slate-400 uppercase mb-1">OBSERVACIONES / REMARKS:</p>
          <p className="text-[9px] font-medium leading-relaxed">{part.observations || 'N/A'}</p>
        </div>

        {/* CERTIFICACIÓN Y FIRMAS */}
        <SignaturesSection part={part} />

        {/* PIE LEGAL */}
        <div className="col-span-12 p-3 mt-4 border border-black text-center bg-gray-50/80">
          <p className="text-[7.5px] font-black uppercase tracking-tight leading-normal">
            {part.tagColor === TagColor.YELLOW ? (
              "WORLD CLASS AVIATION CERTIFICA que este componente / material cumple con los requisitos de los manuales aplicables y documentos de referencia vigentes. Aprueba este componente como MATERIAL APROBADO para uso. / CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents. Approved for use as SERVICEABLE MATERIAL."
            ) : part.tagColor === TagColor.GREEN ? (
              "WORLD CLASS AVIATION CERTIFICA que este componente / material cumple con los requisitos de manuales internos y documentos de referencia. / CERTIFIES that this component/material meets internal manuals and reference document requirements."
            ) : part.tagColor === TagColor.WHITE ? (
              "REMOVIDO POR LA RAZÓN DESCRITA Y CUMPLE CON REQUISITOS VIGENTES. / REMOVED FOR DESCRIBED REASON AND MEETS CURRENT REQUIREMENTS."
            ) : (
              "NO CUMPLE REQUISITOS APLICABLES. RECHAZADO PARA USO. / DOES NOT MEET APPLICABLE REQUIREMENTS. REJECTED FOR USE."
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[210mm] mx-auto bg-white text-black p-1 font-sans print:p-0">
      <div
        className="flex flex-col border-[12px] p-6 shadow-sm"
        style={{ borderColor: getTagColorHex(part.tagColor) }}
      >
        <PrintHeader part={part} t={t} />
        {renderBody()}
        <div className="mt-4 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">
          <div className="flex gap-4">
            <span>RECORD ID: {part.id}</span>
            <span>VER: 4.1.0</span>
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