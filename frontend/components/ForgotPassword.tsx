import React, { useState } from 'react';
import { ICONS } from '../constants';
import PasswordStrength, { validatePassword } from './PasswordStrength';

/**
 * ForgotPassword Component
 * 
 * Two-step flow:
 * 1. Request email (shows on login page)
 * 2. Reset password with token (separate page)
 */

interface ForgotPasswordProps {
    t: any;
    onBack: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ t, onBack, onSuccess, onError }) => {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            onError(t?.email_required || 'Email requerido');
            return;
        }

        setSending(true);

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() })
            });

            const data = await response.json();
            setSent(true);
            onSuccess(data.message || t?.recovery_email_sent || 'Si el correo está registrado, recibirás instrucciones.');
        } catch (error) {
            onError(t?.connection_error || 'Error de conexión');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                            <ICONS.Shield size={24} className="text-indigo-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                        {t?.forgot_password || 'Recuperar Contraseña'}
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">
                        World Class Aviation • Password Recovery
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8">
                    {sent ? (
                        /* Success State */
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ICONS.Mail size={40} className="text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-black text-white mb-2">
                                {t?.check_email || '¡Revisa tu Email!'}
                            </h2>
                            <p className="text-sm text-slate-400 mb-6">
                                {t?.recovery_instructions || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'}
                            </p>
                            <p className="text-[10px] text-slate-500 mb-6">
                                {t?.check_spam || 'Revisa también tu carpeta de spam.'}
                            </p>
                            <button
                                onClick={onBack}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-white uppercase text-xs tracking-wider transition-colors"
                            >
                                {t?.back_to_login || 'Volver al Login'}
                            </button>
                        </div>
                    ) : (
                        /* Request Form */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                                    {t?.email_corporate || 'Email Corporativo'}
                                </label>
                                <div className="relative">
                                    <ICONS.Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="tu.nombre@empresa.com"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                {t?.recovery_note || 'Ingresa el email asociado a tu cuenta. Te enviaremos un enlace seguro para restablecer tu contraseña.'}
                            </p>

                            <button
                                type="submit"
                                disabled={sending || !email.trim()}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
                            >
                                {sending ? (
                                    <>
                                        <ICONS.Refresh size={16} className="animate-spin" />
                                        {t?.sending || 'Enviando...'}
                                    </>
                                ) : (
                                    <>
                                        <ICONS.Send size={16} />
                                        {t?.send_recovery || 'Enviar Instrucciones'}
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onBack}
                                className="w-full py-3 text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-wider transition-colors flex items-center justify-center gap-2"
                            >
                                <ICONS.ArrowLeft size={14} />
                                {t?.back_to_login || 'Volver al Login'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-slate-600 mt-6 uppercase tracking-widest">
                    Secure Aviation Credential Recovery
                </p>
            </div>
        </div>
    );
};

/**
 * ResetPassword Component
 * 
 * Used when user clicks the reset link from email
 */
interface ResetPasswordProps {
    token: string;
    t: any;
    onSuccess: () => void;
    onError: (message: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token, t, onSuccess, onError }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { isValid } = validatePassword(password);
        if (!isValid) {
            onError(t?.password_requirements_not_met || 'La contraseña no cumple los requisitos');
            return;
        }

        if (password !== confirmPassword) {
            onError(t?.passwords_dont_match || 'Las contraseñas no coinciden');
            return;
        }

        setSaving(true);

        try {
            const response = await fetch('/api/users/setup-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess();
            } else {
                onError(data.message || t?.reset_error || 'Error al restablecer contraseña');
            }
        } catch (error) {
            onError(t?.connection_error || 'Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                            <ICONS.Key size={24} className="text-indigo-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                        {t?.new_password || 'Nueva Contraseña'}
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">
                        World Class Aviation • Secure Reset
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                                {t?.new_password || 'Nueva Contraseña'}
                            </label>
                            <div className="relative">
                                <ICONS.Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    {showPassword ? <ICONS.EyeOff size={18} /> : <ICONS.Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <PasswordStrength password={password} t={t} />

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                                {t?.confirm_password || 'Confirmar Contraseña'}
                            </label>
                            <div className="relative">
                                <ICONS.ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className={`w-full bg-slate-950 border rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${confirmPassword && confirmPassword !== password
                                            ? 'border-rose-500'
                                            : confirmPassword && confirmPassword === password
                                                ? 'border-emerald-500'
                                                : 'border-slate-800'
                                        }`}
                                />
                            </div>
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-rose-400 text-[10px] mt-1 font-bold">
                                    {t?.passwords_dont_match || 'Las contraseñas no coinciden'}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !validatePassword(password).isValid || password !== confirmPassword}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? (
                                <>
                                    <ICONS.Refresh size={16} className="animate-spin" />
                                    {t?.saving || 'Guardando...'}
                                </>
                            ) : (
                                <>
                                    <ICONS.ShieldCheck size={16} />
                                    {t?.save_password || 'Guardar Contraseña'}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
