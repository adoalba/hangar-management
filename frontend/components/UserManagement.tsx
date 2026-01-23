
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ICONS } from '../constants';

const PASS_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{10,}$/;

const UserManagement: React.FC<{ t: any; token: string; addToast: (msg: string, type?: 'success' | 'error') => void }> = ({ t, token, addToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
      else addToast("Error al cargar usuarios", "error");
    } catch (e) { addToast("Error de red al cargar usuarios", "error"); }
  };

  const openNewUserForm = async () => {
    setEditingUser(null);
    setFormData({ role: UserRole.TECHNICIAN, active: true, mustChangePassword: true, suspended: false });
    setPassword('');
    setFormError('');
    setShowForm(true);
    await fetchAndSetSecurePassword();
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setPassword('');
    setFormError('');
    setShowForm(true);
  };

  const fetchAndSetSecurePassword = async () => {
    try {
      const res = await fetch('/api/users/generate-password', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();

      if (res.ok) {
        setPassword(data.password);
      } else {
        if (res.status === 401) {
          setFormError("Sesión expirada o inválida. Por favor, cierre sesión e inicie de nuevo.");
        } else {
          setFormError(data.message || "Error al generar clave segura en el servidor.");
        }
      }
    } catch (e) {
      setFormError("Error de conexión con el generador de claves.");
    }
  };

  const handleSave = async () => {
    setIsProcessing(true);
    setFormError('');

    const method = editingUser ? 'PUT' : 'POST';
    const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const body = editingUser ? formData : { ...formData, password };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        const emailStatus = data.email_status;

        if (emailStatus && !emailStatus.success) {
          addToast(`Usuario creado, pero hubo un error al enviar el email: ${emailStatus.message}`, 'error');
        } else {
          addToast(editingUser ? 'Usuario actualizado' : 'Usuario creado con éxito', 'success');
        }

        fetchUsers();
        setShowForm(false);
      } else {
        setFormError((await res.json()).message || 'Error del servidor');
      }
    } catch (e) {
      setFormError('Error de conexión de red');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSuspension = async (user: User) => {
    const updatedUser = { ...user, suspended: !user.suspended };
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedUser)
      });
      if (res.ok) {
        addToast(`Usuario ${updatedUser.suspended ? 'suspendido' : 'activado'}`, 'success');
        fetchUsers();
      } else addToast("Error al cambiar estado", "error");
    } catch (e) { addToast("Error de red", "error"); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Usuario eliminado permanentemente', 'success');
        setUsers(users.filter(u => u.id !== confirmDelete.id));
      } else addToast("Error al eliminar", "error");
    } catch (e) { addToast("Error de red", "error"); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Gestión de Personal</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Control de Acceso y Roles</p>
        </div>
        <button
          onClick={openNewUserForm}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20"
        >
          <ICONS.UserPlus size={16} />
          {t.create_user}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-75 duration-300">
            <h2 className="text-2xl font-black mb-6">{editingUser ? t.edit_user : t.create_user}</h2>
            <div className="space-y-4">
              <input placeholder="Nombre Completo" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Username" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                <select
                  className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white"
                  value={formData.role || UserRole.TECHNICIAN}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.ADMIN}>Administrador</option>
                  <option value={UserRole.TECHNICIAN}>Técnico</option>
                  <option value={UserRole.VIEWER}>Consulta</option>
                </select>
              </div>
              <input type="email" placeholder="Email Corporativo" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />

              {!editingUser && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-indigo-500/20 rounded-xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Clave Segura (Generada por Servidor)</p>
                    <p className="font-mono text-indigo-400 font-bold">{password || "Generando..."}</p>
                    <button onClick={fetchAndSetSecurePassword} className="text-[9px] text-slate-600 underline mt-2 uppercase font-bold">Regenerar</button>
                  </div>

                  <label className="flex items-center gap-3 p-3 bg-indigo-600/5 border border-indigo-600/20 rounded-xl cursor-pointer hover:bg-indigo-600/10 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.sendCredentials || false}
                      onChange={e => setFormData({ ...formData, sendCredentials: e.target.checked })}
                    />
                    <div className="flex items-center gap-2">
                      <ICONS.Mail size={14} className="text-indigo-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Enviar credenciales por email</span>
                    </div>
                  </label>
                </div>
              )}

              {formError && <div className="text-rose-500 text-xs font-bold p-2">{formError}</div>}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowForm(false)} className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold">{t.cancel}</button>
              <button onClick={handleSave} disabled={isProcessing} className="flex-1 py-4 bg-indigo-600 rounded-2xl font-black disabled:opacity-50">{isProcessing ? 'Procesando...' : (editingUser ? "Guardar Cambios" : t.create_user)}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-75 duration-300 text-center">
            <ICONS.AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
            <h2 className="text-xl font-black text-white mb-2">¿Confirmar Eliminación?</h2>
            <p className="text-sm text-slate-400 mb-6">Esta acción es irreversible y eliminará a <b className="text-white">{confirmDelete.name}</b> permanentemente.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-slate-800 rounded-2xl font-bold">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-600 rounded-2xl font-black">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800"><th className="p-4 text-left text-xs text-slate-500 uppercase">Usuario</th><th className="p-4 text-left text-xs text-slate-500 uppercase">Rol</th><th className="p-4 text-left text-xs text-slate-500 uppercase">Estado</th><th className="p-4 text-right text-xs text-slate-500 uppercase">Acciones</th></tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-4"><div className="font-bold">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></td>
                <td className="p-4">
                  <div className={`flex items-center gap-2 text-xs font-bold uppercase ${user.role === UserRole.ADMIN ? 'text-indigo-400' : user.role === UserRole.TECHNICIAN ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {user.role === UserRole.ADMIN ? <ICONS.Shield size={12} /> : user.role === UserRole.TECHNICIAN ? <ICONS.Green size={12} /> : <ICONS.Eye size={12} />}
                    {user.role === UserRole.ADMIN ? 'Administrador' : user.role === UserRole.TECHNICIAN ? 'Técnico' : 'Consulta'}
                  </div>
                </td>
                <td className="p-4"><span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full ${user.suspended ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{user.suspended ? 'Suspendido' : 'Activo'}</span></td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => toggleSuspension(user)} className="p-2 hover:bg-slate-700 rounded-lg" title={user.suspended ? 'Activar' : 'Suspender'}>{user.suspended ? <ICONS.UserCheck size={16} /> : <ICONS.UserX size={16} />}</button>
                    <button onClick={() => openEditForm(user)} className="p-2 hover:bg-slate-700 rounded-lg" title="Editar"><ICONS.Edit size={16} /></button>
                    <button onClick={() => setConfirmDelete(user)} className="p-2 text-slate-600 hover:text-rose-500 rounded-lg" title="Eliminar"><ICONS.Trash size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
