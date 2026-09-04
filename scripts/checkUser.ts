import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  const user = await prisma.user.findFirst({ where: { name: { contains: 'GEORGI' } } })
  console.log(JSON.stringify(user, null, 2))
  await prisma.$disconnect()
}
main()
