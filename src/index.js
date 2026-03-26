import { Router } from 'express'
import { register, login } from './authController.js'
import { verifyToken } from './middleware/authJwt.js'
import { checkUserExists } from './middleware/checkUserExists.js'
import { validationResult } from 'express-validator'

export { userModelExists } from './middleware/userModelExists.js'

/**
 * @typedef {Object} AuthOptions
 * @property {string} [expiresIn='7d'] - JWT expiration time (e.g. '1h', '7d', '30d').
 * @property {string} [userModel='user'] - Prisma model name in camelCase (e.g. 'user', 'account').
 */

class Auth {
  #prisma
  #secret
  #identities
  #options

  /**
   * Creates an Auth instance.
   *
   * @param {import('@prisma/client').PrismaClient} prismaObj - Prisma client instance.
   * @param {string} secret - Secret key used to sign JWT tokens.
   * @param {string[]} identities - Fields used as unique identifiers (e.g. ['email', 'username']).
   *   The first element is used as the primary login key.
   * @param {AuthOptions} [options={}] - Optional configuration.
   *
   * @example
   * import { PrismaClient } from '@prisma/client'
   * import Auth from 'express-authrouter'
   *
   * const prisma = new PrismaClient()
   * const auth = new Auth(prisma, process.env.JWT_SECRET, ['email'], { expiresIn: '1d' })
   */
  constructor(prismaObj, secret, identities, options = {}) {
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
   * Each call returns a fresh Router, so it is safe to mount this under multiple prefixes.
   *
   * @returns {import('express').Router}
   *
   * @example
   * app.use('/auth', auth.routes())
   */
  routes() {
    const router = Router()
    const { userModel } = this.#options

    router.use('/register', checkUserExists(this.#prisma, this.#identities, userModel))
    router.post('/register', register(this.#prisma, this.#secret, this.#identities, this.#options))
    router.post('/login', login(this.#prisma, this.#secret, this.#identities, this.#options))

    return router
  }

  /**
   * Returns a middleware that verifies the JWT from the `Authorization: Bearer <token>` header.
   * On success, sets `req.user` to the decoded token payload.
   *
   * @returns {import('express').RequestHandler}
   *
   * @example
   * app.get('/profile', auth.protect(), (req, res) => {
   *   res.json({ userId: req.user.id })
   * })
   */
  protect() {
    return verifyToken(this.#secret)
  }

  /**
   * Returns a middleware that reads `express-validator` results.
   * Returns `400` with an `{ errors: [...] }` body if validation failed,
   * otherwise calls `next()`.
   *
   * @returns {import('express').RequestHandler}
   *
   * @example
   * import { body } from 'express-validator'
   *
   * app.post(
   *   '/auth/register',
   *   body('email').isEmail(),
   *   auth.result(),
   * )
   */
  result() {
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
