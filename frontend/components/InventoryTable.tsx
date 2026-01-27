import React, { useState, useMemo, lazy, Suspense } from 'react';
import { AviationPart, TagColor, User, UserRole } from '../types';
import { ICONS } from '../constants';
import { StockIndicators } from './StockIndicators';

// Lazy Load Modals to break Critical Chain
const PartDetailModal = lazy(() => import('./PartDetailModal'));
const TraceabilityModal = lazy(() => import('./TraceabilityModal'));
const EmailModal = lazy(() => import('./EmailModal'));

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
  const ConfirmationModal = lazy(() => import('./ConfirmationModal'));

  // ... (existing imports)

  const [partToDelete, setPartToDelete] = useState<AviationPart | null>(null);

  const handlePrint = (part: AviationPart) => onPrint(part);

  // Trigger Modal
  const requestDelete = (part: AviationPart) => {
    setPartToDelete(part);
  };

  // Actual Execution
  const confirmDelete = () => {
    if (partToDelete) {
      // In a real app, this would be an API call
      // fetch(`/api/inventory/${partToDelete.id}`, { method: 'DELETE' })...

      const updated = inventory.filter(p => p.id !== partToDelete.id);
      setInventory(updated);
      addToast(t.language === 'EN' ? 'Component removed successfully' : 'Componente eliminado exitosamente', 'success');
      setPartToDelete(null);
    }
  };

  const getTagStyle = (tag?: TagColor | null) => {
    switch (tag) {
      case TagColor.YELLOW: return 'bg-yellow-500 text-yellow-950';
      case TagColor.GREEN: return 'bg-emerald-500 text-emerald-950';
      case TagColor.WHITE: return 'bg-slate-100 text-white';
      case TagColor.RED: return 'bg-rose-500 text-rose-950';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  // --- 5. RENDER ---
  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">

      {/* SECTION A: STOCK INDICATORS (ZERO GRAPHICS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden">
        <StockIndicators inventory={inventory} filteredInventory={filtered} t={t} />
      </div>

      {/* SECTION B: GRANULAR SEARCH ENGINE */}
      <section className="bg-brand-dark/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
        <h2 className="sr-only">Search Filters</h2>

        {/* Row 1: Primary Search & Part Type */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-100 group-focus-within:text-brand-primary" size={18} />
            <input
              type="text"
              aria-label="Search Inventory"
              className="w-full bg-brand-darker border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-primary outline-none font-bold text-sm tracking-wide"
              placeholder="SEARCH P/N, S/N, COMPONENT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-64">
            <ICONS.Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-100" size={16} />
            <label htmlFor="filter-type" className="sr-only">Filter by Type</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-brand-darker border border-slate-800 rounded-xl py-3 pl-12 pr-8 text-white text-xs font-bold uppercase outline-none appearance-none cursor-pointer hover:border-brand-primary/50"
            >
              <option value="ALL">ALL TYPES</option>
              {partTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-100"><ICONS.Filter size={12} /></div>
          </div>
        </div>

        {/* Row 2: Location & Card Color Matrix */}
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center pt-2 border-t border-slate-800/50">
          {/* Location Filter */}
          <div className="flex items-center gap-3 bg-brand-darker p-2 rounded-xl border border-slate-800 w-full xl:w-auto">
            <ICONS.MapPin size={16} className="text-brand-primary ml-3 shrink-0" />
            <div className="relative w-full">
              <label htmlFor="filter-location" className="sr-only">Filter by Location</label>
              <select
                id="filter-location"
                value={filterLoc}
                onChange={e => setFilterLoc(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-black text-brand-muted uppercase outline-none cursor-pointer hover:text-white pr-8 py-1 appearance-none"
              >
                <option value="ALL" className="bg-brand-dark">{t.all_locations}</option>
                {locations.map(loc => (
                  <option key={loc} value={loc} className="bg-brand-dark">
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
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${filterTag === tag ? (tag === 'ALL' ? 'bg-brand-primary border-brand-primary text-white' : `${getTagStyle(tag)} border-transparent ring-2 ring-offset-2 ring-offset-slate-900 ring-white/10`) : 'bg-brand-darker border-slate-800 text-brand-muted hover:text-white'}`}
              >
                {tag === 'ALL' ? 'ALL STOCK' : tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION C: HIGH DENSITY INVENTORY GRID */}
      <section>
        <h2 className="sr-only">Inventory List</h2>
        {/* --- DESKTOP VIEW (TABLE) --- */}
        <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-800 bg-brand-darker/40 shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-brand-dark/40">
                  <th className="p-4 text-xs font-black text-white uppercase tracking-widest w-24">Tag</th>
                  <th className="p-4 text-xs font-black text-white uppercase tracking-widest">Component</th>
                  <th className="p-4 text-xs font-black text-white uppercase tracking-widest">Identification</th>

                  {/* DYNAMIC COLUMNS BASED ON FILTER */}
                  {filterTag === TagColor.YELLOW && <th className="p-4 text-xs font-black text-yellow-500 uppercase tracking-widest">Expiration / TAT</th>}
                  {filterTag === TagColor.RED && <th className="p-4 text-xs font-black text-rose-500 uppercase tracking-widest">Rejection Reason</th>}
                  {filterTag === TagColor.GREEN && <th className="p-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Tech Report</th>}
                  {filterTag === TagColor.WHITE && <th className="p-4 text-xs font-black text-brand-muted uppercase tracking-widest">Removal / Storage</th>}

                  <th className="p-4 text-xs font-black text-white uppercase tracking-widest">Location</th>
                  <th className="p-4 text-xs font-black text-white uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-brand-primary/5 transition-all group">
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
                          <div className="font-bold text-white text-sm">{item.partName || '---'}</div>
                          <div className="text-xs font-black text-brand-muted uppercase tracking-wider">{item.brand || '---'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-mono font-bold text-brand-primary">P/N: {item.pn || '---'}</div>
                      <div className="text-xs font-mono text-white">S/N: {item.sn || '---'}</div>
                    </td>

                    {/* DYNAMIC DATA CELLS */}
                    {filterTag === TagColor.YELLOW && (
                      <td className="p-4">
                        <div className="text-[10px] font-bold text-yellow-500">Exp: {item.shelfLife ? new Date(item.shelfLife).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-[9px] text-slate-100">TAT: {item.ttTat || '-'}</div>
                      </td>
                    )}
                    {/* ... other dynamic cells (Red, Green, White) same as before but ensure colors match ... */}
                    {filterTag === TagColor.RED && (
                      <td className="p-4">
                        <div className="text-[10px] font-bold text-rose-400 truncate max-w-[150px]" title={item.rejectionReason}>{item.rejectionReason || 'No Reason'}</div>
                        <div className="text-[9px] text-slate-100">{item.finalDisposition}</div>
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
                        <div className="text-[9px] text-slate-100">Pos: {item.position || '-'}</div>
                      </td>
                    )}

                    <td className="p-4">
                      <span className="text-xs font-black text-brand-muted bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">{item.location || '---'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.location.hash = `#/scan/${item.id}`} className="p-2 text-brand-primary hover:text-white bg-brand-primary/10 border border-brand-primary/20 rounded-lg" title="Quick Scan" aria-label="Quick Scan"><ICONS.Scan size={14} /></button>
                        <button onClick={() => setSelectedPartView(item)} className="p-2 text-brand-muted hover:text-white bg-brand-darker border border-slate-800 rounded-lg" aria-label="View Details"><ICONS.Eye size={14} /></button>
                        <button onClick={() => handlePrint(item)} className="p-2 text-brand-muted hover:text-white bg-brand-darker border border-slate-800 rounded-lg" aria-label="Print Label"><ICONS.Printer size={14} /></button>
                        {user.role !== UserRole.VIEWER && (
                          <>
                            <button onClick={() => setTracingPart(item)} className="p-2 text-brand-muted hover:text-white bg-brand-darker border border-slate-800 rounded-lg" aria-label="Traceability"><ICONS.Activity size={14} /></button>
                            <button onClick={() => setEmailingPart(item)} className="p-2 text-brand-muted hover:text-white bg-brand-darker border border-slate-800 rounded-lg" aria-label="Email Part"><ICONS.Mail size={14} /></button>
                            <button onClick={() => onEdit(item)} className="p-2 text-brand-muted hover:text-white bg-brand-darker border border-slate-800 rounded-lg" aria-label="Edit Part"><ICONS.Edit size={14} /></button>
                            <button onClick={() => requestDelete(item)} className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors" aria-label="Delete Part"><ICONS.Trash size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MOBILE VIEW (CARDS) --- */}
        <div className="md:hidden grid gap-4 grid-cols-1">
          {filtered.map(item => (
            <div key={item.id} className="relative bg-brand-surface text-white rounded-xl p-4 shadow-sm border border-slate-700 overflow-hidden">
              {/* Color Strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${getTagStyle(item.tagColor)} opacity-80`} />

              <div className="pl-4 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-white">{item.partName || 'Unknown Component'}</h3>
                    <p className="text-[10px] text-white font-bold uppercase tracking-wider">{item.brand || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-bold text-brand-primary">{item.pn}</p>
                    <p className="text-[9px] font-mono text-white">{item.sn}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Location</span>
                    <span className="font-mono font-bold text-white">{item.location || '---'}</span>
                  </div>
                  {item.tagColor === TagColor.YELLOW && (
                    <div className="bg-yellow-900/20 p-2 rounded border border-yellow-700/30">
                      <span className="block text-[9px] font-bold text-yellow-500 uppercase">Expires</span>
                      <span className="font-bold text-yellow-500">{item.shelfLife ? new Date(item.shelfLife).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer - Big Touch Targets */}
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-700/50">
                  <button onClick={() => window.location.hash = `#/scan/${item.id}`} className="flex items-center justify-center p-2 rounded-lg bg-brand-primary/10 text-brand-primary"><ICONS.Scan size={20} /></button>
                  <button onClick={() => setSelectedPartView(item)} className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"><ICONS.Eye size={20} /></button>
                  <button onClick={() => handlePrint(item)} className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"><ICONS.Printer size={20} /></button>
                  {user.role !== UserRole.VIEWER && (
                    <>
                      <button onClick={() => onEdit(item)} className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"><ICONS.Edit size={20} /></button>
                      <button onClick={() => requestDelete(item)} className="flex items-center justify-center p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-colors"><ICONS.Trash size={20} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>


        {
          filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-100 uppercase">No components found matching criteria</p>
            </div>
          )
        }

        {selectedPartView && <Suspense fallback={null}><PartDetailModal part={selectedPartView} onClose={() => setSelectedPartView(null)} t={t} /></Suspense>}
        {tracingPart && <Suspense fallback={null}><TraceabilityModal history={tracingPart.history || []} partName={tracingPart.partName} pn={tracingPart.pn} sn={tracingPart.sn} tagColor={tracingPart.tagColor} onClose={() => setTracingPart(null)} onEmail={() => { setTracingPart(null); setEmailingPart(tracingPart); }} t={t} /></Suspense>}
        {emailingPart && <Suspense fallback={null}><EmailModal part={emailingPart} onClose={() => setEmailingPart(null)} token={token} addToast={addToast} t={t} /></Suspense>}

        {/* Security Confirmation Modal */}
        {
          partToDelete && (
            <Suspense fallback={null}>
              <ConfirmationModal
                title={t.language === 'EN' ? 'Confirm Deletion' : 'Confirmar Eliminación'}
                message={t.language === 'EN'
                  ? `Are you sure you want to permanently delete component P/N: ${partToDelete.pn}? This action cannot be undone.`
                  : `¿Está seguro de que desea eliminar permanentemente el componente P/N: ${partToDelete.pn}? Esta acción no se puede deshacer.`}
                confirmLabel={t.language === 'EN' ? 'Delete Component' : 'Eliminar Componente'}
                cancelLabel={t.cancel || 'Cancel'}
                isDestructive={true}
                onConfirm={confirmDelete}
                onCancel={() => setPartToDelete(null)}
              />
            </Suspense>
          )
        }
      </section >
    </div >
  );
};

export default InventoryTable;