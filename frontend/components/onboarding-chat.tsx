'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth-context';
import { aiChatStream } from '@/lib/api';
import type { AiChatMessage, AiToolEvent } from '@/lib/api';

const AI_SYSTEM_PROMPT = [
  '你是「智能财富助理」，盈信家办有限公司的智能客户服务助手。请用简体中文回复，语气亲切、专业且简洁。',
  '服务范围：保险产品咨询与推荐、理赔流程指引与材料说明、保单查询与状态解读、续保与缴费提醒、常见保险问题解答。',
  '遇到需要人工处理的复杂理赔或投诉，请告知用户联系人工客服。回答时避免空洞客套，直接给出实用建议，必要时主动了解用户的保险需求和具体情况。',
  '',
  '【保单查询能力】你已具备直接查询保单数据库的能力，提供 3 个函数：',
  '- lookup_policy_by_number(policy_no)：按保单号查单张详情',
  '- lookup_policies_by_name(name)：按客户姓名(中文/英文模糊)查所有保单详情',
  '- list_policy_numbers(name?, id_number?)：只取保单号列表(适合证件号场景)',
  '当用户问到具体保单号、客户姓名、证件号相关问题时，**主动调用对应函数**，不要让用户自己复述或要求他们去别处查。',
  '解读结果：source="esupport" 是当前状态可靠来源；source="133" 含完整客户信息(2018-11 后停更，状态可能过期)。两者并存时以 Esupport 为当前状态、以 133 补充客户细节。',
  '涉及证件号回复时请部分脱敏（保留首末各 4 位，中间用 ** 替代）。',
].join('\n');
const TOOL_LABELS: Record<string, string> = {
  lookup_policy_by_number: '保单详情',
  lookup_policies_by_name: '客户保单',
  list_policy_numbers: '保单号列表',
};
const AI_HISTORY_LIMIT = 10;

type ChatMsg = { from: 'ai' | 'user'; text: string };
type Step = 'greeting' | 'hasAccount' | 'login' | 'register' | 'manage';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid rgba(42,31,25,0.2)',
  outline: 'none',
  fontSize: 15,
  fontFamily: "'Manrope', sans-serif",
  color: '#2A1F19',
  background: '#FDF8F5',
  boxSizing: 'border-box',
};

const btnPrimary = (disabled = false): React.CSSProperties => ({
  width: '100%',
  padding: '12px',
  borderRadius: 10,
  border: 'none',
  background: disabled ? 'rgba(230,92,70,0.08)' : '#E65C46',
  color: disabled ? '#9e8074' : '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: "'Manrope', sans-serif",
  opacity: 1,
  transition: 'opacity 0.15s',
});

