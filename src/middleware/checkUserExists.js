
export const chechUserExists = async (prisma,identities) => 
  async (req,res,next) =>{
    for (const i in identities) {
      const user = await prisma.user.findUnique({
        where: {
          [identities[i]]: req.body[identities[i]]
        }
      })

      if (user) {
        return res.status(409).json({error: `${identities[i]} is already taken`})
      }
    }  
    next()
  }
      
//NOTE probar implementacion con for each
