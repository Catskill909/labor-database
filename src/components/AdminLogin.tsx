import { useState } from 'react';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        sessionStorage.setItem('adminToken', password);
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        onLoginSuccess();
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
            <Lock size={24} className="text-red-400" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-center mb-6">Admin Login</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter admin password"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 mb-4"
          autoFocus
        />

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Verifying...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
