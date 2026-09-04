/**
 * Crée un utilisateur directement en base (sans serveur HTTP).
 * Usage : npx tsx scripts/seedUser.ts "Prénom NOM" identifiant motdepasse
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { hashPassword } from 'better-auth/crypto'

async function main() {
  const [, , name, username, password] = process.argv

  if (!name || !username || !password) {
    console.error('Usage : npx tsx scripts/seedUser.ts "Prénom NOM" identifiant motdepasse')
    process.exit(1)
  }

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

  const existing = await prisma.user.findFirst({ where: { username } })
  if (existing) {
    console.error(`Erreur : l'identifiant "${username}" est déjà pris.`)
    await prisma.$disconnect()
    process.exit(1)
  }

  const hashed = await hashPassword(password)
  const userId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  const now = new Date()

  await prisma.user.create({
    data: {
      id: userId,
      name,
      username,
      email: `${username}@froid-gerber.local`,
      emailVerified: false,
      mustChangePassword: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  })

  await prisma.account.create({
    data: {
      id: accountId,
      userId,
      accountId: userId,
      providerId: 'credential',
      issuer: 'local:credential',
      password: hashed,
      createdAt: now,
      updatedAt: now,
    },
  })

  console.log('\nUtilisateur créé avec succès :')
  console.log(`  Nom                  : ${name}`)
  console.log(`  Identifiant          : ${username}`)
  console.log(`  Mot de passe temp.   : ${password}`)
  console.log(`  ID                   : ${userId}`)
  console.log("\nL'utilisateur devra changer son mot de passe à la première connexion.")

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Erreur fatale :', (err as Error).message)
  process.exit(1)
})
