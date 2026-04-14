'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

declare global { interface Window { ym?: (...args: unknown[]) => void; } }

type Method = 'email' | 'phone';
type Step = 'input' | 'code';

const YANDEX_ENABLED = true;
const VK_ENABLED = true;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/cabinet';
  const oauthError = searchParams.get('error');

  const [method, setMethod] = useState<Method>('email');
  const [step, setStep] = useState<Step>('input');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(oauthError === 'oauth_failed' ? 'Не удалось войти через соцсеть. Попробуйте другой способ.' : '');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    let d = digits;
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    if (d.length === 0) return '+7 ';
    if (d.length <= 3) return `+7 (${d}`;
    if (d.length <= 6) return `+7 (${d.slice(0, 3)}) ${d.slice(3)}`;
    if (d.length <= 8) return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
  }

  async function handleSendCode() {
    setError('');
    setLoading(true);

    try {
      const isEmail = method === 'email';
      const endpoint = isEmail ? '/api/auth/send-email-code' : '/api/auth/send-code';
      const body = isEmail ? { email } : { phone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка отправки кода');
        if (data.retryAfter) setCountdown(data.retryAfter);
        return;
      }

      setStep('code');
      setCountdown(data.retryAfter || 60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
    if (value && index === 5 && newCode.every(d => d)) handleVerifyCode(newCode.join(''));
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) codeRefs.current[index - 1]?.focus();
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setCode(pasted.split(''));
      handleVerifyCode(pasted);
    }
  }

  async function handleVerifyCode(codeStr?: string) {
    const codeValue = codeStr || code.join('');
    if (codeValue.length !== 6) return;

    setError('');
    setLoading(true);

    try {
      const isEmail = method === 'email';
      const endpoint = isEmail ? '/api/auth/verify-email-code' : '/api/auth/verify-code';
      const body = isEmail ? { email, code: codeValue } : { phone, code: codeValue };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Неверный код');
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
        return;
      }

      if (typeof window !== 'undefined' && window.ym) window.ym(108525306, 'reachGoal', 'user_login');
      router.push(returnUrl);
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  const inputValue = method === 'email' ? email : phone;
  const inputValid = method === 'email'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    : phone.replace(/\D/g, '').length >= 11;
  const contactDisplay = method === 'email' ? email : phone;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход в кабинет</h1>

      {step === 'input' ? (
        <>
          <p className="text-gray-500 mb-6">Выберите удобный способ входа</p>

          {/* OAuth buttons */}
          {(YANDEX_ENABLED || VK_ENABLED) && (
            <div className="space-y-3 mb-6">
              {YANDEX_ENABLED && (
                <a
                  href={`/api/auth/yandex?returnUrl=${encodeURIComponent(returnUrl)}`}
                  className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-gray-200 bg-white
                             text-gray-800 font-medium text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M13.5 12L20 2H15.5L12 7.5L8.5 2H4L10.5 12L4 22H8.5L12 16.5L15.5 22H20L13.5 12Z" fill="#FC3F1D"/>
                  </svg>
                  Войти через Яндекс
                </a>
              )}
              {VK_ENABLED && (
                <a
                  href={`/api/auth/vk?returnUrl=${encodeURIComponent(returnUrl)}`}
                  className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-gray-200 bg-white
                             text-gray-800 font-medium text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077FF">
                    <path d="M20.665 7.227c.136-.455 0-.789-.646-.789h-2.138c-.543 0-.793.287-.929.602 0 0-1.086 2.644-2.624 4.359-.498.499-.724.659-.997.659-.136 0-.334-.16-.334-.614v-4.22c0-.543-.156-.789-.61-.789H9.513c-.34 0-.544.253-.544.493 0 .517.771.636.851 2.09v3.159c0 .689-.124.814-.397.814-.724 0-2.484-2.655-3.53-5.693-.204-.59-.41-.827-.957-.827H2.797C2.185 7.271 2 7.558 2 7.873c0 .568.724 3.393 3.37 7.127 1.763 2.531 4.246 3.906 6.506 3.906 1.355 0 1.522-.304 1.522-.829v-1.912c0-.612.129-.734.561-.734.317 0 .862.159 2.133 1.386 1.453 1.455 1.691 2.089 2.508 2.089h2.138c.612 0 .919-.304.742-.906-.194-.598-.886-1.467-1.806-2.495-.498-.591-1.248-1.226-1.475-1.543-.317-.409-.226-.59 0-.954.001.001 2.605-3.667 2.866-4.91v.001z"/>
                  </svg>
                  Войти через VK
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">или по коду</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Method toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => { setMethod('email'); setError(''); }}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                method === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => { setMethod('phone'); setError(''); }}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                method === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Телефон
            </button>
          </div>

          {/* Input */}
          <div className="space-y-4">
            {method === 'email' ? (
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSendCode(); }}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-base
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                           transition-shadow"
                autoFocus
              />
            ) : (
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={e => { setPhone(formatPhoneInput(e.target.value)); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSendCode(); }}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-base
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                           transition-shadow"
                autoFocus
              />
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handleSendCode}
              disabled={loading || !inputValid}
              className="w-full h-12 rounded-xl bg-[#6C5CE7] text-white font-medium text-base
                         hover:bg-[#5B4BD5] active:bg-[#4A3BC4] disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {loading ? 'Отправляем...' : 'Получить код'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Нет аккаунта?{' '}
              <Link
                href={`/auth/register${returnUrl !== '/cabinet' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
                className="text-[#6C5CE7] hover:underline"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </>
      ) : (
        <div>
          <p className="text-gray-500 mb-8">
            Код отправлен на {contactDisplay}
          </p>

          <div className="space-y-4">
            <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  className="w-14 h-14 text-center text-2xl font-semibold rounded-xl border border-gray-200 bg-white text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                             transition-shadow"
                />
              ))}
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-400">Повторная отправка через {countdown} сек</p>
              ) : (
                <button
                  onClick={async () => {
                    setCode(['', '', '', '', '', '']);
                    setError('');
                    await handleSendCode();
                  }}
                  className="text-sm text-[#6C5CE7] hover:underline"
                >
                  Отправить код повторно
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep('input'); setCode(['', '', '', '', '', '']); setError(''); }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Изменить {method === 'email' ? 'email' : 'номер'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
