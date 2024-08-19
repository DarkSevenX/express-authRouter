import { body, validationResult } from "express-validator";

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
