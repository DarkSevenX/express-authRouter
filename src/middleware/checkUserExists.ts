import type { RequestHandler } from 'express'
import type { PrismaLike } from '../types.js'

/**
 * Middleware that checks whether a user with any of the given identity fields already exists.
 * Returns `400` if a required identity field is missing from the request body,
 * or `409` if a user with that identity already exists.
 *
 * @param prisma - Prisma client instance.
 * @param identities - Fields to check for uniqueness (e.g. ['email', 'username']).
 * @param userModel - Prisma model name in camelCase. Default: 'user'.
 */
export const checkUserExists = (
  prisma: PrismaLike,
  identities: string[],
  userModel = 'user'
): RequestHandler =>
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>
      const missingIdentities = identities.filter(identity => !body[identity])

      if (missingIdentities.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingIdentities.join(', ')}`
        })
      }

      for (const identity of identities) {
        const user = await prisma[userModel].findUnique({
          where: { [identity]: body[identity] }
        })

        if (user) {
          return res.status(409).json({ error: `${identity} is already taken` })
        }
      }

      next()
    } catch (error) {
      console.error((error as Error).message)
      return res.status(500).json({ error: 'An error occurred while checking user existence' })
    }
  }
