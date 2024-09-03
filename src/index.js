import { Router } from "express";
import { register, login } from "./authController.js";
import { verifyToken } from "./middleware/authJwt.js";
import { userModelExists } from "./middleware/userModelExists.js";
import { validationResult } from "express-validator";
import {checkUserExists} from "./middleware/checkUserExists.js";

//cambio en rama de desarrollo
class Auth {
  #prisma
  #router
  #secret
  #identities
  
  /**
 * Initializes the Auth class and sets up the necessary properties and Express Router.
 *
 * @param {PrismaClient} prismaObj - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string[] } identities - Array of user identities (e.g., email, username)
 */
  constructor (prismaObj, secret, identities) {
    this.#prisma = prismaObj
    this.#router = Router()
    this.#secret = secret
    this.#identities = identities
  }

  /**
   * Configures and returns the routes for user authentication.
   *
   * @returns {Router} - An instance of the Express Router with the configured routes.
  */
  routes() {
    this.#router.use(userModelExists(this.#prisma))
    this.#router.use('/register', checkUserExists(this.#prisma,this.#identities))

    this.#router
      .post('/register', 
        register(
          this.#prisma, 
          this.#secret, 
          this.#identities
        )
      )

      .post('/login', 
        login(
          this.#prisma, 
          this.#secret, 
          this.#identities
        )
      )

    return this.#router
  }

  /**
   * Configures and returns middleware for verifying token.
   *
   * @returns {Function} - A middleware function for verifying token.
  */ 
  protect() {
    return verifyToken(this.#secret)
  }

  
  /**
   * Middleware function to handle validation result from express-validator.
   * If validation errors exist, it sends a JSON response with an array of errors.
   * If no validation errors exist, it proceeds to the next middleware function.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The Express next middleware function.
   *
   * @returns {void}
   */
  result (req,res,next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(errors.array())
    }
    next()
  }

}

export default Auth 
