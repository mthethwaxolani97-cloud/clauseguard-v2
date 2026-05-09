// app/components/NavBar.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Instant cache check instead of slow network request
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // THE FIX: We removed the localStorage wipe here!
    router.push('/');
    router.refresh();
  }

  if (loading) return (
    <nav>
      <Link href="/" className="logo">
        <div className="logo-shield" />
        ClauseGuard
      </Link>
      <div className="nav-links">
        <Link href="/propwatch" className="nav-link">PropWatch</Link>
        <Link href="/monitor" className="nav-link">⚙ Account Monitor</Link>
      </div>
      <div className="nav-right">
        <div style={{ width: 120 }} /> 
      </div>
    </nav>
  );

  return (
    <nav>
      <Link href="/" className="logo">
        <div className="logo-shield" />
        ClauseGuard
      </Link>
      <div className="nav-links">
        <Link href="/propwatch" className="nav-link" style={{ color: pathname === '/propwatch' ? 'var(--ink)' : '' }}>PropWatch</Link>
        <Link href="/monitor" className="nav-link" style={{ color: pathname === '/monitor' ? 'var(--ink)' : '' }}>⚙ Account Monitor</Link>
        <Link href="/pricing" className="nav-link" style={{ color: pathname === '/pricing' ? 'var(--ink)' : '' }}>Pricing</Link>
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
            <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
            <button className="btn btn-ghost" onClick={handleSignOut} style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}>Sign Out</button>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="btn btn-ghost">My Dashboard</Link>
            <Link href="/login" className="btn btn-primary">Sign In</Link>
          </>
        )}
      </div>
    </nav>
  );
}
