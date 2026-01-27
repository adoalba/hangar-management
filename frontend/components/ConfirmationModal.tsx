
import React, { useEffect, useRef } from 'react';
import { ICONS } from '../constants';

interface ConfirmationModalProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Trap focus & Handle Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Auto-focus Cancel button for safety
        if (cancelRef.current) {
            setTimeout(() => cancelRef.current?.focus(), 50);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby="modal-desc"
                className="w-full max-w-md bg-brand-surface border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                        <ICONS.AlertTriangle size={24} />
                    </div>
                    <h2 id="modal-title" className="text-lg font-black text-white uppercase tracking-wide">
                        {title}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-8">
                    <p id="modal-desc" className="text-sm font-medium text-slate-300 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer / Actions */}
                <div className="p-6 bg-slate-900/50 border-t border-slate-700/50 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="flex-1 px-6 py-4 rounded-xl border border-slate-700 text-slate-300 font-black uppercase text-xs tracking-widest hover:bg-slate-800 hover:text-white transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none min-h-[44px]"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg transition-all focus:ring-2 focus:outline-none min-h-[44px] ${isDestructive
                                ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 shadow-rose-900/20'
                                : 'bg-brand-primary hover:bg-indigo-500 focus:ring-indigo-500 shadow-indigo-900/20'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
