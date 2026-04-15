'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  companyInn: string | null;
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const focusField = searchParams.get('focus');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyInn, setCompanyInn] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [emailHighlight, setEmailHighlight] = useState(false);

  useEffect(() => {
    fetch('/api/cabinet/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setCompanyName(data.user.companyName || '');
          setCompanyInn(data.user.companyInn || '');
        }
      });
  }, []);

  // Focus the email input when arriving from the "Add email" banner
  useEffect(() => {
    if (focusField !== 'email' || !profile) return;
    const el = emailInputRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setEmailHighlight(true);
    const t = setTimeout(() => setEmailHighlight(false), 2500);
    return () => clearTimeout(t);
  }, [focusField, profile]);

  async function handleSave() {
    setError('');
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/cabinet/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || null, companyName: companyName || null, companyInn: companyInn || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения');
        return;
      }

      setProfile(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <div className="text-gray-400 text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Профиль</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
          <input
            type="tel"
            value={profile.phone || ''}
            disabled
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Телефон нельзя изменить</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            ref={emailInputRef}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="example@mail.ru"
            className={`w-full h-11 px-4 rounded-xl border bg-white text-gray-900 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent
                       transition-all duration-300
                       ${emailHighlight ? 'border-[#6C5CE7] ring-2 ring-[#6C5CE7]/30 shadow-[0_0_0_4px_rgba(108,92,231,0.15)]' : 'border-gray-200'}`}
          />
          <p className="text-xs text-gray-400 mt-1">Для получения отчётов, чеков и уведомлений</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Данные компании <span className="text-xs font-normal text-gray-400">(опционально)</span></h2>
        <p className="text-sm text-gray-500 -mt-3">Для оформления актов выполненных работ</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название организации</label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder='ООО «Название»'
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
          <input
            type="text"
            value={companyInn}
            onChange={e => setCompanyInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="1234567890"
            inputMode="numeric"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium
                     hover:bg-[#5B4BD5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
        {saved && <span className="text-sm text-green-600">Сохранено</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-center py-12">Загрузка...</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
