import type { RequestHandler } from 'express'
import type { PrismaLike } from '../types.js'

/**
 * Middleware that verifies the Prisma model exists (i.e. migrations have been run).
 * Returns `500` with a descriptive message if the table is missing.
 *
 * Intended to be used as a startup check, not on every request.
 *
 * @param prisma - Prisma client instance.
 * @param userModel - Prisma model name in camelCase. Default: 'user'.
 */
export const userModelExists = (prisma: PrismaLike, userModel = 'user'): RequestHandler =>
  async (_req, res, next) => {
    try {
      await prisma[userModel].count()
      next()
    } catch (error) {
      const prismaError = error as { code?: string; message: string }
      if (prismaError.code === 'P2021') {
        return res.status(500).json({
          error: `Table for model "${userModel}" does not exist. Make sure you have run your Prisma migrations.`
        })
      }
      return res.status(500).json({ error: prismaError.message })
    }
  }
