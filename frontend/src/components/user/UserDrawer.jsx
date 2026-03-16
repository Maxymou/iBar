import { useState, useRef } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import api from '../../services/api';
import { formatDate } from '../../utils/navigation';

const UserDrawer = ({ isOpen, onClose }) => {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const avatarRef = useRef();

  const openEdit = () => {
    setForm({ name: user.name, email: user.email });
    setEditOpen(true);
    onClose();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      if (form.name !== user.name) fd.append('name', form.name);
      if (form.email !== user.email) fd.append('email', form.email);
      if (form.avatar) fd.append('avatar', form.avatar);

      const res = await api.put('/users/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data);
      setEditOpen(false);
      toast('Profil mis à jour', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwOpen(false);
      setPwForm({ current: '', next: '', confirm: '' });
      toast('Mot de passe modifié', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[150]">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />

          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-ios-lg
                          animate-slide-in-left flex flex-col"
               style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-5 pt-8 pb-6">
              <div className="flex justify-end mb-4">
                <button onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  ×
                </button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center
                                overflow-hidden mb-3 border-2 border-white/30">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-white font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-bold text-lg">{user.name}</h3>
                <p className="text-primary-200 text-sm">{user.email}</p>
                <p className="text-primary-300 text-xs mt-1">
                  Membre depuis {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <DrawerItem icon="✏️" label="Modifier le profil" onClick={openEdit} />
              <DrawerItem icon="🔑" label="Changer le mot de passe" onClick={() => { setPwOpen(true); onClose(); }} />

              {/* Theme selector */}
              <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Apparence
                </p>
                <div className="flex gap-2">
                  {[['light', '☀️', 'Clair'], ['auto', '🔄', 'Auto'], ['dark', '🌙', 'Sombre']].map(([val, icon, label]) => (
                    <button key={val} onClick={() => setTheme(val)}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                              ${theme === val
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
              <DrawerItem icon="🚪" label="Se déconnecter" onClick={logout} danger />
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Modifier le profil"
             footer={
               <button onClick={handleEditSubmit} disabled={loading}
                       className="ios-button-primary w-full disabled:opacity-50">
                 {loading ? 'Enregistrement...' : 'Enregistrer'}
               </button>
             }>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Photo de profil</label>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                   onChange={e => setForm(p => ({ ...p, avatar: e.target.files[0] }))} />
            <button type="button" onClick={() => avatarRef.current.click()}
                    className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm">
              {form.avatar ? form.avatar.name : '📷 Choisir une photo'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nom</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                   className="ios-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                   className="ios-input" />
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={pwOpen} onClose={() => setPwOpen(false)} title="Changer le mot de passe"
             footer={
               <button onClick={handlePasswordSubmit} disabled={loading}
                       className="ios-button-primary w-full disabled:opacity-50">
                 {loading ? 'Modification...' : 'Modifier'}
               </button>
             }>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe actuel</label>
            <input type="password" value={pwForm.current}
                   onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                   className="ios-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
            <input type="password" value={pwForm.next}
                   onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                   className="ios-input" />
            {pwForm.next && <PasswordStrength password={pwForm.next} />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwForm.confirm}
                   onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                   className="ios-input" />
          </div>
        </form>
      </Modal>
    </>
  );
};

const PasswordStrength = ({ password }) => {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let level, label, colorBar, colorText;
  if (!hasLength) {
    level = 0; label = 'Trop court'; colorBar = 'bg-red-500'; colorText = 'text-red-600';
  } else if (hasUpper && (hasDigit || hasSpecial)) {
    level = 2; label = 'Fort'; colorBar = 'bg-green-500'; colorText = 'text-green-600';
  } else {
    level = 1; label = 'Moyen'; colorBar = 'bg-orange-500'; colorText = 'text-orange-600';
  }

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 rounded-full ${i <= level ? colorBar : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 font-medium ${colorText}`}>{label}</p>
    </div>
  );
};

const DrawerItem = ({ icon, label, onClick, danger }) => (
  <button onClick={onClick}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                      transition-colors active:bg-gray-50 dark:active:bg-gray-800
                      ${danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export default UserDrawer;
