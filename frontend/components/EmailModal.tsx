import React, { useState } from 'react';
import { Mail, Send, X, Loader2 } from 'lucide-react';
import { AviationPart } from '../types';

interface EmailModalProps {
    part: AviationPart;
    onClose: () => void;
    token: string;
    addToast: (msg: string, type: 'success' | 'error') => void;
    t: any;
}

const EmailModal: React.FC<EmailModalProps> = ({ part, onClose, token, addToast, t }) => {
    const [recipient, setRecipient] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient) return;

        setSending(true);

        // Construct a beautiful HTML body for the email
        // Note: In a real app, you might use a template engine on the backend, 
        // but sending pre-rendered HTML is a quick way to get rich emails.
        const subject = `Aviation Part Details: ${part.partName} (P/N: ${part.pn})`;
        const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 0; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">Part Details</h1>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">AeroLogistics Inventory System</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
             <div>
               <h2 style="margin: 0; font-size: 24px; color: #0f172a;">${part.partName}</h2>
               <p style="margin: 4px 0 0 0; color: #64748b;">P/N: <strong>${part.pn}</strong></p>
             </div>
             <div style="background-color: #f1f5f9; padding: 8px 16px; border-radius: 8px; font-weight: bold; color: #475569;">
               ${part.tagColor} TAG
             </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Serial Number</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a; text-align: right;">${part.sn}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Location</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a; text-align: right;">${part.location}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Condition</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a; text-align: right;">${part.cso || 'N/A'} (CSO)</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">Data verified by ${part.technicianName}</p>
          </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 10px;">
          Generated automatically by AeroLogistics Pro
        </div>
      </div>
    `;

        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient,
                    subject,
                    html_body: htmlBody
                })
            });

            if (res.ok) {
                addToast(t.email_sent_success || "Email sent successfully", "success");
                onClose();
            } else {
                const err = await res.json();
                addToast(err.message || "Failed to send email", "error");
            }
        } catch (error) {
            addToast("Network error", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Mail className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{t.email_part_title || "Send Part Details"}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t.email_part_desc || "Enter recipient email address below."}</p>
                </div>

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Recipient Email</label>
                        <input
                            type="email"
                            required
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="e.g. manager@airline.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                        <div className="flex items-center gap-3">
                            {part.photo ? (
                                <img src={part.photo} className="w-10 h-10 rounded-lg object-cover" alt="Part" />
                            ) : (
                                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-[8px] font-black text-slate-400">NO IMG</div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-slate-900 line-clamp-1">{part.partName}</p>
                                <p className="text-[10px] font-mono text-slate-500">{part.pn}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>{t.send_email_action || "Send Email"}</span>
                                <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EmailModal;
