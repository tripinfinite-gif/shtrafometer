# Resume Plan: AI-консультант v2.2-ai — продолжение после паузы

> Создан: 2026-04-15 (ночь, после зависшей сессии)
> Базовый план: [plan-ai-consultant.md](./plan-ai-consultant.md)
> Проект: **site-checker** (shtrafometer.ru)
> Статус на момент паузы: Фаза 0 (OAuth регистрация), инициирована Comet-агентом, результат неизвестен

---

## TL;DR — где остановились

Прошлая сессия зависла на переходе от **Фазы 0 → Фазе 1**. План зафиксирован (12 этапов, стек согласован), но:

1. Неизвестен статус OAuth-регистрации в Яндекс.Директе (делал Comet)
2. В `.env.local` на деве **не проверены** `YANDEX_DIRECT_CLIENT_ID/SECRET`
3. Заявка в реестр API Директа (модерация 1-3 дня) — статус неизвестен
4. Код не тронут, миграции БД не применены

---

## Шаг 0 — Восстановление контекста (5 мин)

Перед любыми действиями:

```bash
# 1. Проверить, есть ли OAuth-креды локально
grep -E "YANDEX_DIRECT_(CLIENT_ID|CLIENT_SECRET|REDIRECT_URI)" site-checker/.env.local 2>/dev/null || echo "❌ кредов нет"

# 2. Проверить git — не было ли несохранённых изменений
cd "site-checker" && git status && git log --oneline -5

# 3. Прочитать основной план (контекст архитектуры)
# docs/plan-ai-consultant.md — ОБЯЗАТЕЛЬНО
```

Если креды есть → пропускай Шаг 1.
Если кредов нет → Шаг 1 (передать инструкцию Comet-агенту или сделать вручную).

---

## Шаг 1 — OAuth регистрация Яндекс.Директ (blocker)

**Файл с инструкцией для агента:** [prompt-yandex-direct-oauth.md](./prompt-yandex-direct-oauth.md)

Передать Comet-агенту (или выполнить самому). На выходе нужны:

- `YANDEX_DIRECT_CLIENT_ID` — из oauth.yandex.ru
- `YANDEX_DIRECT_CLIENT_SECRET` — оттуда же
- `YANDEX_DIRECT_REDIRECT_URI` — `https://shtrafometer.ru/api/admin/ai/oauth/yandex/callback` (+ локальный `http://localhost:3000/...`)
- Заявка в реестр API Директа (форма через Яндекс.Директ → Настройки → API) — модерация 1-3 рабочих дня

**Параллельно можно:** завести YandexGPT Cloud folder (для фазы 2) и получить `YANDEX_GPT_API_KEY` + `YANDEX_GPT_FOLDER_ID`. Это **не блокирует** Фазу 1.

---

## Шаг 2 — Запуск Фазы 1 (Foundation)

После того как Шаг 0/1 закрыты (или пока идёт модерация — OAuth нужен только в Фазе 3), стартуем Фазу 1 по плану:

**3 параллельных под-агента:**
- **1A** (db-migrations): pgvector + pgcrypto + 5 таблиц → `src/lib/db.ts`
- **1B** (env + config): `src/lib/env.ts` + `.env.example`
- **1C** (UI shell): `/admin/ai-consultant` + auth guard + nav-линк

**Запуск:** одно сообщение с 3 Agent-tool-calls. Главный агент — проверка: `pnpm build`, локальный запуск миграций, смоук `/admin/ai-consultant`.

**Acceptance Фазы 1:**
- [ ] 5 новых таблиц в PG (проверить `\dt ai_*`)
- [ ] Страница `/admin/ai-consultant` открывается (пусто, но рендерится)
- [ ] `pnpm build` зелёный
- [ ] Навигация в админке обновлена

---

## Шаг 3 — Фаза 2 (Chat MVP)

Требует API-ключей (**не** требует Яндекс.Директ OAuth):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `YANDEX_GPT_API_KEY` + `YANDEX_GPT_FOLDER_ID`

3 параллельных под-агента (2A/2B/2C), см. план. Главный — prompt caching check + смоук 5 вопросов.

---

## Шаг 4 — Фаза 3 (Tool use + OAuth)

**Блокер:** одобренная заявка в реестре API Директа + `AI_TOKEN_ENCRYPTION_KEY` (сгенерить через `openssl rand -base64 32`).

4 параллельных под-агента (3A/3B/3C/3D) → интеграция главным агентом.

---

## Открытые вопросы на момент старта сессии

1. Статус Comet-агента по OAuth? → закрыть **первым действием**
2. Прод/дев URL для redirect_uri — использовать оба или только прод? → **оба** (dev + prod в списке Callback URL в приложении Яндекса)
3. Кто держит аккаунт Яндекса, куда регать приложение? → **владелец проекта** (tripinfinite@gmail.com или корп.аккаунт Штрафометра — уточнить)

---

## Чеклист возобновления (минимальный)

- [ ] Прочитать `hot.md` + `plan-ai-consultant.md` + этот файл
- [ ] Проверить `.env.local` на наличие YANDEX_DIRECT_*
- [ ] Если нет — отдать `prompt-yandex-direct-oauth.md` Comet-агенту
- [ ] Параллельно запустить Фазу 1 (3 под-агента) — она не зависит от OAuth
- [ ] После завершения Фазы 1 → коммит → переход к Фазе 2

---

## Ссылки

- Основной план: [plan-ai-consultant.md](./plan-ai-consultant.md)
- OAuth инструкция: [prompt-yandex-direct-oauth.md](./prompt-yandex-direct-oauth.md)
- Маркетинговая стратегия (корпус): [marketing-strategy-2026.md](./marketing-strategy-2026.md)
- Vault: `~/ClaudeVault/wiki/projects/shtrafometer/`
