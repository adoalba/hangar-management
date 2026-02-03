import React, { useState, lazy, Suspense } from 'react';
import { ICONS } from '../constants';
import { UserRole } from '../types';
import { toast, Toaster } from 'react-hot-toast';

// Lazy Load Modals
const ConfirmationModal = lazy(() => import('./ConfirmationModal'));

// DEPENDENCIES FOR CLIENT-SIDE PDF PARITY
import { createRoot } from 'react-dom/client';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import PrintTemplate from './PrintTemplate';

// --- HELPER: CONDITION DETAILS ---
const getConditionDetails = (color: string | undefined, status: string | undefined) => {
    const s = (status || '').toUpperCase();
    const c = (color || '').toUpperCase();
    if (s === 'SERVICEABLE' || c === 'YELLOW') return { label: 'SERVICEABLE', style: 'bg-yellow-500 text-black border-yellow-600', dot: 'bg-yellow-500' };
    if (s === 'REPAIRABLE' || c === 'GREEN') return { label: 'REPAIRABLE', style: 'bg-emerald-600 text-white border-emerald-700', dot: 'bg-emerald-500' };
    if (s === 'UNSERVICEABLE' || c === 'RED') return { label: 'UNSERVICEABLE', style: 'bg-red-600 text-white border-red-700', dot: 'bg-red-500' };
    if (s === 'ROTABLE' || s === 'REMOVED' || c === 'BLUE' || c === 'WHITE') return { label: 'ROTABLE', style: 'bg-white text-blue-900 border-blue-200', dot: 'bg-blue-400' };
    return { label: 'UNKNOWN', style: 'bg-slate-600 text-slate-300', dot: 'bg-slate-500' };
};

