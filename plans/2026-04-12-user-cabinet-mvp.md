# Plan: Личный кабинет Штрафометр — MVP

**Spec:** specs/2026-04-12-user-cabinet-mvp.md
**Research:** thoughts/research/2026-04-12-user-cabinet.md
**Status:** in_progress

## Challenge Log

**Problem:** Нужен полноценный личный кабинет с SMS-аутентификацией, множественными заказами для разных сайтов, оплатой через YooKassa, при этом не сломав текущий flow покупки.

**Chosen solution:** Параллельная система auth (server sessions в PostgreSQL) + отдельные роуты /cabinet/* + мульти-сайт через user_sites + каждый заказ — отдельная оплата.

**Alternatives considered:**
1. **NextAuth.js** — rejected: избыточен для SMS-only auth, тянет зависимости, сложная кастомизация
2. **JWT для пользователей (как для админа)** — rejected: нельзя отозвать сессию, нет контроля активных устройств
3. **Корзина + групповая оплата** — rejected: разные статусы выполнения услуг, усложняет tracking, YooKassa receipt с несколькими items сложнее обрабатывать в webhook

**Why chosen solution is better:** Минимум зависимостей (только pg + fetch), полный контроль, не ломает существующую архитектуру, каждый заказ независимо отслеживается.

## Problems

| # | Problem | Solution | Status |
|---|---------|----------|--------|
| 1 | proxy.ts сейчас матчит только /admin/* — нужно добавить /cabinet/* | Расширить config.matcher, добавить второй блок проверки для user sessions | pending |
| 2 | Старые заказы без user_id | user_id nullable, старые заказы видны только в админке | pending |
| 3 | SMS.ru может не доставить SMS | Retry через 30 сек, fallback текст "Если SMS не пришло..." | pending |
| 4 | Главная (page.tsx 1186 строк) — нужно аккуратно интегрировать кнопку входа | Минимальные изменения: добавить проверку сессии + redirect logic | pending |
| 5 | Оплата из кабинета vs с главной — два разных flow | Унифицировать: оба создают order + payment, разница только в return_url | pending |

## Phases

### Phase 1: Database Schema + Core Auth Library
- **Status:** pending
- **Files:**
  - `src/lib/db.ts` — добавить таблицы users, otp_codes, user_sessions, user_sites + ALTER orders
  - `src/lib/user-auth.ts` — NEW: OTP генерация, верификация, сессии, helpers
  - `src/lib/sms.ts` — NEW: SMS.ru API клиент
  - `src/lib/types.ts` — добавить User, OtpCode, UserSession, UserSite типы
- **Changes:**
  - 4 новые таблицы в ensureSchema()
  - ALTER TABLE orders ADD COLUMN user_id, payment_id, payment_status, paid_at, scheduled_at
  - User type, UserSession type, UserSite type
  - Функции: sendOtp(), verifyOtp(), createUserSession(), getUserBySession(), createUser()
  - SMS.ru: sendSms() через fetch API
- **TDD:** Нет внешних зависимостей для unit-тестов в текущем проекте (нет test setup). Тестируем вручную через API.
- **Gates:** tsc --noEmit ✅
- **Impact:** db.ts ensureSchema() — добавляет таблицы, не меняет существующие (safe). types.ts — только добавление, не изменение.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 1.
  Read spec at specs/2026-04-12-user-cabinet-mvp.md.
  Read research at thoughts/research/2026-04-12-user-cabinet.md.
  Implement database schema changes and core auth library.
  Files to create/modify: src/lib/db.ts, src/lib/user-auth.ts (NEW), src/lib/sms.ts (NEW), src/lib/types.ts
  Do not modify files outside of src/lib/.
  After implementing, run: cd "/Users/infinite/Claude projects/site-checker" && npx tsc --noEmit
  ```

### Phase 2: Auth API Routes + Proxy
- **Status:** pending
- **Files:**
  - `src/app/api/auth/send-code/route.ts` — NEW
  - `src/app/api/auth/verify-code/route.ts` — NEW
  - `src/app/api/auth/user-logout/route.ts` — NEW (отдельный от admin logout)
  - `src/proxy.ts` — расширить matcher и добавить user session check
- **Changes:**
  - POST /api/auth/send-code: валидация телефона, rate limit, генерация OTP, отправка SMS
  - POST /api/auth/verify-code: проверка OTP, создание/поиск user, создание session, set cookie
  - POST /api/auth/user-logout: удаление session, clear cookie
  - proxy.ts: добавить /cabinet/* и /api/cabinet/* в matcher, проверять user_session cookie
- **Gates:** tsc --noEmit ✅, ручной тест: send-code → verify-code → cookie установлен
- **Impact:** proxy.ts — добавление нового блока, не изменение существующего admin-блока. Auth routes — новые файлы.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 2.
  Read spec. Read src/proxy.ts and src/lib/auth.ts for existing patterns.
  Implement auth API routes and extend proxy.
  Files to create/modify: src/app/api/auth/send-code/route.ts (NEW), src/app/api/auth/verify-code/route.ts (NEW), src/app/api/auth/user-logout/route.ts (NEW), src/proxy.ts
  Do not modify admin auth routes.
  ```

### Phase 3: Auth Pages (Login + Register)
- **Status:** pending
- **Files:**
  - `src/app/auth/login/page.tsx` — NEW
  - `src/app/auth/register/page.tsx` — NEW
  - `src/app/auth/layout.tsx` — NEW (minimal layout for auth pages)
- **Changes:**
  - Login: телефон → отправка кода → ввод 4-значного OTP → redirect to /cabinet
  - Register: имя + телефон → отправка кода → ввод OTP → redirect to /cabinet
  - OTP input: 4 отдельных поля с автофокусом
  - Phone input: маска +7 (XXX) XXX-XX-XX
  - Таймер повторной отправки (60 сек)
  - Обработка ошибок: неверный код, rate limit, expired
  - Дизайн: Apple-стиль, согласован с основным сайтом
- **Gates:** tsc --noEmit ✅, визуальная проверка
- **Impact:** Новые страницы, не затрагивают существующие.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 3.
  Read spec. Read src/app/admin/login/page.tsx for existing login page pattern.
  Read src/app/layout.tsx for design system (colors, fonts, styles).
  Implement auth pages: login and register.
  Files: src/app/auth/login/page.tsx (NEW), src/app/auth/register/page.tsx (NEW), src/app/auth/layout.tsx (NEW)
  Design: Apple-style, dark theme possible, primary #6C5CE7, use Tailwind CSS 4.
  ```

### Phase 4: Cabinet Layout + Dashboard + Settings
- **Status:** pending
- **Files:**
  - `src/app/cabinet/layout.tsx` — NEW: sidebar + header + mobile nav
  - `src/app/cabinet/page.tsx` — NEW: dashboard
  - `src/app/cabinet/settings/page.tsx` — NEW: email, profile
  - `src/app/api/cabinet/me/route.ts` — NEW: GET/PUT user profile
- **Changes:**
  - Cabinet layout: sidebar (десктоп), bottom nav (мобайл), header с именем + logout
  - Dashboard: приветствие, карточка последней проверки, активные заказы, быстрые действия, email-баннер
  - Settings: форма email + имя + (опционально) компания/ИНН
  - API /cabinet/me: GET текущий пользователь, PUT обновление профиля
- **Gates:** tsc --noEmit ✅, визуальная проверка desktop + mobile
- **Impact:** Новые файлы. Layout Server Component читает сессию.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 4.
  Read spec. Read src/app/admin/page.tsx for admin dashboard patterns.
  Read src/app/layout.tsx for global styles.
  Read src/lib/user-auth.ts for session helpers.
  Implement cabinet layout, dashboard, settings, and /api/cabinet/me.
  Files: src/app/cabinet/layout.tsx, page.tsx, settings/page.tsx (all NEW), src/app/api/cabinet/me/route.ts (NEW)
  Light theme by default for cabinet. Sidebar + bottom nav. Mobile-first.
  ```

### Phase 5: Sites Pages + Check from Cabinet
- **Status:** pending
- **Files:**
  - `src/app/cabinet/sites/page.tsx` — NEW
  - `src/app/cabinet/sites/[domain]/page.tsx` — NEW
  - `src/app/api/cabinet/sites/route.ts` — NEW: GET sites, POST add site
  - `src/app/api/cabinet/sites/[domain]/route.ts` — NEW: GET site details
  - `src/app/api/cabinet/sites/[domain]/check/route.ts` — NEW: POST run check
  - `src/lib/user-storage.ts` — NEW: CRUD для user_sites + helpers
- **Changes:**
  - Список сайтов: карточки с доменом, светофор статуса, кнопки
  - Детали сайта: нарушения, рекомендации, кнопки заказа каждой услуги, кнопка "Проверить снова"
  - API: получение сайтов пользователя, добавление нового, запуск проверки
  - user-storage.ts: getUserSites(), addUserSite(), updateSiteCheck(), getUserSiteDetails()
  - Проверка из кабинета вызывает существующий analyzeUrl() и сохраняет результат
- **Gates:** tsc --noEmit ✅
- **Impact:** Использует существующий checks/engine.ts (read-only). Новая таблица user_sites заполняется.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 5.
  Read spec (AC8-AC11, AC15-AC16, AC19).
  Read src/checks/engine.ts to understand analyzeUrl().
  Read src/lib/types.ts for CheckResponse type.
  Implement sites pages and check-from-cabinet functionality.
  Files: src/app/cabinet/sites/page.tsx, sites/[domain]/page.tsx, api/cabinet/sites/route.ts, api/cabinet/sites/[domain]/route.ts, api/cabinet/sites/[domain]/check/route.ts (all NEW), src/lib/user-storage.ts (NEW)
  ```

### Phase 6: Orders Pages + Payment from Cabinet
- **Status:** pending
- **Files:**
  - `src/app/cabinet/orders/page.tsx` — NEW
  - `src/app/cabinet/orders/[id]/page.tsx` — NEW
  - `src/app/api/cabinet/orders/route.ts` — NEW: GET orders, POST create order
  - `src/app/api/cabinet/orders/[id]/route.ts` — NEW: GET order details
  - `src/app/api/cabinet/orders/[id]/pay/route.ts` — NEW: POST initiate payment
  - `src/lib/yookassa.ts` — дополнить: user_id в metadata, return_url на /cabinet/orders/[id]
  - `src/app/api/payment/webhook/route.ts` — дополнить: обновление payment_status, paid_at
- **Changes:**
  - Список заказов: карточки с датой, услугой, сайтом, суммой, цветным статусом
  - Детали заказа: вся информация, таймлайн, документы (placeholder), кнопка оплаты
  - API: создание заказа из кабинета (с user_id), получение заказов пользователя
  - Оплата: POST /cabinet/orders/[id]/pay → createPayment() → redirect
  - Webhook: обновить payment_status='succeeded', paid_at=NOW(), status='in_progress'
  - YooKassa: добавить user_id в metadata, изменить return_url
- **Gates:** tsc --noEmit ✅, ручной тест: создать заказ → оплатить (тестовый режим YooKassa)
- **Impact:** yookassa.ts — минимальные дополнения. webhook — расширение существующего handler.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 6.
  Read spec (AC12-AC13, AC15-AC19).
  Read src/lib/yookassa.ts for payment creation pattern.
  Read src/app/api/payment/webhook/route.ts for webhook handler.
  Implement orders pages and payment from cabinet.
  Files: src/app/cabinet/orders/page.tsx, orders/[id]/page.tsx (NEW), api/cabinet/orders/ routes (NEW), src/lib/yookassa.ts (modify), src/app/api/payment/webhook/route.ts (modify)
  IMPORTANT: Don't break existing payment flow from main page.
  ```

### Phase 7: Main Page Integration + Navigation
- **Status:** pending
- **Files:**
  - `src/app/layout.tsx` — добавить кнопку "Войти"/"Кабинет" в header
  - `src/app/page.tsx` — интеграция: кнопки услуг → redirect на auth/register с returnUrl
- **Changes:**
  - layout.tsx header: проверка user_session cookie → показать "Кабинет" или "Войти"
  - page.tsx: кнопки "Получить отчёт", "Исправить нарушения" → проверка авторизации
    - Если авторизован → создать order → redirect в /cabinet/orders/[id]
    - Если нет → redirect в /auth/register?returnUrl=/cabinet&product=report&site=domain.com
  - Auth pages: обработка returnUrl + product + site query params
- **Gates:** tsc --noEmit ✅, визуальная проверка, ручной тест flow с главной
- **Impact:** layout.tsx — малое изменение в nav. page.tsx — изменение onclick handlers.
- **Prompt for launch:**
  ```
  Read plans/2026-04-12-user-cabinet-mvp.md, Phase 7.
  Read spec (AC20-AC21).
  Read src/app/layout.tsx (header nav structure).
  Read src/app/page.tsx (order flow, lines 789-1069).
  Integrate cabinet into main page and navigation.
  Files: src/app/layout.tsx (modify), src/app/page.tsx (modify)
  CRITICAL: Minimal changes. Don't refactor existing code. Only add new navigation and redirect logic.
  ```

## Changelog

| Date | Phase | Changes |
|------|-------|---------|
