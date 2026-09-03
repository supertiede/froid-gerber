/**
 * Crée un utilisateur via l'API Better Auth.
 * Nécessite que le serveur Next.js soit démarré (npm run dev).
 *
 * Usage :
 *   npx tsx scripts/createUser.ts "Prénom Nom" prenomnom motdepassetemp
 *
 * Exemples :
 *   npx tsx scripts/createUser.ts "Jean-Luc Carpentier" jeanluccarpentier Gerber2026!
 *   npx tsx scripts/createUser.ts "Alexandre Dupont" alexandred Gerber2026!
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function main() {
  const [, , name, username, password] = process.argv

  if (!name || !username || !password) {
    console.error('Usage : npx tsx scripts/createUser.ts "Prénom Nom" prenomnom motdepasse')
    process.exit(1)
  }

  // Validation du format username
  if (!/^[a-z0-9-]+$/.test(username)) {
    console.error('Erreur : l\'identifiant doit être en minuscules, sans espaces ni accents (ex: jeanluccarpentier)')
    process.exit(1)
  }

  console.log(`Création de l'utilisateur "${name}" (${username}) sur ${BASE_URL}…`)

  const res = await fetch(`${BASE_URL}/api/auth/sign-up/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password }),
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json() as { message?: string }
      message = body.message ?? message
    } catch {
      message = await res.text()
    }
    console.error(`Erreur : ${message}`)
    process.exit(1)
  }

  const data = await res.json() as { user?: { id?: string } }
  console.log(`\nUtilisateur créé avec succès :`)
  console.log(`  Nom         : ${name}`)
  console.log(`  Identifiant : ${username}`)
  console.log(`  Mot de passe temporaire : ${password}`)
  console.log(`  ID          : ${data.user?.id ?? 'inconnu'}`)
  console.log(`\nL'utilisateur devra changer son mot de passe à la première connexion.`)
}

main().catch(err => {
  console.error('Erreur fatale :', (err as Error).message)
  process.exit(1)
})
