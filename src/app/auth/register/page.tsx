'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

declare global { interface Window { ym?: (...args: unknown[]) => void; } }

type Step = 'info' | 'code';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/cabinet';
  const defaultProduct = searchParams.get('product') || '';
  const defaultSite = searchParams.get('site') || '';

  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
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

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneInput(e.target.value));
    setError('');
  }

  async function handleSendCode() {
    if (!name.trim()) {
      setError('Укажите ваше имя');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: name.trim() }),
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

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every(d => d)) {
      handleVerifyCode(newCode.join(''));
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
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
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: codeValue, name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Неверный код');
        setCode(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
        return;
      }

      // Build redirect URL with product/site params if present
      let redirect = returnUrl;
      if (defaultProduct || defaultSite) {
        const url = new URL(redirect, window.location.origin);
        if (defaultProduct) url.searchParams.set('product', defaultProduct);
        if (defaultSite) url.searchParams.set('site', defaultSite);
        redirect = url.pathname + url.search;
      }

      if (typeof window !== 'undefined' && window.ym) window.ym(108525306, 'reachGoal', 'user_register');
      router.push(redirect);
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0) return;
    setCode(['', '', '', '', '', '']);
    setError('');
    await handleSendCode();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Регистрация</h1>
      <p className="text-gray-500 mb-8">
        {step === 'info'
          ? 'Создайте аккаунт за 15 секунд'
          : `Код отправлен на ${phone}`}
      </p>

      {step === 'info' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Имя
            </label>
            <input
              id="name"
              type="text"
              autoComplete="given-name"
              placeholder="Как к вам обращаться"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-base
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                         transition-shadow"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={handlePhoneChange}
              onKeyDown={e => { if (e.key === 'Enter') handleSendCode(); }}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-base
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                         transition-shadow"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSendCode}
            disabled={loading || !name.trim() || phone.replace(/\D/g, '').length < 11}
            className="w-full h-12 rounded-xl bg-[#6C5CE7] text-white font-medium text-base
                       hover:bg-[#5B4BD5] active:bg-[#4A3BC4] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading ? 'Отправляем...' : 'Получить код'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <Link
              href={`/auth/login${returnUrl !== '/cabinet' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="text-[#6C5CE7] hover:underline"
            >
              Войти
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            Нажимая кнопку, вы соглашаетесь с{' '}
            <Link href="/offer" className="underline hover:text-gray-600">офертой</Link>
            {' '}и{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">политикой конфиденциальности</Link>
          </p>
        </div>
      ) : (
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

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-400">
                Отправить код повторно через {countdown} сек
              </p>
            ) : (
              <button onClick={handleResendCode} className="text-sm text-[#6C5CE7] hover:underline">
                Отправить код повторно
              </button>
            )}
          </div>

          <button
            onClick={() => { setStep('info'); setCode(['', '', '', '', '', '']); setError(''); }}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Изменить данные
          </button>
        </div>
      )}
    </div>
  );
}
