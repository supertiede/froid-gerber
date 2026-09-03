'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

type Props = {
  user: { name: string; username: string }
}

export function SettingsView({ user }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDeconnexion() {
    setLoading(true)
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 480, margin: '0 auto' }}>
      {/* En-tête avec logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <Image
          src="/foird-gerber-logo.jpg"
          alt="Froid Climatisation Gerber"
          width={160}
          height={53}
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Profil */}
      <section
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--trait)',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--trait)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--encre-douce)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Mon profil
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--encre-douce)' }}>Nom</span>
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>{user.name}</p>
            </div>
            <div>
              <span style={{ fontSize: 13, color: 'var(--encre-douce)' }}>Identifiant</span>
              <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', fontFamily: 'monospace' }}>{user.username}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Déconnexion */}
      <button
        onClick={handleDeconnexion}
        disabled={loading}
        style={{
          width: '100%',
          height: 64,
          borderRadius: 12,
          background: 'transparent',
          color: 'var(--rouge)',
          fontSize: 16,
          fontWeight: 600,
          border: '2px solid var(--rouge)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginBottom: 32,
        }}
      >
        {loading ? 'Déconnexion…' : 'Se déconnecter'}
      </button>

      {/* Données personnelles (RGPD) */}
      <section
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--trait)',
          padding: '16px 20px',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--encre-douce)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Données personnelles
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--encre)', marginBottom: 2 }}>Responsable du traitement</p>
            <p style={{ fontSize: 14, color: 'var(--encre-douce)', lineHeight: 1.5 }}>
              INSTALLATIONS FRIGOR CH.GERBER & CIE<br />
              Illkirch-Graffenstaden
            </p>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--encre)', marginBottom: 2 }}>Finalité</p>
            <p style={{ fontSize: 14, color: 'var(--encre-douce)', lineHeight: 1.5 }}>
              Gestion des horaires et du temps de travail des techniciens.
            </p>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--encre)', marginBottom: 2 }}>Données collectées</p>
            <p style={{ fontSize: 14, color: 'var(--encre-douce)', lineHeight: 1.5 }}>
              Identifiant, horaires d'arrivée et de départ, pauses, interventions client.
            </p>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--encre)', marginBottom: 2 }}>Durée de conservation</p>
            <p style={{ fontSize: 14, color: 'var(--encre-douce)', lineHeight: 1.5 }}>
              5 ans à compter de leur enregistrement, conformément aux obligations légales en matière de durée du travail.
            </p>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--encre)', marginBottom: 2 }}>Vos droits</p>
            <p style={{ fontSize: 14, color: 'var(--encre-douce)', lineHeight: 1.5 }}>
              Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données. Pour exercer ces droits, contactez votre employeur.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
