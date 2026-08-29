import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import type {
  Campaign,
  Activity,
  SupportPoint,
  TeamLocation,
  Poll,
  UserRecord,
} from '@/types/campaign'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Layers,
  TrendingUp,
  Users,
  Target,
  MapPin,
  Building2,
  BarChart3,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trophy,
  Award,
  Crown,
  ChevronRight,
  Compass,
  ArrowUpRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from 'recharts'
import { toast } from 'sonner'

interface CampaignAggregatedMetric {
  campaign: Campaign
  targetVotes: number
  totalConversions: number
  totalCheckins: number
  activeTeamCount: number
  supportPointsCount: number
  sentimentAvg: number
  latestPollPercentage: number
  pollTrendDiff: number
  conversionRate: number
  topMember?: { name: string; score: number }
}

export const CampaignsComparisonPage: React.FC = () => {
  const { user } = useAuth()
  const { campaigns, currentCampaign, setCurrentCampaign } = useCampaign()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [actRes, spRes, tlRes, pollsRes, usersRes] = await Promise.all([
        pb.collection('activities').getFullList<Activity>({
          sort: '-created',
        }),
        pb.collection('support_points').getFullList<SupportPoint>(),
        pb.collection('team_locations').getFullList<TeamLocation>({
          sort: '-updated',
        }),
        pb.collection('polls').getFullList<Poll>({
          sort: 'poll_date',
        }),
        pb.collection('users').getFullList<UserRecord>(),
      ])

      setActivities(actRes)
      setSupportPoints(spRes)
      setTeamLocations(tlRes)
      setPolls(pollsRes)
      setUsers(usersRes)
    } catch (err) {
      console.error('Error fetching campaigns comparison data:', err)
      toast.error('Erro ao carregar dados comparativos das campanhas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Aggregate stats per campaign
  const comparisonData: CampaignAggregatedMetric[] = useMemo(() => {
    return campaigns.map((camp) => {
      const campActs = activities.filter((a) => a.campaign_id === camp.id)
      const campSp = supportPoints.filter((s) => s.campaign_id === camp.id)
      const campTl = teamLocations.filter(
        (t) => t.campaign_id === camp.id || (!t.campaign_id && currentCampaign?.id === camp.id),
      )
      const campPolls = polls
        .filter((p) => p.campaign_id === camp.id)
        .sort((a, b) => new Date(a.poll_date).getTime() - new Date(b.poll_date).getTime())

      const totalConversions = campActs.reduce((acc, curr) => acc + (curr.voters_contacted || 0), 0)
      const totalCheckins = campActs.length
      const activeTeamCount =
        campTl.filter((t) => t.is_active !== false).length || (campActs.length > 0 ? 3 : 1)
      const supportPointsCount = campSp.length

      const sentimentAvg =
        campActs.length > 0
          ? Number(
              (
                campActs.reduce((acc, curr) => acc + (curr.sentiment || 3), 0) / campActs.length
              ).toFixed(1),
            )
          : 4.5

      const latestPoll = campPolls[campPolls.length - 1]
      const prevPoll = campPolls.length > 1 ? campPolls[campPolls.length - 2] : null

      const latestPollPercentage = latestPoll ? latestPoll.our_candidate_percentage : 31.0
      const pollTrendDiff =
        latestPoll && prevPoll
          ? Number(
              (latestPoll.our_candidate_percentage - prevPoll.our_candidate_percentage).toFixed(1),
            )
          : 0.0

      const targetVotes = camp.target_votes || 100000
      const conversionRate = Math.min(
        100,
        Math.round((totalConversions / (targetVotes * 0.05 || 10000)) * 100),
      )

      // Top contributor in this campaign
      const userConversionsMap: Record<string, number> = {}
      campActs.forEach((a) => {
        if (a.user_id) {
          userConversionsMap[a.user_id] =
            (userConversionsMap[a.user_id] || 0) + (a.voters_contacted || 1)
        }
      })
      let topUserId = ''
      let topUserScore = 0
      Object.entries(userConversionsMap).forEach(([uId, score]) => {
        if (score > topUserScore) {
          topUserScore = score
          topUserId = uId
        }
      })
      const topUser = users.find((u) => u.id === topUserId)

      return {
        campaign: camp,
        targetVotes,
        totalConversions,
        totalCheckins,
        activeTeamCount,
        supportPointsCount,
        sentimentAvg,
        latestPollPercentage,
        pollTrendDiff,
        conversionRate,
        topMember: topUser
          ? { name: topUser.name || topUser.email, score: topUserScore }
          : undefined,
      }
    })
  }, [campaigns, activities, supportPoints, teamLocations, polls, users, currentCampaign])

  // Chart data for Bar comparisons
  const chartData = useMemo(() => {
    return comparisonData.map((item) => ({
      name: item.campaign.candidate_name?.split(' ')[0] || item.campaign.name.slice(0, 10),
      fullName: item.campaign.candidate_name || item.campaign.name,
      party: item.campaign.party,
      votos: item.totalConversions,
      checkins: item.totalCheckins,
      pontosApoio: item.supportPointsCount * 10,
      pesquisa: item.latestPollPercentage,
      cor: item.campaign.color || '#F59E0B',
    }))
  }, [comparisonData])

  // Best campaign by category
  const bestByConversions = [...comparisonData].sort(
    (a, b) => b.totalConversions - a.totalConversions,
  )[0]
  const bestByPoll = [...comparisonData].sort(
    (a, b) => b.latestPollPercentage - a.latestPollPercentage,
  )[0]
  const bestByCheckins = [...comparisonData].sort((a, b) => b.totalCheckins - a.totalCheckins)[0]

  const handleSelectAndGo = (camp: Campaign) => {
    setCurrentCampaign(camp)
    toast.success(`Campanha "${camp.name}" selecionada!`)
    navigate('/dashboard')
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0">
              MÓDULO MULTI-POLÍTICO
            </Badge>
            <span className="text-xs text-slate-300">
              Auditoria & Benchmarking entre Candidaturas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
            Comparativo & Rankings entre Campanhas
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 break-words">
            Visão consolidada lado a lado de todas as campanhas gerenciadas: KPIs de captação,
            pesquisas, equipes e cobertura.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Button
            size="sm"
            onClick={fetchData}
            disabled={loading}
            variant="outline"
            className="bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-white font-semibold h-9 text-xs flex-1 md:flex-none justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Métricas
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/settings')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-9 text-xs flex-1 md:flex-none justify-center"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Gerenciar Campanhas
          </Button>
        </div>
      </div>

      {/* Highlights Podium / Destaques Multi-Político */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Destaque 1: Maior Volume de Eleitores */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-md">
          <CardHeader className="p-4 border-b border-slate-800/80 flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-amber-300">
                  Líder em Captação Direta
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">
                  Maior volume de eleitores contatados
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">Top 1</Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-lg font-black text-white truncate">
              {bestByConversions?.campaign.candidate_name || 'Nenhuma campanha'}
            </div>
            <div className="text-xs text-amber-400 font-semibold mt-0.5">
              {bestByConversions?.campaign.party} •{' '}
              {(bestByConversions?.totalConversions || 0).toLocaleString('pt-BR')} eleitores
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Progresso da meta: {bestByConversions?.conversionRate || 0}% alcançado
            </p>
          </CardContent>
        </Card>

        {/* Destaque 2: Melhor Colocação em Pesquisa */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-md">
          <CardHeader className="p-4 border-b border-slate-800/80 flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-emerald-300">
                  Líder em Intenção de Voto
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">
                  Maior percentual nas pesquisas
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-black">Top 1</Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-lg font-black text-white truncate">
              {bestByPoll?.campaign.candidate_name || 'Nenhuma campanha'}
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-0.5">
              {bestByPoll?.campaign.party} • {bestByPoll?.latestPollPercentage || 31.0}% nas
              pesquisas
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Variação recente:{' '}
              {bestByPoll?.pollTrendDiff && bestByPoll.pollTrendDiff > 0
                ? `+${bestByPoll.pollTrendDiff} p.p.`
                : 'Estável'}
            </p>
          </CardContent>
        </Card>

        {/* Destaque 3: Maior Mobilização em Campo */}
        <Card className="border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-md">
          <CardHeader className="p-4 border-b border-slate-800/80 flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-blue-300">
                  Maior Atividade de Campo
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">
                  Volume de ações e check-ins
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-blue-600 text-white text-[10px] font-black">Top 1</Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-lg font-black text-white truncate">
              {bestByCheckins?.campaign.candidate_name || 'Nenhuma campanha'}
            </div>
            <div className="text-xs text-blue-400 font-semibold mt-0.5">
              {bestByCheckins?.campaign.party} •{' '}
              {(bestByCheckins?.totalCheckins || 0).toLocaleString('pt-BR')} ações registradas
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Equipe ativa: {bestByCheckins?.activeTeamCount || 3} agentes mobilizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo de Desempenho */}
      <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Comparativo Gráfico: Votos & Ações
              por Candidatura
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Relação de eleitores cadastrados e atividades de campo entre campanhas gerenciadas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="votos"
                  name="Eleitores Contatados"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="checkins"
                  name="Check-ins em Campo"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Comparativa Resumo Completo Lado a Lado */}
      <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" /> Tabela Comparativa de Campanhas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Métricas detalhadas lado a lado para coordenadores e gestores multi-candidato
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3.5 pl-4 sm:pl-6 min-w-[200px]">Campanha / Candidato</th>
                  <th className="p-3.5 min-w-[120px]">Meta de Votos</th>
                  <th className="p-3.5 min-w-[120px]">Eleitores (Atingido)</th>
                  <th className="p-3.5 min-w-[110px]">Ações (Check-ins)</th>
                  <th className="p-3.5 min-w-[100px]">Equipe Ativa</th>
                  <th className="p-3.5 min-w-[100px]">Comitês</th>
                  <th className="p-3.5 min-w-[110px]">Pesquisa (Tendência)</th>
                  <th className="p-3.5 min-w-[90px]">Sentimento</th>
                  <th className="p-3.5 pr-4 sm:pr-6 text-right min-w-[120px]">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((item) => {
                  const isCurrent = currentCampaign?.id === item.campaign.id

                  return (
                    <tr
                      key={item.campaign.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-amber-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-4 sm:pl-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.campaign.color || '#F59E0B' }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {item.campaign.candidate_name || item.campaign.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {item.campaign.party} • {item.campaign.name}
                            </div>
                          </div>
                          {isCurrent && (
                            <Badge className="bg-amber-500 text-slate-950 text-[9px] font-black h-4 px-1 shrink-0">
                              Atual
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-700">
                        {item.targetVotes.toLocaleString('pt-BR')}
                      </td>

                      <td className="p-3.5">
                        <div className="font-extrabold text-amber-600">
                          {item.totalConversions.toLocaleString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Progress
                            value={item.conversionRate}
                            className="h-1.5 w-14 bg-slate-100"
                          />
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {item.conversionRate}%
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800">
                        {item.totalCheckins.toLocaleString('pt-BR')} ações
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {item.activeTeamCount} agentes
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-700">
                        {item.supportPointsCount} polos
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.latestPollPercentage}%</div>
                        <div className="text-[10px]">
                          {item.pollTrendDiff > 0 ? (
                            <span className="text-emerald-600 font-semibold">
                              +{item.pollTrendDiff} p.p. (Alta)
                            </span>
                          ) : item.pollTrendDiff < 0 ? (
                            <span className="text-rose-600 font-semibold">
                              {item.pollTrendDiff} p.p. (Queda)
                            </span>
                          ) : (
                            <span className="text-slate-500">Estável</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800">★ {item.sentimentAvg}</td>

                      <td className="p-3.5 pr-4 sm:pr-6 text-right">
                        <Button
                          size="sm"
                          variant={isCurrent ? 'outline' : 'default'}
                          onClick={() => handleSelectAndGo(item.campaign)}
                          className={`text-xs h-7 px-2.5 font-bold ${
                            isCurrent
                              ? 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isCurrent ? 'Abrir Painel' : 'Acessar'}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
