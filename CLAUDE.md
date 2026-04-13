# Штрафометр (site-checker)

**Что это:** SaaS-сервис проверки сайтов на соответствие законодательству РФ. Пользователь вводит URL — система парсит HTML, находит нарушения, считает штрафы, показывает рекомендации.

**Прод:** https://shtrafometer.ru
**Админка:** /admin/login (пароль в .env.local, переменная ADMIN_PASSWORD_HASH_B64)

## Стек
- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Cheerio (HTML-парсинг), jose (JWT), bcryptjs (пароли)
- ssh2 + basic-ftp (автофиксы)
- PostgreSQL 16 — хранение заявок, пользователей, сессий
- Деплой: Docker Compose на Beget VPS (ручной: git pull + docker compose up --build). Coolify используется только как Traefik-прокси, НЕ для auto-deploy.

## Архитектура

```
src/
├── app/
│   ├── page.tsx                  — Главная (форма + результаты, Apple-стиль, тёмная тема)
│   ├── privacy/page.tsx          — Политика конфиденциальности
│   ├── admin/
│   │   ├── login/page.tsx        — Авторизация (один админ, пароль)
│   │   ├── page.tsx              — Дашборд заявок (фильтры, статусы, статистика)
│   │   ├── orders/[id]/page.tsx  — Детали заявки + результаты проверки
│   │   ├── orders/[id]/fixes/    — UI автоисправлений (SSH/FTP)
│   │   └── users/page.tsx        — История по доменам
│   ├── auth/
│   │   ├── login/page.tsx        — Вход по SMS OTP (телефон → 6-значный код)
│   │   └── register/page.tsx     — Регистрация (имя + телефон → код → кабинет)
│   ├── cabinet/
│   │   ├── layout.tsx            — Layout кабинета (sidebar/bottom nav)
│   │   ├── page.tsx              — Дашборд пользователя
│   │   ├── sites/page.tsx        — Мои сайты (список доменов)
│   │   ├── sites/[domain]/       — Детали сайта (нарушения, заказ услуг)
│   │   ├── orders/page.tsx       — Мои заказы (фильтры, статусы)
│   │   ├── orders/[id]/page.tsx  — Детали заказа (таймлайн, оплата)
│   │   └── settings/page.tsx     — Настройки (email, компания)
│   └── api/
│       ├── check/route.ts        — POST: анализ URL → нарушения + штрафы
│       ├── order/route.ts        — POST: создание заявки (сохраняет checkResult)
│       ├── auth/{login,logout}/   — JWT-авторизация (админ)
│       ├── auth/{send-code,verify-code,user-logout}/ — SMS OTP авторизация (пользователи)
│       ├── cabinet/              — API личного кабинета (me, sites, orders, pay)
│       └── admin/                — CRUD заявок, история, автофиксы
├── checks/
│   ├── engine.ts                 — Оркестратор: fetch страницы → определение типа сайта → запуск модулей
│   ├── types.ts                  — Violation, Warning, PassedCheck, CheckResult, CheckResponse
│   ├── fines.ts                  — 28 категорий штрафов
│   ├── mod-personal-data.ts      — 152-ФЗ: политика ПДн, согласие, cookie (pd-01..pd-10)
│   ├── mod-localization.ts       — Локализация: Google Analytics/Fonts/reCAPTCHA/Maps/YouTube (loc-01..loc-11)
│   ├── mod-advertising.ts        — 38-ФЗ: маркировка рекламы, erid, Meta (ad-01..ad-06)
│   ├── mod-language.ts           — 168-ФЗ: русский язык интерфейса (lang-01..lang-03)
│   ├── mod-consumer.ts           — ЗоЗПП: реквизиты, контакты, доставка/возврат (con-01..con-09)
│   ├── mod-ecommerce.ts          — 54-ФЗ: ККТ, чеки, маркировка товаров (ecom-01..ecom-03)
│   ├── mod-content.ts            — 436-ФЗ: возрастная маркировка, копирайт (cnt-01..cnt-04)
│   └── mod-security.ts           — Безопасность: HTTPS, VPN-реклама, Meta (sec-01..sec-03)
├── fixes/
│   ├── generators/fix-*.ts       — 8 генераторов HTML/JS кода для автоисправлений
│   ├── connectors/{ssh,ftp}.ts   — Подключение к серверам клиентов
│   ├── executor.ts               — Применение фиксов (бэкап → вставка → отчёт)
│   └── plan-builder.ts           — Маппинг нарушений → фиксы
├── lib/
│   ├── types.ts                  — Общие типы: Order, User, UserSite, Fix, FixPlan
│   ├── storage.ts                — PostgreSQL CRUD (заказы, админка)
│   ├── db.ts                     — Схема БД (auto-migrate, 6 таблиц)
│   ├── auth.ts                   — JWT сессии админа, bcrypt-пароли
│   ├── user-auth.ts              — SMS OTP авторизация пользователей, серверные сессии
│   ├── sms.ts                    — SMS.ru API клиент (отправка OTP)
│   ├── user-storage.ts           — CRUD для user_sites
│   ├── yookassa.ts               — YooKassa API (платежи)
│   └── email.ts                  — Resend API (email-уведомления)
└── proxy.ts                      — Защита /admin/* и /cabinet/* (Next.js 16 proxy)
```

## Ключевые решения
- **Определение типа сайта**: ecommerce vs service vs informational — по баллам (товарные паттерны, цены, услуги). Цена сама по себе НЕ делает сайт магазином.
- **Footer-детекция**: ищет `<footer>`, `.footer`, `[class*="footer"]` и элементы в нижних 20% DOM.
- **Proxy вместо middleware**: Next.js 16 переименовал middleware.ts → proxy.ts, функция `proxy()` вместо `middleware()`.
- **Пароль в env**: хранится как base64-encoded bcrypt (переменная ADMIN_PASSWORD_HASH_B64), т.к. `$` в .env ломает парсинг.
- **Хранилище**: PostgreSQL 16 через pg driver, автомиграция при первом запуске.
- **Личный кабинет**: SMS OTP (SMS.ru) → серверные сессии в PostgreSQL (30 дней). Пользователь может проверять несколько сайтов, заказывать несколько услуг для каждого. Каждый заказ — отдельная оплата через YooKassa.
- **Деплой**: Docker Compose на Beget VPS. Ручной деплой: `cd /home/deploy/shtrafometer/repo && git pull origin main && cd .. && docker compose up -d --build app`. Coolify dashboard: http://109.69.18.80:8000 (только для Traefik-прокси и infolog24).

## Законы и проверки
Полная база знаний: `rf_website_compliance.md` (55 пунктов чек-листа).
Стратегия и реестр проверок: `planes/strategy.md`.

## Бизнес-данные
В папке `.business/` хранятся ключевые бизнес-документы. Обращайся к ним при запросах, связанных с маркетингом, продажами, ЦА, ценообразованием, экономикой и планированием:
- `audience/avatar.md` — аватар клиента (сегменты, боли, желания, страхи, фразы)
- `products/pricing.md` — продукты и тарифы (PDF-отчёт, автофикс, сертификат, консалтинг)
- `economics/unit-economics.md` — юнит-экономика (LTV, CAC, маржинальность, структура выручки)
- `goals/monthly.md` — помесячный план с KPI и действиями

## Мастер-план проекта
**Главный файл для всех кто работает над проектом: `docs/MASTER-PLAN.md`**
Содержит: что сделано, что делаем, архитектуру, продукты, этапы, деплой, метрики.
