# План: AI-консультант по Яндекс.Директ/SEO в админке Штрафометра

> Создан: 2026-04-15
> Методология: Bulletproof (L, 12 этапов)
> Проект: **site-checker** (shtrafometer.ru), админка `/admin/ai-consultant`

---

## Цель

Встроить в админку Штрафометра AI-агента-консультанта по продвижению в Яндексе (Директ, РСЯ, SEO, AEO) с:

1. Базой знаний 2025–2026 по Директу (корпус обновляется автоматически)
2. Доступом к реальным данным рекламных кабинетов через API Яндекс.Директа v5, Метрики, Вебмастера
3. Предложением мутирующих действий **только через human-in-the-loop** (дифф → апрув → запись + audit log)

---

## Финальный стек (согласовано)

| Слой | Решение | Обоснование |
|---|---|---|
| Проект | **site-checker (Штрафометр)**, `/admin/ai-consultant` | Здесь идёт реальная реклама (4 кампании), здесь Метрика 108525306 |
| Архитектура | Отдельная админ-вкладка, отдельный chat UI | Чистое разделение от штатной админки |
| LLM primary | **OpenAI GPT-4o** (через `@ai-sdk/openai`) | Массовые FAQ-запросы |
| LLM для tool use / сложного reasoning | **Claude Sonnet 4.5** (через `@ai-sdk/anthropic`) | Лучший tool use в индустрии |
| LLM fallback / юр. комфорт | **YandexGPT 5 Pro** (свой адаптер к AI SDK) | Бесплатен с июля 2025, в РФ, резерв |
| Роутер | Классификатор по keywords + длине | FAQ → OpenAI, tool-heavy → Claude, short → YandexGPT |
| Chat runtime | **Vercel AI SDK v6** + **Anthropic SDK** | Streaming, tool calling через Zod |
| Vector DB | **pgvector** в существующей PG 16 | Без доп. сервисов, общий бэкап |
| Embeddings | **multilingual-e5-large** self-hosted в Docker (1024 dim) | Future-proof, 0 ₽ per-call |
| API клиенты | Свои тонкие клиенты + **Zod** | Официальных Node SDK нет |
| Безопасность mutating | `<ToolCallConfirmation>` HITL | ФАС, бюджеты, 152-ФЗ |
| Хранилище | PG 16 — новые таблицы + pgcrypto | Один источник правды |
| Деплой | Docker Compose на Beget VPS | Тот же паттерн что у блога |

---

## Env matrix

Новые переменные (добавить в `.env.example` + валидация в `src/lib/env.ts`):

| Переменная | Назначение | Фаза | Обязательна |
|---|---|---|---|
| `OPENAI_API_KEY` | OpenAI GPT-4o | 2 | да |
| `ANTHROPIC_API_KEY` | Claude Sonnet | 2 | да |
| `YANDEX_GPT_API_KEY` | YandexGPT | 2 | да |
| `YANDEX_GPT_FOLDER_ID` | ID каталога Yandex Cloud | 2 | да |
| `YANDEX_DIRECT_CLIENT_ID` | OAuth-приложение | 3 | да |
| `YANDEX_DIRECT_CLIENT_SECRET` | OAuth secret | 3 | да |
| `YANDEX_DIRECT_REDIRECT_URI` | OAuth callback | 3 | да |
| `AI_TOKEN_ENCRYPTION_KEY` | pgcrypto ключ для OAuth-токенов клиентов | 3 | да |
| `EMBEDDINGS_SERVICE_URL` | URL self-hosted e5-large | 4 | да |
| `AI_ROUTER_MODE` | `auto` / `openai-only` / `claude-only` / `yandexgpt-only` | 2 | нет |
| `AI_RATE_LIMIT_PER_HOUR` | Лимит запросов/час | 5 | нет (default 60) |

---

## Схема БД (новые таблицы)

Через существующий `initSchema()` в `src/lib/db.ts` (auto-migrate, паттерн проекта).

