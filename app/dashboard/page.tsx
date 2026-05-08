// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────
interface Monitor {
  id: string;
  firmName: string;
  accountType: string;
  accountSize: string;
  tcUrl: string;
  description: string;
  addedAt: string;
  status: 'monitoring' | 'changed' | 'pending';
  changeLog: { detectedAt: string; summary: string; impact: string }[];
  lastChecked: string | null;
  snapshotHash: string | null;
}

const STORAGE_KEY = 'clauseguard_monitors_v2';

function loadMonitors(): Monitor[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveMonitors(monitors: Monitor[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(monitors)); } catch {}
}
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
  return hash.toString(36);
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // Load user and monitors
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUser(data.user);
      setMonitors(loadMonitors());
      setLoading(false);
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // ─── Add monitor ────────────────────────────────────────
  async function handleAddMonitor() {
    if (!monitorPrompt.trim()) { showToast('⚠️ Describe your account first'); return; }
    setAddingMonitor(true);
    try {
      const res = await fetch('/api/monitor-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: monitorPrompt }),
      });
      if (!res.ok) throw new Error('Parse failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newMonitor: Monitor = {
        id: 'mon_' + Date.now(),
        firmName: data.firmName || '',
        accountType: data.accountType || 'Unknown',
        accountSize: data.accountSize || 'Not specified',
        tcUrl: monitorUrl || data.suggestedUrl || '',
        description: data.monitorDescription || '',
        addedAt: new Date().toISOString(),
        status: 'monitoring',
        changeLog: [],
        lastChecked: null,
        snapshotHash: null,
      };
      const updated = [newMonitor, ...monitors];
      setMonitors(updated);
      saveMonitors(updated);
      setMonitorPrompt('');
      setMonitorUrl('');
      showToast('🛡 Monitor added! ' + newMonitor.firmName + ' ' + newMonitor.accountType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      showToast('❌ ' + msg);
    }
    setAddingMonitor(false);
  }

  // ─── Check for changes ───────────────────────────────────
  const checkMonitorNow = useCallback(async (id: string) => {
    const m = monitors.find(x => x.id === id);
    if (!m || !m.tcUrl) { showToast('Add a T&C URL first'); return; }
    setCheckingId(id);
    setSelectedMonitor(null);
    showToast('⏳ Checking ' + m.firmName + ' for changes...');

    try {
      let textContent = '';
      try {
        const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(m.tcUrl));
        if (res.ok) { const html = await res.text(); textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
      } catch {}

      const newHash = simpleHash(textContent.slice(0, 3000));

      const updatedMonitors = monitors.map(mon => {
        if (mon.id !== id) return mon;
        if (!mon.snapshotHash) {
          showToast('✓ Baseline saved for ' + mon.firmName);
          return { ...mon, snapshotHash: newHash, status: 'monitoring' as const, lastChecked: new Date().toISOString() };
        }
        if (mon.snapshotHash !== newHash) {
          const entry = { detectedAt: new Date().toISOString(), summary: 'Changes detected in T&C document.', impact: '' };
          showToast('⚠️ Change detected at ' + mon.firmName + '!');
          return { ...mon, snapshotHash: newHash, status: 'changed' as const, lastChecked: new Date().toISOString(), changeLog: [entry, ...mon.changeLog] };
        }
        showToast('✓ No changes at ' + mon.firmName);
        return { ...mon, status: 'monitoring' as const, lastChecked: new Date().toISOString() };
      });

      setMonitors(updatedMonitors);
      saveMonitors(updatedMonitors);
    } catch {
      showToast('❌ Check failed');
    }
    setCheckingId('');
  }, [monitors]);

  // ─── Save edited URL ─────────────────────────────────────
  function saveEditedUrl(id: string) {
    if (editUrl && !editUrl.startsWith('http')) { showToast('⚠️ URL must start with https://'); return; }
    const updated = monitors.map(m => m.id === id ? { ...m, tcUrl: editUrl, snapshotHash: null, status: 'monitoring' as const } : m);
    setMonitors(updated);
    saveMonitors(updated);
    setSelectedMonitor(updated.find(m => m.id === id) || null);
    showToast('✓ URL updated — click Check to set new baseline');
  }

  function deleteMonitor(id: string) {
    const updated = monitors.filter(m => m.id !== id);
    setMonitors(updated);
    saveMonitors(updated);
    setSelectedMonitor(null);
    showToast('Monitor removed');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'shieldPulse 1.5s infinite' }}>🛡️</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20 }}>Loading dashboard...</div>
      </div>
    </div>
  );

  const changedCount = monitors.filter(m => m.status === 'changed').length;

  return (
    <>
      {/* Nav */}
      <nav>
        <Link href="/" className="logo">
          <div className="logo-shield" />
          ClauseGuard
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Scanner</Link>
          <Link href="/propwatch" className="nav-link">PropWatch</Link>
          <Link href="/monitor" className="nav-link">Account Monitor</Link>
        </div>
        <div className="nav-right">
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

         <div className="dashboard-layout">
        {/* Header */}
        <div className="dashboard-header">
          <h1>My Dashboard</h1>
          <p>Your personal ClauseGuard account — scan history, monitored accounts, and alerts.</p>
        </div>

        {/* User info bar */}
        <div className="dashboard-user">
          <div className="dashboard-user-info">
            Signed in as <span className="dashboard-user-email">{user?.email}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {changedCount > 0 && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                ⚠ {changedCount} change{changedCount > 1 ? 's' : ''} detected
              </div>
            )}
            <Link href="/" className="btn btn-accent" style={{ fontSize: 12, padding: '8px 16px' }}>+ New Scan</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{monitors.length}</div>
            <div className="stat-label">Accounts Monitored</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: changedCount > 0 ? 'var(--danger)' : 'var(--accent)' }}>{changedCount}</div>
            <div className="stat-label">Changes Detected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{monitors.filter(m => m.lastChecked).length}</div>
            <div className="stat-label">Checks Run</div>
          </div>
        </div>

        {/* Add Monitor */}
        <div className="monitor-add-card" style={{ marginBottom: 28 }}>
          <div className="monitor-add-header">
            <div className="monitor-add-icon">+</div>
            <div>
              <div className="monitor-add-title">Add Account to Monitor</div>
              <div className="monitor-add-sub">Describe your account in plain English — AI sets it up</div>
            </div>
          </div>
          <div className="monitor-add-body">
            <textarea
              className="monitor-prompt-input"
              value={monitorPrompt}
              onChange={e => setMonitorPrompt(e.target.value)}
              placeholder='"Monitor my FTMO Standard Challenge $10,000 account"'
              rows={2}
            />
            <div className="monitor-url-field">
              <label className="monitor-url-label">T&C URL (optional — AI will guess if you skip)</label>
              <input type="text" className="url-input" style={{ width: '100%', marginTop: 6 }} value={monitorUrl} onChange={e => setMonitorUrl(e.target.value)} placeholder="https://example.com/terms" />
            </div>
            <button className="scan-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={handleAddMonitor} disabled={addingMonitor}>
              {addingMonitor ? '🤖 Parsing...' : '🛡 Add Monitor →'}
            </button>
          </div>
        </div>

        {/* Monitor list */}
        {monitors.length === 0 ? (
          <div className="monitor-empty">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">No accounts monitored yet</div>
            <div className="empty-text">Add your first account above.</div>
          </div>
        ) : (
          <div className="monitor-list">
            {monitors.map(m => {
              const statusDot = m.status === 'changed' ? 'status-changed' : m.status === 'pending' ? 'status-pending' : 'status-monitoring';
              const badge = m.status === 'changed'
                ? <span className="monitor-badge-new">⚠ Changed</span>
                : <span className="monitor-badge-ok">✓ OK</span>;
              return (
                <div key={m.id} className="monitor-card" onClick={() => { setSelectedMonitor(m); setEditUrl(m.tcUrl || ''); }}>
                  <div className="monitor-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div className={`monitor-status-dot ${statusDot}`} />
                      <div className="monitor-card-info" style={{ minWidth: 0 }}>
                        <div className="monitor-card-firm">{m.firmName}</div>
                        <div className="monitor-card-account">{m.accountType}{m.accountSize !== 'Not specified' ? ' · ' + m.accountSize : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{badge}</div>
                  </div>
                  <div className="monitor-card-meta">
                    <div className="monitor-meta-item">🗓 Added <strong>{new Date(m.addedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</strong></div>
                    {m.lastChecked && <div className="monitor-meta-item">🔄 <strong>{timeAgo(m.lastChecked)}</strong></div>}
                    {m.changeLog.length > 0 && <div className="monitor-meta-item">⚠ <strong>{m.changeLog.length} change{m.changeLog.length > 1 ? 's' : ''}</strong></div>}
                  </div>
                  {m.tcUrl
                    ? <div className="monitor-card-url">🔗 {m.tcUrl}</div>
                    : <div className="monitor-card-url" style={{ color: 'var(--ink-muted)' }}>No URL — tap to add one</div>}
                  <div className="monitor-card-footer">
                    <span className="monitor-card-date">{m.description || m.firmName + ' ' + m.accountType}</span>
                    <button className="monitor-delete-btn" onClick={e => { e.stopPropagation(); deleteMonitor(m.id); }}>✕ Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monitor Detail Modal */}
      {selectedMonitor && (
        <div className="modal-overlay" onClick={() => setSelectedMonitor(null)}>
          <div className="modal-card modal-card-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selectedMonitor.firmName} — {selectedMonitor.accountType}</div>
              <button className="modal-close" onClick={() => setSelectedMonitor(null)}>✕</button>
            </div>

            <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="parsed-result" style={{ marginBottom: 16 }}>
                <div className="parsed-row"><span className="parsed-label">Firm</span><span className="parsed-val">{selectedMonitor.firmName}</span></div>
                <div className="parsed-row"><span className="parsed-label">Account</span><span className="parsed-val">{selectedMonitor.accountType}</span></div>
                <div className="parsed-row"><span className="parsed-label">Size</span><span className="parsed-val">{selectedMonitor.accountSize}</span></div>
                <div className="parsed-row" style={{ flexDirection: 'column', gap: 6 }}>
                  <span className="parsed-label">T&C URL</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="text" className="url-input" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://firm.com/terms" style={{ flex: 1, fontSize: 11 }} onClick={e => e.stopPropagation()} />
                    <button className="btn btn-accent" style={{ padding: '8px 14px', fontSize: 12 }} onClick={e => { e.stopPropagation(); saveEditedUrl(selectedMonitor.id); }}>💾 Save</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 24px 6px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-muted)' }}>Change History</div>
            </div>

            <div className="change-log">
              {selectedMonitor.changeLog.length > 0
                ? selectedMonitor.changeLog.map((c, i) => (
                  <div key={i} className="change-entry">
                    <div className="change-date">📅 {new Date(c.detectedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="change-summary-text">{c.summary}</div>
                    {c.impact && <div className="change-impact">💰 {c.impact}</div>}
                  </div>
                ))
                : <div className="no-changes">✅ No changes detected yet. Click "Check Now" to run a check.</div>}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedMonitor.tcUrl
                ? <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={() => checkMonitorNow(selectedMonitor.id)} disabled={checkingId === selectedMonitor.id}>
                    {checkingId === selectedMonitor.id ? '⏳ Checking...' : '🔄 Check for Changes Now'}
                  </button>
                : <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => showToast('Add a T&C URL first')}>🔄 Add URL to Enable Checking</button>}
              <button className="btn btn-ghost" onClick={() => setSelectedMonitor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      <footer>
        <div className="footer-logo">ClauseGuard</div>
        <div>Phase 2 — Next.js + Supabase</div>
        <div className="footer-links">
          <Link href="/" className="footer-link">Scanner</Link>
          <Link href="/login" className="footer-link">Account</Link>
        </div>
      </footer>
    </>
  );
}