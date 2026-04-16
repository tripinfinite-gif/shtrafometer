# План: Аналитическая платформа — админка Штрафометра v3

> Создан: 2026-04-16
> Методология: Bulletproof (L, 12 этапов)
> Проект: **site-checker** (shtrafometer.ru)

---

## Цель

Превратить текущую админку (заявки + домены + проверки + AI-консультант) в **полноценную аналитическую платформу** с 4 модулями:

1. **Воронка и аналитика** — детальная воронка с конверсиями, план-факт, drill-down по дням
2. **Финансы** — P&L, выручка по продуктам, импорт банковских выписок
3. **Реклама** — мультиканальный дашборд (Директ + будущие каналы), бюджетные лимиты, AI-автоматизация
4. **AI-оптимизация сайта** — рекомендации по UX, A/B тесты, предсказание поведения

---

## Текущее состояние

### БД (8 основных + 5 AI-таблиц)

- `orders` — заявки (id, name, phone, domain, violations, price, status, product_type, user_id, payment_id, check_result JSONB)
- `check_logs` — логи проверок (url, domain, ip, user_agent, violations, site_type, risk_level, duration_ms). **Нет UTM, session_id, user_id, referrer**
- `users` — пользователи (phone, email, yandex_id, vk_id, login_count)
- `user_sessions`, `user_sites`, `check_history`, `otp_codes`
- AI: `ai_conversations`, `ai_messages`, `ai_knowledge_chunks` (pgvector), `ai_client_oauth_tokens` (pgcrypto), `ai_audit_log`

### Админка (текущая навигация)

`Заявки | Проверки | Домены | AI-консультант`

### Уже реализовано (plan-ai-consultant.md, Фазы 1-3)

- LLM-провайдеры (OpenAI/Claude/YandexGPT), роутер, чат UI
- Яндекс API клиенты (Direct v5, Metrika, Webmaster) + Zod + OAuth + tool-use loop
- Метрика 108525306, 7 целей

### Gaps

1. Нет серверного трекинга событий/сессий (check_logs без UTM, referrer, session_id, user_id)
2. Нет финансовых таблиц
3. Нет агрегационных таблиц (всё на лету)
4. Нет A/B тестирования
5. Нет мультиканальной рекламной аналитики

---

## Модуль 1: Воронка и аналитика

### Этапы воронки

| Этап | Источник сейчас | Что добавить |
|---|---|---|
| Визиты | Метрика (внешняя) | Таблица `analytics_events` |
| Проверки сайтов | `check_logs` | Добавить `user_id`, `session_id`, `utm_*`, `referrer` |
| Проверок/человека | Нет | Агрегация check_logs → session |
| Регистрации | `users.created_at` | Агрегация |
| Покупки | `orders` (status=completed) | Агрегация |

### Новые таблицы

```sql
-- Серверные события
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,  -- 'page_view','check_start','check_complete','register','order_create','payment_success'
  page_path TEXT,
  domain_checked TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  referrer TEXT,
  ip TEXT, user_agent TEXT,
  properties JSONB DEFAULT '{}'
);

-- Дневные агрегаты воронки (пересчёт ночью)
CREATE TABLE funnel_daily (
  date DATE NOT NULL,
  utm_source TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  visits INT DEFAULT 0,
  checks INT DEFAULT 0,
  unique_checkers INT DEFAULT 0,
  registrations INT DEFAULT 0,
  orders_created INT DEFAULT 0,
  orders_paid INT DEFAULT 0,
  revenue_kopecks BIGINT DEFAULT 0,
  PRIMARY KEY (date, utm_source, utm_campaign)
);

-- KPI план-факт
CREATE TABLE kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  metric TEXT NOT NULL,  -- 'visits','checks','registrations','orders','revenue'
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, metric)
);
```

### API

