# Инструкция для Claude в Chrome — деплой Штрафометра в Coolify

Coolify Dashboard: http://109.69.18.80:8000

---

## Промпт 1: Создать PostgreSQL для Штрафометра

```
Помоги мне создать новую базу данных PostgreSQL в Coolify для проекта Штрафометр.

Я нахожусь в Coolify Dashboard (http://109.69.18.80:8000).

Пошагово:

1. Перейти в Projects → создать новый проект "Shtrafometer"
2. Внутри проекта → создать новый Environment "production"
3. В environment → Add New Resource → Database → PostgreSQL 16
4. Настройки PostgreSQL:
   - Name: shtrafometer-postgres
   - Database: shtrafometer
   - User: shtrafometer
   - Password: сгенерировать надёжный пароль (запиши его!)
   - Port: оставить 5432 (внутренний, не публиковать наружу!)
5. Запустить (Deploy)
6. Дождаться статуса "Running"
7. Записать Internal URL — он будет вида:
   postgresql://shtrafometer:[password]@shtrafometer-postgres:5432/shtrafometer

Важно: НЕ делать порт публичным. БД доступна только внутри Docker-сети.

Запиши DATABASE_URL — он понадобится на следующем шаге.
```

---

## Промпт 2: Добавить приложение Штрафометр

```
Помоги мне добавить Next.js приложение в Coolify.

Я в Coolify Dashboard → Project "Shtrafometer" → Environment "production".

Пошагово:

1. Add New Resource → Application
2. Источник: GitHub (Private Repository via GitHub App)
   - Если GitHub App ещё не подключен — использовать существующий "infologistic-coolify"
   - Repository: tripinfinite-gif/shtrafometer
   - Branch: main
3. Build Pack: Dockerfile
4. Настройки:
   - Port: 3000
   - Domain: shtrafometer.ru
   - HTTPS: включить (Let's Encrypt)
   - Health Check Path: / (или оставить пустым)
   - Auto Deploy: Yes (из ветки main)

5. Environment Variables — добавить ВСЕ следующие:

DATABASE_URL = postgresql://shtrafometer:[ПАРОЛЬ ИЗ ШАГА 1]@shtrafometer-postgres:5432/shtrafometer
SESSION_SECRET = [сгенерировать случайную строку 32+ символов]
ADMIN_PASSWORD_HASH_B64 = [будет добавлен позже]
YOOKASSA_SHOP_ID = [из ЮKassa, когда получим]
YOOKASSA_SECRET_KEY = [из ЮKassa, когда получим]
RESEND_API_KEY = [из Resend, когда получим]
FROM_EMAIL = Штрафометр <noreply@shtrafometer.ru>
ADMIN_EMAIL = info@shtrafometer.ru

6. Deploy!
7. Дождаться статуса "Running" и "Healthy"

Если билд падает — покажи мне логи билда, я разберусь.
```

---

## Промпт 3: Переключить DNS на Бегет

> ТОЛЬКО после того как сайт заработал по IP или через Coolify-прокси!

```
Помоги мне переключить DNS домена shtrafometer.ru с Vercel на VPS Бегет.

Зайти на reg.ru → Мои домены → shtrafometer.ru → DNS.

Изменить записи:

1. A-запись для @:
   - Было: 216.198.79.1 (Vercel)
   - Новое: 109.69.18.80 (Бегет VPS)

2. A-запись/CNAME для www:
   - Удалить CNAME запись для www
   - Добавить A-запись: www → 109.69.18.80

3. Остальные записи (MX, TXT для Resend) — НЕ трогать

Сохранить. DNS-пропагация займёт 15-30 минут.

После пропагации сайт будет работать с VPS в России.
```

---

## Промпт 4: Добавить DNS для email (Resend)

```
Если ещё не добавлены DNS-записи для Resend — добавить их на reg.ru.

Зайти на reg.ru → shtrafometer.ru → DNS → добавить записи, которые показал Resend при добавлении домена.

Обычно это:
- TXT запись для SPF
- CNAME записи для DKIM (3 штуки)
- MX запись для bounce

Точные значения берутся из Resend Dashboard → Domains → shtrafometer.ru → DNS Records.
```

---

## Порядок выполнения

| # | Что | Кто | Время |
|---|-----|-----|-------|
| 1 | Создать PostgreSQL в Coolify | Claude Chrome | 5 мин |
| 2 | Добавить приложение в Coolify | Claude Chrome | 10 мин |
| 3 | Проверить что сайт работает | Ты в браузере | 5 мин |
| 4 | Переключить DNS на reg.ru | Claude Chrome | 5 мин |
| 5 | Подождать DNS-пропагацию | — | 15-30 мин |
| 6 | Проверить https://shtrafometer.ru | Ты в браузере | 2 мин |

## Проверка после деплоя

- [ ] Сайт открывается по домену с SSL
- [ ] Проверка сайта работает (ввести URL)
- [ ] Email-gate отправляет email
- [ ] Админка (/admin) доступна
- [ ] Оплата редиректит на ЮKassa (после настройки ключей)
- [ ] Регистрация (/auth/register) — получить SMS код, войти
- [ ] Кабинет (/cabinet) — дашборд, сайты, заказы

## Известные подводные камни (обязательно проверять!)

### 1. DATABASE_URL — имя хоста
В `DATABASE_URL` использовать **имя контейнера** `shtrafometer-postgres`, НЕ имя сервиса `postgres`.
Имя `postgres` конфликтует с Coolify's БД и app подключится к чужой базе.

### 2. traefik.docker.network
ОБЯЗАТЕЛЬНО указывать label `traefik.docker.network=coolify` если контейнер в нескольких Docker-сетях.
Без этого — Gateway Timeout 504.

### 3. Пароль PostgreSQL
- Не использовать спецсимволы (`!`, `@`, `#`) в пароле — ломает парсинг DATABASE_URL
- `POSTGRES_PASSWORD` задаёт пароль только при первом создании volume
- Для смены: `docker exec shtrafometer-postgres psql -U shtrafometer -c "ALTER USER ... PASSWORD '...'"`

### 4. Деплой нового кода
```bash
cd /home/deploy/shtrafometer/repo && git pull origin main
cd /home/deploy/shtrafometer && docker compose build --no-cache app && docker compose up -d app
```
Coolify НЕ автодеплоит из docker-compose — нужен ручной build+up.
