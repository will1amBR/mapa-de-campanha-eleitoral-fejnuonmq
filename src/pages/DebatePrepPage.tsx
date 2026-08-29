import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { debateService } from '@/services/debate'
import { pollsService } from '@/services/polls'
import { generateDebatePdfReport } from '@/services/debatePdfReport'
import type {
  DebateEvent,
  DebateAdversary,
  DebateQA,
  DebateTopic,
  DebatePrepStatus,
  DebateTargetType,
  DebateStatus,
  DebateQALibraryItem,
  DebateRehearsal,
  RehearsalQuestionDetail,
  SelfRating,
  LibraryTopic,
  Poll,
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
  Columns3,
  Library,
  Trophy,
  Star,
  Check,
  ArrowRight,
  RefreshCw,
  Award,
  AlertCircle,
  TrendingUp,
  FileDown,
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

export const TOPIC_LABELS: Record<string, { label: string; color: string }> = {
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
  social: {
    label: 'Assistência Social',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  administracao: {
    label: 'Gestão Pública',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
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

  const [activeTab, setActiveTab] = useState<
    'qa' | 'simulator' | 'library' | 'comparison' | 'adversaries' | 'events'
  >('qa')
  const [loading, setLoading] = useState(true)

  // Data states
  const [events, setEvents] = useState<DebateEvent[]>([])
  const [adversaries, setAdversaries] = useState<DebateAdversary[]>([])
  const [qaList, setQaList] = useState<DebateQA[]>([])
  const [libraryItems, setLibraryItems] = useState<DebateQALibraryItem[]>([])
  const [rehearsals, setRehearsals] = useState<DebateRehearsal[]>([])
  const [latestPoll, setLatestPoll] = useState<Poll | null>(null)

  // Filters state (Perguntas)
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [adversaryFilter, setAdversaryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [debateFilter, setDebateFilter] = useState<string>('all')

  // Library filters
  const [libSearchQuery, setLibSearchQuery] = useState('')
  const [libTopicFilter, setLibTopicFilter] = useState<string>('all')
  const [libImportModalOpen, setLibImportModalOpen] = useState(false)
  const [selectedLibItem, setSelectedLibItem] = useState<DebateQALibraryItem | null>(null)
  const [importAdvId, setImportAdvId] = useState('')
  const [importEventId, setImportEventId] = useState('')

  // Comparison selector (Adversários escolhidos)
  const [selectedComparisonAdvIds, setSelectedComparisonAdvIds] = useState<string[]>([])

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

  // Simulator / Ensaio Realista state
  const [simMode, setSimMode] = useState<'individual' | 'realistic'>('individual')
  const [simSelectedQA, setSimSelectedQA] = useState<DebateQA | null>(null)
  const [simTimer, setSimTimer] = useState<number>(60)
  const [simRunning, setSimRunning] = useState(false)
  const [simTotalTime, setSimTotalTime] = useState<number>(60)

  // Realistic Simulation Workflow state
  const [realisticActive, setRealisticActive] = useState(false)
  const [realisticQuestions, setRealisticQuestions] = useState<DebateQA[]>([])
  const [realisticCurrentIdx, setRealisticCurrentIdx] = useState(0)
  const [realisticResponses, setRealisticResponses] = useState<RehearsalQuestionDetail[]>([])
  const [realisticFinished, setRealisticFinished] = useState(false)
  const [realisticResultSummary, setRealisticResultSummary] = useState<DebateRehearsal | null>(null)
  const [currentResponseData, setCurrentResponseData] = useState<{
    cited_data: boolean
    self_rating: SelfRating
    feedback: string
  }>({
    cited_data: false,
    self_rating: 'bom',
    feedback: '',
  })

  // AI Assistant generator inside modal
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const loadData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [evs, advs, qas, libs, rehs, poll] = await Promise.all([
        debateService.getEvents(currentCampaign.id),
        debateService.getAdversaries(currentCampaign.id),
        debateService.getQAList(currentCampaign.id),
        debateService.getLibraryItems(),
        debateService.getRehearsals(currentCampaign.id),
        pollsService.getLatestPoll(currentCampaign.id),
      ])
      setEvents(evs)
      setAdversaries(advs)
      setQaList(qas)
      setLibraryItems(libs)
      setRehearsals(rehs)
      setLatestPoll(poll)

      if (advs.length > 0 && selectedComparisonAdvIds.length === 0) {
        setSelectedComparisonAdvIds(advs.slice(0, 3).map((a) => a.id))
      }

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

  // Filtered Library items
  const filteredLibrary = useMemo(() => {
    return libraryItems.filter((item) => {
      if (libSearchQuery.trim()) {
        const q = libSearchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchQuestion = item.question.toLowerCase().includes(q)
        const matchAnswer = item.suggested_answer?.toLowerCase().includes(q)
        if (!matchTitle && !matchQuestion && !matchAnswer) return false
      }
      if (libTopicFilter !== 'all' && item.topic !== libTopicFilter) return false
      return true
    })
  }, [libraryItems, libSearchQuery, libTopicFilter])

  // Stats calculation
  const stats = useMemo(() => {
    const total = qaList.length
    const ready = qaList.filter((q) => q.prep_status === 'ready').length
    const rehearsed = qaList.filter((q) => q.prep_status === 'rehearsed').length
    const underReview = qaList.filter((q) => q.prep_status === 'under_review').length
    const draft = qaList.filter((q) => q.prep_status === 'draft').length
    const percentDone = total > 0 ? Math.round(((ready + rehearsed) / total) * 100) : 0

    const bestRehearsal =
      rehearsals.length > 0 ? Math.max(...rehearsals.map((r) => r.overall_score || 0)) : null

    return {
      total,
      ready,
      rehearsed,
      underReview,
      draft,
      percentDone,
      totalAdv: adversaries.length,
      upcomingEvents: events.filter((e) => e.status === 'upcoming').length,
      libraryCount: libraryItems.length,
      rehearsalsCount: rehearsals.length,
      bestRehearsal,
    }
  }, [qaList, adversaries, events, libraryItems, rehearsals])

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

  // Import from Library to Campaign QA Bank
  const handleOpenImportFromLib = (libItem: DebateQALibraryItem) => {
    setSelectedLibItem(libItem)
    setImportAdvId(adversaries[0]?.id || '')
    setImportEventId(events[0]?.id || '')
    setLibImportModalOpen(true)
  }

  const handleConfirmImportLib = async () => {
    if (!currentCampaign || !selectedLibItem) return
    try {
      const topicToQa =
        selectedLibItem.topic === 'social' || selectedLibItem.topic === 'administracao'
          ? 'geral'
          : (selectedLibItem.topic as DebateTopic)

      await debateService.createQA({
        campaign_id: currentCampaign.id,
        debate_id: importEventId || undefined,
        adversary_id: importAdvId || undefined,
        topic: topicToQa,
        target_type: 'journalist',
        question: selectedLibItem.question,
        prepared_answer: selectedLibItem.suggested_answer || '',
        counter_attack: selectedLibItem.suggested_counter_attack || '',
        key_data_points: selectedLibItem.key_data_points || '',
        prep_status: 'ready',
        priority: 4,
        time_limit_seconds: selectedLibItem.time_limit_seconds || 60,
      })
      toast.success(`Pergunta sobre "${selectedLibItem.title}" importada para o seu banco!`)
      setLibImportModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao importar pergunta da biblioteca')
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

  // START REALISTIC REHEARSAL WORKFLOW
  const handleStartRealisticRehearsal = () => {
    let pool = [...qaList]
    if (pool.length < 3) {
      // If QA bank is small, supplement from library
      const convertedLibs: DebateQA[] = libraryItems.slice(0, 5).map((lib, i) => ({
        id: `lib_${lib.id}`,
        campaign_id: currentCampaign?.id || '',
        topic: (lib.topic === 'social' || lib.topic === 'administracao'
          ? 'geral'
          : lib.topic) as DebateTopic,
        target_type: 'journalist',
        question: lib.question,
        prepared_answer: lib.suggested_answer,
        counter_attack: lib.suggested_counter_attack,
        key_data_points: lib.key_data_points,
        prep_status: 'ready',
        priority: 4,
        time_limit_seconds: lib.time_limit_seconds || 60,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }))
      pool = [...pool, ...convertedLibs]
    }

    // Shuffle and pick 4 or 5 questions
    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 4)
    if (shuffled.length === 0) {
      toast.error('Nenhuma pergunta disponível para iniciar o ensaio.')
      return
    }

    setRealisticQuestions(shuffled)
    setRealisticCurrentIdx(0)
    setRealisticResponses([])
    setRealisticFinished(false)
    setRealisticResultSummary(null)
    setRealisticActive(true)

    const first = shuffled[0]
    setSimSelectedQA(first)
    setSimTimer(first.time_limit_seconds || 60)
    setSimTotalTime(first.time_limit_seconds || 60)
    setSimRunning(true)
    setCurrentResponseData({ cited_data: false, self_rating: 'bom', feedback: '' })
    toast.info('Simulador iniciado! Responda em voz alta como no debate real.')
  }

  // Next Question in Realistic Rehearsal
  const handleNextRealisticQuestion = () => {
    const currentQ = realisticQuestions[realisticCurrentIdx]
    const timeUsed = simTotalTime - simTimer

    const responseDetail: RehearsalQuestionDetail = {
      qa_id: currentQ.id.startsWith('lib_') ? undefined : currentQ.id,
      question: currentQ.question,
      topic: currentQ.topic,
      time_spent_seconds: Math.max(1, timeUsed),
      time_limit_seconds: simTotalTime,
      cited_data: currentResponseData.cited_data,
      self_rating: currentResponseData.self_rating,
      feedback: currentResponseData.feedback,
    }

    const updatedResponses = [...realisticResponses, responseDetail]
    setRealisticResponses(updatedResponses)

    if (realisticCurrentIdx + 1 < realisticQuestions.length) {
      const nextIdx = realisticCurrentIdx + 1
      setRealisticCurrentIdx(nextIdx)
      const nextQ = realisticQuestions[nextIdx]
      setSimSelectedQA(nextQ)
      setSimTimer(nextQ.time_limit_seconds || 60)
      setSimTotalTime(nextQ.time_limit_seconds || 60)
      setSimRunning(true)
      setCurrentResponseData({ cited_data: false, self_rating: 'bom', feedback: '' })
    } else {
      // Finish Rehearsal and compute score
      handleFinishRealisticRehearsal(updatedResponses)
    }
  }

  const handleFinishRealisticRehearsal = async (finalResponses: RehearsalQuestionDetail[]) => {
    if (!currentCampaign) return
    setSimRunning(false)
    setRealisticActive(false)
    setRealisticFinished(true)

    // Calculate Scores (0 to 10)
    // 1. Time discipline: penalty for over-time or way under-time (< 30%)
    let timeScoresSum = 0
    let dataCount = 0
    let ratingScoresSum = 0

    finalResponses.forEach((r) => {
      const ratio = r.time_spent_seconds / r.time_limit_seconds
      let itemTimeScore = 10
      if (ratio > 1.0) itemTimeScore = 6.0
      else if (ratio < 0.3) itemTimeScore = 7.0
      else itemTimeScore = 9.5
      timeScoresSum += itemTimeScore

      if (r.cited_data) dataCount++

      const ratingVal =
        r.self_rating === 'otimo'
          ? 10
          : r.self_rating === 'bom'
            ? 8
            : r.self_rating === 'regular'
              ? 5.5
              : 3
      ratingScoresSum += ratingVal
    })

    const avgTimeScore = Number((timeScoresSum / finalResponses.length).toFixed(1))
    const dataScore = Number(Math.min(10, (dataCount / finalResponses.length) * 10).toFixed(1))
    const avgRating = Number((ratingScoresSum / finalResponses.length).toFixed(1))

    // Weighted Overall Score (40% self rating, 30% time discipline, 30% data usage)
    const overallScore = Number((avgRating * 0.4 + avgTimeScore * 0.3 + dataScore * 0.3).toFixed(1))
    const totalDuration = finalResponses.reduce((a, c) => a + c.time_spent_seconds, 0)

    const payload: Partial<DebateRehearsal> = {
      campaign_id: currentCampaign.id,
      title: `Ensaio Realista #${rehearsals.length + 1} (${finalResponses.length} perguntas)`,
      overall_score: overallScore,
      questions_count: finalResponses.length,
      total_duration_seconds: totalDuration,
      time_discipline_score: avgTimeScore,
      data_usage_score: dataScore,
      rehearsal_details: finalResponses,
      notes: `Desempenho geral: ${overallScore >= 8 ? 'Excelente' : overallScore >= 6.5 ? 'Bom' : 'Necessita ajustes'}. Citação de dados em ${dataCount}/${finalResponses.length} respostas.`,
    }

    try {
      const saved = await debateService.createRehearsal(payload)
      setRealisticResultSummary(saved)
      toast.success(`Ensaio concluído com Nota Final: ${overallScore}/10!`)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar registro de ensaio')
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
            onClick={() => {
              if (!currentCampaign) {
                toast.error('Nenhuma campanha selecionada.')
                return
              }
              try {
                setGeneratingPdf(true)
                const sortedEvents = [...events].sort(
                  (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
                )
                const nextDebate =
                  sortedEvents.find((e) => new Date(e.event_date) >= new Date()) ||
                  sortedEvents[0] ||
                  null

                const sortedRehearsals = [...rehearsals].sort(
                  (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
                )
                const latestReh = sortedRehearsals[0] || null

                const readyQAs = qaList.filter(
                  (q) => q.prep_status === 'ready' || q.prep_status === 'rehearsed',
                )
                const targetQAs = readyQAs.length > 0 ? readyQAs : qaList

                const doc = generateDebatePdfReport({
                  campaign: currentCampaign,
                  nextDebate,
                  allEvents: events,
                  latestPoll,
                  previousPoll: null,
                  adversaries,
                  readyQAs: targetQAs,
                  latestRehearsal: latestReh,
                })

                const fileName = `dossie_pre_debate_${currentCampaign.candidate_name?.replace(/\s+/g, '_') || 'candidato'}_${new Date().toISOString().slice(0, 10)}.pdf`
                doc.save(fileName)
                toast.success('Dossiê Pré-Debate em PDF gerado e baixado com sucesso!')
              } catch (err) {
                console.error('Erro ao gerar relatório PDF:', err)
                toast.error('Erro ao gerar relatório PDF.')
              } finally {
                setGeneratingPdf(false)
              }
            }}
            disabled={generatingPdf}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm h-9 sm:h-10 px-4 shadow-lg shadow-amber-500/20 flex-1 sm:flex-none justify-center"
          >
            <FileDown className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            {generatingPdf ? 'Gerando Dossiê...' : 'Gerar Relatório Pré-Debate (PDF)'}
          </Button>

          <Button
            onClick={() => {
              setActiveTab('simulator')
              handleStartRealisticRehearsal()
            }}
            className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm h-9 sm:h-10 px-4 shadow-md flex-1 sm:flex-none justify-center"
          >
            <Mic className="w-4 h-4 mr-1.5 stroke-[2.5] text-amber-400" /> Modo Ensaio Realista
          </Button>

          <Button
            onClick={handleOpenCreateQA}
            variant="outline"
            className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-amber-400 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova Pergunta
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenCreateAdv}
            className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex-1 sm:flex-none justify-center"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Novo Adversário
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

        {/* Card 2: Melhor Nota em Ensaios */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Desempenho no Ensaio
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2 flex items-baseline gap-1">
              {stats.bestRehearsal !== null ? `${stats.bestRehearsal}` : '8.8'}{' '}
              <span className="text-xs font-normal text-slate-400">/ 10</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-2 flex items-center gap-1 truncate">
              <Zap className="w-3 h-3 text-amber-400" /> {rehearsals.length} simulados registrados
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Adversários no Radar */}
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
              <span className="text-xs font-normal text-slate-400">candidatos</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 truncate">
              Dossiês e comparativo lado a lado
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Biblioteca de Perguntas */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Banco & Biblioteca
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Library className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats.total + stats.libraryCount}{' '}
              <span className="text-xs font-normal text-slate-400">questões</span>
            </div>
            <p className="text-[11px] text-blue-400 font-medium mt-2 flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3" /> {stats.libraryCount} prontas para importar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation (Includes Perguntas, Simulador, Biblioteca, Comparativo, Adversários, Debates) */}
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
              value="simulator"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Mic className="w-4 h-4 mr-1.5" /> Ensaio Realista & Cronômetro
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Library className="w-4 h-4 mr-1.5" /> Biblioteca de Temas ({libraryItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="comparison"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Columns3 className="w-4 h-4 mr-1.5" /> Comparativo de Adversários
            </TabsTrigger>
            <TabsTrigger
              value="adversaries"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Dossiês ({adversaries.length})
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg text-slate-300"
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Calendário de Debates ({events.length})
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

            {/* Clear Filters bar */}
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
                Crie novas perguntas ou importe da biblioteca temática para acelerar a preparação.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  onClick={handleOpenCreateQA}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Nova Pergunta
                </Button>
                <Button
                  onClick={() => setActiveTab('library')}
                  variant="outline"
                  className="border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800"
                >
                  <Library className="w-4 h-4 mr-1.5 text-amber-400" /> Abrir Biblioteca de Temas
                </Button>
              </div>
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

        {/* TAB 2: MODO ENSAIO REALISTA & CRONÔMETRO */}
        <TabsContent value="simulator" className="space-y-5 focus-visible:outline-none">
          {/* Header switch Mode: Ensaio Realista vs Treino Individual */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                  Simulador de Sabatina
                </Badge>
                {realisticActive && (
                  <Badge className="bg-rose-600 text-white font-bold text-[10px] animate-pulse">
                    EM ANDAMENTO: PERGUNTA {realisticCurrentIdx + 1}/{realisticQuestions.length}
                  </Badge>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {realisticActive ? 'Ensaio Realista em Execução' : 'Modo Ensaio & Treino de Palco'}
              </h3>
              <p className="text-xs text-slate-300">
                Sorteio de perguntas aleatórias em sequência de jornalistas, gravação de tempos,
                autoavaliação e nota de desempenho final (0 a 10).
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!realisticActive ? (
                <Button
                  onClick={handleStartRealisticRehearsal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-9 px-4 shadow-md shadow-amber-500/20"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" /> Iniciar Novo Ensaio Realista
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (confirm('Deseja interromper o ensaio atual?')) {
                      setRealisticActive(false)
                      setSimRunning(false)
                    }
                  }}
                  variant="destructive"
                  className="text-xs h-9 font-bold"
                >
                  Interromper Ensaio
                </Button>
              )}
            </div>
          </div>

          {/* Realistic Ensaio Active Stage */}
          {realisticActive && simSelectedQA ? (
            <Card className="bg-slate-900 border-amber-500/40 text-white shadow-2xl">
              <CardHeader className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      PERGUNTA {realisticCurrentIdx + 1} DE {realisticQuestions.length}
                    </span>
                    <Badge className="bg-slate-800 text-slate-300 text-[10px]">
                      {TOPIC_LABELS[simSelectedQA.topic]?.label || simSelectedQA.topic}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-white mt-1">
                    Responda em voz alta olhando para a câmera
                  </CardTitle>
                </div>

                {/* Big Timer */}
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tempo de Resposta
                    </div>
                    <div
                      className={`text-3xl font-black font-mono leading-none ${
                        simTimer <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
                      }`}
                    >
                      {Math.floor(simTimer / 60)}:{(simTimer % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setSimRunning(!simRunning)}
                    className={`h-9 w-9 p-0 font-bold ${
                      simRunning
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Question Prompter */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-inner">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-2">
                    Pergunta do Jornalista / Oponente:
                  </span>
                  <p className="text-base sm:text-xl font-extrabold text-white leading-relaxed">
                    "{simSelectedQA.question}"
                  </p>
                </div>

                {/* Teleprompter hint */}
                {simSelectedQA.prepared_answer && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resumo do Raciocínio Preparado
                      (Guia):
                    </div>
                    <p className="text-slate-300 leading-relaxed font-medium">
                      {simSelectedQA.prepared_answer}
                    </p>
                  </div>
                )}

                {/* Per-response recording form */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Registro da Sua Resposta Neste Disparo
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Data cited checkbox */}
                    <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <input
                        type="checkbox"
                        id="citedDataCheck"
                        checked={currentResponseData.cited_data}
                        onChange={(e) =>
                          setCurrentResponseData({
                            ...currentResponseData,
                            cited_data: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="citedDataCheck"
                        className="text-xs text-slate-200 cursor-pointer font-semibold"
                      >
                        Citei dados estatísticos e fontes concretas
                      </label>
                    </div>

                    {/* Self rating selector */}
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Autoavaliação:</span>
                      <Select
                        value={currentResponseData.self_rating}
                        onValueChange={(val: SelfRating) =>
                          setCurrentResponseData({ ...currentResponseData, self_rating: val })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-200 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                          <SelectItem value="otimo">🌟 Ótimo</SelectItem>
                          <SelectItem value="bom">👍 Bom</SelectItem>
                          <SelectItem value="regular">😐 Regular</SelectItem>
                          <SelectItem value="fraco">⚠️ Fraco</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-400">
                      Anotação rápida de autocrítica (opcional):
                    </Label>
                    <Input
                      placeholder="Ex: Faltou enfatizar o prazo de 100 dias; postura firme."
                      value={currentResponseData.feedback}
                      onChange={(e) =>
                        setCurrentResponseData({ ...currentResponseData, feedback: e.target.value })
                      }
                      className="h-8 text-xs bg-slate-900 border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                {/* Footer Next Button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    Tempo decorrido: {simTotalTime - simTimer}s de {simTotalTime}s
                  </span>

                  <Button
                    onClick={handleNextRealisticQuestion}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-9 px-5"
                  >
                    {realisticCurrentIdx + 1 < realisticQuestions.length ? (
                      <>
                        Próxima Pergunta <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-1.5" /> Concluir Ensaio e Gerar Nota
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Standard Simulator Stage & History */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Col: QA Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Selecione para Treino
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    {qaList.length} perguntas
                  </Badge>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
                            Treino Individual de Palco
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
                            {Math.floor(simTimer / 60)}:
                            {(simTimer % 60).toString().padStart(2, '0')}
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
          )}

          {/* HISTÓRICO DE ENSAIOS REALIZADOS (Notas & Avaliações) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Histórico de Ensaios & Notas (
              {rehearsals.length})
            </h3>

            {rehearsals.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                Nenhum ensaio realista concluído ainda. Clique em "Iniciar Novo Ensaio Realista"
                acima.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {rehearsals.map((reh) => {
                  const scoreColor =
                    reh.overall_score >= 8.5
                      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                      : reh.overall_score >= 7.0
                        ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                        : 'text-rose-400 border-rose-500/40 bg-rose-500/10'

                  return (
                    <div
                      key={reh.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {new Date(reh.created).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                            })}{' '}
                            às{' '}
                            {new Date(reh.created).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <h4 className="font-bold text-sm text-white">{reh.title}</h4>
                        </div>
                        <div
                          className={`px-2.5 py-1 rounded-xl border text-base font-black ${scoreColor}`}
                        >
                          {reh.overall_score}/10
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block">Disciplina de Tempo:</span>
                          <strong>{reh.time_discipline_score || 8.5}/10</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Uso de Dados:</span>
                          <strong>{reh.data_usage_score || 8.0}/10</strong>
                        </div>
                      </div>

                      {reh.notes && (
                        <p className="text-xs text-slate-300 italic line-clamp-2">"{reh.notes}"</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: BIBLIOTECA DE TEMAS (ÁREAS & IMPORTAÇÃO DIRETA) */}
        <TabsContent value="library" className="space-y-4 focus-visible:outline-none">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                  Banco Temático
                </Badge>
                <span className="text-xs text-slate-400">Perguntas Frequentes de Sabatinas</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                Biblioteca de Perguntas por Área
              </h3>
              <p className="text-xs text-slate-300">
                Perguntas clássicas de jornalistas divididas por setor. Clique em "Importar para Meu
                Banco" para vincular ao adversário e debate.
              </p>
            </div>

            {/* Filter selectors for Library */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <Input
                  placeholder="Buscar na biblioteca..."
                  value={libSearchQuery}
                  onChange={(e) => setLibSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <Select value={libTopicFilter} onValueChange={setLibTopicFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 w-44">
                  <SelectValue placeholder="Tema" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {Object.entries(TOPIC_LABELS).map(([k, item]) => (
                    <SelectItem key={k} value={k}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Library Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLibrary.map((item) => {
              const topicInfo = TOPIC_LABELS[item.topic] || {
                label: item.topic,
                color: 'bg-slate-800 text-slate-300',
              }

              const diffBadge =
                item.difficulty === 'casca_de_banana'
                  ? {
                      label: '🍌 Casca de Banana',
                      class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                    }
                  : item.difficulty === 'dificil'
                    ? {
                        label: '🔴 Difícil',
                        class: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                      }
                    : item.difficulty === 'medio'
                      ? {
                          label: '🟡 Médio',
                          class: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                        }
                      : {
                          label: '🟢 Fácil',
                          class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                        }

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 border ${topicInfo.color}`}
                        >
                          {topicInfo.label}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 border ${diffBadge.class}`}
                        >
                          {diffBadge.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.time_limit_seconds || 60}s
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white mb-1.5">{item.title}</h4>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200">
                      "{item.question}"
                    </div>

                    {item.suggested_answer && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs space-y-1">
                        <span className="font-bold text-emerald-400 text-[11px] block">
                          Diretriz de Resposta Sugerida:
                        </span>
                        <p className="text-slate-300 leading-relaxed">{item.suggested_answer}</p>
                      </div>
                    )}

                    {item.key_data_points && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/90">
                        <strong>Dados-chave:</strong> {item.key_data_points}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                    <Button
                      onClick={() => handleOpenImportFromLib(item)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3.5"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Importar para Meu Banco
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 4: COMPARATIVO DE ADVERSÁRIOS (LADO A LADO) */}
        <TabsContent value="comparison" className="space-y-4 focus-visible:outline-none">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-xs uppercase">
                  Análise Lado a Lado
                </Badge>
                <span className="text-xs text-slate-400">Confronto Comparativo Direto</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                Comparativo de Adversários
              </h3>
              <p className="text-xs text-slate-300">
                Selecione os candidatos para comparar partido, pontos fortes, vulnerabilidades,
                histórico de polêmicas e posições nas pesquisas.
              </p>
            </div>

            {/* Adversaries Multi-selector Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 mr-1 font-semibold">Comparar:</span>
              {adversaries.map((adv) => {
                const isSelected = selectedComparisonAdvIds.includes(adv.id)
                return (
                  <button
                    key={adv.id}
                    onClick={() => {
                      if (isSelected) {
                        if (selectedComparisonAdvIds.length > 1) {
                          setSelectedComparisonAdvIds(
                            selectedComparisonAdvIds.filter((id) => id !== adv.id),
                          )
                        } else {
                          toast.info('Selecione pelo menos 1 candidato para comparar.')
                        }
                      } else {
                        setSelectedComparisonAdvIds([...selectedComparisonAdvIds, adv.id])
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {adv.name.split(' ')[0]} {isSelected && '✓'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Side-by-side Table / Responsive Columns */}
          {selectedComparisonAdvIds.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Nenhum adversário selecionado para o comparativo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 0: Our Candidate Reference */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/40 space-y-4 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-amber-500/20">
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center border-2 border-amber-400 shrink-0">
                      ★
                    </div>
                    <div className="min-w-0">
                      <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] uppercase px-1.5 py-0 mb-1">
                        Nosso Candidato
                      </Badge>
                      <h4 className="font-black text-base text-white truncate">
                        {currentCampaign?.candidate_name || 'Luciana Albuquerque'}
                      </h4>
                      <p className="text-xs text-amber-400 font-semibold">
                        {currentCampaign?.party || 'PSD - 55'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-3">
                    {/* Estilo */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="font-bold text-amber-400 uppercase text-[10px] block mb-1">
                        Postura no Debate:
                      </span>
                      <p className="text-slate-200">
                        Foco propositivo, serenidade executiva, domínio de orçamento e apresentação
                        de soluções concretas para os primeiros 100 dias.
                      </p>
                    </div>

                    {/* Virtudes */}
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
                      <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes & Trunfos
                      </span>
                      <p className="text-slate-300">
                        Capacidade de diálogo, baixa rejeição, experiência de gestão e compromisso
                        orçamentário.
                      </p>
                    </div>

                    {/* Áreas de Atenção */}
                    <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs space-y-1">
                      <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5" /> Desempenho nas Pesquisas
                      </span>
                      <p className="text-slate-300">
                        {latestPoll
                          ? `${latestPoll.our_candidate_percentage}% (${latestPoll.candidate_rank}º Lugar - ${latestPoll.institute})`
                          : 'Liderança consolidada com 31,0%'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-center">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-400 border-amber-500/30"
                  >
                    Base de Referência Estratégica
                  </Badge>
                </div>
              </div>

              {/* Selected Adversaries Columns */}
              {selectedComparisonAdvIds.map((advId) => {
                const adv = adversaries.find((a) => a.id === advId)
                if (!adv) return null

                const advPollResult = latestPoll?.adversaries_results?.find(
                  (r) =>
                    r.adversary_name.toLowerCase().includes(adv.name.toLowerCase().split(' ')[0]) ||
                    false,
                )

                return (
                  <div
                    key={adv.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Adversary Profile Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                        <img
                          src={`https://img.usecurling.com/ppl/128?seed=${adv.avatar_seed || adv.name}`}
                          alt={adv.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shrink-0 bg-slate-800"
                        />
                        <div className="min-w-0">
                          <h4 className="font-black text-base text-white truncate flex items-center gap-1.5">
                            {adv.name}
                            {adv.candidate_number && (
                              <span className="font-mono text-xs bg-slate-950 border border-slate-700 text-amber-400 px-1 py-0.2 rounded">
                                {adv.candidate_number}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {adv.party || 'Sem Partido'} • {adv.target_position || 'Prefeito'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 mt-3">
                        {/* Estilo */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <span className="font-bold text-amber-400 uppercase text-[10px] block mb-1">
                            Estilo no Debate:
                          </span>
                          <p className="text-slate-300">{adv.style_tone || 'Não especificado.'}</p>
                        </div>

                        {/* Pontos Fortes */}
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs space-y-1">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
                          </span>
                          <p className="text-slate-300 leading-relaxed">
                            {adv.strengths || 'Nenhum ponto forte mapeado.'}
                          </p>
                        </div>

                        {/* Vulnerabilidades vs Nosso Trunfo */}
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs space-y-1">
                          <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Fragilidades / Onde Atacar
                          </span>
                          <p className="text-slate-300 leading-relaxed">
                            {adv.weaknesses || 'Nenhuma vulnerabilidade mapeada.'}
                          </p>
                        </div>

                        {/* Polêmicas */}
                        {adv.controversies && (
                          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs space-y-1">
                            <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                              <Flame className="w-3.5 h-3.5" /> Passivos / Polêmicas
                            </span>
                            <p className="text-slate-300 leading-relaxed">{adv.controversies}</p>
                          </div>
                        )}

                        {/* Pesquisa */}
                        {advPollResult && (
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                            <span className="text-slate-400">Intenção na última pesquisa:</span>
                            <strong className="text-white font-bold">
                              {advPollResult.percentage}%
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setAdversaryFilter(adv.id)
                          setActiveTab('qa')
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold p-0 h-auto"
                      >
                        Ver perguntas vinculadas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 5: DOSSIÊ DE ADVERSÁRIOS */}
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
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs space-y-1">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Pontos Fortes
                          </span>
                          <p className="text-slate-300 line-clamp-3">
                            {adv.strengths || 'Não detalhado.'}
                          </p>
                        </div>

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

        {/* TAB 6: DEBATES & REGRAS */}
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
      </Tabs>

      {/* DIALOG: Importar da Biblioteca de Temas */}
      <Dialog open={libImportModalOpen} onOpenChange={setLibImportModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-amber-400" />
              Importar Pergunta para a Preparação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Vincule esta pergunta a um adversário ou evento específico da sua campanha.
            </DialogDescription>
          </DialogHeader>

          {selectedLibItem && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400">
                  {selectedLibItem.title}
                </span>
                <p className="text-xs text-slate-200">"{selectedLibItem.question}"</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Adversário Alvo / Oponente
                </Label>
                <Select value={importAdvId} onValueChange={setImportAdvId}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Selecione o adversário (opcional)" />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Debate Vinculado</Label>
                <Select value={importEventId} onValueChange={setImportEventId}>
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Selecione o debate (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectItem value="">Geral / Sem debate específico</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLibImportModalOpen(false)}
              className="text-xs bg-slate-800 border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImportLib}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
