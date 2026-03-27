import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthPage: React.FC = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, full_name: fullName });
      }

      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-full bg-black text-white items-center justify-center mb-3">
            <Brain size={28} />
          </div>
          <h1 className="text-2xl font-semibold">Zenify</h1>
          <p className="text-gray-600 mt-1">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2 hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="mt-4 w-full text-sm text-gray-700 hover:text-black"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </motion.div>
    </div>
  );
};

export default AuthPage;
