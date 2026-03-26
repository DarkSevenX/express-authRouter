import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../../../src/middleware/authJwt.js'
import { mockReq, mockRes, mockNext } from '../../helpers/express.js'

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

const SECRET = 'test_secret'
const VALID_PAYLOAD = { id: 1, iat: 1000, exp: 9999 }

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when Authorization header is missing', () => {
    const middleware = verifyToken(SECRET)
    const req = mockReq({}, {})
    const res = mockRes()

    middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'no token provided' })
  })

  it('returns 403 when Authorization header does not start with Bearer', () => {
    const middleware = verifyToken(SECRET)
    const req = mockReq({}, { authorization: 'Token abc123' })
    const res = mockRes()

    middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'no token provided' })
  })

  it('returns 401 when token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
      callback(new Error('invalid signature'), undefined)
    })

    const middleware = verifyToken(SECRET)
    const req = mockReq({}, { authorization: 'Bearer bad_token' })
    const res = mockRes()

    middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid signature' })
  })

  it('returns 401 when token is expired', () => {
    vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
      callback(new Error('jwt expired'), undefined)
    })

    const middleware = verifyToken(SECRET)
    const req = mockReq({}, { authorization: 'Bearer expired_token' })
    const res = mockRes()

    middleware(req, res, mockNext())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'jwt expired' })
  })

  it('sets req.user and calls next() on a valid token', () => {
    vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
      callback(null, VALID_PAYLOAD)
    })

    const middleware = verifyToken(SECRET)
    const req = mockReq({}, { authorization: 'Bearer valid_token' })
    const res = mockRes()
    const next = mockNext()

    middleware(req, res, next)

    expect(req.user).toEqual(VALID_PAYLOAD)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('passes the correct token string to jwt.verify', () => {
    vi.mocked(jwt.verify).mockImplementation((_token, _secret, callback: any) => {
      callback(null, VALID_PAYLOAD)
    })

    const middleware = verifyToken(SECRET)
    const req = mockReq({}, { authorization: 'Bearer my_actual_token' })
    const res = mockRes()

    middleware(req, res, mockNext())

    expect(jwt.verify).toHaveBeenCalledWith('my_actual_token', SECRET, expect.any(Function))
  })
})