```
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Диалоги
ai_conversations
  id uuid PK
  user_id text (админ: "admin")
  title text
  created_at, updated_at
  archived boolean default false

-- 2. Сообщения
ai_messages
  id uuid PK
  conversation_id (FK ai_conversations)
  role text ('user' | 'assistant' | 'tool')
  content text
  tool_calls jsonb
  tool_result jsonb
  model_used text ('openai-gpt-4o' | 'claude-sonnet-4.5' | 'yandexgpt-5-pro')
  tokens_input int, tokens_output int, cache_read_tokens int
  created_at

-- 3. База знаний
ai_knowledge_chunks
  id uuid PK
  source_id text, source_url text
  source_type text ('rss' | 'blog' | 'tg' | 'manual' | 'api-doc')
  title text, content text
  embedding vector(1024)
  tags text[], layer text ('facts' | 'practices' | 'cases' | 'news' | 'legal')
  published_at, ingested_at
  ttl_days int

-- 4. OAuth-токены клиентских аккаунтов Яндекса
ai_client_oauth_tokens
  id uuid PK, user_id text
  provider text ('yandex-direct' | 'yandex-metrika' | 'yandex-webmaster')
  access_token_encrypted bytea    -- pgcrypto
  refresh_token_encrypted bytea
  expires_at, scope text
  client_login text               -- для агентского режима
  created_at, last_used_at

-- 5. Аудит tool-вызовов
ai_audit_log
  id uuid PK, user_id text, conversation_id uuid
  action text ('tool_proposed' | 'tool_approved' | 'tool_denied' | 'tool_executed')
  tool_name text, tool_args jsonb, tool_result jsonb
  created_at

-- Индексы
CREATE INDEX ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON ai_messages (conversation_id, created_at);
CREATE INDEX ON ai_audit_log (user_id, created_at DESC);
```

---

## Фазы

### Фаза 0 — этот план + OAuth регистрация (параллельно)

- [x] План зафиксирован
- [ ] OAuth Яндекс зарегистрирован пользователем (Comet-агент)
- [ ] Заявка в реестр API Директа подана (модерация 1–3 дня)

**Acceptance:** план согласован, ClientID/Secret в `.env.local`.

---

### Фаза 1 — Foundation (3 под-агента параллельно)

| # | Под-агент | Задача | Файлы |
|---|---|---|---|
| **1A** | db-migrations | pgvector + pgcrypto extensions; 5 новых таблиц с индексами; расширение `initSchema()` | `src/lib/db.ts` |
| **1B** | env + config | `src/lib/env.ts` валидатор; обновление `.env.example`; документация ключей | `src/lib/env.ts`, `.env.example` |
| **1C** | UI shell | Страница `/admin/ai-consultant` (Apple-стиль, тёмная тема); auth guard через `proxy.ts`; nav-линк в админке | `src/app/admin/ai-consultant/page.tsx`, обновления в `src/app/admin/page.tsx` |

**Синхронизация:** файлы НЕ пересекаются. Главный агент после: `pnpm build` + локальный запуск миграций.

**Acceptance:** страница открывается, 5 таблиц в БД, build зелёный.

---

### Фаза 2 — Chat MVP (3 под-агента параллельно)

| # | Под-агент | Задача | Файлы |
|---|---|---|---|
| **2A** | LLM провайдеры + API | `src/lib/ai/providers/{openai,anthropic,yandexgpt}.ts`; роутер-классификатор; `POST /api/admin/ai/chat` со streaming; persistence | `src/lib/ai/*.ts`, `src/app/api/admin/ai/chat/route.ts` |
| **2B** | Chat UI | Vercel AI SDK `useChat`; markdown-рендер; копирование ответа; список/переключение диалогов; индикатор модели | `src/components/ai-chat/*.tsx`, интеграция в `/admin/ai-consultant` |
| **2C** | Knowledge corpus v0 | 120–150k токенов system prompt: `docs/marketing-strategy-2026.md` + defuddle-очищенные статьи eLama/ppc.world/click.ru | `src/data/kb/direct-core.md`, `src/lib/ai/kb-loader.ts` |

**Главный агент после:** prompt caching check (cache_read_tokens > 0 на 2-м запросе), смоук-тест 5 вопросов.

**Acceptance:** чат отвечает за 3–5 сек, история сохраняется, роутер работает по режимам.

---

### Фаза 3 — Tool use + OAuth (4 под-агента параллельно + интеграция)

