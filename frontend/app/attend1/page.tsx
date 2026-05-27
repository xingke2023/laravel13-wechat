'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { attendeesApi, type AttendeeInput } from '@/lib/api/attendees';

type GroupKey = NonNullable<AttendeeInput['group_key']>;

const GROUP_PARAM_TO_KEY: Record<string, GroupKey> = {
  '1': 'group1',
  '2': 'group2',
  '3': 'group3',
  group1: 'group1',
  group2: 'group2',
  group3: 'group3',
};

const INDUSTRIES = ['金融', '保险', '医疗', '教育', '互联网', '制造', '房地产', '咨询', '其他'];

const DIAL_OPTIONS = [
  { code: '86',  label: '+86  🇨🇳 大陆', placeholder: '请输入 11 位手机号', maxLen: 11, digits: 11 },
  { code: '852', label: '+852 🇭🇰 香港', placeholder: '请输入 8 位手机号',  maxLen: 8,  digits: 8  },
];

const NAVY = '#1a3a6b';
const GOLD = '#e8a020';
const GOLD_HOVER = '#d49018';

export default function AttendPage() {
  const router = useRouter();
  const [form, setForm] = useState<AttendeeInput>({ name: '', phone: '', industry: '', company: '', email: '' });
  const [dialCode, setDialCode] = useState('86');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [groupKey, setGroupKey] = useState<GroupKey>('group1');

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('group');
    if (raw && GROUP_PARAM_TO_KEY[raw]) setGroupKey(GROUP_PARAM_TO_KEY[raw]);
  }, []);

  const update = (key: keyof AttendeeInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onDialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDialCode(e.target.value);
    setPhoneDigits('');
    setErrorMsg(null);
  };

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneDigits(e.target.value.replace(/\D/g, ''));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.name.trim() || !phoneDigits || !form.industry.trim()) {
      setErrorMsg('请完整填写姓名、手机号、行业');
      return;
    }

    const dial = DIAL_OPTIONS.find((d) => d.code === dialCode)!;
    if (phoneDigits.length !== dial.digits) {
      setErrorMsg(`请输入 ${dial.digits} 位手机号码`);
      return;
    }

    const fullPhone = `+${dialCode}${phoneDigits}`;

    setSubmitting(true);
    try {
      const payload: AttendeeInput = {
        name: form.name.trim(),
        phone: fullPhone,
        industry: form.industry.trim(),
        source: 'web',
      };
      const company = (form.company ?? '').trim();
      if (company) payload.company = company;
      const email = (form.email ?? '').trim();
      if (email) payload.email = email;
      payload.group_key = groupKey;
      await attendeesApi.create(payload);
      const tabNum = groupKey.replace('group', '');
      router.push(`/attend1/success?tab=${tabNum}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDial = DIAL_OPTIONS.find((d) => d.code === dialCode)!;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
      {/* Header */}
      <header style={{ background: NAVY, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 300, fontSize: 22, lineHeight: 1.1, letterSpacing: 1 }}>盈信家辦</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: 2 }}>EVERYGREEN</div>
        </div>
      </header>

      <main style={{ padding: '24px 16px 48px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(26,58,107,0.08)', padding: '28px 24px' }}>
          {done ? (
            <SuccessPanel name={form.name} />
          ) : (
            <>
              <h1 style={{ color: NAVY, fontSize: 22, fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>参会登记</h1>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="姓名" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="请输入您的姓名"
                    maxLength={50}
                    autoComplete="name"
                    style={inputStyle}
                  />
                </Field>

                <Field label="手机号" required>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={dialCode}
                      onChange={onDialChange}
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        flexShrink: 0,
                        paddingLeft: 10,
                        paddingRight: 10,
                        fontSize: 13,
                        appearance: 'none',
                        cursor: 'pointer',
                        background: '#f4f7fb',
                        fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
                      }}
                    >
                      {DIAL_OPTIONS.map((d) => (
                        <option key={d.code} value={d.code}>{d.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneDigits}
                      onChange={onPhoneChange}
                      placeholder={currentDial.placeholder}
                      maxLength={currentDial.maxLen}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </Field>

                <Field label="行业" required>
                  <select
                    value={form.industry}
                    onChange={update('industry')}
                    style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="%236b7a99" stroke-width="2" fill="none" stroke-linecap="round"/></svg>\')', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                  >
                    <option value="" disabled>请选择您所在行业</option>
                    {INDUSTRIES.map((it) => (
                      <option key={it} value={it}>{it}</option>
                    ))}
                  </select>
                </Field>

                <Field label="工作单位">
                  <input
                    type="text"
                    value={form.company ?? ''}
                    onChange={update('company')}
                    placeholder="请输入您的工作单位"
                    maxLength={100}
                    autoComplete="organization"
                    style={inputStyle}
                  />
                </Field>

                <Field label="邮箱（选填）">
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={update('email')}
                    placeholder="example@company.com"
                    maxLength={120}
                    autoComplete="email"
                    style={inputStyle}
                  />
                </Field>

                {errorMsg && (
                  <div style={{ color: '#c0392b', background: '#fdecea', border: '1px solid #f4c7c3', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? '#c08a30' : GOLD,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '14px',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginTop: 4,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = GOLD_HOVER; }}
                  onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = GOLD; }}
                >
                  {submitting ? '提交中…' : '提交登记'}
                </button>

                <p style={{ color: '#9aa3b5', fontSize: 12, textAlign: 'center', margin: '8px 0 0' }}>
                  您的信息仅用于本次活动联系，我们将严格保密
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: '#374a6b', fontSize: 13, fontWeight: 600 }}>
        {label}
        {required && <span style={{ color: '#e74c3c', marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  border: '1px solid #d8dde8',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 15,
  color: '#1a3a6b',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

function SuccessPanel({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 style={{ color: NAVY, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>登记成功</h2>
      <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        扫描或长按下方二维码加入活动群 / 观看直播
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', width: '100%' }}>
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
  );
}
