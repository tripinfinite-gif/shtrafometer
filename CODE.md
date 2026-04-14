# Штрафометр — Технический кодекс

> Последнее обновление: 2026-04-14
> Этот файл описывает, что уже сделано в коде, для всех агентов и чатов.

## Стек

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Cheerio (парсинг HTML), jose (JWT), bcryptjs (пароли)
- PostgreSQL 16 (pg driver, автомиграция)
- Docker Compose на Beget VPS, Coolify (только Traefik-прокси)
- Прод: https://shtrafometer.ru
- Деплой: `git pull + docker compose up -d --build app`

## Структура приложения

Основной код в `src/`:
- `src/app/` — страницы Next.js App Router: главная, /blog, /pricing, /privacy, /offer, /requisites, /admin/*, /auth/*, /cabinet/*, /api/*
- `src/checks/` — 8 модулей проверки (152-ФЗ, 38-ФЗ, 168-ФЗ, 436-ФЗ, ЗоЗПП, 54-ФЗ, безопасность, локализация) + engine.ts
- `src/fixes/` — генераторы автоисправлений (SSH/FTP), executor.ts, plan-builder.ts
- `src/lib/` — db.ts (PostgreSQL, 6 таблиц), auth.ts (JWT/bcrypt), user-auth.ts (SMS OTP), storage.ts, yookassa.ts, email.ts
- `src/content/` — посты блога (массив `posts` из `@/content/blog`)

## SEO (реализовано 2026-04-14)

### Что сделано
- `layout.tsx`: Yandex verification (env: NEXT_PUBLIC_YANDEX_WEBMASTER_KEY), canonical URL `https://shtrafometer.ru`, og:image `/og-image.png` (1200×630), Organization + WebApplication JSON-LD
- `sitemap.ts`: фиксированные даты lastModified, 6 статических страниц (/, /blog, /privacy, /pricing, /offer, /requisites) + все посты блога через `posts.map()`
- `robots.ts`: правила для GPTBot, ClaudeBot, anthropic-ai (allow /, disallow /admin/ /api/)
- `blog/[slug]/page.tsx`: NewsArticle JSON-LD, canonical URL на каждую статью (`https://shtrafometer.ru/blog/${slug}`), og:image + twitter:card
- `public/llms.txt` + `public/llms-full.txt`: описание сервиса для AI-агентов (существовали до)

### Что нужно сделать вручную
1. Получить ключ верификации в Яндекс.Вебмастер (webmaster.yandex.ru)
2. Добавить в `.env.local` на сервере: `NEXT_PUBLIC_YANDEX_WEBMASTER_KEY=XXXXXXXX`
3. Создать файл `/public/og-image.png` (1200×630 px, фиолетовый фон #6C5CE7, белый текст «Штрафометр»)
4. Задеплоить: `git pull + docker compose up -d --build app`
5. В Яндекс.Вебмастер: подтвердить верификацию → добавить sitemap → указать регион Москва

## Авторизация

### Пользователи (личный кабинет)
- SMS OTP через SMS.ru API
- Серверные сессии в PostgreSQL (таблица user_sessions, 30 дней)
- Cookie: `user_session`
- Роуты: /auth/login, /auth/register
- API: /api/auth/send-code, /api/auth/verify-code, /api/auth/user-logout

### Администратор
- JWT + bcrypt
- Пароль: env ADMIN_PASSWORD_HASH_B64 (base64-encoded bcrypt)
- Cookie: admin_session
- Роуты: /admin/login, /admin/

## Проверки сайтов (модули)

| Модуль | Файл | Закон | Кодов |
|--------|------|-------|-------|
| Персональные данные | mod-personal-data.ts | 152-ФЗ | pd-01..pd-10 |
| Локализация сервисов | mod-localization.ts | — | loc-01..loc-11 |
| Реклама | mod-advertising.ts | 38-ФЗ | ad-01..ad-06 |
| Государственный язык | mod-language.ts | 168-ФЗ | lang-01..lang-03 |
| Права потребителей | mod-consumer.ts | ЗоЗПП | con-01..con-09 |
| Электронная торговля | mod-ecommerce.ts | 54-ФЗ | ecom-01..ecom-03 |
| Контент/возраст | mod-content.ts | 436-ФЗ | cnt-01..cnt-04 |
| Безопасность | mod-security.ts | — | sec-01..sec-03 |

## Оплата

- YooKassa API (ожидает активацию)
- Тестовый аккаунт: +79851234567

## Аналитика

- Яндекс.Метрика: счётчик 108525306
- Цели: free_check, order_form_open, order_submit, payment_success, user_register, user_login, pdf_download
- Хелпер: `ym_goal(goalName)` в клиентских компонентах

## Env переменные

| Переменная | Назначение | Обязательна |
|---|---|---|
| DATABASE_URL | PostgreSQL connection string | ДА |
| ADMIN_PASSWORD_HASH_B64 | bcrypt-хеш пароля админа (base64) | ДА |
| JWT_SECRET | Секрет для JWT сессий | ДА |
| USER_SESSION_SECRET | Секрет для пользовательских сессий | ДА |
| SMS_RU_API_KEY | SMS.ru для OTP | ДА |
| YOOKASSA_SHOP_ID | YooKassa shop ID | ДА |
| YOOKASSA_SECRET_KEY | YooKassa secret | ДА |
| RESEND_API_KEY | Email-уведомления | ДА |
| NEXT_PUBLIC_YANDEX_WEBMASTER_KEY | Верификация Яндекс.Вебмастер | Нет (SEO) |

## Деплой

```bash
ssh deploy@109.69.18.80
cd /home/deploy/shtrafometer/repo
git pull origin main
cd ..
docker compose up -d --build app
```
