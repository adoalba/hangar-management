import React, { useMemo } from 'react';
import { AviationPart, TagColor } from '../types';

interface StockIndicatorsProps {
    inventory: AviationPart[];
    filteredInventory: AviationPart[];
    t: any;
}

export const StockIndicators: React.FC<StockIndicatorsProps> = ({ inventory, filteredInventory, t }) => {

    const stats = useMemo(() => {
        // 1. Total Count (Filtered context)
        const totalItems = filteredInventory.length;

        // 2. Airworthiness Status Counts (Card Colors)
        const statusCounts = {
            [TagColor.YELLOW]: 0,
            [TagColor.GREEN]: 0,
            [TagColor.WHITE]: 0,
            [TagColor.RED]: 0
        };

        // 3. Location Breakdown (Top 3 + Others)
        const locationCounts: Record<string, number> = {};

        // 4. Part Type Breakdown (Derived from Part Name grouping)
        const typeCounts: Record<string, number> = {};

        filteredInventory.forEach(part => {
            // Status
            if (statusCounts[part.tagColor] !== undefined) {
                statusCounts[part.tagColor]++;
            }

            // Location
            const loc = part.location || 'Unknown';
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;

            // Type (Simple normalization)
            const type = (part.partName || 'Unknown').trim().toUpperCase();
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return { totalItems, statusCounts, locationCounts, typeCounts };
    }, [filteredInventory]);

    // Helper for color badge
    // ACCESSIBILITY: High Contrast / Low Ink
    const getBadgeColor = (color: TagColor) => {
        switch (color) {
            case TagColor.YELLOW: return 'bg-white text-yellow-900 border-yellow-600 border-2';
            case TagColor.GREEN: return 'bg-white text-emerald-900 border-emerald-600 border-2';
            case TagColor.WHITE: return 'bg-white text-slate-900 border-slate-600 border-2';
            case TagColor.RED: return 'bg-white text-rose-900 border-rose-600 border-2';
            default: return 'bg-white text-gray-900 border-gray-600 border';
        }
    };

    const getStatusLabel = (color: TagColor) => {
        switch (color) {
            case TagColor.YELLOW: return "SERVICEABLE MATERIAL";
            case TagColor.GREEN: return "REPAIRABLE MATERIAL";
            case TagColor.WHITE: return "REMOVED - NO DEFECT";
            case TagColor.RED: return "REJECTED MATERIAL";
            default: return color;
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

            {/* KPI 1: Total Stock Volume */}
            <div className="bg-brand-surface p-4 rounded-lg border border-slate-700 shadow-sm flex flex-col justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Operational Volume</h2>
                <div className="flex items-baseline mt-2">
                    <span className="text-4xl font-black text-white tracking-tight">{stats.totalItems}</span>
                    <span className="ml-2 text-sm font-semibold text-brand-muted uppercase">Units Listed</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-[10px] text-slate-100 font-mono">
                        FILTER MATCH / SYSTEM TOTAL
                    </div>
                </div>
            </div>

            {/* KPI 2: Airworthiness Status (Compliance) */}
            <div className="col-span-1 md:col-span-2 bg-brand-surface p-4 rounded-lg border border-slate-700 shadow-sm">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Airworthiness Status Compliance</h2>
                <div className="grid grid-cols-4 gap-2">
                    {Object.values(TagColor).map((color) => (
                        <div key={color} className={`flex flex-col items-center justify-center p-2 rounded border ${getBadgeColor(color)}`}>
                            <span className="text-xl font-black">{stats.statusCounts[color]}</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider mt-1">{getStatusLabel(color)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* KPI 3: Top Locations / Logistics */}
            <div className="bg-brand-surface p-4 rounded-lg border border-slate-700 shadow-sm">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Logistics Distribution</h2>
                <div className="space-y-2">
                    {Object.entries(stats.locationCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([loc, count], idx) => (
                            <div key={loc} className="flex justify-between items-center text-sm">
                                <div className="flex items-center">
                                    <span className="w-4 text-[10px] font-mono text-slate-100 mr-2">{idx + 1}.</span>
                                    <span className="font-semibold text-slate-300 truncate max-w-[100px]" title={loc}>{loc}</span>
                                </div>
                                <span className="font-mono font-bold text-brand-primary">{count}</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};
