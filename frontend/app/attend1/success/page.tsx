const NAVY = '#1a3a6b';
const GOLD = '#e8a020';

export default function AttendSuccessPage() {
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
          <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
            扫描或长按下方二维码加入活动群 / 观看直播
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
            <div style={{ background: '#f4f7fb', borderRadius: 14, padding: '16px', width: '100%', maxWidth: 240, boxSizing: 'border-box' }}>
              <p style={{ color: '#1a3a6b', fontSize: 13, fontWeight: 700, margin: '0 0 12px', textAlign: 'center' }}>加入活动群</p>
              <img
                src="/wechat-group-qr.png"
                alt="微信群二维码"
                style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
              />
              <p style={{ color: '#6b7a99', fontSize: 12, margin: '10px 0 0', textAlign: 'center' }}>
                微信「扫一扫」或长按识别
              </p>
            </div>

            <div style={{ background: '#f4f7fb', borderRadius: 14, padding: '16px', width: '100%', maxWidth: 240, boxSizing: 'border-box' }}>
              <p style={{ color: '#1a3a6b', fontSize: 13, fontWeight: 700, margin: '0 0 12px', textAlign: 'center' }}>手机扫码观看直播</p>
              <img
                src="/wechat-live-qr.png"
                alt="直播二维码"
                style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
              />
              <p style={{ color: '#6b7a99', fontSize: 12, margin: '10px 0 0', textAlign: 'center' }}>
                微信「扫一扫」或长按识别
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