```
GET  /api/admin/analytics/funnel?from=&to=&utm_source=&granularity=day|week|month
GET  /api/admin/analytics/funnel/drilldown?date=
GET  /api/admin/analytics/conversions?from=&to=
GET  /api/admin/analytics/forecast
POST /api/admin/analytics/kpi
GET  /api/admin/analytics/kpi?month=
```

### UI

- `FunnelChart` — горизонтальная воронка, 5 этапов, абс. числа + % конверсии
- `ConversionTable` — конверсии между каждым этапом
- `DrilldownModal` — детали по дню
- `PlanFactCard` — прогресс-бары план vs факт
- `ForecastWidget` — прогноз (линейная экстраполяция + сезонность)

---

## Модуль 2: Финансы

### Новые таблицы

```sql
-- Финансовые транзакции
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  type TEXT NOT NULL,      -- 'revenue','cost_ads','cost_server','cost_api','cost_salary','cost_other'
  category TEXT NOT NULL,  -- 'pdf_report','autofix_basic','yandex_direct','server','sms_ru'
  amount_kopecks BIGINT NOT NULL,
  description TEXT,
  order_id TEXT,
  source TEXT DEFAULT 'auto',  -- 'auto','manual','bank_import'
  metadata JSONB DEFAULT '{}'
);

-- Банковские выписки
CREATE TABLE bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  filename TEXT NOT NULL,
  period_from DATE, period_to DATE,
  transactions_count INT DEFAULT 0,
  total_income_kopecks BIGINT DEFAULT 0,
  total_expense_kopecks BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  raw_data JSONB
);

-- Месячный P&L
CREATE TABLE monthly_pnl (
  month DATE PRIMARY KEY,
  revenue_kopecks BIGINT DEFAULT 0,
  cost_ads_kopecks BIGINT DEFAULT 0,
  cost_server_kopecks BIGINT DEFAULT 0,
  cost_api_kopecks BIGINT DEFAULT 0,
  cost_other_kopecks BIGINT DEFAULT 0,
  gross_profit_kopecks BIGINT DEFAULT 0,
  margin_percent NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API

```
GET  /api/admin/finance/overview?from=&to=
GET  /api/admin/finance/pnl?month=
GET  /api/admin/finance/by-product?from=&to=
POST /api/admin/finance/transaction
POST /api/admin/finance/bank-import
```

### Авто-revenue

При подтверждении YooKassa → автоматическая запись в `finance_transactions` (type=revenue, category по product_type).

---

## Модуль 3: Реклама (мультиканальная)

### Архитектура

```
src/lib/ads/
  types.ts          -- интерфейс AdChannel
  registry.ts       -- реестр каналов (Strategy pattern)
  yandex-direct.ts  -- адаптер (использует src/lib/yandex/direct.ts)
  vk-ads.ts         -- заглушка
  telegram-ads.ts   -- заглушка
  google-ads.ts     -- заглушка
  aggregator.ts     -- единый запрос по всем каналам
```

### Интерфейс канала

```typescript
interface AdChannel {
  id: string;   // 'yandex-direct' | 'vk-ads' | 'telegram-ads' | 'google-ads'
  name: string;
  connected: boolean;
  getSpend(from: Date, to: Date): Promise<number>;
  getClicks(from: Date, to: Date): Promise<number>;
  getConversions(from: Date, to: Date): Promise<number>;
  getCampaigns(): Promise<AdCampaign[]>;
}
```

### Новые таблицы

```sql
-- Каналы рекламы
CREATE TABLE ad_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  connected BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Дневная статистика по каналам (кеш API)
CREATE TABLE ad_channel_daily (
  date DATE NOT NULL,
  channel_id TEXT NOT NULL REFERENCES ad_channels(id),
  campaign_id TEXT,
  campaign_name TEXT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  spend_kopecks BIGINT DEFAULT 0,
  conversions INT DEFAULT 0,
  cpa_kopecks BIGINT,
  roi_percent NUMERIC(8,2),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, channel_id, campaign_id)
);

