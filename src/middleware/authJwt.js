import jwt from 'jsonwebtoken'

/**
 * Verifies the JWT token provided in the request.
 *
 * @param {string} secret - The secret key for verifying the JWT token.
 * @returns {Function} - An Express middleware function for verifying the JWT token.
 */
export const verifyToken = (secret) =>  (req,res,next) => {
  try {
    const token = req.headers['token']

    if(!token) return res.status(403).json({ message: 'no token provided' })
    
    jwt.verify(token, secret, (err,decode) => {
      if(err) return res.status(401).json(err)

      req.user = decode
      next()
    })
  } catch (error) {
    res.json(error.message)
    console.log(error)
  }
}
