import { body, validationResult } from "express-validator";

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
export const result = (req,res,next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array())
  }
  next()
}

export const authValidator = (identity) => [
  body(identity)
    .exists()
    .notEmpty()
    .withMessage(`${identity} is required`),
  body('password')
    .exists()
    .notEmpty()
    .withMessage('Password is required'),
  (req,res,next) => {
    result(req,res,next)
  }
]