-- Бюджетные лимиты
CREATE TABLE ad_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES ad_channels(id),
  limit_type TEXT NOT NULL,  -- 'daily','weekly','monthly'
  limit_kopecks BIGINT NOT NULL,
  alert_threshold_percent INT DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Алерты
CREATE TABLE ad_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  channel_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,    -- 'budget_warning','budget_exceeded','cpa_spike','roi_drop'
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  acknowledged BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);
```

### AI-инструменты (расширение AI-консультанта)

- `analyze_all_channels` — сводка по всем каналам
- `compare_channels` — сравнение ROI/CPA
- `suggest_budget_reallocation` — рекомендации по перераспределению
- `check_budget_limits` — проверка лимитов

### Cron-синхронизация

Ежедневный cron (06:00 UTC): запрос расходов из Директ API → запись в `ad_channel_daily` → проверка лимитов → алерты.

---

## Модуль 4: AI-оптимизация сайта

### Новые таблицы

```sql
-- A/B эксперименты
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',  -- 'draft','running','paused','completed'
  element_selector TEXT,
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  traffic_percent INT DEFAULT 50,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Результаты экспериментов
CREATE TABLE experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id),
  session_id TEXT NOT NULL,
  variant TEXT NOT NULL,    -- 'A' | 'B'
  event_type TEXT NOT NULL, -- 'impression','click','conversion'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-рекомендации по сайту
CREATE TABLE site_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  element TEXT NOT NULL,
  current_state TEXT,
  recommendation TEXT NOT NULL,
  expected_impact TEXT,    -- 'high','medium','low'
  confidence NUMERIC(3,2),
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'ai'
);
```

---

## Навигация (целевая — sidebar)

```
📊 Аналитика
  ├── Воронка
  ├── KPI план-факт
  └── Проверки (перенос)

💰 Финансы
  ├── Обзор (P&L)
  ├── По продуктам
  └── Банковские выписки

📢 Реклама
  ├── Дашборд каналов
  ├── Бюджеты и лимиты
  └── Алерты

🔬 Оптимизация
  ├── Рекомендации
  └── A/B тесты

🤖 AI-консультант

⚙️ Управление
  ├── Заявки
  ├── Домены
  └── Пользователи
```

---

## Фазы реализации

### Фаза 1 — Серверный трекинг + воронка (4 под-агента)

**Приоритет: ВЫСШИЙ** — без трекинга все модули слепые.

| # | Задача | Файлы |
|---|---|---|
| 1A | 3 новые таблицы (analytics_events, funnel_daily, kpi_targets) | `src/lib/db.ts` |
| 1B | Middleware для session_id cookie + trackEvent() | `src/lib/analytics/tracker.ts` |
| 1C | Обогащение check_logs (user_id, session_id, utm_*, referrer) | `src/lib/storage.ts` |
| 1D | API воронки + агрегация | `src/app/api/admin/analytics/` |

**Acceptance:** session_id cookie ставится, UTM сохраняется, API воронки возвращает данные.

### Фаза 2 — UI воронки + план-факт (3 под-агента)

| # | Задача |
|---|---|
| 2A | Страница /admin/analytics + FunnelChart + ConversionTable |
| 2B | DrilldownModal + ForecastWidget |
| 2C | KPI UI (PlanFactCards, прогресс-бары) |

**Acceptance:** вкладка «Аналитика», воронка за любой период, drill-down, KPI.

### Фаза 3 — Финансы (3 под-агента)

| # | Задача |
|---|---|
| 3A | 3 таблицы + авто-записи revenue при оплате |
| 3B | CRUD транзакций, P&L, CSV импорт |
| 3C | UI: RevenueChart, PnlTable, BankImportModal |

**Acceptance:** P&L за месяц, импорт выписок CSV, вкладка «Финансы».

### Фаза 4 — Мультиканальная реклама (4 под-агента)

| # | Задача |
|---|---|
| 4A | Таблицы + интерфейс AdChannel + registry |
| 4B | Yandex Direct адаптер + cron синхронизации |
| 4C | Бюджетные лимиты + алерты (Telegram/email) |
| 4D | UI: дашборд каналов, бюджеты, лента алертов |

**Acceptance:** дашборд Директа, лимиты, алерты, вкладка «Реклама».

### Фаза 5 — AI-оптимизация (3 под-агента, после набора данных)

| # | Задача |
|---|---|
| 5A | Таблицы экспериментов + A/B middleware |
| 5B | AI-tool analyze_landing_page + z-test |
| 5C | UI рекомендаций + создание/результаты экспериментов |

**Acceptance:** AI-рекомендации, A/B тесты с статзначимостью, вкладка «Оптимизация».

### Фаза 6 — QA (4 параллельных)

Security + integration + performance + docs sync.

---

## Порядок (параллелизм)

```
Фаза 1 (трекинг) ─────> Фаза 2 (UI воронки) ─────> Фаза 6 (QA)
                                 │
