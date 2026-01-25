
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { User, Language, AviationPart, TagColor, UserRole, MovementEvent } from './types';
import { TRANSLATIONS, ICONS } from './constants';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import HangarMenu from './components/HangarMenu';
import PartForm from './components/PartForm';
import InventoryTable from './components/InventoryTable';
import LocationPopup from './components/LocationPopup';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import PrintTemplate from './components/PrintTemplate';
import SetupPassword from './components/SetupPassword';
import ScanPage from './components/ScanPage';

const PASS_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{10,}$/;

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const ToastContainer: React.FC<{ toasts: Toast[], removeToast: (id: number) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed top-8 right-8 z-[200] space-y-3">
    {toasts.map(toast => (
      <div key={toast.id} className={`flex items-center gap-4 p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
        {toast.type === 'success' ? <ICONS.Yellow size={20} /> : <ICONS.XCircle size={20} />}
        <p className="text-sm font-bold">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="ml-4 opacity-50 hover:opacity-100"><ICONS.X size={16} /></button>
      </div>
    ))}
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('session_token'));
  const [language, setLanguage] = useState<Language>('ES');
  const [view, setView] = useState('INVENTORY');
  const [inventory, setInventory] = useState<AviationPart[]>([]);
  const [selectedTag, setSelectedTag] = useState<TagColor | null>(null);
  const [editingPart, setEditingPart] = useState<AviationPart | null>(null);
  const [pendingPartData, setPendingPartData] = useState<Partial<AviationPart> | null>(null);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [scanRecordId, setScanRecordId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('setupToken');
    if (token) {
      setSetupToken(token);
    }

    // Check for scan route - supports multiple formats:
    // 1. Hash: /#/scan/{recordId}
    // 2. Path: /inventario/scan/{recordId}
    const handleRouteChange = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      // Hash-based routing
      const hashMatch = hash.match(/#\/scan\/(.+)/);
      if (hashMatch && hashMatch[1]) {
        setScanRecordId(hashMatch[1]);
        setView('SCAN');
        return;
      }

      // Path-based routing (for QR scans)
      const pathMatch = path.match(/\/inventario\/scan\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        setScanRecordId(pathMatch[1]);
        setView('SCAN');
        return;
      }
    };
    handleRouteChange();
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');

  const t = TRANSLATIONS[language];

  const handleLogout = useCallback(() => {
    setUser(null); setToken(null);
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_data');
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user_data');
    if (savedUser && token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        handleLogout();
      }
    }
  }, [token, handleLogout]);

  useEffect(() => {
    if (user && token && !user.mustChangePassword) {
      fetch('/api/inventory', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
          if (res.ok) return res.json();
          if (res.status === 401) handleLogout();
          throw new Error("Unauthorized");
        })
        .then(data => {
          if (Array.isArray(data)) {
            setInventory(data);
          } else {
            console.error("Inventory API did not return an array:", data);
            addToast("Error de datos del inventario.", "error");
            setInventory([]); // Set to empty array to prevent crashes
          }
        })
        .catch(() => {
          addToast("Error de comunicación API.", "error");
          setInventory([]); // Also set to empty on fetch error
        });
    }
  }, [user, token, addToast, handleLogout]);

  const saveInventory = async (updated: AviationPart[]) => {
    setInventory(updated);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updated)
      });
      if (res.ok) addToast(language === 'ES' ? 'Inventario sincronizado' : 'Inventory synchronized', 'success');
      else addToast(language === 'ES' ? 'Fallo al guardar' : 'Save failed', 'error');
      return res.ok;
    } catch (e) { addToast(language === 'ES' ? 'Error de red' : 'Network error', 'error'); return false; }
  };

  const handleLogin = (u: User, sessionToken: string) => {
    setUser(u);
    setToken(sessionToken);
    localStorage.setItem('session_token', sessionToken);
    localStorage.setItem('user_data', JSON.stringify(u));
    setView('INVENTORY');
  };

  const triggerPrint = (part: AviationPart) => {
    const printSection = document.getElementById('print-section');
    if (printSection) {
      printSection.innerHTML = '';
      const root = createRoot(printSection);

      // Aviation Standard Filename: TAG_PN_SN_DATE
      const tagLabel = part.tagColor ? (t[`${part.tagColor.toLowerCase()}_tag` as keyof typeof t] as string)?.split(' ')[0] : 'TAG';
      const cleanPN = (part.pn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
      const cleanSN = (part.sn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      const oldTitle = document.title;
      document.title = `${tagLabel}_${cleanPN}_${cleanSN}_${dateStr}`;

      root.render(<PrintTemplate part={part} t={t} />);
      setTimeout(() => {
        window.print();
        document.title = oldTitle;
      }, 1000); // 1s sync for full asset rendering
    }
  };

  const handleMandatoryPasswordChange = async () => {
    setPassError('');
    if (newPassword !== confirmPassword) { setPassError(language === 'ES' ? "Las contraseñas no coinciden." : "Passwords do not match."); return; }
    if (!PASS_REGEX.test(newPassword)) { setPassError(t.password_complexity_error); return; }

    try {
      const res = await fetch('/api/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        const updatedUser = { ...user!, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
        addToast('Contraseña actualizada', 'success');
      } else { setPassError((await res.json()).message || "Error del servidor."); }
    } catch (e) { setPassError("Error de conexión."); }
  };

  const confirmLocation = async (location: string) => {
    if (!pendingPartData || !user) return;
    const newEvent: MovementEvent = { id: `${Date.now()}-${user.id}`, timestamp: new Date().toISOString(), type: editingPart ? 'DATA_UPDATE' : 'CREATION', description: editingPart ? `Actualizado por ${user.name}` : `Registrado por ${user.name}`, newLocation: location, userId: user.id, userName: user.name };
    const finalPart: AviationPart = editingPart
      ? { ...editingPart, ...pendingPartData, location, history: [...(editingPart.history || []), newEvent] } as AviationPart
      : { ...pendingPartData, id: `${Date.now()}`, tagColor: selectedTag!, location, history: [newEvent], registrationDate: pendingPartData.registrationDate || new Date().toISOString().split('T')[0] } as AviationPart;
    const updatedInventory = editingPart ? inventory.map(p => p.id === editingPart.id ? finalPart : p) : [...inventory, finalPart];

    await saveInventory(updatedInventory);
    triggerPrint(finalPart);
    setShowLocationPopup(false); setPendingPartData(null); setEditingPart(null); setSelectedTag(null); setView('INVENTORY');
  };

  if (setupToken) {
    return (
      <SetupPassword
        token={setupToken}
        language={language}
        onSuccess={() => {
          setSetupToken(null);
          window.history.replaceState({}, document.title, "/");
        }}
      />
    );
  }

  if (!user || !token) {
    return <Login onLogin={handleLogin} language={language} setLanguage={setLanguage} />;
  }

  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8">
          <div className="text-center"><div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><ICONS.Key size={32} className="text-white" /></div><h2 className="text-2xl font-black text-white">{t.must_change_pass_title}</h2><p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">{t.must_change_pass_desc}</p></div>
          <div className="space-y-4">
            {passError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase rounded-xl flex items-center gap-2"><ICONS.AlertTriangle size={14} /> {passError}</div>}
            <input type="password" placeholder={t.new_password} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
            <input type="password" placeholder={t.confirm_password} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
            <button onClick={handleMandatoryPasswordChange} className="w-full bg-indigo-600 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20">{t.save_password}</button>
          </div>
          <button onClick={handleLogout} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">{t.logout}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Sidebar user={user} currentView={view} setView={setView} onLogout={handleLogout} t={t} language={language} setLanguage={setLanguage} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <header className="mb-10 flex justify-between items-center">
          <div><h1 className="text-4xl font-black tracking-tighter uppercase mb-1">{view === 'HANGAR' && (selectedTag || editingPart) ? t.add_part : ((t as any)[view.toLowerCase()] || view)}</h1><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">{t.operational_terminal}</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden md:flex flex-col items-end mr-4"><span className="text-[10px] font-black text-indigo-400 uppercase">{user.role}</span><span className="text-xs font-bold">{user.name}</span></div>{user.role === UserRole.ADMIN && (<button onClick={() => setView('SETTINGS')} className={`p-3 rounded-2xl border transition-all ${view === 'SETTINGS' ? 'bg-indigo-600' : 'bg-slate-900 border-slate-800'}`}><ICONS.Settings size={20} /></button>)}</div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {view === 'HANGAR' && !selectedTag && !editingPart && <HangarMenu onSelectTag={(tag) => setSelectedTag(tag)} t={t} />}
          {(selectedTag || editingPart) && view === 'HANGAR' && <PartForm tag={selectedTag || editingPart!.tagColor} initialData={editingPart || undefined} onSubmit={(data) => { setPendingPartData(data); setShowLocationPopup(true); }} onCancel={() => { setSelectedTag(null); setEditingPart(null); setView('INVENTORY'); }} t={t} />}
          {view === 'INVENTORY' && <InventoryTable inventory={inventory} setInventory={saveInventory} onEdit={(part) => { setEditingPart(part); setView('HANGAR'); }} onPrint={triggerPrint} t={t} user={user} token={token!} addToast={addToast} />}
          {view === 'USERS' && user.role === UserRole.ADMIN && <UserManagement t={t} token={token!} addToast={addToast} />}
          {view === 'SETTINGS' && user.role === UserRole.ADMIN && <Settings token={token!} addToast={addToast} />}
          {view === 'SCAN' && scanRecordId && <ScanPage recordId={scanRecordId} user={user} token={token!} inventory={inventory} onUpdatePart={async (updatedPart) => { const success = await saveInventory(inventory.map(p => p.id === updatedPart.id ? updatedPart : p)); return success; }} onClose={() => { setScanRecordId(null); setView('INVENTORY'); window.location.hash = ''; }} t={t} />}
        </div>
      </main>

      {showLocationPopup && <LocationPopup onConfirm={confirmLocation} onCancel={() => setShowLocationPopup(false)} t={t} initialLocation={editingPart?.location} />}
    </div>
  );
};

export default App;