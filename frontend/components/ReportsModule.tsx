import React, { useState, useMemo } from 'react';
import { ICONS } from '../constants';
import { toast, Toaster } from 'react-hot-toast';
import ReportFilters from './ReportFilters';
import ReportEmailModal from './ReportEmailModal';

interface ReportsModuleProps { inventory: any[];[key: string]: any; }

interface FiltersState {
    locations: string[];
    statuses: string[];
    dateFrom: string;
    dateTo: string;
    category: string;
    pnSearch: string;
}

const ReportsModule: React.FC<ReportsModuleProps> = ({ inventory = [] }) => {
    const [reportType, setReportType] = useState('INVENTORY');
    const [filters, setFilters] = useState<FiltersState>({
        locations: [],
        statuses: [],
        dateFrom: '',
        dateTo: '',
        category: '',
        pnSearch: ''
    });
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // --- 1. DYNAMIC LOCATIONS (REAL TIME) ---
    // Extracts unique locations from the actual inventory data
    const availableLocations = useMemo(() => {
        const locs = inventory.map(i => i.location || i.physical_location).filter(Boolean);
        return Array.from(new Set(locs)).sort();
    }, [inventory]);

    // --- 2. AVIATION STANDARD MAPPING ---
    const getStandardCondition = (item: any) => {
        // Priority: Explicit Status > Tag Color > Default
        const status = (item.status || '').toUpperCase();
        const color = (item.tagColor || item.color || '').toUpperCase();

        if (['SERVICEABLE', 'REPAIRABLE', 'UNSERVICEABLE', 'SCRAP'].includes(status)) return status;

        // Map Colors to Card Names (The "Add Component" Logic)
        if (color === 'YELLOW') return 'SERVICEABLE';
        if (color === 'GREEN') return 'REPAIRABLE';
        if (color === 'RED') return 'UNSERVICEABLE';
        if (color === 'BLUE' || color === 'WHITE') return 'REMOVED NOT DEFECT';

        return 'UNKNOWN';
    };

    // --- 3. FILTER ENGINE ---
    const previewData = useMemo(() => {
        let data = inventory.filter(item => {
            const pn = (item.part_number || item.pn || '').toLowerCase();
            const stdStatus = getStandardCondition(item);

            // Search P/N
            if (filters.pnSearch && !pn.includes(filters.pnSearch.toLowerCase())) return false;

            // Filter Location (Dynamic)
            if (filters.locations.length > 0) {
                const itemLoc = item.location || item.physical_location;
                if (!filters.locations.includes(itemLoc)) return false;
            }

            // Filter Status (Standardized)
            if (filters.statuses.length > 0 && !filters.statuses.includes(stdStatus)) return false;

            // Filter Date
            if (filters.dateFrom || filters.dateTo) {
                const d = new Date(item.created_at || item.registrationDate || Date.now());
                if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && d > new Date(filters.dateTo)) return false;
            }
            return true;
        });

        // Sorting
        return data.sort((a, b) => {
            if (reportType === 'LOCATION') return (a.location || '').localeCompare(b.location || '');
            if (reportType === 'STATUS') return getStandardCondition(a).localeCompare(getStandardCondition(b));
            return (a.part_number || '').localeCompare(b.part_number || '');
        });
    }, [inventory, filters, reportType]);

    // --- 4. EXPORT HANDLER ---
    const handleDownload = async (format: 'PDF' | 'EXCEL') => {
        if (previewData.length === 0) return toast.error("No hay datos para exportar");
        setIsExporting(true);
        const toastId = toast.loading(`Generando reporte...`);

        try {
            // Prepare Payload with Standardized Data
            const fullPayload = previewData.map(item => ({
                pn: item.part_number || item.pn || 'N/A',
                desc: item.partName || item.description || 'UNKNOWN',
                qty: item.quantity || item.qty || '1',
                loc: item.location || 'UNASSIGNED',
                cond: getStandardCondition(item), // <--- ENFORCED STANDARD

                // Tech Data (6 Fields)
                tsn: item.tsn || item.time_since_new || '-',
                csn: item.csn || item.cycles_since_new || '-',
                tso: item.tso || item.time_since_overhaul || '-',
                cso: item.cso || item.cycles_since_overhaul || '-',
                tsr: item.tsr || '-',
                csr: item.csr || '-',

                // Trace
                sn: item.serial_number || item.sn || 'N/A',
                manuf: item.manufacturer || item.brand || 'N/A',
                lot: item.lot_number || item.lot || 'N/A',
                exp: item.expiration_date || item.expiry || 'N/A',
                trace: item.traceability || item.source || 'N/A',
                tag_date: item.tag_date || item.registrationDate || 'N/A',
                uom: item.uom || 'EA'
            }));

            // Generate Filename Label
            const reportLabel = reportType === 'BY_PN' ? 'PART_HISTORY' : reportType;

            const response = await fetch('/api/reports/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('session_token')}` },
                body: JSON.stringify({
                    reportData: {
                        data: fullPayload,
                        reportType: reportLabel,
                        reportId: `WCA-${Date.now().toString().slice(-6)}`
                    },
                    format
                })
            });

            if (!response.ok) throw new Error("Error en servidor");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Standardized Filename
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            a.download = `WCA_${reportLabel}_${dateStr}.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a); a.click(); a.remove();
            toast.success("Descarga exitosa", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // Styles
    const styles = {
        container: { backgroundColor: '#0B1221', minHeight: '100vh', color: 'white' },
        card: { backgroundColor: '#151E32', border: '1px solid #2D3748', borderRadius: '12px', cursor: 'pointer' },
        active: { backgroundColor: '#2563EB', borderColor: '#2563EB', color: 'white', boxShadow: '0 0 15px rgba(37, 99, 235, 0.3)' }
    };

    return (
        <div style={styles.container} className="p-6 font-sans">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1E293B', color: '#fff', border: '1px solid #334155' } }} />

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black text-white">CENTRO DE REPORTES</h1>
                <div className="text-right bg-[#151E32] px-4 py-2 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400">USUARIO</p>
                    <p className="text-sm font-bold">ADMIN</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { id: 'INVENTORY', l: 'INVENTARIO GLOBAL', i: ICONS.Inventory },
                    { id: 'STATUS', l: 'POR CONDICIÓN', i: ICONS.Layers },
                    { id: 'LOCATION', l: 'POR UBICACIÓN', i: ICONS.MapPin },
                    { id: 'BY_PN', l: 'POR P/N', i: ICONS.Search }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setReportType(t.id);
                            setFilters({ locations: [], statuses: [], dateFrom: '', dateTo: '', category: '', pnSearch: '' });
                        }}
                        style={{ ...styles.card, ...(reportType === t.id ? styles.active : {}) }}
                        className="p-6 flex flex-col items-center gap-3 hover:scale-[1.02] transition-all">
                        {t.i && <t.i size={28} className={reportType === t.id ? 'text-white' : 'text-slate-500'} />}
                        <span className="text-[10px] font-black uppercase tracking-wider">{t.l}</span>
                    </button>
                ))}
            </div>

            <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableLocations={availableLocations}
                showPnSearch={reportType === 'BY_PN'}
                t={{}}
            />

            <div className="bg-[#151E32] border border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between mb-8 shadow-xl">
                <div className="text-xs font-bold text-slate-400 uppercase">{previewData.length} REGISTROS</div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => handleDownload('PDF')}
                        disabled={isExporting}
                        className="flex-1 px-6 py-3 bg-[#1E293B] border border-slate-600 text-white rounded-xl font-bold text-xs hover:bg-slate-700 flex items-center justify-center gap-2">
                        <ICONS.Printer size={16} /> PDF
                    </button>
                    <button
                        onClick={() => handleDownload('EXCEL')}
                        disabled={isExporting}
                        className="flex-1 px-6 py-3 bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-900/50 flex items-center justify-center gap-2">
                        <ICONS.Spreadsheet size={16} /> EXCEL
                    </button>
                    <button
                        onClick={() => setShowEmailModal(true)}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-500 flex items-center justify-center gap-2">
                        <ICONS.Mail size={16} /> EMAIL
                    </button>
                </div>
            </div>

            <div className="bg-[#151E32] rounded-3xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-[#0F1623] text-slate-200 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-5">P/N</th>
                                <th className="p-5">DESC</th>
                                <th className="p-5">LOC</th>
                                <th className="p-5">CONDICIÓN</th>
                                <th className="p-5 text-right">QTY</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {previewData.slice(0, 50).map((i, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-5 font-mono text-blue-400 font-bold">{i.part_number || i.pn}</td>
                                    <td className="p-5 text-white">{i.partName || i.description}</td>
                                    <td className="p-5">
                                        <span className="bg-[#1E293B] border border-slate-700 px-2 py-1 rounded text-[10px] font-bold text-slate-300">
                                            {i.location}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black border ${getStandardCondition(i) === 'SERVICEABLE' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                            getStandardCondition(i) === 'REPAIRABLE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                getStandardCondition(i) === 'UNSERVICEABLE' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-slate-700 text-white'
                                            }`}>
                                            {getStandardCondition(i)}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right text-white font-bold font-mono">{i.quantity || i.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReportEmailModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                reportData={{
                    data: previewData.map(i => ({ ...i, cond: getStandardCondition(i) })),
                    reportType,
                    reportId: `WCA-${Date.now().toString().slice(-6)}`
                }}
                token={localStorage.getItem('session_token') || ''}
                t={{}}
                onSuccess={() => toast.success("Email enviado exitosamente")}
                onError={(m) => toast.error(m)}
            />
        </div>
    );
};

export default ReportsModule;