Фаза 3 (финансы) ───────────────┘
                                 │
Фаза 4 (реклама) ───────────────┘
                                 │
Фаза 5 (AI-оптимизация) ────────┘ (последний, нужны данные)
```

**Фазы 1 и 3 — параллельно** (разные таблицы, разные API).

---

## Env matrix (новые)

| Переменная | Фаза | Обязательна |
|---|---|---|
| `ANALYTICS_SESSION_SECRET` | 1 | да |
| `BANK_IMPORT_ENABLED` | 3 | нет (default false) |
| `ADS_SYNC_CRON` | 4 | нет (default "0 6 * * *") |
| `BUDGET_ALERT_TELEGRAM_BOT_TOKEN` | 4 | нет |
| `BUDGET_ALERT_TELEGRAM_CHAT_ID` | 4 | нет |
| `VK_ADS_TOKEN` | 4+ | нет |
| `AB_TEST_ENABLED` | 5 | нет (default false) |

---

## Риск-регистр

| # | Риск | Вер. | Импакт | Митигация |
|---|---|---|---|---|
| R1 | Мало трафика для воронки | высокая | высокий | Начать трекинг СЕЙЧАС, Метрика как fallback |
| R2 | Перегрузка PG агрегациями | средняя | высокий | Предагрегация funnel_daily, индексы, EXPLAIN |
| R3 | YooKassa не активирована | высокая | средний | Ручной ввод revenue; авто-подключится позже |
| R4 | Разные форматы банковских выписок | средняя | средний | Начать с 1C/Тинькофф CSV |
| R5 | API каналов недоступны | средняя | низкий | Strategy pattern — канал-плагин |
| R6 | A/B невалидны при малом трафике | высокая | средний | Минимум 100 impression/вариант |
| R7 | Middleware замедляет страницы | низкая | высокий | Async fire-and-forget запись |
| R8 | Scope creep модуля 4 | высокая | средний | MVP — только рекомендации |

---

## Acceptance criteria (финальные)

1. Админ → `/admin/analytics` → видит воронку за месяц с конверсиями
2. Drill-down по дню показывает детали (откуда пришли, что проверяли)
3. KPI план-факт: можно установить цели и видеть прогресс
4. `/admin/finance` → P&L за месяц, выручка по продуктам
5. Импорт CSV банковской выписки → транзакции в таблице
6. `/admin/ads` → расходы/клики/конверсии Директа
7. Бюджетные лимиты → алерт при превышении
8. AI-консультант отвечает «какой ROI у кампании X?» с реальными данными
9. Рекомендации по UX сайта генерируются AI
10. Sidebar-навигация с 6 секциями

---

## Следующий шаг

1. ✅ План зафиксирован
2. ⏳ Одобрение владельцем
3. ⏳ Запуск Фазы 1 (4 параллельных под-агента)
