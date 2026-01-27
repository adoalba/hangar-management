import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ICONS } from '../constants';

interface ReportHistoryDashboardProps {
    token: string;
    t: any;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

interface ReportToken {
    token: string;
    reportId: string;
    reportType: string;
    recipientEmail: string;
    sentByUserName: string;
    createdAt: string;
    expiresAt: string;
    acknowledged: boolean;
    acknowledgedAt: string | null;
    acknowledgedByUserName: string | null;
    deviceFingerprint: string | null;
    reportData: any;
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACKNOWLEDGED';
type DateFilter = 'ALL' | '24H' | '7D' | '30D';
type TypeFilter = 'ALL' | 'TOTAL_INVENTORY' | 'BY_STATUS' | 'BY_LOCATION' | 'BY_PART_NUMBER';

const ReportHistoryDashboard: React.FC<ReportHistoryDashboardProps> = ({
    token,
    t,
    onSuccess,
    onError
}) => {
    const [reports, setReports] = useState<ReportToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
    const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
    const [selectedReport, setSelectedReport] = useState<ReportToken | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [resending, setResending] = useState<string | null>(null);

    // Fetch report tokens
    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/reports/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReports(data.tokens || []);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Check if report is critical (RED tag, pending > 24h)
    const isCritical = (report: ReportToken): boolean => {
        if (report.acknowledged) return false;
        const reportData = report.reportData || {};
        const byStatus = reportData.summary?.byStatus || {};
        const hasRedItems = byStatus.RED > 0;
        const createdAt = new Date(report.createdAt);
        const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        return hasRedItems && hoursAgo > 24;
    };

    // Check if re-send is available (pending > 48h)
    const canResend = (report: ReportToken): boolean => {
        if (report.acknowledged) return false;
        const createdAt = new Date(report.createdAt);
        const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursAgo > 48;
    };

    // Apply filters
    const filteredReports = useMemo(() => {
        let filtered = [...reports];

        // Status filter
        if (statusFilter === 'PENDING') {
            filtered = filtered.filter(r => !r.acknowledged);
        } else if (statusFilter === 'ACKNOWLEDGED') {
            filtered = filtered.filter(r => r.acknowledged);
        }

        // Type filter
        if (typeFilter !== 'ALL') {
            filtered = filtered.filter(r => r.reportType === typeFilter);
        }

        // Date filter
        const now = Date.now();
        if (dateFilter === '24H') {
            filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= 24 * 60 * 60 * 1000);
        } else if (dateFilter === '7D') {
            filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000);
        } else if (dateFilter === '30D') {
            filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= 30 * 24 * 60 * 60 * 1000);
        }

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return filtered;
    }, [reports, statusFilter, typeFilter, dateFilter]);

    // Re-send report
    const handleResend = async (report: ReportToken) => {
        setResending(report.token);
        try {
            const response = await fetch('/api/reports/send-with-approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipients: [report.recipientEmail],
                    reportData: report.reportData
                })
            });

            if (response.ok) {
                onSuccess(t.report_resent || 'Reporte reenviado exitosamente');
                fetchReports();
            } else {
                onError(t.resend_error || 'Error al reenviar el reporte');
            }
        } catch (error) {
            onError(t.connection_error || 'Error de conexión');
        } finally {
            setResending(null);
        }
    };

    // View receipt details
    const handleViewReceipt = (report: ReportToken) => {
        setSelectedReport(report);
        setShowReceiptModal(true);
    };

    // Get report type label
    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'TOTAL_INVENTORY': return t.report_total_inventory || 'Inventario Total';
            case 'BY_STATUS': return t.report_by_status || 'Por Tarjeta';
            case 'BY_LOCATION': return t.report_by_location || 'Por Ubicación';
            case 'BY_PART_NUMBER': return t.report_by_pn || 'Por P/N';
            default: return type;
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get time ago label
    const getTimeAgo = (dateString: string) => {
        const hours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
        if (hours < 1) return t.just_now || 'Ahora';
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                            <ICONS.Clock size={28} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">
                                {t.report_history || 'Historial de Reportes'}
                            </h2>
                            <p className="text-[10px] text-slate-100 uppercase tracking-widest">
                                {t.audit_trail_tracking || 'Seguimiento y Trazabilidad de Auditoría'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchReports}
                        className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        <ICONS.Refresh size={20} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-widest mb-4">
                    {t.filter_reports || 'Filtrar Reportes'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="text-[9px] text-slate-100 uppercase font-bold mb-2 block">
                            {t.status || 'Estado'}
                        </label>
                        <div className="flex gap-2">
                            {(['ALL', 'PENDING', 'ACKNOWLEDGED'] as StatusFilter[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all ${statusFilter === status
                                        ? status === 'PENDING'
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 border'
                                            : status === 'ACKNOWLEDGED'
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 border'
                                                : 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-white border border-slate-700'
                                        }`}
                                >
                                    {status === 'ALL' ? t.all || 'Todos' :
                                        status === 'PENDING' ? t.pending || 'Pendiente' :
                                            t.acknowledged || 'Aprobado'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="text-[9px] text-slate-100 uppercase font-bold mb-2 block">
                            {t.report_type || 'Tipo de Reporte'}
                        </label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="ALL">{t.all || 'Todos'}</option>
                            <option value="TOTAL_INVENTORY">{t.report_total_inventory || 'Inventario Total'}</option>
                            <option value="BY_STATUS">{t.report_by_status || 'Por Tarjeta'}</option>
                            <option value="BY_LOCATION">{t.report_by_location || 'Por Ubicación'}</option>
                            <option value="BY_PART_NUMBER">{t.report_by_pn || 'Por P/N'}</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                        <label className="text-[9px] text-slate-100 uppercase font-bold mb-2 block">
                            {t.date_range || 'Rango de Fecha'}
                        </label>
                        <div className="flex gap-2">
                            {(['ALL', '24H', '7D', '30D'] as DateFilter[]).map(date => (
                                <button
                                    key={date}
                                    onClick={() => setDateFilter(date)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all ${dateFilter === date
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-white border border-slate-700'
                                        }`}
                                >
                                    {date === 'ALL' ? t.all || 'Todo' : date}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-900 px-6 py-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                        {t.sent_reports || 'Reportes Enviados'} ({filteredReports.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <ICONS.Refresh size={32} className="text-white animate-spin" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ICONS.Database size={48} className="text-slate-300 mb-4" />
                        <p className="text-white font-bold">{t.no_reports || 'No hay reportes enviados'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase">Report ID</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase">{t.type || 'Tipo'}</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase">{t.recipient || 'Destinatario'}</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-600 uppercase">{t.sent_date || 'Enviado'}</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-600 uppercase">{t.status || 'Estado'}</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-600 uppercase">{t.actions || 'Acciones'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map(report => {
                                    const critical = isCritical(report);
                                    const canResendReport = canResend(report);

                                    return (
                                        <tr
                                            key={report.token}
                                            className={`hover:bg-slate-50 transition-colors ${critical ? 'border-l-4 border-l-rose-500 bg-rose-50/30' : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-bold text-indigo-600 text-xs">
                                                    {report.reportId}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-700 font-medium text-xs">
                                                    {getTypeLabel(report.reportType)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-600 text-xs truncate max-w-[180px] block">
                                                    {report.recipientEmail}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600 text-xs">
                                                        {formatDate(report.createdAt)}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-bold text-white">
                                                        {getTimeAgo(report.createdAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {report.acknowledged ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">
                                                        <ICONS.Yellow size={12} />
                                                        {t.acknowledged || 'Aprobado'}
                                                    </span>
                                                ) : critical ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase animate-pulse">
                                                        <ICONS.AlertTriangle size={12} />
                                                        {t.critical || 'Crítico'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase">
                                                        <ICONS.Clock size={12} />
                                                        {t.pending || 'Pendiente'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* View Receipt */}
                                                    {report.acknowledged && (
                                                        <button
                                                            onClick={() => handleViewReceipt(report)}
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                            title={t.view_receipt || 'Ver Recibo'}
                                                        >
                                                            <ICONS.Eye size={16} className="text-slate-600" />
                                                        </button>
                                                    )}

                                                    {/* Re-send */}
                                                    {canResendReport && (
                                                        <button
                                                            onClick={() => handleResend(report)}
                                                            disabled={resending === report.token}
                                                            className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
                                                            title={t.resend || 'Reenviar'}
                                                        >
                                                            {resending === report.token ? (
                                                                <ICONS.Refresh size={16} className="text-amber-600 animate-spin" />
                                                            ) : (
                                                                <ICONS.Send size={16} className="text-amber-600" />
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Download Master Copy */}
                                                    <button
                                                        onClick={() => {
                                                            // Trigger PDF print of original report
                                                            onSuccess(t.download_started || 'Descarga iniciada');
                                                        }}
                                                        className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                                                        title={t.download_copy || 'Descargar Copia'}
                                                    >
                                                        <ICONS.Download size={16} className="text-indigo-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {showReceiptModal && selectedReport && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-lg overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                                    <ICONS.ShieldCheck size={20} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase">
                                        {t.audit_receipt || 'Recibo de Auditoría'}
                                    </h3>
                                    <p className="text-[10px] text-white font-mono">{selectedReport.reportId}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="p-2 hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                <ICONS.X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[9px] text-slate-100 uppercase font-bold mb-1">
                                        {t.acknowledged_by || 'Aprobado Por'}
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedReport.acknowledgedByUserName || 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[9px] text-slate-100 uppercase font-bold mb-1">
                                        {t.timestamp || 'Marca de Tiempo'}
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedReport.acknowledgedAt ? formatDate(selectedReport.acknowledgedAt) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-3">
                                <p className="text-[9px] text-slate-100 uppercase font-bold mb-1">
                                    {t.recipient_email || 'Email Destinatario'}
                                </p>
                                <p className="text-indigo-400 font-mono text-sm">
                                    {selectedReport.recipientEmail}
                                </p>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-3">
                                <p className="text-[9px] text-slate-100 uppercase font-bold mb-1">
                                    {t.device_fingerprint || 'Huella Digital del Dispositivo'}
                                </p>
                                <p className="text-slate-300 font-mono text-[10px] break-all">
                                    {selectedReport.deviceFingerprint || 'N/A'}
                                </p>
                            </div>

                            <div className="bg-slate-800/50 rounded-xl p-3">
                                <p className="text-[9px] text-slate-100 uppercase font-bold mb-1">
                                    {t.report_type || 'Tipo de Reporte'}
                                </p>
                                <p className="text-white font-bold text-sm">
                                    {getTypeLabel(selectedReport.reportType)}
                                </p>
                            </div>

                            <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <ICONS.Yellow size={32} className="text-emerald-400 mx-auto mb-2" />
                                <p className="text-emerald-300 text-xs font-bold">
                                    {t.receipt_verified || 'Este registro está verificado y es de solo lectura'}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-800/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold text-xs uppercase transition-colors"
                            >
                                {t.close || 'Cerrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportHistoryDashboard;
