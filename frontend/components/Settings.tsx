
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

const Settings: React.FC<{ token: string; addToast: (msg: string, type?: 'success' | 'error') => void }> = ({ token, addToast }) => {
  const [config, setConfig] = useState<any>({
    method: 'SMTP',
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
  });

  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetch('/api/email-config', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(() => addToast("Error al cargar config de email", "error"));
  }, [token]);

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) addToast("Configuración guardada", "success");
      else addToast("Error al guardar configuración", "error");
    } catch (e) {
      addToast("Error de red al guardar", "error");
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/db-backup', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error en el servidor");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AERO_PRO_BACKUP_${new Date().getTime()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      addToast("Backup descargado", "success");
    } catch (e) {
      addToast("No se pudo generar el backup", "error");
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    addToast("Iniciando optimización...");
    try {
      const res = await fetch('/api/db-optimize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.status === 'optimized') {
        addToast("Base de datos optimizada", "success");
      } else {
        addToast(data.message || "Error en la optimización", "error");
      }
    } catch (e) {
      addToast("Error de red al optimizar", "error");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Infraestructura y Mantenimiento</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Terminal de Configuración Crítica</p>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 shadow-xl px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          Guardar Global
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* PANEL DE MANTENIMIENTO DE BASE DE DATOS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <ICONS.Database size={16} /> Mantenimiento DB
            </h3>

            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group"
            >
              <div className="text-left">
                <p className="text-xs font-black text-white uppercase">Respaldar Datos</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Descargar snapshot JSON</p>
              </div>
              <ICONS.Download className="text-slate-600 group-hover:text-indigo-400" size={20} />
            </button>

            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="w-full flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all group disabled:opacity-50"
            >
              <div className="text-left">
                <p className="text-xs font-black text-white uppercase">Optimizar Stock</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Compactar historial y liberar RAM</p>
              </div>
              {optimizing ? (
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ICONS.Refresh className="text-slate-600 group-hover:text-emerald-400" size={20} />
              )}
            </button>
          </div>
        </div>

        {/* PANEL DE CORREO */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Servidor de Despacho (SMTP)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Email Corporativo</label>
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-xs outline-none focus:border-indigo-500"
                      value={config.smtp_user}
                      onChange={e => setConfig({ ...config, smtp_user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Password de Aplicación</label>
                    <input
                      type="password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-emerald-500"
                      value={config.smtp_pass}
                      onChange={e => setConfig({ ...config, smtp_pass: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Terminal de Pruebas</h3>
                <div className="h-32 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1 custom-scrollbar">
                  {logs.map((log, i) => <div key={i}>{'> '} {log}</div>)}
                  {logs.length === 0 && <div className="text-slate-800 tracking-tighter uppercase font-black">Esperando diagnóstico...</div>}
                </div>
                <button
                  disabled={status === 'testing'}
                  onClick={async () => {
                    setLogs(["Iniciando conexión con el servidor..."]);
                    setStatus('testing');
                    try {
                      const res = await fetch('/api/email-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(config)
                      });
                      const data = await res.json();
                      if (data.logs) setLogs(data.logs);
                      if (res.ok && data.success) {
                        setStatus('success');
                        addToast("Test de correo exitoso", "success");
                      } else {
                        setStatus('error');
                        addToast(data.message || "Fallo en el test de correo", "error");
                      }
                    } catch (e) {
                      setLogs(prev => [...prev, "Error de red: No se pudo contactar al servidor."]);
                      setStatus('error');
                      addToast("Error de conexión", "error");
                    }
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-50"
                >
                  {status === 'testing' ? 'Analizando...' : 'Ejecutar Diagnóstico Real'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