| # | Под-агент | Задача | Файлы |
|---|---|---|---|
| **3A** | Direct API client | Read-only v5 методы + Zod | `src/lib/yandex/direct.ts`, `src/lib/yandex/direct.schemas.ts` |
| **3B** | Metrika client | counters/goals/reports + Zod | `src/lib/yandex/metrika.ts` |
| **3C** | Webmaster client | hosts/queries/sitemaps + Zod | `src/lib/yandex/webmaster.ts` |
| **3D** | OAuth flow + crypto | start/callback routes; pgcrypto шифрование; UI `/admin/ai-consultant/connections` | `src/app/api/admin/ai/oauth/yandex/*`, `src/lib/yandex/token-vault.ts` |

**После параллели — интеграция (главный агент):** регистрация tools в chat route, HITL-политика для mutating, audit log.

**Acceptance:** реальные данные из Метрики/Директа в ответах, mutating → diff → apply → audit.

---

### Фаза 3.5 — QA gate №1 (4 параллельных QA)

QA-1 security (semgrep, insecure-defaults), QA-2 integration прогон, QA-3 prompt eval (галлюцинации API), QA-4 docs sync.

---

### Фаза 4 — RAG upgrade (условно, если корпус >200k)

| # | Под-агент | Задача |
|---|---|---|
| **4A** | embeddings service | Docker-контейнер e5-large (FastAPI) |
| **4B** | ingestion cron | Парсер RSS/TG, chunking, embeddings, запись в `ai_knowledge_chunks` |
| **4C** | retrieval | Top-K + MMR, интеграция в chat route |

---

### Фаза 5 — Production hardening (3 параллельно)

5A — rate limiting + audit UI · 5B — eval harness (50 golden) · 5C — monitoring + fallback router

---

### Фаза 5.5 — Финальный QA

4 параллельных QA-агента (security + integration + prompt eval + docs sync) → сводный отчёт → go/no-go на деплой.

---

## Риск-регистр

| # | Риск | Вер. | Импакт | Митигация |
|---|---|---|---|---|
| R1 | Claude API недоступен (санкции) | средняя | высокий | Роутер → OpenAI/YandexGPT |
| R2 | OpenAI API недоступен | низкая | средний | Fallback на Claude/YandexGPT |
| R3 | Миграция pgvector падает | низкая | высокий | `IF NOT EXISTS`, dev-тест, бэкап до деплоя |
| R4 | Утечка OAuth-токенов | низкая | критический | pgcrypto, ключ в secret-vault, ротация |
| R5 | Агент выполняет опасное действие | средняя | критический | HITL-компонент, unit-test policy, audit log |
| R6 | Prompt caching TTL 5 мин | средняя | средний | Стабильный префикс, monitoring cache_read_tokens |
| R7 | Лимиты Direct API (баллы) | высокая | средний | Кеш 5–15 мин, батчинг |
| R8 | API Яндекса меняет схему | высокая | средний | Zod падает явно, sanity-check cron |
| R9 | Embeddings съедает RAM VPS | средняя | средний | Монитор памяти, план выноса |
| R10 | Cost overrun | средняя | средний | Бюджет-алерты, роутинг FAQ на YandexGPT |
| R11 | ФАС: AI-креативы без пометки | низкая | средний | System prompt требует пометку «подготовлено с ИИ» |
| R12 | ЕРИД не попал в креатив | средняя | высокий | System prompt: при генерации объявления — обязательное напоминание про erid-токен |

---

## Acceptance criteria (DoD)

1. Админ → `/admin/ai-consultant` → вопрос → ответ ≤5 сек
2. OAuth Яндекс подключен → таблица `ai_client_oauth_tokens` заполнена (зашифрованно)
3. «Сколько кликов на 709014339 за вчера?» → реальные цифры
4. «Останови кампанию X» → diff → apply → audit запись
5. Новый источник в корпусе → после cron агент его цитирует
6. Rate limit + fallback работают
7. Eval ≥40/50, QA зелёные, docs синхронизированы

---

## Следующий шаг

1. ✅ План одобрен
2. ⏳ OAuth регистрация (Comet-агент)
3. ⏳ После OAuth + ключи в env → Фаза 1 (3 параллельных под-агента)

---

## Ссылки

- Маркетинговая стратегия (источник корпуса): `docs/marketing-strategy-2026.md`
- Архитектура: `CLAUDE.md`, `CODE.md`
- Текущие кампании: `docs/marketing-strategy-2026.md` § 4-АКТУАЛЬНО
- Месячные KPI: `.business/goals/monthly.md`
