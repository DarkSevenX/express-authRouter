import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validationResult } from 'express-validator'
import Auth from '../../src/index.js'
import { createMockPrisma } from '../helpers/prisma.js'
import { mockReq, mockRes, mockNext } from '../helpers/express.js'

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
  Router: vi.fn(),
}))

// express-validator is also used inside routes() via checkUserExists indirectly,
// but for Auth class tests we only care about result().
const prisma = createMockPrisma()
const SECRET = 'test_secret'
const IDENTITIES = ['email']

describe('Auth constructor', () => {
  it('creates an instance with valid arguments', () => {
    const auth = new Auth(prisma, SECRET, IDENTITIES)
    expect(auth).toBeInstanceOf(Auth)
  })

  it('throws when prismaObj is missing', () => {
    // @ts-expect-error — intentional bad input
    expect(() => new Auth(null, SECRET, IDENTITIES)).toThrow('prismaObj is required')
  })

  it('throws when secret is missing', () => {
    expect(() => new Auth(prisma, '', IDENTITIES)).toThrow('secret is required')
  })

  it('throws when identities is not an array', () => {
    // @ts-expect-error — intentional bad input
    expect(() => new Auth(prisma, SECRET, 'email')).toThrow('identities must be a non-empty array')
  })

  it('throws when identities is an empty array', () => {
    expect(() => new Auth(prisma, SECRET, [])).toThrow('identities must be a non-empty array')
  })
})

describe('Auth.routes()', () => {
  it('returns an Express Router', () => {
    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const router = auth.routes()
    expect(typeof router).toBe('function')
    expect(router).toHaveProperty('post')
    expect(router).toHaveProperty('use')
  })

  it('returns a fresh Router on each call', () => {
    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const router1 = auth.routes()
    const router2 = auth.routes()
    expect(router1).not.toBe(router2)
  })
})

describe('Auth.protect()', () => {
  it('returns a middleware function', () => {
    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const middleware = auth.protect()
    expect(typeof middleware).toBe('function')
    expect(middleware.length).toBe(3) // (req, res, next)
  })
})

describe('Auth.result()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a middleware function', () => {
    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const middleware = auth.result()
    expect(typeof middleware).toBe('function')
  })

  it('calls next() when there are no validation errors', () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    } as unknown as ReturnType<typeof validationResult>)

    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const middleware = auth.result()
    const req = mockReq()
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 400 with errors when validation fails', () => {
    const errors = [{ msg: 'invalid email', path: 'email' }]
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => false,
      array: () => errors,
    } as unknown as ReturnType<typeof validationResult>)

    const auth = new Auth(prisma, SECRET, IDENTITIES)
    const middleware = auth.result()
    const req = mockReq()
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ errors })
    expect(next).not.toHaveBeenCalled()
  })
})
