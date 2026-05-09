// app/page.tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { PROP_FIRMS } from '@/lib/propFirms';

// ─── Types ───────────────────────────────────────────────
interface Clause {
  title: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}
interface ScanResult {
  siteName: string;
  riskScore: number;
  summary: string;
  verdict: string;
  clauses: Clause[];
}
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

// ─── Screen types ─────────────────────────────────────────
type Screen = 'landing' | 'loading' | 'results';
type ScanTab = 'url' | 'propwatch' | 'monitor-quick';
type ResultTab = 'summary' | 'redflags' | 'allclauses';

const STORAGE_KEY = 'clauseguard_monitors_v2';

function loadMonitors(): Monitor[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveMonitors(monitors: Monitor[]) {
  if (typeof window === 'undefined') return;
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

// ─── Loading steps ────────────────────────────────────────
const STEPS = [
  'Fetching document...',
  'Extracting text content...',
  'Running AI analysis...',
  'Building risk report...',
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [scanTab, setScanTab] = useState<ScanTab>('url');
  const [resultTab, setResultTab] = useState<ResultTab>('summary');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFirmKey, setSelectedFirmKey] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannedUrl, setScannedUrl] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor state
  const [monitors, setMonitors] = useState<Monitor[]>(loadMonitors);
  const [monitorPrompt, setMonitorPrompt] = useState('');
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorModalContent, setMonitorModalContent] = useState<'parsing' | 'confirm' | 'error'>('parsing');
  const [parsedMonitor, setParsedMonitor] = useState<Partial<Monitor> & { suggestedUrl?: string } | null>(null);
  const [parseError, setParseError] = useState('');
  const [confirmUrl, setConfirmUrl] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }

  // ─── Scan ───────────────────────────────────────────────
  async function startScan(overrideUrl?: string) {
    const url = overrideUrl || urlInput.trim();
    if (!url) { showToast('⚠️ Paste a URL first'); return; }
    if (!url.startsWith('http')) { showToast('⚠️ URL must start with https://'); return; }

    setScannedUrl(url);
    setScreen('loading');
    setLoadingStep(0);

    try {
      setLoadingStep(1);
      await new Promise(r => setTimeout(r, 800));
      setLoadingStep(2);
      await new Promise(r => setTimeout(r, 600));
      setLoadingStep(3);

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Scan failed');
      }

      setLoadingStep(4);
      await new Promise(r => setTimeout(r, 400));
      const data: ScanResult = await res.json();
      setScanResult(data);
      setScreen('results');
    } catch (err: unknown) {
      setScreen('landing');
      const msg = err instanceof Error ? err.message : 'Scan failed';
      showToast('❌ ' + msg);
    }
  }

  async function scanSelectedFirm() {
    if (!selectedFirmKey) { showToast('⚠️ Select a firm first'); return; }
    const firm = PROP_FIRMS.find(f => f.key === selectedFirmKey);
    if (firm) { setUrlInput(firm.url); await startScan(firm.url); }
  }

  // ─── Monitor setup ──────────────────────────────────────
  async function handleAddMonitor() {
    if (!monitorPrompt.trim()) { showToast('⚠️ Describe your account first'); return; }
    setShowMonitorModal(true);
    setMonitorModalContent('parsing');
    setConfirmUrl('');

    try {
      const res = await fetch('/api/monitor-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: monitorPrompt }),
      });
      if (!res.ok) throw new Error('Could not parse your request');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedMonitor(data);
      setConfirmUrl(data.suggestedUrl || '');
      setMonitorModalContent('confirm');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Parse failed';
      setParseError(msg);
      setMonitorModalContent('error');
    }
  }

  function confirmMonitor() {
    if (!parsedMonitor) return;
    const newMonitor: Monitor = {
      id: 'mon_' + Date.now(),
      firmName: parsedMonitor.firmName || '',
      accountType: parsedMonitor.accountType || 'Unknown',
      accountSize: parsedMonitor.accountSize || 'Not specified',
      tcUrl: confirmUrl,
      description: (parsedMonitor as { monitorDescription?: string }).monitorDescription || '',
      addedAt: new Date().toISOString(),
      status: 'monitoring',
      changeLog: [],
      lastChecked: null,
      snapshotHash: null,
    };
    const updated = [newMonitor, ...monitors];
    setMonitors(updated);
    saveMonitors(updated);
    setShowMonitorModal(false);
    setMonitorPrompt('');
    showToast('🛡 Monitor added! ' + newMonitor.firmName + ' ' + newMonitor.accountType);
  }

  function monitorCurrentScan() {
    if (!scanResult || !scannedUrl) return;
    setMonitorPrompt('Monitor ' + (scanResult.siteName || scannedUrl));
    setScanTab('monitor-quick');
    setScreen('landing');
    showToast('✓ Pre-filled — hit Set Up Monitor to save it');
  }

  // ─── Gauge ──────────────────────────────────────────────
  const score = scanResult?.riskScore ?? 0;
  const gaugeOffset = 283 - (283 * score / 100);
  const gaugeColor = score < 35 ? '#166534' : score < 60 ? '#B45309' : '#991B1B';

  // ─── Render ─────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-shield">🛡️</div>
          <div className="loading-title">Analysing Document</div>
          <div className="loading-sub">{scannedUrl ? new URL(scannedUrl).hostname : ''}</div>
          <div className="loading-steps">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              const isDone = loadingStep > idx;
              const isActive = loadingStep === idx;
              return (
                <div key={i} className={`loading-step${isDone ? ' done' : isActive ? ' active' : ''}`}>
                  {isDone ? (
                    <span className="step-icon">✓</span>
                  ) : isActive ? (
                    <div className="step-spinner" />
                  ) : (
                    <span className="step-icon">⏳</span>
                  )}
                  <span className="step-label">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'results' && scanResult) {
    const clauses = scanResult.clauses || [];
    const highRisk = clauses.filter(c => c.severity === 'high').length;
    const domain = (() => { try { return new URL(scannedUrl).hostname.replace('www.', ''); } catch { return scannedUrl; } })();

    return (
      <>
        <div className="results-layout">
          {/* Score card */}
          <div className="score-card">
            <div className="score-domain">{domain}</div>
            <div className="score-site-name">{scanResult.siteName}</div>
            <div className="score-gauge-wrap">
              <div className="score-gauge">
                <svg viewBox="0 0 100 100" width="120" height="120">
                  <circle className="gauge-bg" cx="50" cy="50" r="45" />
                  <circle
                    className="gauge-fill"
                    cx="50" cy="50" r="45"
                    stroke={gaugeColor}
                    strokeDasharray="283"
                    strokeDashoffset={gaugeOffset}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="gauge-text">
                  <span className="gauge-number" style={{ color: gaugeColor }}>{score}</span>
                  <span className="gauge-label">/100</span>
                </div>
              </div>
              <div className="score-verdict" style={{ color: gaugeColor }}>{scanResult.verdict}</div>
            </div>
            <div className="score-divider" />
            <div className="score-meta">
              <div className="score-meta-row"><span className="score-meta-label">Clauses found</span><span className="score-meta-val">{clauses.length}</span></div>
              <div className="score-meta-row"><span className="score-meta-label">High risk</span><span className="score-meta-val" style={{ color: 'var(--danger)' }}>{highRisk}</span></div>
              <div className="score-meta-row"><span className="score-meta-label">Scanned</span><span className="score-meta-val">{new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            </div>
            <div className="score-actions">
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={monitorCurrentScan}>🛡 Monitor This Site</button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setScreen('landing')}>← New Scan</button>
            </div>
          </div>

          {/* Results main */}
          <div className="results-main">
            <div className="results-header">
              <button className="results-back" onClick={() => setScreen('landing')}>← Back to scanner</button>
              <div className="results-title">Analysis: {scanResult.siteName}</div>
            </div>
            <div className="result-tabs">
              {(['summary', 'redflags', 'allclauses'] as ResultTab[]).map(tab => (
                <button key={tab} className={`result-tab${resultTab === tab ? ' active' : ''}`} onClick={() => setResultTab(tab)}>
                  {tab === 'summary' ? 'Summary' : tab === 'redflags' ? '🚩 Red Flags' : 'All Clauses'}
                </button>
              ))}
            </div>

            {resultTab === 'summary' && (
              <div>
                <div className="summary-card">
                  <h3>Plain-English Summary</h3>
                  <div className="summary-text">{scanResult.summary}</div>
                </div>
                {clauses.filter(c => c.severity === 'high').length > 0 && (
                  <div className="summary-card">
                    <h3>🚩 Top Red Flags</h3>
                    {clauses.filter(c => c.severity === 'high').slice(0, 3).map((c, i) => <ClauseCard key={i} clause={c} />)}
                  </div>
                )}
              </div>
            )}
            {resultTab === 'redflags' && (
              <div>
                {clauses.filter(c => c.severity === 'high').length > 0
                  ? clauses.filter(c => c.severity === 'high').map((c, i) => <ClauseCard key={i} clause={c} />)
                  : <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-text">No high-risk clauses found</div></div>}
              </div>
            )}
            {resultTab === 'allclauses' && (
              <div>
                {clauses.length > 0
                  ? clauses.map((c, i) => <ClauseCard key={i} clause={c} />)
                  : <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-text">No clauses extracted</div></div>}
              </div>
            )}
          </div>
        </div>

        <Toast message={toast} />
      </>
    );
  }

  // ─── Landing ────────────────────────────────────────────
  return (
    <>
      <div id="screen-landing">
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-badge fade-up">
              <span className="hero-badge-dot" />
              AI-Powered Legal Intelligence
            </div>
            <h1 className="hero-title fade-up-2">
              The fine print is trying<br />to <em>own</em> you.
            </h1>
            <p className="hero-sub fade-up-3">
              ClauseGuard reads Terms &amp; Conditions so you don't have to. Instant risk analysis. Real-time alerts when rules change. Built for prop firm traders and everyone who clicks "I Agree."
            </p>

            <div className="scan-box fade-up-4">
              {/* Tabs */}
              <div className="scan-tabs">
                {(['url', 'propwatch', 'monitor-quick'] as ScanTab[]).map(tab => (
                  <button key={tab} className={`scan-tab${scanTab === tab ? ' active' : ''}`} onClick={() => setScanTab(tab)}>
                    {tab === 'url' ? '🔗 Scan a URL' : tab === 'propwatch' ? '⚡ PropWatch Quick' : '🛡 Monitor Account'}
                  </button>
                ))}
              </div>

              {/* URL panel */}
              <div className={`scan-panel${scanTab === 'url' ? ' active' : ''}`}>
                <div className="url-input-wrap">
                  <input
                    className="url-input"
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startScan()}
                    placeholder="Paste any T&C or website URL here..."
                  />
                  <button className="scan-btn" onClick={() => startScan()}>
                    Analyse<span>→</span>
                  </button>
                </div>
                <div className="scan-hint">
                  <span>⚡ Results in ~10 seconds</span>
                  <span>🔒 API key stays on server</span>
                  <span>✓ No signup needed</span>
                </div>
                <div className="quick-picks">
                  {[
                    { label: 'FTMO T&C', url: 'https://ftmo.com/en/terms-conditions/' },
                    { label: 'Netflix', url: 'https://www.netflix.com/legal/termsofuse' },
                    { label: 'X / Twitter', url: 'https://twitter.com/en/tos' },
                    { label: 'TikTok', url: 'https://www.tiktok.com/legal/terms-of-service' },
                  ].map(q => (
                    <button key={q.label} className="quick-pick" onClick={() => { setUrlInput(q.url); setScanTab('url'); }}>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PropWatch quick panel */}
              <div className={`scan-panel${scanTab === 'propwatch' ? ' active' : ''}`}>
                <div className="propwatch-grid">
                  {PROP_FIRMS.slice(0, 8).map(firm => (
                    <button
                      key={firm.key}
                      className={`firm-chip${selectedFirmKey === firm.key ? ' selected' : ''}`}
                      onClick={() => setSelectedFirmKey(firm.key)}
                    >
                      <div className="firm-dot" />
                      <div>
                        <div className="firm-chip-name">{firm.name}</div>
                        <div className="firm-chip-sub">{firm.drawdown}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button className="scan-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={scanSelectedFirm}>
                  Analyse Selected Firm →
                </button>
              </div>

              {/* Monitor quick panel */}
              <div className={`scan-panel${scanTab === 'monitor-quick' ? ' active' : ''}`}>
                <div className="monitor-quick-intro">
                  <div className="monitor-quick-icon">🛡️</div>
                  <p>Tell ClauseGuard exactly which account to watch. Type naturally — the AI figures it out.</p>
                </div>
                <div className="monitor-input-wrap">
                  <textarea
                    className="monitor-prompt-input"
                    value={monitorPrompt}
                    onChange={e => setMonitorPrompt(e.target.value)}
                    placeholder={'Example: "Monitor my Blue Guardian Instant Starter $5000 account"\nOr: "Watch FTMO Standard Challenge 10k"\nOr: "Track Apex funded account terms"'}
                    rows={3}
                  />
                </div>
                <div className="monitor-examples">
                  <span className="monitor-example-label">Try:</span>
                  {[
                    { label: 'Blue Guardian Instant Starter', text: 'Monitor my Blue Guardian Instant Starter $5000 account' },
                    { label: 'FTMO Standard 10k', text: 'Watch FTMO Standard Challenge $10,000' },
                    { label: 'Apex Futures', text: 'Track Apex Trader futures funded account' },
                  ].map(ex => (
                    <button key={ex.label} className="quick-pick" onClick={() => setMonitorPrompt(ex.text)}>{ex.label}</button>
                  ))}
                </div>
                <button className="scan-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={handleAddMonitor}>
                  🛡 Set Up Monitor →
                </button>
              </div>
            </div>

            <div className="social-proof">
              <div className="proof-item"><span className="proof-icon">🛡️</span> 94% of people never read T&Cs</div>
              <div className="proof-item"><span className="proof-icon">⚠️</span> Prop firms change rules mid-challenge</div>
              <div className="proof-item"><span className="proof-icon">✓</span> We read them for you</div>
            </div>
          </div>
        </section>

        <div className="features-strip">
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <div className="feature-title">Instant Risk Analysis</div>
            <div className="feature-desc">AI reads and scores any T&amp;C document in seconds. Plain English. No legalese.</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🛡️</div>
            <div className="feature-title">Account Monitor</div>
            <div className="feature-desc">Tell us which specific account you're on. We track THAT page and alert you when your rules change.</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-title">PropWatch</div>
            <div className="feature-desc">14+ prop firms pre-indexed. Know before your $100k account gets blindsided.</div>
          </div>
        </div>

        <footer>
          <div className="footer-logo">ClauseGuard</div>
          <div>v2.1 Phase 2 — Next.js + Supabase — Groq AI</div>
          <div className="footer-links">
            <Link href="/login" className="footer-link">Sign In</Link>
            <Link href="/dashboard" className="footer-link">Dashboard</Link>
          </div>
        </footer>
      </div>

      {/* Monitor Setup Modal */}
      {showMonitorModal && (
        <div className="modal-overlay" onClick={() => setShowMonitorModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🛡 Setting Up Monitor</div>
              <button className="modal-close" onClick={() => setShowMonitorModal(false)}>✕</button>
            </div>
            {monitorModalContent === 'parsing' && (
              <div className="setup-step">
                <div className="setup-step-title">🤖 Reading your request...</div>
                <div className="setup-step-sub">The AI is figuring out which firm and account type you mean.</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <div className="step-spinner" style={{ width: 28, height: 28 }} />
                </div>
              </div>
            )}
            {monitorModalContent === 'confirm' && parsedMonitor && (
              <>
                <div className="setup-step">
                  <div className="setup-step-title">✓ Got it — here's what we'll monitor:</div>
                  <div className="setup-step-sub">Check these details, then confirm.</div>
                  <div className="parsed-result">
                    <div className="parsed-row"><span className="parsed-label">Firm</span><span className="parsed-val">{parsedMonitor.firmName}</span></div>
                    <div className="parsed-row"><span className="parsed-label">Account Type</span><span className="parsed-val">{parsedMonitor.accountType}</span></div>
                    <div className="parsed-row"><span className="parsed-label">Account Size</span><span className="parsed-val">{parsedMonitor.accountSize}</span></div>
                    <div className="parsed-row" style={{ flexDirection: 'column', gap: 6 }}>
                      <span className="parsed-label">T&C URL</span>
                      <input
                        type="text"
                        className="url-input"
                        value={confirmUrl}
                        onChange={e => setConfirmUrl(e.target.value)}
                        placeholder="https://firm.com/terms — paste or edit"
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
                <div className="setup-actions">
                  <button className="btn btn-ghost" onClick={() => setShowMonitorModal(false)}>Cancel</button>
                  <button className="btn btn-accent" onClick={confirmMonitor}>🛡 Confirm &amp; Start Monitoring</button>
                </div>
              </>
            )}
            {monitorModalContent === 'error' && (
              <>
                <div className="setup-step">
                  <div style={{ background: 'var(--danger-light)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>Could not parse your request</div>
                    <div style={{ fontSize: 13, color: '#7F1D1D' }}>{parseError}</div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Try being more specific, e.g. "Monitor my FTMO Standard Challenge $10,000 account"</p>
                </div>
                <div className="setup-actions">
                  <button className="btn btn-ghost" onClick={() => setShowMonitorModal(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Toast message={toast} />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────
function ClauseCard({ clause }: { clause: Clause }) {
  return (
    <div className={`clause-card risk-${clause.severity}`}>
      <div className="clause-header">
        <span className="clause-title">{clause.title}</span>
        <span className={`clause-badge badge-${clause.severity}`}>
          {clause.severity === 'high' ? '⚠ High Risk' : clause.severity === 'medium' ? '⚡ Moderate' : '✓ Low Risk'}
        </span>
      </div>
      <div className="clause-text">{clause.explanation}</div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}