const optBtn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  padding: '9px 14px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  border: '1.5px solid rgba(42,31,25,0.15)',
  background: '#F8F2ED',
  cursor: 'pointer',
  color: '#2A1F19',
  fontFamily: "'Manrope', sans-serif",
  transition: 'border-color 0.15s, background 0.15s',
  textAlign: 'center' as const,
  ...extra,
});

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '1.5px solid #E65C46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>💼</div>
      <div style={{ background: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px', display: 'flex', gap: 4, boxShadow: '0 2px 6px rgba(42,31,25,0.1)' }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span key={i} style={{ width: 6, height: 6, background: '#E65C46', borderRadius: '50%', display: 'inline-block', animation: `clawBounce 1.2s ${d}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

export function OnboardingChat({ onClose }: { onClose: () => void }) {
  const { user, token, loading: authLoading, login: doLogin, register: doRegister, logout: doLogout } = useAuth();
  const initialized = useRef(false);

  const [step, setStep] = useState<Step>('greeting');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [waitingUser, setWaitingUser] = useState(false);

  // login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');

  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // free-form AI chat
  const [chatInput, setChatInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>('');

  const msgsRef = useRef<HTMLDivElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }, 60);
  }, []);

  const pushAI = useCallback((text: string, delay = 900) => {
    setTyping(true);
    setWaitingUser(false);
    setTimeout(() => {
      setTyping(false);
      setMsgs(prev => [...prev, { from: 'ai', text }]);
      setWaitingUser(true);
      scrollBottom();
    }, delay);
  }, [scrollBottom]);

  // initial greeting
  useEffect(() => {
    if (authLoading) return;
    if (initialized.current) return;
    initialized.current = true;

    if (user) {
      const name = user.name || '您';
      setStep('manage');
      pushAI(`嗨，${name}！👋 欢迎回来～\n\n我是盈信家办 AI 客服，有什么可以帮您的吗？`, 600);
      setWaitingUser(true);
    } else {
      // Guest: go directly to chat, no login required
      setStep('manage');
      pushAI('您好！我是盈信家办 AI 客服 🛡️\n\n请直接输入您的问题，我来为您解答保险相关的疑问。', 600);
      setWaitingUser(true);
    }
  }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollBottom(); }, [msgs, typing, toolStatus, scrollBottom]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleHasAccount = (value: 'has' | 'no', label: string) => {
    if (!waitingUser) return;
    setWaitingUser(false);
    setAuthError('');
    setMsgs(prev => [...prev, { from: 'user', text: label }]);
    if (value === 'has') {
      setStep('login');
      pushAI('好的，请输入您的邮箱和密码登录 👇');
    } else {
      setStep('register');
      pushAI('没问题，几秒就能注册一个 🚀\n\n填写下面的信息：');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      await doLogin({ email: loginEmail.trim(), password: loginPass });
      setMsgs(prev => [...prev, { from: 'user', text: `📧 ${loginEmail.trim()}` }]);
      setLoginEmail(''); setLoginPass('');
      setStep('manage');
      pushAI('🎉 欢迎回来！\n\n请直接输入您的保险问题，我来为您解答～', 600);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '登录失败，请检查邮箱和密码');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authBusy) return;
    if (regPass !== regPass2) {
      setAuthError('两次输入的密码不一致');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      await doRegister({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPass,
        password_confirmation: regPass2,
      });
      setMsgs(prev => [...prev, { from: 'user', text: `📧 ${regEmail.trim()}（${regName.trim()}）` }]);
      setRegName(''); setRegEmail(''); setRegPass(''); setRegPass2('');
      setStep('manage');
      pushAI(`🎉 注册成功，欢迎，${regName.trim() || '新朋友'}！\n\n请直接输入您的保险问题，我来为您解答～`, 600);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setMsgs(prev => [...prev, { from: 'user', text: '👋 退出登录' }]);
    try { await doLogout(); } catch {}
    initialized.current = false;
    setStep('greeting');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(prev => [...prev, { from: 'ai', text: '已退出登录 ✅\n\n下次见啦～若想继续，可重新登录。' }]);
      setStep('hasAccount');
      setWaitingUser(true);
      scrollBottom();
    }, 600);
  };

  const isAuthError = (err: unknown): boolean => {
    const m = err instanceof Error ? err.message : String(err);
    return /Unauthenticated|expired|invalid token|401/i.test(m);
  };

  const handleAuthExpired = async () => {
    setTyping(false);
    setMsgs(prev => [...prev, { from: 'ai', text: '⏰ 登录已过期，请重新登录后继续。' }]);
    try { await doLogout(); } catch {}
    setLoginEmail(''); setLoginPass('');
    setAuthError('');
    initialized.current = false;
    setStep('login');
    setWaitingUser(true);
    scrollBottom();
  };

  const handleAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || aiBusy) return;

    const userMsg: ChatMsg = { from: 'user', text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setChatInput('');
    setAiBusy(true);
    setTyping(true);
    setToolStatus('');
    setWaitingUser(false);
    scrollBottom();

    const history: AiChatMessage[] = next.slice(-AI_HISTORY_LIMIT).map(m => ({
      role: m.from === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));

    // 创建一个空的 AI 气泡用于流式追加
    let aiBubbleAdded = false;
    let accumulated = '';

    try {
      await aiChatStream(
        { messages: history, system: AI_SYSTEM_PROMPT, max_tokens: 800 },
        token ?? null,
        {
          onDelta: (chunk) => {
            accumulated += chunk;
            if (!aiBubbleAdded) {
              aiBubbleAdded = true;
              setTyping(false);
              setMsgs(prev => [...prev, { from: 'ai', text: accumulated }]);
            } else {
              setMsgs(prev => {
                const copy = prev.slice();
                copy[copy.length - 1] = { from: 'ai', text: accumulated };
                return copy;
              });
            }
            setToolStatus('');
            scrollBottom();
          },
          // reasoning chunk 忽略（不展示推理过程）；保留 typing 直到第一个 content 到来
          onTool: (evt: AiToolEvent) => {
            const label = TOOL_LABELS[evt.name] ?? evt.name;
            if (evt.status === 'executing') {
              const hint =
                typeof evt.args?.policy_no === 'string' ? ` ${evt.args.policy_no}` :
                typeof evt.args?.name === 'string' ? ` ${evt.args.name}` :
                typeof evt.args?.id_number === 'string' ? ` ${evt.args.id_number}` : '';
              setToolStatus(`🔍 正在查询${label}${hint}…`);
            } else if (evt.status === 'error') {
              setToolStatus(`⚠️ ${label}查询失败`);
            } else {
              setToolStatus(`✅ ${label}已就绪`);
            }
            scrollBottom();
          },
          onError: (msg) => {
            setTyping(false);
            if (!aiBubbleAdded) {
              setMsgs(prev => [...prev, { from: 'ai', text: `❌ AI 暂时不可用：${msg}` }]);
            } else {
              setMsgs(prev => {
                const copy = prev.slice();
                copy[copy.length - 1] = { from: 'ai', text: accumulated + `\n\n❌ ${msg}` };
                return copy;
              });
            }
          },
        }
      );
      setTyping(false);
      setToolStatus('');
      if (!aiBubbleAdded) {
        setMsgs(prev => [...prev, { from: 'ai', text: '（空回复）' }]);
      }
      setAiBusy(false);
      setWaitingUser(true);
      scrollBottom();
    } catch (err) {
      setAiBusy(false);
      setToolStatus('');
      if (isAuthError(err)) {
        await handleAuthExpired();
        return;
      }
      setTyping(false);
      const msg = err instanceof Error ? err.message : '未知错误';
      if (!aiBubbleAdded) {
        setMsgs(prev => [...prev, { from: 'ai', text: `❌ AI 暂时不可用：${msg}` }]);
      }
      setWaitingUser(true);
      scrollBottom();
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'clawFadeIn 0.2s ease',
        padding: 'clamp(6px, 2vw, 16px)',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes clawFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes clawSlideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes clawBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        @media (max-width: 480px) {
          .claw-chat-modal {
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 14px !important;
            height: 100%;
          }
        }
      `}</style>

      <div
        className="claw-chat-modal"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '92vh',
          animation: 'clawSlideUp 0.3s cubic-bezier(.22,1,.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #E65C46 0%, #c9402a 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', border: '2px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💼</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Bricolage Grotesque', sans-serif" }}>智能財富助理</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, background: '#7fff7f', borderRadius: '50%', display: 'inline-block' }} />
              {user ? `已登录：${user.name}` : '在线 · 随时提问'}
            </div>
          </div>
          {/* Font size controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '3px 5px' }}>
            {(['sm', 'md', 'lg'] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                style={{
                  background: fontSize === s ? 'rgba(255,255,255,0.3)' : 'transparent',
                  border: 'none', cursor: 'pointer', color: '#fff',
                  borderRadius: 5, padding: '2px 5px', lineHeight: 1,
                  fontSize: [11, 13, 16][i], fontWeight: 700,
                  fontFamily: "'Manrope', sans-serif",
                  transition: 'background 0.15s',
                }}
              >
                A
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Messages */}
        <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F8F2ED', minHeight: 0 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.from === 'ai' && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1.5px solid #E65C46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 7, marginTop: 2 }}>💼</div>
              )}
              <div
                className={m.from === 'ai' ? 'claw-md' : undefined}
                style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: 15,
                  fontSize: fontSize === 'sm' ? 12 : fontSize === 'lg' ? 16 : 14,
                  lineHeight: 1.6,
                  fontFamily: "'Manrope', sans-serif",
                  ...(m.from === 'ai'
                    ? { background: '#fff', color: '#2A1F19', borderBottomLeftRadius: 4, boxShadow: '0 2px 6px rgba(230,92,70,0.1)' }
                    : { background: '#E65C46', color: '#fff', borderBottomRightRadius: 4, whiteSpace: 'pre-line' }),
                }}
              >
                {m.from === 'ai' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          {typing && <TypingDots />}

          {toolStatus && (
            <div style={{
              alignSelf: 'flex-start',
              marginLeft: 33,
              fontSize: 12,
              color: '#5a4a3f',
              fontFamily: "'Manrope', sans-serif",
              background: 'rgba(230,92,70,0.08)',
              border: '1px solid rgba(230,92,70,0.2)',
              padding: '4px 10px',
              borderRadius: 999,
            }}>
              {toolStatus}
            </div>
          )}

        </div>

        {/* Bottom panel */}
        <div style={{ background: '#fff', padding: '12px 14px 14px', flexShrink: 0, borderTop: '1px solid rgba(42,31,25,0.1)', boxSizing: 'border-box', position: 'relative' }}>

          {/* hasAccount */}
          {waitingUser && !typing && step === 'hasAccount' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { label: '已有账号，直接登录', value: 'has' as const },
                { label: '还没有，帮我注册', value: 'no' as const },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleHasAccount(opt.value, opt.label)}
                  style={optBtn({ flex: 1 })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* login */}
          {waitingUser && !typing && step === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input autoFocus type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="邮箱" style={inputStyle} required />
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="密码" style={inputStyle} required />
              {authError && <p style={{ margin: 0, fontSize: 12, color: '#D32F2F', fontFamily: "'Manrope', sans-serif" }}>{authError}</p>}
              <button type="submit" disabled={authBusy} style={{ ...btnPrimary(authBusy), opacity: authBusy ? 0.7 : 1 }}>
                {authBusy ? '登录中…' : '🚀 登录'}
              </button>
            </form>
          )}

          {/* register */}
          {waitingUser && !typing && step === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input autoFocus value={regName} onChange={e => setRegName(e.target.value)} placeholder="昵称" style={inputStyle} required />
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="邮箱" style={inputStyle} required />
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="密码（至少 8 位）" style={inputStyle} required minLength={8} />
              <input type="password" value={regPass2} onChange={e => setRegPass2(e.target.value)} placeholder="确认密码" style={inputStyle} required minLength={8} />
              {authError && <p style={{ margin: 0, fontSize: 12, color: '#D32F2F', fontFamily: "'Manrope', sans-serif" }}>{authError}</p>}
              <button type="submit" disabled={authBusy} style={{ ...btnPrimary(authBusy), opacity: authBusy ? 0.7 : 1 }}>
                {authBusy ? '注册中…' : '🎉 立即注册'}
              </button>
            </form>
          )}

          {/* manage / chat */}
          {(step === 'manage') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* free-form AI chat input */}
              <form onSubmit={handleAiChat} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={aiBusy ? 'AI 思考中…' : '请输入您的问题…'}
                  disabled={aiBusy || typing}
                  style={{ ...inputStyle, flex: 1, fontSize: 14, padding: '9px 12px' }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || aiBusy || typing}
                  style={{ ...btnPrimary(!chatInput.trim() || aiBusy || typing), width: 'auto', padding: '9px 14px', fontSize: 14, flexShrink: 0 }}
                >
                  发送
                </button>
              </form>

              {user && (
                <button
                  onClick={handleLogout}
                  disabled={aiBusy || typing}
                  style={optBtn({ padding: '7px 10px', fontSize: 12, color: '#9e8074' })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
                >
                  👋 退出登录
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
