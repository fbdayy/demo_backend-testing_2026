[View the styled version](https://fbdayy.github.io/demo_backend-testing_2026)

**English** | [Русский](README.ru.md)

![Node.js 22 Alpine](https://img.shields.io/badge/Node.js-22%20Alpine-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm 11](https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white)
![NestJS 10](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Prisma v7](https://img.shields.io/badge/Prisma-v7-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL 17 Alpine](https://img.shields.io/badge/PostgreSQL-17%20Alpine-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![ethers](https://img.shields.io/badge/ethers-2535A0?style=flat-square&logo=ethereum&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

# Mini Bank API

A NestJS backend for a wallet app: sign-in via an Ethereum signature, balances in two made-up tickers, atomic transfers with a ledger record.

## Contents

- [Minimum Requirements to Run](#minimum-requirements-to-run)
- [Tech Stack](#tech-stack)
  - [Possible Additions](#possible-additions)
- [Project Structure](#project-structure)
- [License & Terms of Use](#license-terms-of-use)
- [Extra](#extra)
  - [Purpose](#purpose)
  - [On LLM Involvement](#on-llm-involvement)
- [Warnings](#warnings)
  - [ETH Addresses](#eth-addresses)
  - [.env](#env)
  - [schema.prisma](#schemaprisma)
  - [Prisma Studio](#prisma-studio)
- [Setup](#setup)
  - [Preparation](#preparation)
  - [Installation Steps](#installation-steps)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [API Reference](#api-reference)
  - [Auth — `/auth`](#auth-auth)
  - [Owners — `/owners`](#owners-owners)
  - [Accounts — `/accounts`](#accounts-accounts)
  - [Transfers — `/transfers`](#transfers-transfers)
  - [Example Flow (curl)](#example-flow-curl)
- [Architecture Notes](#architecture-notes)

> ⚠️ **This is a demo backend with simplified logic — it does not interact with blockchains and cannot move real funds.**
>
> The ETH address is used only to create a user account. All funds and balances exist solely inside the database, in a project-specific format.

## Minimum Requirements to Run

> ⚠️ These are the requirements to run the app; changes or updates may increase them.

- 4 GB of free disk space
- 8 GB of RAM

## Tech Stack

- **NestJS 10** (REST controllers, guards, pipes, interceptors)
- **Prisma** + `@prisma/adapter-pg` (PostgreSQL via the `pg` driver adapter)
- **Passport** (`passport-jwt`) — access/refresh JWT strategies
- **class-validator** / **class-transformer** — request validation
- **ethers** — signature verification, address checksum
- **bcrypt** — refresh-token hashing
- **@nestjs/swagger** — OpenAPI documentation
- **Jest** — unit tests

### Possible Additions

- **React** — frontend
- **NestJS** — WebSocket layer

## Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # data schema (account, owner models, etc.)
│   ├── src/
│   │   ├── common/                  # utilities (BigIntInterceptor, global PrismaService)
│   │   ├── models/                  # umbrella folder for business-logic modules
│   │   │   ├── auth/                # nonce → signature → JWT access/refresh flow
│   │   │   ├── owner/               # wallet owners (by Ethereum address)
│   │   │   ├── account/             # accounts: one per owner per ticker
│   │   │   └── transfer/            # atomic balance transfers + ledger entries
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── prisma.config.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── docker-compose.yml               # core services
├── docker-compose.override.yml      # local overrides
├── .env
├── .gitignore
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── LICENSE.md

.
├── helpers/                         # helper resources
│   └── sign.py                      # sign the auth message
```

## License & Terms of Use

© 2026 fbdayy / vishnev. All rights reserved.

This project was built as a demo / take-home assignment. A prospective employer is granted the right to test, run, and review this project free of charge, for evaluation purposes.

**Permission validity:** 21 calendar days from when the application was submitted (or until a formal rejection is received, whichever comes first).

Any commercial use, copying, modification, or integration of this code into other products without the author's written consent (<vishnev.send@gmail.com>) is prohibited.

> P. S. Whoever is reading this, know that I genuinely don't mind the time and effort I put in. I just don't like theft, and I don't want to end up jobless after sharing my own work. Just reach out and I'll sort it out.

## Extra

### Purpose

This whole repo exists purely to demonstrate my testing and backend-development skills. There's no real practical value in it — think of it as a small but substantial sketch answering the question "What can you actually build?"

<details>
<summary>Comment</summary>

I tried to balance project complexity against development time, so some parts of the structure are simplified and fall short of best practices, while others look pretty solid. But please note the main point: I do know which practices are good and which aren't. We're all human, and nobody wants to endlessly over-engineer a purely demonstrative pet project.

</details>

### On LLM Involvement

To save time, I used AI for the following:

1.  It translated some of my especially long in-code comments. **Only comments were translated — no code was ever sent to the AI!**
2.  This description file was edited directly with its help, and the English-language version was produced from it.

## Warnings

### ETH Addresses

> ⚠️ **DO NOT use the key and address that appear in this project's source for operations involving real money!**
>
> These values are publicly known and intended solely for local testing. Sending real funds to these accounts will result in their immediate, irreversible loss.

**PRIVATE_KEY**

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**PUBLIC_ADDRESS**

```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### .env

> ⚠️ If you hypothetically move this to production, **make sure to change the sensitive values!**
>
> In the file these are passwords and secrets. They're all initially set to `changeme`.

### schema.prisma

> ⚠️ **DO NOT add CASCADE DELETION for `Owner → Account / LedgerEntry / ...`!**
>
> Deleting an Owner should never delete the history of anyone's assets, or the assets themselves.
>
> Are you a developer adding a cascade delete from Owner? Enjoy getting fired.

### Prisma Studio

When starting Prisma Studio in Docker, the terminal may show an error. If Prisma Studio still works fine in the browser, this is a known bug and can be ignored. The error text:

```
prisma-studio-1  | [Prisma Studio] Error [ERR_STREAM_PREMATURE_CLOSE]: Premature close
prisma-studio-1  |     at onclose (node:internal/streams/end-of-stream:162:30)
prisma-studio-1  |     at process.processTicksAndRejections (node:internal/process/task_queues:85:11) {
prisma-studio-1  |   code: 'ERR_STREAM_PREMATURE_CLOSE'
prisma-studio-1  | }
```

## Setup

### Preparation

For convenient interaction with the app, I created an alias — I'll use it to shorten one-off requests. I recommend adding this function to your `~/.bashrc` while working on the project. It spins up a container on the main network that gets removed right after the request to the app completes.

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

> **Installation notes**
>
> 1.  The project uses `pnpm` as its primary package manager. This is a deliberate choice — `npm`'s limits aren't enough for installing dependencies in this environment.
> 2.  Because of regional restrictions, I configured `.env` to use a Chinese mirror `registry` for installing `pnpm` packages. You can disable or change the mirror in the same file.
> 3.  At the time of publishing, I worked around Docker Hub access restrictions in Russia by configuring the Docker daemon — it's worth reading up on this online. Personally, I added this mirror to its configuration:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

### Installation Steps

1\. Set up environment variables (for example, in the `.env` file):

| Variable             | Description                           | Example                                               |
|----------------------|---------------------------------------|-------------------------------------------------------|
| `POSTGRES_USER`      | PostgreSQL user                       | `postgres`                                            |
| `POSTGRES_PASSWORD`  | PostgreSQL user password              | `changeme`                                            |
| `POSTGRES_DB`        | Database name                         | `app_db`                                              |
| `POSTGRES_PORT`      | PostgreSQL port (optional)            | `5432` (default)                                      |
| `DATABASE_URL`       | Prisma's PostgreSQL connection string | `postgresql://postgres:changeme@postgres:5432/app_db` |
| `NODE_ENV`           | Runtime environment                   | `development`                                         |
| `BACKEND_PORT`       | Server HTTP port                      | `3000`                                                |
| `JWT_ACCESS_SECRET`  | Secret for signing access tokens      | `changeme`                                            |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens     | `changeme`                                            |

2\. Build and start the docker containers:

```
docker compose up --build
```

3\. Create the DB migration:

```
mb pnpm --filter=backend exec prisma migrate dev --name init
```

4\. Run the tests:

```
mb pnpm --filter=backend run test
```

## API Documentation (Swagger)

Interactive OpenAPI documentation is available at **`/api`** once the app is running (e.g. `http://localhost:3000/api`). Each route is grouped by tag (`auth`, `owners`, `accounts`, `transfers`) with request/response schemas and example payloads. Protected routes expect a bearer token — get one via `POST /auth/login`, then click **Authorize** in the Swagger UI and paste it in.

## API Reference

All request/response bodies are JSON. Fields of type `bigint` in the database (`balance`, `amount`) are serialized in responses as **strings** (via `BigIntInterceptor`), and are accepted the same way in requests — as strings containing a decimal integer.

🔒 = requires `Authorization: Bearer <accessToken>` (`AccessTokenGuard`).

### Auth — `/auth`

Login flow: request a nonce, sign it with your wallet, exchange the signature for a token pair.

| Method | Path            | Auth               | Request Body                   | Response                        | Notes                                                                                |
|--------|-----------------|--------------------|--------------------------------|---------------------------------|--------------------------------------------------------------------------------------|
| POST   | `/auth/nonce`   | —                  | `{ publicAddress }`            | `{ message }`                   | Creates the owner if the address is new. `message` is what the wallet needs to sign. |
| POST   | `/auth/login`   | —                  | `{ publicAddress, signature }` | `{ accessToken, refreshToken }` | Verifies the signature against the most recently issued nonce, then rotates it.      |
| POST   | `/auth/refresh` | 🔒 (refresh token) | —                              | `{ accessToken, refreshToken }` | Send the **refresh** token as the bearer token. Rotates both tokens.                 |
| POST   | `/auth/logout`  | 🔒                 | —                              | Empty success response          | Revokes the stored refresh token.                                                    |

### Owners — `/owners`

| Method | Path                             | Auth | Body / Params             | Response | Notes                                       |
|--------|----------------------------------|------|---------------------------|----------|---------------------------------------------|
| POST   | `/owners`                        | 🔒   | `{ publicAddress }`       | `Owner`  | `409` if the address is already registered. |
| GET    | `/owners/:id`                    | 🔒   | `id` = owner UUID         | `Owner`  | `404` if not found.                         |
| GET    | `/owners/address/:publicAddress` | 🔒   | `publicAddress` = `0x...` | `Owner`  | `404` if not found.                         |

### Accounts — `/accounts`

An owner can have **at most one account per ticker** (unique on `ownerId` + `ticker`).

| Method | Path                       | Auth | Body / Params                          | Response                           | Notes                                                                                                                                                |
|--------|----------------------------|------|----------------------------------------|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | `/accounts`                | 🔒   | `{ ownerId, ticker, initialBalance? }` | `Account` (with a `balance` field) | `ticker` is `PET` or `CAT`. `initialBalance` is an optional, non-negative integer string, defaulting to `"0"`. `409` on duplicate (ownerId, ticker). |
| GET    | `/accounts/:id`            | 🔒   | `id` = account UUID                    | `Account` (with a `balance` field) | `404` if not found.                                                                                                                                  |
| GET    | `/accounts/:id/balance`    | 🔒   | `id` = account UUID                    | `{ accountId, balance }`           | Cheaper than loading the whole account.                                                                                                              |
| GET    | `/accounts/owner/:ownerId` | 🔒   | `ownerId` = owner UUID                 | `Account[]`                        | All accounts belonging to the owner.                                                                                                                 |

### Transfers — `/transfers`

| Method | Path                            | Auth | Body / Params                                                                      | Response                                                                  | Notes                                                                                                                                                               |
|--------|---------------------------------|------|------------------------------------------------------------------------------------|---------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | `/transfers`                    | 🔒   | `{ fromAccountId, toAccountId, amount }`                                           | `{ transferId, status, amount, newFromBalance, newToBalance, createdAt }` | `amount` is a positive integer string. `400` on insufficient funds, transferring to the same account, or mismatched tickers. `404` if either account doesn't exist. |
| GET    | `/transfers/account/:accountId` | 🔒   | `accountId` = account UUID, query `status?` (`pending` \| `completed` \| `failed`) | `Transfer[]`                                                              | Transfers where the account is either the sender or the recipient, newest first.                                                                                    |
| GET    | `/transfers/:id`                | 🔒   | `id` = transfer UUID                                                               | `Transfer` (with a `ledgerEntries` field)                                 | `404` if not found.                                                                                                                                                 |

### Example Flow (curl)

```bash
# 1. Request a nonce
curl -X POST http://localhost:3000/auth/nonce \
  -H 'Content-Type: application/json' \
  -d '{"publicAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'
# → { "message": "Sign this message to authenticate at Mini bank.\n\nAddress: ...\nNonce: ..." }

# 2. Sign `message` with the wallet's private key (e.g. via ethers.js), then log in
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"publicAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "signature": "0x..."}'
# → { "accessToken": "...", "refreshToken": "..." }

# 3. Call a protected endpoint
curl http://localhost:3000/accounts/owner/<ownerId> \
  -H 'Authorization: Bearer <accessToken>'
```

## Architecture Notes

- **Balance is a cache; the ledger is the source of truth.** `AccountBalance` is a cache for fast reads; every transfer also writes the corresponding `LedgerEntry` rows (debit + credit).
- **Deadlock protection on transfers.** Concurrent transfers between the same pair of accounts (in either direction) always lock rows in the same order (by comparing account IDs), rather than always "debit first, then credit."
- **BigInt "on the wire."** Balances/amounts are typed as `bigint` in the database and in the TypeScript types, but travel as decimal strings over JSON (`BigIntInterceptor` on the way out, a `@Transform` from `class-transformer` together with a custom `IsPositiveBigInt` validator on the way in).

---

*Mini Bank API · README · © 2026 fbdayy / vishnev*
