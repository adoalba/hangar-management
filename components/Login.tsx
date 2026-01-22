
import React, { useState } from 'react';
import { Language, User } from '../types';
import { TRANSLATIONS, ICONS } from '../constants';

const WorldClassLogo: React.FC = () => (
  <div className="relative w-48 h-48 flex items-center justify-center mx-auto mb-10 scale-110">
    {/* Globe Background with Horizontal Stripes */}
    <div className="absolute w-32 h-32 bg-[#b8860b] rounded-full overflow-hidden flex flex-col justify-between p-0.5 border border-[#b8860b]">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="w-full h-[3px] bg-black"></div>
      ))}
    </div>
    
    {/* Curved WORLD at top */}
    <div className="absolute top-2 w-full text-center">
      <svg viewBox="0 0 200 60" className="w-full h-auto">
        <path id="curve-top" d="M 20,50 Q 100,0 180,50" fill="transparent" />
        <text className="fill-white font-serif font-black text-[28px] tracking-[0.1em] uppercase">
          <textPath href="#curve-top" startOffset="50%" textAnchor="middle">WORLD</textPath>
        </text>
      </svg>
    </div>

    {/* CLASS in center - matching the prominent white text */}
    <div className="absolute z-10 flex items-baseline">
       <span className="text-white font-serif font-black text-[46px] tracking-tight leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">CLASS</span>
       <span className="text-white font-serif font-bold text-[10px] ml-1 mb-1">INC.</span>
    </div>

    {/* Curved AVIATION at bottom */}
    <div className="absolute bottom-0 w-full text-center">
      <svg viewBox="0 0 200 80" className="w-full h-auto">
        <path id="curve-bottom" d="M 10,20 Q 100,80 190,20" fill="transparent" />
        <text className="fill-white font-serif font-black text-[24px] tracking-[0.1em] uppercase">
          <textPath href="#curve-bottom" startOffset="50%" textAnchor="middle">AVIATION</textPath>
        </text>
      </svg>
    </div>
  </div>
);

interface LoginProps {
  onLogin: (user: User, token: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, language, setLanguage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const t = TRANSLATIONS[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        onLogin(data.user, data.token);
      } else {
        setAttempts(prev => prev + 1);
        setError(data.message || t.login_error);
      }
    } catch (err: any) {
      setError(language === 'ES' ? "Error crítico de comunicación con el terminal central." : "Critical communication error with central terminal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-100 overflow-hidden relative">
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative">
          
          <div className="text-center mb-4">
            <WorldClassLogo />
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] -mt-4">{t.login_encryption}</p>
          </div>

          <div className="mb-8 p-4 bg-black/40 border border-slate-800 rounded-2xl">
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center mb-3">{t.select_lang}</p>
             <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setLanguage('ES')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${language === 'ES' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
                >
                  <img src="https://flagcdn.com/w20/es.png" className="w-4" alt="ES" />
                  ESPAÑOL
                </button>
                <button 
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${language === 'EN' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
                >
                  <img src="https://flagcdn.com/w20/us.png" className="w-4" alt="EN" />
                  ENGLISH
                </button>
             </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.username}</label>
              <input
                required
                type="text"
                className="w-full bg-black border border-slate-800 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                placeholder={language === 'ES' ? "Usuario / ID..." : "Username / ID..."}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.password}</label>
              <input
                required
                type="password"
                className="w-full bg-black border border-slate-800 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-xl flex items-center gap-2 uppercase animate-shake">
                <ICONS.XCircle size={14} />
                {error}
              </div>
            )}

            <button
              disabled={isLoading || attempts >= 5}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-[0.2em] text-xs"
            >
              {isLoading ? t.verifying : t.login_button}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
             <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                <ICONS.ShieldCheck size={10} className="inline mr-1 text-emerald-500" />
                {t.login_security_notice}
             </p>
          </div>
        </div>
      </div>
      
      <footer className="p-8 flex justify-center items-center gap-4 text-slate-700">
         <span className="text-[9px] font-black uppercase tracking-widest">{t.login_footer_layer}</span>
      </footer>
    </div>
  );
};

export default Login;
