import React, { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import { useGpsTracker } from '@/hooks/use-gps-tracker'
import type { Activity } from '@/types/campaign'
import {
  Radio,
  MapPin,
  Flame,
  CheckCircle2,
  Users,
  Building2,
  Calendar,
  Send,
  Camera,
  Star,
  Clock,
  Sparkles,
  WifiOff,
  RefreshCw,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Share2, Plus, Compass, Award, ExternalLink, ShieldAlert, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface TeamGroup {
  id: string
  name: string
  leader_name: string
  leader_phone?: string
  candidate_id?: string
  candidate_name?: string
  members_count: number
  region_zone: string
}

interface PlannedAction {
  id: string
  title: string
  action_type: 'panfletagem' | 'adesivacao' | 'casa_apoio' | 'mobilizacao' | 'comicio' | 'carreata'
  candidate_1: string
  candidate_2?: string
  sector_point: string
  team_or_guests: string
  declared_headcount: number
  public_tracking_code: string
  status: 'planned' | 'in_progress' | 'completed'
  created_at: string
}

export const TeamFieldPage: React.FC = () => {
  const { user } = useAuth()
  const { currentCampaign } = useCampaign()
  const {
    isTracking,
    currentLocation,
    batteryLevel,
    gpsError,
    startTracking,
    stopTracking,
    syncNow,
  } = useGpsTracker()

  // Quick Check-in form states
  const [activityType, setActivityType] = useState<
    'door-to-door' | 'event' | 'flyering' | 'support-point'
  >('flyering')
  const [sentiment, setSentiment] = useState<number>(5)
  const [notes, setNotes] = useState('')
  const [locationName, setLocationName] = useState('')
  const [votersContacted, setVotersContacted] = useState<number>(20)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Photo upload states (Quick & Manual)
  const [quickPhotoFile, setQuickPhotoFile] = useState<File | null>(null)
  const [quickPhotoPreview, setQuickPhotoPreview] = useState<string | null>(null)
  const quickFileInputRef = useRef<HTMLInputElement | null>(null)

  const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null)
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null)
  const manualFileInputRef = useRef<HTMLInputElement | null>(null)

  // Photo preview modal
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null)

  // Manual retroactive entry form
  const [manualTime, setManualTime] = useState('')
  const [manualLat, setManualLat] = useState<number>(-23.5505)
  const [manualLng, setManualLng] = useState<number>(-46.6333)

  // Sub-tabs for Aba 08: 'equipes' vs 'atividades' vs 'checkin'
  const [mainTab, setMainTab] = useState<'equipes' | 'atividades' | 'checkin'>('equipes')

  // Equipes mock/real state
  const [teamsList, setTeamsList] = useState<TeamGroup[]>([
    {
      id: 'team_1',
      name: 'Brigada Zona Sul (Vila Mariana & Saúde)',
      leader_name: 'Marcos Vinicius (Coordenador Regional)',
      leader_phone: '(11) 98765-1122',
      candidate_name: 'Luciana Albuquerque',
      members_count: 8,
      region_zone: 'Zona Sul - SP',
    },
    {
      id: 'team_2',
      name: 'Equipe Voluntários Paulista & Centro',
      leader_name: 'Juliana Paes (Líder Jovem)',
      leader_phone: '(11) 97654-3344',
      candidate_name: 'Professor Carlinhos',
      members_count: 14,
      region_zone: 'Zona Central',
    },
    {
      id: 'team_3',
      name: 'Adesivaço & Carreatas Z/Leste',
      leader_name: 'Roberto Andrade',
      leader_phone: '(11) 99123-5566',
      candidate_name: 'Luciana Albuquerque',
      members_count: 6,
      region_zone: 'Tatuapé & Itaquera',
    },
  ])

  // New Team Modal state
  const [newTeamModalOpen, setNewTeamModalOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamLeader, setNewTeamLeader] = useState('')
  const [newTeamPhone, setNewTeamPhone] = useState('')
  const [newTeamCandidate, setNewTeamCandidate] = useState('Luciana Albuquerque')
  const [newTeamZone, setNewTeamZone] = useState('')
  const [newTeamMembersCount, setNewTeamMembersCount] = useState(5)

  // Planned Actions state (Atividades)
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([
    {
      id: 'act_1',
      title: 'Panfletagem de Pico no Metrô Santa Cruz',
      action_type: 'panfletagem',
      candidate_1: 'Luciana Albuquerque',
      candidate_2: 'Professor Carlinhos',
      sector_point: 'Zona Sul - Metrô Santa Cruz / Vila Mariana',
      team_or_guests: 'Brigada Zona Sul',
      declared_headcount: 6,
      public_tracking_code: 'rastreio-sc-2024',
      status: 'in_progress',
      created_at: new Date().toISOString(),
    },
    {
      id: 'act_2',
      title: 'Adesivaço de Carros no Posto Faria Lima',
      action_type: 'adesivacao',
      candidate_1: 'Luciana Albuquerque',
      sector_point: 'Pinheiros / Faria Lima',
      team_or_guests: 'Equipe Voluntários Paulista & Centro',
      declared_headcount: 8,
      public_tracking_code: 'rastreio-fl-889',
      status: 'planned',
      created_at: new Date().toISOString(),
    },
    {
      id: 'act_3',
      title: 'Caminhada & Mobilização Feira Livre Tatuapé',
      action_type: 'mobilizacao',
      candidate_1: 'Professor Carlinhos',
      sector_point: 'Praça Silvio Romero - Tatuapé',
      team_or_guests: 'Convidados Avulsos do Bairro',
      declared_headcount: 12,
      public_tracking_code: 'rastreio-tat-441',
      status: 'planned',
      created_at: new Date().toISOString(),
    },
  ])

  // New Action Modal state
  const [newActionModalOpen, setNewActionModalOpen] = useState(false)
  const [actionTitle, setActionTitle] = useState('')
  const [actionType, setActionType] = useState<PlannedAction['action_type']>('panfletagem')
  const [actionCand1, setActionCand1] = useState('Luciana Albuquerque')
  const [actionCand2, setActionCand2] = useState('Nenhum')
  const [actionSector, setActionSector] = useState('')
  const [actionTeam, setActionTeam] = useState('Brigada Zona Sul')
  const [actionHeadcount, setActionHeadcount] = useState(4)

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim() || !newTeamLeader.trim()) {
      toast.error('Preencha o nome da equipe e o responsável obrigatório')
      return
    }

    const newTeam: TeamGroup = {
      id: 'team_' + Date.now(),
      name: newTeamName.trim(),
      leader_name: newTeamLeader.trim(),
      leader_phone: newTeamPhone.trim(),
      candidate_name: newTeamCandidate,
      region_zone: newTeamZone.trim() || 'Zona Geral',
      members_count: Number(newTeamMembersCount) || 1,
    }

    setTeamsList([newTeam, ...teamsList])
    toast.success('Equipe cadastrada com sucesso!')
    setNewTeamModalOpen(false)
    setNewTeamName('')
    setNewTeamLeader('')
    setNewTeamPhone('')
    setNewTeamZone('')
  }

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionTitle.trim() || !actionSector.trim()) {
      toast.error('Preencha o título da ação e o setor/ponto')
      return
    }

    const randomCode = 'rastreio-' + Math.random().toString(36).substring(2, 8)
    const newAction: PlannedAction = {
      id: 'act_' + Date.now(),
      title: actionTitle.trim(),
      action_type: actionType,
      candidate_1: actionCand1,
      candidate_2: actionCand2 !== 'Nenhum' ? actionCand2 : undefined,
      sector_point: actionSector.trim(),
      team_or_guests: actionTeam,
      declared_headcount: Number(actionHeadcount) || 1,
      public_tracking_code: randomCode,
      status: 'planned',
      created_at: new Date().toISOString(),
    }

    setPlannedActions([newAction, ...plannedActions])
    toast.success('Ação planejada! Link público de rastreamento gerado.')
    setNewActionModalOpen(false)
    setActionTitle('')
    setActionSector('')
  }

  const copyTrackingLink = (code: string) => {
    const url = `${window.location.origin}/map?track=${code}`
    navigator.clipboard.writeText(url)
    toast.success('Link público de rastreamento copiado!')
  }

  // Recent user's activities
  const [myActivities, setMyActivities] = useState<Activity[]>([])

  const fetchMyActivities = async () => {
    if (!user || !currentCampaign) return
    try {
      const list = await pb.collection('activities').getFullList<Activity>({
        filter: `campaign_id = "${currentCampaign.id}" && user_id = "${user.id}"`,
        sort: '-created',
      })
      setMyActivities(list)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchMyActivities()
  }, [user, currentCampaign])

  const handlePhotoSelect = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
  ) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A foto não pode ultrapassar 5MB.')
      return
    }
    setFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearQuickPhoto = () => {
    setQuickPhotoFile(null)
    setQuickPhotoPreview(null)
    if (quickFileInputRef.current) quickFileInputRef.current.value = ''
  }

  const clearManualPhoto = () => {
    setManualPhotoFile(null)
    setManualPhotoPreview(null)
    if (manualFileInputRef.current) manualFileInputRef.current.value = ''
  }

  const handleQuickCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Nenhuma campanha ativa selecionada')
      return
    }

    try {
      setIsSubmitting(true)
      const lat = currentLocation ? currentLocation.lat : -23.5505 + (Math.random() - 0.5) * 0.02
      const lng = currentLocation ? currentLocation.lng : -46.6333 + (Math.random() - 0.5) * 0.02

      const formData = new FormData()
      formData.append('campaign_id', currentCampaign.id)
      if (user?.id) formData.append('user_id', user.id)
      formData.append('type', activityType)
      formData.append('lat', String(lat))
      formData.append('lng', String(lng))
      formData.append(
        'notes',
        notes.trim() || `Check-in de ${activityType} realizado pela equipe de campo.`,
      )
      formData.append('sentiment', String(sentiment))
      formData.append('voters_contacted', String(votersContacted || 1))
      formData.append('location_name', locationName.trim() || 'Ponto de Campo SP')

      if (quickPhotoFile) {
        formData.append('photo', quickPhotoFile)
      }

      await pb.collection('activities').create(formData)

      toast.success('Check-in registrado com sucesso na inteligência eleitoral!')
      setNotes('')
      setLocationName('')
      clearQuickPhoto()
      fetchMyActivities()
    } catch (err) {
      toast.error('Erro ao salvar check-in de campo')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Selecione uma campanha primeiro')
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      formData.append('campaign_id', currentCampaign.id)
      if (user?.id) formData.append('user_id', user.id)
      formData.append('type', activityType)
      formData.append('lat', String(manualLat))
      formData.append('lng', String(manualLng))
      formData.append(
        'notes',
        notes.trim() || `Entrada manual retroativa (${manualTime || 'horário comercial'})`,
      )
      formData.append('sentiment', String(sentiment))
      formData.append('voters_contacted', String(votersContacted || 1))
      formData.append('location_name', locationName.trim() || 'Zona de difícil sinal')

      if (manualPhotoFile) {
        formData.append('photo', manualPhotoFile)
      }

      await pb.collection('activities').create(formData)

      toast.success('Entrada manual salva e sincronizada!')
      setNotes('')
      setLocationName('')
      clearManualPhoto()
      fetchMyActivities()
    } catch (err) {
      toast.error('Erro ao registrar entrada manual')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-5xl mx-auto w-full min-w-0 overflow-hidden">
      {/* PWA Mobile Optimized Header & GPS State */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs uppercase shrink-0">
              Terminal PWA de Campo
            </Badge>
            {isTracking && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>{' '}
                Transmitindo ao Vivo
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black break-words">
            Painel do Militante & Coordenador
          </h1>
          <p className="text-xs text-slate-300 mt-1 break-words">
            Membro: <strong>{user?.name || user?.email}</strong> • Bateria:{' '}
            <strong>{batteryLevel}%</strong>
          </p>
        </div>

        {/* Big GPS Toggle Button */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0">
          <Button
            size="lg"
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-full md:w-auto font-bold h-11 sm:h-12 px-4 sm:px-6 shadow-xl transition-all text-xs sm:text-sm whitespace-nowrap justify-center truncate ${
              isTracking
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/30'
            }`}
          >
            <Radio
              className={`w-4 sm:w-5 h-4 sm:h-5 mr-1.5 shrink-0 ${isTracking ? 'animate-spin' : ''}`}
            />
            <span className="truncate">
              {isTracking ? 'Parar GPS' : 'Iniciar Rastreamento GPS'}
            </span>
          </Button>
        </div>
      </div>

      {gpsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Status do GPS: {gpsError}. O app funcionará normalmente através de check-ins manuais e
            por aproximação.
          </span>
        </div>
      )}

      {/* Top Main Navigation Tabs for Aba 08: Equipes vs Atividades vs Check-in */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant={mainTab === 'equipes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMainTab('equipes')}
            className={`text-xs font-bold flex-1 sm:flex-none justify-center whitespace-normal h-8 sm:h-9 ${
              mainTab === 'equipes'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1 text-amber-500 shrink-0" /> Equipes (
            {teamsList.length})
          </Button>

          <Button
            variant={mainTab === 'atividades' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMainTab('atividades')}
            className={`text-xs font-bold flex-1 sm:flex-none justify-center whitespace-normal h-8 sm:h-9 ${
              mainTab === 'atividades'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" /> Ações (
            {plannedActions.length})
          </Button>

          <Button
            variant={mainTab === 'checkin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMainTab('checkin')}
            className={`text-xs font-bold w-full sm:w-auto justify-center whitespace-normal h-8 sm:h-9 ${
              mainTab === 'checkin'
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 mr-1 shrink-0" /> Check-in de Campo PWA
          </Button>
        </div>

        {mainTab === 'equipes' && (
          <Button
            size="sm"
            onClick={() => setNewTeamModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Nova Equipe
          </Button>
        )}

        {mainTab === 'atividades' && (
          <Button
            size="sm"
            onClick={() => setNewActionModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Planejar Ação de Rua
          </Button>
        )}
      </div>

      {/* Sub-Aba 01: EQUIPES (Admin cria com nome, responsável obrigatório, candidato opcional e membros) */}
      {mainTab === 'equipes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Equipes de Campo Cadastradas
              </h3>
              <p className="text-xs text-slate-500">
                Organização tática de militantes por zona eleitoral e responsabilidade
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">
              Admin / Coordenação
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsList.map((team) => (
              <Card
                key={team.id}
                className="border-slate-200 shadow-sm bg-white hover:border-amber-400/80 transition-all"
              >
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                  <div>
                    <Badge className="bg-slate-900 text-amber-400 text-[10px] font-bold mb-1">
                      {team.region_zone}
                    </Badge>
                    <CardTitle className="text-sm font-black text-slate-900 leading-snug">
                      {team.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      Responsável Obrigatório
                    </div>
                    <div className="font-bold text-slate-800">{team.leader_name}</div>
                    {team.leader_phone && (
                      <div className="text-[11px] text-slate-500">{team.leader_phone}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Candidato Vinculado:</span>
                    <span className="font-semibold text-slate-800">
                      {team.candidate_name || 'Geral da Campanha'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Membros / Efetivo:</span>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {team.members_count} militantes
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Aba 02: ATIVIDADES PLANEJADAS (Ações de rua: panfletagem, adesivação, etc. Link público de rastreamento) */}
      {mainTab === 'atividades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Atividades & Ações de Rua Planejadas
              </h3>
              <p className="text-xs text-slate-500">
                Designação por equipe/convidados com até 2 candidatos e link público de rastreio ao
                vivo
              </p>
            </div>
            <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs">
              Alimenta a aba "Ao Vivo"
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plannedActions.map((action) => (
              <Card
                key={action.id}
                className="border-slate-200 shadow-sm bg-white hover:border-emerald-500/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase">
                          {action.action_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            action.status === 'in_progress'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {action.status === 'in_progress' ? '● Em Andamento' : 'Planejada'}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-black text-slate-900 leading-snug">
                        {action.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-500 text-[11px] font-medium">
                        Setor / Ponto Estratégico:
                      </div>
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{action.sector_point}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[11px]">Candidato 1:</span>
                        <span className="font-bold text-slate-800">{action.candidate_1}</span>
                      </div>
                      {action.candidate_2 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-[11px]">Candidato 2:</span>
                          <span className="font-bold text-slate-800">{action.candidate_2}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-200/40">
                        <span className="text-slate-500 text-[11px]">Equipe / Efetivo:</span>
                        <span className="font-bold text-emerald-700">
                          {action.team_or_guests} ({action.declared_headcount} pessoas)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyTrackingLink(action.public_tracking_code)}
                    className="w-full text-xs font-semibold border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" /> Copiar Link de Rastreio Público
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab 03: Check-in & Formulário Retroativo */}
      {mainTab === 'checkin' && (
        <div>
          <Tabs defaultValue="quick" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-200/80 p-1 rounded-xl">
              <TabsTrigger
                value="quick"
                className="font-bold text-xs sm:text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950 shadow-sm"
              >
                ⚡ Check-in Rápido com GPS & Foto
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="font-bold text-xs sm:text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950 shadow-sm"
              >
                📝 Formulário Manual (Sem Sinal)
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Quick Check-in Form */}
            <TabsContent value="quick">
              <Card className="border-slate-200/80 shadow-md bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" /> Registro Instantâneo de Atividade
                    de Campo
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Gera calor no mapa de conversão, anexa comprovação fotográfica e alimenta a IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleQuickCheckin} className="space-y-5">
                    {/* Activity Type Selector */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                        Tipo de Ação Eleitoral
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          {
                            id: 'door-to-door',
                            label: 'Porta a Porta',
                            icon: '🚪',
                            desc: 'Visita residencial',
                          },
                          {
                            id: 'flyering',
                            label: 'Panfletagem',
                            icon: '📄',
                            desc: 'Semáforos / Metrô',
                          },
                          {
                            id: 'event',
                            label: 'Evento / Comício',
                            icon: '🎤',
                            desc: 'Ato público',
                          },
                          {
                            id: 'support-point',
                            label: 'Ponto de Apoio',
                            icon: '🏢',
                            desc: 'Comitê parceiro',
                          },
                        ].map((type) => (
                          <button
                            type="button"
                            key={type.id}
                            onClick={() => setActivityType(type.id as any)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              activityType === type.id
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="text-lg mb-1">{type.icon}</div>
                            <div className="text-xs font-bold truncate">{type.label}</div>
                            <div
                              className={`text-[10px] ${activityType === type.id ? 'text-slate-300' : 'text-slate-500'}`}
                            >
                              {type.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location Name & Voters Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Ponto de Referência / Bairro
                        </Label>
                        <Input
                          placeholder="Ex: Saída Metrô República / Praça da Sé"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Eleitores Impactados / Conversas
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={votersContacted}
                          onChange={(e) => setVotersContacted(Number(e.target.value))}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Sentiment Rating (1 to 5 stars) */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                        Termômetro de Sentimento dos Eleitores
                      </Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setSentiment(star)}
                            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                              sentiment >= star
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <Star className="w-5 h-5 fill-current" />
                          </button>
                        ))}
                        <span className="text-xs font-semibold text-slate-600 ml-2">
                          {sentiment === 5
                            ? '🔥 Altamente Favorável (Conversão Alta)'
                            : sentiment === 4
                              ? '👍 Receptivo e Simpático'
                              : sentiment === 3
                                ? '😐 Neutro / Indeciso'
                                : sentiment === 2
                                  ? '👎 Resistente'
                                  : '⛔ Hostil / Rejeição'}
                        </span>
                      </div>
                    </div>

                    {/* Notes & Feedback from voters */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Observações & Demandas Ouvidas
                      </Label>
                      <Textarea
                        placeholder="Quais foram os principais pedidos da população? Ex: Reclamaram de segurança na rua lateral, pediram mais rondas e elogiaram proposta de creches..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    {/* Photo Upload Section with Live Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Foto do Local / Evidência (Adesivaço, Faixa, Panfletagem)
                      </Label>
                      <input
                        ref={quickFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handlePhotoSelect(
                            e.target.files?.[0],
                            setQuickPhotoFile,
                            setQuickPhotoPreview,
                          )
                        }
                      />
                      {quickPhotoPreview ? (
                        <div className="relative rounded-xl border border-slate-200 p-2 bg-slate-50 flex items-center gap-4">
                          <img
                            src={quickPhotoPreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {quickPhotoFile?.name || 'Foto selecionada'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {quickPhotoFile
                                ? `${(quickPhotoFile.size / 1024).toFixed(1)} KB`
                                : ''}{' '}
                              • Pronta para envio
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => quickFileInputRef.current?.click()}
                                className="h-7 text-xs px-2"
                              >
                                Trocar Foto
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={clearQuickPhoto}
                                className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> Remover
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => quickFileInputRef.current?.click()}
                          className="p-4 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl bg-slate-50 hover:bg-amber-50/30 text-center text-xs text-slate-600 cursor-pointer transition-colors"
                        >
                          <Camera className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
                          <span className="font-semibold text-slate-800">
                            Clique para tirar ou selecionar foto do local
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Formatos suportados: JPG, PNG ou WebP até 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* GPS Coordinates Feedback */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>
                          {currentLocation
                            ? `GPS Fixado: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)} (Precisão: ±${Math.round(currentLocation.accuracy || 5)}m)`
                            : 'Usando geolocalização do dispositivo em tempo real'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={syncNow}
                        className="h-7 text-xs text-slate-500 hover:text-slate-900"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Re-calibrar
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 text-xs sm:text-sm shadow-md"
                    >
                      <Send className="w-4 h-4 mr-2 text-amber-400" />
                      {isSubmitting ? 'Enviando Check-in...' : 'Salvar Check-in na Campanha'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Manual / Offline Entry Form */}
            <TabsContent value="manual">
              <Card className="border-slate-200/80 shadow-md bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" /> Lançamento Retroativo de
                    Atividades
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Ideal para cadastrar ações realizadas em áreas rurais ou sem cobertura de dados
                    4G/5G com foto comprobatória
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleManualEntry} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Horário da Ação
                        </Label>
                        <Input
                          type="text"
                          placeholder="Ex: Hoje às 14:30"
                          value={manualTime}
                          onChange={(e) => setManualTime(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Região / Bairro
                        </Label>
                        <Input
                          placeholder="Ex: Comunidade da Paz / Bairro Industrial"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Latitude Manual
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={manualLat}
                          onChange={(e) => setManualLat(parseFloat(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Longitude Manual
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={manualLng}
                          onChange={(e) => setManualLng(parseFloat(e.target.value))}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Resumo da Mobilização
                      </Label>
                      <Textarea
                        placeholder="Descreva a atividade, resultado de abordagem, entregas de santinhos e lideranças contatadas..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    {/* Manual Photo Attachment with Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Anexar Foto de Evidência / Comprovante
                      </Label>
                      <input
                        ref={manualFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handlePhotoSelect(
                            e.target.files?.[0],
                            setManualPhotoFile,
                            setManualPhotoPreview,
                          )
                        }
                      />
                      {manualPhotoPreview ? (
                        <div className="relative rounded-xl border border-slate-200 p-2 bg-slate-50 flex items-center gap-4">
                          <img
                            src={manualPhotoPreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {manualPhotoFile?.name || 'Foto selecionada'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {manualPhotoFile
                                ? `${(manualPhotoFile.size / 1024).toFixed(1)} KB`
                                : ''}{' '}
                              • Pronta para envio
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => manualFileInputRef.current?.click()}
                                className="h-7 text-xs px-2"
                              >
                                Trocar Foto
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={clearManualPhoto}
                                className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> Remover
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => manualFileInputRef.current?.click()}
                          className="p-4 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/30 text-center text-xs text-slate-500 cursor-pointer transition-colors"
                        >
                          <Camera className="w-6 h-6 mx-auto mb-1.5 text-blue-500" />
                          <span className="font-semibold text-slate-700">
                            Clique para anexar foto de comprovante
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Formatos suportados: PNG, JPG ou WebP até 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 text-xs sm:text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                      Salvar Registro Manual
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* List of my recent activities */}
          <Card className="border-slate-200/80 shadow-sm bg-white mt-6">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Meus Check-ins Recentes ({myActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {myActivities.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Você ainda não registrou check-ins nesta campanha. Utilize os formulários acima
                  para pontuar no mapa!
                </div>
              ) : (
                myActivities.map((act) => {
                  const photoUrl = act.photo ? pb.files.getURL(act, act.photo) : null

                  return (
                    <div
                      key={act.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {photoUrl ? (
                          <div
                            onClick={() => setSelectedPreviewImage(photoUrl)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 cursor-pointer group"
                          >
                            <img
                              src={photoUrl}
                              alt="Atividade"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-slate-400 font-bold">
                            {act.type === 'door-to-door'
                              ? '🚪'
                              : act.type === 'flyering'
                                ? '📄'
                                : act.type === 'event'
                                  ? '🎤'
                                  : '🏢'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            {act.location_name || act.type}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                            "{act.notes}"
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(act.created).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(act.created).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-amber-500/20 text-amber-700 text-xs font-bold">
                          ★ {act.sentiment}/5
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Team Modal Dialog */}
      <Dialog open={newTeamModalOpen} onOpenChange={setNewTeamModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Cadastrar Nova Equipe de Campo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Nome da equipe, responsável obrigatório e candidato vinculado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nome da Equipe *</Label>
                <Input
                  placeholder="Ex: Brigada Jovem Pinheiros"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Responsável Obrigatório *
                  </Label>
                  <Input
                    placeholder="Nome do líder"
                    value={newTeamLeader}
                    onChange={(e) => setNewTeamLeader(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">WhatsApp do Líder</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={newTeamPhone}
                    onChange={(e) => setNewTeamPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Região / Setor</Label>
                  <Input
                    placeholder="Ex: Zona Norte"
                    value={newTeamZone}
                    onChange={(e) => setNewTeamZone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Efetivo de Militantes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTeamMembersCount}
                    onChange={(e) => setNewTeamMembersCount(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewTeamModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Salvar Equipe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Action Modal Dialog */}
      <Dialog open={newActionModalOpen} onOpenChange={setNewActionModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <form onSubmit={handleCreateAction}>
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" /> Planejar Ação de Rua
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure setor, tipo de ação, candidatos e efetivo para gerar o link público de
                rastreio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Título da Ação *</Label>
                <Input
                  placeholder="Ex: Panfletagem Matutina na Saída do Metrô"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Tipo de Ação</Label>
                  <Select
                    value={actionType}
                    onValueChange={(v) => setActionType(v as PlannedAction['action_type'])}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-xs">
                      <SelectItem value="panfletagem">Panfletagem</SelectItem>
                      <SelectItem value="adesivacao">Adesivação</SelectItem>
                      <SelectItem value="casa_apoio">Casa de Apoio</SelectItem>
                      <SelectItem value="mobilizacao">Mobilização</SelectItem>
                      <SelectItem value="comicio">Comício / Ato</SelectItem>
                      <SelectItem value="carreata">Carreata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Setor / Ponto *</Label>
                  <Input
                    placeholder="Ex: Estação Consolação"
                    value={actionSector}
                    onChange={(e) => setActionSector(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Candidato 1 *</Label>
                  <Input
                    value={actionCand1}
                    onChange={(e) => setActionCand1(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Candidato 2 (Opcional)</Label>
                  <Input
                    placeholder="Ex: Professor Carlinhos ou Nenhum"
                    value={actionCand2}
                    onChange={(e) => setActionCand2(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Equipe / Convidados</Label>
                  <Input
                    value={actionTeam}
                    onChange={(e) => setActionTeam(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Efetivo Declarado (Pessoas)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={actionHeadcount}
                    onChange={(e) => setActionHeadcount(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewActionModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Planejar Ação & Gerar Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full image preview dialog */}
      <Dialog
        open={!!selectedPreviewImage}
        onOpenChange={(open) => !open && setSelectedPreviewImage(null)}
      >
        <DialogContent className="max-w-lg p-3 bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xs font-semibold text-slate-300">
              Evidência de Atividade de Campo
            </DialogTitle>
          </DialogHeader>
          {selectedPreviewImage && (
            <div className="rounded-lg overflow-hidden border border-slate-800 mt-2">
              <img
                src={selectedPreviewImage}
                alt="Evidência"
                className="w-full max-h-[70vh] object-contain bg-black"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
