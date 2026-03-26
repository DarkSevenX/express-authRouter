import jwt from 'jsonwebtoken'
import type { RequestHandler } from 'express'
import type { TokenPayload } from '../types.js'

/**
 * Middleware that verifies the JWT from the `Authorization: Bearer <token>` header.
 * On success, attaches the decoded payload to `req.user` and calls `next()`.
 *
 * @param secret - The secret key used to verify the token.
 */
export const verifyToken = (secret: string): RequestHandler => (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'no token provided' })
    }

    const token = authHeader.split(' ')[1]

    jwt.verify(token, secret, (err, decoded) => {
      if (err) return res.status(401).json({ error: err.message })
      req.user = decoded as TokenPayload
      next()
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: (error as Error).message })
  }
}
