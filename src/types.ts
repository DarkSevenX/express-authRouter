export interface AuthOptions {
  /** JWT expiration time. Accepts any value valid for jsonwebtoken (e.g. '1h', '7d', '30d'). Default: '7d'. */
  expiresIn?: string
  /** Prisma model name in camelCase (e.g. 'user', 'account'). Default: 'user'. */
  userModel?: string
}

export interface TokenPayload {
  id: string | number
  iat?: number
  exp?: number
}

/**
 * Minimal structural interface matching the Prisma model accessor shape.
 * Any generated PrismaClient satisfies this type, so no hard dependency
 * on @prisma/client is needed at compile time for consumers.
 */
export interface PrismaModel {
  count(): Promise<number>
  create(args: { data: Record<string, unknown> }): Promise<{ id: unknown } & Record<string, unknown>>
  findUnique(args: { where: Record<string, unknown> }): Promise<
    ({ id: unknown; password: string } & Record<string, unknown>) | null
  >
}

export interface PrismaLike {
  [model: string]: PrismaModel
}

// Augment Express Request so that req.user is typed after auth.protect()
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}
