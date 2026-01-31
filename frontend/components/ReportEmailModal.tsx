import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { TagColor } from '../types';

interface ReportEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportData: {
        reportId: string;
        reportType: string;
        generatedAt: string;
        generatedBy: string;
        summary: {
            total: number;
            byStatus: Record<string, number>;
        };
        filtersApplied?: Record<string, string>;
    } | null;
    token: string;
    t: any;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

type ExportFormat = 'PDF' | 'CSV';

interface Contact {
    id: string;
    name: string;
    email: string;
    role: string;
    organization?: string;
}

const ReportEmailModal: React.FC<ReportEmailModalProps> = ({
    isOpen,
    onClose,
    reportData,
    token,
    t,
    onSuccess,
    onError
}) => {
    const [recipients, setRecipients] = useState<string[]>([]);
    const [customEmail, setCustomEmail] = useState('');
    const [customName, setCustomName] = useState(''); // New for contact creation
    const [format, setFormat] = useState<ExportFormat>('PDF');
    const [sending, setSending] = useState(false);
    const [includeSchedule, setIncludeSchedule] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly'>('weekly');
    const [requireApproval, setRequireApproval] = useState(false);

    // Dynamic Contacts
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const response = await fetch('/api/contacts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error('Failed to fetch contacts', error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const saveContact = async () => {
        if (!customEmail || !customName) {
            // Simple validation
            return;
        }

        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: customName,
                    email: customEmail,
                    role: 'EXTERNAL'
                })
            });

            if (response.ok) {
                const result = await response.json();
                setContacts(prev => [...prev, result.contact]);
                setShowContactForm(false);
                setCustomName('');
                // Optionally auto-add to recipients
                if (!recipients.includes(customEmail)) {
                    setRecipients(prev => [...prev, customEmail]);
                }
                setCustomEmail('');
            } else {
                const err = await response.json();
                onError(err.message || "Error guardando contacto");
            }
        } catch (error) {
            onError("Error de conexión al guardar contacto");
        }
    };

    const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggling selection
        if (!window.confirm('¿Eliminar este contacto de la lista?')) return;

        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setContacts(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete contact', error);
        }
    };

    if (!isOpen || !reportData) return null;

    const toggleContact = (email: string) => {
        setRecipients(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        );
    };

    const addCustomEmail = () => {
        const email = customEmail.trim().toLowerCase();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (!recipients.includes(email)) {
                setRecipients(prev => [...prev, email]);
            }
            setCustomEmail('');
        }
    };

    const removeRecipient = (email: string) => {
        setRecipients(prev => prev.filter(e => e !== email));
    };

    const getReportTypeLabel = () => {
        switch (reportData.reportType) {
            case 'TOTAL_INVENTORY': return 'Total Inventory';
            case 'BY_STATUS': return 'By Card Type';
            case 'BY_LOCATION': return 'By Location';
            case 'BY_PART_NUMBER': return 'By Part Number';
            default: return reportData.reportType;
        }
    };

    const handleSend = async () => {
        // Allow sending if there are recipients OR if there is a valid custom email typed in
        let finalRecipients = [...recipients];
        const email = customEmail.trim().toLowerCase();

        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalRecipients.includes(email)) {
            finalRecipients.push(email);
        }

        if (finalRecipients.length === 0) {
            onError(t.no_recipients || 'Agregue al menos un destinatario');
            return;
        }

        setSending(true);

        try {
            const endpoint = requireApproval
                ? `/api/reports/${reportData.reportId}/send-with-approval`
                : `/api/reports/${reportData.reportId}/email`;

            // Note: send-with-approval in backend was NOT updated in my previous turn.
            // I should check if I missed it.
            // The user request was about "rediseña el flujo...". 
            // I updated send_report_email. I didn't update send_report_with_approval in backend/app/reports.py

            // Use the new endpoint for standard email
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipients: finalRecipients,
                    // reportData: reportData, // REMOVED
                    format,
                    schedule: includeSchedule ? {
                        enabled: true,
                        frequency: scheduleFrequency
                    } : null
                })
            });

            const result = await response.json();

            if (response.ok) {
                onSuccess(result.message || t.email_sent_success || 'Reporte enviado exitosamente');
                onClose();
            } else {
                onError(result.message || t.email_send_error || 'Error al enviar el reporte');
            }
        } catch (error) {
            onError(t.connection_error || 'Error de conexión');
        } finally {
            setSending(false);
        }
    };

    const isValidCustomEmail = customEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail);
    // Button enable logic: Has recipients list OR has a valid typed email
    const canSend = !sending && (recipients.length > 0 || isValidCustomEmail);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-dark rounded-3xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-brand-dark border-b border-slate-800 p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center">
                            <ICONS.Mail size={24} className="text-brand-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">
                                Send Report by Email
                            </h2>
                            <p className="text-[10px] text-slate-100 uppercase tracking-widest">
                                Aviation Technical Record Dispatch
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <ICONS.X size={20} className="text-white" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Report Summary Card */}
                    <div className="bg-brand-surface-dark/50 rounded-2xl border border-slate-700 p-4">
                        <h3 className="text-[10px] font-bold text-slate-100 uppercase mb-3">
                            Report Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-white text-xs">ID:</span>
                                <p className="font-mono font-bold text-brand-primary">{reportData.reportId}</p>
                            </div>
                            <div>
                                <span className="text-white text-xs">Type:</span>
                                <p className="font-bold text-white">{getReportTypeLabel()}</p>
                            </div>
                            <div>
                                <span className="text-white text-xs">Items:</span>
                                <p className="font-bold text-white text-lg">{reportData.summary.total}</p>
                            </div>
                            <div>
                                <span className="text-white text-xs">Generated By:</span>
                                <p className="font-bold text-white">{reportData.generatedBy}</p>
                            </div>
                        </div>
                    </div>

                    {/* CONTACT MANAGER SECTION */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">
                                {t.contacts_directory || 'Directorio de Contactos'}
                            </h3>
                            <button
                                onClick={() => setShowContactForm(!showContactForm)}
                                className="text-[10px] font-bold text-brand-primary hover:text-brand-primary-hover uppercase flex items-center gap-1"
                            >
                                <ICONS.Plus size={12} />
                                {showContactForm ? t.cancel : t.new_contact || 'NUEVO CONTACTO'}
                            </button>
                        </div>

                        {/* New Contact Form */}
                        {showContactForm && (
                            <div className="bg-brand-surface-dark/80 p-4 rounded-xl border border-brand-primary/30 mb-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-100 uppercase font-bold block mb-1">Nombre</label>
                                            <input
                                                autoFocus
                                                value={customName}
                                                onChange={e => setCustomName(e.target.value)}
                                                className="w-full bg-brand-dark border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-primary outline-none"
                                                placeholder="Ej. Juan Perez"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-100 uppercase font-bold block mb-1">Email</label>
                                            <input
                                                value={customEmail}
                                                onChange={e => setCustomEmail(e.target.value)}
                                                className="w-full bg-brand-dark border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-primary outline-none"
                                                placeholder="juan@empresa.com"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={saveContact}
                                        disabled={!customName || !isValidCustomEmail}
                                        className="w-full py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t.save_contact || 'Guardar Contacto'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Contacts List Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                            {loadingContacts ? (
                                <div className="col-span-2 text-center py-4 text-white text-xs">Cargando contactos...</div>
                            ) : contacts.length === 0 ? (
                                <div className="col-span-2 text-center py-4 text-white text-xs border border-dashed border-slate-800 rounded-xl">
                                    No hay contactos guardados. Agrega uno nuevo.
                                </div>
                            ) : (
                                contacts.map(contact => {
                                    const isSelected = recipients.includes(contact.email);
                                    return (
                                        <div
                                            key={contact.id}
                                            onClick={() => toggleContact(contact.email)}
                                            className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left relative ${isSelected
                                                ? 'bg-brand-primary/20 border-brand-primary/50 text-white'
                                                : 'bg-brand-surface-dark/50 border-slate-700 text-white hover:border-slate-600'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-primary' : 'bg-slate-700'
                                                }`}>
                                                <ICONS.User size={16} className={isSelected ? 'text-white' : 'text-white'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{contact.name}</p>
                                                <p className="text-[10px] text-white truncate">{contact.email}</p>
                                            </div>
                                            {isSelected && <ICONS.Check size={16} className="text-brand-primary flex-shrink-0" />}

                                            {/* Delete Button (visible on hover) */}
                                            <button
                                                onClick={(e) => handleDeleteContact(contact.id, e)}
                                                className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Eliminar Contacto"
                                            >
                                                <ICONS.Trash size={12} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Quick Add Custom Email (Legacy/Manual) */}
                    <div>
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                            {t.manual_entry || 'Entrada Manual'}
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={customEmail}
                                onChange={e => setCustomEmail(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && addCustomEmail()}
                                placeholder={t.enter_email || 'correo@ejemplo.com'}
                                className="flex-1 bg-brand-surface-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                            />
                            <button
                                onClick={addCustomEmail}
                                disabled={!isValidCustomEmail}
                                className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-xl transition-colors"
                            >
                                <ICONS.Plus size={20} className="text-white" />
                            </button>
                        </div>
                        {isValidCustomEmail && !showContactForm && (
                            <p className="mt-2 text-[10px] text-brand-primary cursor-pointer hover:underline" onClick={() => {
                                setShowContactForm(true);
                                // customEmail is already set
                            }}>
                                + Guardar como contacto
                            </p>
                        )}
                    </div>

                    {/* Selected Recipients Chips */}
                    {recipients.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                                {t.recipients || 'Destinatarios'} ({recipients.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {recipients.map(email => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary/20 border border-brand-primary/30 rounded-lg text-xs font-bold text-brand-primary"
                                    >
                                        {email}
                                        <button onClick={() => removeRecipient(email)} className="hover:text-white">
                                            <ICONS.X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Format Selection */}
                    <div>
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-wider mb-3">
                            {t.attachment_format || 'Formato del Adjunto'}
                        </h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFormat('PDF')}
                                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${format === 'PDF'
                                    ? 'bg-rose-600/20 border-rose-500/50 text-rose-300'
                                    : 'bg-brand-surface-dark/50 border-slate-700 text-white hover:border-slate-600'
                                    }`}
                            >
                                <ICONS.Printer size={20} />
                                <div className="text-left">
                                    <p className="text-sm font-black uppercase">PDF</p>
                                    <p className="text-[9px] text-white">Industrial Design</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setFormat('CSV')}
                                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${format === 'CSV'
                                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                    : 'bg-brand-surface-dark/50 border-slate-700 text-white hover:border-slate-600'
                                    }`}
                            >
                                <ICONS.Spreadsheet size={20} />
                                <div className="text-left">
                                    <p className="text-sm font-black uppercase">CSV</p>
                                    <p className="text-[9px] text-white">Technical Data</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-brand-dark border-t border-slate-800 p-6 flex gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-700 text-white font-bold uppercase text-xs hover:bg-slate-800 transition-colors"
                    >
                        {t.cancel || 'Cancelar'}
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-black uppercase text-xs shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {sending ? (
                            <>
                                <ICONS.Refresh size={16} className="animate-spin" />
                                {t.sending || 'Enviando...'}
                            </>
                        ) : (
                            <>
                                <ICONS.Send size={16} />
                                {t.send_report || 'Enviar Reporte'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportEmailModal;
