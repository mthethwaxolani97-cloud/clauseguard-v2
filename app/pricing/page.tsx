// app/pricing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function PricingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserId(data.session.user.id);
        setUserEmail(data.session.user.email || '');
        supabase
          .from('users')
          .select('plan_tier')
          .eq('id', data.session.user.id)
          .single()
          .then(({ data: userData }) => {
            if (userData?.plan_tier) setCurrentPlan(userData.plan_tier);
          });
      }
      setLoading(false);
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function handleUpgrade(planKey: string) {
    if (!userId) {
      router.push('/login');
      return;
    }
    showToast('⏳ Redirecting to payment... (Stripe coming in next session)');
  }

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Get started with basic scanning',
      features: [
        '3 T&C scans per day',
        'Risk score and summary',
        'Basic clause breakdown',
        'PropWatch — read only',
      ],
      notIncluded: [
        'No scan history',
        'No account monitoring',
        'No alerts',
      ],
      cta: 'Current Plan',
      highlighted: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$9',
      period: '/month',
      description: 'For serious traders and professionals',
      features: [
        'Unlimited T&C scans',
        'Full risk score and clause breakdown',
        'PDF upload and analysis',
        '5 URL monitors',
        '2 account monitors',
        'Email alerts on changes',
        'Telegram alerts',
        '7-day scan history',
      ],
      notIncluded: [],
      cta: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      key: 'propwatch',
      name: 'PropWatch',
      price: '$19',
      period: '/month',
      description: 'Built for funded prop firm traders',
      features: [
        'Everything in Pro',
        'Unlimited scans',
        '50 URL monitors',
        '20 account monitors',
        'All 14+ prop firms monitored',
        'Firm comparison tool',
        'Full scan history',
        'Priority support',
      ],
      notIncluded: [],
      cta: 'Upgrade to PropWatch',
      highlighted: false,
    },
  ];

  return (
    <>
      <div className="pricing-layout">
        <div className="pricing-header">
          <div className="propwatch-badge">💳 Pricing</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 700, marginBottom: 12 }}>
            Simple, honest pricing
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-muted)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Start free. Upgrade when you need more power. Cancel anytime — no questions asked.
          </p>

          {!loading && currentPlan !== 'free' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--safe-light)', color: 'var(--safe)', padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
              ✓ You are on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
            </div>
          )}
        </div>

        <div className="pricing-grid">
          {plans.map(plan => (
            <div
              key={plan.key}
              className={`pricing-card${plan.highlighted ? ' pricing-card-featured' : ''}${currentPlan === plan.key ? ' pricing-card-current' : ''}`}
            >
              {plan.highlighted && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}
              {plan.key === 'propwatch' && (
                <div className="pricing-popular-badge" style={{ background: 'var(--gold)', color: 'white' }}>For Traders</div>
              )}

              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 20 }}>
                {plan.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 700, color: 'var(--ink)' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{plan.period}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginBottom: 24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--safe)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 13, opacity: 0.4 }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>✕</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto' }}>
                {currentPlan === plan.key ? (
                  <div style={{ textAlign: 'center', padding: '12px', background: 'var(--safe-light)', color: 'var(--safe)', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                    ✓ Your current plan
                  </div>
                ) : plan.key === 'free' ? (
                  <Link href="/" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    Start Scanning Free
                  </Link>
                ) : !userId ? (
                  <Link href="/login" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                    Sign Up to Upgrade →
                  </Link>
                ) : (
                  <button
                    className={`btn ${plan.highlighted ? 'btn-accent' : 'btn-primary'}`}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {plan.cta} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 60 }}>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-muted)' }}>
              <span>🔒</span> Secure payments via Stripe
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-muted)' }}>
              <span>✓</span> Cancel anytime, no contracts
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-muted)' }}>
              <span>💳</span> No card needed for free tier
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            All plans include Groq AI-powered scanning. The PropWatch plan is built specifically
            for prop firm traders — get alerted the moment FTMO, Apex, or any firm changes rules
            that affect your funded account.
          </p>
        </div>
      </div>

      <footer>
        <div className="footer-logo">ClauseGuard</div>
        <div>Secure payments by Stripe</div>
        <div className="footer-links">
          <Link href="/" className="footer-link">Scanner</Link>
          <Link href="/dashboard" className="footer-link">Dashboard</Link>
        </div>
      </footer>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}
