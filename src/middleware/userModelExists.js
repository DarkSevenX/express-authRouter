/**
 * Middleware function to check if the 'user' table exists in the database.
 * If the table does not exist, it sends a JSON response with an error message.
 * If the table exists, it proceeds to the next middleware function.
 *
 * @param {PrismaClient} prisma - The Prisma client for interacting with the database.
 *
 * @returns {Function} - An Express middleware function.
 *
 * @throws Will throw an error if the 'user' table does not exist and an error occurs during the database operation.
 */
export const checkUserExists = (prisma) => 
    async (req, res, next) => {
        try {
            const userCount = await prisma.user.count()
            next(); 
        } catch (error) {
            if (error.code === 'P2021') {
              res.status(404).json('table user dont exists');
              return false;
            } else {
              res.status(500).json({'Otro error ocurrió:': error});
            }
        }
    };
