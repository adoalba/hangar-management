import React from 'react';
import { User, UserRole, Language } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  currentView: string;
  setView: (view: any) => void;
  user: User;
  onLogout: () => void;
  t: any;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout, t, language, setLanguage }) => {
  const menuItems = [
    { id: 'INVENTORY', icon: ICONS.Inventory, label: t.inventory, roles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER] },
    { id: 'HANGAR', icon: ICONS.Plus, label: t.add_part, roles: [UserRole.ADMIN, UserRole.TECHNICIAN] },
    { id: 'REPORTS', icon: ICONS.Spreadsheet, label: t.reports || 'Reports', roles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER] },
    { id: 'SCAN', icon: ICONS.Scan, label: 'Scanner', roles: [UserRole.ADMIN, UserRole.TECHNICIAN] },
    { id: 'QR_LABELS', icon: ICONS.QrCode, label: 'QR', roles: [UserRole.ADMIN] },
    { id: 'USERS', icon: ICONS.Users, label: t.users, roles: [UserRole.ADMIN] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* --- DESKTOP SIDEBAR (MD+) --- */}
      <aside className="hidden md:flex w-64 flex-col h-screen sticky top-0 border-r border-slate-800 bg-brand-dark z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#b8860b] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-900/20 shrink-0">
            <span className="font-bold text-xl text-white">W</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">World Class Aviation</span>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-label={item.label}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-inner'
                  : 'text-brand-muted hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
              >
                <Icon size={22} className={isActive ? 'text-brand-primary' : 'group-hover:text-white'} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 bg-brand-dark">
          <div className="flex flex-col px-3 py-2 mb-2">
            <span className="text-xs font-black text-brand-muted uppercase tracking-widest">{user.role}</span>
            <span className="text-sm font-bold text-white truncate" title={user.name}>{user.name}</span>
          </div>

          <button
            onClick={() => setLanguage(language === 'ES' ? 'EN' : 'ES')}
            className="w-full flex items-center gap-3 p-3 text-brand-muted hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <span className="w-6 text-center text-xs font-bold bg-slate-800 rounded py-1">{language}</span>
            <span className="font-medium">{t.language_toggle}</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all group"
          >
            <ICONS.Logout size={22} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAV (MD-) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-brand-dark border-t border-slate-800 flex items-center justify-around px-2 z-50 pb-[env(safe-area-inset-bottom)]">
        {allowedItems.slice(0, 5).map((item) => { // Limit to 5 items mobile
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 pt-2 transition-colors ${isActive ? 'text-brand-primary' : 'text-brand-muted hover:text-white'}`}
            >
              <div className={`p-1 rounded-xl ${isActive ? 'bg-brand-primary/10' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[11px] font-bold tracking-wide uppercase truncate max-w-[60px]">{item.label}</span>
            </button>
          );
        })}
        {/* Mobile Menu 'More' if needed, simplified for now to just show top 5 */}
        <button onClick={onLogout} className="flex flex-col items-center justify-center w-full h-full gap-1 pt-2 text-rose-300/80">
          <ICONS.Logout size={20} />
          <span className="text-[11px] font-bold">Exit</span>
        </button>

      </nav>
    </>
  );
};

export default Sidebar;
