import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ICONS } from '../constants';
import { User, UserRole } from '../types';

interface UserManagementProps {
    currentUser: User | null;
}

const PASS_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/;

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'view' as UserRole,
        password: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/users/');
            if (res.ok) {
                setUsers(await res.json());
            } else {
                toast.error("Error al cargar usuarios");
            }
        } catch (e) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security Mandate: Regex Validation (Min 10, 1 Upper, 1 Num, 1 Symbol)
        if (formData.password && !PASS_REGEX.test(formData.password)) {
            toast.error("La contraseña debe tener 10+ caracteres, una mayúscula, un número y un símbolo.");
            return;
        }

        try {
            const res = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Usuario creado exitosamente");
                setShowModal(false);
                setFormData({ username: '', email: '', role: UserRole.VIEWER, password: '' });
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.error || "Error al crear usuario");
            }
        } catch (e) {
            toast.error("Error de conexión");
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Usuario eliminado");
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.error || "Error al eliminar");
            }
        } catch (e) {
            toast.error("Error de conexión");
        }
    };

    const isAdmin = currentUser?.role === UserRole.ADMIN;

    return (
        <div className="bg-slate-900 min-h-screen p-8 text-slate-100">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <ICONS.Users className="text-blue-500" /> GESTIÓN DE PERSONAL
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Panel de Seguridad & Accesos</p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center gap-2"
                        >
                            <ICONS.Plus size={18} /> Nuevo Usuario
                        </button>
                    )}
                </div>

                {/* Users Grid/Table */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-700">
                            <tr>
                                <th className="px-8 py-5">Identificador</th>
                                <th className="px-8 py-5">Contacto Email</th>
                                <th className="px-8 py-5">Nivel de Acceso</th>
                                {isAdmin && <th className="px-8 py-5 text-right">Seguridad</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-black text-slate-300">
                                                {u.username[0].toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-100">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-slate-400 font-medium">{u.email}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${u.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' :
                                            u.role === 'tech' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' :
                                                'bg-slate-700/50 text-slate-400 border-slate-600/30'
                                            }`}>
                                            {u.role === 'admin' ? 'Admin' : u.role === 'tech' ? 'Technician' : 'Consultant'}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-8 py-6 text-right">
                                            {u.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="text-slate-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <ICONS.Trash size={18} />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center text-slate-500 italic">Cargando base de datos de usuarios...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Reusable Structure */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-800 w-full max-w-md rounded-[2rem] border border-slate-700 p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Registro de Usuario</h2>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Username</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Corporativo</label>
                                <input
                                    type="email" required
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nivel de Acceso</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all appearance-none"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <option value="view">Consultant (Read-Only)</option>
                                    <option value="tech">Technician (Operational)</option>
                                    <option value="admin">Administrator (Full Control)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contraseña Inicial</label>
                                <input
                                    type="password"
                                    placeholder="Dejar vacío para enviar invitación"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-500 italic">Mín 10 chars, 1 mayúscula, 1 número, 1 símbolo.</p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
