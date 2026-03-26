import { vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

/** Creates a minimal mock Express Request. */
export const mockReq = (
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): Request => ({ body, headers }) as unknown as Request

/** Creates a chainable mock Express Response (res.status(...).json(...) works). */
export const mockRes = (): Response => {
  const res = {} as Response
  const status = vi.fn().mockReturnValue(res)
  const json = vi.fn().mockReturnValue(res)
  return Object.assign(res, { status, json })
}

/** Creates a mock NextFunction. */
export const mockNext = (): NextFunction => vi.fn() as unknown as NextFunction
