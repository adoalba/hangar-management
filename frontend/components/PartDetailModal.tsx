
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AviationPart, TagColor } from '../types';
import { ICONS, TRANSLATIONS, BILINGUAL_LABELS } from '../constants';
import PrintTemplate from './PrintTemplate';


interface PartDetailModalProps {
  part: AviationPart;
  onClose: () => void;
  t: any;
}

const PartDetailModal: React.FC<PartDetailModalProps> = ({ part, onClose, t }) => {
  const DataField = ({ label, value, highlight = false, mono = false }: { label: string; value?: string | null; highlight?: boolean; mono?: boolean }) => (
    <div className={`p-3 rounded-xl border border-slate-800/50 ${highlight ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-950/30'}`}>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xs font-bold truncate ${highlight ? 'text-indigo-400' : 'text-slate-200'} ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-700 italic font-medium">N/A</span>}
      </p>
    </div>
  );

  const getTagColorClass = (tag: TagColor) => {
    switch (tag) {
      case TagColor.YELLOW: return 'border-yellow-500 text-yellow-500';
      case TagColor.GREEN: return 'border-emerald-500 text-emerald-500';
      case TagColor.WHITE: return 'border-slate-300 text-slate-300';
      case TagColor.RED: return 'border-rose-500 text-rose-500';
      default: return 'border-indigo-500 text-indigo-500';
    }
  };

  const handlePrint = () => {
    const printSection = document.getElementById('print-section');
    if (printSection) {
      printSection.innerHTML = '';
      const root = createRoot(printSection);
      root.render(<PrintTemplate part={part} t={t} />);
      setTimeout(() => {
        window.print();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
      <div className={`w-full max-w-5xl bg-slate-900 border-2 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col ${getTagColorClass(part.tagColor)}`}>

        <div className="p-6 md:p-8 bg-slate-900 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-widest ${getTagColorClass(part.tagColor)} bg-black/20`}>
              {t[`${part.tagColor.toLowerCase()}_tag` as keyof typeof t]}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{part.partName}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Record ID: {part.id}</p>
              </div>
              <div className="h-10 w-px bg-slate-800 mx-2" />
              <div className="bg-indigo-600/10 border border-indigo-500/20 px-5 py-2.5 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{BILINGUAL_LABELS.location}</p>
                <p className="text-sm font-black text-indigo-400 uppercase tracking-tight">{part.location}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-750 rounded-full text-slate-400 transition-all">
            <ICONS.X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            <div className="lg:col-span-4 space-y-6">
              <div className="aspect-square bg-black rounded-[2rem] border border-slate-800 overflow-hidden shadow-inner group relative">
                {part.photo ? (
                  <img src={part.photo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                    <ICONS.Inventory size={80} />
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4">Sin Registro Fotográfico</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <ICONS.Clock size={14} />
                  DATOS DE REGISTRO / RECORD INFO
                </h4>
                <div className="space-y-3">
                  <DataField label={BILINGUAL_LABELS.date} value={part.registrationDate ? new Date(part.registrationDate).toLocaleDateString() : 'N/A'} highlight />
                  <DataField label={BILINGUAL_LABELS.organization} value={part.organization || "World Class Aviation"} />
                  <DataField label={BILINGUAL_LABELS.phone} value={part.companyPhone} />
                  <DataField label={BILINGUAL_LABELS.email} value={part.companyEmail} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">Identificación Técnica / Tech ID</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataField label={BILINGUAL_LABELS.part_name} value={part.partName} highlight />
                  <DataField label={BILINGUAL_LABELS.pn} value={part.pn} mono />
                  <DataField label={BILINGUAL_LABELS.sn} value={part.sn} mono />
                  <DataField label={BILINGUAL_LABELS.brand} value={part.brand} />
                  <DataField label={BILINGUAL_LABELS.model} value={part.model} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">Tiempos y Ciclos / Times & Cycles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataField label={BILINGUAL_LABELS.tt} value={part.ttTat} />
                  <DataField label={BILINGUAL_LABELS.tso} value={part.tso} />
                  <DataField label={BILINGUAL_LABELS.trem} value={part.trem} />
                  <DataField label={BILINGUAL_LABELS.tc} value={part.tc} />
                  <DataField label={BILINGUAL_LABELS.cso} value={part.cso} />
                  <DataField label={BILINGUAL_LABELS.crem} value={part.crem} />
                </div>
              </div>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">{BILINGUAL_LABELS.technician}</h4>
              <div className="bg-slate-950 border border-slate-800 h-32 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden group shadow-inner">
                {part.technicianSignature ? <img src={part.technicianSignature} className="max-h-full max-w-full object-contain" /> : <div className="text-slate-700 text-[10px] font-black uppercase tracking-widest">NO SIGNATURE</div>}
              </div>
              <div className="flex justify-between items-center px-2">
                <p className="text-[10px] font-bold text-white uppercase">{part.technicianName || "---"}</p>
                <p className="text-[10px] font-mono text-slate-500">LIC: {part.technicianLicense || "---"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">{BILINGUAL_LABELS.inspector}</h4>
              <div className="bg-slate-950 border border-slate-800 h-32 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden shadow-inner">
                {part.inspectorSignature ? <img src={part.inspectorSignature} className="max-h-full max-w-full object-contain" /> : <div className="text-slate-700 text-[10px] font-black uppercase tracking-widest">NO STAMP</div>}
              </div>
              <div className="flex justify-between items-center px-2">
                <p className="text-[10px] font-bold text-white uppercase">{part.inspectorName || "---"}</p>
                <p className="text-[10px] font-mono text-slate-500">LIC: {part.inspectorLicense || "---"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center gap-4">
          <p className="text-[10px] text-slate-600 font-mono hidden md:block">ID: {part.id} | VER_4.0_CERTIFIED</p>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-8 py-4 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
              {t.cancel || "Cerrar / Close"}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transform active:scale-95 transition-all"
            >
              <ICONS.Printer size={18} />
              {t.save_print}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartDetailModal;
