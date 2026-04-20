import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../ui/Toast';
import AuthLayout from './AuthLayout';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur de connexion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const brand = (
    <div className="text-center">
      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-ios-lg">
        <span className="text-4xl">🍺</span>
      </div>
      <h1 className="text-4xl font-bold text-white">IBar</h1>
      <p className="text-primary-200 mt-1">Vos adresses favorites</p>
    </div>
  );

  return (
    <AuthLayout brand={brand}>
      <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-3xl shadow-ios-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Connexion</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              autoComplete="email"
              className="ios-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="ios-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ios-button-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary-600 font-medium">S'inscrire</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
