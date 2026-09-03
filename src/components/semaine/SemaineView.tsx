'use client'

import { useRouter } from 'next/navigation'
import {
  addWeeks,
  subWeeks,
  getISOWeek,
  getISOWeekYear,
  eachDayOfInterval,
  format,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { formatDuree, diffMinutes } from '@/lib/temps'
import { heuresTravailleesMinutes, tempsInterventionMinutes } from '@/lib/calculs'
import Link from 'next/link'

const TZ = 'Europe/Paris'

type ClientSer = {
  id: string
  nom: string
  nomNormalise: string
  actif: boolean
  createdAt: string
  creeParId: string | null
}

type PauseSer = {
  id: string
  type: string
  debutAt: string
  finAt: string | null
}

type PosteSer = {
  id: string
  debutAt: string
  finAt: string | null
  pauses: PauseSer[]
}

type InterventionSer = {
  id: string
  type: 'CLIENT' | 'ATELIER'
  debutAt: string
  finAt: string | null
  trajetMinutes: number
  compteRendu: string | null
  client: ClientSer | null
}

function isoWeek(date: Date) {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

export function SemaineView({
  semaineIso,
  debutSemaine,
  postes,
  interventions,
}: {
  semaineIso: string
  debutSemaine: string
  postes: PosteSer[]
  interventions: InterventionSer[]
}) {
  const router = useRouter()
  const debut = new Date(debutSemaine)

  const navigate = (offset: number) => {
    const d = offset < 0 ? subWeeks(debut, 1) : addWeeks(debut, 1)
    router.push(`/semaine?semaine=${isoWeek(d)}`)
  }

  const jours = eachDayOfInterval({ start: debut, end: addWeeks(debut, 1) }).slice(0, 7)
  let totalSemaine = 0

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Navigation */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--trait)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: 28,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: '4px 12px',
          }}
        >
          ‹
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
          Semaine {semaineIso.split('-W')[1]}
        </h1>
        <button
          onClick={() => navigate(1)}
          style={{
            fontSize: 28,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: '4px 12px',
          }}
        >
          ›
        </button>
      </div>

      {jours.map(jour => {
        const jourStr = format(toZonedTime(jour, TZ), 'yyyy-MM-dd')

        const poste =
          postes.find(
            p => format(toZonedTime(new Date(p.debutAt), TZ), 'yyyy-MM-dd') === jourStr,
          ) ?? null

        const intervJour = interventions.filter(
          i => format(toZonedTime(new Date(i.debutAt), TZ), 'yyyy-MM-dd') === jourStr,
        )

        if (!poste && intervJour.length === 0) return null

        const pausesConv = (poste?.pauses ?? []).map(p => ({
          debutAt: new Date(p.debutAt),
          finAt: p.finAt ? new Date(p.finAt) : null,
        }))

        const posteConv = poste
          ? {
              debutAt: new Date(poste.debutAt),
              finAt: poste.finAt ? new Date(poste.finAt) : null,
            }
          : null

        const heuresTravaillees = posteConv ? heuresTravailleesMinutes(posteConv, pausesConv) : 0
        if (posteConv?.finAt) totalSemaine += heuresTravaillees

        const tempsInterv = intervJour
          .filter(i => i.finAt)
          .reduce(
            (acc, i) =>
              acc +
              tempsInterventionMinutes({
                debutAt: new Date(i.debutAt),
                finAt: new Date(i.finAt!),
                trajetMinutes: i.trajetMinutes,
              }),
            0,
          )

        const ecart = heuresTravaillees - tempsInterv
        const aEcart = posteConv?.finAt && Math.abs(ecart) > 30

        return (
          <div key={jourStr}>
            {/* Day header */}
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--trait)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--encre-douce)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {format(toZonedTime(jour, TZ), 'EEEE d MMM', { locale: fr })}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--encre)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {heuresTravaillees > 0 ? formatDuree(heuresTravaillees) : '—'}
                {posteConv && !posteConv.finAt && ' ⏳'}
              </span>
            </div>

            {/* Poste summary line */}
            {poste && (
              <div
                style={{
                  padding: '6px 16px',
                  fontSize: 15,
                  color: 'var(--encre-douce)',
                  borderBottom: '1px solid var(--trait)',
                }}
              >
                {format(toZonedTime(new Date(poste.debutAt), TZ), 'HH:mm')}
                {poste.finAt
                  ? ` → ${format(toZonedTime(new Date(poste.finAt), TZ), 'HH:mm')}`
                  : ' → en cours'}
                {pausesConv.filter(p => p.finAt).length > 0 &&
                  ` · pauses ${formatDuree(
                    pausesConv
                      .filter(p => p.finAt)
                      .reduce((a, p) => a + diffMinutes(p.debutAt, p.finAt!), 0),
                  )}`}
              </div>
            )}

            {/* Interventions */}
            {intervJour.map(i => {
              const t = i.finAt
                ? tempsInterventionMinutes({
                    debutAt: new Date(i.debutAt),
                    finAt: new Date(i.finAt),
                    trajetMinutes: i.trajetMinutes,
                  })
                : null
              return (
                <Link
                  key={i.id}
                  href={`/intervention/${i.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--trait)',
                    textDecoration: 'none',
                    minHeight: 56,
                  }}
                >
                  <span style={{ fontSize: 18, color: 'var(--encre)' }}>
                    {i.type === 'ATELIER' ? 'Atelier' : i.client?.nom}
                    {!i.compteRendu && i.finAt && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ambre)' }}>●</span>
                    )}
                  </span>
                  {t !== null && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--encre)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatDuree(t)}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Écart warning */}
            {aEcart && (
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(138,90,18,0.08)',
                  borderBottom: '1px solid var(--trait)',
                  fontSize: 15,
                  color: 'var(--ambre)',
                }}
              >
                ⚠ {Math.abs(ecart)} min non affectées — vérifiez vos interventions
              </div>
            )}
          </div>
        )
      })}

      {/* Week total */}
      <div
        style={{
          margin: '24px 16px',
          padding: '16px 20px',
          background: 'var(--acier)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 18, color: '#fff' }}>Total semaine</span>
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatDuree(totalSemaine)}
        </span>
      </div>
    </div>
  )
}
