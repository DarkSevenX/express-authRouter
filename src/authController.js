import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/**
 * Handles user registration.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} secret - Secret key for JWT signing.
 * @param {string[]} identities - Unique identifier fields (e.g. ['email', 'username']).
 * @param {{ expiresIn?: string, userModel?: string }} options
 * @returns {import('express').RequestHandler}
 */
export const register = (prisma, secret, identities, options) => async (req, res) => {
  const { userModel = 'user', expiresIn = '7d' } = options ?? {}

  try {
    const { password, ...otherFields } = req.body

    if (!password) {
      return res.status(400).json({ error: 'password is required' })
    }

    const identityFields = identities.reduce((acc, identity) => {
      acc[identity] = req.body[identity]
      return acc
    }, {})

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma[userModel].create({
      data: {
        ...identityFields,
        password: hashedPassword,
        ...otherFields
      }
    })

    const token = jwt.sign({ id: newUser.id }, secret, { expiresIn })
    return res.status(201).json({ token })
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Handles user login.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} secret - Secret key for JWT signing.
 * @param {string[]} identities - Unique identifier fields. The first element is used for lookup.
 * @param {{ expiresIn?: string, userModel?: string }} options
 * @returns {import('express').RequestHandler}
 */
export const login = (prisma, secret, identities, options) => async (req, res) => {
  const { userModel = 'user', expiresIn = '7d' } = options ?? {}

  try {
    const { password } = req.body
    const primaryIdentity = identities[0]
    const userIdentity = req.body[primaryIdentity]

    if (!password) return res.status(400).json({ error: 'password is required' })
    if (!userIdentity) return res.status(400).json({ error: `${primaryIdentity} is required` })

    const user = await prisma[userModel].findUnique({
      where: { [primaryIdentity]: userIdentity }
    })

    if (!user) return res.status(404).json({ error: 'user not found' })

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) return res.status(401).json({ error: 'incorrect password' })

    const token = jwt.sign({ id: user.id }, secret, { expiresIn })
    return res.status(200).json({ token })
  } catch (error) {
    console.error(error.message)
    return res.status(500).json({ error: error.message })
  }
}
