import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { register, login } from '../../src/authController.js'
import { createMockPrisma, DEFAULT_USER } from '../helpers/prisma.js'
import { mockReq, mockRes, mockNext } from '../helpers/express.js'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

const SECRET = 'test_secret'
const IDENTITIES = ['email']
const OPTIONS = { expiresIn: '7d', userModel: 'user' }

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never)
    vi.mocked(jwt.sign).mockImplementation(() => 'mock_token')
  })

  it('creates a user and returns 201 with token', async () => {
    const prisma = createMockPrisma()
    const handler = register(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ password: 'hashed_password' }),
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ token: 'mock_token' })
  })

  it('signs the JWT with the provided secret and expiresIn', async () => {
    const prisma = createMockPrisma()
    const handler = register(prisma, SECRET, IDENTITIES, { ...OPTIONS, expiresIn: '1h' })
    const req = mockReq({ email: 'test@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: DEFAULT_USER.id },
      SECRET,
      expect.objectContaining({ expiresIn: '1h' })
    )
  })

  it('returns 400 when password is missing', async () => {
    const prisma = createMockPrisma()
    const handler = register(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'password is required' })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('returns 500 when prisma throws', async () => {
    const prisma = createMockPrisma('user', {
      create: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    })
    const handler = register(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection failed' })
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(jwt.sign).mockImplementation(() => 'mock_token')
  })

  it('returns 200 with token on valid credentials', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn().mockResolvedValue(DEFAULT_USER),
    })
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ token: 'mock_token' })
  })

  it('returns 400 when password is missing', async () => {
    const prisma = createMockPrisma()
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'password is required' })
  })

  it('returns 400 when primary identity is missing', async () => {
    const prisma = createMockPrisma()
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ password: 'pass123' }) // no email
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'email is required' })
  })

  it('returns 404 when user is not found', async () => {
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn().mockResolvedValue(null),
    })
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'nobody@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'user not found' })
  })

  it('returns 401 when password is incorrect', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn().mockResolvedValue(DEFAULT_USER),
    })
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com', password: 'wrong_pass' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'incorrect password' })
  })

  it('returns 500 when prisma throws', async () => {
    const prisma = createMockPrisma('user', {
      findUnique: vi.fn().mockRejectedValue(new Error('DB timeout')),
    })
    const handler = login(prisma, SECRET, IDENTITIES, OPTIONS)
    const req = mockReq({ email: 'test@example.com', password: 'pass123' })
    const res = mockRes()

    await handler(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB timeout' })
  })
})
