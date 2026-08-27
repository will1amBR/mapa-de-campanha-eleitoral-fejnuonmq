import React from 'react'
import type { MemberGamificationStats, PeriodFilter } from '@/lib/gamification'
import { Crown, Flame, MapPin, Trophy, Star, ShieldCheck, Award } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

interface PodiumProps {
  topThree: MemberGamificationStats[]
  type: 'indicacoes' | 'checkins'
}

export const GamificationPodium: React.FC<PodiumProps> = ({ topThree, type }) => {
  if (!topThree || topThree.length === 0) return null

  const first = topThree[0]
  const second = topThree[1]
  const third = topThree[2]

  const formatValue = (member?: MemberGamificationStats) => {
    if (!member) return '-'
    if (type === 'indicacoes') {
      return `${member.totalIndicacoes.toLocaleString('pt-BR')} indicados`
    }
    return `${member.totalCheckins} check-ins`
  }

  const renderPodiumStep = (
    member: MemberGamificationStats | undefined,
    place: 1 | 2 | 3,
    heightClass: string,
    bgGradient: string,
    badgeColor: string,
    medalEmoji: string,
    orderClass: string,
  ) => {
    if (!member) {
      return (
        <div className={`flex-1 flex flex-col items-center justify-end ${orderClass} opacity-40`}>
          <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold mb-3">
            {place}º
          </div>
          <div
            className={`w-full ${heightClass} bg-slate-100 rounded-t-2xl border-t border-x border-slate-200 flex flex-col items-center justify-center`}
          >
            <span className="text-xs font-bold text-slate-400">{place}º Lugar</span>
          </div>
        </div>
      )
    }

    const avatarLetter = member.user.name ? member.user.name.charAt(0).toUpperCase() : 'M'
    const roleLabel =
      member.user.role === 'admin'
        ? 'Coordenação Geral'
        : member.user.role === 'coordinator'
          ? 'Coordenação Zonal'
          : 'Militante de Campo'

    return (
      <div className={`flex-1 flex flex-col items-center justify-end ${orderClass}`}>
        {/* Avatar & Crown */}
        <div className="relative mb-2 flex flex-col items-center group">
          {place === 1 && (
            <div className="absolute -top-6 text-amber-500 animate-bounce">
              <Crown className="w-6 h-6 fill-amber-400" />
            </div>
          )}

          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg border-2 transition-transform group-hover:scale-105 ${
              place === 1
                ? 'bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 border-amber-400 ring-4 ring-amber-400/20 shadow-amber-500/30'
                : place === 2
                  ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 border-slate-300 ring-2 ring-slate-300/30'
                  : 'bg-gradient-to-tr from-amber-700/80 to-amber-600/60 text-white border-amber-600/80 ring-2 ring-amber-700/20'
            }`}
          >
            {member.user.avatar ? (
              <img
                src={pb.files.getURL(member.user, member.user.avatar)}
                alt={member.user.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              avatarLetter
            )}
          </div>

          <div
            className={`absolute -bottom-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow flex items-center gap-0.5 ${badgeColor}`}
          >
            <span>{medalEmoji}</span> {place}º Lugar
          </div>
        </div>

        {/* Member Info */}
        <div className="text-center mt-2 mb-2 px-1 w-full max-w-[130px] sm:max-w-[170px]">
          <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
            {member.user.name || member.user.email}
          </div>
          <div className="text-[10px] text-slate-500 truncate">{roleLabel}</div>
        </div>

        {/* Podium Stand */}
        <div
          className={`w-full ${heightClass} ${bgGradient} rounded-t-2xl shadow-inner border-t border-x flex flex-col items-center justify-center p-2 text-center transition-all`}
        >
          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900">
            {formatValue(member)}
          </span>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-600 font-semibold">
            {type === 'indicacoes' ? (
              <span className="flex items-center gap-0.5 text-amber-700">
                <Flame className="w-3 h-3 text-amber-600" /> {member.totalCheckins} check-ins
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-emerald-700">
                <Flame className="w-3 h-3 text-emerald-600" /> {member.totalIndicacoes} indicados
              </span>
            )}
          </div>

          {/* Badges preview */}
          {member.badges.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap justify-center">
              {member.badges.slice(0, 3).map((b) => (
                <span
                  key={b.id}
                  title={b.title}
                  className="text-xs bg-white/80 p-0.5 px-1 rounded shadow-xs cursor-default"
                >
                  {b.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 pt-8 pb-0 px-2 sm:px-6 w-full max-w-lg mx-auto">
      {/* 2nd Place */}
      {renderPodiumStep(
        second,
        2,
        'h-32 sm:h-36',
        'bg-gradient-to-b from-slate-200 to-slate-100 border-slate-300',
        'bg-slate-700 text-white',
        '🥈',
        'order-1',
      )}

      {/* 1st Place (Center & Taller) */}
      {renderPodiumStep(
        first,
        1,
        'h-40 sm:h-48',
        'bg-gradient-to-b from-amber-200 via-amber-100 to-amber-50 border-amber-300',
        'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400',
        '🥇',
        'order-2',
      )}

      {/* 3rd Place */}
      {renderPodiumStep(
        third,
        3,
        'h-24 sm:h-28',
        'bg-gradient-to-b from-orange-100 to-amber-50 border-orange-200',
        'bg-amber-800 text-white',
        '🥉',
        'order-3',
      )}
    </div>
  )
}
