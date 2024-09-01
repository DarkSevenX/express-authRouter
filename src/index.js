import { Router } from "express";
import { register, login } from "./authController.js";
import { verifyToken } from "./middleware/authJwt.js";
import { authValidator } from "./middleware/validator.js";
import { checkUserExists } from "./middleware/userModelExists.js";
import { result } from "./middleware/validator.js";

//cambio en rama de desarrollo
class Auth {
  #prisma
  #router
  #secret
  #identity
  
  /**
 * Initializes the Auth class and sets up the necessary properties and Express Router.
 *
 * @param {PrismaClient} prismaObj - The Prisma client for interacting with the database.
 * @param {string} secret - The secret key for generating JWT tokens.
 * @param {string} identity - The field representing the user's unique identifier (e.g., 'username' or 'email').
 */
  constructor (prismaObj, secret, identity) {
    this.#prisma = prismaObj
    this.#router = Router()
    this.#secret = secret
    this.#identity = identity
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
   * Configures and returns the routes for user authentication.
   *
   * @returns {Router} - An instance of the Express Router with the configured routes.
  */
  routes() {
    this.#router.use(authValidator(this.#identity))
    this.#router.use(checkUserExists(this.#prisma))

    this.#router
      .post('/register', 
        register(
          this.#prisma, 
          this.#secret, 
          this.#identity
        )
      )

      .post('/login', 
        login(
          this.#prisma, 
          this.#secret, 
          this.#identity
        )
      )

    return this.#router
  }

  result() {
    return result()
  }
}

export default Auth 
