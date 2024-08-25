import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/**
 * Handles user registration.
 *
 * @param {PrismaClient} prisma - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string} identity - The field representing the user's unique identifier (e.g., 'username' or 'email').
 * @returns {Function} - An Express middleware function for handling user registration.
 */
export const register = (prisma, secret, identity) => async (req,res) => {
  
  const { [identity]: userIdentity, password, ...otherProperties } = req.body
  
  try {
    const user = await prisma.user.findUnique({
      where: {
        [identity]: userIdentity
      }
    })

    if(user) return res.status(409).json('user already exists')

    bcrypt.hash(password, 10)
      .then(async (hashedPassword) => {
        const newUser = await prisma.user.create({
          data: { 
            [identity]: userIdentity,
            password: hashedPassword,
            ...otherProperties
          }
        })
        const token = jwt.sign({id: newUser.id}, secret)
        
        return res.status(200).json({token})
      })
      .catch(error => res.status(500).json({error: error.message}))

  } catch (error) {
    console.log(error.message)
    res.json({error: error.message})
  }
}

/**
 * Handles user login.
 *
 * @param {PrismaClient} prisma - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string} identity - The field representing the user's unique identifier (e.g., 'username' or 'email').
 * @returns {Function} - An Express middleware function for handling user login.
 */
export const login = (prisma,secret,identity) => async (req,res) => {
  try {
    const { [identity]: userIdentity, password } = req.body

    const user = await prisma.user.findUnique({
      where: {
        [identity]: userIdentity
      }
    })

    if (!user) return res.status(404).json('user not found')

    const hashedPassword = await bcrypt.compare(password, user.password)
    if(!hashedPassword) return res.status(401).json('incorrect password')

    const token = jwt.sign({id: user.id}, secret)
    res.json({token})

  } catch (error) {
    console.log(error.message)
    res.json({error: error.message})
  }
}
