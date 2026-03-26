# express-authrouter

[![npm version](https://img.shields.io/npm/v/express-authrouter.svg)](https://www.npmjs.com/package/express-authrouter)
[![license](https://img.shields.io/npm/l/express-authrouter.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/express-authrouter.svg)](https://nodejs.org)

Plug-and-play authentication router for **Express** + **Prisma** + **JWT**.

Drop it into any Express app and get `POST /register` and `POST /login` routes, a `protect()` middleware for guarded routes, and optional `express-validator` integration — all in a few lines.

---

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Prisma schema](#prisma-schema)
- [API](#api)
  - [new Auth(prisma, secret, identities, options)](#new-authprisma-secret-identities-options)
  - [auth.routes()](#authroutes)
  - [auth.protect()](#authprotect)
  - [auth.result()](#authresult)
  - [userModelExists(prisma, userModel?)](#usermodelexistsprisma-usermodel)
- [HTTP reference](#http-reference)
- [Using express-validator](#using-express-validator)
- [Custom model name](#custom-model-name)
- [Error responses](#error-responses)
- [License](#license)

---

## Requirements

| Peer dependency | Minimum version |
|---|---|
| `express` | `^4.0.0` |
| `@prisma/client` | `^5.0.0` |
| Node.js | `18.0.0` |

---

## Installation

```bash
npm install express-authrouter
```

---

## Quick start

```js
// app.js
import express from 'express'
import { PrismaClient } from '@prisma/client'
import Auth from 'express-authrouter'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

const auth = new Auth(prisma, process.env.JWT_SECRET, ['email'])

// Public auth routes: POST /auth/register  POST /auth/login
app.use('/auth', auth.routes())

// Protected route
app.get('/profile', auth.protect(), (req, res) => {
  res.json({ userId: req.user.id })
})

app.listen(3000)
```

---

## Prisma schema

Your schema must have a model with:
- A unique field for each identity you pass (e.g. `email`).
- A `password` field.
- An `id` field (used as the JWT payload).

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  password String
}
```

> The model name in camelCase (`user`, `account`, etc.) must match the `userModel` option — defaults to `'user'`.

---

## API

### `new Auth(prisma, secret, identities, options?)`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prisma` | `PrismaClient` | ✅ | Your Prisma client instance. |
| `secret` | `string` | ✅ | Secret key for signing/verifying JWT tokens. Use an env variable. |
| `identities` | `string[]` | ✅ | Fields used as unique user identifiers. The **first** element is used for login lookup. |
| `options` | `AuthOptions` | — | Optional configuration (see below). |

**`AuthOptions`**

| Option | Type | Default | Description |
|---|---|---|---|
| `expiresIn` | `string` | `'7d'` | JWT expiration. Accepts any value valid for [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken#readme) (e.g. `'1h'`, `'30d'`). |
| `userModel` | `string` | `'user'` | Prisma model name in camelCase. Change this if your model is named differently (e.g. `'account'`). |

```js
const auth = new Auth(prisma, process.env.JWT_SECRET, ['email', 'username'], {
  expiresIn: '1d',
  userModel: 'user'
})
```

---

### `auth.routes()`

Returns an Express `Router` with:

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Creates a new user. Hashes the password and returns a JWT. |
| `POST` | `/login` | Validates credentials and returns a JWT. |

```js
app.use('/auth', auth.routes())
```

---

### `auth.protect()`

Returns a middleware that validates the JWT from the `Authorization` header.

```
Authorization: Bearer <token>
```

On success, the decoded token payload is available at `req.user` (contains `id`).

```js
app.get('/dashboard', auth.protect(), (req, res) => {
  res.json({ userId: req.user.id })
})
```

---

### `auth.result()`

Returns a middleware compatible with `express-validator`. Place it after your validator chain to short-circuit with a `400` response if any validation fails.

```js
import { body } from 'express-validator'

app.post(
  '/auth/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  auth.result(),        // ← returns 400 if validators above failed
)
```

---

### `userModelExists(prisma, userModel?)`

A named export you can use as a startup check to verify that your Prisma migrations have been applied before the app starts accepting traffic. It is **not** run on every request by default.

```js
import Auth, { userModelExists } from 'express-authrouter'

// Fail fast if the table doesn't exist
app.use(userModelExists(prisma))           // defaults to model 'user'
app.use(userModelExists(prisma, 'account'))

app.use('/auth', auth.routes())
```

---

## HTTP reference

### `POST /register`

**Request body**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Include any extra fields you have in your Prisma model — they are forwarded to `prisma.user.create()`.

**Responses**

| Status | Body | Meaning |
|---|---|---|
| `201` | `{ "token": "..." }` | User created. |
| `400` | `{ "error": "..." }` | Missing required field. |
| `409` | `{ "error": "email is already taken" }` | Identity already exists. |
| `500` | `{ "error": "..." }` | Server/database error. |

---

### `POST /login`

The primary identity (first element of `identities`) is used for lookup.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Responses**

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "token": "..." }` | Login successful. |
| `400` | `{ "error": "..." }` | Missing field. |
| `401` | `{ "error": "incorrect password" }` | Wrong password. |
| `404` | `{ "error": "user not found" }` | No user found. |
| `500` | `{ "error": "..." }` | Server/database error. |

---

### Protected routes

Send the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGci...
```

**Responses**

| Status | Body | Meaning |
|---|---|---|
| `200` | *(your handler's response)* | Token valid. `req.user.id` is available. |
| `403` | `{ "error": "no token provided" }` | Header missing or malformed. |
| `401` | `{ "error": "..." }` | Token invalid or expired. |

---

## Using express-validator

Add validators before mounting the auth router and use `auth.result()` to short-circuit on errors:

```js
import { body } from 'express-validator'

app.use(
  '/auth',
  body('email').isEmail().withMessage('invalid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  auth.result(),
  auth.routes()
)
```

---

## Custom model name

If your Prisma model is not `User`, pass `userModel` in the options:

```prisma
model Account {
  id       Int    @id @default(autoincrement())
  email    String @unique
  password String
}
```

```js
const auth = new Auth(prisma, process.env.JWT_SECRET, ['email'], {
  userModel: 'account'
})
```

---

## Error responses

All error responses follow a consistent JSON shape:

```json
{ "error": "descriptive message here" }
```

Validation errors from `auth.result` use:

```json
{ "errors": [ { "msg": "...", "path": "...", ... } ] }
```

---

## License

[MIT](./LICENSE) — Nelson David Arguedo Ramos (DarkSevenX)
