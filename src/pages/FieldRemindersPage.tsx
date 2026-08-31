import React, { useState, useEffect, useMemo } from 'react'
import { useCampaign } from '@/hooks/use-campaign'
import { useAuth } from '@/hooks/use-auth'
import { fieldRemindersService, type CreateFieldReminderInput } from '@/services/fieldReminders'
import { webPushService } from '@/services/webPush'
import type { FieldReminder, FieldReminderAudience, FieldReminderStatus } from '@/types/campaign'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  BellRing,
  Send,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

export const FieldRemindersPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const { user } = useAuth()

  const [reminders, setReminders] = useState<FieldReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<FieldReminder | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('14:00')
  const [locationName, setLocationName] = useState('')
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(60)
  const [targetAudience, setTargetAudience] = useState<FieldReminderAudience>('all_team')

  const fetchReminders = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const data = await fieldRemindersService.getReminders(currentCampaign.id)
      setReminders(data)
    } catch (err) {
      console.error('Error fetching field reminders:', err)
      toast.error('Erro ao carregar lembretes de campo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [currentCampaign])

  // Presets quick template for reminders
  const applyPreset = (type: 'concentracao' | 'caminhada' | 'carreata' | 'panfletagem') => {
    const today = new Date()
    today.setHours(today.getHours() + 4)
    const dateStr = today.toISOString().split('T')[0]
    setEventDate(dateStr)

    if (type === 'concentracao') {
      setTitle('Concentração Geral de Militância')
      setMessage(
        'Atenção equipe: concentração geral com bandeiras e materiais. Chegar 15 minutos antes!',
      )
      setLocationName('Praça Central / Comitê Central')
      setLeadTimeMinutes(60)
      setTargetAudience('all_team')
      setEventTime('14:00')
    } else if (type === 'caminhada') {
      setTitle('Grande Caminhada com Candidato(a)')
      setMessage(
        'Ação corpo a corpo no comércio local. Todos com camisetas oficiais e fichas de apoio!',
      )
      setLocationName('Avenida Comercial Principal')
      setLeadTimeMinutes(120)
      setTargetAudience('all_team')
      setEventTime('09:30')
    } else if (type === 'carreata') {
      setTitle('Carreata da Vitória')
      setMessage('Adesivagem rápida e concentração de veículos. Tragam água e bandeirões!')
      setLocationName('Estacionamento do Comitê Regional')
      setLeadTimeMinutes(90)
      setTargetAudience('all_team')
      setEventTime('15:00')
    } else if (type === 'panfletagem') {
      setTitle('Blitz de Panfletagem na Estação')
      setMessage(
        'Entrega de material informativo no horário de pico. Foco no diálogo respeitoso com eleitores.',
      )
      setLocationName('Entrada da Estação Central de Metrô')
      setLeadTimeMinutes(45)
      setTargetAudience('field_only')
      setEventTime('17:30')
    }
  }

  const handleOpenCreateModal = () => {
    setEditingReminder(null)
    const now = new Date()
    now.setHours(now.getHours() + 2)
    setEventDate(now.toISOString().split('T')[0])
    setEventTime('14:00')
    setTitle('')
    setMessage('')
    setLocationName('')
    setLeadTimeMinutes(60)
    setTargetAudience('all_team')
    setModalOpen(true)
  }

  const handleOpenEditModal = (rem: FieldReminder) => {
    setEditingReminder(rem)
    try {
      const d = new Date(rem.event_date)
      setEventDate(d.toISOString().split('T')[0])
      setEventTime(d.toTimeString().substring(0, 5))
    } catch {
      setEventDate('')
      setEventTime('14:00')
    }
    setTitle(rem.title)
    setMessage(rem.message)
    setLocationName(rem.location_name || '')
    setLeadTimeMinutes(rem.lead_time_minutes ?? 60)
    setTargetAudience(rem.target_audience)
    setModalOpen(true)
  }

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Nenhuma campanha selecionada')
      return
    }
    if (!title.trim() || !message.trim() || !eventDate) {
      toast.error('Preencha os campos obrigatórios (título, mensagem e data do evento)')
      return
    }

    try {
      setIsSaving(true)
      const combinedDateTimeStr = `${eventDate}T${eventTime || '12:00'}:00.000Z`

      if (editingReminder) {
        await fieldRemindersService.updateReminder(editingReminder.id, {
          title: title.trim(),
          message: message.trim(),
          event_date: combinedDateTimeStr,
          location_name: locationName.trim(),
          lead_time_minutes: Number(leadTimeMinutes),
          target_audience: targetAudience,
        })
        toast.success('Lembrete atualizado com sucesso!')
      } else {
        await fieldRemindersService.createReminder({
          campaign_id: currentCampaign.id,
          title: title.trim(),
          message: message.trim(),
          event_date: combinedDateTimeStr,
          location_name: locationName.trim(),
          lead_time_minutes: Number(leadTimeMinutes),
          target_audience: targetAudience,
        })
        toast.success('Lembrete agendado com sucesso!')
      }

      setModalOpen(false)
      fetchReminders()
    } catch (err: any) {
      console.error('Error saving reminder:', err)
      toast.error(err?.message || 'Erro ao salvar lembrete')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDispatchNow = async (reminder: FieldReminder) => {
    try {
      setDispatchingId(reminder.id)
      const res = await fieldRemindersService.dispatchNow(reminder.id)
      toast.success(
        res.message || `Lembrete enviado via Push para ${res.sent_count || 1} membros inscritos!`,
      )
      fetchReminders()
    } catch (err: any) {
      console.error('Error dispatching reminder:', err)
      toast.error('Falha ao enviar lembrete')
    } finally {
      setDispatchingId(null)
    }
  }

  const handleCancelReminder = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este lembrete agendado?')) return
    try {
      await fieldRemindersService.cancelReminder(id)
      toast.info('Lembrete cancelado.')
      fetchReminders()
    } catch {
      toast.error('Erro ao cancelar lembrete')
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Excluir este lembrete definitivamente?')) return
    try {
      await fieldRemindersService.deleteReminder(id)
      toast.success('Lembrete excluído!')
      fetchReminders()
    } catch {
      toast.error('Erro ao excluir lembrete')
    }
  }

  // Filtered list
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = r.title.toLowerCase().includes(q)
        const matchesMsg = r.message.toLowerCase().includes(q)
        const matchesLoc = (r.location_name || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesMsg && !matchesLoc) return false
      }
      return true
    })
  }, [reminders, filterStatus, searchQuery])

  // Summary counts
  const scheduledCount = reminders.filter((r) => r.status === 'scheduled').length
  const sentCount = reminders.filter((r) => r.status === 'sent').length

  const getStatusBadge = (status: FieldReminderStatus) => {
    if (status === 'scheduled') {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          <Clock className="w-3 h-3 mr-1" /> Agendado
        </Badge>
      )
    }
    if (status === 'sent') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado (Push)
        </Badge>
      )
    }
    return (
      <Badge className="bg-slate-700/50 text-slate-400 border border-slate-600 text-[10px] font-bold">
        <XCircle className="w-3 h-3 mr-1" /> Cancelado
      </Badge>
    )
  }

  const getAudienceLabel = (audience: FieldReminderAudience) => {
    switch (audience) {
      case 'all_team':
        return 'Toda a Equipe'
      case 'coordinators_only':
        return 'Apenas Coordenadores'
      case 'field_only':
        return 'Militância de Campo'
      case 'custom':
        return 'Membros Selecionados'
      default:
        return 'Toda a Equipe'
    }
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-[10px] sm:text-xs shrink-0">
              PUSH AUTOMÁTICO • WEB PUSH PWA
            </Badge>
            <span className="text-xs text-slate-300 truncate">Mobilização de Campo</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Lembretes Automáticos de Campo
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Agende disparos automáticos via Web Push para os militantes e coordenadores antes de
            atividades de rua, carreatas e comícios.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Lembrete Push
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Agendados Pendentes</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">{scheduledCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Disparados com Sucesso</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{sentCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Frequência do Robô</div>
              <div className="text-sm sm:text-base font-bold text-blue-300 truncate">
                A cada 5 minutos
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Canal de Entrega</div>
              <div className="text-sm sm:text-base font-bold text-purple-300 truncate">
                Web Push + In-App
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
        <CardHeader className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              Lembretes Agendados da Campanha
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Notificações que serão entregues no celular da militância antes do horário do evento.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              <Input
                placeholder="Buscar por título ou local..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Carregando lembretes de campo...
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <BellRing className="w-6 h-6 opacity-40" />
              </div>
              <div className="text-sm font-semibold text-slate-300">Nenhum lembrete cadastrado</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crie um lembrete com antecedência para alertar a equipe automaticamente sobre
                concentrações de rua.
              </p>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Criar Primeiro Lembrete
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredReminders.map((reminder) => {
                const eventD = new Date(reminder.event_date)
                const isScheduled = reminder.status === 'scheduled'
                const leadMins = reminder.lead_time_minutes ?? 60

                return (
                  <div
                    key={reminder.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-sm text-white line-clamp-1">
                          {reminder.title}
                        </span>
                        {getStatusBadge(reminder.status)}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        "{reminder.message}"
                      </p>

                      <div className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Data do Evento:{' '}
                            <strong className="text-slate-200">
                              {eventD.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              às{' '}
                              {eventD.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                          </span>
                        </div>

                        {reminder.location_name && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">
                              Local:{' '}
                              <strong className="text-slate-200">{reminder.location_name}</strong>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>
                              Disparo: <strong>{leadMins} min antes</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{getAudienceLabel(reminder.target_audience)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        {isScheduled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDispatchNow(reminder)}
                            disabled={dispatchingId === reminder.id}
                            className="h-7 px-2.5 text-[11px] bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border-amber-500/30 font-bold"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {dispatchingId === reminder.id ? 'Disparando...' : 'Disparar Agora'}
                          </Button>
                        )}
                        {reminder.status === 'sent' && reminder.sent_at && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Enviado em{' '}
                            {new Date(reminder.sent_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isScheduled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(reminder)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isScheduled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelReminder(reminder.id)}
                            className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300"
                            title="Cancelar Agendamento"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-400" />
              {editingReminder ? 'Editar Lembrete de Campo' : 'Agendar Lembrete Push'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configure os detalhes da atividade e quando o Web Push deve ser disparado para a
              equipe.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preset Buttons */}
          {!editingReminder && (
            <div className="space-y-1.5 pb-2 border-b border-slate-800">
              <Label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Modelos Rápidos de Ação:
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('concentracao')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium transition-colors border border-slate-700"
                >
                  🚩 Concentração
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('caminhada')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium transition-colors border border-slate-700"
                >
                  🚶 Caminhada
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('carreata')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium transition-colors border border-slate-700"
                >
                  🚗 Carreata
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('panfletagem')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium transition-colors border border-slate-700"
                >
                  📄 Panfletagem
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveReminder} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Título do Lembrete *</Label>
              <Input
                placeholder="Ex: Concentração na Praça Central, 14h"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">
                Mensagem Push (Aparece na tela do celular) *
              </Label>
              <Textarea
                placeholder="Ex: Ponto de encontro ao lado do coreto. Tragam os coletes da campanha!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                className="text-xs bg-slate-950 border-slate-700 text-slate-100 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Data do Evento *</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Horário do Início *</Label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                  className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">
                Local / Ponto de Referência
              </Label>
              <Input
                placeholder="Ex: Praça da Sé, em frente à catedral"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Antecedência do Push</Label>
                <Select
                  value={String(leadTimeMinutes)}
                  onValueChange={(v) => setLeadTimeMinutes(Number(v))}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Antecedência" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="15">15 minutos antes</SelectItem>
                    <SelectItem value="30">30 minutos antes</SelectItem>
                    <SelectItem value="60">1 hora antes</SelectItem>
                    <SelectItem value="120">2 horas antes</SelectItem>
                    <SelectItem value="240">4 horas antes</SelectItem>
                    <SelectItem value="1440">1 dia antes (24h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Público Alvo</Label>
                <Select
                  value={targetAudience}
                  onValueChange={(v) => setTargetAudience(v as FieldReminderAudience)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Público" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="all_team">Toda a Equipe</SelectItem>
                    <SelectItem value="field_only">Militantes de Rua</SelectItem>
                    <SelectItem value="coordinators_only">Apenas Coordenadores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSaving
                  ? 'Salvando...'
                  : editingReminder
                    ? 'Salvar Alterações'
                    : 'Agendar Lembrete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
