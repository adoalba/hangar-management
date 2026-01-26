import React, { useState, useMemo, useCallback } from 'react';
import { AviationPart, TagColor } from '../types';
import { ICONS } from '../constants';
import ReportFilters, { ReportFiltersState } from './ReportFilters';
import ReportPDFTemplate from './ReportPDFTemplate';
import ReportEmailModal from './ReportEmailModal';
import { generateReportCSV, triggerReportPrint } from '../utils/reportExports';
import { createRoot } from 'react-dom/client';

interface ReportsModuleProps {
    inventory: AviationPart[];
    token: string;
    t: any;
}

type ReportType = 'TOTAL_INVENTORY' | 'BY_STATUS' | 'BY_LOCATION' | 'BY_PN';

interface ReportData {
    reportId: string;
    reportType: string;
    generatedAt: string;
    generatedBy: string;
    filtersApplied: Record<string, string>;
    data?: AviationPart[];
    groupedData?: Record<string, AviationPart[]>;
    summary: {
        total: number;
        byStatus: Record<string, number>;
        percentages: Record<string, number>;
    };
}

const REPORT_TYPES = [
    { id: 'TOTAL_INVENTORY', icon: ICONS.Database, labelES: 'Inventario Total', labelEN: 'Total Inventory' },
    { id: 'BY_STATUS', icon: ICONS.Layers, labelES: 'Por Tipo de Tarjeta', labelEN: 'By Card Type' },
    { id: 'BY_LOCATION', icon: ICONS.MapPin, labelES: 'Por Ubicación', labelEN: 'By Location' },
    { id: 'BY_PN', icon: ICONS.Search, labelES: 'Por Part Number', labelEN: 'By Part Number' },
];

