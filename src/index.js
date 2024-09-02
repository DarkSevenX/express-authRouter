import { Router } from "express";
import { register, login } from "./authController.js";
import { verifyToken } from "./middleware/authJwt.js";
import { authValidator } from "./middleware/validator.js";
import { userModelExists } from "./middleware/userModelExists.js";
import { result } from "./middleware/validator.js";
import {chechUserExists} from "./middleware/checkUserExists.js";

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
 * @param {string} identity - The field representing the user's unique identifier (e.g., 'username' or 'email').
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
    //TODO adaptar express validator para que valide un array de identidades
    //this.#router.use(authValidator(this.#identities))
    this.#router.use(userModelExists(this.#prisma))
    this.#router.use('/register', chechUserExists(this.#prisma,this.#identities))

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

  result() {
    return result()
  }
}

export default Auth 
