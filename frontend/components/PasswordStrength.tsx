import React, { useMemo } from 'react';

/**
 * Password Strength Indicator Component
 * 
 * Validates and displays password strength in real-time
 * Requirements: 10+ chars, uppercase, lowercase, numbers, symbols
 */

interface PasswordStrengthProps {
    password: string;
    t: any;
    showRequirements?: boolean;
}

interface PasswordRequirement {
    key: string;
    label: string;
    met: boolean;
}

// Password complexity regex - minimum 10 chars with upper, lower, number, symbol
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{10,}$/;

export const validatePassword = (password: string): { isValid: boolean; requirements: PasswordRequirement[] } => {
    const requirements: PasswordRequirement[] = [
        { key: 'length', label: '10+ caracteres / 10+ characters', met: password.length >= 10 },
        { key: 'uppercase', label: 'Mayúscula / Uppercase', met: /[A-Z]/.test(password) },
        { key: 'lowercase', label: 'Minúscula / Lowercase', met: /[a-z]/.test(password) },
        { key: 'number', label: 'Número / Number', met: /\d/.test(password) },
        { key: 'symbol', label: 'Símbolo (@#$%...) / Symbol', met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) }
    ];

    const isValid = requirements.every(r => r.met);
    return { isValid, requirements };
};

export const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: 'Sin contraseña', color: '#64748b' };

    const { requirements } = validatePassword(password);
    const metCount = requirements.filter(r => r.met).length;

    if (metCount <= 1) return { level: 1, label: 'Muy débil / Very weak', color: '#dc2626' };
    if (metCount === 2) return { level: 2, label: 'Débil / Weak', color: '#f97316' };
    if (metCount === 3) return { level: 3, label: 'Regular / Fair', color: '#eab308' };
    if (metCount === 4) return { level: 4, label: 'Fuerte / Strong', color: '#22c55e' };
    return { level: 5, label: 'Muy fuerte / Very strong', color: '#10b981' };
};

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, t, showRequirements = true }) => {
    const { isValid, requirements } = useMemo(() => validatePassword(password), [password]);
    const strength = useMemo(() => getPasswordStrength(password), [password]);

    return (
        <div className="space-y-3">
            {/* Strength Bar */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        {t?.password_strength || 'Fortaleza de Contraseña'}
                    </span>
                    <span
                        className="text-[9px] font-black uppercase"
                        style={{ color: strength.color }}
                    >
                        {strength.label}
                    </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(level => (
                        <div
                            key={level}
                            className="flex-1 rounded-full transition-all duration-300"
                            style={{
                                backgroundColor: level <= strength.level ? strength.color : '#334155'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Requirements Checklist */}
            {showRequirements && (
                <div className="grid grid-cols-2 gap-1 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    {requirements.map(req => (
                        <div key={req.key} className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${req.met
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-700 border border-slate-600'
                                    }`}
                            >
                                {req.met && (
                                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-[9px] font-medium ${req.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {req.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Valid/Invalid Badge */}
            {password && (
                <div className={`flex items-center gap-2 p-2 rounded-xl border ${isValid
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}>
                    {isValid ? (
                        <>
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                {t?.password_valid || 'Contraseña válida'}
                            </span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-[10px] font-bold text-rose-400 uppercase">
                                {t?.password_invalid || 'Requisitos no cumplidos'}
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PasswordStrength;
