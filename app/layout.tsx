// app/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import './globals.css';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}

function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // THE FIX: Removed localStorage wipe.
    router.push('/');
    router.refresh();
  }

  return (
    <nav>
      <Link href="/" className="logo">
        <div className="logo-shield" />
        ClauseGuard
      </Link>
      <div className="nav-links">
        <Link href="/propwatch" className="nav-link">PropWatch</Link>
        <Link href="/monitor" className="nav-link">⚙ Account Monitor</Link>
        <Link href="/" className="nav-link">How It Works</Link>
      </div>
      <div className="nav-right">
        {loading ? (
          <div style={{ width: 180 }} />
        ) : user ? (
          <>
            <Link href="/dashboard" className="btn btn-ghost">My Dashboard</Link>
            <button className="btn btn-primary" onClick={handleSignOut}>Sign Out</button>
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
