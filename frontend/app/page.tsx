'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OnboardingChat } from '@/components/onboarding-chat';

const GROUP_TABS = [
  { key: 'group1', label: '开业仪式', param: '1' },
  { key: 'group2', label: '保誠',     param: '2' },
  { key: 'group3', label: '晚餐',     param: '3' },
];

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeGroup, setActiveGroup] = useState(GROUP_TABS[0].key);
  const currentGroup = GROUP_TABS.find((t) => t.key === activeGroup) ?? GROUP_TABS[0];

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const attendUrl = useMemo(
    () => `${origin || ''}/attend1?group=${currentGroup.param}`,
    [origin, currentGroup.param],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(attendUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('复制此链接：', attendUrl);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
      {/* Header */}
      <header className="site-header" style={{ background: '#8a1a26', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(122,22,32,0.35)', borderBottom: '1px solid rgba(232,196,90,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="logo" className="site-logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
          <div>
            <div className="site-title" style={{ color: '#f5c55a', fontWeight: 400, fontSize: 24, lineHeight: 1.2, letterSpacing: 1 }}>盈信家办</div>
            <div className="site-subtitle" style={{ color: 'rgba(245,197,90,0.7)', fontSize: 11, letterSpacing: 2 }}>EVERGREEN</div>
          </div>
        </div>
      </header>

      {/* Opening Ceremony - Invitation */}
      <section className="op-section" style={{ background: 'linear-gradient(180deg, #8a1a26 0%, #6b1019 100%)', padding: '64px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div className="op-watermark" style={{ position: 'absolute', top: 40, left: 40, fontSize: 80, color: 'rgba(232,196,90,0.06)', fontWeight: 900, letterSpacing: 4, pointerEvents: 'none' }}>EVERGREEN</div>
        <div className="op-watermark" style={{ position: 'absolute', bottom: 30, right: 40, fontSize: 80, color: 'rgba(232,196,90,0.06)', fontWeight: 900, letterSpacing: 4, pointerEvents: 'none' }}>2026.05.27</div>

        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="op-eyebrow" style={{ display: 'inline-block', color: '#f5c55a', fontSize: 13, letterSpacing: 6, fontWeight: 600, marginBottom: 12 }}>EVERGREEN · 盈信家辦</div>
            <div className="op-sub" style={{ color: '#f5c55a', fontSize: 16, letterSpacing: 4, marginBottom: 18, opacity: 0.85 }}>盈通四海 · 信达万家</div>
            <h2 className="op-title" style={{ color: '#f5c55a', fontSize: 42, fontWeight: 700, margin: '0 0 12px', letterSpacing: 4, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              盛大开业庆典邀请函
            </h2>
            <div style={{ width: 60, height: 2, background: '#e8a020', margin: '20px auto 24px' }} />
            <p className="op-lead" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.9, margin: 0, letterSpacing: 1 }}>
              尊敬的贵宾，诚挚邀请您莅临 · 共襄盛举
            </p>
          </div>

          <div className="op-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 36, alignItems: 'center' }}>
            <div className="op-poster-wrap" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', border: '2px solid rgba(232,160,32,0.5)' }}>
              <img src="/opening/invitation.png" alt="开业庆典邀请函" style={{ display: 'block', width: '100%', height: 'auto' }} />
            </div>

            <div className="op-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,196,90,0.3)', borderRadius: 16, padding: '36px 36px', backdropFilter: 'blur(6px)' }}>
              <div style={{ marginBottom: 28 }}>
                <div className="op-card-label" style={{ color: '#f5c55a', fontSize: 13, letterSpacing: 3, marginBottom: 10, fontWeight: 600 }}>📅  时间 / DATE</div>
                <div className="op-card-date" style={{ color: '#fff', fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>2026年5月27日</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>星期三 · Wednesday</div>
              </div>

              <div style={{ marginBottom: 28, borderTop: '1px solid rgba(232,196,90,0.2)', paddingTop: 24 }}>
                <div className="op-card-label" style={{ color: '#f5c55a', fontSize: 13, letterSpacing: 3, marginBottom: 12, fontWeight: 600 }}>🕒  活动流程 / SCHEDULE</div>
                <div className="op-schedule" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div className="op-schedule-item" style={{ background: 'rgba(232,160,32,0.12)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 200 }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>签到及交流</div>
                    <div className="op-schedule-time" style={{ color: '#f5c55a', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>15:00 — 15:30</div>
                  </div>
                  <div className="op-schedule-item" style={{ background: 'rgba(232,160,32,0.12)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 200 }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>仪式开始</div>
                    <div className="op-schedule-time" style={{ color: '#f5c55a', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>15:30 — 17:30</div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(232,196,90,0.2)', paddingTop: 24 }}>
                <div className="op-card-label" style={{ color: '#f5c55a', fontSize: 13, letterSpacing: 3, marginBottom: 10, fontWeight: 600 }}>📍  地点 / VENUE</div>
                <div className="op-venue" style={{ color: '#fff', fontSize: 16, lineHeight: 1.7, fontWeight: 500 }}>
                  深圳市南山区科发路 22 号<br />
                  康泰创新广场 A 座 1001<br />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>13 楼南海演讲厅</span>
                </div>
              </div>

              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed rgba(232,196,90,0.25)', color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.8, letterSpacing: 0.5 }}>
                主办单位：盈信管理咨询（深圳）有限公司<br />
                承办单位：深圳市天勤众诚商务科技有限公司<br />
                <span style={{ color: '#f5c55a' }}>特此邀请 · 恭候光临</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR — scan to join event group (moved under invitation) */}
      <section className="qr-section" style={{ background: '#fbf7ee', padding: '56px 32px', borderTop: '1px solid #ecdcc2' }}>
        <div className="qr-wrap" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(122,22,32,0.10)', border: '1px solid #ecdcc2', width: 280, boxSizing: 'border-box' }}>
            <div role="tablist" style={{ display: 'flex', gap: 6, background: '#fbf3e3', padding: 4, borderRadius: 10, marginBottom: 14, border: '1px solid #ecdcc2' }}>
              {GROUP_TABS.map((tab) => {
                const isActive = tab.key === activeGroup;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveGroup(tab.key)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '7px 4px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: isActive ? '#fff' : '#7a4c1c',
                      background: isActive ? '#8a1a26' : 'transparent',
                      border: 'none',
                      borderRadius: 7,
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #ecdcc2', textAlign: 'center' }}>
              <QRCodeSVG key={currentGroup.key} value={attendUrl} size={200} level="M" marginSize={2} />
            </div>
            <p style={{ color: '#7a4c1c', fontSize: 12, margin: '12px 0 0', textAlign: 'center' }}>扫码进入「{currentGroup.label}」报名页</p>
          </div>
          <div style={{ maxWidth: 380, flex: '1 1 280px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(232,160,32,0.18)', color: '#8a1a26', borderRadius: 16, padding: '4px 14px', fontSize: 12, fontWeight: 600, marginBottom: 14, letterSpacing: 1 }}>
              活动报名 · 现场登记
            </div>
            <h2 className="qr-h2" style={{ color: '#8a1a26', fontSize: 26, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3, letterSpacing: 1 }}>扫码报名参会</h2>
            <p className="qr-p" style={{ color: '#5a4a3a', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
              请根据所属群组切换上方标签，使用微信扫一扫对应二维码进入报名表，填写完成后将自动加入「{currentGroup.label}」。
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyLink}
                style={{ background: '#8a1a26', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {copied ? '已复制链接 ✓' : '复制报名链接'}
              </button>
              <a
                href="/attend1"
                style={{ background: '#fff', color: '#8a1a26', border: '1px solid #8a1a26', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                打开报名页
              </a>
            </div>
            <p style={{ color: '#a59076', fontSize: 12, margin: '14px 0 0', wordBreak: 'break-all' }}>{attendUrl}</p>
          </div>
        </div>
      </section>

      {/* Opening Ceremony - About */}
      <section className="op-about" style={{ background: '#fbf7ee', padding: '72px 24px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
          <div className="op-eyebrow" style={{ color: '#8a1a26', fontSize: 13, letterSpacing: 6, fontWeight: 700, marginBottom: 12 }}>ABOUT EVERGREEN</div>
          <h3 className="op-about-title" style={{ color: '#1a3a6b', fontSize: 30, fontWeight: 700, margin: '0 0 8px', letterSpacing: 2 }}>关于 盈信家族办公室</h3>
          <div style={{ width: 48, height: 2, background: '#e8a020', margin: '18px auto 28px' }} />
          <p className="op-about-text" style={{ color: '#5a4a3a', fontSize: 16, lineHeight: 2.1, margin: 0, letterSpacing: 1, textAlign: 'justify' }}>
            盈信家族办公室是一家专注于为超高净值家族提供全方位服务的顶级家族办公室。其业务以
            <span style={{ color: '#8a1a26', fontWeight: 700 }}>「盈通四海，信达万家」</span>
            为核心理念，构建了涵盖财富规划、家族事务与品质生活的九大服务支柱，并透过全球化的资源网络与专业团队，协助家族实现资产保护、风险隔离、代际传承及精神文化延续。盈信强调
            <span style={{ color: '#8a1a26', fontWeight: 700 }}>「超越产品，构建系统」</span>
            ，整合法律、税务、信托、投资、教育、健康、艺术等领域，打造稳固且可持续的家族商业生态系统。
          </p>

          <div className="op-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18, marginTop: 48 }}>
            {[
              { t: '财富规划', s: 'Wealth' },
              { t: '家族事务', s: 'Family' },
              { t: '法律税务', s: 'Legal & Tax' },
              { t: '信托投资', s: 'Trust' },
              { t: '教育健康', s: 'Education' },
              { t: '艺术传承', s: 'Heritage' },
            ].map((it) => (
              <div key={it.t} className="op-pillar" style={{ background: '#fff', border: '1px solid #e8d9b9', borderRadius: 10, padding: '20px 12px', boxShadow: '0 2px 8px rgba(122,22,32,0.06)' }}>
                <div className="op-pillar-t" style={{ color: '#1a3a6b', fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>{it.t}</div>
                <div style={{ color: '#b08a3a', fontSize: 11, letterSpacing: 2 }}>{it.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Opening Ceremony - Office gallery */}
      <section className="op-gallery" style={{ background: '#1a3a6b', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="op-eyebrow" style={{ color: '#f5c55a', fontSize: 13, letterSpacing: 6, fontWeight: 600, marginBottom: 10 }}>OUR OFFICE · 南海之畔</div>
            <h3 className="op-gallery-title" style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: 2 }}>新办公空间一览</h3>
            <div style={{ width: 48, height: 2, background: '#e8a020', margin: '18px auto 0' }} />
          </div>
          <div className="op-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.25)', aspectRatio: '4 / 3' }}>
                <img
                  src={`/opening/office-${n}.jpg`}
                  alt={`办公空间 ${n}`}
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="ai-hero" style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e4d8c 60%, #1a6b8a 100%)', padding: '80px 32px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(232,160,32,0.2)', color: '#f5c55a', border: '1px solid rgba(232,160,32,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, fontWeight: 600, marginBottom: 24, letterSpacing: 1 }}>
            AI 智能客服 · 7×24 小时在线
          </div>
          <h1 className="ai-hero-h1" style={{ color: '#f5c55a', fontSize: 38, fontWeight: 300, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: 2 }}>
            AI客户服务系统
          </h1>
          <p className="ai-hero-p" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, margin: '0 0 40px' }}>
            智能解答保险问题，快速处理理赔查询，<br />为您提供专业、高效的一站式保险服务体验。
          </p>
          <button
            onClick={() => setChatOpen(true)}
            className="ai-hero-btn"
            style={{ background: '#e8a020', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 48px', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(232,160,32,0.4)', transition: 'transform 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            开始 AI 咨询
          </button>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 14 }}>无需等待 · 即问即答 · 数据安全</p>
        </div>
      </section>

      {/* Features */}
      <section className="feat-section" style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 32px' }}>
        <h2 className="feat-h2" style={{ textAlign: 'center', color: '#1a3a6b', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>服务功能</h2>
        <p className="feat-sub" style={{ textAlign: 'center', color: '#6b7a99', fontSize: 15, marginBottom: 48 }}>覆盖保险服务全场景，让每一次咨询都高效省心</p>
        <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {[
            { icon: '🛡️', title: '保险咨询', desc: '产品介绍、条款解读、方案推荐，专业建议一键获取' },
            { icon: '📋', title: '理赔指引', desc: '理赔流程查询、材料清单指导，快速了解办理步骤' },
            { icon: '💳', title: '保单查询', desc: '保单状态、缴费记录、到期提醒，信息实时掌握' },
            { icon: '📞', title: '人工转接', desc: 'AI 无法解决时，一键转接专属客服，确保问题解决' },
          ].map((item) => (
            <div
              key={item.title}
              className="feat-card"
              style={{ background: '#fff', borderRadius: 16, padding: '32px 24px', boxShadow: '0 2px 16px rgba(26,58,107,0.07)', textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(26,58,107,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 16px rgba(26,58,107,0.07)')}
              onClick={() => setChatOpen(true)}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
              <h3 style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 17, margin: '0 0 10px' }}>{item.title}</h3>
              <p style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner" style={{ background: '#1a3a6b', padding: '56px 32px', textAlign: 'center' }}>
        <h2 className="cta-h2" style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>随时随地，享受智能服务</h2>
        <p className="cta-p" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, margin: '0 0 32px' }}>盈信家办 AI 客服全天候为您服务，解答保险疑问只需几秒钟</p>
        <button
          onClick={() => setChatOpen(true)}
          className="cta-btn"
          style={{ background: '#e8a020', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          立即体验 AI 咨询
        </button>
      </section>

      {/* Footer */}
      <footer className="site-footer" style={{ background: '#111e35', padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
          © 2026 盈信家办 &nbsp;|&nbsp; AI 客户服务系统 &nbsp;|&nbsp; 版权所有
        </p>
      </footer>

      {chatOpen && <OnboardingChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}
