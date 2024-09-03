
/**
 * Middleware function to check if a user exists in the database based on provided identities.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
 * @param {string[]} identities - Array of user identities (e.g., email, username)
 * @returns {Function} Express middleware function
 *
 * @example
 * const identities = ['email', 'username'];
 * const prisma = new PrismaClient(identities);
 * 
 */ 
export const checkUserExists = (prisma, identities) => 
  async (req, res, next) => {
    try {

      const missingIdentities = identities.filter(identity => !req.body[identity]);
      if (missingIdentities.length > 0) {
        return res.status(400).json({ error: `${missingIdentities.join(', ')} are required` });
      }

      for (const identity of identities) {
        const user = await prisma.user.findUnique({
          where: {
            [identity]: req.body[identity]
          }
        });

        if (user) {
          return res.status(409).json({ error: `${identity} is already taken` });
        }
      }  
      next();
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'An error occurred while checking user existence' });
    }
  }
