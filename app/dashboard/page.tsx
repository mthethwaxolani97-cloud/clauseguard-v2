// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Monitor {
  id: string; firmName: string; accountType: string; accountSize: string;
    tcUrl: string; description: string; addedAt: string; status: 'monitoring' | 'changed' | 'pending';
      changeLog: { detectedAt: string; summary: string; impact: string }[];
        lastChecked: string | null; snapshotHash: string | null;
        }

        function simpleHash(str: string): string {
          let hash = 0;
            for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
              return hash.toString(36);
              }

              export default function DashboardPage() {
                const router = useRouter();
                  const [user, setUser] = useState<User | null>(null);
                    const [loading, setLoading] = useState(true);
                      const [monitors, setMonitors] = useState<Monitor[]>([]);
                        const [monitorPrompt, setMonitorPrompt] = useState('');
                          const [monitorUrl, setMonitorUrl] = useState('');
                            const [addingMonitor, setAddingMonitor] = useState(false);
                              const [toast, setToast] = useState('');
                                const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
                                  const [editUrl, setEditUrl] = useState('');
                                    const [checkingId, setCheckingId] = useState('');

                                      function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

                                        const fetchMonitors = useCallback(async (userId: string) => {
                                            const { data } = await supabase.from('account_monitors').select('*').eq('user_id', userId).order('created_at', { ascending: false });
                                                if (data) {
                                                      setMonitors(data.map(d => ({
                                                              id: d.id, firmName: d.firm_name, accountType: d.account_type, accountSize: d.account_size,
                                                                      tcUrl: d.tc_url, description: d.description || '', addedAt: d.created_at, status: d.status as any,
                                                                              changeLog: d.change_log || [], lastChecked: d.last_checked, snapshotHash: d.content_hash
                                                                                    })));
                                                                                        }
                                                                                            setLoading(false);
                                                                                              }, []);

                                                                                                useEffect(() => {
                                                                                                    supabase.auth.getSession().then(({ data: { session } }) => {
                                                                                                          if (!session?.user) { router.push('/login'); return; }
                                                                                                                setUser(session.user);
                                                                                                                      fetchMonitors(session.user.id);
                                                                                                                          });
                                                                                                                            }, [router, fetchMonitors]);

                                                                                                                              async function handleSignOut() { await supabase.auth.signOut(); router.push('/login'); }

                                                                                                                                async function handleAddMonitor() {
                                                                                                                                    if (!monitorPrompt.trim()) { showToast('⚠️ Describe your account first'); return; }
                                                                                                                                        if (!user) return;
                                                                                                                                            setAddingMonitor(true);
                                                                                                                                                try {
                                                                                                                                                      const res = await fetch('/api/monitor-parse', {
                                                                                                                                                              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptText: monitorPrompt }),
                                                                                                                                                                    });
                                                                                                                                                                          if (!res.ok) throw new Error('Parse failed');
                                                                                                                                                                                const data = await res.json();
                                                                                                                                                                                      if (data.error) throw new Error(data.error);

                                                                                                                                                                                            // THIS IS THE SUPABASE FIX - Saving to the Magic Toybox
                                                                                                                                                                                                  await supabase.from('account_monitors').insert({
                                                                                                                                                                                                          user_id: user.id, firm_name: data.firmName || '', account_type: data.accountType || 'Unknown',
                                                                                                                                                                                                                  account_size: data.accountSize || 'Not specified', tc_url: monitorUrl || data.suggestedUrl || '',
                                                                                                                                                                                                                          description: data.monitorDescription || '', status: 'monitoring', change_log: []
                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                      fetchMonitors(user.id);
                                                                                                                                                                                                                                            setMonitorPrompt(''); setMonitorUrl('');
                                                                                                                                                                                                                                                  showToast('🛡 Monitor added! ' + (data.firmName || ''));
                                                                                                                                                                                                                                                      } catch (err: unknown) { showToast('❌ ' + (err instanceof Error ? err.message : 'Failed')); }
                                                                                                                                                                                                                                                          setAddingMonitor(false);
                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                              const checkMonitorNow = useCallback(async (id: string) => {
                                                                                                                                                                                                                                                                  const m = monitors.find(x => x.id === id);
                                                                                                                                                                                                                                                                      if (!m || !m.tcUrl) { showToast('Add a T&C URL first'); return; }
                                                                                                                                                                                                                                                                          setCheckingId(id); setSelectedMonitor(null); showToast('⏳ Checking ' + m.firmName + '...');
                                                                                                                                                                                                                                                                              try {
                                                                                                                                                                                                                                                                                    let textContent = '';
                                                                                                                                                                                                                                                                                          try {
                                                                                                                                                                                                                                                                                                  const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(m.tcUrl));
                                                                                                                                                                                                                                                                                                          if (res.ok) { const html = await res.text(); textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
                                                                                                                                                                                                                                                                                                                } catch {}
                                                                                                                                                                                                                                                                                                                      const newHash = simpleHash(textContent.slice(0, 3000));

                                                                                                                                                                                                                                                                                                                            if (!m.snapshotHash) {
                                                                                                                                                                                                                                                                                                                                    await supabase.from('account_monitors').update({ content_hash: newHash, status: 'monitoring', last_checked: new Date().toISOString() }).eq('id', id);
                                                                                                                                                                                                                                                                                                                                            showToast('✓ Baseline saved for ' + m.firmName);
                                                                                                                                                                                                                                                                                                                                                  } else if (m.snapshotHash !== newHash) {
                                                                                                                                                                                                                                                                                                                                                          const entry = { detectedAt: new Date().toISOString(), summary: 'Changes detected in T&C document.', impact: '' };
                                                                                                                                                                                                                                                                                                                                                                  await supabase.from('account_monitors').update({ content_hash: newHash, status: 'changed', last_checked: new Date().toISOString(), change_log: [entry, ...m.changeLog] }).eq('id', id);
                                                                                                                                                                                                                                                                                                                                                                          showToast('⚠️ Change detected at ' + m.firmName + '!');
                                                                                                                                                                                                                                                                                                                                                                                } else {
                                                                                                                                                                                                                                                                                                                                                                                        await supabase.from('account_monitors').update({ status: 'monitoring', last_checked: new Date().toISOString() }).eq('id', id);
                                                                                                                                                                                                                                                                                                                                                                                                showToast('✓ No changes at ' + m.firmName);
                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                            if (user) fetchMonitors(user.id);
                                                                                                                                                                                                                                                                                                                                                                                                                } catch { showToast('❌ Check failed'); }
                                                                                                                                                                                                                                                                                                                                                                                                                    setCheckingId('');
                                                                                                                                                                                                                                                                                                                                                                                                                      }, [monitors, user, fetchMonitors]);

                                                                                                                                                                                                                                                                                                                                                                                                                        async function saveEditedUrl(id: string) {
                                                                                                                                                                                                                                                                                                                                                                                                                            if (editUrl && !editUrl.startsWith('http')) { showToast('⚠️ URL must start with https://'); return; }
                                                                                                                                                                                                                                                                                                                                                                                                                                await supabase.from('account_monitors').update({ tc_url: editUrl, content_hash: null, status: 'monitoring' }).eq('id', id);
                                                                                                                                                                                                                                                                                                                                                                                                                                    if (user) fetchMonitors(user.id);
                                                                                                                                                                                                                                                                                                                                                                                                                                        setSelectedMonitor(null); showToast('✓ URL updated');
                                                                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                                                                          async function deleteMonitor(id: string) {
    await supabase.from('account_monitors').delete().eq('id', id);
    if (user) fetchMonitors(user.id);
    setSelectedMonitor(null); showToast('Monitor removed');
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: 48, animation: 'shieldPulse 1.5s infinite' }}>🛡️</div></div>;

  const changedCount = monitors.filter(m => m.status === 'changed').length;

  return (
    <>
      <nav><Link href="/" className="logo"><div className="logo-shield" />ClauseGuard</Link>
        <div className="nav-links"><Link href="/" className="nav-link">Scanner</Link><Link href="/propwatch" className="nav-link">PropWatch</Link><Link href="/monitor" className="nav-link">Account Monitor</Link></div>
        <div className="nav-right"><button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button></div>
      </nav>
      <div className="dashboard-layout">
        <div className="dashboard-header"><h1>My Dashboard</h1><p>Your personal ClauseGuard account.</p></div>
        <div className="dashboard-user"><div className="dashboard-user-info">Signed in as <span className="dashboard-user-email">{user?.email}</span></div></div>
        <div className="dashboard-stats">
          <div className="stat-card"><div className="stat-number">{monitors.length}</div><div className="stat-label">Accounts Monitored</div></div>
          <div className="stat-card"><div className="stat-number" style={{ color: changedCount > 0 ? 'var(--danger)' : 'var(--accent)' }}>{changedCount}</div><div className="stat-label">Changes Detected</div></div>
        </div>
        <div className="monitor-add-card" style={{ marginBottom: 28 }}>
          <div className="monitor-add-header"><div className="monitor-add-icon">+</div><div><div className="monitor-add-title">Add Account to Monitor</div></div></div>
          <div className="monitor-add-body">
            <textarea className="monitor-prompt-input" value={monitorPrompt} onChange={e => setMonitorPrompt(e.target.value)} placeholder='"Monitor my FTMO 10k account"' rows={2} />
            <input type="text" className="url-input" style={{ width: '100%', marginTop: 6 }} value={monitorUrl} onChange={e => setMonitorUrl(e.target.value)} placeholder="T&C URL (optional)" />
            <button className="scan-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={handleAddMonitor} disabled={addingMonitor}>{addingMonitor ? '🤖 Parsing...' : '🛡 Add Monitor →'}</button>
          </div>
        </div>
        {monitors.length === 0 ? <div className="monitor-empty"><div className="empty-icon">🛡️</div><div className="empty-title">No accounts monitored yet</div></div> : (
          <div className="monitor-list">
            {monitors.map(m => (
                <div key={m.id} className="monitor-card" onClick={() => { setSelectedMonitor(m); setEditUrl(m.tcUrl || ''); }}>
                  <div className="monitor-card-top"><div><div className="monitor-card-firm">{m.firmName}</div><div className="monitor-card-account">{m.accountType}</div></div></div>
                  {m.tcUrl ? <div className="monitor-card-url">🔗 {m.tcUrl}</div> : <div className="monitor-card-url">No URL — tap to add</div>}
                  <div className="monitor-card-footer"><button className="monitor-delete-btn" onClick={e => { e.stopPropagation(); deleteMonitor(m.id); }}>✕ Remove</button></div>
                </div>
            ))}
          </div>
        )}
      </div>
      {selectedMonitor && (
        <div className="modal-overlay" onClick={() => setSelectedMonitor(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{selectedMonitor.firmName}</div><button className="modal-close" onClick={() => setSelectedMonitor(null)}>✕</button></div>
            <div style={{ padding: '16px 24px' }}>
              <input type="text" className="url-input" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="T&C URL" style={{ width: '100%', marginBottom: 10}} />
              <button className="btn btn-accent" onClick={() => saveEditedUrl(selectedMonitor.id)}>💾 Save URL</button>
              <div style={{ marginTop: 20 }}><button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => checkMonitorNow(selectedMonitor.id)}>{checkingId === selectedMonitor.id ? '⏳ Checking...' : '🔄 Check for Changes Now'}</button></div>
            </div>
          </div>
        </div>
      )}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}