const InventoryModule = ({ inventory = [], onUpdate, onEdit, onPrint, user, t }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sel, setSel] = useState<any>(null);
    const [componentName, setComponentName] = useState<string>('');
    const [viewMode, setViewMode] = useState<'NONE' | 'CARD' | 'TRACE'>('NONE');
    const [partToDelete, setPartToDelete] = useState<any>(null);
    const [email, setEmail] = useState('');

    // --- FILTER ENGINE ---
    const filteredInventory = inventory.filter((item: any) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (item.pn || '').toLowerCase().includes(term) ||
            (item.desc || item.description || item.partName || '').toLowerCase().includes(term) ||
            (item.sn || '').toLowerCase().includes(term) ||
            (item.manuf || item.manufacturer || '').toLowerCase().includes(term);
        const details = getConditionDetails(item.tagColor, item.status);
        return matchesSearch && (filterStatus === 'ALL' || details.label === filterStatus);
    });

    // --- UNIVERSAL PAYLOAD HANDLER (STRICT DATA PARITY ENFORCEMENT) ---
    // GOLDEN RECORD STRATEGY: Maps data to ALL possible backend keys
    // HELPER: CENTRALIZED DATA MAPPING - UNIFIED PAYLOAD
    // This ensures Print and Email ALWAYS get the same data.
    const getStandardizedItem = (rawItem: any) => {
        const rawLoc = rawItem.location || rawItem.physical_location || rawItem.loc || 'UNASSIGNED';
        const rawDate = rawItem.tag_date || rawItem.reg_date || rawItem.date || new Date().toLocaleDateString();
        const rawExp = rawItem.exp || rawItem.expiration_date || rawItem.shelf_life || 'N/A';
        const rawDesc = rawItem.desc || rawItem.description || rawItem.partName || 'N/A';

        return {
            ...rawItem,
            // FORCE KEY MAPPING FOR PYTHON BACKEND
            pn: rawItem.pn,
            sn: rawItem.sn,
            desc: rawDesc, description: rawDesc, // Map both
            partName: rawDesc, // Redundancy for frontend

            // LOCATION (All 3 variants)
            loc: rawLoc, location: rawLoc, final_location: rawLoc,

            // CONDITION
            cond: rawItem.tagColor || rawItem.status || 'N/A',
            status: rawItem.tagColor || rawItem.status || 'N/A',

            // DATES
            tag_date: rawDate, reg_date: rawDate,
            exp: rawExp, shelf_life: rawExp, expiration_date: rawExp,

            // TRACEABILITY
            trace: rawItem.traceability || rawItem.source || 'N/A',
            source: rawItem.traceability || rawItem.source || 'N/A',

            // TECHNICAL DATA (Times and Cycles - Critical)
            tsn: rawItem.tsn || rawItem.time_since_new || '-',
            csn: rawItem.csn || rawItem.cycles_since_new || '-',
            tso: rawItem.tso || rawItem.time_since_overhaul || '-',
            cso: rawItem.cso || rawItem.cycles_since_overhaul || '-',
            tsr: rawItem.tsr || '-',
            csr: rawItem.csr || '-',
            trem: rawItem.trem || rawItem.time_remaining || '-',
            crem: rawItem.crem || rawItem.cycles_remaining || '-',

            // OTHER
            model: rawItem.model || '-',
            qty: rawItem.qty || '1',
            id: rawItem.id || 'N/A',
            remarks: rawItem.remarks || 'None',

            // SIGNATURES
            certifier: rawItem.certifier || 'AA',
            license: rawItem.license || 'GBF43'
        };
    };

    const handleOutput = async (mode: 'PRINT' | 'EMAIL', type: 'CARD' | 'TRACEABILITY', itemOverride?: any) => {
        const item = itemOverride || sel;
        if (!item) return;
        const recipient = mode === 'EMAIL' ? (email || prompt("Email del destinatario:")) : '';
        if (mode === 'EMAIL' && !recipient) return;

        const loading = toast.loading("Generando Documento Oficial (Paridad Exacta)...");

        try {
            // 1. GENERATE IDENTICAL PAYLOAD
            const payloadItem = getStandardizedItem(item);

            if (mode === 'EMAIL' && type === 'CARD') {
                // --- CLIENT-SIDE GENERATION STRATEGY (PARITY ENFORCEMENT) ---
                // Render the EXACT same component used for printing
                const container = document.createElement('div');
                container.id = 'pdf-gen-container';
                // STRATEGY 3: VISIBLE OVERLAY (FORCE PAINT)
                // If it's hidden, browsers optimize it away. We must show it.
                container.style.position = 'fixed';
                container.style.inset = '0'; // Full screen
                container.style.zIndex = '9999'; // Very top covering everything
                container.style.backgroundColor = 'rgba(0,0,0,0.9)'; // Dark backdrop
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.overflow = 'auto'; // scrollable if needed

                // Message
                const msg = document.createElement('div');
                msg.innerText = "GENERANDO DOCUMENTO OFICIAL... / GENERATING OFFICIAL DOCUMENT...";
                msg.style.color = 'white';
                msg.style.marginBottom = '20px';
                msg.style.fontWeight = 'bold';
                msg.style.fontFamily = 'monospace';
                container.appendChild(msg);

                // The Card Container (White Paper)
                const cardWrapper = document.createElement('div');
                cardWrapper.style.width = '210mm';
                // STRATEGY FIX: SUB-PIXEL OVERFLOW PREVENTION
                // Reduce height slightly (296mm) to guarantee it fits in A4 (297mm) without triggering a second page.
                cardWrapper.style.height = '296mm';
                cardWrapper.style.backgroundColor = 'white';
                cardWrapper.style.padding = '0';
                cardWrapper.style.boxShadow = '0 0 50px rgba(0,0,0,0.5)';
                cardWrapper.style.overflow = 'hidden'; // Prevent spillover
                container.appendChild(cardWrapper);

                document.body.appendChild(container); // Mount

                const root = createRoot(cardWrapper);
                // Wrap in Suspense to ensure lazy parts don't break it
                root.render(
                    <PrintTemplate part={payloadItem} t={t} />
                );

                // Wait for Paint & Images (3 seconds to be safe)
                await new Promise(resolve => setTimeout(resolve, 3000));

                const opt = {
                    margin: 0, // Zero margin
                    filename: `WCA_Official_${payloadItem.pn}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: true,
                        scrollY: 0,
                        windowWidth: 1200,
                        // Explicitly constrain capture area
                        height: 1120, // ~296mm in px at 96dpi (safely inside A4)
                        windowHeight: 1120,
                        backgroundColor: '#ffffff'
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: 'avoid-all' } // Prevent breaks
                };

                // Use cardWrapper (the white paper) as source
                const pdfBlob = await html2pdf().from(cardWrapper).set(opt).output('blob');

                // Cleanup
                root.unmount();
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }


                // Upload to Backend
                const formData = new FormData();
                formData.append('pdf', pdfBlob, `WCA_Official_${payloadItem.pn}.pdf`);
                formData.append('recipient', recipient || '');
                formData.append('pn', payloadItem.pn);
                formData.append('sn', payloadItem.sn);

                const res = await fetch('/api/reports/upload-email', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token')}` },
                    body: formData
                });

                if (!res.ok) throw new Error("Error enviando email");
                toast.success("Copia Exacta enviada correctamente", { id: loading });
                if (email) setEmail('');

            } else {
                // LEGACY / BACKEND GENERATION (Print fallback or Traceability)
                const endpoint = '/api/reports/download'; // Only Print uses this now really, or traceability
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('session_token')}` },
                    body: JSON.stringify({
                        format: 'PDF',
                        recipient: recipient, // Ignored for download
                        reportData: {
                            data: [payloadItem],
                            reportType: type,
                            reportId: `${type}-${item.pn}`
                        }
                    })
                });

                if (!res.ok) throw new Error("Error en el servidor");
                const blob = await res.blob();
                window.open(window.URL.createObjectURL(blob), '_blank');
                toast.success("Documento generado", { id: loading });
            }
            toast.dismiss(loading);
        } catch (e) {
            console.error("[OUTPUT ERROR]", e);
            toast.error("Error al procesar la solicitud", { id: loading });
        }
    };


    // --- DELETE HANDLER ---
    const confirmDelete = () => {
        if (!partToDelete) return;
        const updated = inventory.filter((i: any) => i.id !== partToDelete.id);
        onUpdate(updated);
        toast.success("Componente eliminado correctamente");
        setPartToDelete(null);
    };

    return (
        <div className="min-h-screen bg-[#0B1221] text-white p-4 md:p-8 font-sans">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1E293B', color: '#fff', border: '1px solid #334155' } }} />

            {/* HEADER & FILTERS */}
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">INVENTARIO TÉCNICO</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>SYSTEM ONLINE • {inventory.length} ITEMS</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 bg-[#151E32] p-1.5 rounded-xl border border-slate-700">
                    {['ALL', 'SERVICEABLE', 'REPAIRABLE', 'UNSERVICEABLE', 'ROTABLE'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                            {s === 'ALL' ? 'TODO EL STOCK' : s}
                        </button>
                    ))}
                </div>
                <div className="relative w-full xl:w-72">
                    <ICONS.Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input type="text" placeholder="Buscar P/N, Desc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#151E32] border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-blue-500 outline-none text-white placeholder-slate-600 shadow-inner" />
                </div>
            </div>

            {/* TABLET-OPTIMIZED GRID TABLE */}
            <div className="bg-[#151E32] border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                {/* Header: REMOVED "ESTADO" COLUMN */}
                <div className="hidden md:grid grid-cols-12 gap-2 bg-[#0F1623] px-4 py-3 border-b border-slate-700 text-[10px] uppercase font-bold tracking-wider text-slate-300">
                    <div className="col-span-5 text-left pl-2">COMPONENTE</div>
                    <div className="col-span-2 text-left">P/N & S/N</div>
                    <div className="col-span-2 text-center">UBICACIÓN</div>
                    <div className="col-span-1 text-center">CONDICIÓN</div>
                    <div className="col-span-2 text-right pr-2">ACCIONES</div>
                </div>
                <div className="divide-y divide-slate-700/50">
                    {filteredInventory.map((item: any, idx: number) => {
                        const d = getConditionDetails(item.tagColor, item.status);
                        const name = item.desc || item.description || item.partName || 'N/A';
                        const manuf = item.manuf || item.manufacturer || 'GENERIC';

                        return (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/50 transition-colors group">

                                {/* 1. COMPONENT (col-span-5 for better text fit) */}
                                <div className="col-span-1 md:col-span-5 flex items-center gap-3 overflow-hidden pl-2">
                                    <div className="w-10 h-10 rounded-lg bg-[#0B1221] border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0 shadow-sm">
                                        <ICONS.Box size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-white text-sm truncate leading-tight" title={name}>{name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{manuf}</div>
                                    </div>
                                </div>

                                {/* 2. ID (Closer to Component due to gap-2) */}
                                <div className="col-span-1 md:col-span-2 min-w-0 mt-1 md:mt-0">
                                    <div className="font-mono font-bold text-blue-400 text-xs md:text-sm truncate">{item.pn}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">SN: {item.sn || '-'}</div>
                                </div>

                                {/* 3. LOCATION (Center) */}
                                <div className="col-span-1 md:col-span-2 mt-1 md:mt-0 flex md:justify-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-[#0B1221] border border-slate-700 text-[10px] md:text-xs font-bold text-slate-300 truncate">
                                        <ICONS.MapPin size={10} className="mr-1.5 text-slate-500" />{item.location || 'UNASSIGNED'}
                                    </span>
                                </div>

                                {/* 4. CONDITION (Compact col-span-1) */}
                                <div className="col-span-1 md:col-span-1 mt-1 md:mt-0 flex md:justify-center">
                                    <span className={`inline-block px-2 py-1 rounded text-[9px] font-black border uppercase tracking-wider truncate ${d.style}`}>
                                        {d.label}
                                    </span>
                                </div>

                                {/* 5. ACTIONS (Right) */}
                                <div className="col-span-1 md:col-span-2 flex justify-start md:justify-end gap-1.5 mt-2 md:mt-0 border-t md:border-t-0 border-slate-700 pt-2 md:pt-0 pr-2">
                                    {/* Digital Twin Card (Restored to Modal) */}
                                    <button onClick={() => {
                                        const calcName = item.desc || item.description || item.partName || 'SIN DESCRIPCIÓN';
                                        setComponentName(calcName);
                                        setSel(item);
                                        setViewMode('CARD');
                                    }}
                                        className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-blue-400 hover:text-blue-400 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                        title="Ver">
                                        <ICONS.Eye size={18} />
                                    </button>

                                    {/* Traceability Certificate */}
                                    <button onClick={() => {
                                        const calcName = item.desc || item.description || item.partName || 'SIN DESCRIPCIÓN';
                                        setComponentName(calcName);
                                        setSel(item);
                                        setViewMode('TRACE');
                                    }}
                                        className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-violet-500 hover:text-violet-400 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                        title="Trazabilidad">
                                        <ICONS.History size={18} />
                                    </button>

                                    <button onClick={() => onPrint && onPrint(item)}
                                        className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                        title="Imprimir">
                                        <ICONS.Printer size={18} />
                                    </button>

                                    <button onClick={() => {
                                        setSel(item);
                                        handleOutput('EMAIL', 'CARD', item);
                                    }}
                                        className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-violet-500 hover:text-violet-400 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                        title="Enviar Email (PDF)">
                                        <ICONS.Mail size={18} />
                                    </button>

                                    {user?.role !== UserRole.VIEWER && (
                                        <button onClick={() => onEdit && onEdit(item)}
                                            className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-yellow-500 hover:text-yellow-400 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                            title="Editar">
                                            <ICONS.Edit size={18} />
                                        </button>
                                    )}

                                    {/* Delete (Protected: Admin Only) */}
                                    {user?.role === UserRole.ADMIN && (
                                        <button onClick={() => setPartToDelete(item)}
                                            className="w-9 h-9 flex items-center justify-center bg-[#0B1221] border border-slate-700 hover:border-red-500 hover:text-red-500 rounded-lg text-slate-400 transition-all shadow-sm active:scale-95"
                                            title="Eliminar">
                                            <ICONS.Trash size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- DIGITAL TWIN MODAL (HIGH CONTRAST & DATA FIXED) --- */}
            {viewMode === 'CARD' && sel && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
                    {/* CARD CONTAINER: Variable Border Color based on Condition */}
                    <div className={`relative w-full max-w-4xl bg-white text-black shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-[10px] ${(() => {
                        const d = getConditionDetails(sel.tagColor, sel.status);
                        if (d.label === 'SERVICEABLE') return 'border-yellow-500';
                        if (d.label === 'REPAIRABLE') return 'border-emerald-600';
                        if (d.label === 'UNSERVICEABLE') return 'border-red-600';
                        if (d.label === 'ROTABLE') return 'border-blue-500';
                        return 'border-slate-600';
                    })()}`}>

                        <button onClick={() => setViewMode('NONE')} className="absolute top-2 right-2 z-50 bg-black text-white p-1 rounded hover:bg-red-600">
                            <ICONS.X size={20} />
                        </button>

                        <div className="overflow-y-auto p-6 flex-1 bg-white font-sans">

                            {/* HEADER */}
                            <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                <div>
                                    <h1 className="text-3xl font-black uppercase leading-none text-black">INVENTORY<br />PART</h1>
                                    <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-gray-600">AVIATION TECHNICAL RECORD</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <ICONS.QrCode size={48} className="text-black" />
                                    <span className="text-[8px] font-bold uppercase mt-1 text-black">SCAN TO TRACK</span>
                                </div>
                                <div className={`px-4 py-2 border-2 border-black font-black uppercase text-lg flex items-center ${(() => {
                                    const d = getConditionDetails(sel.tagColor, sel.status);
                                    if (d.label === 'SERVICEABLE') return 'bg-yellow-500 text-black';
                                    if (d.label === 'REPAIRABLE') return 'bg-emerald-600 text-white';
                                    if (d.label === 'UNSERVICEABLE') return 'bg-red-600 text-white';
                                    if (d.label === 'ROTABLE') return 'bg-blue-500 text-white';
                                    return 'bg-slate-600 text-white';
                                })()}`}>
                                    {getConditionDetails(sel.tagColor, sel.status).label}
                                </div>
                            </div>

                            {/* 01. ADMINISTRATIVE RECORD (Hardcoded Static Data + Dynamic Date) */}
                            <div className="mb-4 border-2 border-black">
                                <div className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">01. ADMINISTRATIVE RECORD / DATOS DE REGISTRO</div>
                                <div className="grid grid-cols-12 border-b border-black">
                                    <div className="col-span-2 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Organization</div>
                                    <div className="col-span-6 p-1 text-xs font-bold border-r border-black flex items-center text-black">World Class Aviation</div>
                                    <div className="col-span-2 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Reg. Date</div>
                                    <div className="col-span-2 p-1 text-xs font-bold flex items-center text-black">{sel.tag_date || new Date().toLocaleDateString()}</div>
                                </div>
                                <div className="grid grid-cols-12">
                                    <div className="col-span-2 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Phone / Tel</div>
                                    <div className="col-span-6 p-1 text-xs font-bold border-r border-black flex items-center text-black">(770) 631-1961</div>
                                    <div className="col-span-2 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Email</div>
                                    <div className="col-span-2 p-1 text-[8px] font-bold flex items-center text-black">ops@worldclassaviation.com</div>
                                </div>
                            </div>

                            {/* 02. TECHNICAL IDENTIFICATION (Data Binding Fixed) */}
                            <div className="mb-4 border-2 border-black">
                                <div className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA</div>
                                <div className="flex">
                                    <div className="w-2/3 border-r-2 border-black">
                                        {/* Row 1: Part Name */}
                                        <div className="grid grid-cols-12 border-b border-black">
                                            <div className="col-span-4 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Part Name</div>
                                            <div className="col-span-8 p-1 text-sm font-bold uppercase text-black flex items-center">{componentName || sel.desc || sel.description || 'N/A'}</div>
                                        </div>
                                        {/* Row 2: P/N */}
                                        <div className="grid grid-cols-12 border-b border-black">
                                            <div className="col-span-4 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">P/N (Part Number)</div>
                                            <div className="col-span-8 p-1 text-lg font-black uppercase font-mono text-black flex items-center">{sel.pn || 'N/A'}</div>
                                        </div>
                                        {/* Row 3: S/N */}
                                        <div className="grid grid-cols-12 border-b border-black">
                                            <div className="col-span-4 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">S/N (Serial Number)</div>
                                            <div className="col-span-8 p-1 text-lg font-black uppercase font-mono text-black flex items-center">{sel.sn || 'N/A'}</div>
                                        </div>
                                        {/* Row 4: Brand */}
                                        <div className="grid grid-cols-12 border-b border-black">
                                            <div className="col-span-4 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Brand / Marca</div>
                                            <div className="col-span-8 p-1 text-sm font-bold uppercase text-black flex items-center">{sel.manuf || sel.manufacturer || 'GENERIC'}</div>
                                        </div>
                                        {/* Row 5: Model */}
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-4 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Model / Modelo</div>
                                            <div className="col-span-8 p-1 text-sm font-bold uppercase text-black flex items-center">{sel.model || '-'}</div>
                                        </div>
                                    </div>

                                    {/* Photo Box */}
                                    <div className="w-1/3 flex items-center justify-center bg-gray-50 p-2 relative">
                                        {sel.image ? (
                                            <img src={sel.image} className="max-h-32 w-full object-contain" alt="Part" />
                                        ) : (
                                            <div className="text-center text-gray-400">
                                                <ICONS.Box size={40} className="mx-auto mb-2 opacity-20 text-black" />
                                                <span className="text-[10px] font-bold text-gray-500">NO PHOTO<br />AVAILABLE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* FINAL LOCATION STRIP */}
                                <div className="border-t-2 border-black flex">
                                    <div className="bg-[#0F1623] text-white p-2 w-1/3 text-xs font-bold uppercase flex items-center justify-center">
                                        FINAL LOCATION / POSICIÓN FINAL
                                    </div>
                                    <div className="p-2 w-2/3 text-xl font-black bg-yellow-50 text-black flex items-center pl-4 border-l border-black">
                                        {sel.location || 'UNASSIGNED'}
                                    </div>
                                </div>
                            </div>

                            {/* 03. TIMES AND CYCLES (Grid Fixed with High Contrast) */}
                            <div className="mb-4 border-2 border-black">
                                <div className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">03. TIMES AND CYCLES / TIEMPOS Y CICLOS</div>
                                <div className="grid grid-cols-6 text-center border-b border-black bg-gray-200 text-[9px] font-black uppercase text-black">
                                    <div className="p-1 border-r border-black">TAT / T.T (TSN)</div>
                                    <div className="p-1 border-r border-black">TSO</div>
                                    <div className="p-1 border-r border-black">T. REM</div>
                                    <div className="p-1 border-r border-black">TOTAL / TC (CSN)</div>
                                    <div className="p-1 border-r border-black">CSO</div>
                                    <div className="p-1">C. REM</div>
                                </div>
                                <div className="grid grid-cols-6 text-center text-sm font-mono font-bold text-black">
                                    <div className="p-2 border-r border-black">{sel.tsn || '-'}</div>
                                    <div className="p-2 border-r border-black">{sel.tso || '-'}</div>
                                    <div className="p-2 border-r border-black bg-gray-100">{sel.tsr || '-'}</div>
                                    <div className="p-2 border-r border-black">{sel.csn || '-'}</div>
                                    <div className="p-2 border-r border-black">{sel.cso || '-'}</div>
                                    <div className="p-2 bg-gray-100">{sel.csr || '-'}</div>
                                </div>
                            </div>

                            {/* 04. CONDITION & REMOVAL */}
                            <div className="mb-4 border-2 border-black">
                                <div className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">04. CONDITION & REMOVAL / CONDICIÓN Y REMOCIÓN</div>
                                <div className="grid grid-cols-12">
                                    <div className="col-span-3 bg-gray-200 p-1 text-[9px] font-black uppercase border-r border-black flex items-center text-black">Shelf Life / Fecha Venc.</div>
                                    <div className="col-span-9 p-2 text-base font-bold text-red-600 flex items-center">{sel.exp || sel.expiration_date || 'N/A'}</div>
                                </div>
                            </div>

                            {/* 05. TECH REPORTS & REMARKS */}
                            <div className="mb-4 border-2 border-black">
                                <div className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">05. TECH REPORTS & REMARKS / REPORTES Y OBSERVACIONES</div>
                                <div className="grid grid-cols-1">
                                    <div className="p-2 text-xs text-gray-600 italic min-h-[40px] flex items-center">
                                        {sel.remarks || sel.notes || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* SIGNATURE SECTION WITH LICENSE PILLS */}
                            <div className="grid grid-cols-2 gap-4 mb-4 border-2 border-black p-4">
                                <div className="border-r border-gray-300 pr-4">
                                    <div className="text-[8px] font-bold uppercase text-gray-600 mb-2">TECHNICAL CERTIFICATION / CERTIFICACIÓN TÉCNICA</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">LIC: GBF43</span>
                                    </div>
                                    <div className="h-12 border-b border-gray-300 mb-1">
                                        {/* Signature area */}
                                    </div>
                                    <div className="text-[8px] text-gray-500 uppercase">AA</div>
                                </div>
                                <div className="pl-4">
                                    <div className="text-[8px] font-bold uppercase text-gray-600 mb-2">FINAL INSPECTION / INSPECCIÓN FINAL</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">LIC: 55</span>
                                    </div>
                                    <div className="h-12 border-b border-gray-300 mb-1">
                                        {/* Signature area */}
                                    </div>
                                    <div className="text-[8px] text-gray-500 uppercase">GG</div>
                                </div>
                            </div>

                            {/* LEGAL FOOTER TEXT */}
                            <div className="text-center text-[7px] text-gray-700 leading-tight px-4 mb-4">
                                WORLD CLASS AVIATION CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents.
                                APPROVED FOR USE AS SERVICEABLE MATERIAL / CERTIFICA QUE ESTE COMPONENTE CUMPLE CON LOS REQUISITOS DE LOS MANUALES APLICABLES Y DOCUMENTOS DE
                                REFERENCIA VIGENTES. APROBADO ESTÁ COMPONENTE COMO MATERIAL APROBADO PARA USO.
                            </div>

                            {/* MODAL FOOTER: DIGITAL REVIEW ONLY */}
                            <div className="bg-black p-4 flex justify-between items-center border-t-4 border-gray-800 -mx-6 -mb-6">
                                <div className="flex flex-col">
                                    <span className="text-white/50 text-[10px] uppercase tracking-widest">OFFICIAL RECORD VIEWER</span>
                                    <span className="text-white/30 text-[8px]">WCA-SYS-V2</span>
                                </div>

                                {/* ONLY EMAIL BUTTON - PRINT REMOVED PER AUDIT MANDATE */}
                                <button
                                    onClick={() => handleOutput('EMAIL', 'CARD')}
                                    className="bg-blue-600 text-white px-8 py-3 rounded font-bold text-sm uppercase hover:bg-blue-500 flex gap-3 items-center shadow-lg shadow-blue-900/50 transition-all"
                                >
                                    <ICONS.Mail size={20} /> ENVIAR COPIA OFICIAL
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* --- 2. TRACEABILITY MODAL (ACTIONS IN TOP-RIGHT) --- */}
            {viewMode === 'TRACE' && sel && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-[#151E32] border border-slate-600 rounded-2xl w-full max-w-2xl p-0 shadow-2xl relative overflow-hidden">

                        {/* HEADER WITH TOP-RIGHT ACTIONS */}
                        <div className="bg-[#0F1623] p-6 border-b border-slate-700 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black text-white tracking-wide">HISTORIAL DE TRAZABILIDAD</h3>
                                <div className="text-sm text-slate-300 font-medium mb-1">{componentName}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-[10px] uppercase">P/N:</span>
                                    <span className="font-mono text-blue-400 text-xs font-bold">{sel.pn}</span>
                                    <span className="text-slate-500 text-xs">•</span>
                                    <span className="text-slate-500 text-[10px] uppercase">S/N:</span>
                                    <span className="text-slate-400 text-xs font-medium">{sel.sn || '-'}</span>
                                </div>
                            </div>

                            {/* THE ICONS (Top Right Margin) */}
                            <div className="flex gap-2">
                                <button onClick={() => handleOutput('PRINT', 'TRACEABILITY')}
                                    className="p-2 bg-[#151E32] hover:bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    title="Imprimir Certificado">
                                    <ICONS.Printer size={18} />
                                </button>
                                <button onClick={() => handleOutput('EMAIL', 'TRACEABILITY')}
                                    className="p-2 bg-[#151E32] hover:bg-blue-600 border border-slate-600 hover:border-blue-500 rounded-lg text-white"
                                    title="Enviar Certificado">
                                    <ICONS.Mail size={18} />
                                </button>
                                <button onClick={() => setViewMode('NONE')}
                                    className="p-2 text-slate-500 hover:text-red-400 ml-2">
                                    <ICONS.X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="p-8 grid grid-cols-2 gap-6">
                            <div className="p-4 bg-[#0B1221] rounded-xl border border-slate-700">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Condición Actual</label>
                                <div className="text-white font-medium">{getConditionDetails(sel.tagColor, sel.status).label}</div>
                            </div>
                            <div className="p-4 bg-[#0B1221] rounded-xl border border-slate-700">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Ubicación</label>
                                <div className="text-white font-medium">{sel.location || 'UNASSIGNED'}</div>
                            </div>
                        </div>

                        {/* FOOTER Info */}
                        <div className="bg-[#0F1623] p-4 text-center border-t border-slate-700">
                            <p className="text-[10px] text-slate-500">Este panel genera el Certificado Oficial de Trazabilidad (WCA-FORM-002)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL FOR DELETE */}
            {partToDelete && (
                <Suspense fallback={null}>
                    <ConfirmationModal
                        title="Confirmar Eliminación"
                        message={`¿Está seguro de que desea eliminar el componente ${partToDelete.pn}? Esta acción no se puede deshacer.`}
                        confirmLabel="Eliminar Componente"
                        cancelLabel="Cancelar"
                        isDestructive={true}
                        onConfirm={confirmDelete}
                        onCancel={() => setPartToDelete(null)}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default InventoryModule;
