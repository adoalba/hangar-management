import React from 'react';
import { ICONS } from '../constants';

// Standardized Aviation Statuses
const AVIATION_STATUSES = ['SERVICEABLE', 'REPAIRABLE', 'UNSERVICEABLE', 'REMOVED NOT DEFECT', 'SCRAP'];

interface ReportFiltersProps {
    filters: any;
    onFiltersChange: (f: any) => void;
    availableLocations: string[]; // Dynamic List
    showPnSearch?: boolean;
    t: any;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, onFiltersChange, availableLocations, showPnSearch }) => {

    const toggleStatus = (status: string) => {
        const current = filters.statuses;
        const updated = current.includes(status) ? current.filter((s: string) => s !== status) : [...current, status];
        onFiltersChange({ ...filters, statuses: updated });
    };

    const toggleLocation = (location: string) => {
        const current = filters.locations;
        const updated = current.includes(location) ? current.filter((l: string) => l !== location) : [...current, location];
        onFiltersChange({ ...filters, locations: updated });
    };

    return (
        <div className="bg-[#151E32] rounded-3xl border border-slate-700 p-6 space-y-6 mb-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                        <ICONS.Filter size={20} />
                    </div>
                    <h3 className="font-bold text-sm text-white">FILTROS INTELIGENTES</h3>
                </div>
                <button
                    onClick={() => onFiltersChange({ locations: [], statuses: [], dateFrom: '', dateTo: '', category: '', pnSearch: '' })}
                    className="text-xs text-red-400 font-bold uppercase hover:text-red-300 transition-colors">
                    Limpiar
                </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={showPnSearch ? 'block' : 'opacity-50 pointer-events-none'}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">BUSCAR P/N</label>
                    <input
                        type="text"
                        value={filters.pnSearch}
                        onChange={e => onFiltersChange({ ...filters, pnSearch: e.target.value.toUpperCase() })}
                        className="w-full bg-[#1E293B] border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 font-mono"
                        placeholder={showPnSearch ? "Ej: 123-456" : "N/A"}
                        disabled={!showPnSearch}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">DESDE</label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                        className="w-full bg-[#1E293B] border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">HASTA</label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })}
                        className="w-full bg-[#1E293B] border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Statuses */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">CONDICIÓN</label>
                <div className="flex flex-wrap gap-2">
                    {AVIATION_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${filters.statuses.includes(status)
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-[#1E293B] border-slate-600 text-gray-400 hover:border-slate-500'
                                }`}>
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dynamic Locations */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
                    UBICACIÓN ({availableLocations.length})
                </label>
                {availableLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                        {availableLocations.map(loc => (
                            <button
                                key={loc}
                                onClick={() => toggleLocation(loc)}
                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${filters.locations.includes(loc)
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : 'bg-[#1E293B] border-slate-600 text-gray-400 hover:border-slate-500'
                                    }`}>
                                {loc}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 italic">No hay ubicaciones registradas en el inventario</p>
                )}
            </div>
        </div>
    );
};

export default ReportFilters;
