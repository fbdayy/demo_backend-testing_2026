[Смотреть стилизованную версию](https://fbdayy.github.io/demo_backend-testing_2026/index.ru)

**Русский** | [English](README.md)

![Node.js 22 Alpine](https://img.shields.io/badge/Node.js-22%20Alpine-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm 11](https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white)
![NestJS 10](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Prisma v7](https://img.shields.io/badge/Prisma-v7-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL 17 Alpine](https://img.shields.io/badge/PostgreSQL-17%20Alpine-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![ethers](https://img.shields.io/badge/ethers-2535A0?style=flat-square&logo=ethereum&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

# Mini Bank API

Небольшой backend на NestJS для приложения-кошелька: владельцы (owners) авторизуются через подпись Ethereum (в упрощённом стиле Sign-In-With-Ethereum), держат счета в двух выдуманных тикерах (`PET`, `CAT`) и атомарно переводят баланс между счетами.

> ⚠️ **Это демонстрационный и упрощённый по логике backend, не взаимодействующий с блокчейнами. Реальными средствами он оперировать не может.**
> Через ETH-адрес в приложении создаётся лишь пользователь. Все средства и счета существуют только внутри БД в специфичном формате.

## Оглавление

- [Минимальные требования для запуска](#минимальные-требования-для-запуска)
- [Стек технологий](#стек-технологий)
  - [Возможные дополнения](#возможные-дополнения)
- [Структура проекта](#структура-проекта)
- [Условия использования и лицензия](#условия-использования-и-лицензия)
- [Дополнительно](#дополнительно)
  - [Цель создания](#цель-создания)
  - [Об участии LLM](#об-участии-llm)
- [Предостережения](#предостережения)
  - [ETH-адреса](#eth-адреса)
  - [.env](#env)
  - [schema.prisma](#schemaprisma)
  - [Prisma Studio](#prisma-studio)
- [Установка](#установка)
  - [Подготовка](#подготовка)
  - [Непосредственно установка](#непосредственно-установка)
- [Документация API (Swagger)](#документация-api-swagger)
- [Справочник API](#справочник-api)
  - [Auth — `/auth`](#auth--auth)
  - [Owners — `/owners`](#owners--owners)
  - [Accounts — `/accounts`](#accounts--accounts)
  - [Transfers — `/transfers`](#transfers--transfers)
  - [Пример флоу (curl)](#пример-флоу-curl)
- [Заметки об архитектуре](#заметки-об-архитектуре)

## Минимальные требования для запуска

> ⚠️ Требования указаны для запуска приложения, при изменении или обновлении возможно увеличение требований.

- 4 Гб свободного места на диске
- 8 Гб ОЗУ

## Стек технологий

- **NestJS 10** (REST-контроллеры, guards, pipes, interceptors)
- **Prisma** + `@prisma/adapter-pg` (PostgreSQL через драйвер-адаптер `pg`)
- **Passport** (`passport-jwt`) — access/refresh JWT-стратегии
- **class-validator** / **class-transformer** — валидация запросов
- **ethers** — проверка подписи, чек-сумма адреса
- **bcrypt** — хеширование refresh-токена
- **@nestjs/swagger** — документация OpenAPI
- **Jest** — юнит-тесты

### Возможные дополнения

- **React** — frontend
- **NestJS** — WebSocket-связь

## Структура проекта

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # схема данных (модели account, owner и др.)
│   ├── src/
│   │   ├── common/                  # утилиты (BigIntInterceptor, глобальный PrismaService)
│   │   ├── models/                  # собирательное для папок бизнес-логики
│   │   │   ├── auth/                # флоу nonce → подпись → JWT access/refresh
│   │   │   ├── owner/               # владельцы кошельков (по Ethereum-адресу)
│   │   │   ├── account/             # счета: один на владельца на каждый тикер
│   │   │   └── transfer/            # атомарные переводы баланса + записи в леджере
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── prisma.config.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── docker-compose.yml               # основные сервисы
├── docker-compose.override.yml      # локальные переопределения
├── .env
├── .gitignore
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── LICENSE.md

.
├── helpers/                         # вспомогательные ресурсы
│   └── sign.py                      # подписать сообщение авторизации
```

## Условия использования и лицензия

© 2026 fbdayy / vishnev. Все права защищены.

Проект разработан в качестве демонстрационного материала / тестового задания. Потенциальному работодателю предоставляется право на бесплатное тестирование, запуск и изучение данного проекта в ознакомительных целях.

**Срок действия разрешения:** 21 календарный день с момента отправки отклика (или до официального получения отказа по вакансии, если он наступит раньше).

Любое коммерческое использование, копирование, модификация или интеграция кода в другие продукты без письменного согласия автора (vishnev.send@gmail.com) запрещены.

> P. S. Кто бы это ни читал, знайте: мне правда не жалко потраченных времени и сил. Просто я не люблю воровство и не хочу остаться без работы, поделившись своим трудом. Свяжитесь со мной — и я всё разрешу.

## Дополнительно

### Цель создания

Весь репозиторий создан исключительно для демонстрации моих навыков в тестировании и backend-разработке. Реальной практической пользы в нём нет — предлагаю воспринимать его как небольшую, но содержательную зарисовку в ответ на вопрос «Что ты можешь на практике?».

<details>
  <summary style='color: cyan'>Комментарий</summary>
  <p>Я старался найти баланс между сложностью проекта и временем разработки, поэтому местами структура упрощена и далека от лучших практик, а местами выглядит солидно. Однако прошу заметить главное: я понимаю, какие практики хороши, а какие — не очень. Все мы люди, и никому не хочется бесконечно усложнять сугубо демонстрационный pet-проект.</p>
</details>

### Об участии LLM

В целях экономии времени я прибегал к помощи ИИ:

1. С его помощью была переведена часть особенно длинных комментариев в файлах. **Переводились только комментарии, код в ИИ не загружался!**
2. Этот файл с описанием был отредактирован, и на его основе создана англоязычная версия.

## Предостережения

### ETH-адреса

> ⚠️ **НЕ ИСПОЛЬЗУЙТЕ ключ и адрес, которые могут встретиться в строчках проекта, для операций с реальными деньгами!**
> Эти данные общеизвестны и предназначены исключительно для локального тестирования. Перевод реальных денег на эти счета закончится их моментальным и безвозвратным исчезновением.

```PRIVATE_KEY
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

```PUBLIC_ADDRESS
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### .env

> ⚠️ При гипотетическом переходе в коммерцию **обязательно поменяйте чувствительные данные!**
> В файле это пароли и секреты. Изначально все они заданы как `changeme`.

### schema.prisma

> ⚠️ **НЕ ДОБАВЛЯЙТЕ CASCADE DELETION для `Owner → Account / LedgerEntry / ...`!**
> Удаление Owner не должно удалять историю чьих-то активов или сами активы.
> Ты разработчик и добавляешь каскадное удаление от Owner? Жди бан от начальства.

### Prisma Studio

При запуске Prisma Studio в docker в терминале может появиться ошибка. Если при этом Prisma Studio работает в браузере — это баг, и его можно игнорировать. Текст ошибки:

```
prisma-studio-1  | [Prisma Studio] Error [ERR_STREAM_PREMATURE_CLOSE]: Premature close
prisma-studio-1  |     at onclose (node:internal/streams/end-of-stream:162:30)
prisma-studio-1  |     at process.processTicksAndRejections (node:internal/process/task_queues:85:11) {
prisma-studio-1  |   code: 'ERR_STREAM_PREMATURE_CLOSE'
prisma-studio-1  | }
```

## Установка

### Подготовка

Для комфортного взаимодействия с приложением я создал alias — буду использовать его для сокращения одноразовых запросов. Рекомендую добавить эту функцию в `~/.bashrc` на время работы с проектом. Она создаёт контейнер в основной сети, который удаляется сразу после выполнения запроса к приложению.

```bash
mb() {
    docker run --rm \
      -v "$(pwd):/app" \
      -w /app \
      --network mini_bank_default \
      --env-file .env \
      mini_bank-app "$@"
}
```

> **Особенности установки**
> 1. В проекте используется `pnpm` в качестве основного пакетного менеджера. Это осознанный выбор — лимитов `npm` не хватает для установки зависимостей в текущей среде.
> 2. В связи с региональными ограничениями я настроил в `.env` зеркала для установки пакетов `pnpm` с китайского `registry`. В том же файле зеркало можно отключить или сменить.
> 3. Ограничения доступа к Docker Hub в России на момент публикации я обходил настройкой демона Docker — подробнее об этом стоит почитать в интернете. Лично я добавил в его конфигурацию зеркало:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

### Непосредственно установка

1. Настройте переменные окружения (например, в файле `.env`):

   | Переменная            | Описание                                   | Пример                                                 |
   |------------------------|---------------------------------------------|----------------------------------------------------------|
   | `POSTGRES_USER`        | Пользователь PostgreSQL                      | `postgres`                                                |
   | `POSTGRES_PASSWORD`    | Пароль пользователя PostgreSQL               | `changeme`                                                |
   | `POSTGRES_DB`          | Имя базы данных                              | `app_db`                                                  |
   | `POSTGRES_PORT`        | Порт PostgreSQL (опционально)                | `5432` (по умолчанию)                                     |
   | `DATABASE_URL`         | Строка подключения к PostgreSQL для Prisma   | `postgresql://postgres:changeme@postgres:5432/app_db`     |
   | `NODE_ENV`             | Окружение выполнения                         | `development`                                             |
   | `BACKEND_PORT`         | HTTP-порт сервера                            | `3000`                                                    |
   | `JWT_ACCESS_SECRET`    | Секрет для подписи access-токенов            | `changeme`                                                |
   | `JWT_REFRESH_SECRET`   | Секрет для подписи refresh-токенов           | `changeme`                                                |

2. Соберите и поднимите docker-контейнеры:
   ```bash
   docker compose up --build
   ```

3. Создайте миграцию БД:
   ```bash
   mb pnpm --filter=backend exec prisma migrate dev --name init
   ```

4. Запустите тесты:
   ```bash
   mb pnpm --filter=backend run test
   ```

## Документация API (Swagger)

Интерактивная OpenAPI-документация доступна по адресу **`/api`** после запуска приложения (например, `http://localhost:3000/api`). Каждый маршрут сгруппирован по тегу (`auth`, `owners`, `accounts`, `transfers`) со схемами запроса/ответа и примерами payload'ов. Защищённые маршруты ожидают bearer-токен — получите его через `POST /auth/login`, затем нажмите **Authorize** в Swagger UI и вставьте его туда.

## Справочник API

Все тела запросов/ответов — JSON. Поля с типом `bigint` в базе данных (`balance`, `amount`) сериализуются в ответах как **строки** (через `BigIntInterceptor`) и точно так же принимаются в запросах — как строки с десятичным целым числом.

🔒 = требуется `Authorization: Bearer <accessToken>` (`AccessTokenGuard`).

### Auth — `/auth`

Флоу входа: запросить nonce, подписать его кошельком, обменять подпись на пару токенов.

| Метод | Путь              | Auth | Тело запроса                              | Ответ                              | Примечания |
|-------|-------------------|------|---------------------------------------------|--------------------------------------|------------|
| POST  | `/auth/nonce`     | —    | `{ publicAddress }`                          | `{ message }`                        | Создаёт владельца, если адрес новый. `message` — то, что должен подписать кошелёк. |
| POST  | `/auth/login`     | —    | `{ publicAddress, signature }`               | `{ accessToken, refreshToken }`      | Проверяет подпись относительно последнего выданного nonce, затем ротирует его. |
| POST  | `/auth/refresh`   | 🔒 (refresh-токен) | —                                    | `{ accessToken, refreshToken }`      | Отправьте **refresh**-токен как bearer-токен. Ротирует оба токена. |
| POST  | `/auth/logout`    | 🔒   | —                                             | Пустой успешный ответ                | Отзывает сохранённый refresh-токен. |

### Owners — `/owners`

| Метод | Путь                              | Auth | Тело / Параметры                | Ответ             | Примечания |
|-------|-----------------------------------|------|------------------------------------|---------------------|------------|
| POST  | `/owners`                         | 🔒   | `{ publicAddress }`                | `Owner`              | `409`, если адрес уже зарегистрирован. |
| GET   | `/owners/:id`                     | 🔒   | `id` = UUID владельца              | `Owner`              | `404`, если не найден. |
| GET   | `/owners/address/:publicAddress`  | 🔒   | `publicAddress` = `0x...`          | `Owner`              | `404`, если не найден. |

### Accounts — `/accounts`

У одного владельца может быть **не более одного счёта на тикер** (уникальность по `ownerId` + `ticker`).

| Метод | Путь                       | Auth | Тело / Параметры                       | Ответ                         | Примечания                                                                                                                                           |
| ----- | -------------------------- | ---- | -------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST  | `/accounts`                | 🔒   | `{ ownerId, ticker, initialBalance? }` | `Account` (с полем `balance`) | `ticker` — `PET` или `CAT`. `initialBalance` — опциональная неотрицательная целая строка, по умолчанию `"0"`. `409` при дубликате (ownerId, ticker). |
| GET   | `/accounts/:id`            | 🔒   | `id` = UUID счёта                      | `Account` (с полем `balance`) | `404`, если не найден.                                                                                                                               |
| GET   | `/accounts/:id/balance`    | 🔒   | `id` = UUID счёта                      | `{ accountId, balance }`      | Дешевле, чем загрузка всего счёта.                                                                                                                   |
| GET   | `/accounts/owner/:ownerId` | 🔒   | `ownerId` = UUID владельца             | `Account[]`                   | Все счета, принадлежащие владельцу.                                                                                                                  |

### Transfers — `/transfers`

| Метод | Путь                               | Auth | Тело / Параметры                                        | Ответ                                                                       | Примечания |
|-------|-------------------------------------|------|--------------------------------------------------------------|--------------------------------------------------------------------------------|------------|
| POST  | `/transfers`                        | 🔒   | `{ fromAccountId, toAccountId, amount }`                       | `{ transferId, status, amount, newFromBalance, newToBalance, createdAt }`      | `amount` — положительная целая строка. `400` при недостатке средств, переводе на тот же счёт или несовпадении тикеров. `404`, если один из счетов не существует. |
| GET   | `/transfers/account/:accountId`     | 🔒   | `accountId` = UUID счёта, query `status?` (`pending` \| `completed` \| `failed`) | `Transfer[]`                                                      | Переводы, где счёт — отправитель или получатель, сначала новые. |
| GET   | `/transfers/:id`                    | 🔒   | `id` = UUID перевода                                            | `Transfer` (с полем `ledgerEntries`)                                           | `404`, если не найден. |

### Пример флоу (curl)

```bash
# 1. Запросить nonce
curl -X POST http://localhost:3000/auth/nonce \
  -H 'Content-Type: application/json' \
  -d '{"publicAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'
# → { "message": "Sign this message to authenticate at Mini bank.\n\nAddress: ...\nNonce: ..." }

# 2. Подписать `message` приватным ключом кошелька (например, через ethers.js), затем войти
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"publicAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "signature": "0x..."}'
# → { "accessToken": "...", "refreshToken": "..." }

# 3. Вызвать защищённый эндпоинт
curl http://localhost:3000/accounts/owner/<ownerId> \
  -H 'Authorization: Bearer <accessToken>'
```

## Заметки об архитектуре

- **Баланс — это кэш, источник истины — леджер.** `AccountBalance` — это кэш для быстрого чтения; каждый перевод также пишет соответствующие строки `LedgerEntry` (дебет + кредит).
- **Защита от deadlock при переводах.** Параллельные переводы между одной и той же парой счетов (в любом направлении) всегда блокируют строки в одинаковом порядке (по сравнению ID счетов), а не всегда «сначала дебет, потом кредит».
- **BigInt «по проводу».** Балансы/суммы имеют тип `bigint` в базе данных и в TypeScript-типах, но приходят и уходят как десятичные строки в JSON (`BigIntInterceptor` на выходе, `@Transform` из `class-transformer` вместе с кастомным валидатором `IsPositiveBigInt` на входе).

