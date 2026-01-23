
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
    { id: 'DASHBOARD', icon: ICONS.Dashboard, label: t.dashboard, roles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER] },
    { id: 'HANGAR', icon: ICONS.Plus, label: t.add_part, roles: [UserRole.ADMIN, UserRole.TECHNICIAN] },
    { id: 'INVENTORY', icon: ICONS.Inventory, label: t.inventory, roles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEWER] },
    { id: 'USERS', icon: ICONS.Users, label: t.users, roles: [UserRole.ADMIN] },
  ];

  return (
    <aside className="w-20 md:w-64 flex flex-col h-full border-r border-slate-800 bg-slate-950 z-20">
      <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3">
        <div className="w-10 h-10 bg-[#b8860b] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-900/20">
          <span className="font-bold text-xl text-white">W</span>
        </div>
        <span className="hidden md:block font-bold text-lg tracking-tight">World Class Aviation</span>
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-2">
        {menuItems.map((item) => {
          if (!item.roles.includes(user.role)) return null;
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon size={22} className={isActive ? 'text-indigo-400' : ''} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="hidden md:flex flex-col px-3 py-2 mb-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.technician}</span>
          <span className="text-xs font-bold text-white truncate">{user.name}</span>
        </div>

        <button
          onClick={() => setLanguage(language === 'ES' ? 'EN' : 'ES')}
          className="w-full flex items-center justify-center md:justify-start gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all border border-transparent"
        >
          <span className="w-6 text-center text-sm font-bold bg-slate-800 rounded">{language}</span>
          <span className="hidden md:block font-medium">{t.language_toggle}</span>
        </button>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center md:justify-start gap-3 p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all group"
        >
          <ICONS.Logout size={22} className="group-hover:translate-x-1 transition-transform" />
          <span className="hidden md:block font-medium">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
