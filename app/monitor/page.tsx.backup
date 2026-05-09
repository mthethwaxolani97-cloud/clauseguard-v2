// app/monitor/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

// ─── Inner component — needs Suspense wrapper because of useSearchParams ───
function MonitorPageInner() {
  const searchParams = useSearchParams();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [prompt, setPrompt] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [checkingId, setCheckingId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setMonitors(loadMonitors());
    const prePrompt = searchParams.get('prompt');
    if (prePrompt) setPrompt(prePrompt);
  }, [searchParams]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleAdd() {
    if (!prompt.trim()) { showToast('⚠️ Describe your account first'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/monitor-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: prompt }),
      });
      if (!res.ok) throw new Error('Parse failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newMonitor: Monitor = {
        id: 'mon_' + Date.now(),
        firmName: data.firmName || '',
        accountType: data.accountType || 'Unknown',
        accountSize: data.accountSize || 'Not specified',
        tcUrl: urlInput || data.suggestedUrl || '',
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
      setPrompt('');
      setUrlInput('');
      showToast('🛡 Monitor added! ' + newMonitor.firmName);
    } catch (err: unknown) {
      showToast('❌ ' + (err instanceof Error ? err.message : 'Failed'));
    }
    setAdding(false);
  }

  const checkNow = useCallback(async (id: string) => {
    const m = monitors.find(x => x.id === id);
    if (!m || !m.tcUrl) { showToast('Add a T&C URL first'); return; }
    setCheckingId(id);
    setSelectedMonitor(null);
    showToast('⏳ Checking ' + m.firmName + '...');
    try {
      let text = '';
      try {
        const r = await fetch('https://corsproxy.io/?' + encodeURIComponent(m.tcUrl));
        if (r.ok) {
          text = (await r.text())
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch { /* fetch failed — no changes detectable */ }
      const newHash = simpleHash(text.slice(0, 3000));
      const updated = monitors.map(mon => {
        if (mon.id !== id) return mon;
        if (!mon.snapshotHash) {
          showToast('✓ Baseline saved for ' + mon.firmName);
          return { ...mon, snapshotHash: newHash, status: 'monitoring' as const, lastChecked: new Date().toISOString() };
        }
        if (mon.snapshotHash !== newHash) {
          showToast('⚠️ Change at ' + mon.firmName + '!');
          return {
            ...mon,
            snapshotHash: newHash,
            status: 'changed' as const,
            lastChecked: new Date().toISOString(),
            changeLog: [
              { detectedAt: new Date().toISOString(), summary: 'Changes detected in T&C document.', impact: '' },
              ...mon.changeLog,
            ],
          };
        }
        showToast('✓ No changes at ' + mon.firmName);
        return { ...mon, status: 'monitoring' as const, lastChecked: new Date().toISOString() };
      });
      setMonitors(updated);
      saveMonitors(updated);
    } catch {
      showToast('❌ Check failed');
    }
    setCheckingId('');
  }, [monitors]);

  function deleteMonitor(id: string) {
    const updated = monitors.filter(m => m.id !== id);
    setMonitors(updated);
    saveMonitors(updated);
    setSelectedMonitor(null);
    showToast('Monitor removed');
  }

  function saveUrl(id: string) {
    if (editUrl && !editUrl.startsWith('http')) {
      showToast('URL must start with https://');
      return;
    }
    const updated = monitors.map(m =>
      m.id === id
        ? { ...m, tcUrl: editUrl, snapshotHash: null, status: 'monitoring' as const }
        : m
    );
    setMonitors(updated);
    saveMonitors(updated);
    setSelectedMonitor(updated.find(m => m.id === id) || null);
    showToast('✓ URL saved — click Check to set new baseline');
  }

  return (
    <>
      <div className="monitor-layout">
        <div className="monitor-page-header">
          <div className="propwatch-badge">🛡 Account Monitor</div>
          <h1>My Monitored Accounts</h1>
          <p>
            Tell ClauseGuard which specific account you are on. We track that
            page and show you what changed — and what it means for your money.
          </p>
        </div>

        {/* ── Add monitor card ── */}
        <div className="monitor-add-card">
          <div className="monitor-add-header">
            <div className="monitor-add-icon">+</div>
            <div>
              <div className="monitor-add-title">Add Account to Monitor</div>
              <div className="monitor-add-sub">
                Describe your account in plain English — AI sets it up
              </div>
            </div>
          </div>
          <div className="monitor-add-body">
            <textarea
              className="monitor-prompt-input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                '"Monitor my Blue Guardian Instant Starter $5000 account"\n' +
                '"Watch FTMO Standard Challenge 10k"\n' +
                '"Track Apex Trader futures funded account"'
              }
              rows={3}
            />
            <div className="monitor-url-field">
              <label className="monitor-url-label">
                T&amp;C URL (optional — AI will guess if you skip)
              </label>
              <input
                type="text"
                className="url-input"
                style={{ width: '100%', marginTop: 6 }}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/terms"
              />
            </div>
            <div className="monitor-examples" style={{ marginTop: 10 }}>
              <span className="monitor-example-label">Try:</span>
              {[
                { label: 'Blue Guardian', text: 'Monitor my Blue Guardian Instant Starter $5000 account' },
                { label: 'FTMO 10k',      text: 'Watch FTMO Standard Challenge $10,000' },
                { label: 'Apex Futures',  text: 'Track Apex Trader futures funded account' },
              ].map(ex => (
                <button key={ex.label} className="quick-pick" onClick={() => setPrompt(ex.text)}>
                  {ex.label}
                </button>
              ))}
            </div>
            <button
              className="scan-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? '🤖 Setting up...' : '🛡 Add Monitor →'}
            </button>
          </div>
        </div>

        {/* ── Monitor list ── */}
        {monitors.length === 0 ? (
          <div className="monitor-empty">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">No accounts monitored yet</div>
            <div className="empty-text">
              Add your first account above. Type something like &ldquo;Monitor
              my FTMO Standard 10k challenge&rdquo; and ClauseGuard will track
              it for you.
            </div>
          </div>
        ) : (
          <div className="monitor-list">
            {monitors.map(m => {
              const dot =
                m.status === 'changed'
                  ? 'status-changed'
                  : m.status === 'pending'
                  ? 'status-pending'
                  : 'status-monitoring';
              const badge =
                m.status === 'changed' ? (
                  <span className="monitor-badge-new">⚠ Changed</span>
                ) : (
                  <span className="monitor-badge-ok">✓ OK</span>
                );
              return (
                <div
                  key={m.id}
                  className="monitor-card"
                  onClick={() => { setSelectedMonitor(m); setEditUrl(m.tcUrl || ''); }}
                >
                  <div className="monitor-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <div className={`monitor-status-dot ${dot}`} />
                      <div>
                        <div className="monitor-card-firm">{m.firmName}</div>
                        <div className="monitor-card-account">
                          {m.accountType}
                          {m.accountSize !== 'Not specified' ? ' · ' + m.accountSize : ''}
                        </div>
                      </div>
                    </div>
                    {badge}
                  </div>
                  <div className="monitor-card-meta">
                    <div className="monitor-meta-item">
                      🗓{' '}
                      <strong>
                        {new Date(m.addedAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          })}
                      </strong>
                    </div>
                    {m.lastChecked && (
                      <div className="monitor-meta-item">
                        🔄 <strong>{timeAgo(m.lastChecked)}</strong>
                      </div>
                    )}
                    {m.changeLog.length > 0 && (
                      <div className="monitor-meta-item">
                        ⚠{' '}
                        <strong>
                          {m.changeLog.length} change
                          {m.changeLog.length > 1 ? 's' : ''}
                        </strong>
                      </div>
                    )}
                  </div>
                  {m.tcUrl ? (
                    <div className="monitor-card-url">🔗 {m.tcUrl}</div>
                  ) : (
                    <div
                      className="monitor-card-url"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      No URL — tap to add
                    </div>
                  )}
                  <div className="monitor-card-footer">
                    <span className="monitor-card-date">
                      {m.description || m.firmName}
                    </span>
                    <button
                      className="monitor-delete-btn"
                      onClick={e => { e.stopPropagation(); deleteMonitor(m.id); }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selectedMonitor && (
        <div className="modal-overlay" onClick={() => setSelectedMonitor(null)}>
          <div className="modal-card modal-card-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {selectedMonitor.firmName} — {selectedMonitor.accountType}
              </div>
              <button className="modal-close" onClick={() => setSelectedMonitor(null)}>
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="parsed-result" style={{ marginBottom: 16 }}>
                <div className="parsed-row">
                  <span className="parsed-label">Firm</span>
                  <span className="parsed-val">{selectedMonitor.firmName}</span>
                </div>
                <div className="parsed-row">
                  <span className="parsed-label">Account</span>
                  <span className="parsed-val">{selectedMonitor.accountType}</span>
                </div>
                <div className="parsed-row">
                  <span className="parsed-label">Size</span>
                  <span className="parsed-val">{selectedMonitor.accountSize}</span>
                </div>
                <div className="parsed-row" style={{ flexDirection: 'column', gap: 6 }}>
                  <span className="parsed-label">T&amp;C URL</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="url-input"
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      placeholder="https://firm.com/terms"
                      style={{ flex: 1, fontSize: 11 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <button
                      className="btn btn-accent"
                      style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                      onClick={e => { e.stopPropagation(); saveUrl(selectedMonitor.id); }}
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 24px 6px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-muted)' }}>
                Change History
              </div>
            </div>

            <div className="change-log">
              {selectedMonitor.changeLog.length > 0 ? (
                selectedMonitor.changeLog.map((c, i) => (
                  <div key={i} className="change-entry">
                    <div className="change-date">
                      📅{' '}
                      {new Date(c.detectedAt).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="change-summary-text">{c.summary}</div>
                    {c.impact && (
                      <div className="change-impact">💰 {c.impact}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-changes">
                  ✅ No changes yet. Click &ldquo;Check Now&rdquo; below to run your first check.
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedMonitor.tcUrl ? (
                <button
                  className="btn btn-accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={checkingId === selectedMonitor.id}
                  onClick={() => checkNow(selectedMonitor.id)}
                >
                  {checkingId === selectedMonitor.id
                    ? '⏳ Checking...'
                    : '🔄 Check for Changes Now'}
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => showToast('Save a T&C URL above first')}
                >
                  🔄 Add URL to Enable Checking
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelectedMonitor(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <div className="footer-logo">ClauseGuard</div>
        <div>Account Monitor — {monitors.length} tracked</div>
        <div className="footer-links" />
      </footer>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}

// ─── Outer export — wraps inner in Suspense (required for useSearchParams) ───
export default function MonitorPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '100px 40px', fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: 'var(--ink-muted)' }}>
          Loading...
        </div>
      }
    >
      <MonitorPageInner />
    </Suspense>
  );
}
