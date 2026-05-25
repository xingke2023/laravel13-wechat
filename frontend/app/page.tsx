'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OnboardingChat } from '@/components/onboarding-chat';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [attendUrl, setAttendUrl] = useState('/attend1');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAttendUrl(`${window.location.origin}/attend1`);
  }, []);

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
      <header style={{ background: '#1a3a6b', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 300, fontSize: 24, lineHeight: 1.2, letterSpacing: 1 }}>盈信家办</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 2 }}>EVERYGREEN</div>
          </div>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          style={{ background: '#e8a020', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          立即咨询
        </button>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e4d8c 60%, #1a6b8a 100%)', padding: '80px 32px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(232,160,32,0.2)', color: '#f5c55a', border: '1px solid rgba(232,160,32,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, fontWeight: 600, marginBottom: 24, letterSpacing: 1 }}>
            AI 智能客服 · 7×24 小时在线
          </div>
          <h1 style={{ color: '#f5c55a', fontSize: 38, fontWeight: 300, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: 2 }}>
            AI客户服务系统
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, margin: '0 0 40px' }}>
            智能解答保险问题，快速处理理赔查询，<br />为您提供专业、高效的一站式保险服务体验。
          </p>
          <button
            onClick={() => setChatOpen(true)}
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
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 32px' }}>
        <h2 style={{ textAlign: 'center', color: '#1a3a6b', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>服务功能</h2>
        <p style={{ textAlign: 'center', color: '#6b7a99', fontSize: 15, marginBottom: 48 }}>覆盖保险服务全场景，让每一次咨询都高效省心</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {[
            { icon: '🛡️', title: '保险咨询', desc: '产品介绍、条款解读、方案推荐，专业建议一键获取' },
            { icon: '📋', title: '理赔指引', desc: '理赔流程查询、材料清单指导，快速了解办理步骤' },
            { icon: '💳', title: '保单查询', desc: '保单状态、缴费记录、到期提醒，信息实时掌握' },
            { icon: '📞', title: '人工转接', desc: 'AI 无法解决时，一键转接专属客服，确保问题解决' },
          ].map((item) => (
            <div
              key={item.title}
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

      {/* QR — scan to register as attendee */}
      <section style={{ background: '#fff', padding: '56px 32px', borderTop: '1px solid #eaeef5' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <div style={{ background: '#f4f7fb', padding: 20, borderRadius: 16, boxShadow: '0 4px 20px rgba(26,58,107,0.08)', textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10, display: 'inline-block', border: '1px solid #e3e8f2' }}>
              <QRCodeSVG value={attendUrl} size={200} level="M" marginSize={2} />
            </div>
            <p style={{ color: '#6b7a99', fontSize: 12, margin: '12px 0 0' }}>微信「扫一扫」或手机相机扫码</p>
          </div>
          <div style={{ maxWidth: 380, flex: '1 1 280px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(232,160,32,0.15)', color: '#a96f12', borderRadius: 16, padding: '4px 14px', fontSize: 12, fontWeight: 600, marginBottom: 14, letterSpacing: 1 }}>
              活动报名 · 现场登记
            </div>
            <h2 style={{ color: '#1a3a6b', fontSize: 26, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>扫码报名参会</h2>
            <p style={{ color: '#6b7a99', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
              请客户使用微信扫一扫上方二维码，填写姓名、手机号与所在行业即可完成参会登记，主办方将统一收到您的登记信息并尽快联系。
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyLink}
                style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {copied ? '已复制链接 ✓' : '复制报名链接'}
              </button>
              <a
                href="/attend1"
                style={{ background: '#fff', color: '#1a3a6b', border: '1px solid #1a3a6b', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                打开报名页
              </a>
            </div>
            <p style={{ color: '#9aa3b5', fontSize: 12, margin: '14px 0 0', wordBreak: 'break-all' }}>{attendUrl}</p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ background: '#1a3a6b', padding: '56px 32px', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>随时随地，享受智能服务</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, margin: '0 0 32px' }}>盈信家办 AI 客服全天候为您服务，解答保险疑问只需几秒钟</p>
        <button
          onClick={() => setChatOpen(true)}
          style={{ background: '#e8a020', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          立即体验 AI 咨询
        </button>
      </section>

      {/* Footer */}
      <footer style={{ background: '#111e35', padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
          © 2026 盈信家办 &nbsp;|&nbsp; AI 客户服务系统 &nbsp;|&nbsp; 版权所有
        </p>
      </footer>

      {chatOpen && <OnboardingChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}
