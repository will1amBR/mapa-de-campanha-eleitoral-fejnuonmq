import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { debateService } from '@/services/debate'
import type {
  DebateEvent,
  DebateAdversary,
  DebateQA,
  DebateTopic,
  DebatePrepStatus,
  DebateTargetType,
  DebateStatus,
} from '@/types/campaign'
import {
  Swords,
  ShieldAlert,
  Mic,
  Calendar,
  Search,
  Plus,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FileText,
  AlertTriangle,
  UserCheck,
  Building,
  Target,
  Send,
  Bot,
  Flame,
  ChevronRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  BarChart2,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export const TOPIC_LABELS: Record<DebateTopic, { label: string; color: string }> = {
  economia: {
    label: 'Economia & Emprego',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  saude: { label: 'Saúde Pública', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  seguranca: {
    label: 'Segurança & Guarda',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  educacao: {
    label: 'Educação & Creches',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  transporte: {
    label: 'Transporte & Trânsito',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  habitacao: {
    label: 'Habitação & Centro',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  meio_ambiente: {
    label: 'Meio Ambiente & Clima',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  corrupcao: {
    label: 'Combate à Corrupção',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  zeladoria: {
    label: 'Zeladoria Urbana',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  geral: { label: 'Geral / Política', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

export const STATUS_CONFIG: Record<DebatePrepStatus, { label: string; badgeClass: string }> = {
  draft: { label: 'Rascunho', badgeClass: 'bg-slate-700 text-slate-300' },
  under_review: {
    label: 'Em Estudo',
    badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  ready: { label: 'Pronto', badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  rehearsed: {
    label: 'Ensaiado',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
}

export const DebatePrepPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  const [activeTab, setActiveTab] = useState<'qa' | 'adversaries' | 'events' | 'simulator'>('qa')
  const [loading, setLoading] = useState(true)

  // Data states
  const [events, setEvents] = useState<DebateEvent[]>([])
  const [adversaries, setAdversaries] = useState<DebateAdversary[]>([])
  const [qaList, setQaList] = useState<DebateQA[]>([])

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [adversaryFilter, setAdversaryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [debateFilter, setDebateFilter] = useState<string>('all')

  // Modals state
  const [qaModalOpen, setQaModalOpen] = useState(false)
  const [editingQA, setEditingQA] = useState<DebateQA | null>(null)
  const [qaFormData, setQaFormData] = useState({
    debate_id: '',
    adversary_id: '',
    topic: 'economia' as DebateTopic,
    target_type: 'to_adversary' as DebateTargetType,
    question: '',
    prepared_answer: '',
    counter_attack: '',
    key_data_points: '',
    prep_status: 'ready' as DebatePrepStatus,
    priority: 3,
    time_limit_seconds: 60,
  })

  const [advModalOpen, setAdvModalOpen] = useState(false)
  const [editingAdv, setEditingAdv] = useState<DebateAdversary | null>(null)
  const [advFormData, setAdvFormData] = useState({
    name: '',
    party: '',
    candidate_number: '',
    target_position: 'Prefeito',
    avatar_seed: '',
    strengths: '',
    weaknesses: '',
    controversies: '',
    style_tone: '',
  })

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<DebateEvent | null>(null)
  const [eventFormData, setEventFormData] = useState({
    title: '',
    broadcaster: '',
    event_date: '',
    location: '',
    status: 'upcoming' as DebateStatus,
    rules_summary: '',
    notes: '',
  })

  // Simulator / Teleprompter state
  const [simSelectedQA, setSimSelectedQA] = useState<DebateQA | null>(null)
  const [simTimer, setSimTimer] = useState<number>(60)
  const [simRunning, setSimRunning] = useState(false)
  const [simTotalTime, setSimTotalTime] = useState<number>(60)

  // AI Assistant generator inside modal
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  const loadData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [evs, advs, qas] = await Promise.all([
        debateService.getEvents(currentCampaign.id),
        debateService.getAdversaries(currentCampaign.id),
        debateService.getQAList(currentCampaign.id),
      ])
      setEvents(evs)
      setAdversaries(advs)
      setQaList(qas)

      if (qas.length > 0 && !simSelectedQA) {
        setSimSelectedQA(qas[0])
        setSimTimer(qas[0].time_limit_seconds || 60)
        setSimTotalTime(qas[0].time_limit_seconds || 60)
      }
    } catch (err) {
      console.error('Error loading debate prep data:', err)
      toast.error('Erro ao carregar dados de preparação de debate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentCampaign])

  // Timer loop for simulation
  useEffect(() => {
    let interval: any = null
    if (simRunning && simTimer > 0) {
      interval = setInterval(() => {
        setSimTimer((prev) => prev - 1)
      }, 1000)
    } else if (simTimer === 0 && simRunning) {
      setSimRunning(false)
      toast.warning('Tempo limite esgotado!')
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [simRunning, simTimer])

  // Filtered QA list
  const filteredQAs = useMemo(() => {
    return qaList.filter((qa) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchQuestion = qa.question.toLowerCase().includes(q)
        const matchAnswer = qa.prepared_answer?.toLowerCase().includes(q)
        const matchCounter = qa.counter_attack?.toLowerCase().includes(q)
        const matchPoints = qa.key_data_points?.toLowerCase().includes(q)
        if (!matchQuestion && !matchAnswer && !matchCounter && !matchPoints) return false
      }
      if (topicFilter !== 'all' && qa.topic !== topicFilter) return false
      if (adversaryFilter !== 'all' && qa.adversary_id !== adversaryFilter) return false
      if (statusFilter !== 'all' && qa.prep_status !== statusFilter) return false
      if (targetTypeFilter !== 'all' && qa.target_type !== targetTypeFilter) return false
      if (debateFilter !== 'all' && qa.debate_id !== debateFilter) return false
      return true
    })
  }, [
    qaList,
    searchQuery,
    topicFilter,
    adversaryFilter,
    statusFilter,
    targetTypeFilter,
    debateFilter,
  ])

  // Stats calculation
  const stats = useMemo(() => {
    const total = qaList.length
    const ready = qaList.filter((q) => q.prep_status === 'ready').length
    const rehearsed = qaList.filter((q) => q.prep_status === 'rehearsed').length
    const underReview = qaList.filter((q) => q.prep_status === 'under_review').length
    const draft = qaList.filter((q) => q.prep_status === 'draft').length
    const percentDone = total > 0 ? Math.round(((ready + rehearsed) / total) * 100) : 0

    return {
      total,
      ready,
      rehearsed,
      underReview,
      draft,
      percentDone,
      totalAdv: adversaries.length,
      upcomingEvents: events.filter((e) => e.status === 'upcoming').length,
    }
  }, [qaList, adversaries, events])

  // QA Handlers
  const handleOpenCreateQA = () => {
    setEditingQA(null)
    setQaFormData({
      debate_id: events[0]?.id || '',
      adversary_id: adversaries[0]?.id || '',
      topic: 'economia',
      target_type: 'to_adversary',
      question: '',
      prepared_answer: '',
      counter_attack: '',
      key_data_points: '',
      prep_status: 'ready',
      priority: 4,
      time_limit_seconds: 60,
    })
    setQaModalOpen(true)
  }

  const handleOpenEditQA = (qa: DebateQA) => {
    setEditingQA(qa)
    setQaFormData({
      debate_id: qa.debate_id || '',
      adversary_id: qa.adversary_id || '',
      topic: qa.topic,
      target_type: qa.target_type,
      question: qa.question,
      prepared_answer: qa.prepared_answer || '',
      counter_attack: qa.counter_attack || '',
      key_data_points: qa.key_data_points || '',
      prep_status: qa.prep_status,
      priority: qa.priority || 3,
      time_limit_seconds: qa.time_limit_seconds || 60,
    })
    setQaModalOpen(true)
  }

  const handleSaveQA = async () => {
    if (!currentCampaign) return
    if (!qaFormData.question.trim()) {
      toast.error('O texto da pergunta ou tema é obrigatório.')
      return
    }

    try {
      const payload: Partial<DebateQA> = {
        campaign_id: currentCampaign.id,
        debate_id: qaFormData.debate_id || undefined,
        adversary_id: qaFormData.adversary_id || undefined,
        topic: qaFormData.topic,
        target_type: qaFormData.target_type,
        question: qaFormData.question,
        prepared_answer: qaFormData.prepared_answer,
        counter_attack: qaFormData.counter_attack,
        key_data_points: qaFormData.key_data_points,
        prep_status: qaFormData.prep_status,
        priority: Number(qaFormData.priority),
        time_limit_seconds: Number(qaFormData.time_limit_seconds),
      }

      if (editingQA) {
        await debateService.updateQA(editingQA.id, payload)
        toast.success('Pergunta atualizada com sucesso!')
      } else {
        await debateService.createQA(payload)
        toast.success('Pergunta cadastrada com sucesso!')
      }
      setQaModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar pergunta de debate')
    }
  }

  const handleDeleteQA = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta e resposta preparada?')) return
    try {
      await debateService.deleteQA(id)
      toast.success('Pergunta removida.')
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir pergunta')
    }
  }

  // Quick Status change
  const handleQuickStatusChange = async (qa: DebateQA, newStatus: DebatePrepStatus) => {
    try {
      await debateService.updateQA(qa.id, { prep_status: newStatus })
      toast.success(`Status alterado para: ${STATUS_CONFIG[newStatus].label}`)
      setQaList((prev) => prev.map((q) => (q.id === qa.id ? { ...q, prep_status: newStatus } : q)))
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  // Adversary Handlers
  const handleOpenCreateAdv = () => {
    setEditingAdv(null)
    setAdvFormData({
      name: '',
      party: '',
      candidate_number: '',
      target_position: 'Prefeito',
      avatar_seed: '',
      strengths: '',
      weaknesses: '',
      controversies: '',
      style_tone: '',
    })
    setAdvModalOpen(true)
  }

  const handleOpenEditAdv = (adv: DebateAdversary) => {
    setEditingAdv(adv)
    setAdvFormData({
      name: adv.name,
      party: adv.party || '',
      candidate_number: adv.candidate_number || '',
      target_position: adv.target_position || 'Prefeito',
      avatar_seed: adv.avatar_seed || '',
      strengths: adv.strengths || '',
      weaknesses: adv.weaknesses || '',
      controversies: adv.controversies || '',
      style_tone: adv.style_tone || '',
    })
    setAdvModalOpen(true)
  }

  const handleSaveAdv = async () => {
    if (!currentCampaign) return
    if (!advFormData.name.trim()) {
      toast.error('O nome do adversário é obrigatório.')
      return
    }

    try {
      const payload: Partial<DebateAdversary> = {
        campaign_id: currentCampaign.id,
        name: advFormData.name,
        party: advFormData.party,
        candidate_number: advFormData.candidate_number,
        target_position: advFormData.target_position,
        avatar_seed: advFormData.avatar_seed || advFormData.name.toLowerCase().replace(/\s+/g, '_'),
        strengths: advFormData.strengths,
        weaknesses: advFormData.weaknesses,
        controversies: advFormData.controversies,
        style_tone: advFormData.style_tone,
      }

      if (editingAdv) {
        await debateService.updateAdversary(editingAdv.id, payload)
        toast.success('Adversário atualizado com sucesso!')
      } else {
        await debateService.createAdversary(payload)
        toast.success('Adversário cadastrado com sucesso!')
      }
      setAdvModalOpen(false)
      loadData()
    } catch (err) {
      toast.error('Erro ao salvar adversário')
    }
  }

  const handleDeleteAdv = async (id: string) => {
    if (!confirm('Deseja excluir este adversário? As perguntas vinculadas perderão a referência.'))
      return
    try {
      await debateService.deleteAdversary(id)
      toast.success('Adversário removido.')
      loadData()
    } catch {
      toast.error('Erro ao excluir adversário')
    }
  }

  // Event Handlers
  const handleOpenCreateEvent = () => {
    setEditingEvent(null)
    setEventFormData({
      title: '',
      broadcaster: '',
      event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16),
      location: '',
      status: 'upcoming',
      rules_summary: '',
      notes: '',
    })
    setEventModalOpen(true)
  }

  const handleOpenEditEvent = (ev: DebateEvent) => {
    setEditingEvent(ev)
    setEventFormData({
      title: ev.title,
      broadcaster: ev.broadcaster || '',
      event_date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 16) : '',
      location: ev.location || '',
      status: ev.status,
      rules_summary: ev.rules_summary || '',
      notes: ev.notes || '',
    })
    setEventModalOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!currentCampaign) return
    if (!eventFormData.title.trim() || !eventFormData.event_date) {
      toast.error('Título e data do debate são obrigatórios.')
      return
    }

    try {
      const payload: Partial<DebateEvent> = {
        campaign_id: currentCampaign.id,
        title: eventFormData.title,
        broadcaster: eventFormData.broadcaster,
        event_date: new Date(eventFormData.event_date).toISOString(),
        location: eventFormData.location,
        status: eventFormData.status,
        rules_summary: eventFormData.rules_summary,
        notes: eventFormData.notes,
      }

      if (editingEvent) {
        await debateService.updateEvent(editingEvent.id, payload)
        toast.success('Encontro/Debate atualizado!')
      } else {
        await debateService.createEvent(payload)
        toast.success('Debate agendado com sucesso!')
      }
      setEventModalOpen(false)
      loadData()
    } catch {
      toast.error('Erro ao salvar debate')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este debate?')) return
    try {
      await debateService.deleteEvent(id)
      toast.success('Debate excluído.')
      loadData()
    } catch {
      toast.error('Erro ao excluir evento')
    }
  }

  // AI Generation of Answers / Questions
  const handleGenerateAiSuggestions = async () => {
    if (!qaFormData.question.trim() && !qaFormData.topic) {
      toast.info('Preencha o tema ou o rascunho da pergunta para gerar argumentos com a IA.')
      return
    }

    setIsGeneratingAi(true)
    try {
      const selectedAdv = adversaries.find((a) => a.id === qaFormData.adversary_id)
      const advName = selectedAdv?.name || 'o adversário'
      const candName = currentCampaign?.candidate_name || 'Nosso Candidato'

      // Mocked high quality campaign consultant answer based on state
      await new Promise((r) => setTimeout(r, 800))

      const topicName = TOPIC_LABELS[qaFormData.topic]?.label || qaFormData.topic
      const suggestedAnswer = `Destacar com serenidade os pilares do plano de governo em ${topicName}: "Enquanto ${advName} propõe promessas sem previsão orçamentária, nós já temos o plano estruturado e parcerias com o governo estadual para entregar resultados no 1º ano de gestão."`
      const suggestedCounter = `Caso ${advName} tente desviar para ataques pessoais: "Eleitor quer saber de solução para ${topicName}, não de ataques ensaiados em gabinete. Vamos falar do futuro da cidade."`
      const suggestedPoints = `Déficit orçamentário do setor: 15%; mais de 120 mil pessoas impactadas diretamente; meta de expansão de 30% em 2 anos.`

      setQaFormData((prev) => ({
        ...prev,
        prepared_answer: prev.prepared_answer ? prev.prepared_answer : suggestedAnswer,
        counter_attack: prev.counter_attack ? prev.counter_attack : suggestedCounter,
        key_data_points: prev.key_data_points ? prev.key_data_points : suggestedPoints,
      }))

      toast.success('Sugestões estratégicas formuladas pela IA!')
    } catch (err) {
      toast.error('Não foi possível gerar com IA no momento')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 text-slate-100 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#1e1b4b] p-4 sm:p-6 rounded-2xl text-white shadow-xl border border-amber-500/30 min-w-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 text-xs uppercase tracking-wider shrink-0 shadow-sm">
              <Swords className="w-3.5 h-3.5 mr-1" /> Sala de Preparação de Debate
            </Badge>
            <span className="text-xs text-amber-300/80 font-medium truncate">
              {currentCampaign?.candidate_name || 'Candidatura'} • Confronto Direto & Q&A
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Preparação Tática de Debates
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Mapeie pontos fracos dos adversários, prepare respostas contundentes, réplicas e dados
            de impacto para cada encontro televisivo.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <Button
            onClick={handleOpenCreateQA}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm h-9 sm:h-10 px-4 shadow-lg shadow-amber-500/20 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[3]" /> Nova Pergunta & Resposta
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenCreateAdv}
            className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-amber-400 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex-1 sm:flex-none justify-center"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Novo Adversário
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenCreateEvent}
            className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex-1 sm:flex-none justify-center"
          >
            <Calendar className="w-4 h-4 mr-1.5" /> Agendar Debate
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Prontidão */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Índice de Preparo
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2 flex items-baseline gap-1.5">
              {stats.percentDone}%
              <span className="text-xs font-normal text-slate-400">pronto/ensaiado</span>
            </div>
            <Progress value={stats.percentDone} className="h-1.5 bg-slate-800 mt-2.5" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>{stats.ready + stats.rehearsed} prontas</span>
              <span>{stats.underReview + stats.draft} em ajuste</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Perguntas Cadastradas */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Perguntas Mapeadas
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats.total}{' '}
              <span className="text-xs font-normal text-slate-400">respostas preparadas</span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-medium mt-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> {stats.rehearsed} totalmente ensaiadas
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Adversários Monitorados */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Adversários no Radar
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats.totalAdv}{' '}
              <span className="text-xs font-normal text-slate-400">candidatos perfilados</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Pontos fracos & polêmicas indexados</p>
          </CardContent>
        </Card>

        {/* Card 4: Próximos Debates */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Debates Agendados
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats.upcomingEvents}{' '}
              <span className="text-xs font-normal text-slate-400">encontros ao vivo</span>
            </div>
            <p className="text-[11px] text-blue-400 font-medium mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Próximo:{' '}
              {events[0]
                ? new Date(events[0].event_date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })
                : 'Nenhum'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl h-auto flex flex-wrap">
            <TabsTrigger
              value="qa"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <FileText className="w-4 h-4 mr-1.5" /> Perguntas & Respostas ({qaList.length})
            </TabsTrigger>
            <TabsTrigger
              value="adversaries"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Dossiê de Adversários ({adversaries.length}
              )
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Debates & Regras ({events.length})
            </TabsTrigger>
            <TabsTrigger
              value="simulator"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Mic className="w-4 h-4 mr-1.5" /> Simulador / Cronômetro
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: PERGUNTAS E RESPOSTAS */}
        <TabsContent value="qa" className="space-y-4 focus-visible:outline-none">
          {/* Filters Row */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <Input
                  placeholder="Buscar por pergunta, resposta, contra-ataque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Topic Filter */}
              <div>
                <Select value={topicFilter} onValueChange={setTopicFilter}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Tema" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="all">Todos os Temas</SelectItem>
                    {Object.entries(TOPIC_LABELS).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Adversary Filter */}
              <div>
                <Select value={adversaryFilter} onValueChange={setAdversaryFilter}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Adversário" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="all">Todos Adversários</SelectItem>
                    {adversaries.map((adv) => (
                      <SelectItem key={adv.id} value={adv.id}>
                        {adv.name} ({adv.party || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ready">Pronto</SelectItem>
                    <SelectItem value="rehearsed">Ensaiado</SelectItem>
                    <SelectItem value="under_review">Em Estudo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Type Filter */}
              <div>
                <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Tipo de Pergunta" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="to_adversary">Pergunta para Adversário</SelectItem>
                    <SelectItem value="from_adversary">Ataque do Adversário</SelectItem>
                    <SelectItem value="journalist">Pergunta de Jornalista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters bar if any active */}
            {(searchQuery ||
              topicFilter !== 'all' ||
              adversaryFilter !== 'all' ||
              statusFilter !== 'all' ||
              targetTypeFilter !== 'all') && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                <span>{filteredQAs.length} perguntas encontradas com os filtros atuais</span>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setTopicFilter('all')
                    setAdversaryFilter('all')
                    setStatusFilter('all')
                    setTargetTypeFilter('all')
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>

          {/* QA Cards Grid */}
          {filteredQAs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Nenhuma pergunta encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crie novas perguntas direcionadas para confrontos diretos, defesas preparadas contra
                ataques ou perguntas de bancada de jornalistas.
              </p>
              <Button
                onClick={handleOpenCreateQA}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Primeira Pergunta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredQAs.map((qa) => {
                const adv =
                  adversaries.find((a) => a.id === qa.adversary_id) || qa.expand?.adversary_id
                const ev = events.find((e) => e.id === qa.debate_id) || qa.expand?.debate_id
                const topicInfo = TOPIC_LABELS[qa.topic] || {
                  label: qa.topic,
                  color: 'bg-slate-800 text-slate-300',
                }
                const statusInfo = STATUS_CONFIG[qa.prep_status] || {
                  label: qa.prep_status,
                  badgeClass: '',
                }

                const typeBadge =
                  qa.target_type === 'to_adversary'
                    ? {
                        label: '⚔️ Ataque ao Adversário',
                        class: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                      }
                    : qa.target_type === 'from_adversary'
                      ? {
                          label: '🛡️ Defesa / Contra-ataque',
                          class: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                        }
                      : {
                          label: '🎙️ Pergunta de Jornalista',
                          class: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                        }

                return (
                  <div
                    key={qa.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-md group"
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 border ${topicInfo.color}`}
                        >
                          {topicInfo.label}
                        </Badge>

                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 border ${typeBadge.class}`}
                        >
                          {typeBadge.label}
                        </Badge>

                        {adv && (
                          <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                            <span className="text-slate-500 font-normal">Alvo:</span> {adv.name} (
                            {adv.party})
                          </span>
                        )}

                        {ev && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" /> {ev.title}
                          </span>
                        )}
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick status selector */}
                        <Select
                          value={qa.prep_status}
                          onValueChange={(val: DebatePrepStatus) =>
                            handleQuickStatusChange(qa, val)
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px] font-bold px-2.5 bg-slate-950 border-slate-800 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                            <SelectItem value="draft">Rascunho</SelectItem>
                            <SelectItem value="under_review">Em Estudo</SelectItem>
                            <SelectItem value="ready">Pronto</SelectItem>
                            <SelectItem value="rehearsed">Ensaiado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSimSelectedQA(qa)
                            setSimTimer(qa.time_limit_seconds || 60)
                            setSimTotalTime(qa.time_limit_seconds || 60)
                            setActiveTab('simulator')
                          }}
                          className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 font-bold"
                          title="Treinar no Cronômetro"
                        >
                          <Mic className="w-3.5 h-3.5 mr-1" /> Simular
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditQA(qa)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQA(qa.id)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Pergunta / Tema do Confronto</span>
                        <span className="text-slate-500 font-medium">
                          Tempo: {qa.time_limit_seconds || 60}s
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        "{qa.question}"
                      </p>
                    </div>

                    {/* 2-Col Grid: Resposta Preparada & Contra-ataque */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Prepared Answer */}
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resposta Preparada do Candidato
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {qa.prepared_answer || (
                            <span className="text-slate-500 italic">
                              Nenhuma resposta formulada ainda.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Counter Attack / Replica */}
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1">
                        <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5" /> Réplica / Contra-ataque Esperado
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {qa.counter_attack || (
                            <span className="text-slate-500 italic">
                              Nenhuma réplica cadastrada.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Key data points bar */}
                    {qa.key_data_points && (
                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-amber-300">
                            Dados de impacto para citar:{' '}
                          </strong>
                          <span>{qa.key_data_points}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: DOSSIÊ DE ADVERSÁRIOS */}
        <TabsContent value="adversaries" className="space-y-4 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Mapeamento de Candidatos Adversários
              </h3>
              <p className="text-xs text-slate-400">
                Pontos fortes, vulnerabilidades conhecidas, histórico de polêmicas e tom de debate.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateAdv}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" /> Cadastrar Adversário
            </Button>
          </div>

          {adversaries.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Nenhum adversário cadastrado</h4>
              <p className="text-xs text-slate-500">
                Adicione os principais candidatos para vincular perguntas de debate.
              </p>
              <Button
                onClick={handleOpenCreateAdv}
                size="sm"
                className="bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Novo Adversário
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adversaries.map((adv) => {
                const advQAs = qaList.filter((q) => q.adversary_id === adv.id)
                return (
                  <div
                    key={adv.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Top profile line */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={`https://img.usecurling.com/ppl/128?seed=${adv.avatar_seed || adv.name}`}
                            alt={adv.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/40 shrink-0 bg-slate-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-base text-white truncate flex items-center gap-2">
                              {adv.name}
                              {adv.candidate_number && (
                                <span className="font-mono text-xs bg-slate-950 border border-slate-700 text-amber-400 px-1.5 py-0.5 rounded">
                                  {adv.candidate_number}
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400 truncate">
                              {adv.party || 'Sem Partido'} • {adv.target_position || 'Prefeito'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditAdv(adv)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAdv(adv.id)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Style & Tone badge */}
                      {adv.style_tone && (
                        <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                          <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider block mb-0.5">
                            Estilo no Debate:
                          </span>
                          <p className="text-slate-300">{adv.style_tone}</p>
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                        {/* Strengths */}
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs space-y-1">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Pontos Fortes
                          </span>
                          <p className="text-slate-300 line-clamp-3">
                            {adv.strengths || 'Não detalhado.'}
                          </p>
                        </div>

                        {/* Weaknesses */}
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs space-y-1">
                          <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3 h-3" /> Vulnerabilidades
                          </span>
                          <p className="text-slate-300 line-clamp-3">
                            {adv.weaknesses || 'Não detalhado.'}
                          </p>
                        </div>
                      </div>

                      {/* Controversies */}
                      {adv.controversies && (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs space-y-1">
                          <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                            <Flame className="w-3 h-3" /> Histórico de Polêmicas / Passivos
                          </span>
                          <p className="text-slate-300">{adv.controversies}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom link to questions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {advQAs.length} perguntas vinculadas
                      </span>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setAdversaryFilter(adv.id)
                          setActiveTab('qa')
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold p-0 h-auto"
                      >
                        Ver perguntas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: DEBATES & REGRAS */}
        <TabsContent value="events" className="space-y-4 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Calendário Oficial de Debates & Encontros
              </h3>
              <p className="text-xs text-slate-400">
                Data, local, emissora organizadora e resumo das regras de tempo.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateEvent}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" /> Agendar Encontro
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Nenhum debate agendado</h4>
              <p className="text-xs text-slate-500">
                Cadastre os debates de TV, rádio ou sabatinas da campanha.
              </p>
              <Button
                onClick={handleOpenCreateEvent}
                size="sm"
                className="bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Novo Debate
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => {
                const evDate = new Date(ev.event_date)
                const formattedDate = evDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
                const formattedTime = evDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const evQAs = qaList.filter((q) => q.debate_id === ev.id)

                const isUpcoming = ev.status === 'upcoming'

                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge
                            className={`text-[10px] font-bold px-2 py-0.5 uppercase mb-2 ${
                              isUpcoming
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ev.status === 'upcoming'
                              ? 'Agendado'
                              : ev.status === 'completed'
                                ? 'Realizado'
                                : ev.status}
                          </Badge>
                          <h4 className="font-extrabold text-base text-white leading-snug">
                            {ev.title}
                          </h4>
                          <p className="text-xs text-amber-400 font-semibold mt-0.5">
                            {ev.broadcaster || 'Emissora / Veículo'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditEvent(ev)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Date & Location */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 mt-3">
                        <div className="flex items-center gap-2 text-slate-200 font-semibold capitalize">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {formattedDate} às {formattedTime}
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {ev.location}
                          </div>
                        )}
                      </div>

                      {/* Rules Summary */}
                      {ev.rules_summary && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                          <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                            Regras & Dinâmica de Blocos:
                          </span>
                          <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {ev.rules_summary}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {ev.notes && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90">
                          <strong>Observação tática: </strong> {ev.notes}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{evQAs.length} perguntas vinculadas</span>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setDebateFilter(ev.id)
                          setActiveTab('qa')
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold p-0 h-auto"
                      >
                        Filtrar perguntas do debate <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: SIMULADOR / TELEPROMPTER / CRONÔMETRO */}
        <TabsContent value="simulator" className="space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: QA Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" /> Selecione para Ensaiar
                </h4>
                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                  {qaList.length} perguntas
                </Badge>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {qaList.map((qa) => {
                  const isSelected = simSelectedQA?.id === qa.id
                  const adv = adversaries.find((a) => a.id === qa.adversary_id)
                  return (
                    <div
                      key={qa.id}
                      onClick={() => {
                        setSimSelectedQA(qa)
                        setSimTimer(qa.time_limit_seconds || 60)
                        setSimTotalTime(qa.time_limit_seconds || 60)
                        setSimRunning(false)
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="uppercase text-amber-400">
                          {TOPIC_LABELS[qa.topic]?.label || qa.topic}
                        </span>
                        <span>{qa.time_limit_seconds || 60}s</span>
                      </div>
                      <p className="text-xs font-semibold line-clamp-2">{qa.question}</p>
                      {adv && (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          vs. {adv.name}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right 2 Cols: Simulation Stage */}
            <div className="lg:col-span-2 space-y-4">
              {simSelectedQA ? (
                <Card className="bg-slate-900/90 border-slate-800 text-white shadow-xl">
                  <CardHeader className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                          Modo Ensaio de Palco
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {TOPIC_LABELS[simSelectedQA.topic]?.label || simSelectedQA.topic}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold text-white mt-1">
                        {simSelectedQA.target_type === 'to_adversary'
                          ? 'Pergunta a ser feita pelo candidato'
                          : 'Resposta ao ataque esperado'}
                      </CardTitle>
                    </div>

                    {/* Timer big display */}
                    <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tempo Restante
                        </div>
                        <div
                          className={`text-2xl font-black font-mono leading-none ${
                            simTimer <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
                          }`}
                        >
                          {Math.floor(simTimer / 60)}:{(simTimer % 60).toString().padStart(2, '0')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => setSimRunning(!simRunning)}
                          className={`h-9 w-9 p-0 font-bold ${
                            simRunning
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {simRunning ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSimRunning(false)
                            setSimTimer(simTotalTime)
                          }}
                          className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 sm:p-6 space-y-5">
                    {/* Teleprompter Question */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        Pergunta / Disparo:
                      </span>
                      <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                        "{simSelectedQA.question}"
                      </p>
                    </div>

                    {/* Prepared Answer in Large Teleprompter Format */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 shadow-inner space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Resposta & Roteiro do Candidato
                          (Teleprompter)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Falar com firmeza e contato visual
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium whitespace-pre-wrap">
                        {simSelectedQA.prepared_answer ||
                          'Nenhuma resposta formulada para esta pergunta.'}
                      </p>
                    </div>

                    {/* Counter attack & Data points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {simSelectedQA.counter_attack && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/20 text-xs space-y-1">
                          <span className="font-bold text-rose-400 flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5" /> Réplica / Contra-ataque
                          </span>
                          <p className="text-slate-300 leading-relaxed">
                            {simSelectedQA.counter_attack}
                          </p>
                        </div>
                      )}

                      {simSelectedQA.key_data_points && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/20 text-xs space-y-1">
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Dados para Citar
                          </span>
                          <p className="text-slate-300 leading-relaxed">
                            {simSelectedQA.key_data_points}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mark Rehearsed Button */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <Button
                        onClick={() => handleQuickStatusChange(simSelectedQA, 'rehearsed')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Marcar como Ensaiado & Pronto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
                  Selecione uma pergunta na coluna ao lado para iniciar o ensaio cronometrado.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Criar / Editar Pergunta e Resposta */}
      <Dialog open={qaModalOpen} onOpenChange={setQaModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              {editingQA ? 'Editar Pergunta de Debate' : 'Nova Pergunta & Resposta Preparada'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cadastre o tema, oponente alvo, pergunta, argumentos de resposta e contra-ataques
              táticos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Row 1: Debate & Adversário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Debate / Encontro Vinculado
                </Label>
                <Select
                  value={qaFormData.debate_id}
                  onValueChange={(val) => setQaFormData({ ...qaFormData, debate_id: val })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Selecione o debate" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="">Nenhum debate específico</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Adversário Alvo / Oponente
                </Label>
                <Select
                  value={qaFormData.adversary_id}
                  onValueChange={(val) => setQaFormData({ ...qaFormData, adversary_id: val })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Selecione o adversário" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="">Geral / Sem oponente específico</SelectItem>
                    {adversaries.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.party || 'Sem Partido'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Tema & Tipo de Pergunta & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Tema</Label>
                <Select
                  value={qaFormData.topic}
                  onValueChange={(val: DebateTopic) => setQaFormData({ ...qaFormData, topic: val })}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    {Object.entries(TOPIC_LABELS).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Direção da Pergunta</Label>
                <Select
                  value={qaFormData.target_type}
                  onValueChange={(val: DebateTargetType) =>
                    setQaFormData({ ...qaFormData, target_type: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="to_adversary">Pergunta para Adversário</SelectItem>
                    <SelectItem value="from_adversary">Ataque do Adversário</SelectItem>
                    <SelectItem value="journalist">Pergunta de Jornalista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Status de Preparo</Label>
                <Select
                  value={qaFormData.prep_status}
                  onValueChange={(val: DebatePrepStatus) =>
                    setQaFormData({ ...qaFormData, prep_status: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="under_review">Em Estudo</SelectItem>
                    <SelectItem value="ready">Pronto</SelectItem>
                    <SelectItem value="rehearsed">Ensaiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pergunta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-300">
                  Texto da Pergunta / Tema do Confronto *
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerateAiSuggestions}
                  disabled={isGeneratingAi}
                  className="h-6 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-semibold"
                >
                  <Bot className="w-3.5 h-3.5 mr-1" />
                  {isGeneratingAi ? 'Gerando com IA...' : 'Sugerir Argumentos com IA'}
                </Button>
              </div>
              <Textarea
                rows={2}
                placeholder="Ex: Candidato, a fila do SUS para exames em SP ultrapassa 6 meses. O que o senhor fez de concreto além de promessas?"
                value={qaFormData.question}
                onChange={(e) => setQaFormData({ ...qaFormData, question: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {/* Resposta Preparada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resposta Preparada do Candidato (O que
                falar)
              </Label>
              <Textarea
                rows={3}
                placeholder="Diretrizes da resposta, tom de voz, compromissos concretos e plano de ação."
                value={qaFormData.prepared_answer}
                onChange={(e) => setQaFormData({ ...qaFormData, prepared_answer: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {/* Réplica / Contra-ataque */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" /> Réplica / Contra-ataque ou Possível Reação do
                Oponente
              </Label>
              <Textarea
                rows={2}
                placeholder="O que o adversário vai tentar responder ou como rebater caso ele apele para ataques."
                value={qaFormData.counter_attack}
                onChange={(e) => setQaFormData({ ...qaFormData, counter_attack: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {/* Dados-chave e Tempo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Dados & Estatísticas para Citar
                </Label>
                <Input
                  placeholder="Ex: 640 mil na fila; R$ 1,2 bi contingenciado em 2023."
                  value={qaFormData.key_data_points}
                  onChange={(e) =>
                    setQaFormData({ ...qaFormData, key_data_points: e.target.value })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Tempo Limite (segundos)</Label>
                <Input
                  type="number"
                  min="15"
                  max="300"
                  step="15"
                  value={qaFormData.time_limit_seconds}
                  onChange={(e) =>
                    setQaFormData({
                      ...qaFormData,
                      time_limit_seconds: parseInt(e.target.value, 10) || 60,
                    })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQaModalOpen(false)}
              className="text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveQA}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {editingQA ? 'Salvar Alterações' : 'Cadastrar Pergunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Criar / Editar Adversário */}
      <Dialog open={advModalOpen} onOpenChange={setAdvModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              {editingAdv ? 'Editar Adversário' : 'Novo Perfil de Adversário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Mapeie pontos fortes, fragilidades e passivos políticos do oponente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Nome do Candidato *</Label>
                <Input
                  placeholder="Ex: Guilherme Boulos"
                  value={advFormData.name}
                  onChange={(e) => setAdvFormData({ ...advFormData, name: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Partido & Número</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="PSOL"
                    value={advFormData.party}
                    onChange={(e) => setAdvFormData({ ...advFormData, party: e.target.value })}
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 flex-1"
                  />
                  <Input
                    placeholder="50"
                    value={advFormData.candidate_number}
                    onChange={(e) =>
                      setAdvFormData({ ...advFormData, candidate_number: e.target.value })
                    }
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 w-16"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Estilo e Tom no Debate</Label>
              <Input
                placeholder="Ex: Combativo, retórica rápida, tenta pautar desigualdade social."
                value={advFormData.style_tone}
                onChange={(e) => setAdvFormData({ ...advFormData, style_tone: e.target.value })}
                className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-emerald-400">
                Pontos Fortes / Virtudes do Oponente
              </Label>
              <Textarea
                rows={2}
                placeholder="Boa oratória, carisma em redes, base militante fiel..."
                value={advFormData.strengths}
                onChange={(e) => setAdvFormData({ ...advFormData, strengths: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-rose-400">
                Pontos Fracos / Vulnerabilidades Políticas
              </Label>
              <Textarea
                rows={2}
                placeholder="Falta de experiência executiva, alta rejeição em segmentos..."
                value={advFormData.weaknesses}
                onChange={(e) => setAdvFormData({ ...advFormData, weaknesses: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-amber-400">
                Histórico de Polêmicas & Passivos
              </Label>
              <Textarea
                rows={2}
                placeholder="Votações contraditórias, processos, alianças controversas..."
                value={advFormData.controversies}
                onChange={(e) => setAdvFormData({ ...advFormData, controversies: e.target.value })}
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdvModalOpen(false)}
              className="text-xs bg-slate-800 border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdv}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {editingAdv ? 'Salvar Adversário' : 'Cadastrar Adversário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Criar / Editar Debate */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              {editingEvent ? 'Editar Debate' : 'Agendar Novo Debate'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registre a data, emissora e tempos de réplica do encontro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Título do Debate *</Label>
              <Input
                placeholder="Ex: Debate Band SP 2024 - 1º Turno"
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Emissora / Organizador</Label>
                <Input
                  placeholder="Ex: Rede Bandeirantes / UOL"
                  value={eventFormData.broadcaster}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, broadcaster: e.target.value })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={eventFormData.event_date}
                  onChange={(e) =>
                    setEventFormData({ ...eventFormData, event_date: e.target.value })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Local / Estúdio</Label>
              <Input
                placeholder="Ex: Estúdios Band Morumbi, SP"
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Resumo das Regras e Tempos</Label>
              <Textarea
                rows={3}
                placeholder="Ex: Bloco 1 (1m pergunta, 2m resposta, 1m réplica). Bloco 2 confronto direto livre..."
                value={eventFormData.rules_summary}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, rules_summary: e.target.value })
                }
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">
                Notas Internas de Coordenação
              </Label>
              <Input
                placeholder="Ex: Focar em mobilidade e saúde; manter tom propositivo."
                value={eventFormData.notes}
                onChange={(e) => setEventFormData({ ...eventFormData, notes: e.target.value })}
                className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEventModalOpen(false)}
              className="text-xs bg-slate-800 border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEvent}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {editingEvent ? 'Salvar Debate' : 'Agendar Debate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
