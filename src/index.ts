import { Router } from 'express'
import type { RequestHandler } from 'express'
import { validationResult } from 'express-validator'
import { register, login } from './authController.js'
import { verifyToken } from './middleware/authJwt.js'
import { checkUserExists } from './middleware/checkUserExists.js'
import type { AuthOptions, PrismaLike } from './types.js'

export { userModelExists } from './middleware/userModelExists.js'
export type { AuthOptions, TokenPayload, PrismaLike } from './types.js'

class Auth {
  readonly #prisma: PrismaLike
  readonly #secret: string
  readonly #identities: string[]
  readonly #options: Required<AuthOptions>

  /**
   * Creates an Auth instance.
   *
   * @param prismaObj - Prisma client instance.
   * @param secret - Secret key used to sign JWT tokens. Use an env variable.
   * @param identities - Fields used as unique identifiers (e.g. `['email', 'username']`).
   *   The first element is used as the primary login key.
   * @param options - Optional configuration.
   *
   * @example
   * ```ts
   * import { PrismaClient } from '@prisma/client'
   * import Auth from 'express-authrouter'
   *
   * const prisma = new PrismaClient()
   * const auth = new Auth(prisma, process.env.JWT_SECRET!, ['email'], { expiresIn: '1d' })
   * ```
   */
  constructor(prismaObj: PrismaLike, secret: string, identities: string[], options: AuthOptions = {}) {
    if (!prismaObj) throw new Error('[express-authrouter] prismaObj is required')
    if (!secret) throw new Error('[express-authrouter] secret is required')
    if (!Array.isArray(identities) || identities.length === 0) {
      throw new Error('[express-authrouter] identities must be a non-empty array')
    }

    this.#prisma = prismaObj
    this.#secret = secret
    this.#identities = identities
    this.#options = {
      expiresIn: '7d',
      userModel: 'user',
      ...options
    }
  }

  /**
   * Returns a new Express Router with the following routes:
   * - `POST /register` — creates a new user and returns a JWT.
   * - `POST /login` — authenticates an existing user and returns a JWT.
   *
   * Each call returns a fresh Router, so it is safe to mount under multiple prefixes.
   *
   * @example
   * ```ts
   * app.use('/auth', auth.routes())
   * ```
   */
  routes(): Router {
    const router = Router()
    const { userModel } = this.#options

    router.use('/register', checkUserExists(this.#prisma, this.#identities, userModel))
    router.post('/register', register(this.#prisma, this.#secret, this.#identities, this.#options))
    router.post('/login', login(this.#prisma, this.#secret, this.#identities, this.#options))

    return router
  }

  /**
   * Returns a middleware that verifies the JWT from the `Authorization: Bearer <token>` header.
   * On success, sets `req.user` to the decoded token payload `{ id, iat, exp }`.
   *
   * @example
   * ```ts
   * app.get('/profile', auth.protect(), (req, res) => {
   *   res.json({ userId: req.user?.id })
   * })
   * ```
   */
  protect(): RequestHandler {
    return verifyToken(this.#secret)
  }

  /**
   * Returns a middleware that reads `express-validator` results.
   * Returns `400` with an `{ errors: [...] }` body if validation failed,
   * otherwise calls `next()`.
   *
   * @example
   * ```ts
   * import { body } from 'express-validator'
   *
   * app.use('/auth', body('password').isLength({ min: 8 }), auth.result(), auth.routes())
   * ```
   */
  result(): RequestHandler {
    return (req, res, next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      next()
    }
  }
}

export default Auth