const ReportsModule: React.FC<ReportsModuleProps> = ({ inventory, token, t }) => {
    const [selectedReport, setSelectedReport] = useState<ReportType>('TOTAL_INVENTORY');
    const [filters, setFilters] = useState<ReportFiltersState>({
        locations: [],
        statuses: [],
        dateFrom: '',
        dateTo: '',
        category: '',
        pnSearch: ''
    });
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Available filter options derived from inventory
    const availableLocations = useMemo(() => {
        const locs = new Set(inventory.map(p => p.location).filter(Boolean));
        return Array.from(locs).sort();
    }, [inventory]);

    const getEndpointUrl = useCallback((reportType: ReportType, filters: ReportFiltersState) => {
        const params = new URLSearchParams();

        if (filters.locations.length > 0) {
            params.set('location', filters.locations.join(','));
        }
        if (filters.statuses.length > 0) {
            params.set('status', filters.statuses.join(','));
        }
        if (filters.dateFrom) {
            params.set('date_from', filters.dateFrom);
        }
        if (filters.dateTo) {
            params.set('date_to', filters.dateTo);
        }
        if (filters.category) {
            params.set('category', filters.category);
        }

        const queryString = params.toString() ? `?${params.toString()}` : '';

        switch (reportType) {
            case 'TOTAL_INVENTORY':
                return `/api/reports/inventory${queryString}`;
            case 'BY_STATUS':
                return `/api/reports/by-status${queryString}`;
            case 'BY_LOCATION':
                return `/api/reports/by-location${queryString}`;
            case 'BY_PN':
                if (!filters.pnSearch) return null;
                return `/api/reports/by-pn/${encodeURIComponent(filters.pnSearch)}${queryString}`;
            default:
                return null;
        }
    }, []);

    const generateReport = useCallback(async () => {
        if (selectedReport === 'BY_PN' && !filters.pnSearch) {
            setError(t.reports_pn_required || 'Ingrese un Part Number para generar este reporte');
            return;
        }

        setLoading(true);
        setError('');

        const url = getEndpointUrl(selectedReport, filters);
        if (!url) {
            setError('URL de reporte inválida');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Error generando reporte');
            }

            const data = await response.json();
            setReportData(data);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedReport, filters, token, getEndpointUrl, t]);

    const handleRemoteExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
        if (!reportData) return;
        setExporting(true);
        try {
            const response = await fetch('/api/reports/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reportData: reportData,
                    format: format
                })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportData.reportId}.${format === 'EXCEL' ? 'xlsx' : format === 'CSV' ? 'csv' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setToast({ type: 'success', message: `${format} descargado exitosamente` });
        } catch (err) {
            console.error(err);
            setToast({ type: 'error', message: 'Error descargando archivo' });
        } finally {
            setExporting(false);
        }
    };

    const handleEmailSuccess = (message: string) => {
        setToast({ type: 'success', message });
        setTimeout(() => setToast(null), 5000);
    };

    const handleEmailError = (message: string) => {
        setToast({ type: 'error', message });
        setTimeout(() => setToast(null), 5000);
    };

    // Get data array for preview table
    const previewData = useMemo(() => {
        if (!reportData) return [];

        if (reportData.data) {
            return reportData.data;
        }

        if (reportData.groupedData) {
            // Flatten grouped data for preview
            return Object.values(reportData.groupedData).flat();
        }

        return [];
    }, [reportData]);

    const getTagBadge = (tagColor: TagColor) => {
        const styles: Record<TagColor, string> = {
            [TagColor.YELLOW]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            [TagColor.GREEN]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            [TagColor.WHITE]: 'bg-slate-100 text-slate-800 border-slate-300',
            [TagColor.RED]: 'bg-rose-100 text-rose-800 border-rose-300',
        };
        const labels: Record<TagColor, string> = {
            [TagColor.YELLOW]: 'SERVICEABLE',
            [TagColor.GREEN]: 'REPAIRABLE',
            [TagColor.WHITE]: 'REMOVED',
            [TagColor.RED]: 'REJECTED',
        };
        return (
            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${styles[tagColor]}`}>
                {labels[tagColor]}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Report Type Selector */}
            <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 shadow-sm">
                <h2 className="text-xs font-black text-brand-text-secondary uppercase tracking-widest mb-4">
                    {t.report_type || 'Tipo de Reporte'}
                </h2>
                <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
                    {REPORT_TYPES.map(type => {
                        const Icon = type.icon;
                        const isActive = selectedReport === type.id;
                        const label = t.language === 'EN' ? type.labelEN : type.labelES;
                        return (
                            <button
                                key={type.id}
                                onClick={() => {
                                    setSelectedReport(type.id as ReportType);
                                    setReportData(null);
                                }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isActive
                                    ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                    : 'bg-brand-bg border-brand-border text-brand-text-secondary hover:border-slate-400 hover:text-brand-text'
                                    }`}
                            >
                                <Icon size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wide text-center">
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sticky Filters Header for Tablet/Mobile */}
            <div className="sticky top-0 z-30 bg-brand-bg/95 backdrop-blur-sm pt-2 pb-4 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mx-0">
                <ReportFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableLocations={availableLocations}
                    showPnSearch={selectedReport === 'BY_PN'}
                    t={t}
                />
            </div>

            {/* Generate Button */}
            <div className="flex gap-4">
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-primary/20 hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <>
                            <ICONS.Refresh size={18} className="animate-spin" />
                            {t.generating || 'Generando...'}
                        </>
                    ) : (
                        <>
                            <ICONS.Spreadsheet size={18} />
                            {t.generate_report || 'Generar Reporte'}
                        </>
                    )}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <ICONS.AlertTriangle size={20} className="text-rose-400" />
                    <p className="text-rose-400 text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Report Results */}
            {reportData && (
                <div className="space-y-6">
                    {/* Report Metadata */}
                    <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
                                    <ICONS.ShieldCheck size={24} className="text-brand-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-widest">
                                        {t.report_id || 'ID de Reporte'}
                                    </p>
                                    <p className="text-lg font-black text-brand-text font-mono">{reportData.reportId}</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:items-end gap-1">
                                <p className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-widest">
                                    {t.generated_at || 'Generado'}
                                </p>
                                <p className="text-sm font-bold text-brand-text">
                                    {new Date(reportData.generatedAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-brand-text-secondary">
                                    {t.by || 'Por'}: <span className="text-brand-primary font-bold">{reportData.generatedBy}</span>
                                </p>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 tablet:grid-cols-5 gap-3 mt-6 pt-6 border-t border-brand-border">
                            <div className="bg-brand-bg rounded-xl p-3 text-center border border-brand-border">
                                <p className="text-2xl font-black text-brand-text">{reportData.summary.total}</p>
                                <p className="text-[9px] font-bold text-brand-text-secondary uppercase">Total Items</p>
                            </div>
                            {Object.entries(reportData.summary.byStatus).map(([status, count]) => (
                                <div key={status} className="bg-brand-bg rounded-xl p-3 text-center border border-brand-border">
                                    <p className="text-xl font-black text-brand-text">{count}</p>
                                    <p className="text-[9px] font-bold text-brand-text-secondary uppercase">{status}</p>
                                    {reportData.summary.percentages[status] !== undefined && (
                                        <p className="text-[8px] font-mono text-brand-primary font-bold">
                                            {reportData.summary.percentages[status]}%
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex flex-col tablet:flex-row gap-4">
                        <button
                            onClick={() => handleRemoteExport('PDF')}
                            disabled={exporting}
                            className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 hover:border-brand-primary/30 transition-colors shadow-sm"
                        >
                            {exporting ? <ICONS.Refresh size={16} className="animate-spin" /> : <ICONS.Printer size={16} />}
                            {t.export_pdf || 'Exportar PDF Auditoría'}
                        </button>
                        <button
                            onClick={() => handleRemoteExport('EXCEL')}
                            disabled={exporting}
                            className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 hover:border-brand-primary/30 transition-colors shadow-sm"
                        >
                            {exporting ? <ICONS.Refresh size={16} className="animate-spin" /> : <ICONS.Download size={16} />}
                            {t.export_csv || 'Exportar Excel'}
                        </button>
                        <button
                            onClick={() => setShowEmailModal(true)}
                            className="flex-1 bg-brand-primary text-white py-3 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 transition-all"
                        >
                            <ICONS.Mail size={16} />
                            {t.send_email_report || 'Enviar por Email'}
                        </button>
                    </div>

                    {/* Data Preview Table (Responsive: Mobile < 800px | Tablet 800-1100px | Desktop > 1100px) */}
                    <div>
                        <div className="px-2 pb-2 md:px-0 md:pb-0">
                            <h3 className="text-xs font-black text-brand-text-secondary uppercase tracking-widest mb-4">
                                {t.data_preview || 'Vista Previa de Datos'} ({previewData.length} {t.items || 'registros'})
                            </h3>
                        </div>

                        {/* --- DESKTOP VIEW (> 1100px) --- */}
                        <div className="hidden laptop:block overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-brand-bg sticky top-0 border-b border-brand-border">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Status</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">P/N</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">S/N</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Part Name</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Location</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">TAT/T.T</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">TSO</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {previewData.slice(0, 50).map((item: any) => (
                                            <tr key={item.id} className="hover:bg-brand-primary/5 transition-all">
                                                <td className="px-4 py-3">{getTagBadge(item.tagColor)}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-brand-primary">{item.pn}</td>
                                                <td className="px-4 py-3 font-mono text-brand-text-secondary">{item.sn}</td>
                                                <td className="px-4 py-3 text-brand-text max-w-[200px] truncate font-bold">{item.partName}</td>
                                                <td className="px-4 py-3 text-brand-text-secondary font-medium">{item.location}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-brand-text-secondary">{item.ttTat || '—'}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-brand-text-secondary">{item.tso || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-brand-text-secondary">{item.registrationDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- TABLET COMPACT VIEW (800px - 1100px) --- */}
                        <div className="hidden tablet:block laptop:hidden overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-brand-bg sticky top-0 border-b border-brand-border">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Component</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Location</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {previewData.slice(0, 50).map((item: any) => (
                                            <tr key={item.id} className="hover:bg-brand-primary/5 transition-all">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-brand-text text-xs">{item.partName}</div>
                                                    <div className="font-mono text-[10px] text-brand-primary font-bold">{item.pn}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-brand-bg border border-brand-border px-2 py-1 rounded text-[10px] font-bold text-brand-text-secondary">
                                                        {item.location}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {getTagBadge(item.tagColor)}
                                                        <button className="text-brand-primary text-[10px] font-bold hover:underline uppercase">
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                        {/* --- MOBILE VIEW (CARDS) (< 800px) --- */}
                        <div className="tablet:hidden grid gap-4 grid-cols-1">
                            {previewData.slice(0, 50).map((item: any) => (
                                <div key={item.id} className="relative bg-white text-brand-text rounded-xl p-4 shadow-sm border border-brand-border overflow-hidden ring-1 ring-black/5">
                                    {/* Status Strip */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.tagColor === 'YELLOW' ? 'bg-yellow-500' :
                                        item.tagColor === 'GREEN' ? 'bg-emerald-500' :
                                            item.tagColor === 'RED' ? 'bg-rose-500' : 'bg-slate-300'
                                        }`} />

                                    <div className="pl-3 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-sm text-brand-text uppercase leading-tight">{item.partName || 'Unknown Component'}</h3>
                                                <p className="text-[10px] text-brand-text-secondary font-bold uppercase tracking-wider mt-1">{item.brand || '---'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded">{item.pn}</p>
                                                <p className="text-[9px] font-mono text-brand-text-secondary mt-1">{item.sn}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-brand-border/50">
                                            <div className="bg-brand-bg p-2 rounded border border-brand-border">
                                                <span className="block text-[9px] font-bold text-brand-text-secondary uppercase">Location</span>
                                                <span className="font-mono font-bold text-brand-text">{item.location || '---'}</span>
                                            </div>
                                            <div className="bg-brand-bg p-2 rounded border border-brand-border flex items-center justify-center">
                                                {getTagBadge(item.tagColor)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {previewData.length > 50 && (
                                <div className="text-center py-4">
                                    <p className="text-xs text-brand-text-secondary font-bold">
                                        {t.showing_first_50 || 'Mostrando primeros 50 registros...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4 ${toast.type === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <ICONS.Yellow size={20} /> : <ICONS.AlertTriangle size={20} />}
                    <span className="font-bold text-sm">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
                        <ICONS.X size={16} />
                    </button>
                </div>
            )}

            {/* Email Modal */}
            <ReportEmailModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                reportData={reportData}
                token={token}
                t={t}
                onSuccess={handleEmailSuccess}
                onError={handleEmailError}
            />
        </div>
    );
};

export default ReportsModule;
