import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../ui/Toast';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    if (form.password.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur lors de l\'inscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-700 to-primary-900 flex flex-col items-center justify-center p-6"
         style={{ minHeight: '100dvh', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="mb-6 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-ios-lg">
          <span className="text-4xl">🍸</span>
        </div>
        <h1 className="text-4xl font-bold text-white">IBar</h1>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-ios-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Créer un compte</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nom</label>
            <input type="text" value={form.name} onChange={set('name')}
                   placeholder="Votre nom" required className="ios-input" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')}
                   placeholder="votre@email.com" required autoComplete="email" className="ios-input" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Mot de passe</label>
            <input type="password" value={form.password} onChange={set('password')}
                   placeholder="••••••••" required className="ios-input" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Confirmer le mot de passe</label>
            <input type="password" value={form.confirm} onChange={set('confirm')}
                   placeholder="••••••••" required className="ios-input" />
          </div>

          <button type="submit" disabled={loading}
                  className="ios-button-primary w-full mt-2 disabled:opacity-50">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-600 font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
