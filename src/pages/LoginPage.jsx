import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      // Provide friendly messages for common Supabase auth errors
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Make sure this user exists in your Supabase Authentication dashboard.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
      } else if (msg.toLowerCase().includes('network')) {
        setError('Network error. Check your internet connection and Supabase URL.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb orb1" />
      <div className="login-bg-orb orb2" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="material-icons">shield</span>
          </div>
          <h1 className="login-title">CrimeLens</h1>
          <p className="login-subtitle">
            Karnataka State Police<br />SCRB Intelligence Platform
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="analyst@ksp.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  padding: 0,
                }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4, gap: 8 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Authenticating…
              </>
            ) : (
              <>
                <span className="material-icons" style={{ fontSize: 17 }}>lock</span>
                Sign In to Platform
              </>
            )}
          </button>

          <div
            className="login-hint"
            style={{ border: '1px solid rgba(99,179,237,0.2)', background: 'rgba(99,179,237,0.05)' }}
          >
            <span style={{ color: '#63b3ed', fontWeight: 600 }}>Live Database Connected.</span>{' '}
            Sign in with a user account from your{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Supabase Authentication</strong>{' '}
            dashboard. Go to{' '}
            <em>Authentication → Users → Add user</em> if you haven't created one yet.
          </div>
        </form>
      </div>
    </div>
  );
}
