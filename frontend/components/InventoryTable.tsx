import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { AviationPart, TagColor, User, UserRole } from '../types';
import { ICONS } from '../constants';
import PartDetailModal from './PartDetailModal';
import PrintTemplate from './PrintTemplate';
import TraceabilityModal from './TraceabilityModal';
import EmailModal from './EmailModal';

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
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<TagColor | 'ALL'>('ALL');
  const [filterLoc, setFilterLoc] = useState('ALL');
  const [showExportToolbox, setShowExportToolbox] = useState(false);
  const [selectedPartView, setSelectedPartView] = useState<AviationPart | null>(null);
  const [tracingPart, setTracingPart] = useState<AviationPart | null>(null);
  const [emailingPart, setEmailingPart] = useState<AviationPart | null>(null);

  const locations = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return Array.from(new Set(inventory.filter(item => item?.location).map(i => i.location))).sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    if (!Array.isArray(inventory)) {
      return [];
    }
    const lowercasedSearch = (search || "").toLowerCase();

    return inventory.filter(item => {
      if (!item || typeof item !== 'object') return false;

      const matchesSearch =
        (item.partName || '').toLowerCase().includes(lowercasedSearch) ||
        (item.pn || '').toLowerCase().includes(lowercasedSearch) ||
        (item.sn || '').toLowerCase().includes(lowercasedSearch);

      const matchesTag = filterTag === 'ALL' || item.tagColor === filterTag;
      const matchesLoc = filterLoc === 'ALL' || item.location === filterLoc;

      return matchesSearch && matchesTag && matchesLoc;
    });
  }, [inventory, search, filterTag, filterLoc]);

  const handlePrint = (part: AviationPart) => {
    onPrint(part);
  };

  const handleDelete = (partToDelete: AviationPart) => {
    if (confirm(t.confirm_delete_part)) {
      const updated = inventory.filter(p => p.id !== partToDelete.id);
      setInventory(updated);
      addToast(t.language === 'EN' ? 'Component removed' : 'Componente eliminado', 'success');
    }
  };

  const exportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      addToast("No hay datos para exportar", "error");
      return;
    };
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(obj =>
      Object.values(obj).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStockSummaryExport = () => {
    const summary: Record<string, any> = {};

    (inventory || []).forEach(item => {
      if (!item) return;
      const key = `${item.partName || 'N/A'} (${item.pn || 'N/A'})`;
      if (!summary[key]) {
        summary[key] = {
          [t.language === 'EN' ? "PART NAME" : "NOMBRE COMPONENTE"]: item.partName || 'N/A',
          "P/N": item.pn || 'N/A',
          [t.yellow_tag]: 0,
          [t.green_tag]: 0,
          [t.white_tag]: 0,
          [t.red_tag]: 0,
          "TOTAL": 0
        };
      }
      const tagLabel = item.tagColor ? t[`${item.tagColor.toLowerCase()}_tag` as keyof typeof t] : null;
      if (tagLabel && summary[key].hasOwnProperty(tagLabel)) {
        summary[key][tagLabel]++;
      }
      summary[key]["TOTAL"]++;
    });
    exportCSV(Object.values(summary), `${t.language === 'EN' ? 'stock_summary' : 'resumen_stock'}_${new Date().toISOString().split('T')[0]}`);
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

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 rounded-[3rem] border border-slate-800 space-y-8 shadow-2xl">
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          <div className="relative w-full xl:w-[450px] group">
            <ICONS.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-700 font-bold text-sm"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-indigo-500 transition-all flex-1 min-w-[240px] md:flex-none">
              <ICONS.MapPin size={16} className="text-indigo-400 ml-3 shrink-0" />
              <div className="relative w-full">
                <select
                  value={filterLoc}
                  onChange={e => setFilterLoc(e.target.value)}
                  className="w-full bg-transparent border-none text-[10px] font-black text-slate-300 uppercase outline-none cursor-pointer hover:text-white pr-10 py-2 appearance-none"
                >
                  <option value="ALL" className="bg-slate-900 text-white font-bold">{t.all_locations}</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc} className="bg-slate-900 text-white font-bold">
                      {String(loc || 'N/A').toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><ICONS.Filter size={12} /></div>
              </div>
            </div>
            <button
              onClick={() => setShowExportToolbox(!showExportToolbox)}
              className={`px-8 py-4 rounded-2xl border flex items-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all shadow-lg ${showExportToolbox ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'}`}
            >
              <ICONS.Download size={18} /> {t.export_toolbox}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {(['ALL', ...Object.values(TagColor)] as const).map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all border shadow-sm ${filterTag === tag ? (tag === 'ALL' ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/20' : `${getTagStyle(tag)} border-transparent`) : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}
            >
              {tag === 'ALL' ? t.total_stock_stock : t[`${tag.toLowerCase()}_tag` as keyof typeof t]}
            </button>
          ))}
        </div>
      </div>

      {showExportToolbox && (
        <div className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-[3rem] animate-in slide-in-from-top-6 duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button onClick={() => exportCSV(filtered, `${t.language === 'EN' ? 'filtered_inventory' : 'inventario_filtrado'}_${new Date().toISOString().split('T')[0]}`)} className="p-8 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col items-center gap-4 hover:border-indigo-500 transition-all group shadow-xl">
            <ICONS.Layers className="text-indigo-400" size={32} />
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase text-slate-500 group-hover:text-slate-300 mb-1">{t.actual_view}</span>
              <span className="block text-xs font-black text-indigo-400">{filtered.length} items</span>
            </div>
          </button>
          <button onClick={handleStockSummaryExport} className="p-8 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col items-center gap-4 hover:border-white transition-all group shadow-xl">
            <ICONS.Layout className="text-slate-100" size={32} />
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase text-slate-500 group-hover:text-slate-300 mb-1">{t.stock_summary}</span>
              <span className="block text-xs font-black text-white">{t.language === 'EN' ? 'By Color Matrix' : 'Por Matriz de Color'}</span>
            </div>
          </button>
          <button onClick={() => exportCSV(inventory, `${t.language === 'EN' ? 'total_inventory' : 'inventario_total'}_${new Date().toISOString().split('T')[0]}`)} className="p-8 bg-indigo-600 rounded-[2rem] flex flex-col items-center gap-4 hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 col-span-1 md:col-span-2">
            <ICONS.Spreadsheet className="text-white" size={32} />
            <div className="text-center">
              <span className="block text-[10px] font-black uppercase text-white/70 mb-1">{t.export_all}</span>
              <span className="block text-xs font-black text-white">{t.language === 'EN' ? 'Download Full Database' : 'Descargar Base de Datos Completa'}</span>
            </div>
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[3rem] border border-slate-800 bg-slate-950/40 shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.language === 'EN' ? 'Tag' : 'Tarjeta'}</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.language === 'EN' ? 'Component' : 'Componente'}</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">P/N - S/N</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.language === 'EN' ? 'Location' : 'Ubicación'}</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t.language === 'EN' ? 'Actions' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-indigo-500/5 transition-all group">
                  <td className="p-6">
                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${getTagStyle(item.tagColor)}`}>
                      {(item.tagColor && t[`${item.tagColor.toLowerCase()}_tag` as keyof typeof t]?.split('-')[0]) || 'SIN TAG'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-900 rounded-[1.25rem] overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner group-hover:border-indigo-500/40 transition-all">
                        {item.photo ? <img src={item.photo} className="w-full h-full object-cover" alt={item.partName || ''} /> : <ICONS.Inventory size={24} className="text-slate-700" />}
                      </div>
                      <div>
                        <p className="font-black text-white text-base tracking-tight leading-tight">{item.partName || '---'}</p>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{item.brand || '---'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-indigo-400 text-xs font-black font-mono tracking-wider">{item.pn || '---'}</p>
                    <p className="text-slate-500 text-[11px] font-mono mt-1 font-bold">{item.sn || '---'}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">{item.location || '---'}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedPartView(item)} className="p-3 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm" title={t.view_part}><ICONS.Eye size={18} /></button>
                      <button onClick={() => handlePrint(item)} className="p-3 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm" title={t.save_print}><ICONS.Printer size={18} /></button>
                      {user.role !== UserRole.VIEWER && (
                        <>
                          <button onClick={() => setTracingPart(item)} className="p-3 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm" title={t.traceability || "Traceability"}><ICONS.Activity size={18} /></button>
                          <button onClick={() => setEmailingPart(item)} className="p-3 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm" title={t.send_email || "Email"}><ICONS.Mail size={18} /></button>
                          <button onClick={() => onEdit(item)} className="p-3 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm" title={t.edit_user}><ICONS.Edit size={18} /></button>
                          <button onClick={() => handleDelete(item)} className="p-3 text-slate-600 hover:text-rose-500 transition-all" title={t.delete_user}><ICONS.Trash size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-32 text-center flex flex-col items-center justify-center gap-6">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-inner text-slate-700">
                <ICONS.Search size={48} />
              </div>
              <div>
                <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">{t.no_results}</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">{t.language === 'EN' ? 'Try other search criteria or filters' : 'Intente con otros criterios de búsqueda o filtros'}</p>
              </div>
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