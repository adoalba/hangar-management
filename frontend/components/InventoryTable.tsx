import React, { useState, useMemo } from 'react';
import { AviationPart, TagColor, User, UserRole } from '../types';
import { ICONS } from '../constants';
import PartDetailModal from './PartDetailModal';
import TraceabilityModal from './TraceabilityModal';
import EmailModal from './EmailModal';
import { StockIndicators } from './StockIndicators';

interface InventoryTableProps {
  inventory: AviationPart[];
  setInventory: (inv: AviationPart[]) => void;
  onEdit: (part: AviationPart) => void;
  onPrint: (part: AviationPart) => void;
  t: any;
  user: User;
  token: string;
  addToast: (msg: string, type?: 'success' | 'error') => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ inventory, setInventory, onEdit, onPrint, t, user, token, addToast }) => {
  // --- 1. SEARCH & FILTER STATE ---
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<TagColor | 'ALL'>('ALL');
  const [filterLoc, setFilterLoc] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const [selectedPartView, setSelectedPartView] = useState<AviationPart | null>(null);
  const [tracingPart, setTracingPart] = useState<AviationPart | null>(null);
  const [emailingPart, setEmailingPart] = useState<AviationPart | null>(null);

  // --- 2. DERIVED DATA LISTS ---
  const locations = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return Array.from(new Set(inventory.filter(item => item?.location).map(i => i.location))).sort();
  }, [inventory]);

  const partTypes = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    // Simple deduplication of Part Names as "Types"
    return Array.from(new Set(inventory.filter(item => item?.partName).map(i => (i.partName || '').trim().toUpperCase()))).sort();
  }, [inventory]);

  // --- 3. FILTER LOGIC (GRANULAR SEARCH ENGINE) ---
  const filtered = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    const lowercasedSearch = (search || "").toLowerCase();

    return inventory.filter(item => {
      if (!item || typeof item !== 'object') return false;

      // Primary Search: P/N, S/N, Name
      const matchesSearch =
        (item.partName || '').toLowerCase().includes(lowercasedSearch) ||
        (item.pn || '').toLowerCase().includes(lowercasedSearch) ||
        (item.sn || '').toLowerCase().includes(lowercasedSearch);

      // Filters
      const matchesTag = filterTag === 'ALL' || item.tagColor === filterTag;
      const matchesLoc = filterLoc === 'ALL' || item.location === filterLoc;
      const matchesType = filterType === 'ALL' || (item.partName || '').trim().toUpperCase() === filterType;

      return matchesSearch && matchesTag && matchesLoc && matchesType;
    });
  }, [inventory, search, filterTag, filterLoc, filterType]);

  // --- 4. ACTIONS ---
  const handlePrint = (part: AviationPart) => onPrint(part);

  const handleDelete = (partToDelete: AviationPart) => {
    if (confirm(t.confirm_delete_part)) {
      const updated = inventory.filter(p => p.id !== partToDelete.id);
      setInventory(updated);
      addToast(t.language === 'EN' ? 'Component removed' : 'Componente eliminado', 'success');
    }
  };

  const getTagStyle = (tag?: TagColor | null) => {
    switch (tag) {
      case TagColor.YELLOW: return 'bg-yellow-500 text-yellow-950';
      case TagColor.GREEN: return 'bg-emerald-500 text-emerald-950';
      case TagColor.WHITE: return 'bg-slate-100 text-slate-900';
      case TagColor.RED: return 'bg-rose-500 text-rose-950';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  // --- 5. RENDER ---
  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">

      {/* SECTION A: STOCK INDICATORS (ZERO GRAPHICS) */}
      <StockIndicators inventory={inventory} filteredInventory={filtered} t={t} />

      {/* SECTION B: GRANULAR SEARCH ENGINE */}
      <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-6 shadow-xl">

        {/* Row 1: Primary Search & Part Type */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={18} />
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-indigo-500 outline-none font-bold text-sm tracking-wide"
              placeholder="SEARCH P/N, S/N, COMPONENT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-64">
            <ICONS.Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-8 text-white text-xs font-bold uppercase outline-none appearance-none cursor-pointer hover:border-indigo-500/50"
            >
              <option value="ALL">ALL TYPES</option>
              {partTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><ICONS.Filter size={12} /></div>
          </div>
        </div>

        {/* Row 2: Location & Card Color Matrix */}
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center pt-2 border-t border-slate-800/50">
          {/* Location Filter */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 w-full xl:w-auto">
            <ICONS.MapPin size={16} className="text-indigo-400 ml-3 shrink-0" />
            <div className="relative w-full">
              <select
                value={filterLoc}
                onChange={e => setFilterLoc(e.target.value)}
                className="w-full bg-transparent border-none text-[10px] font-black text-slate-300 uppercase outline-none cursor-pointer hover:text-white pr-8 py-1 appearance-none"
              >
                <option value="ALL" className="bg-slate-900">{t.all_locations}</option>
                {locations.map(loc => (
                  <option key={loc} value={loc} className="bg-slate-900">
                    {String(loc || 'N/A').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card Status Filters (Badges) */}
          <div className="flex flex-wrap gap-2">
            {(['ALL', ...Object.values(TagColor)] as const).map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filterTag === tag ? (tag === 'ALL' ? 'bg-indigo-600 border-indigo-500 text-white' : `${getTagStyle(tag)} border-transparent ring-2 ring-offset-2 ring-offset-slate-900 ring-white/10`) : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
              >
                {tag === 'ALL' ? 'ALL STOCK' : tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION C: HIGH DENSITY INVENTORY GRID */}
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40 shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-24">Tag</th>
                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Component</th>
                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Identification</th>

                {/* DYNAMIC COLUMNS BASED ON FILTER */}
                {filterTag === TagColor.YELLOW && <th className="p-4 text-[9px] font-black text-yellow-600 uppercase tracking-widest">Expiration / TAT</th>}
                {filterTag === TagColor.RED && <th className="p-4 text-[9px] font-black text-rose-600 uppercase tracking-widest">Rejection Reason</th>}
                {filterTag === TagColor.GREEN && <th className="p-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Tech Report</th>}
                {filterTag === TagColor.WHITE && <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Removal / Storage</th>}

                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-indigo-500/5 transition-all group">
                  <td className="p-4">
                    <div className={`w-3 h-10 rounded-r-md ${getTagStyle(item.tagColor)}`} title={item.tagColor}></div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {item.photo ?
                        <img src={item.photo} className="w-10 h-10 rounded-lg object-cover border border-slate-700" alt="" />
                        : <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800"><ICONS.Inventory size={16} className="text-slate-600" /></div>
                      }
                      <div>
                        <div className="font-bold text-white text-xs">{item.partName || '---'}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{item.brand || '---'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-[10px] font-mono font-bold text-indigo-300">P/N: {item.pn || '---'}</div>
                    <div className="text-[10px] font-mono text-slate-500">S/N: {item.sn || '---'}</div>
                  </td>

                  {/* DYNAMIC DATA CELLS */}
                  {filterTag === TagColor.YELLOW && (
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-yellow-500">Exp: {item.shelfLife ? new Date(item.shelfLife).toLocaleDateString() : 'N/A'}</div>
                      <div className="text-[9px] text-slate-500">TAT: {item.ttTat || '-'}</div>
                    </td>
                  )}
                  {filterTag === TagColor.RED && (
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-rose-400 truncate max-w-[150px]" title={item.rejectionReason}>{item.rejectionReason || 'No Reason'}</div>
                      <div className="text-[9px] text-slate-500">{item.finalDisposition}</div>
                    </td>
                  )}
                  {filterTag === TagColor.GREEN && (
                    <td className="p-4">
                      <div className="text-[10px] text-slate-300 truncate max-w-[200px]" title={item.technicalReport}>{item.technicalReport || 'No Report'}</div>
                    </td>
                  )}
                  {filterTag === TagColor.WHITE && (
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-slate-300">{item.removalReason || '---'}</div>
                      <div className="text-[9px] text-slate-500">Pos: {item.position || '-'}</div>
                    </td>
                  )}

                  <td className="p-4">
                    <span className="text-[10px] font-black text-slate-300 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">{item.location || '---'}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => window.location.hash = `#/scan/${item.id}`} className="p-2 text-indigo-400 hover:text-white bg-indigo-900/50 border border-indigo-700/50 rounded-lg" title="Quick Scan"><ICONS.Scan size={14} /></button>
                      <button onClick={() => setSelectedPartView(item)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><ICONS.Eye size={14} /></button>
                      <button onClick={() => handlePrint(item)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><ICONS.Printer size={14} /></button>
                      {user.role !== UserRole.VIEWER && (
                        <>
                          <button onClick={() => setTracingPart(item)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><ICONS.Activity size={14} /></button>
                          <button onClick={() => setEmailingPart(item)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><ICONS.Mail size={14} /></button>
                          <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><ICONS.Edit size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase">No components found matching criteria</p>
            </div>
          )}
        </div>
      </div>

      {selectedPartView && <PartDetailModal part={selectedPartView} onClose={() => setSelectedPartView(null)} t={t} />}
      {tracingPart && <TraceabilityModal history={tracingPart.history || []} partName={tracingPart.partName} pn={tracingPart.pn} sn={tracingPart.sn} tagColor={tracingPart.tagColor} onClose={() => setTracingPart(null)} onEmail={() => { setTracingPart(null); setEmailingPart(tracingPart); }} t={t} />}
      {emailingPart && <EmailModal part={emailingPart} onClose={() => setEmailingPart(null)} token={token} addToast={addToast} t={t} />}
    </div>
  );
};

export default InventoryTable;