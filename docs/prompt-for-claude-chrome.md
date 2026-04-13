# Полная инструкция для настройки shtrafometer.ru

Ниже — 4 промпта для Claude в Chrome. Выполнять последовательно.
После каждого шага убеждайся что всё работает, потом переходи к следующему.

---

## Промпт 1: Настройка DNS на reg.ru

> Скопировать и отправить Claude в Chrome

```
Помоги мне настроить DNS для домена shtrafometer.ru на reg.ru, чтобы он указывал на Vercel.

Мой сайт задеплоен на Vercel по адресу shtrafometer.vercel.app.

Пошагово:

1. Зайти на reg.ru → Мои домены → shtrafometer.ru → DNS-серверы / Управление зоной
2. Убедиться что DNS-серверы = ns1.reg.ru и ns2.reg.ru
3. Удалить все существующие A-записи и CNAME для @ и www
4. Добавить новые записи:
   - A-запись: хост @, значение 76.76.21.21, TTL 3600
   - CNAME-запись: хост www, значение cname.vercel-dns.com., TTL 3600
5. Проверить что нет конфликтующих AAAA-записей для @
6. НЕ трогать MX и TXT записи

Веди меня пошагово по интерфейсу reg.ru. Если скину скриншот — подскажи что нажимать.
```

**После этого:** подожди 15-30 минут на пропагацию DNS.

---

## Промпт 2: Добавление домена в Vercel

> Скопировать и отправить Claude в Chrome

```
Помоги мне добавить custom domain в Vercel Dashboard.

Мне нужно:
1. Зайти в Vercel Dashboard → Project "shtrafometer" → Settings → Domains
2. Добавить домен shtrafometer.ru
3. Добавить домен www.shtrafometer.ru (настроить редирект www → без www)
4. Убедиться что Vercel выпустил SSL-сертификат (статус "Valid Configuration")
5. Если сертификат не выпустился — проверить что DNS уже прописан правильно

Также нужно добавить Environment Variables в Vercel:
Settings → Environment Variables → добавить для всех окружений (Production, Preview, Development):

- YOOKASSA_SHOP_ID = (значение из шага 3)
- YOOKASSA_SECRET_KEY = (значение из шага 3)
- RESEND_API_KEY = (значение из шага 4)
- FROM_EMAIL = Штрафометр <noreply@shtrafometer.ru>
- ADMIN_EMAIL = info@shtrafometer.ru

Пока оставь значения YooKassa и Resend пустыми — заполним после регистрации.

Веди меня пошагово.
```

---

## Промпт 3: Регистрация в ЮKassa

> Скопировать и отправить Claude в Chrome

```
Помоги мне подключить приём платежей через ЮKassa (yookassa.ru) для сервиса Штрафометр.

Контекст:
- Юрлицо: ООО «Инворк»
- ИНН: 7806618194
- ОГРН: 1247800025032
- Сайт: https://shtrafometer.ru
- Тип бизнеса: SaaS-сервис проверки сайтов на соответствие законам РФ
- Продаём: PDF-отчёты (1990 ₽), автоисправление (Базовый 4990 / Стандарт 9990 / Премиум 14990 ₽), мониторинг (490 ₽/мес), консалтинг (15000 ₽)

Пошагово:

1. Зайти на yookassa.ru → Зарегистрировать магазин (или войти если уже есть аккаунт)
2. Заполнить данные организации (ООО «Инворк», ИНН, ОГРН)
3. Указать сайт: https://shtrafometer.ru
4. Выбрать способы оплаты: банковские карты, СБП, ЮMoney
5. Указать URL для уведомлений (webhook): https://shtrafometer.ru/api/payment/webhook
6. Получить shopId и secretKey из настроек → раздел "Ключи API"
7. Настроить webhook:
   - URL: https://shtrafometer.ru/api/payment/webhook
   - События: payment.succeeded, payment.canceled
8. Записать shopId и secretKey — их нужно будет добавить в Vercel

ВАЖНО: Сначала использовать ТЕСТОВЫЙ режим для проверки. 
Тестовые ключи находятся в разделе "Настройки" → "Ключи API" → вкладка "Тестовый магазин".

СТАТУС (13.04.2026): Заявка подана, ожидаем активацию.
ЮKassa попросила: фиксированные цены (сделано) + доступ к ЛК покупателя (тестовый аккаунт: +79851234567).
Деплой: shtrafometer.ru через docker-compose на Beget VPS (НЕ Vercel).

После получения ключей — добавить в env на сервере (docker-compose.yml).

Веди меня пошагово по интерфейсу ЮKassa.
```

