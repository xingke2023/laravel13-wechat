'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { postsApi, aiChatStream } from '@/lib/api';
import type { Post, AiChatMessage } from '@/lib/api';

const AI_SYSTEM_PROMPT = '你是 ClawCN 助手 🦞，一个面向中文用户的友好、简洁的助理。回答用中文，避免空洞客套，给出可操作的建议。当用户提到"写文章 / 我的文章 / 退出"等动作时，提示他们点击下方按钮触发对应操作。';
const AI_HISTORY_LIMIT = 10;

type ChatMsg = { from: 'ai' | 'user'; text: string };
type Step =
  | 'greeting'
  | 'hasAccount'
  | 'login'
  | 'register'
  | 'manage'
  | 'newPostTitle'
  | 'newPostContent'
  | 'newPostPublish'
  | 'viewPosts';

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
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '1.5px solid #E65C46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🦞</div>
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

  // new post draft
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [postBusy, setPostBusy] = useState(false);

  // view posts
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // free-form AI chat
  const [chatInput, setChatInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

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
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMsgs([{ from: 'ai', text: `嗨，${name}！👋 欢迎回来～` }]);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMsgs(prev => [...prev, {
            from: 'ai',
            text: '我是您的 ClawCN 助手 🦞\n\n在这里您可以直接：\n✍️ 发布文章\n📋 查看我的文章\n\n想做点什么？',
          }]);
          setWaitingUser(true);
          scrollBottom();
        }, 1000);
      }, 700);
    } else {
      setStep('hasAccount');
      pushAI('您好！我是 ClawCN 助手 🦞\n\n欢迎使用 ClawCN！我可以帮您快速登录或注册，几秒钟就好 ⚡\n\n请问您已经有账号了吗？', 600);
    }
  }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollBottom(); }, [msgs, typing, scrollBottom]);

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
      pushAI('🎉 欢迎回来！\n\n您现在可以直接在这里管理文章，请问想做什么？', 600);
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
      pushAI(`🎉 注册成功，欢迎，${regName.trim() || '新朋友'}！\n\n您现在可以直接在这里管理文章，请问想做什么？`, 600);
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
    setMyPosts([]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(prev => [...prev, { from: 'ai', text: '已退出登录 ✅\n\n下次见啦～若想继续，可重新登录。' }]);
      setStep('hasAccount');
      setWaitingUser(true);
      scrollBottom();
    }, 600);
  };

  const startNewPost = () => {
    setMsgs(prev => [...prev, { from: 'user', text: '✍️ 写一篇' }]);
    setDraftTitle(''); setDraftContent(''); setTitleInput(''); setContentInput('');
    setStep('newPostTitle');
    pushAI('好的！请先告诉我文章的标题 📝', 500);
  };

  const isAuthError = (err: unknown): boolean => {
    const m = err instanceof Error ? err.message : String(err);
    return /Unauthenticated|expired|invalid token|401/i.test(m);
  };

  const handleAuthExpired = async () => {
    setTyping(false);
    setMsgs(prev => [...prev, { from: 'ai', text: '⏰ 登录已过期，请重新登录后继续。' }]);
    try { await doLogout(); } catch {}
    setMyPosts([]);
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
    if (!text || aiBusy || !token) return;

    const userMsg: ChatMsg = { from: 'user', text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setChatInput('');
    setAiBusy(true);
    setTyping(true);
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
        token,
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
            scrollBottom();
          },
          // reasoning chunk 忽略（不展示推理过程）；保留 typing 直到第一个 content 到来
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
      if (!aiBubbleAdded) {
        setMsgs(prev => [...prev, { from: 'ai', text: '（空回复）' }]);
      }
      setAiBusy(false);
      setWaitingUser(true);
      scrollBottom();
    } catch (err) {
      setAiBusy(false);
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

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = titleInput.trim();
    if (!t || !waitingUser) return;
    setWaitingUser(false);
    setMsgs(prev => [...prev, { from: 'user', text: t }]);
    setDraftTitle(t);
    setTitleInput('');
    setStep('newPostContent');
    pushAI(`「${t}」——好标题！✨\n\n接下来请输入正文内容：`);
  };

  const handleContentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = contentInput.trim();
    if (!c || !waitingUser) return;
    setWaitingUser(false);
    setMsgs(prev => [...prev, { from: 'user', text: c.length > 80 ? c.slice(0, 80) + '…' : c }]);
    setDraftContent(c);
    setContentInput('');
    setStep('newPostPublish');
    pushAI('要立即发布吗？还是先存草稿？');
  };

  const handlePublishChoice = async (publish: boolean) => {
    if (!token || postBusy) return;
    setWaitingUser(false);
    setMsgs(prev => [...prev, { from: 'user', text: publish ? '🚀 立即发布' : '📝 存为草稿' }]);
    setPostBusy(true);
    try {
      await postsApi.create({ title: draftTitle, content: draftContent, published: publish }, token);
      setStep('manage');
      pushAI(`${publish ? '🎉 文章已发布！' : '📦 草稿已保存！'}\n\n还要继续做点什么吗？`, 700);
    } catch (err) {
      setPostBusy(false);
      if (isAuthError(err)) {
        await handleAuthExpired();
        return;
      }
      pushAI(`❌ 提交失败：${err instanceof Error ? err.message : '未知错误'}\n\n要再试一次吗？`, 500);
      setStep('manage');
      return;
    }
    setPostBusy(false);
  };

  // load my posts when entering viewPosts
  useEffect(() => {
    if (step !== 'viewPosts' || !user) return;
    setPostsLoading(true);
    postsApi.getAll(1)
      .then(res => {
        const mine = (res?.data || []).filter(p => p.user_id === user.id);
        setMyPosts(mine);
      })
      .catch(err => {
        if (isAuthError(err)) {
          handleAuthExpired();
        }
        setMyPosts([]);
      })
      .finally(() => setPostsLoading(false));
  }, [step, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const openViewPosts = () => {
    setMsgs(prev => [...prev, { from: 'user', text: '📋 我的文章' }]);
    setStep('viewPosts');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(prev => [...prev, { from: 'ai', text: '正在加载您的文章…' }]);
      scrollBottom();
    }, 300);
  };

  const backToManage = () => {
    setStep('manage');
    pushAI('回到主菜单啦，请问下一步想做什么？', 400);
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
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', border: '2px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🦞</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Bricolage Grotesque', sans-serif" }}>ClawCN 助手</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, background: '#7fff7f', borderRadius: '50%', display: 'inline-block' }} />
              {user ? `已登录：${user.name}` : '在线 · 快速登录注册'}
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
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', border: '1.5px solid #E65C46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 7, marginTop: 2 }}>🦞</div>
              )}
              <div
                style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: 15,
                  fontSize: fontSize === 'sm' ? 12 : fontSize === 'lg' ? 16 : 14,
                  lineHeight: 1.55,
                  fontFamily: "'Manrope', sans-serif",
                  whiteSpace: 'pre-line',
                  ...(m.from === 'ai'
                    ? { background: '#fff', color: '#2A1F19', borderBottomLeftRadius: 4, boxShadow: '0 2px 6px rgba(230,92,70,0.1)' }
                    : { background: '#E65C46', color: '#fff', borderBottomRightRadius: 4 }),
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && <TypingDots />}

          {/* viewPosts inline content */}
          {step === 'viewPosts' && !typing && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {postsLoading && (
                <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#9e8074', fontFamily: "'Manrope', sans-serif" }}>加载中…</div>
              )}
              {!postsLoading && myPosts.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#9e8074', fontFamily: "'Manrope', sans-serif" }}>
                  您还没有任何文章，点下面的「✍️ 写一篇」来发表第一篇吧～
                </div>
              )}
              {!postsLoading && myPosts.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '10px 13px', boxShadow: '0 1px 4px rgba(42,31,25,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2A1F19', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{p.title}</div>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                      background: p.published ? 'rgba(34,160,80,0.12)' : 'rgba(158,128,116,0.18)',
                      color: p.published ? '#1b7d3b' : '#7a5c4f',
                    }}>{p.published ? '已发布' : '草稿'}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: '#5a4a3f', fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>
                    {p.content.length > 80 ? p.content.slice(0, 80) + '…' : p.content}
                  </div>
                </div>
              ))}
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

          {/* manage */}
          {(step === 'manage') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={startNewPost}
                  disabled={aiBusy || typing}
                  style={optBtn({ flex: 1, padding: '8px 10px', fontSize: 13 })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
                >
                  ✍️ 写一篇
                </button>
                <button
                  onClick={openViewPosts}
                  disabled={aiBusy || typing}
                  style={optBtn({ flex: 1, padding: '8px 10px', fontSize: 13 })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
                >
                  📋 我的文章
                </button>
              </div>

              {/* free-form AI chat input */}
              <form onSubmit={handleAiChat} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={aiBusy ? 'AI 思考中…' : '随便聊聊，或问点什么…'}
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

              <button
                onClick={handleLogout}
                disabled={aiBusy || typing}
                style={optBtn({ padding: '7px 10px', fontSize: 12, color: '#9e8074' })}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
              >
                👋 退出登录
              </button>
            </div>
          )}

          {/* new post title */}
          {waitingUser && !typing && step === 'newPostTitle' && (
            <form onSubmit={handleTitleSubmit} style={{ display: 'flex', gap: 8 }}>
              <input autoFocus value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="文章标题…" style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" disabled={!titleInput.trim()} style={{ ...btnPrimary(!titleInput.trim()), width: 'auto', padding: '10px 16px', flexShrink: 0 }}>发送</button>
            </form>
          )}

          {/* new post content */}
          {waitingUser && !typing && step === 'newPostContent' && (
            <form onSubmit={handleContentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                autoFocus
                value={contentInput}
                onChange={e => setContentInput(e.target.value)}
                placeholder="写下您想分享的内容…"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: "'Manrope', sans-serif" }}
              />
              <button type="submit" disabled={!contentInput.trim()} style={btnPrimary(!contentInput.trim())}>发送 →</button>
            </form>
          )}

          {/* new post publish choice */}
          {waitingUser && !typing && step === 'newPostPublish' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handlePublishChoice(false)}
                disabled={postBusy}
                style={optBtn({ flex: 1, padding: '10px 12px', fontSize: 13.5 })}
                onMouseEnter={e => { if (!postBusy) { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
              >
                📝 存为草稿
              </button>
              <button
                onClick={() => handlePublishChoice(true)}
                disabled={postBusy}
                style={{ ...btnPrimary(postBusy), flex: 1, width: 'auto', padding: '10px 12px', fontSize: 13.5 }}
              >
                {postBusy ? '提交中…' : '🚀 立即发布'}
              </button>
            </div>
          )}

          {/* viewPosts: back button */}
          {step === 'viewPosts' && !typing && (
            <button
              onClick={backToManage}
              style={optBtn({ width: '100%', padding: '9px 10px', fontSize: 13 })}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E65C46'; e.currentTarget.style.background = 'rgba(230,92,70,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,31,25,0.15)'; e.currentTarget.style.background = '#F8F2ED'; }}
            >
              ← 返回主菜单
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
