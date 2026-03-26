import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import type { RequestHandler } from 'express'
import type { AuthOptions, PrismaLike } from './types.js'

/**
 * Handles user registration.
 *
 * @param prisma - Prisma client instance.
 * @param secret - Secret key for JWT signing.
 * @param identities - Unique identifier fields (e.g. ['email', 'username']).
 * @param options - Resolved auth options.
 */
export const register = (
  prisma: PrismaLike,
  secret: string,
  identities: string[],
  options: Required<AuthOptions>
): RequestHandler =>
  async (req, res) => {
    const { userModel, expiresIn } = options

    try {
      const { password, ...otherFields } = req.body as Record<string, unknown>

      if (!password) {
        return res.status(400).json({ error: 'password is required' })
      }

      const identityFields = identities.reduce<Record<string, unknown>>((acc, identity) => {
        acc[identity] = (req.body as Record<string, unknown>)[identity]
        return acc
      }, {})

      const hashedPassword = await bcrypt.hash(password as string, 10)

      const newUser = await prisma[userModel].create({
        data: {
          ...identityFields,
          password: hashedPassword,
          ...otherFields
        }
      })

      const token = jwt.sign({ id: newUser.id }, secret, { expiresIn } as SignOptions)
      return res.status(201).json({ token })
    } catch (error) {
      console.error((error as Error).message)
      return res.status(500).json({ error: (error as Error).message })
    }
  }

/**
 * Handles user login.
 *
 * @param prisma - Prisma client instance.
 * @param secret - Secret key for JWT signing.
 * @param identities - Unique identifier fields. The first element is used for lookup.
 * @param options - Resolved auth options.
 */
export const login = (
  prisma: PrismaLike,
  secret: string,
  identities: string[],
  options: Required<AuthOptions>
): RequestHandler =>
  async (req, res) => {
    const { userModel, expiresIn } = options

    try {
      const body = req.body as Record<string, unknown>
      const { password } = body
      const primaryIdentity = identities[0]
      const userIdentity = body[primaryIdentity]

      if (!password) return res.status(400).json({ error: 'password is required' })
      if (!userIdentity) return res.status(400).json({ error: `${primaryIdentity} is required` })

      const user = await prisma[userModel].findUnique({
        where: { [primaryIdentity]: userIdentity }
      })

      if (!user) return res.status(404).json({ error: 'user not found' })

      const passwordMatch = await bcrypt.compare(password as string, user.password)
      if (!passwordMatch) return res.status(401).json({ error: 'incorrect password' })

      const token = jwt.sign({ id: user.id }, secret, { expiresIn } as SignOptions)
      return res.status(200).json({ token })
    } catch (error) {
      console.error((error as Error).message)
      return res.status(500).json({ error: (error as Error).message })
    }
  }
