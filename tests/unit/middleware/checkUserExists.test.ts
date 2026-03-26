import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkUserExists } from '../../../src/middleware/checkUserExists.js'
import { createMockPrisma, DEFAULT_USER } from '../../helpers/prisma.js'
import { mockReq, mockRes, mockNext } from '../../helpers/express.js'

const IDENTITIES = ['email', 'username']

describe('checkUserExists', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls next() when all identities are unique', async () => {
    const prisma = createMockPrisma()
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({ email: 'new@example.com', username: 'newuser' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 400 when a required identity field is missing', async () => {
    const prisma = createMockPrisma()
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({ email: 'test@example.com' }) // missing username
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: username',
    })
  })

  it('returns 400 when all identity fields are missing', async () => {
    const prisma = createMockPrisma()
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({})
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email, username',
    })
  })

  it('returns 409 when a user with that email already exists', async () => {
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn()
        .mockResolvedValueOnce(DEFAULT_USER) // email conflict
        .mockResolvedValueOnce(null),
    })
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({ email: 'taken@example.com', username: 'newuser' })
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'email is already taken' })
  })

  it('returns 409 when a user with that username already exists', async () => {
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn()
        .mockResolvedValueOnce(null)          // email OK
        .mockResolvedValueOnce(DEFAULT_USER), // username conflict
    })
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({ email: 'new@example.com', username: 'taken_user' })
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'username is already taken' })
  })

  it('returns 500 when prisma throws', async () => {
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn().mockRejectedValue(new Error('DB error')),
    })
    const middleware = checkUserExists(prisma, IDENTITIES)
    const req = mockReq({ email: 'test@example.com', username: 'testuser' })
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'An error occurred while checking user existence',
    })
  })

  it('uses the provided userModel name', async () => {
    const prisma = createMockPrisma('account')
    const middleware = checkUserExists(prisma, ['email'], 'account')
    const req = mockReq({ email: 'test@example.com' })
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(prisma.account.findUnique).toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()
  })
})
