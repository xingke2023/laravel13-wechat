'use client';

import { useEffect, useState } from 'react';

const NAVY = '#1a3a6b';
const GOLD = '#e8a020';

const TABS = [
  { key: 'group1', label: '开业仪式', img: '/attend-qr-1.jpg' },
  { key: 'group2', label: '保誠',     img: '/attend-qr-2.jpg' },
  { key: 'group3', label: '晚餐',     img: '/attend-qr-3.jpg' },
];

function resolveKey(tabParam: string | null): string {
  if (!tabParam) return TABS[0].key;
  const byNumber = TABS[parseInt(tabParam, 10) - 1];
  if (byNumber) return byNumber.key;
  const byKey = TABS.find((t) => t.key === tabParam);
  return byKey ? byKey.key : TABS[0].key;
}

export default function AttendSuccessPage() {
  const [active, setActive] = useState(TABS[0].key);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam) setActive(resolveKey(tabParam));
  }, []);

  const current = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
      <header style={{ background: NAVY, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 300, fontSize: 22, lineHeight: 1.1, letterSpacing: 1 }}>盈信家辦</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: 2 }}>EVERYGREEN</div>
        </div>
      </header>

      <main style={{ padding: '24px 16px 48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(26,58,107,0.08)', padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 style={{ color: NAVY, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>登记成功</h2>
          <p style={{ color: '#e53935', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
            扫描或长按下方二维码加入活动群
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#f4f7fb', borderRadius: 14, padding: 16, width: '100%', maxWidth: 280, boxSizing: 'border-box' }}>
              <p style={{ color: '#1a3a6b', fontSize: 14, fontWeight: 700, margin: '0 0 12px', textAlign: 'center' }}>
                {current.label}
              </p>
              <img
                key={current.key}
                src={current.img}
                alt={current.label}
                style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', background: '#fff' }}
              />
              <p style={{ color: '#6b7a99', fontSize: 12, margin: '12px 0 0', textAlign: 'center' }}>
                微信「扫一扫」或长按识别
              </p>
            </div>
          </div>

          <p style={{ color: '#9aa3b5', fontSize: 12, margin: '20px 0 0', textAlign: 'center' }}>
            该二维码 6 月 2 日前有效
          </p>

          <span style={{ display: 'none', color: GOLD }} />
        </div>
      </main>
    </div>
  );
}
