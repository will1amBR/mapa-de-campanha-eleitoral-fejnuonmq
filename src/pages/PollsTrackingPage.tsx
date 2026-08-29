import React, { useState, useEffect, useMemo } from 'react'
import { useCampaign } from '@/hooks/use-campaign'
import { pollsService } from '@/services/polls'
import type { Poll, PollScenario, PollAdversaryResult } from '@/types/campaign'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  BarChart3,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit,
  Building,
  Target,
  Award,
  Users,
  Search,
  ChevronRight,
  HelpCircle,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'

export const SCENARIO_LABELS: Record<PollScenario, string> = {
  estimulada_1t: 'Estimulada (1º Turno)',
  espontanea_1t: 'Espontânea (1º Turno)',
  segundo_turno: 'Simulação 2º Turno',
  rejeicao: 'Índice de Rejeição',
}

export const PollsTrackingPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [scenarioFilter, setScenarioFilter] = useState<string>('all')
  const [instituteFilter, setInstituteFilter] = useState<string>('all')

  // Modal create/edit poll
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null)
  const [formData, setFormData] = useState({
    institute: 'Datafolha',
    poll_date: new Date().toISOString().slice(0, 10),
    scenario: 'estimulada_1t' as PollScenario,
    our_candidate_percentage: 30.0,
    margin_of_error: 2.0,
    sample_size: 1500,
    candidate_rank: 1,
    tse_registration: '',
    analysis_notes: '',
  })

  const [adversariesList, setAdversariesList] = useState<PollAdversaryResult[]>([
    { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 26.0 },
    { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 25.0 },
    { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 12.0 },
    { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 5.0 },
  ])

  const loadPolls = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const data = await pollsService.getPolls(currentCampaign.id)
      setPolls(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar pesquisas eleitorais')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolls()
  }, [currentCampaign])

  // Filtered polls
  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      if (scenarioFilter !== 'all' && p.scenario !== scenarioFilter) return false
      if (instituteFilter !== 'all' && p.institute !== instituteFilter) return false
      return true
    })
  }, [polls, scenarioFilter, instituteFilter])

  // Sorted chronologically for evolution analysis
  const chronologicalPolls = useMemo(() => {
    return [...filteredPolls].sort(
      (a, b) => new Date(a.poll_date).getTime() - new Date(b.poll_date).getTime(),
    )
  }, [filteredPolls])

  // Latest vs Previous Trend calculation
  const trendAnalysis = useMemo(() => {
    if (chronologicalPolls.length === 0) {
      return {
        diff: 0,
        text: 'Sem dados suficientes',
        direction: 'stable' as const,
        latest: null,
        previous: null,
      }
    }
    if (chronologicalPolls.length === 1) {
      return {
        diff: 0,
        text: 'Primeira pesquisa registrada',
        direction: 'stable' as const,
        latest: chronologicalPolls[0],
        previous: null,
      }
    }

    const latest = chronologicalPolls[chronologicalPolls.length - 1]
    const previous = chronologicalPolls[chronologicalPolls.length - 2]
    const diff = Number(
      (latest.our_candidate_percentage - previous.our_candidate_percentage).toFixed(1),
    )

    let text = ''
    let direction: 'up' | 'down' | 'stable' = 'stable'

    if (diff > 0) {
      text = `Subiu ${diff.toString().replace('.', ',')} p.p.`
      direction = 'up'
    } else if (diff < 0) {
      text = `Caiu ${Math.abs(diff).toString().replace('.', ',')} p.p.`
      direction = 'down'
    } else {
      text = 'Estável (0,0 p.p.)'
      direction = 'stable'
    }

    return { diff, text, direction, latest, previous }
  }, [chronologicalPolls])

  // Chart data formatting for LineChart
  const chartData = useMemo(() => {
    return chronologicalPolls.map((poll) => {
      const d = new Date(poll.poll_date)
      const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      const item: Record<string, any> = {
        date: dateLabel,
        institute: poll.institute,
        fullDate: poll.poll_date,
        [currentCampaign?.candidate_name || 'Nosso Candidato']: poll.our_candidate_percentage,
      }

      if (poll.adversaries_results && Array.isArray(poll.adversaries_results)) {
        poll.adversaries_results.forEach((adv) => {
          if (adv.adversary_name) {
            item[adv.adversary_name] = adv.percentage
          }
        })
      }

      return item
    })
  }, [chronologicalPolls, currentCampaign])

  // List of unique candidates for chart lines
  const lineKeys = useMemo(() => {
    const keys = new Set<string>()
    const ourCand = currentCampaign?.candidate_name || 'Nosso Candidato'
    keys.add(ourCand)

    chronologicalPolls.forEach((p) => {
      if (p.adversaries_results && Array.isArray(p.adversaries_results)) {
        p.adversaries_results.forEach((adv) => {
          if (adv.adversary_name) keys.add(adv.adversary_name)
        })
      }
    })

    return Array.from(keys)
  }, [chronologicalPolls, currentCampaign])

  // Chart colors palette
  const CANDIDATE_COLORS = [
    '#F59E0B', // Amber (Nosso Candidato)
    '#EF4444', // Red (Boulos / PT)
    '#3B82F6', // Blue (Nunes / MDB)
    '#10B981', // Emerald (Marçal / Outros)
    '#8B5CF6', // Purple (Tabata)
    '#EC4899', // Pink
    '#06B6D4', // Cyan
  ]

  // Handlers for Modal
  const handleOpenCreate = () => {
    setEditingPoll(null)
    setFormData({
      institute: 'Datafolha',
      poll_date: new Date().toISOString().slice(0, 10),
      scenario: 'estimulada_1t',
      our_candidate_percentage: 30.0,
      margin_of_error: 2.0,
      sample_size: 1500,
      candidate_rank: 1,
      tse_registration: '',
      analysis_notes: '',
    })
    setAdversariesList([
      { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 26.0 },
      { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 25.0 },
      { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 12.0 },
      { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 5.0 },
    ])
    setModalOpen(true)
  }

  const handleOpenEdit = (poll: Poll) => {
    setEditingPoll(poll)
    setFormData({
      institute: poll.institute,
      poll_date: poll.poll_date ? new Date(poll.poll_date).toISOString().slice(0, 10) : '',
      scenario: poll.scenario,
      our_candidate_percentage: poll.our_candidate_percentage,
      margin_of_error: poll.margin_of_error || 2.0,
      sample_size: poll.sample_size || 1000,
      candidate_rank: poll.candidate_rank || 1,
      tse_registration: poll.tse_registration || '',
      analysis_notes: poll.analysis_notes || '',
    })
    setAdversariesList(
      poll.adversaries_results && poll.adversaries_results.length > 0
        ? poll.adversaries_results
        : [
            { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 26.0 },
            { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 25.0 },
          ],
    )
    setModalOpen(true)
  }

  const handleSavePoll = async () => {
    if (!currentCampaign) return
    if (!formData.institute.trim() || !formData.poll_date) {
      toast.error('Instituto e data da pesquisa são obrigatórios.')
      return
    }

    try {
      const payload: Partial<Poll> = {
        campaign_id: currentCampaign.id,
        institute: formData.institute,
        poll_date: new Date(formData.poll_date).toISOString(),
        scenario: formData.scenario,
        our_candidate_percentage: Number(formData.our_candidate_percentage),
        adversaries_results: adversariesList.filter((a) => a.adversary_name.trim() !== ''),
        margin_of_error: Number(formData.margin_of_error),
        sample_size: Number(formData.sample_size),
        candidate_rank: Number(formData.candidate_rank),
        tse_registration: formData.tse_registration,
        analysis_notes: formData.analysis_notes,
      }

      if (editingPoll) {
        await pollsService.updatePoll(editingPoll.id, payload)
        toast.success('Pesquisa atualizada com sucesso!')
      } else {
        await pollsService.createPoll(payload)
        toast.success('Pesquisa eleitoral cadastrada!')
      }
      setModalOpen(false)
      loadPolls()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar pesquisa eleitoral')
    }
  }

  const handleDeletePoll = async (id: string) => {
    if (!confirm('Deseja excluir este registro de pesquisa eleitoral?')) return
    try {
      await pollsService.deletePoll(id)
      toast.success('Pesquisa removida.')
      loadPolls()
    } catch (err) {
      toast.error('Erro ao excluir pesquisa')
    }
  }

  const handleAddAdversaryRow = () => {
    setAdversariesList([...adversariesList, { adversary_name: '', party: '', percentage: 0 }])
  }

  const handleRemoveAdversaryRow = (idx: number) => {
    setAdversariesList(adversariesList.filter((_, i) => i !== idx))
  }

  const handleAdversaryChange = (idx: number, field: keyof PollAdversaryResult, value: any) => {
    const updated = [...adversariesList]
    updated[idx] = { ...updated[idx], [field]: value }
    setAdversariesList(updated)
  }

  const exportPollsCSV = () => {
    if (polls.length === 0) {
      toast.info('Nenhuma pesquisa para exportar')
      return
    }
    const rows = [
      [
        'Data',
        'Instituto',
        'Cenário',
        'Percentual Nosso (%)',
        'Posição/Rank',
        'Margem de Erro (p.p.)',
        'Amostra',
        'Registro TSE',
        'Notas',
      ],
      ...polls.map((p) => [
        p.poll_date ? new Date(p.poll_date).toLocaleDateString('pt-BR') : '',
        p.institute,
        p.scenario,
        p.our_candidate_percentage,
        p.candidate_rank,
        p.margin_of_error,
        p.sample_size,
        p.tse_registration || '',
        `"${(p.analysis_notes || '').replace(/"/g, '""')}"`,
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `pesquisas_eleitorais_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Planilha de pesquisas exportada!')
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 text-slate-100 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#1e1b4b] p-4 sm:p-6 rounded-2xl text-white shadow-xl border border-amber-500/30 min-w-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 text-xs uppercase tracking-wider shrink-0 shadow-sm">
              <BarChart3 className="w-3.5 h-3.5 mr-1" /> Termômetro Eleitoral
            </Badge>
            <span className="text-xs text-amber-300/80 font-medium truncate">
              {currentCampaign?.candidate_name || 'Candidatura'} • Datafolha, Quaest, Ipec & Outros
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Acompanhamento de Pesquisas Eleitorais
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Histórico cronológico, projeção de intenção de voto, comparativo de institutos e
            diagnóstico estratégico de áreas de atenção e crescimento.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <Button
            onClick={handleOpenCreate}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm h-9 sm:h-10 px-4 shadow-lg shadow-amber-500/20 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[3]" /> Nova Pesquisa
          </Button>

          <Button
            variant="outline"
            onClick={exportPollsCSV}
            className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex-1 sm:flex-none justify-center"
          >
            <Download className="w-4 h-4 mr-1.5 text-amber-400" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Última Pesquisa Registrada */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Última Pesquisa
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2 flex items-baseline gap-1.5">
              {trendAnalysis.latest ? `${trendAnalysis.latest.our_candidate_percentage}%` : '--'}
              <span className="text-xs font-normal text-slate-400">
                {trendAnalysis.latest?.institute || 'Nenhum dado'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>
                Posição:{' '}
                {trendAnalysis.latest?.candidate_rank
                  ? `${trendAnalysis.latest.candidate_rank}º Lugar`
                  : 'N/A'}
              </span>
              <span className="text-amber-400 font-medium">
                {trendAnalysis.latest
                  ? new Date(trendAnalysis.latest.poll_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Indicador de Tendência */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tendência Atual
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  trendAnalysis.direction === 'up'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : trendAnalysis.direction === 'down'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-slate-800 text-slate-300'
                }`}
              >
                {trendAnalysis.direction === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : trendAnalysis.direction === 'down' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </div>
            </div>
            <div
              className={`text-2xl font-black mt-2 flex items-center gap-1.5 ${
                trendAnalysis.direction === 'up'
                  ? 'text-emerald-400'
                  : trendAnalysis.direction === 'down'
                    ? 'text-rose-400'
                    : 'text-slate-200'
              }`}
            >
              {trendAnalysis.text}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 truncate">
              Comparativo com a rodada anterior
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Margem de Erro Média */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Margem de Erro
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              ±{trendAnalysis.latest?.margin_of_error || 2.0} p.p.
            </div>
            <p className="text-[11px] text-slate-400 mt-2 truncate">
              Amostra:{' '}
              {trendAnalysis.latest?.sample_size
                ? `${trendAnalysis.latest.sample_size.toLocaleString('pt-BR')} entrevistas`
                : '1.500'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Total de Levantamentos */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pesquisas Coletadas
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {polls.length}{' '}
              <span className="text-xs font-normal text-slate-400">levantamentos</span>
            </div>
            <p className="text-[11px] text-purple-400 font-medium mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Base auditada TSE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trajectory Evolution Line Chart */}
      <Card className="bg-slate-900/90 border-slate-800 text-white shadow-xl">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                Evolução Temporal
              </Badge>
              <span className="text-xs text-slate-400">Trajetória dos Candidatos (%)</span>
            </div>
            <CardTitle className="text-base sm:text-lg font-bold text-white mt-1">
              Curva de Desempenho Eleitoral ao Longo do Tempo
            </CardTitle>
          </div>

          {/* Filters inside chart header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
              <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 w-44">
                <SelectValue placeholder="Cenário" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                <SelectItem value="all">Todos os Cenários</SelectItem>
                {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
              <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 w-36">
                <SelectValue placeholder="Instituto" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                <SelectItem value="all">Todos Institutos</SelectItem>
                <SelectItem value="Datafolha">Datafolha</SelectItem>
                <SelectItem value="Quaest">Quaest</SelectItem>
                <SelectItem value="Paraná Pesquisas">Paraná Pesquisas</SelectItem>
                <SelectItem value="Ipec">Ipec</SelectItem>
                <SelectItem value="AtlasIntel">AtlasIntel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <BarChart3 className="w-8 h-8 text-slate-600" />
              <span>Nenhuma pesquisa disponível para o filtro selecionado.</span>
            </div>
          ) : (
            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 'dataMax + 5']}
                    unit="%"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => [`${val}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {lineKeys.map((candName, idx) => {
                    const isOur =
                      candName === (currentCampaign?.candidate_name || 'Nosso Candidato')
                    return (
                      <Line
                        key={candName}
                        type="monotone"
                        dataKey={candName}
                        name={candName}
                        stroke={
                          isOur ? '#F59E0B' : CANDIDATE_COLORS[(idx + 1) % CANDIDATE_COLORS.length]
                        }
                        strokeWidth={isOur ? 3.5 : 2}
                        dot={{ r: isOur ? 5 : 3.5 }}
                        activeDot={{ r: isOur ? 7 : 5 }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: O que pode mudar / Análise Estratégica Automática & Notas */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#1e1b4b] border-amber-500/30 text-white shadow-xl">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                O Que Pode Mudar: Diagnóstico & Variações Estratégicas
              </CardTitle>
              <CardDescription className="text-xs text-slate-300">
                Insights automatizados e anotações qualitativas com base na oscilação das últimas
                pesquisas
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Automated analysis message */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Análise Automática de Oscilação
              </span>
              <span className="text-[10px] text-slate-400 uppercase">
                {trendAnalysis.latest?.institute || 'Datafolha'} • {trendAnalysis.text}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {trendAnalysis.direction === 'up' && (
                <span>
                  🟢 <strong>Momento positivo de tração eleitoral:</strong> O candidato avançou{' '}
                  <strong className="text-emerald-400">{trendAnalysis.text}</strong> na última
                  pesquisa ({trendAnalysis.latest?.institute}). A consolidação da liderança exige
                  foco em blindar a base consolidada na classe média e avançar em agendas de saúde e
                  mobilidade nas zonas periféricas.
                </span>
              )}
              {trendAnalysis.direction === 'down' && (
                <span>
                  🔴 <strong>Alerta tático de contenção:</strong> Houve recuo de{' '}
                  <strong className="text-rose-400">{trendAnalysis.text}</strong>. Recomenda-se
                  revisar as inserções de rádio/TV e focar na redução da rejeição através de agendas
                  positivas e combate direto às fake news dos adversários.
                </span>
              )}
              {trendAnalysis.direction === 'stable' && (
                <span>
                  🟡 <strong>Cenário de estabilidade / cristalização de votos:</strong> As intenções
                  permanecem estáveis. O foco dos próximos debates deve ser a conversão do
                  eleitorado indeciso (5% a 10%) e a atração de votos úteis dos candidatos de menor
                  expressão.
                </span>
              )}
            </p>
          </div>

          {/* Qualitative notes from recent polls */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Notas & Focos de Atenção por Pesquisa:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chronologicalPolls
                .slice(-4)
                .reverse()
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span className="text-amber-400">{p.institute}</span>
                      <span className="text-slate-400 font-normal">
                        {new Date(p.poll_date).toLocaleDateString('pt-BR')} •{' '}
                        {p.our_candidate_percentage}%
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {p.analysis_notes ||
                        'Nenhuma anotação específica registrada para este levantamento.'}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listagem Cronológica de Pesquisas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" /> Histórico Detalhado de Levantamentos (
            {filteredPolls.length})
          </h3>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Adicionar
          </Button>
        </div>

        {filteredPolls.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">
              Nenhuma pesquisa eleitoral cadastrada
            </h4>
            <p className="text-xs text-slate-500">
              Cadastre pesquisas do Datafolha, Quaest, Ipec e outros institutos para acompanhar a
              trajetória.
            </p>
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Cadastrar Primeira Pesquisa
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPolls.map((poll) => {
              const pollDateStr = new Date(poll.poll_date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })

              return (
                <div
                  key={poll.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            {poll.institute}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-slate-400 border-slate-700"
                          >
                            {SCENARIO_LABELS[poll.scenario] || poll.scenario}
                          </Badge>
                          {poll.candidate_rank && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              {poll.candidate_rank}º Lugar
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-extrabold text-base text-white">{pollDateStr}</h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(poll)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePoll(poll.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Result Highlights */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          {currentCampaign?.candidate_name || 'Nosso Candidato'}
                        </span>
                        <span className="text-base font-black text-amber-400">
                          {poll.our_candidate_percentage}%
                        </span>
                      </div>

                      {/* Adversaries mini bars */}
                      {poll.adversaries_results && poll.adversaries_results.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          {poll.adversaries_results.map((adv, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] text-slate-300"
                            >
                              <span className="truncate pr-2">
                                {adv.adversary_name} {adv.party ? `(${adv.party})` : ''}
                              </span>
                              <span className="font-bold text-slate-200">{adv.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Meta info: Margem, Amostra, TSE */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 px-1 flex-wrap gap-2">
                      <span>Margem: ±{poll.margin_of_error || 2.0} p.p.</span>
                      <span>
                        Amostra: {poll.sample_size ? `${poll.sample_size} entrevistas` : 'N/A'}
                      </span>
                      {poll.tse_registration && (
                        <span className="font-mono text-amber-400/80 font-medium">
                          TSE: {poll.tse_registration}
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {poll.analysis_notes && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90">
                        <strong>Área de atenção:</strong> {poll.analysis_notes}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DIALOG: Criar / Editar Pesquisa Eleitoral */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              {editingPoll ? 'Editar Pesquisa Eleitoral' : 'Cadastrar Nova Pesquisa Eleitoral'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Insira o instituto, data da coleta, percentuais dos candidatos e observações de
              cenário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Row 1: Instituto & Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Instituto de Pesquisa *</Label>
                <Input
                  placeholder="Ex: Datafolha, Quaest, Ipec, AtlasIntel..."
                  value={formData.institute}
                  onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Data de Divulgação / Coleta *
                </Label>
                <Input
                  type="date"
                  value={formData.poll_date}
                  onChange={(e) => setFormData({ ...formData, poll_date: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            {/* Row 2: Cenário & Posição */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Cenário</Label>
                <Select
                  value={formData.scenario}
                  onValueChange={(val: PollScenario) => setFormData({ ...formData, scenario: val })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-amber-400">Nosso Candidato (%) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.our_candidate_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      our_candidate_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-amber-400 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Posição / Rank</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.candidate_rank}
                  onChange={(e) =>
                    setFormData({ ...formData, candidate_rank: parseInt(e.target.value, 10) || 1 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            {/* Row 3: Margem, Amostra e Registro TSE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Margem de Erro (p.p.)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={formData.margin_of_error}
                  onChange={(e) =>
                    setFormData({ ...formData, margin_of_error: parseFloat(e.target.value) || 2.0 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Amostragem (Entrevistas)</Label>
                <Input
                  type="number"
                  step="50"
                  min="100"
                  value={formData.sample_size}
                  onChange={(e) =>
                    setFormData({ ...formData, sample_size: parseInt(e.target.value, 10) || 1000 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Registro TSE</Label>
                <Input
                  placeholder="Ex: SP-01234/2024"
                  value={formData.tse_registration}
                  onChange={(e) => setFormData({ ...formData, tse_registration: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            {/* Adversaries Dynamic Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-300">
                  Percentual dos Adversários
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAddAdversaryRow}
                  className="h-6 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Adversário
                </Button>
              </div>

              <div className="space-y-2">
                {adversariesList.map((adv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Nome do Adversário"
                      value={adv.adversary_name}
                      onChange={(e) => handleAdversaryChange(idx, 'adversary_name', e.target.value)}
                      className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 flex-1"
                    />
                    <Input
                      placeholder="Partido"
                      value={adv.party || ''}
                      onChange={(e) => handleAdversaryChange(idx, 'party', e.target.value)}
                      className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 w-24"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="%"
                      value={adv.percentage}
                      onChange={(e) =>
                        handleAdversaryChange(idx, 'percentage', parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 w-20 font-bold"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveAdversaryRow(idx)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* O que pode mudar / Anotações estratégicas */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <Label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> O Que Pode Mudar: Anotação Qualitativa & Áreas
                de Atenção
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Perdeu pontos entre eleitores de renda X após polêmica Y; cresceu na Zona Leste pós sabatina da rádio..."
                value={formData.analysis_notes}
                onChange={(e) => setFormData({ ...formData, analysis_notes: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs bg-slate-800 border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSavePoll}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {editingPoll ? 'Salvar Alterações' : 'Cadastrar Pesquisa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
