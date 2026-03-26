/**
 * Middleware that checks whether a user with any of the given identity fields already exists.
 * Returns `400` if a required identity field is missing from the request body,
 * or `409` if a user with that identity already exists.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string[]} identities - Fields to check for uniqueness (e.g. ['email', 'username']).
 * @param {string} [userModel='user'] - Prisma model name in camelCase.
 * @returns {import('express').RequestHandler}
 */
export const checkUserExists = (prisma, identities, userModel = 'user') =>
  async (req, res, next) => {
    try {
      const missingIdentities = identities.filter(identity => !req.body[identity])
      if (missingIdentities.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingIdentities.join(', ')}`
        })
      }

      for (const identity of identities) {
        const user = await prisma[userModel].findUnique({
          where: { [identity]: req.body[identity] }
        })

        if (user) {
          return res.status(409).json({ error: `${identity} is already taken` })
        }
      }

      next()
    } catch (error) {
      console.error(error.message)
      return res.status(500).json({ error: 'An error occurred while checking user existence' })
    }
  }
