import React from 'react';
import { TagColor } from '../types';
import { ICONS } from '../constants';

export interface ReportFiltersState {
    locations: string[];
    statuses: TagColor[];
    dateFrom: string;
    dateTo: string;
    category: string;
    pnSearch: string;
}

interface ReportFiltersProps {
    filters: ReportFiltersState;
    onFiltersChange: (filters: ReportFiltersState) => void;
    availableLocations: string[];
    showPnSearch?: boolean;
    t: any;
}

const STATUS_OPTIONS = [
    { value: TagColor.YELLOW, label: 'SERVICEABLE', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    { value: TagColor.GREEN, label: 'REPAIRABLE', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { value: TagColor.WHITE, label: 'REMOVED', color: 'bg-slate-100 border-slate-300 text-slate-800' },
    { value: TagColor.RED, label: 'REJECTED', color: 'bg-rose-100 border-rose-300 text-rose-800' },
];

const CATEGORY_OPTIONS = [
    { value: 'ROTABLES', labelES: 'Rotables', labelEN: 'Rotables' },
    { value: 'CONSUMIBLES', labelES: 'Consumibles', labelEN: 'Consumables' },
    { value: 'MOTORES', labelES: 'Motores', labelEN: 'Engines' },
    { value: 'AVIONICS', labelES: 'Aviónica', labelEN: 'Avionics' },
    { value: 'ESTRUCTURAL', labelES: 'Estructural', labelEN: 'Structural' },
];

const ReportFilters: React.FC<ReportFiltersProps> = ({
    filters,
    onFiltersChange,
    availableLocations,
    showPnSearch = false,
    t
}) => {

    const toggleStatus = (status: TagColor) => {
        const current = filters.statuses;
        const updated = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status];
        onFiltersChange({ ...filters, statuses: updated });
    };

    const toggleLocation = (location: string) => {
        const current = filters.locations;
        const updated = current.includes(location)
            ? current.filter(l => l !== location)
            : [...current, location];
        onFiltersChange({ ...filters, locations: updated });
    };

    const clearFilters = () => {
        onFiltersChange({
            locations: [],
            statuses: [],
            dateFrom: '',
            dateTo: '',
            category: '',
            pnSearch: ''
        });
    };

    const hasFilters = filters.locations.length > 0 ||
        filters.statuses.length > 0 ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.category ||
        filters.pnSearch;

    return (
        <div className="bg-brand-dark rounded-3xl border border-slate-800 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center">
                        <ICONS.Filter size={18} className="text-brand-primary" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                            {t.smart_filters || 'Filtros Inteligentes'}
                        </h2>
                        <p className="text-[10px] text-slate-600">
                            {t.cross_filtering || 'Filtrado cruzado de datos'}
                        </p>
                    </div>
                </div>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1"
                    >
                        <ICONS.X size={14} />
                        {t.clear || 'Limpiar'}
                    </button>
                )}
            </div>

            {/* P/N Search (conditional) */}
            {showPnSearch && (
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {t.search_pn || 'Buscar Part Number'}
                    </label>
                    <div className="relative">
                        <ICONS.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={filters.pnSearch}
                            onChange={(e) => onFiltersChange({ ...filters, pnSearch: e.target.value.toUpperCase() })}
                            placeholder={t.enter_pn || 'Ej: 1234-5678-00'}
                            className="w-full bg-brand-surface-dark border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 text-sm font-mono focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Status Filters */}
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {t.filter_status || 'Tipo de Tarjeta'}
                </label>
                <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(option => {
                        const isActive = filters.statuses.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => toggleStatus(option.value)}
                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${isActive
                                    ? option.color
                                    : 'bg-brand-surface-dark border-slate-700 text-slate-500 hover:border-slate-600'
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Location Filters */}
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {t.filter_location || 'Ubicación Física'}
                </label>
                {availableLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {availableLocations.map(loc => {
                            const isActive = filters.locations.includes(loc);
                            return (
                                <button
                                    key={loc}
                                    onClick={() => toggleLocation(loc)}
                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${isActive
                                        ? 'bg-brand-primary border-brand-primary text-white'
                                        : 'bg-brand-surface-dark border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    {loc}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic">{t.no_locations || 'No hay ubicaciones disponibles'}</p>
                )}
            </div>

            {/* Date Range & Category in a row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date From */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {t.date_from || 'Fecha Desde'}
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                        className="w-full bg-brand-surface-dark border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {t.date_to || 'Fecha Hasta'}
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                        className="w-full bg-brand-surface-dark border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                </div>

                {/* Category Dropdown */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {t.filter_category || 'Categoría'}
                    </label>
                    <select
                        value={filters.category}
                        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                        className="w-full bg-brand-surface-dark border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                    >
                        <option value="">{t.all_categories || 'Todas las categorías'}</option>
                        {CATEGORY_OPTIONS.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {t.language === 'EN' ? cat.labelEN : cat.labelES}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasFilters && (
                <div className="pt-4 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {t.active_filters || 'Filtros activos'}:
                        </span>
                        {filters.statuses.map(s => (
                            <span key={s} className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-brand-primary">
                                {s}
                            </span>
                        ))}
                        {filters.locations.map(l => (
                            <span key={l} className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-emerald-400">
                                {l}
                            </span>
                        ))}
                        {filters.dateFrom && (
                            <span className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-amber-400">
                                ≥ {filters.dateFrom}
                            </span>
                        )}
                        {filters.dateTo && (
                            <span className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-amber-400">
                                ≤ {filters.dateTo}
                            </span>
                        )}
                        {filters.category && (
                            <span className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-purple-400">
                                {filters.category}
                            </span>
                        )}
                        {filters.pnSearch && (
                            <span className="px-2 py-1 bg-brand-surface-dark rounded text-[9px] font-bold text-cyan-400">
                                P/N: {filters.pnSearch}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFilters;
