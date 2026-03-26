import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userModelExists } from '../../../src/middleware/userModelExists.js'
import { createMockPrisma } from '../../helpers/prisma.js'
import { mockReq, mockRes, mockNext } from '../../helpers/express.js'

describe('userModelExists', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls next() when the model table exists', async () => {
    const prisma = createMockPrisma()
    const middleware = userModelExists(prisma)
    const req = mockReq()
    const res = mockRes()
    const next = mockNext()

    await middleware(req, res, next)

    expect(prisma.user.count).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 500 with a migrations hint when Prisma throws P2021', async () => {
    const p2021Error = Object.assign(new Error('Table does not exist'), { code: 'P2021' })
    const prisma = createMockPrisma('user', {
      count: vi.fn().mockRejectedValue(p2021Error),
    })
    const middleware = userModelExists(prisma)
    const req = mockReq()
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Make sure you have run your Prisma migrations'),
    })
  })

  it('includes the model name in the P2021 error message', async () => {
    const p2021Error = Object.assign(new Error('Table does not exist'), { code: 'P2021' })
    const prisma = createMockPrisma('account', {
      count: vi.fn().mockRejectedValue(p2021Error),
    })
    const middleware = userModelExists(prisma, 'account')
    const req = mockReq()
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('"account"'),
    })
  })

  it('returns 500 with the error message for other prisma errors', async () => {
    const prisma = createMockPrisma('user', {
      count: vi.fn().mockRejectedValue(new Error('Connection refused')),
    })
    const middleware = userModelExists(prisma)
    const req = mockReq()
    const res = mockRes()

    await middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Connection refused' })
  })

  it('uses the provided userModel name', async () => {
    const prisma = createMockPrisma('account')
    const middleware = userModelExists(prisma, 'account')
    const req = mockReq()
    const next = mockNext()

    await middleware(req, mockRes(), next)

    expect(prisma.account.count).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
  })
})
