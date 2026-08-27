import type { UserRecord, Activity, TeamLocation } from '@/types/campaign'

export interface BadgeDefinition {
  id: string
  title: string
  description: string
  icon: string
  color: string // Tailwind color classes for bg/text
  borderColor: string
  requirement: string
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  champion_checkins: {
    id: 'champion_checkins',
    title: 'Campeão de Check-ins',
    description: 'Mais de 3 check-ins registrados em campo',
    icon: '🏆',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300',
    requirement: '3+ check-ins',
  },
  top_converter: {
    id: 'top_converter',
    title: 'Maior Conversor',
    description: 'Mais de 100 eleitores/apoiadores indicados',
    icon: '🎯',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300',
    requirement: '100+ indicações',
  },
  explorer: {
    id: 'explorer',
    title: 'Explorador',
    description: 'Mais de 5 km percorridos cobrindo o território',
    icon: '🧭',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300',
    requirement: '5+ km percorridos',
  },
  veteran: {
    id: 'veteran',
    title: 'Veterano',
    description: 'Atividade consistente registrada em múltiplos dias',
    icon: '⭐',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300',
    requirement: '2+ dias ativos',
  },
  high_impact: {
    id: 'high_impact',
    title: 'Super Mobilizador',
    description: 'Avaliação de sentimento médio positiva (≥ 4.5/5)',
    icon: '⚡',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300',
    requirement: 'Sentimento ≥ 4.5',
  },
}

export type PeriodFilter = '7' | '30' | 'all'

export interface MemberGamificationStats {
  user: UserRecord
  totalIndicacoes: number
  totalCheckins: number
  totalKm: number
  activeDaysCount: number
  sentimentAvg: number
  badges: BadgeDefinition[]
  indicacoesRank: number
  checkinsRank: number
  activities: Activity[]
}

// Haversine formula to compute distance in km between two GPS points
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function filterActivitiesByPeriod(activities: Activity[], period: PeriodFilter): Activity[] {
  if (period === 'all') return activities
  const days = parseInt(period, 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return activities.filter((a) => new Date(a.created) >= cutoff)
}

export function computeGamificationLeaderboard(
  users: UserRecord[],
  activities: Activity[],
  locations: TeamLocation[] = [],
  period: PeriodFilter = 'all',
): {
  byIndicacoes: MemberGamificationStats[]
  byCheckins: MemberGamificationStats[]
  allStats: MemberGamificationStats[]
} {
  const filteredActivities = filterActivitiesByPeriod(activities, period)

  // Pre-calculate per-user metrics
  const rawList = users.map((user) => {
    const userActs = filteredActivities.filter((a) => a.user_id === user.id)
    const totalCheckins = userActs.length
    const totalIndicacoes = userActs.reduce((acc, curr) => acc + (curr.voters_contacted || 0), 0)

    // Calculate unique active days
    const activeDays = new Set(
      userActs.map((a) => {
        try {
          return new Date(a.created).toISOString().split('T')[0]
        } catch {
          return a.created
        }
      }),
    )
    const activeDaysCount = activeDays.size

    // Calculate sentiment
    const sentimentAvg =
      userActs.length > 0
        ? Number(
            (
              userActs.reduce((acc, curr) => acc + (curr.sentiment || 3), 0) / userActs.length
            ).toFixed(1),
          )
        : 5.0

    // Calculate Km traveled
    const userLocs = locations
      .filter((l) => l.user_id === user.id)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

    let totalKm = 0
    for (let i = 1; i < userLocs.length; i++) {
      const d = calculateHaversineKm(
        userLocs[i - 1].lat,
        userLocs[i - 1].lng,
        userLocs[i].lat,
        userLocs[i].lng,
      )
      if (d > 0.005 && d < 100) {
        totalKm += d
      }
    }

    if (totalKm === 0 && userActs.length > 1) {
      for (let i = 1; i < userActs.length; i++) {
        const d = calculateHaversineKm(
          userActs[i - 1].lat,
          userActs[i - 1].lng,
          userActs[i].lat,
          userActs[i].lng,
        )
        if (d > 0.05 && d < 100) {
          totalKm += d
        }
      }
    }

    if (totalKm === 0 && totalCheckins > 0) {
      totalKm = Number((totalCheckins * 2.6).toFixed(1))
    } else {
      totalKm = Number(totalKm.toFixed(1))
    }

    // Award Badges based on criteria
    const badges: BadgeDefinition[] = []

    if (totalCheckins >= 3) {
      badges.push(BADGE_DEFINITIONS.champion_checkins)
    }
    if (totalIndicacoes >= 100) {
      badges.push(BADGE_DEFINITIONS.top_converter)
    }
    if (totalKm >= 5) {
      badges.push(BADGE_DEFINITIONS.explorer)
    }
    if (activeDaysCount >= 2) {
      badges.push(BADGE_DEFINITIONS.veteran)
    }
    if (userActs.length >= 2 && sentimentAvg >= 4.5) {
      badges.push(BADGE_DEFINITIONS.high_impact)
    }

    return {
      user,
      totalIndicacoes,
      totalCheckins,
      totalKm,
      activeDaysCount,
      sentimentAvg,
      badges,
      indicacoesRank: 0,
      checkinsRank: 0,
      activities: userActs,
    }
  })

  // Rank by Indicações (descending, then by checkins)
  const sortedByIndicacoes = [...rawList].sort((a, b) => {
    if (b.totalIndicacoes !== a.totalIndicacoes) {
      return b.totalIndicacoes - a.totalIndicacoes
    }
    return b.totalCheckins - a.totalCheckins
  })
  sortedByIndicacoes.forEach((item, idx) => {
    item.indicacoesRank = idx + 1
  })

  // Rank by Check-ins (descending, then by indicacoes)
  const sortedByCheckins = [...rawList].sort((a, b) => {
    if (b.totalCheckins !== a.totalCheckins) {
      return b.totalCheckins - a.totalCheckins
    }
    return b.totalIndicacoes - a.totalIndicacoes
  })
  sortedByCheckins.forEach((item, idx) => {
    item.checkinsRank = idx + 1
  })

  return {
    byIndicacoes: sortedByIndicacoes,
    byCheckins: sortedByCheckins,
    allStats: sortedByIndicacoes,
  }
}
