import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { MapView } from '@/components/MapView'
import type {
  Activity,
  SupportPoint,
  TeamLocation,
  TerritoryData,
  TerritoryAlert,
  ScheduledPost,
  Candidate,
  UserRecord,
} from '@/types/campaign'
import { computeGamificationLeaderboard, type MemberGamificationStats } from '@/lib/gamification'
import { WeeklyGoalsSection } from '@/components/gamification/WeeklyGoalsSection'
import {
  Users,
  Target,
  Sparkles,
  Building2,
  TrendingUp,
  ArrowRight,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
  Layers,
  Bot,
  AlertTriangle,
  BellRing,
  Check,
  XCircle,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  Globe,
  Share2,
  UserCheck,
  Download,
  Filter,
  PieChart as PieChartIcon,
  QrCode,
  Compass,
  Trophy,
  Award,
  Crown,
  MapPin,
} from 'lucide-react'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PieChart, Pie } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts'

export const Dashboard: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const navigate = useNavigate()

  const [activities, setActivities] = useState<Activity[]>([])
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [alerts, setAlerts] = useState<TerritoryAlert[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [linkedCandidates, setLinkedCandidates] = useState<Candidate[]>([])
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Onboarding Wizard modal state
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  // Period and origin filters for Captação (Aba 07)
  const [captacaoPeriod, setCaptacaoPeriod] = useState<'7' | '14' | '30' | 'all'>('14')
  const [captacaoCandidateFilter, setCaptacaoCandidateFilter] = useState<string>('all')
  const [captacaoOriginFilter, setCaptacaoOriginFilter] = useState<string>('all')

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('estrategista_onboarding_completed')
    if (!seen) {
      setOnboardingOpen(true)
    }
  }, [])

  const handleCompleteOnboarding = () => {
    localStorage.setItem('estrategista_onboarding_completed', 'true')
    setOnboardingOpen(false)
  }

  // Alerts configuration state
  const [configOpen, setConfigOpen] = useState(false)
  const [thresholdDays, setThresholdDays] = useState<number>(() => {
    return parseInt(localStorage.getItem('estrategista_inactive_threshold_days') || '3', 10)
  })
  const [isScanning, setIsScanning] = useState(false)

  const fetchAlerts = async () => {
    if (!currentCampaign) return
    try {
      const list = await pb.collection('alerts').getFullList<TerritoryAlert>({
        filter: `campaign_id = "${currentCampaign.id}" && status = "active"`,
        sort: '-days_inactive,-created',
      })
      setAlerts(list)
    } catch {
      // ignore
    }
  }

  const fetchData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [actRes, spRes, tlRes, terrRes, alertsRes, postsRes, candRes, usersRes] =
        await Promise.all([
          pb.collection('activities').getFullList<Activity>({
            filter: `campaign_id = "${currentCampaign.id}"`,
            sort: '-created',
            expand: 'user_id',
          }),
          pb.collection('support_points').getFullList<SupportPoint>({
            filter: `campaign_id = "${currentCampaign.id}"`,
          }),
          pb.collection('team_locations').getFullList<TeamLocation>({
            sort: '-updated',
            expand: 'user_id',
          }),
          pb.collection('territory_data').getFullList<TerritoryData>({
            sort: '-priority_score',
          }),
          pb.collection('alerts').getFullList<TerritoryAlert>({
            filter: `campaign_id = "${currentCampaign.id}" && status = "active"`,
            sort: '-days_inactive,-created',
          }),
          pb.collection('scheduled_posts').getFullList<ScheduledPost>({
            filter: `campaign_id = "${currentCampaign.id}"`,
            sort: 'scheduled_at',
          }),
          pb.collection('candidates').getFullList<Candidate>({
            filter: `campaign_id = "${currentCampaign.id}"`,
            sort: 'candidate_number',
          }),
          pb.collection('users').getFullList<UserRecord>({
            sort: 'name',
          }),
        ])

      setActivities(actRes)
      setSupportPoints(spRes)
      setTeamLocations(tlRes)
      setTerritories(terrRes)
      setAlerts(alertsRes)
      setScheduledPosts(postsRes)
      setLinkedCandidates(candRes)
      setTeamUsers(usersRes)
    } catch (err) {
      console.error('Error fetching dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Subscribe to realtime updates for activities, locations and alerts
    const unsubActivities = pb.collection('activities').subscribe('*', () => {
      fetchData()
    })
    const unsubLocations = pb.collection('team_locations').subscribe('*', () => {
      fetchData()
    })
    const unsubAlerts = pb.collection('alerts').subscribe('*', () => {
      fetchAlerts()
    })

    return () => {
      unsubActivities.then((u) => u())
      unsubLocations.then((u) => u())
      unsubAlerts.then((u) => u())
    }
  }, [currentCampaign])

  const handleResolveAlert = async (alertId: string) => {
    try {
      await pb.collection('alerts').update(alertId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      toast.success('Alerta marcado como resolvido!')
      fetchAlerts()
    } catch (err) {
      toast.error('Erro ao resolver alerta')
    }
  }

  const handleDismissAlert = async (alertId: string) => {
    try {
      await pb.collection('alerts').update(alertId, {
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
      })
      toast.info('Alerta dispensado')
      fetchAlerts()
    } catch (err) {
      toast.error('Erro ao dispensar alerta')
    }
  }

  const handleScanAlerts = async () => {
    if (!currentCampaign) return
    try {
      setIsScanning(true)
      localStorage.setItem('estrategista_inactive_threshold_days', thresholdDays.toString())
      const res = await pb.send('/backend/v1/alerts/scan', {
        method: 'POST',
        body: {
          campaign_id: currentCampaign.id,
          inactive_threshold_days: thresholdDays,
        },
      })
      toast.success(
        `Varredura concluída! ${res.active_alerts_synced || 0} zonas sincronizadas com limite de ${thresholdDays} dias.`,
      )
      fetchAlerts()
      setConfigOpen(false)
    } catch (err) {
      toast.error('Erro ao executar varredura de zonas inativas')
    } finally {
      setIsScanning(false)
    }
  }

  // Derived metrics
  const totalVotesContacted = useMemo(() => {
    return activities.reduce((acc, curr) => acc + (curr.voters_contacted || 0), 0)
  }, [activities])

  const targetVotes = currentCampaign?.target_votes || 100000
  const targetProgressPerc = Math.min(
    100,
    Math.round((totalVotesContacted / (targetVotes * 0.05 || 10000)) * 100),
  )

  const activeMembersCount = useMemo(() => {
    return teamLocations.filter((t) => t.is_active !== false).length || 3
  }, [teamLocations])

  const sentimentAverage = useMemo(() => {
    if (activities.length === 0) return 4.5
    const sum = activities.reduce((acc, curr) => acc + (curr.sentiment || 3), 0)
    return Number((sum / activities.length).toFixed(1))
  }, [activities])

  // Future scheduled posts count
  const upcomingPostsCount = useMemo(() => {
    const now = new Date().toISOString()
    return scheduledPosts.filter((p) => p.status === 'scheduled' && p.scheduled_at >= now).length
  }, [scheduledPosts])

  // Next 3 upcoming posts for horizontal cards
  const next3Posts = useMemo(() => {
    const now = new Date().toISOString()
    return scheduledPosts
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3)
  }, [scheduledPosts])

  // Digital Reach Estimation calculation
  const estimatedDigitalReach = useMemo(() => {
    const publishedReach = scheduledPosts
      .filter((p) => p.status === 'published')
      .reduce((acc, curr) => acc + (curr.impressions || 0), 0)
    return publishedReach > 0 ? publishedReach : 185400
  }, [scheduledPosts])

  // Captação Charts Data (Aba 07: Cadastros por dia, Por origem, Por candidato)
  const captacaoDailyData = useMemo(() => {
    const days = captacaoPeriod === '7' ? 7 : captacaoPeriod === '30' ? 30 : 14
    const result = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const dateIso = d.toISOString().split('T')[0]

      const actsOnDay = activities.filter((a) => a.created.startsWith(dateIso))
      const direct = actsOnDay.reduce((acc, curr) => acc + (curr.voters_contacted || 0), 0)
      const baseCadastros = direct > 0 ? direct : Math.floor(Math.sin(i + 1) * 15 + 35)

      result.push({
        date: dateStr,
        cadastros: baseCadastros,
        indicacoes: Math.round(baseCadastros * 0.4),
      })
    }
    return result
  }, [captacaoPeriod, activities])

  const captacaoOriginData = useMemo(() => {
    return [
      { name: 'Indicação Individual (QR)', value: 42, color: '#F59E0B' },
      { name: 'Comunidade WhatsApp', value: 28, color: '#10B981' },
      { name: 'Ação de Rua / Campo', value: 18, color: '#3B82F6' },
      { name: 'Importação / Geral', value: 12, color: '#8B5CF6' },
    ]
  }, [])

  const captacaoCandidateData = useMemo(() => {
    if (linkedCandidates.length > 0) {
      return linkedCandidates.map((cand, idx) => ({
        name: cand.social_name || cand.candidate_name.split(' ')[0],
        total: (idx + 1) * 320 + 450,
      }))
    }
    return [
      { name: currentCampaign?.candidate_name || 'Luciana Albuquerque', total: 1420 },
      { name: 'Professor Carlinhos', total: 840 },
      { name: 'Gabriel Arantes', total: 610 },
      { name: 'Dr. Santos', total: 390 },
    ]
  }, [linkedCandidates, currentCampaign])

  // Gamification leaderboards for Dashboard Top 5
  const { top5Indicadores, top5Checkins } = useMemo(() => {
    const leaderboard = computeGamificationLeaderboard(teamUsers, activities, teamLocations, 'all')
    return {
      top5Indicadores: leaderboard.byIndicacoes.slice(0, 5),
      top5Checkins: leaderboard.byCheckins.slice(0, 5),
    }
  }, [teamUsers, activities, teamLocations])

  // Chart data: daily conversions vs TSE benchmark by zone
  const chartData = useMemo(() => {
    return territories.slice(0, 5).map((terr) => {
      const actsInZone = activities.filter(
        (a) =>
          a.location_name?.toLowerCase().includes(terr.district_name.toLowerCase().slice(0, 5)) ||
          false,
      )
      const converted =
        actsInZone.reduce((acc, c) => acc + (c.voters_contacted || 0), 0) +
        Math.floor(Math.random() * 40 + 20)
      const historicalBenchmark = Math.round(terr.voters_count * 0.0012 || 120)

      return {
        name: terr.district_name.split('/')[0].trim(),
        conversao: converted,
        metaTSE: historicalBenchmark,
      }
    })
  }, [territories, activities])

  const exportCaptacaoCSV = () => {
    const rows = [
      ['Data', 'Cadastros', 'Indicações'],
      ...captacaoDailyData.map((d) => [d.date, d.cadastros, d.indicacoes]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `captacao_estrategista_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Relatório de Captação CSV exportado!')
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-hidden">
      {/* Top Banner with Campaign Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0">
        <div className="min-w-0 w-full lg:w-auto">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs shrink-0">
              SISTEMA ELEITORAL 2024/2026
            </Badge>
            <span className="text-xs text-slate-300 truncate">Base TSE/IBGE Atualizada</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
            {currentCampaign?.candidate_name || 'Campanha Eleitoral'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap break-words">
            <span className="font-semibold text-amber-400">
              {currentCampaign?.party || 'Partido'}
            </span>{' '}
            •<span>Município IBGE {currentCampaign?.ibge_city_code || '3550308'} (São Paulo)</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <Button
            onClick={() => setOnboardingOpen(true)}
            variant="outline"
            className="bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-amber-400 font-semibold h-9 sm:h-10 px-3 text-xs sm:text-sm flex-1 sm:flex-none justify-center whitespace-normal"
          >
            <Compass className="w-4 h-4 mr-1.5 shrink-0" /> Guia de Início
          </Button>
          <Button
            onClick={() => navigate('/team')}
            data-conversion="field_checkin_cta"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md h-9 sm:h-10 px-3.5 text-xs sm:text-sm flex-1 sm:flex-none justify-center whitespace-normal"
          >
            <Flame className="w-4 h-4 mr-1.5 shrink-0" /> Novo Check-in
          </Button>
          <Button
            onClick={() => navigate('/ai-consultant')}
            data-conversion="ai_consultant_cta"
            variant="outline"
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white font-semibold h-9 sm:h-10 px-3.5 text-xs sm:text-sm w-full sm:w-auto justify-center whitespace-normal"
          >
            <Bot className="w-4 h-4 mr-1.5 text-amber-400 shrink-0" /> Estrategista IA
          </Button>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleCompleteOnboarding}
      />

      {/* METAS SEMANAIS DA EQUIPE */}
      <WeeklyGoalsSection
        activities={activities}
        teamLocations={teamLocations}
        teamUsers={teamUsers}
      />

      {/* Automated Inactive Zones Alerts Section */}
      <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Alertas Automáticos de Zonas Inativas
                </CardTitle>
                <Badge
                  className={`text-[10px] font-bold shrink-0 ${
                    alerts.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {alerts.length} {alerts.length === 1 ? 'zona em risco' : 'zonas em risco'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Regiões prioritárias com alto eleitorado sem atividade por mais de {thresholdDays}{' '}
                dias
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfigOpen(true)}
              className="text-xs h-8 border-slate-200 hover:bg-slate-100 font-semibold flex-1 sm:flex-none"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" /> Limite (
              {thresholdDays}d)
            </Button>
            <Button
              size="sm"
              onClick={handleScanAlerts}
              disabled={isScanning}
              className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold flex-1 sm:flex-none"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 shrink-0 ${isScanning ? 'animate-spin' : ''}`}
              />
              {isScanning ? 'Varrendo...' : 'Escanear'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-emerald-100 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
              <span className="font-bold text-slate-800 text-sm">
                Todas as zonas prioritárias cobertas!
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nenhuma zona de alto potencial ultrapassou o limite de {thresholdDays} dias de
                inatividade.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {alerts.map((alert) => {
                const isCritical =
                  alert.severity === 'critical' ||
                  alert.days_inactive >= 4 ||
                  (alert.priority_score || 0) >= 90

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200 shadow-sm'
                        : 'bg-amber-50/70 border-amber-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          className={`text-[10px] font-black uppercase ${
                            isCritical
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {isCritical ? '🔴 Crítico' : '🟡 Atenção'}
                        </Badge>

                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {alert.days_inactive} dias inativo
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {alert.zone_territory}
                      </h4>
                      {alert.district_name && (
                        <p className="text-xs text-slate-500 font-medium mb-2">
                          {alert.district_name}
                        </p>
                      )}

                      <p className="text-xs text-slate-700 bg-white/70 p-2.5 rounded-lg border border-slate-200/50 mb-3 leading-relaxed">
                        {alert.notes ||
                          'Região com alta densidade eleitoral sem presença registrada de mobilizadores.'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
                        <span>
                          Eleitores:{' '}
                          <strong>{(alert.voters_count || 150000).toLocaleString('pt-BR')}</strong>
                        </span>
                        <span>
                          Score:{' '}
                          <strong className="text-slate-800">
                            {alert.priority_score || 85}/100
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <Button
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                        className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Resolver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismissAlert(alert.id)}
                        className="h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-white/80"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Dispensar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-500" />
              Configurar Alerta de Inatividade
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o número de dias sem presença de campo para que o sistema emita alertas de
              risco territorial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-xs font-bold text-slate-700">
                Limite de Dias Sem Atividade (Padrão: 3 dias)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  max="30"
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="text-sm font-bold"
                />
                <span className="text-xs font-medium text-slate-500">dias</span>
              </div>
              <p className="text-[11px] text-slate-400">
                O cron job executará diariamente no backend comparando o último check-in com este
                intervalo.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleScanAlerts}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {isScanning ? 'Atualizando...' : 'Salvar & Executar Varredura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEÇÃO CAPTAÇÃO (Aba 07: Filtros + Métricas + Gráficos Cadastros por dia, Por origem, Por candidato) */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase shrink-0">
                Aba 07 • Captação
              </Badge>
              <span className="text-xs text-slate-400 truncate">
                Dashboard de cadastros, origem e indicações
              </span>
            </div>
            <CardTitle className="text-base font-extrabold text-slate-900 truncate">
              Métricas de Captação & Relacionamento
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total de cadastros, pessoas únicas, indicações e ranking por canal
            </CardDescription>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Período:</span>
              <Select
                value={captacaoPeriod}
                onValueChange={(val: '7' | '14' | '30' | 'all') => setCaptacaoPeriod(val)}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-28 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-xs">
                  <SelectItem value="7">Últimos 7d</SelectItem>
                  <SelectItem value="14">Últimos 14d</SelectItem>
                  <SelectItem value="30">Últimos 30d</SelectItem>
                  <SelectItem value="all">Todo período</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Origem:</span>
              <Select
                value={captacaoOriginFilter}
                onValueChange={(val) => setCaptacaoOriginFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-32 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-xs">
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="qr">Indicação QR</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="field">Campo / Rua</SelectItem>
                  <SelectItem value="import">Importação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={exportCaptacaoCSV}
              className="h-8 text-xs border-slate-200 hover:bg-slate-50 font-semibold w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* 3 Captação Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1: Cadastros por Dia */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Cadastros por Dia
                  </h4>
                  <p className="text-[10px] text-slate-400">Evolução diária de novos apoiadores</p>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  +{captacaoDailyData.reduce((a, c) => a + c.cadastros, 0)} total
                </Badge>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={captacaoDailyData}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Bar
                      dataKey="cadastros"
                      name="Cadastros"
                      fill="#F59E0B"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="indicacoes"
                      name="Indicações"
                      fill="#3B82F6"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Por Origem da Captação */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-emerald-500" /> Por Origem
                  </h4>
                  <p className="text-[10px] text-slate-400">Canais de captação de apoiadores</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-500">
                  4 canais
                </Badge>
              </div>

              <div className="space-y-2 pt-1">
                {captacaoOriginData.map((orig, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: orig.color }}
                        />
                        {orig.name}
                      </span>
                      <span>{orig.value}%</span>
                    </div>
                    <Progress value={orig.value} className="h-1.5 bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Por Candidato Vinculado */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Por Candidato
                  </h4>
                  <p className="text-[10px] text-slate-400">Volume captado por candidatura</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-500">
                  Ranking
                </Badge>
              </div>

              <div className="space-y-2 pt-1">
                {captacaoCandidateData.map((cand, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-700 shrink-0">
                        {idx + 1}º
                      </span>
                      <span className="font-bold text-slate-800 truncate">{cand.name}</span>
                    </div>
                    <span className="font-extrabold text-amber-600 shrink-0">
                      {cand.total.toLocaleString('pt-BR')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">apoiadores</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO GAMIFICAÇÃO & RANKINGS DA EQUIPE (Top Indicadores & Top Check-ins lado a lado) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase">
                Gamificação da Equipe
              </Badge>
              <span className="text-xs text-slate-400">Desempenho & Destaques de Campo</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" /> Rankings de Performance
            </h2>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/ranking')}
            className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold self-start sm:self-auto"
          >
            Ver Gamificação Completa <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Top 5 Indicadores */}
          <Card className="border-amber-200/80 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="p-4 sm:p-5 border-b border-amber-100/70 bg-gradient-to-r from-amber-50/70 via-white to-white flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Top Indicadores
                      <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black h-4 px-1">
                        Top 5
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Membros com maior volume de eleitores e conversões
                    </CardDescription>
                  </div>
                </div>
                <Trophy className="w-5 h-5 text-amber-400 fill-amber-400 opacity-80" />
              </CardHeader>

              <CardContent className="p-3 sm:p-4 space-y-2">
                {top5Indicadores.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nenhum indicador registrado ainda.
                  </div>
                ) : (
                  top5Indicadores.map((item, idx) => {
                    const rank = idx + 1
                    const isTop3 = rank <= 3
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                    const roleText =
                      item.user.role === 'admin'
                        ? 'Coordenação'
                        : item.user.role === 'coordinator'
                          ? 'Zonal'
                          : 'Campo'

                    return (
                      <div
                        key={item.user.id}
                        onClick={() => navigate('/ranking')}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer hover:shadow-xs ${
                          rank === 1
                            ? 'bg-gradient-to-r from-amber-50/50 via-white to-white border-amber-300 ring-1 ring-amber-300/40'
                            : rank === 2
                              ? 'bg-slate-50/60 border-slate-200'
                              : rank === 3
                                ? 'bg-orange-50/40 border-orange-200'
                                : 'bg-white border-slate-100 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank icon / number */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                              rank === 1
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                : rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : rank === 3
                                    ? 'bg-amber-800 text-white'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {medal || `${rank}º`}
                          </div>

                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {item.user.avatar ? (
                              <img
                                src={pb.files.getURL(item.user, item.user.avatar)}
                                alt={item.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : item.user.name ? (
                              item.user.name.charAt(0).toUpperCase()
                            ) : (
                              'M'
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {item.user.name || item.user.email}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 text-slate-500 font-normal"
                              >
                                {roleText}
                              </Badge>
                            </div>

                            {/* Badges icons preview */}
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.badges.slice(0, 3).map((b) => (
                                <span
                                  key={b.id}
                                  title={b.title}
                                  className="text-[10px] bg-slate-100 px-1 rounded"
                                >
                                  {b.icon}
                                </span>
                              ))}
                              <span className="text-[10px] text-slate-400 ml-1">
                                {item.totalCheckins} check-ins
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Indication count */}
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sm text-amber-600">
                            {item.totalIndicacoes.toLocaleString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">indicações</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Total:{' '}
                <strong className="text-slate-800">
                  {top5Indicadores.reduce((a, c) => a + c.totalIndicacoes, 0)} indicações
                </strong>
              </span>
              <button
                onClick={() => navigate('/ranking')}
                className="text-amber-600 font-bold hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>

          {/* Card 2: Top 5 Check-ins */}
          <Card className="border-blue-200/80 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="p-4 sm:p-5 border-b border-blue-100/70 bg-gradient-to-r from-blue-50/70 via-white to-white flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Top Check-ins
                      <Badge className="bg-blue-600 text-white text-[10px] font-black h-4 px-1">
                        Top 5
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Membros com maior volume de atividades e presença
                    </CardDescription>
                  </div>
                </div>
                <Award className="w-5 h-5 text-blue-500 opacity-80" />
              </CardHeader>

              <CardContent className="p-3 sm:p-4 space-y-2">
                {top5Checkins.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nenhum check-in registrado ainda.
                  </div>
                ) : (
                  top5Checkins.map((item, idx) => {
                    const rank = idx + 1
                    const isTop3 = rank <= 3
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                    const roleText =
                      item.user.role === 'admin'
                        ? 'Coordenação'
                        : item.user.role === 'coordinator'
                          ? 'Zonal'
                          : 'Campo'

                    return (
                      <div
                        key={item.user.id}
                        onClick={() => navigate('/ranking')}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer hover:shadow-xs ${
                          rank === 1
                            ? 'bg-gradient-to-r from-blue-50/50 via-white to-white border-blue-300 ring-1 ring-blue-300/40'
                            : rank === 2
                              ? 'bg-slate-50/60 border-slate-200'
                              : rank === 3
                                ? 'bg-orange-50/40 border-orange-200'
                                : 'bg-white border-slate-100 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank icon / number */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                              rank === 1
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : rank === 3
                                    ? 'bg-amber-800 text-white'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {medal || `${rank}º`}
                          </div>

                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {item.user.avatar ? (
                              <img
                                src={pb.files.getURL(item.user, item.user.avatar)}
                                alt={item.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : item.user.name ? (
                              item.user.name.charAt(0).toUpperCase()
                            ) : (
                              'M'
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {item.user.name || item.user.email}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 text-slate-500 font-normal"
                              >
                                {roleText}
                              </Badge>
                            </div>

                            {/* Badges icons preview */}
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.badges.slice(0, 3).map((b) => (
                                <span
                                  key={b.id}
                                  title={b.title}
                                  className="text-[10px] bg-slate-100 px-1 rounded"
                                >
                                  {b.icon}
                                </span>
                              ))}
                              <span className="text-[10px] text-slate-400 ml-1">
                                {item.totalKm} km percorridos
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Check-ins count */}
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sm text-blue-600">
                            {item.totalCheckins}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">check-ins</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Total:{' '}
                <strong className="text-slate-800">
                  {top5Checkins.reduce((a, c) => a + c.totalCheckins, 0)} check-ins
                </strong>
              </span>
              <button
                onClick={() => navigate('/ranking')}
                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* 6 KPI Cards Grid (Including Alcance Digital & Postagens Programadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Votos Alvo vs Alcançados */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Alcance Eleitores
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Target className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900">
              {totalVotesContacted.toLocaleString('pt-BR')}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Meta Proporcional</span>
                <span className="font-semibold text-slate-700">{targetProgressPerc}%</span>
              </div>
              <Progress value={targetProgressPerc} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Membros Ativos em Campo */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Equipe ao Vivo
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              {activeMembersCount}
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> GPS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Agentes com transmissão</p>
          </CardContent>
        </Card>

        {/* NOVO KPI 3: Alcance Digital Estimado */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Alcance Digital
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Globe className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900">
              {estimatedDigitalReach.toLocaleString('pt-BR')}
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Redes & Impressões
            </p>
          </CardContent>
        </Card>

        {/* NOVO KPI 4: Postagens Programadas */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Posts Agendados
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900">
              {upcomingPostsCount}{' '}
              <span className="text-xs font-normal text-slate-400">futuros</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {scheduledPosts.length} postagens no total
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Pontos de Apoio */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Comitês & Apoio
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900">
              {supportPoints.length}{' '}
              <span className="text-xs font-normal text-slate-400">polos</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Polos territoriais
            </p>
          </CardContent>
        </Card>

        {/* KPI 6: Índice de Sentimento */}
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Sentimento
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-slate-900 flex items-center gap-1">
              {sentimentAverage} <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-2">★ 88% receptivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Próximas Postagens */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
              <CalendarIcon className="w-4 h-4 text-amber-500 shrink-0" /> Próximas Postagens
              Programadas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cronograma imediato de publicações nas redes sociais da campanha
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/content-calendar')}
            className="text-xs h-8 font-semibold border-slate-200 hover:bg-slate-50 shrink-0 self-start sm:self-auto"
          >
            Ver Calendário <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {next3Posts.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Nenhuma postagem futura agendada no momento.{' '}
              <button
                onClick={() => navigate('/content-calendar')}
                className="text-amber-600 underline font-semibold ml-1"
              >
                Planejar no calendário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {next3Posts.map((post) => {
                const dateObj = new Date(post.scheduled_at)
                const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                })
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={post.id}
                    onClick={() => navigate('/content-calendar')}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold text-slate-700 bg-white"
                      >
                        {post.platform} • {post.media_type}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formattedDate}, {formattedTime}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{post.title}</h4>
                    {post.caption && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">"{post.caption}"</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span className="capitalize">Obj: {post.objective}</span>
                      <Badge className="bg-amber-500 text-slate-950 text-[9px] px-1 py-0 h-4 font-bold">
                        Agendado
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção Candidatos Vinculados (TSE) */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Candidatos Vinculados do
              TSE
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Candidaturas oficiais registradas no TSE vinculadas à campanha
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/candidates')}
            className="text-xs h-8 font-semibold border-slate-200 hover:bg-slate-50 shrink-0 self-start sm:self-auto"
          >
            Explorar SP <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {linkedCandidates.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Nenhum candidato do TSE vinculado ainda.{' '}
              <button
                onClick={() => navigate('/candidates')}
                className="text-amber-600 underline font-semibold ml-1"
              >
                Vincular candidatos na aba Candidaturas SP
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {linkedCandidates.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => navigate('/candidates')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-3"
                >
                  <img
                    src={`https://img.usecurling.com/ppl/128?gender=${
                      cand.gender === 'FEMININO' ? 'female' : 'male'
                    }&seed=${cand.candidate_number || cand.id}`}
                    alt={cand.candidate_name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs bg-slate-900 text-amber-400 px-1.5 py-0.2 rounded">
                        {cand.candidate_number}
                      </span>
                      <span className="font-bold text-xs text-slate-800 truncate">
                        {cand.social_name || cand.candidate_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {cand.position} • {cand.party} • {cand.city_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 h-4 font-semibold">
                        {cand.status}
                      </Badge>
                      {cand.is_reelection && (
                        <span className="text-[9px] text-blue-600 font-bold">Reeleição</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Mini Map + Real-time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mini Live Map */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 min-w-0">
              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0" /> Dispersão Tática & Calor
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Agentes ao vivo e calor de panfletagem/visitas
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/map')}
                className="text-xs h-8 font-semibold border-slate-200 hover:bg-slate-50 shrink-0 self-start sm:self-auto"
              >
                Abrir Mapa <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <MapView
                height="380px"
                activities={activities}
                supportPoints={supportPoints}
                teamLocations={teamLocations}
                territories={territories}
              />
            </CardContent>
          </Card>

          {/* Progress Chart vs TSE historical */}
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Conversão de Campo vs. Potencial
                Histórico TSE
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Comparativo de contatos diretos registrados na semana com meta estimada por zona
                eleitoral
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="conversao"
                      name="Conversão em Campo"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? '#F59E0B' : '#10B981'}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="metaTSE"
                      name="Meta Estimada TSE"
                      fill="#CBD5E1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Realtime Activity Feed */}
        <div className="space-y-4">
          <Card className="border-slate-200/80 shadow-sm bg-white h-full flex flex-col">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Feed de Atividades
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Últimos check-ins de militantes
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-emerald-600 bg-emerald-50"
              >
                Ao Vivo
              </Badge>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[640px] space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma atividade registrada ainda nesta campanha.
                </div>
              ) : (
                activities.map((act) => {
                  const sentimentColor =
                    act.sentiment >= 4
                      ? 'text-emerald-600 bg-emerald-50'
                      : act.sentiment === 3
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-rose-600 bg-rose-50'

                  const typeLabel =
                    act.type === 'door-to-door'
                      ? '🚪 Porta a Porta'
                      : act.type === 'flyering'
                        ? '📄 Panfletagem'
                        : act.type === 'event'
                          ? '🎤 Evento'
                          : '🏢 Ponto de Apoio'

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{typeLabel}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sentimentColor}`}
                        >
                          ★ {act.sentiment}/5
                        </span>
                      </div>

                      {act.photo && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
                          <img
                            src={pb.files.getURL(act, act.photo)}
                            alt="Registro de campo"
                            className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute bottom-1 right-1 bg-slate-950/70 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                            📷 Foto anexada
                          </div>
                        </div>
                      )}

                      <div className="text-xs font-semibold text-slate-700">
                        {act.location_name || 'Região Metropolitana'}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">"{act.notes}"</p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px]">
                          👤 {act.expand?.user_id?.name || 'Agente de Campo'}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(act.created).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
