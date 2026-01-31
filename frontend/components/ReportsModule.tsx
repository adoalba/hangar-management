import React, { useState, useMemo } from 'react';
import { AviationPart, TagColor } from '../types';
import { ICONS } from '../constants';

interface ReportsModuleProps {
    inventory: AviationPart[];
    token: string;
    t: any;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ inventory, token, t }) => {
    // --- ESTADOS ---
    const [selectedReport, setSelectedReport] = useState<'INVENTORY' | 'LOCATION' | 'STATUS' | 'PN'>('INVENTORY');
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: ''
    });
    const [exporting, setExporting] = useState(false);

    // Toast simulation
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'loading', text: string } | null>(null);

    // Helper para status
    const getStatusLabel = (tagColor: string) => {
        if (tagColor === 'YELLOW') return 'SERVICEABLE';
        if (tagColor === 'GREEN') return 'REPAIRABLE';
        if (tagColor === 'RED') return 'UNSERVICEABLE';
        if (tagColor === 'WHITE') return 'REMOVED-OK';
        return tagColor;
    };

    // --- 1. LÓGICA DE FILTRADO (VISTA PREVIA) ---
    const previewData = useMemo(() => {
        if (!inventory) return [];

        return inventory.filter(item => {
            const statusLabel = getStatusLabel(item.tagColor);

            // A. Búsqueda Texto
            const term = filters.search.toLowerCase();
            let matchesSearch = true;

            if (term) {
                if (selectedReport === 'PN') matchesSearch = (item.pn || '').toLowerCase().includes(term);
                else if (selectedReport === 'LOCATION') matchesSearch = (item.location || '').toLowerCase().includes(term);
                else matchesSearch =
                    (item.pn || '').toLowerCase().includes(term) ||
                    (item.partName || '').toLowerCase().includes(term) ||
                    (item.location || '').toLowerCase().includes(term);
            }

            // B. Filtro Status
            const matchesStatus = !filters.status || statusLabel === filters.status;

            // C. Filtro Fechas
            let matchesDate = true;
            if (filters.startDate || filters.endDate) {
                const dateStr = item.registrationDate || new Date().toISOString();
                const itemDate = new Date(dateStr);
                if (filters.startDate && itemDate < new Date(filters.startDate)) matchesDate = false;
                if (filters.endDate) {
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59);
                    if (itemDate > end) matchesDate = false;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [inventory, selectedReport, filters]);

    // --- 2. PREPARACIÓN DE DATOS (DICCIONARIO UNIVERSAL) ---
    const prepareDataForBackend = () => {
        return previewData.map(item => {
            const statusLabel = getStatusLabel(item.tagColor);
            return {
                ...item,
                // MAPEO PARA PDF (Rellenar huecos del template)
                part_name: item.partName || 'N/A',        // El PDF espera 'part_name' or 'description'
                description: item.partName || 'N/A',
                desc: item.partName || 'N/A',

                brand_model: 'N/A',                       // Dato no disponible en inventario simple

                traceability: (item as any).traceability || 'N/A',

                condition: statusLabel || 'N/A',          // El PDF espera 'condition'
                cond: statusLabel || 'N/A',
                status: statusLabel || 'N/A',

                location: item.location || 'N/A',
                loc: item.location || 'N/A',
                bin_shelf: item.location || 'N/A',        // Reutilizamos location

                // Variantes extra por seguridad
                pn: item.pn,
                partNumber: item.pn,
                part_number: item.pn,

                qty: 1,
                quantity: 1,

                serial_number: item.sn,
                sn: item.sn
            };
        });
    };

    // --- 3. EXPORTACIÓN PDF / EMAIL ---
    const handleServerExport = async (format: 'PDF' | 'EMAIL') => {
        if (previewData.length === 0) {
            setToastMessage({ type: 'error', text: "No hay datos para procesar" });
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }
        setExporting(true);
        setToastMessage({ type: 'loading', text: `Procesando ${format}...` });

        try {
            const endpoint = format === 'EMAIL' ? '/api/reports/v2/email' : '/api/reports/v2/generate';
            const robustData = prepareDataForBackend();

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reportType: selectedReport,
                    filters: filters,
                    data: robustData, // Enviamos datos mapeados
                    format: format // Para que el backend sepa (si lo usa)
                })
            });

            if (!response.ok) throw new Error(await response.text());

            if (format === 'EMAIL') {
                const resJson = await response.json();
                setToastMessage({ type: 'success', text: resJson.message || "Correo enviado" });
            } else {
                // DESCARGA PDF
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `WCA_Report_${selectedReport}_${Date.now()}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                setToastMessage({ type: 'success', text: "PDF generado" });
            }
        } catch (err: any) {
            console.error(err);
            setToastMessage({ type: 'error', text: "Error: " + err.message });
        } finally {
            setExporting(false);
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    // --- 4. EXPORTACIÓN EXCEL LOCAL (CSV) ---
    const downloadExcel = () => {
        if (previewData.length === 0) {
            setToastMessage({ type: 'error', text: "Sin datos" });
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }

        try {
            // Generar CSV con BOM para que Excel abra bien los acentos
            const headers = ["Part Number", "Description", "Location", "Status", "Qty", "Traceability"];
            const rows = previewData.map(i => {
                const statusLabel = getStatusLabel(i.tagColor);
                return [
                    `"${i.pn || ''}"`,
                    `"${i.partName || ''}"`,
                    `"${i.location || ''}"`,
                    `"${statusLabel || ''}"`,
                    1, // Quantity hardcoded
                    `"${(i as any).traceability || ''}"`
                ];
            });

            const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `WCA_Export_${Date.now()}.csv`; // CSV abre en Excel
            document.body.appendChild(link);
            link.click();
            link.remove();
            setToastMessage({ type: 'success', text: "Excel descargado" });
        } catch (e) {
            console.error(e);
            setToastMessage({ type: 'error', text: "Error creando Excel" });
        } finally {
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    // --- RENDERIZADO (DISEÑO CLEAN UI - IMAGEN 4) ---
    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-800">
            {/* TOAST OVERLAY */}
            {toastMessage && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-xl font-bold text-white transition-all transform translate-y-0 opacity-100 ${toastMessage.type === 'success' ? 'bg-emerald-600' :
                        toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'
                    }`}>
                    {toastMessage.type === 'loading' && <ICONS.Refresh className="inline-block animate-spin mr-2" size={18} />}
                    {toastMessage.text}
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex justify-between items-end border-b pb-4 border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes WCA</h1>
                    <p className="text-sm text-gray-500">Gestión de inventario y exportaciones.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { id: 'INVENTORY', label: 'Inventario Total', icon: ICONS.Inventory }, // Adapted Box to Inventory
                    { id: 'LOCATION', label: 'Por Ubicación', icon: ICONS.MapPin },
                    { id: 'STATUS', label: 'Por Estado', icon: ICONS.Layers },
                    { id: 'PN', label: 'Por P/N', icon: ICONS.Search },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setSelectedReport(tab.id as any); setFilters({ search: '', status: '', startDate: '', endDate: '' }); }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedReport === tab.id
                                ? 'bg-white border-blue-500 text-blue-600 shadow-md ring-1 ring-blue-500'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon size={20} />
                        <span className="font-bold text-sm uppercase">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Barra de Filtros y Acciones */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col xl:flex-row gap-4 items-end">

                    {/* Buscador */}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Búsqueda</label>
                        <input
                            type="text"
                            placeholder="Buscar P/N..."
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    {/* Select Status */}
                    <div className="w-full md:w-40">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Tarjeta</label>
                        <select
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none text-sm bg-white"
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Todos</option>
                            <option value="SERVICEABLE">Serviceable</option>
                            <option value="REPAIRABLE">Repairable</option>
                            <option value="UNSERVICEABLE">Unserviceable</option>
                            <option value="REMOVED-OK">Removed OK</option>
                        </select>
                    </div>

                    {/* Fechas */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Desde</label>
                            <input
                                type="date"
                                className="h-10 px-3 border border-gray-300 rounded-lg outline-none text-sm"
                                value={filters.startDate}
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hasta</label>
                            <input
                                type="date"
                                className="h-10 px-3 border border-gray-300 rounded-lg outline-none text-sm"
                                value={filters.endDate}
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Botones (Restaurados Colores de Imagen 4) */}
                    <div className="flex gap-2 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0 border-gray-100">
                        <button
                            onClick={() => handleServerExport('PDF')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium text-sm transition-colors"
                        >
                            <ICONS.Printer size={16} /> PDF
                        </button>

                        <button
                            onClick={downloadExcel}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium text-sm transition-colors"
                        >
                            <ICONS.Spreadsheet size={16} /> Excel
                        </button>

                        <button
                            onClick={() => handleServerExport('EMAIL')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                        >
                            <ICONS.Mail size={16} /> Email
                        </button>
                    </div>
                </div>
            </div>

            {/* Vista Previa */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Vista Previa</h3>
                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">{previewData.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 border-b border-gray-100 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Part Number</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-center">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {previewData.length > 0 ? previewData.map((item, idx) => {
                                const statusLabel = getStatusLabel(item.tagColor);
                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-800">{item.pn}</td>
                                        <td className="p-4 text-gray-600">{item.partName}</td>
                                        <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">{item.location}</span></td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusLabel === 'SERVICEABLE' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    statusLabel === 'REPAIRABLE' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        statusLabel === 'UNSERVICEABLE' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            statusLabel === 'REMOVED-OK' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {statusLabel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold">1</td>
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin resultados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsModule;
