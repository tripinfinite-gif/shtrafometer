# План: Decision Log + Experiment Tracking для рекламного модуля

> Создан: 2026-04-16
> Проект: site-checker (shtrafometer.ru)
> Зависит от: plan-admin-platform.md (Модуль 3 — Реклама)

---

## Цель

Журнал рекламных решений с привязкой к временной шкале метрик: фиксируем «что изменили и зачем», потом видим «что это дало» — усиливаем плюсы, откатываем минусы.

---

## Аналоги и best practices

| Источник | Что берём | Что пропускаем |
|---|---|---|
| Google Ads Change History | Before/after JSONB, overlay на графиках | API polling (один аккаунт) |
| Facebook Activity Log | Timeline-лента, actor | Многопользовательская коллаборация |
| Amplitude Annotations | Вертикальные маркеры (ReferenceLine) | Mentions |
| PostHog Experiments | Привязка гипотезы к метрикам | Полный A/B фреймворк (есть в модуле 4) |
| Optmyzr | Before/after comparison, автовердикт | Multi-account |

---

## Схема БД

```sql
CREATE TABLE ad_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decision_type TEXT NOT NULL,        -- bid_change/budget_change/campaign_toggle/creative_change/strategy_change/targeting_change/negative_keywords/other
  channel_id TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  before_value JSONB,
  after_value JSONB,
  hypothesis TEXT,                    -- "Ожидаем рост CTR на 15%"
  tags TEXT[] DEFAULT '{}',
  outcome TEXT DEFAULT 'pending',     -- pending/positive/negative/neutral/inconclusive
  outcome_comment TEXT,
  outcome_assessed_at TIMESTAMPTZ,
  actor TEXT NOT NULL DEFAULT 'admin', -- admin/ai-consultant
  conversation_id UUID,               -- FK ai_conversations
  audit_log_id UUID,                  -- FK ai_audit_log
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE ad_decision_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES ad_decisions(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL,         -- before/after
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL,             -- {impressions, clicks, spend, conversions, ctr, cpa, roi}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (decision_id, snapshot_type)
);
```

---

## UI компоненты

1. **Decision Timeline** (`/admin/ads/decisions`) — вертикальная лента решений, фильтры, кнопка «Новое решение»
2. **Decision Form** — модалка: тип, канал, кампания, before/after, гипотеза, теги
3. **Chart Annotations** — вертикальные маркеры на графиках метрик (Recharts ReferenceLine)
4. **Impact Card** — 7 дней до vs 7 дней после, дельта, автовердикт
5. **Dashboard Widget** — компактная карточка на `/admin/ads/`

---

## API

```
POST   /api/admin/ads/decisions
GET    /api/admin/ads/decisions?channel_id=&type=&outcome=&from=&to=
GET    /api/admin/ads/decisions/:id
PATCH  /api/admin/ads/decisions/:id/outcome
GET    /api/admin/ads/decisions/:id/impact
GET    /api/admin/ads/decisions/annotations?from=&to=
```

---

## AI-интеграция

- **Автозапись** при mutating tool_use → запись в ad_decisions с actor='ai-consultant'
- **Tool `get_decision_history`** — «что меняли за неделю?»
- **Tool `get_decision_impact`** — оценка влияния решения
- **Tool `record_decision`** (mutating, HITL) — запись решения через чат
- **Промпт**: AI предлагает записать решение при обсуждении изменений, объясняет аномалии через журнал

---

## Impact Correlation — алгоритм

1. T = decision.created_at
2. before = [T-7d, T-1d], after = [T+1d, T+7d]
3. Если after < 3 дней → inconclusive
4. Delta по: impressions, clicks, CTR, spend, conversions, CPA, ROI
5. Автовердикт: conversions↑ + CPA↓ → positive; conversions↓ или CPA↑>20% → negative
6. Предупреждение при множественных решениях в периоде

---

## Фазы

| Фаза | Задача | Зависимости |
|---|---|---|
| D1 | Таблицы + CRUD + API routes | нет |
| D2 | UI Timeline + Form + пункт в sidebar | D1 |
| D3 | Chart Annotations + Impact Card (Recharts) | D1+D2 |
| D4 | AI tools (get_decision_history, record_decision) | D1 |

D1 и D4 параллельно. D2 и D3 последовательно (D3 нужен UI из D2).

---

## Следующий шаг

Одобрение → запуск D1+D4 параллельно → D2 → D3.
