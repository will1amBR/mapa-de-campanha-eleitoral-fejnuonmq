import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { useAuth } from '@/hooks/use-auth'
import type { UserRecord, Activity, TeamLocation } from '@/types/campaign'
import {
  computeGamificationLeaderboard,
  BADGE_DEFINITIONS,
  type PeriodFilter,
  type MemberGamificationStats,
} from '@/lib/gamification'
import { GamificationPodium } from '@/components/gamification/GamificationPodium'
import { MemberRankingCard } from '@/components/gamification/MemberRankingCard'
import {
  Trophy,
  Flame,
  MapPin,
  Award,
  Filter,
  Search,
  Users,
  Star,
  Sparkles,
  CheckCircle2,
  Navigation,
  Crown,
  Medal,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export const RankingPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const { user } = useAuth()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [locations, setLocations] = useState<TeamLocation[]>([])
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'indicacoes' | 'checkins'>('indicacoes')
  const [selectedMember, setSelectedMember] = useState<MemberGamificationStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [usersRes, actsRes, locsRes] = await Promise.all([
        pb.collection('users').getFullList<UserRecord>({
          sort: 'name',
        }),
        pb.collection('activities').getFullList<Activity>({
          filter: `campaign_id = "${currentCampaign.id}"`,
          sort: '-created',
          expand: 'user_id',
        }),
        pb.collection('team_locations').getFullList<TeamLocation>({
          sort: 'created',
        }),
      ])

      setUsers(usersRes)
      setActivities(actsRes)
      setLocations(locsRes)
    } catch (err) {
      console.error('Error fetching gamification data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Realtime subscription to activities and locations
    const unsubActivities = pb.collection('activities').subscribe('*', () => {
      fetchData()
    })
    const unsubLocations = pb.collection('team_locations').subscribe('*', () => {
      fetchData()
    })

    return () => {
      unsubActivities.then((u) => u())
      unsubLocations.then((u) => u())
    }
  }, [currentCampaign])

  // Compute leaderboard
  const { byIndicacoes, byCheckins } = useMemo(() => {
    return computeGamificationLeaderboard(users, activities, locations, period)
  }, [users, activities, locations, period])

  // Filter lists by search query
  const filteredIndicacoes = useMemo(() => {
    if (!searchQuery.trim()) return byIndicacoes
    const q = searchQuery.toLowerCase()
    return byIndicacoes.filter(
      (m) =>
        m.user.name?.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.user.role?.toLowerCase().includes(q),
    )
  }, [byIndicacoes, searchQuery])

  const filteredCheckins = useMemo(() => {
    if (!searchQuery.trim()) return byCheckins
    const q = searchQuery.toLowerCase()
    return byCheckins.filter(
      (m) =>
        m.user.name?.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.user.role?.toLowerCase().includes(q),
    )
  }, [byCheckins, searchQuery])

  // Total summary metrics
  const totalIndicacoesSum = useMemo(() => {
    return byIndicacoes.reduce((acc, curr) => acc + curr.totalIndicacoes, 0)
  }, [byIndicacoes])

  const totalCheckinsSum = useMemo(() => {
    return byCheckins.reduce((acc, curr) => acc + curr.totalCheckins, 0)
  }, [byCheckins])

  const topIndicador = byIndicacoes[0]
  const topCheckin = byCheckins[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-2xl text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5">
              Gamificação & Reconhecimento
            </Badge>
            <span className="text-xs text-slate-300 font-medium">
              Equipes de Campo em Alta Performance
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400 fill-amber-400" /> Rankings da Campanha
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Acompanhe a liderança em captação de apoiadores e volume de atividades geolocalizadas.
            Conquiste selos, badges e destaque no pódio oficial.
          </p>
        </div>

        {/* Global Period Selector */}
        <div className="flex items-center gap-2 bg-slate-800/90 p-2 rounded-xl border border-slate-700 shadow-md">
          <Filter className="w-4 h-4 text-amber-400 ml-1" />
          <span className="text-xs text-slate-300 font-semibold">Período:</span>
          <Select value={period} onValueChange={(val: PeriodFilter) => setPeriod(val)}>
            <SelectTrigger className="bg-slate-900 text-white border-slate-700 text-xs h-9 w-40 font-bold">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Toda a Campanha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4 Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Indicações */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Indicações
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">
              {totalIndicacoesSum.toLocaleString('pt-BR')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {topIndicador
                ? `Líder: ${topIndicador.user.name || topIndicador.user.email} (${topIndicador.totalIndicacoes})`
                : 'Apoiadores cadastrados'}
            </p>
          </CardContent>
        </Card>

        {/* Stat 2: Total Check-ins */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Check-ins
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">{totalCheckinsSum}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {topCheckin
                ? `Líder: ${topCheckin.user.name || topCheckin.user.email} (${topCheckin.totalCheckins})`
                : 'Ações de rua registradas'}
            </p>
          </CardContent>
        </Card>

        {/* Stat 3: Mobilizadores Ativos */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Membros Competindo
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{users.length}</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              100% integrados no ranking
            </p>
          </CardContent>
        </Card>

        {/* Stat 4: Selos Conquistados */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Badges Ativas
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Award className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-600">5 Categorias</div>
            <p className="text-[11px] text-slate-500 mt-1">Conquistas automáticas por mérito</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges Explanation Banner */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 via-white to-slate-50 overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Selos & Conquistas de Campo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Critérios para desbloqueio de badges no perfil dos membros da equipe
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-white text-slate-700">
            Regras Automáticas
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.values(BADGE_DEFINITIONS).map((badge) => (
              <div
                key={badge.id}
                className={`p-3 rounded-xl border flex flex-col justify-between ${badge.color} ${badge.borderColor}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{badge.icon}</span>
                    <span className="font-black text-xs">{badge.title}</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-tight mb-2">{badge.description}</p>
                </div>
                <div className="pt-1 border-t border-current/20 text-[10px] font-bold uppercase tracking-wider">
                  Meta: {badge.requirement}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Top Indicadores vs Top Check-ins */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'indicacoes' | 'checkins')}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-11 border border-slate-200">
            <TabsTrigger
              value="indicacoes"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-extrabold text-xs font-semibold px-4 h-9 rounded-lg flex items-center gap-2"
            >
              <Flame className="w-4 h-4" /> Top Indicadores ({filteredIndicacoes.length})
            </TabsTrigger>
            <TabsTrigger
              value="checkins"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-extrabold text-xs font-semibold px-4 h-9 rounded-lg flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" /> Top Check-ins ({filteredCheckins.length})
            </TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por nome do membro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Tab 1: Top Indicadores */}
        <TabsContent value="indicacoes" className="space-y-6 mt-0">
          {/* Podium Visual for Top 3 */}
          <Card className="border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-amber-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" /> Pódio de Indicadores
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Os 3 maiores conversores de apoiadores da campanha
                </CardDescription>
              </div>
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                Ouro • Prata • Bronze
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <GamificationPodium topThree={byIndicacoes.slice(0, 3)} type="indicacoes" />
            </CardContent>
          </Card>

          {/* Full List of Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" /> Todos os Integrantes no Ranking de
                Indicações
              </h3>
              <span className="text-xs text-slate-500">
                Mostrando {filteredIndicacoes.length} membros
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {filteredIndicacoes.map((item, idx) => (
                <MemberRankingCard
                  key={item.user.id}
                  stats={item}
                  rank={item.indicacoesRank}
                  category="indicacoes"
                  onClick={() => setSelectedMember(item)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Top Check-ins */}
        <TabsContent value="checkins" className="space-y-6 mt-0">
          {/* Podium Visual for Top 3 */}
          <Card className="border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-blue-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500 fill-blue-400" /> Pódio de Atividades de
                  Campo
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Os 3 membros com maior presença e check-ins no mapa
                </CardDescription>
              </div>
              <Badge className="bg-blue-600 text-white font-black text-xs uppercase">
                Ouro • Prata • Bronze
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <GamificationPodium topThree={byCheckins.slice(0, 3)} type="checkins" />
            </CardContent>
          </Card>

          {/* Full List of Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Todos os Integrantes no Ranking de
                Check-ins
              </h3>
              <span className="text-xs text-slate-500">
                Mostrando {filteredCheckins.length} membros
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {filteredCheckins.map((item, idx) => (
                <MemberRankingCard
                  key={item.user.id}
                  stats={item}
                  rank={item.checkinsRank}
                  category="checkins"
                  onClick={() => setSelectedMember(item)}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Details Dialog modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900 p-6">
          {selectedMember && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    {selectedMember.user.avatar ? (
                      <img
                        src={pb.files.getURL(selectedMember.user, selectedMember.user.avatar)}
                        alt={selectedMember.user.name}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : selectedMember.user.name ? (
                      selectedMember.user.name.charAt(0).toUpperCase()
                    ) : (
                      'M'
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-slate-900">
                      {selectedMember.user.name || selectedMember.user.email}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {selectedMember.user.email} •{' '}
                      {selectedMember.user.role === 'admin'
                        ? 'Coordenação Geral'
                        : selectedMember.user.role === 'coordinator'
                          ? 'Coordenação Zonal'
                          : 'Militante de Campo'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Badges won */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" /> Selos Conquistados (
                  {selectedMember.badges.length})
                </h4>
                {selectedMember.badges.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Nenhum selo desbloqueado neste período ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMember.badges.map((b) => (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${b.color} ${b.borderColor}`}
                      >
                        <span className="text-2xl">{b.icon}</span>
                        <div>
                          <div className="font-extrabold text-xs">{b.title}</div>
                          <div className="text-[10px] opacity-80">{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Indicações</div>
                  <div className="text-lg font-black text-amber-600">
                    {selectedMember.totalIndicacoes}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedMember.indicacoesRank}º no ranking
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Check-ins</div>
                  <div className="text-lg font-black text-blue-600">
                    {selectedMember.totalCheckins}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedMember.checkinsRank}º no ranking
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Distância</div>
                  <div className="text-lg font-black text-emerald-600">
                    {selectedMember.totalKm} km
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedMember.activeDaysCount} dias ativos
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
