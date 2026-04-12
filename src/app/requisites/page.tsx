import Link from "next/link";

export const metadata = {
  title: "Реквизиты — Штрафометр",
  description: "Реквизиты ООО «Инфологистик 24» — оператора сервиса Штрафометр. ИНН, ОГРН, адрес, контакты.",
};

export default function RequisitesPage() {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-gray-800 mb-2">
        Реквизиты
      </h1>
      <p className="text-[13px] text-gray-400 mb-10">
        ООО &laquo;Инфологистик 24&raquo; — оператор сервиса Штрафометр
      </p>

      <div className="space-y-8">
        {/* Company info */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <rect x="2" y="4" width="14" height="12" rx="2" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M6 4V3a2 2 0 012-2h2a2 2 0 012 2v1" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M2 9h14" stroke="#6C5CE7" strokeWidth="1.5" />
            </svg>
            Организация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <InfoRow label="Полное наименование" value='Общество с ограниченной ответственностью «Инфологистик 24»' />
            <InfoRow label="Сокращённое наименование" value='ООО «Инфологистик 24»' />
            <InfoRow label="ИНН" value="9701049890" />
            <InfoRow label="ОГРН" value="1167746879486" />
            <InfoRow label="КПП" value="772301001" />
            <InfoRow label="Дата регистрации" value="25 октября 2016 г." />
            <InfoRow label="Система налогообложения" value="УСН (упрощённая)" />
          </div>
        </div>

        {/* Address */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M9 1C6.24 1 4 3.24 4 6c0 4.5 5 11 5 11s5-6.5 5-11c0-2.76-2.24-5-5-5z" stroke="#6C5CE7" strokeWidth="1.5" />
              <circle cx="9" cy="6" r="2" stroke="#6C5CE7" strokeWidth="1.5" />
            </svg>
            Адреса
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <InfoRow
              label="Юридический адрес"
              value="109044, г. Москва, 2-й Крутицкий пер., д. 18, стр. 1, помещ. 2/1"
            />
            <InfoRow
              label="Адрес для корреспонденции"
              value="109044, г. Москва, 2-й Крутицкий пер., д. 18, стр. 1, помещ. 2/1"
            />
            <InfoRow
              label="Адрес для претензий"
              value="Совпадает с юридическим адресом"
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M2 4a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M2 6l7 4.5a1 1 0 001 0L17 6" stroke="#6C5CE7" strokeWidth="1.5" />
            </svg>
            Контакты
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <div>
              <p className="text-[12px] text-gray-400 mb-1">Телефон</p>
              <a href="tel:+74991105549" className="text-gray-800 hover:text-[#6C5CE7] transition-colors font-medium">
                8 (499) 110-55-49
              </a>
            </div>
            <div>
              <p className="text-[12px] text-gray-400 mb-1">E-mail</p>
              <a href="mailto:info@infolog24.ru" className="text-gray-800 hover:text-[#6C5CE7] transition-colors font-medium">
                info@infolog24.ru
              </a>
            </div>
            <div>
              <p className="text-[12px] text-gray-400 mb-1">Сайт</p>
              <a href="https://shtrafometer.ru" className="text-[#6C5CE7] hover:underline font-medium">
                shtrafometer.ru
              </a>
            </div>
            <div>
              <p className="text-[12px] text-gray-400 mb-1">Режим работы</p>
              <p className="text-gray-800 font-medium">Пн — Пт, 9:00 — 21:00 (МСК)</p>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <rect x="1" y="4" width="16" height="10" rx="2" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M1 8h16" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M4 12h4" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Способы оплаты
          </h2>
          <p className="text-[14px] text-gray-600 mb-4">
            Оплата услуг производится онлайн через платёжный сервис ЮKassa (ООО &laquo;ЮМани&raquo;).
          </p>
          <div className="flex flex-wrap gap-3">
            {["Visa", "MasterCard", "МИР", "СБП", "ЮMoney"].map((method) => (
              <span
                key={method}
                className="px-3 py-1.5 rounded-lg text-[13px] text-gray-700 bg-white border border-gray-200 font-medium"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="text-[13px] text-gray-500 mt-4">
            Все платежи защищены стандартом безопасности PCI DSS.
            Данные банковских карт не передаются и не хранятся на серверах Исполнителя.
          </p>
        </div>

        {/* Documents */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M5 1h6l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V3a2 2 0 012-2z" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M11 1v4h4" stroke="#6C5CE7" strokeWidth="1.5" />
              <path d="M6 9h6M6 12h4" stroke="#6C5CE7" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Документы
          </h2>
          <div className="space-y-2 text-[14px]">
            <Link href="/offer" className="flex items-center gap-2 text-[#6C5CE7] hover:underline">
              <span>Публичная оферта (договор на оказание услуг)</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/privacy" className="flex items-center gap-2 text-[#6C5CE7] hover:underline">
              <span>Политика конфиденциальности</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-gray-400 mb-1">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}
