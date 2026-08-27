import React from 'react'
import type { MemberGamificationStats, BadgeDefinition } from '@/lib/gamification'
import { BADGE_DEFINITIONS } from '@/lib/gamification'
import {
  Trophy,
  Flame,
  MapPin,
  Star,
  Award,
  Navigation,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

interface MemberRankingCardProps {
  stats: MemberGamificationStats
  rank: number
  category: 'indicacoes' | 'checkins'
  showBadgesDetail?: boolean
  onClick?: () => void
}

export const MemberRankingCard: React.FC<MemberRankingCardProps> = ({
  stats,
  rank,
  category,
  showBadgesDetail = true,
  onClick,
}) => {
  const isTop3 = rank <= 3
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const avatarLetter = stats.user.name ? stats.user.name.charAt(0).toUpperCase() : 'M'

  const rankBadgeStyle =
    rank === 1
      ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
      : rank === 2
        ? 'bg-slate-300 text-slate-900 font-bold shadow-sm'
        : rank === 3
          ? 'bg-amber-800 text-white font-bold shadow-sm'
          : 'bg-slate-100 text-slate-700 font-semibold border border-slate-200'

  const cardBorder =
    rank === 1
      ? 'border-amber-400/80 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm ring-1 ring-amber-400/30'
      : rank === 2
        ? 'border-slate-300 bg-white shadow-xs'
        : rank === 3
          ? 'border-orange-200 bg-white shadow-xs'
          : 'border-slate-200/80 bg-white hover:border-slate-300'

  const roleLabel =
    stats.user.role === 'admin'
      ? '👑 Coordenação Geral'
      : stats.user.role === 'coordinator'
        ? '⭐ Coordenação Zonal'
        : '🚶 Agente de Campo'

  return (
    <div
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${cardBorder} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Rank + Avatar + Name + Badges */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Rank Badge */}
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${rankBadgeStyle}`}
          >
            {medal ? <span>{medal}</span> : <span>{rank}º</span>}
          </div>

          {/* Avatar */}
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {stats.user.avatar ? (
              <img
                src={pb.files.getURL(stats.user, stats.user.avatar)}
                alt={stats.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarLetter
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-slate-900 truncate">
                {stats.user.name || stats.user.email}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-slate-500 font-medium"
              >
                {roleLabel}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {stats.totalIndicacoes.toLocaleString('pt-BR')} indicações
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {stats.totalCheckins} check-ins
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Navigation className="w-3 h-3 text-emerald-600" />
                {stats.totalKm} km
              </span>
            </div>
          </div>
        </div>

        {/* Right: Primary Highlight Stat + Badges */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Badges pills */}
          {showBadgesDetail && (
            <div className="flex items-center gap-1 flex-wrap max-w-[200px] justify-start sm:justify-end">
              {stats.badges.map((b) => (
                <span
                  key={b.id}
                  title={`${b.title}: ${b.description}`}
                  className={`text-xs px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 cursor-default ${b.color} ${b.borderColor}`}
                >
                  <span>{b.icon}</span>
                  <span className="text-[10px] hidden md:inline">{b.title}</span>
                </span>
              ))}
            </div>
          )}

          {/* Main metric highlight badge */}
          <div className="text-right shrink-0 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 min-w-[100px]">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {category === 'indicacoes' ? 'Indicações' : 'Check-ins'}
            </div>
            <div
              className={`text-lg sm:text-xl font-black ${
                category === 'indicacoes' ? 'text-amber-600' : 'text-blue-600'
              }`}
            >
              {category === 'indicacoes'
                ? stats.totalIndicacoes.toLocaleString('pt-BR')
                : stats.totalCheckins}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
