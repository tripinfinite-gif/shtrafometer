'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('order');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M10 21L17 28L30 13" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="text-[28px] font-semibold text-gray-800 mb-3">
            Оплата прошла успешно
          </h1>

          <p className="text-[15px] text-gray-500 leading-relaxed mb-2">
            Спасибо за заказ! Мы уже начали работу.
          </p>

          {orderId && (
            <p className="text-[13px] text-gray-400 mb-6">
              Номер заявки: <span className="font-medium text-gray-600">#{orderId}</span>
            </p>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-6">
          <p className="text-[13px] text-gray-400 uppercase tracking-widest mb-4">Что дальше</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-[#6C5CE7]">1</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-800">Подтверждение на почту</p>
                <p className="text-[13px] text-gray-500">Письмо с деталями заказа уже отправлено на ваш e-mail.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-[#6C5CE7]">2</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-800">Начало работы</p>
                <p className="text-[13px] text-gray-500">Мы приступим к выполнению в течение 1 рабочего дня.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-[#6C5CE7]">3</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-800">Результат на e-mail</p>
                <p className="text-[13px] text-gray-500">Вы получите отчёт о выполненных работах на почту.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="px-8 py-3.5 bg-[#6C5CE7] hover:bg-[#5A4BD1] rounded-xl text-[14px] font-medium text-white transition-colors text-center"
          >
            Проверить ещё один сайт
          </Link>
          <a
            href="tel:+79851313323"
            className="px-8 py-3 text-[14px] font-medium text-gray-500 hover:text-[#6C5CE7] transition-colors text-center"
          >
            Позвонить: +7 (985) 131-33-23
          </a>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Документы:{" "}
          <Link href="/offer" className="text-[#6C5CE7] hover:underline">Публичная оферта</Link>
          {" "}&middot;{" "}
          <Link href="/privacy" className="text-[#6C5CE7] hover:underline">Политика конфиденциальности</Link>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6C5CE7]/30 border-t-[#6C5CE7] rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
