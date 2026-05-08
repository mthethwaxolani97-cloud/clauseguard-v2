// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError(''); setSuccess('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(''); setSuccess('');
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess('Account created! Check your email to confirm, then sign in.');
    setTab('signin');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">🛡 ClauseGuard</div>
        <div className="auth-sub">AI T&C Intelligence Platform</div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}>Sign In</button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}>Create Account</button>
        </div>

        {error && <div className="auth-error">⚠ {error}</div>}
        {success && <div className="auth-success">✓ {success}</div>}

        <div className="auth-field">
          <label className="auth-label">Email address</label>
          <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'} onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())} />
        </div>

        <button className="auth-btn" disabled={loading} onClick={tab === 'signin' ? handleSignIn : handleSignUp}>
          {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)' }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to scanner</Link>
        </div>
      </div>
    </div>
  );
}
