import React from 'react';
import { createRoot } from 'react-dom/client';
import { Settings as SettingsIcon, X, Printer, Mail } from 'lucide-react';
import { MovementEvent, TagColor } from '../types';

interface TraceabilityModalProps {
    history: MovementEvent[];
    partName: string;
    pn: string;
    sn?: string;
    tagColor?: TagColor;
    onClose: () => void;
    onEmail: () => void;
    t: any;
}

const TraceabilityModal: React.FC<TraceabilityModalProps> = ({ history, partName, pn, sn, tagColor, onClose, onEmail, t }) => {
    // Sort history by timestamp descending (newest first)
    const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const getTagColorHex = (tag: TagColor) => {
        switch (tag) {
            case TagColor.YELLOW: return '#eab308';
            case TagColor.GREEN: return '#10b981';
            case TagColor.WHITE: return '#cbd5e1';
            case TagColor.RED: return '#f43f5e';
            default: return '#6366f1';
        }
    };

    const handlePrint = () => {
        const printSection = document.getElementById('print-section');
        if (printSection) {
            printSection.innerHTML = '';
            const root = createRoot(printSection);
            // Render a clean print view with white background and proper styling
            root.render(
                <div className="w-full bg-white p-8" style={{ border: `10px solid ${getTagColorHex(tagColor || TagColor.YELLOW)}` }}>
                    {/* PRINT HEADER */}
                    <div className="border-b-2 border-black mb-4 pb-2">
                        <div className="grid grid-cols-12">
                            <div className="col-span-8">
                                <h1 className="text-2xl font-black text-black leading-none tracking-tight">TRACEABILITY RECORD</h1>
                                <h2 className="text-xl font-black text-black leading-none tracking-tight">TRACEABILITY HISTORY</h2>
                                <p className="text-[10px] font-bold mt-1 tracking-widest uppercase text-slate-500">Aviation Technical Record • {partName}</p>
                            </div>
                            <div className="col-span-4 flex flex-col items-end justify-center">
                                <div className="bg-slate-100 px-2 py-1 mb-2">
                                    <span className="text-xs font-mono font-bold">REC-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold">P/N: <span className="font-black text-lg">{pn}</span></p>
                                    {sn && <p className="text-[10px] font-bold">S/N: <span className="font-black">{sn}</span></p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE CONTENT */}
                    <div className="relative pl-8 border-l-2 border-black space-y-4">
                        {sortedHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p className="italic">{t.no_history || "No records found."}</p>
                            </div>
                        ) : (
                            sortedHistory.map((event, index) => (
                                <div key={index} className="relative mb-4">
                                    <div className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-black border-2 border-white"></div>

                                    <div className="bg-white p-3 border-2 border-black">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-black bg-white text-black">
                                                {event.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs font-mono text-black font-bold">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold text-black mb-2">
                                            {event.description}
                                        </p>

                                        <div className="flex flex-wrap gap-4 text-xs text-black bg-white border border-black p-2">
                                            {event.previousLocation && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase font-bold text-slate-600">From Location</span>
                                                    <span className="font-mono text-black font-bold">{event.previousLocation}</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-slate-600">To Location</span>
                                                <span className="font-mono text-black font-bold">{event.newLocation || "N/A"}</span>
                                            </div>

                                            <div className="flex flex-col ml-auto text-right">
                                                <span className="text-[9px] uppercase font-bold text-slate-600">Updated By</span>
                                                <span className="font-bold text-black">{event.userName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
            setTimeout(() => {
                window.print();
            }, 700);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 print-modal-container">
            <style>{`
                @media print {
                    /* CRITICAL: Reset HTML/Body for printing */
                    html, body {
                        overflow: visible !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    /* Hide the main app root specifically */
                    body > #root {
                        display: none !important;
                    }

                    /* Ensure our modal container is visible */
                    body > .print-modal-container {
                        display: flex !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        z-index: 9999 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    

                    /* Reset modal content styles */
                    .print-modal-content {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        border-radius: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                    }

                    /* Ensure headers/text are black */
                    .print-text-black {
                        color: black !important;
                    }

                    /* Allow scrolling/expanding */
                    .custom-scrollbar {
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                    }
                    
                    /* Page break avoidance */
                    .group {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
            <div className={`bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print-modal-content print:border-[10px] print:border-indigo-500`}>

                {/* PRINT ONLY HEADER */}
                <div className="hidden print:block border-b-2 border-black mb-4 pb-2 px-8 pt-8">
                    <div className="grid grid-cols-12">
                        <div className="col-span-8">
                            <h1 className="text-2xl font-black text-black leading-none tracking-tight">TRACEABILITY RECORD</h1>
                            <h2 className="text-xl font-black text-black leading-none tracking-tight">HISTORIAL DE TRAZABILIDAD</h2>
                            <p className="text-[10px] font-bold mt-1 tracking-widest uppercase text-slate-500">Aviation Technical Record • {partName}</p>
                        </div>
                        <div className="col-span-4 flex flex-col items-end justify-center">
                            <div className="bg-slate-100 px-2 py-1 mb-2">
                                <span className="text-xs font-mono font-bold">REC-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold">P/N: <span className="font-black text-lg">{pn}</span></p>
                                {sn && <p className="text-[10px] font-bold">S/N: <span className="font-black">{sn}</span></p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCREEN ONLY HEADER */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0 print:!hidden">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <SettingsIcon className="w-5 h-5 text-indigo-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-400">{t.traceability_record || "TRACEABILITY RECORD"}</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{partName}</h2>
                        <div className="flex gap-4 mt-1 text-xs font-mono text-slate-400">
                            <p>P/N: <span className="text-white">{pn}</span></p>
                            {sn && <p>S/N: <span className="text-white">{sn}</span></p>}
                            {tagColor && <p>TAG: <span className={`text-white font-bold uppercase`}>{tagColor}</span></p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEmail} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-indigo-400 hover:text-white" title={t.send_email || "Email"}>
                            <Mail className="w-6 h-6" />
                        </button>
                        <button onClick={handlePrint} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-indigo-400 hover:text-white" title={t.print || "Print"}>
                            <Printer className="w-6 h-6" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar print:bg-white print:p-8 print:overflow-visible">

                    {/* AUDIT SUMMARY STATS */}
                    {sortedHistory.length > 0 && (
                        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 print:border-black">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                Audit Summary / Resumen de Auditoría
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="text-center p-3 bg-indigo-50 rounded-xl">
                                    <p className="text-2xl font-black text-indigo-600">{sortedHistory.length}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total Events</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                    <p className="text-2xl font-black text-emerald-600">
                                        {sortedHistory.filter(e => e.type === 'LOCATION_CHANGE').length}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Moves</p>
                                </div>
                                <div className="text-center p-3 bg-amber-50 rounded-xl">
                                    <p className="text-2xl font-black text-amber-600">
                                        {new Set(sortedHistory.map(e => e.newLocation).filter(Boolean)).size}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Locations</p>
                                </div>
                                <div className="text-center p-3 bg-slate-100 rounded-xl">
                                    <p className="text-sm font-black text-slate-700">
                                        {sortedHistory.length > 0
                                            ? new Date(sortedHistory[sortedHistory.length - 1].timestamp).toLocaleDateString()
                                            : 'N/A'
                                        }
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Created</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative pl-8 border-l-2 border-indigo-200 space-y-8 print:border-black print:pl-4 print:space-y-4">
                        {sortedHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p className="italic">{t.no_history || "No records found."}</p>
                            </div>
                        ) : (
                            sortedHistory.map((event, index) => (
                                <div key={index} className="relative group print:mb-4">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-md print:hidden ${event.type === 'CREATION' ? 'bg-emerald-500' :
                                        event.type === 'LOCATION_CHANGE' ? 'bg-indigo-500' :
                                            event.type === 'STATUS_CHANGE' ? 'bg-amber-500' : 'bg-slate-500'
                                        }`} />

                                    {/* Print Dot Replacement */}
                                    <div className="hidden print:block absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-black border-2 border-white"></div>

                                    {/* Card */}
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group-hover:shadow-md transition-shadow break-inside-avoid print:shadow-none print:border-2 print:border-black print:rounded-none print:p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider print:border print:border-black print:bg-white print:text-black ${event.type === 'CREATION' ? 'bg-emerald-50 text-emerald-600' :
                                                event.type === 'LOCATION_CHANGE' ? 'bg-indigo-50 text-indigo-600' :
                                                    event.type === 'STATUS_CHANGE' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {event.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs font-mono text-slate-400 print:text-black font-bold">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold text-slate-800 mb-2 print:text-black">
                                            {event.description}
                                        </p>

                                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl print:bg-white print:border print:border-black print:rounded-none print:text-black print:p-2">
                                            {event.previousLocation && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">From / Desde</span>
                                                    <span className="font-mono text-slate-700 print:text-black font-bold">{event.previousLocation}</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">To / Hacia</span>
                                                <span className="font-mono text-indigo-600 font-bold print:text-black">{event.newLocation || "N/A"}</span>
                                            </div>

                                            <div className="flex flex-col ml-auto text-right">
                                                <span className="text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">User / Usuario</span>
                                                <span className="font-bold text-slate-700 print:text-black">{event.userName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white p-4 border-t text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest shrink-0 print-text-black">
                    Secure Chain of Custody System • AeroLogistics
                </div>
            </div>
        </div>
    );
};

export default TraceabilityModal;
