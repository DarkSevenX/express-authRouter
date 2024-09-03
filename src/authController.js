import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/**
 * Handles user registration.
 *
 * @param {PrismaClient} prisma - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string[] } identities - The field representing the user's unique identifier (e.g., 'username' or 'email').
 * @returns {Function} - An Express middleware function for handling user registration.
 */

export const register = (prisma, secret, identities) => async (req,res) => {
  try {
    const { password, ...otherProperties } = req.body

    if (!password) {
      return res.status(400).json({ error: 'password is required' })
    }

    const identitiesObj = identities.reduce((acc, identity) => {
      acc[identity] = req.body[identity];
      return acc;
    }, {});
  
    bcrypt.hash(password, 10)
      .then(async (hashedPassword) => {
        const newUser = await prisma.user.create({
          data: { 
            ...identitiesObj,
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
    res.status(500).json({error: error.message})
  }
}

/**
 * Handles user login.
 *
 * @param {PrismaClient} prisma - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string[] } identities - The field representing the user's unique identifier (e.g., 'username' or 'email').
 * @returns {Function} - An Express middleware function for handling user login.
 */
export const login = (prisma,secret,identities) => async (req,res) => {
  try {
    const { password } = req.body
    const primaryIdentity = identities[0]; // Utiliza el primer elemento del array
    const userIdentity = req.body[primaryIdentity]; // Obtiene el valor del primer identity

    // Valida que la contraseña sea presente y no vacía.
    if (!password) return res.status(400).json({ error: 'password is required' })   

    // Valida que el primary identity sea presente y no vacío.  
    if (!userIdentity) return res.status(400).json({ error: `Missing ${primaryIdentity}` })  

    const user = await prisma.user.findUnique({
      where: {
        [primaryIdentity]: userIdentity
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
