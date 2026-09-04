import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'

async function main() {
  const [, , username] = process.argv
  if (!username) { console.error('Usage: npx tsx scripts/deleteUser.ts identifiant'); process.exit(1) }

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  const deleted = await prisma.user.deleteMany({ where: { username } })
  console.log(`Supprimé : ${deleted.count} utilisateur(s) avec identifiant "${username}"`)
  await prisma.$disconnect()
}
main()
