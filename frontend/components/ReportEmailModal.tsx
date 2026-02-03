import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface ReportEmailModalProps {
    isOpen: boolean; onClose: () => void; reportData: any; token: string; t: any;
    onSuccess: (msg: string) => void; onError: (msg: string) => void;
}

const ReportEmailModal: React.FC<ReportEmailModalProps> = ({ isOpen, onClose, reportData, token, t, onSuccess, onError }) => {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [format, setFormat] = useState<'PDF' | 'EXCEL'>('PDF');
    const [contacts, setContacts] = useState<any[]>([]);

    // Load contacts
    useEffect(() => {
        if (isOpen) {
            fetch('/api/reports/contacts', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => setContacts(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        }
    }, [isOpen, token]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!email) return;
        setSending(true);
        try {
            const res = await fetch('/api/reports/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ recipient: email, reportData, format })
            });
            if (res.ok) { onSuccess("Reporte enviado correctamente"); onClose(); }
            else onError("Error al enviar el reporte");
        } catch (e) { onError("Error de conexión con el servidor"); }
        finally { setSending(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0B1221] border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#151E32]">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg"><ICONS.Mail className="text-blue-400" size={20} /></div>
                        <h2 className="text-white font-bold tracking-wide">ENVIAR REPORTE</h2>
                    </div>
                    <button onClick={onClose}><ICONS.X className="text-gray-400 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Destinatario</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                            className="w-full bg-[#1E293B] border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />

                        {/* Quick Contacts */}
                        {contacts.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {contacts.map(c => (
                                    <button key={c.id} onClick={() => setEmail(c.email)} className="text-[10px] bg-[#1E293B] border border-slate-700 text-gray-300 px-2 py-1 rounded hover:bg-slate-700">
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Formato de Archivo</label>
                        <div className="flex gap-3">
                            <button onClick={() => setFormat('PDF')} className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${format === 'PDF' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#1E293B] border-slate-600 text-gray-400'}`}>
                                <ICONS.Printer size={16} /> PDF (Industrial)
                            </button>
                            <button onClick={() => setFormat('EXCEL')} className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${format === 'EXCEL' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-[#1E293B] border-slate-600 text-gray-400'}`}>
                                <ICONS.Spreadsheet size={16} /> EXCEL (Datos)
                            </button>
                        </div>
                    </div>
                    <button onClick={handleSend} disabled={sending || !email} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20">
                        {sending ? 'ENVIANDO...' : 'ENVIAR AHORA'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ReportEmailModal;
