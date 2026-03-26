/**
 * Middleware that verifies the Prisma model exists (i.e. migrations have been run).
 * Returns `500` with a descriptive message if the table is missing.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} [userModel='user'] - Prisma model name in camelCase.
 * @returns {import('express').RequestHandler}
 */
export const userModelExists = (prisma, userModel = 'user') =>
  async (req, res, next) => {
    try {
      await prisma[userModel].count()
      next()
    } catch (error) {
      if (error.code === 'P2021') {
        return res.status(500).json({
          error: `Table for model "${userModel}" does not exist. Make sure you have run your Prisma migrations.`
        })
      }
      return res.status(500).json({ error: error.message })
    }
  }
