import { vi } from 'vitest'
import type { PrismaLike, PrismaModel } from '../../src/types.js'

export const DEFAULT_USER = {
  id: 1,
  email: 'test@example.com',
  password: 'hashed_password',
}

/**
 * Creates a mock PrismaLike object for the given model name.
 * By default, `count` resolves to 1, `create` resolves to DEFAULT_USER,
 * and `findUnique` resolves to null (user not found).
 */
export const createMockPrisma = (
  modelName = 'user',
  overrides: Partial<PrismaModel> = {}
): PrismaLike => ({
  [modelName]: {
    count: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue(DEFAULT_USER),
    findUnique: vi.fn().mockResolvedValue(null),
    ...overrides,
  },
})
