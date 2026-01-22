
import React, { useMemo, useState, useEffect } from 'react';
import { AviationPart, TagColor } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ICONS } from '../constants';

interface DashboardProps {
  inventory: AviationPart[];
  t: any;
}

interface LookupResult {
  partName: string;
  pn: string;
  total: number;
  breakdown: { [key in TagColor]?: number };
  error?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ inventory, t }) => {
  const [stats, setStats] = useState<any>(null);
  const [brandData, setBrandData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [lookupPn, setLookupPn] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const [locLookup, setLocLookup] = useState('');
  const [locResult, setLocResult] = useState<any>(null);
  const [isLocLoading, setIsLocLoading] = useState(false);

  const [typeLookup, setTypeLookup] = useState('');
  const [typeResult, setTypeResult] = useState<any>(null);
  const [isTypeLoading, setIsTypeLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('session_token');

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error("Fallo al obtener estadísticas optimizadas."); }
    };

    const fetchBrandStats = async () => {
      try {
        const res = await fetch('/api/stats/brands', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const formattedData = Object.entries(data).map(([name, count]) => ({ name, count }));
          setBrandData(formattedData);
        }
      } catch (e) { console.error("Fallo al obtener estadísticas de marcas."); }
    };

    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchBrandStats()]);
      setLoading(false);
    }

    loadAllData();
  }, []);

  const handleLookupSearch = async () => {
    if (!lookupPn.trim()) return;
    setIsLookupLoading(true);
    setLookupResult(null);
    const token = localStorage.getItem('session_token');
    try {
      const res = await fetch(`/api/stock-lookup?pn=${lookupPn.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLookupResult(data);
      } else {
        setLookupResult({ error: data.error || t.lookup_pn_not_found, pn: lookupPn } as LookupResult);
      }
    } catch (e) {
      setLookupResult({ error: "Error de conexión con el servidor.", pn: lookupPn } as LookupResult);
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleLocLookup = async () => {
    if (!locLookup.trim()) return;
    setIsLocLoading(true);
    setLocResult(null);
    const token = localStorage.getItem('session_token');
    try {
      const res = await fetch(`/api/stats/location-breakdown?loc=${encodeURIComponent(locLookup.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLocResult(data);
      else setLocResult({ error: data.error || t.loc_not_found });
    } catch (e) { setLocResult({ error: "Error de conexión." }); }
    finally { setIsLocLoading(false); }
  };

  const handleTypeLookup = async () => {
    if (!typeLookup.trim()) return;
    setIsTypeLoading(true);
    setTypeResult(null);
    const token = localStorage.getItem('session_token');
    try {
      const res = await fetch(`/api/stats/type-breakdown?name=${encodeURIComponent(typeLookup.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTypeResult(data);
      else setTypeResult({ error: data.error || t.type_not_found });
    } catch (e) { setTypeResult({ error: "Error de conexión." }); }
    finally { setIsTypeLoading(false); }
  };

  const tagStats = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t.card_yellow, count: stats.by_tag.YELLOW || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
      { name: t.card_green, count: stats.by_tag.GREEN || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
      { name: t.card_white, count: stats.by_tag.WHITE || 0, color: 'text-slate-100', bg: 'bg-slate-100/10' },
      { name: t.card_red, count: stats.by_tag.RED || 0, color: 'text-rose-500', bg: 'bg-rose-500/20' },
    ];
  }, [stats]);

  const locationData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_location).map(([name, count]) => ({ name: (name as string), count: (count as number) }));
  }, [stats]);

  const lookupTagCards = [
    { id: TagColor.YELLOW, label: t.yellow_tag, icon: ICONS.Yellow, color: 'text-yellow-400' },
    { id: TagColor.GREEN, label: t.green_tag, icon: ICONS.Green, color: 'text-emerald-400' },
    { id: TagColor.WHITE, label: t.white_tag, icon: ICONS.White, color: 'text-slate-300' },
    { id: TagColor.RED, label: t.red_tag, icon: ICONS.Red, color: 'text-rose-400' },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando con Servidor Central...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tagStats.map((stat, i) => (
          <div key={i} className={`${stat.bg} border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-xl`}>
            <p className={`text-sm font-black uppercase tracking-widest mb-2 ${stat.color}`}>{stat.name}</p>
            <p className="text-6xl font-black text-white">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
        <div className="mb-6">
          <h3 className="text-xl font-black text-white uppercase">{t.granular_lookup}</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.granular_lookup_desc}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            value={lookupPn}
            onChange={(e) => setLookupPn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookupSearch()}
            placeholder={t.granular_search_placeholder}
            className="flex-grow bg-slate-950 border border-slate-700 rounded-2xl py-4 px-6 text-white font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
          <button
            onClick={handleLookupSearch}
            disabled={isLookupLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-sm px-10 py-4 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            {isLookupLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <ICONS.Search size={18} />}
            <span>BUSCAR</span>
          </button>
        </div>

        <div>
          {isLookupLoading && (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-slate-500 uppercase animate-pulse">{t.finding_results}</p>
            </div>
          )}
          {lookupResult && !isLookupLoading && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-[2.5rem] p-8 animate-in fade-in duration-500">
              {lookupResult.error ? (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <ICONS.XCircle size={40} className="text-rose-500" />
                  <p className="text-lg font-bold text-rose-400">{lookupResult.error}</p>
                </div>
              ) : (
                <div>
                  <div className="text-center md:text-left md:flex md:items-center md:justify-between mb-8 pb-8 border-b border-slate-800">
                    <div>
                      <p className="text-2xl font-black text-white uppercase">{lookupResult.partName}</p>
                      <p className="font-mono text-sm text-indigo-400">P/N: {lookupResult.pn}</p>
                    </div>
                    <div className="mt-4 md:mt-0 bg-indigo-600/10 border border-indigo-500/20 px-8 py-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.lookup_total_stock}</p>
                      <p className="text-5xl font-black text-white">{lookupResult.total}</p>
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{t.lookup_in_stock}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {lookupTagCards.map(card => {
                      const Icon = card.icon;
                      const count = lookupResult.breakdown[card.id] || 0;
                      return (
                        <div key={card.id} className={`p-6 rounded-2xl text-center bg-slate-900 border border-slate-800 transition-all ${count > 0 ? 'opacity-100' : 'opacity-40'}`}>
                          <Icon size={24} className={`mx-auto mb-3 ${card.color}`} />
                          <p className="text-4xl font-black text-white">{count}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${card.color}`}>{card.label.split(' ')[1]}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Búsqueda por Ubicación */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
          <div className="mb-6">
            <h3 className="text-xl font-black text-white uppercase">{t.lookup_by_location}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.enter_location}</p>
          </div>
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={locLookup}
              onChange={(e) => setLocLookup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLocLookup()}
              placeholder={t.enter_location}
              className="flex-grow bg-slate-950 border border-slate-700 rounded-2xl py-3 px-6 text-white text-sm outline-none focus:border-indigo-500 transition-all"
            />
            <button onClick={handleLocLookup} disabled={isLocLoading} className="bg-indigo-600 p-4 rounded-2xl text-white disabled:opacity-50">
              {isLocLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <ICONS.Search size={18} />}
            </button>
          </div>
          {locResult && (
            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 animate-in fade-in zoom-in-95">
              {locResult.error ? (
                <p className="text-center text-xs font-bold text-rose-500 uppercase">{locResult.error}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <span className="text-indigo-400 font-mono text-xs uppercase">{locResult.location}</span>
                    <span className="text-2xl font-black text-white">{locResult.total} <small className="text-[10px] text-slate-500 uppercase">Total</small></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {lookupTagCards.map(card => {
                      const count = locResult.breakdown[card.id] || 0;
                      return (
                        <div key={card.id} className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-white/5">
                          <card.icon size={12} className={card.color} />
                          <span className="text-lg font-black text-white leading-none">{count}</span>
                          <span className={`${card.color} text-[8px] font-bold uppercase`}>{card.id}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Búsqueda por Tipo de Parte */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
          <div className="mb-6">
            <h3 className="text-xl font-black text-white uppercase">{t.lookup_by_type}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.enter_part_type}</p>
          </div>
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={typeLookup}
              onChange={(e) => setTypeLookup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTypeLookup()}
              placeholder={t.enter_part_type}
              className="flex-grow bg-slate-950 border border-slate-700 rounded-2xl py-3 px-6 text-white text-sm outline-none focus:border-indigo-500 transition-all"
            />
            <button onClick={handleTypeLookup} disabled={isTypeLoading} className="bg-emerald-600 p-4 rounded-2xl text-white disabled:opacity-50">
              {isTypeLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <ICONS.Search size={18} />}
            </button>
          </div>
          {typeResult && (
            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 animate-in fade-in zoom-in-95">
              {typeResult.error ? (
                <p className="text-center text-xs font-bold text-rose-500 uppercase">{typeResult.error}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <span className="text-emerald-400 font-mono text-xs uppercase">{typeResult.partName}</span>
                    <span className="text-2xl font-black text-white">{typeResult.total} <small className="text-[10px] text-slate-500 uppercase">Total</small></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {lookupTagCards.map(card => {
                      const count = typeResult.breakdown[card.id] || 0;
                      return (
                        <div key={card.id} className="flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-white/5">
                          <card.icon size={12} className={card.color} />
                          <span className="text-lg font-black text-white leading-none">{count}</span>
                          <span className={`${card.color} text-[8px] font-bold uppercase`}>{card.id}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase mb-6">{t.stats_by_location}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} width={100} />
                <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
          <h3 className="text-xl font-black text-white uppercase mb-6">{t.stats_by_brand}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} width={100} />
                <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