---

## Промпт 4: Регистрация в Resend (email-рассылки)

> Скопировать и отправить Claude в Chrome

```
Помоги мне настроить email-рассылку через Resend (resend.com) для домена shtrafometer.ru.

Контекст:
- Домен: shtrafometer.ru (DNS на reg.ru)
- Нужно отправлять: уведомления о результатах проверки, подтверждения заказов

Пошагово:

1. Зайти на resend.com → Sign Up (или войти)
2. Добавить домен shtrafometer.ru:
   - Domains → Add Domain → shtrafometer.ru
3. Resend покажет DNS-записи, которые нужно добавить на reg.ru. Обычно это:
   - TXT запись для SPF
   - CNAME записи для DKIM (3 штуки)
   - MX запись для bounce-домена
4. Для каждой записи — помоги мне добавить её в DNS-зону на reg.ru:
   - Зайти на reg.ru → Мои домены → shtrafometer.ru → DNS
   - Добавить каждую запись как указано Resend
5. Вернуться в Resend → нажать "Verify" → дождаться верификации
6. Получить API Key:
   - API Keys → Create API Key → назвать "Штрафометр Production"
   - Скопировать ключ (начинается с re_)
7. Записать API Key — его нужно добавить в Vercel

После получения ключа — сообщи мне, я добавлю его в Vercel Environment Variables:
- RESEND_API_KEY = re_xxxxx

Веди меня пошагово. Если скину скриншот — подскажи что нажимать.
```

---

## Промпт 5: Финальная настройка — добавить ключи в Vercel

> Скопировать и отправить Claude в Chrome

```
Помоги мне добавить секретные ключи в Vercel Dashboard.

Зайти в Vercel Dashboard → Project "shtrafometer" → Settings → Environment Variables.

Добавить/обновить переменные для Production, Preview и Development:

1. YOOKASSA_SHOP_ID = [ВСТАВИТЬ shopId из ЮKassa]
2. YOOKASSA_SECRET_KEY = [ВСТАВИТЬ secretKey из ЮKassa]  
3. RESEND_API_KEY = [ВСТАВИТЬ API key из Resend]
4. FROM_EMAIL = Штрафометр <noreply@shtrafometer.ru>
5. ADMIN_EMAIL = info@shtrafometer.ru

После добавления — нужно сделать Redeploy:
- Deployments → последний деплой → "..." → Redeploy

Веди меня пошагово.
```

---

## Порядок выполнения

| # | Что | Где | Время |
|---|-----|-----|-------|
| 1 | DNS на reg.ru | reg.ru | 5 мин + 15-30 мин ожидание |
| 2 | Домен в Vercel | vercel.com | 5 мин |
| 3 | ЮKassa (оплаты) | yookassa.ru | 15-30 мин |
| 4 | Resend (email) | resend.com + reg.ru | 15 мин |
| 5 | Ключи в Vercel | vercel.com | 5 мин |

**Итого:** ~1 час на всё.

## Проверка после настройки

- [ ] https://shtrafometer.ru открывается с SSL
- [ ] www.shtrafometer.ru редиректит на shtrafometer.ru
- [ ] Проверка сайта работает
- [ ] Email-gate отправляет письмо на почту
- [ ] Кнопка "Оплатить" редиректит на страницу ЮKassa
- [ ] После тестовой оплаты — возврат на /payment/success
- [ ] Webhook приходит → заявка меняет статус → email отправляется
