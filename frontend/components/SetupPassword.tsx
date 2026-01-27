
import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS, ICONS } from '../constants';

interface SetupPasswordProps {
    token: string;
    language: Language;
    onSuccess: () => void;
}

const SetupPassword: React.FC<SetupPasswordProps> = ({ token, language, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const t = TRANSLATIONS[language];
    const PASS_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{10,}$/;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(language === 'ES' ? "Las contraseñas no coinciden." : "Passwords do not match.");
            return;
        }

        if (!PASS_REGEX.test(password)) {
            setError(language === 'ES'
                ? "La contraseña debe tener al menos 10 caracteres, una mayúscula, un número y un carácter especial."
                : "Password must be at least 10 characters, with one uppercase, one number, and one special character.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/users/setup-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                }, 3000);
            } else {
                setError(data.message || (language === 'ES' ? "Error al configurar la contraseña." : "Error setting password."));
            }
        } catch (err) {
            setError(language === 'ES' ? "Error de conexión con el servidor." : "Server connection error.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-[3rem] p-10 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ICONS.ShieldCheck size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">
                        {language === 'ES' ? "Configuración Exitosa" : "Setup Successful"}
                    </h2>
                    <p className="text-white text-sm font-bold leading-relaxed">
                        {language === 'ES'
                            ? "Tu contraseña ha sido establecida correctamente. Serás redirigido al inicio de sesión en unos segundos."
                            : "Your password has been set successfully. You will be redirected to login in a few seconds."}
                    </p>
                    <div className="mt-8 flex justify-center">
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 animate-[progress_3s_linear]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-black text-slate-100 overflow-hidden relative">
            <div className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative">

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-indigo-500 tracking-tighter uppercase">Control inventario</h1>
                        <p className="text-white text-[9px] font-black uppercase tracking-[0.2em] mt-2">
                            {language === 'ES' ? "Configuración de Acceso Seguro" : "Secure Access Setup"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-100 uppercase tracking-widest ml-1">
                                {language === 'ES' ? "Nueva Contraseña" : "New Password"}
                            </label>
                            <input
                                required
                                type="password"
                                className="w-full bg-black border border-slate-800 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-100 uppercase tracking-widest ml-1">
                                {language === 'ES' ? "Confirmar Contraseña" : "Confirm Password"}
                            </label>
                            <input
                                required
                                type="password"
                                className="w-full bg-black border border-slate-800 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                placeholder="••••••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-xl flex items-center gap-2 uppercase animate-shake">
                                <ICONS.XCircle size={14} />
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-[0.2em] text-xs"
                        >
                            {isLoading ? (language === 'ES' ? "PROCESANDO..." : "PROCESSING...") : (language === 'ES' ? "CONFIGURAR CONTRASEÑA" : "SET PASSWORD")}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                        <div className="flex items-start gap-3 opacity-60">
                            <ICONS.ShieldCheck size={16} className="text-indigo-400 mt-1 shrink-0" />
                            <p className="text-[10px] text-white font-bold uppercase leading-relaxed">
                                {language === 'ES'
                                    ? "Esta es una configuración de un solo uso. Una vez establecida, el enlace de invitación quedará invalidado."
                                    : "This is a one-time setup. Once established, the invitation link will be invalidated."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="p-8 flex justify-center items-center gap-4 text-slate-700">
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Control inventario - Terminal de Inicialización</span>
            </footer>
        </div>
    );
};

export default SetupPassword;
