// app/propwatch/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROP_FIRMS } from '@/lib/propFirms';

export default function PropwatchPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = search
    ? PROP_FIRMS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : PROP_FIRMS;

  function toggleAlert(key: string, name: string) {
    const newState = !alerts[key];
    setAlerts(prev => ({ ...prev, [key]: newState }));
    showToast(newState ? `✓ Alerts on for ${name} (email alerts in Phase 3)` : 'Alerts disabled');
  }

  function scanFirm(url: string) {
    router.push('/?url=' + encodeURIComponent(url));
  }

  function searchAnyFirm() {
    if (!search) { showToast('⚠️ Type a firm name first'); return; }
    router.push('/monitor?prompt=' + encodeURIComponent('Monitor my ' + search + ' account'));
  }

  const riskColor = (risk: number) => risk < 35 ? 'var(--safe)' : risk < 60 ? 'var(--warn)' : 'var(--danger)';

  return (
    <>
      <div className="propwatch-layout">
        <div className="propwatch-header">
          <div className="propwatch-badge">⚡ PropWatch Module</div>
          <h1>Prop Firm Intelligence</h1>
          <p>14+ pre-loaded prop firms. Get alerted the moment FTMO, Apex, or any firm changes rules that affect your funded account.</p>
          <div className="propwatch-search-wrap">
            <div className="propwatch-search-box">
              <span className="propwatch-search-icon">🔍</span>
              <input
                type="text"
                id="propwatchSearch"
                className="propwatch-search-input"
                placeholder="Search pre-loaded firms... or type any firm name in the world"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="propwatch-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>
            <button className="btn btn-accent" onClick={searchAnyFirm} style={{ whiteSpace: 'nowrap' }}>
              🌍 Any Firm →
            </button>
          </div>
          <div className="propwatch-count">
            {search ? `${filtered.length} firm${filtered.length !== 1 ? 's' : ''} match "${search}"` : `Showing all ${PROP_FIRMS.length} pre-loaded firms`}
          </div>
        </div>

          {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No firms match &ldquo;{search}&rdquo;</div>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 20 }}>You can still monitor any firm in the world.</p>
            <button className="btn btn-accent" onClick={searchAnyFirm}>🌍 Monitor &ldquo;{search}&rdquo; →</button>
          </div>
        ) : (
          <div className="firms-grid">
            {filtered.map(firm => (
              <div key={firm.key} className="firm-card" onClick={() => scanFirm(firm.url)}>
                <div className="firm-card-top">
                  <div className="firm-card-name">{firm.name}</div>
                  <span className={`firm-card-status status-${firm.status}`}>{firm.status}</span>
                </div>
                <div className="firm-card-meta">
                  <div className="firm-meta-row"><span className="firm-meta-label">Drawdown</span><span className="firm-meta-val">{firm.drawdown}</span></div>
                  <div className="firm-meta-row"><span className="firm-meta-label">Payout</span><span className="firm-meta-val">{firm.payout}</span></div>
                  <div className="firm-meta-row"><span className="firm-meta-label">News trading</span><span className="firm-meta-val">{firm.news}</span></div>
                  <div className="firm-meta-row"><span className="firm-meta-label">Risk score</span><span className="firm-meta-val" style={{ color: riskColor(firm.risk), fontWeight: 700 }}>{firm.risk}/100</span></div>
                </div>
                <div className="firm-card-footer">
                  <span className="firm-card-update">Updated {firm.updated}</span>
                  <button className="firm-alert-toggle" onClick={e => { e.stopPropagation(); toggleAlert(firm.key, firm.name); }}>
                    <div className={`toggle-switch${alerts[firm.key] ? ' on' : ''}`}><div className="toggle-knob" /></div>
                    Alerts
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer>
        <div className="footer-logo">ClauseGuard</div>
        <div>PropWatch — 14 firms monitored</div>
        <div className="footer-links" />
      </footer>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}