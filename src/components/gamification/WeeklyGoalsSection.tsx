import React, { useState, useEffect, useMemo, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useCampaign } from '@/hooks/use-campaign'
import type {
  WeeklyGoal,
  WeeklyGoalType,
  Activity,
  TeamLocation,
  UserRecord,
} from '@/types/campaign'
import { calculateHaversineKm } from '@/lib/gamification'
import {
  Target,
  Plus,
  Flame,
  MapPin,
  Navigation,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  SlidersHorizontal,
  Trash2,
  Edit2,
  TrendingUp,
  Clock,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export interface WeeklyGoalWithProgress extends WeeklyGoal {
  currentValue: number
  progressPercentage: number
  isCompleted: boolean
  remainingValue: number
}

interface WeeklyGoalsSectionProps {
  activities: Activity[]
  teamLocations?: TeamLocation[]
  teamUsers?: UserRecord[]
  className?: string
  showManageButtons?: boolean
}

// Utility to get start & end of current week (Monday to Sunday)
export function getCurrentWeekRange(): { start: string; end: string; label: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = (dayOfWeek + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const startStr = monday.toISOString().split('T')[0]
  const endStr = sunday.toISOString().split('T')[0]
  const label = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  return { start: startStr, end: endStr, label }
}

export const WeeklyGoalsSection: React.FC<WeeklyGoalsSectionProps> = ({
  activities,
  teamLocations = [],
  className = '',
  showManageButtons = true,
}) => {
  const { user } = useAuth()
  const { currentCampaign } = useCampaign()

  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [loading, setLoading] = useState(true)

  // Modal create/edit state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<WeeklyGoal | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<WeeklyGoalType>('checkins')
  const [formTarget, setFormTarget] = useState<number>(20)
  const [formStart, setFormStart] = useState<string>('')
  const [formEnd, setFormEnd] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Permission check: admin & coordinator can create/edit/delete
  const canManageGoals = user?.role === 'admin' || user?.role === 'coordinator'

  const fetchGoals = useCallback(async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const list = await pb.collection('weekly_goals').getFullList<WeeklyGoal>({
        filter: `campaign_id = "${currentCampaign.id}" && (status = "active" || status = "completed" || status = null)`,
        sort: 'created',
        expand: 'created_by',
      })
      setGoals(list)
    } catch (err) {
      console.error('Error loading weekly goals:', err)
    } finally {
      setLoading(false)
    }
  }, [currentCampaign])

  useEffect(() => {
    fetchGoals()

    // Realtime subscription to goals
    const unsub = pb.collection('weekly_goals').subscribe('*', () => {
      fetchGoals()
    })

    return () => {
      unsub.then((u) => u())
    }
  }, [fetchGoals])

  // Reset form to defaults
  const openCreateDialog = () => {
    const range = getCurrentWeekRange()
    setEditingGoal(null)
    setFormTitle('20 Check-ins nesta semana')
    setFormDescription('Meta de cobertura da equipe nas principais zonas da cidade.')
    setFormType('checkins')
    setFormTarget(20)
    setFormStart(range.start)
    setFormEnd(range.end)
    setDialogOpen(true)
  }

  const openEditDialog = (goal: WeeklyGoal) => {
    setEditingGoal(goal)
    setFormTitle(goal.title)
    setFormDescription(goal.description || '')
    setFormType(goal.type)
    setFormTarget(goal.target_value)
    setFormStart(goal.week_start ? goal.week_start.split('T')[0] : '')
    setFormEnd(goal.week_end ? goal.week_end.split('T')[0] : '')
    setDialogOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) return
    if (!formTitle.trim() || !formTarget || formTarget < 1) {
      toast.error('Preencha um título e um valor alvo válido (maior que zero).')
      return
    }

    try {
      setIsSubmitting(true)
      const range = getCurrentWeekRange()
      const payload = {
        campaign_id: currentCampaign.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        type: formType,
        target_value: Number(formTarget),
        week_start: formStart
          ? new Date(formStart).toISOString()
          : new Date(range.start).toISOString(),
        week_end: formEnd ? new Date(formEnd).toISOString() : new Date(range.end).toISOString(),
        status: 'active',
        created_by: user?.id,
      }

      if (editingGoal) {
        await pb.collection('weekly_goals').update(editingGoal.id, payload)
        toast.success('Meta semanal atualizada com sucesso!')
      } else {
        await pb.collection('weekly_goals').create(payload)
        toast.success('Nova meta semanal criada para a equipe!')
      }

      setDialogOpen(false)
      fetchGoals()
    } catch (err) {
      console.error('Error saving goal:', err)
      toast.error('Erro ao salvar meta semanal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta meta semanal?')) return
    try {
      await pb.collection('weekly_goals').delete(id)
      toast.success('Meta semanal excluída.')
      fetchGoals()
    } catch (err) {
      toast.error('Erro ao excluir meta.')
    }
  }

  // Calculate actual team progress per goal in real time based on activities and GPS trails
  const goalsWithProgress = useMemo<WeeklyGoalWithProgress[]>(() => {
    return goals.map((goal) => {
      let startDate = goal.week_start ? new Date(goal.week_start) : null
      let endDate = goal.week_end ? new Date(goal.week_end) : null

      if (startDate) startDate.setHours(0, 0, 0, 0)
      if (endDate) endDate.setHours(23, 59, 59, 999)

      // Filter activities within the goal's date window
      const actsInWindow = activities.filter((act) => {
        if (!startDate || !endDate) return true
        const actDate = new Date(act.created)
        return actDate >= startDate && actDate <= endDate
      })

      let currentValue = 0

      if (goal.type === 'checkins') {
        currentValue = actsInWindow.length
      } else if (goal.type === 'indicacoes') {
        currentValue = actsInWindow.reduce((acc, curr) => acc + (curr.voters_contacted || 0), 0)
      } else if (goal.type === 'km') {
        // Calculate km traveled
        let calculatedKm = 0

        // 1. From GPS team locations in window
        const locsInWindow = teamLocations.filter((l) => {
          if (!startDate || !endDate) return true
          const lDate = new Date(l.created)
          return lDate >= startDate && lDate <= endDate
        })

        // Group by user
        const byUser: Record<string, TeamLocation[]> = {}
        locsInWindow.forEach((l) => {
          if (!byUser[l.user_id]) byUser[l.user_id] = []
          byUser[l.user_id].push(l)
        })

        Object.values(byUser).forEach((userLocs) => {
          const sorted = [...userLocs].sort(
            (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
          )
          for (let i = 1; i < sorted.length; i++) {
            const d = calculateHaversineKm(
              sorted[i - 1].lat,
              sorted[i - 1].lng,
              sorted[i].lat,
              sorted[i].lng,
            )
            if (d > 0.005 && d < 100) {
              calculatedKm += d
            }
          }
        })

        // 2. From activities if GPS points are few
        if (calculatedKm === 0 && actsInWindow.length > 1) {
          for (let i = 1; i < actsInWindow.length; i++) {
            const d = calculateHaversineKm(
              actsInWindow[i - 1].lat,
              actsInWindow[i - 1].lng,
              actsInWindow[i].lat,
              actsInWindow[i].lng,
            )
            if (d > 0.05 && d < 100) {
              calculatedKm += d
            }
          }
        }

        // Realistic fallback estimate from check-in count if exact GPS trails are sparse
        if (calculatedKm === 0 && actsInWindow.length > 0) {
          calculatedKm = actsInWindow.length * 2.5
        }

        currentValue = Number(calculatedKm.toFixed(1))
      }

      const target = goal.target_value || 1
      const progressPercentage = Math.min(100, Math.round((currentValue / target) * 100))
      const isCompleted = currentValue >= target
      const remainingValue = Math.max(0, target - currentValue)

      return {
        ...goal,
        currentValue,
        progressPercentage,
        isCompleted,
        remainingValue,
      }
    })
  }, [goals, activities, teamLocations])

  // Summary stats
  const totalGoals = goalsWithProgress.length
  const completedGoals = goalsWithProgress.filter((g) => g.isCompleted).length
  const globalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0

  const weekRange = getCurrentWeekRange()

  return (
    <Card
      className={`border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-500/20">
            <Target className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Metas Semanais da Equipe
              </CardTitle>
              <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5">
                Semana Atual ({weekRange.label})
              </Badge>
              {totalGoals > 0 && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    completedGoals === totalGoals
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {completedGoals} de {totalGoals} batidas ({globalCompletionRate}%)
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5 truncate">
              Acompanhamento coletivo do progresso da campanha em tempo real
            </CardDescription>
          </div>
        </div>

        {/* Action button */}
        {showManageButtons && canManageGoals && (
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-bold text-xs h-8 px-3 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Nova Meta
          </Button>
        )}
      </CardHeader>

      {/* Content */}
      <CardContent className="p-4 sm:p-5 space-y-4">
        {loading && goals.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Carregando metas semanais...</span>
          </div>
        ) : goalsWithProgress.length === 0 ? (
          <div className="p-6 sm:p-8 text-center rounded-xl bg-white/80 border border-dashed border-amber-200 flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">
              Nenhuma meta semanal definida ainda
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {canManageGoals
                ? 'Coordenador: crie metas de check-ins, indicações ou km para engajar e orientar a equipe de campo.'
                : 'A coordenação ainda não definiu as metas para esta semana. O progresso aparecerá aqui assim que for publicado.'}
            </p>
            {canManageGoals && (
              <Button
                size="sm"
                onClick={openCreateDialog}
                className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Criar Primeira Meta
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {goalsWithProgress.map((goal) => {
              const isCheckins = goal.type === 'checkins'
              const isIndicacoes = goal.type === 'indicacoes'
              const isKm = goal.type === 'km'

              const unitLabel = isCheckins ? 'check-ins' : isIndicacoes ? 'eleitores' : 'km'
              const typeIcon = isCheckins ? (
                <MapPin className="w-4 h-4" />
              ) : isIndicacoes ? (
                <Flame className="w-4 h-4" />
              ) : (
                <Navigation className="w-4 h-4" />
              )

              const themeColor = isCheckins
                ? {
                    border: 'border-blue-200/80',
                    badge: 'bg-blue-50 text-blue-700 border-blue-200',
                    barFill: 'bg-blue-600',
                    iconBg: 'bg-blue-100 text-blue-700',
                  }
                : isIndicacoes
                  ? {
                      border: 'border-amber-200/80',
                      badge: 'bg-amber-50 text-amber-700 border-amber-200',
                      barFill: 'bg-amber-500',
                      iconBg: 'bg-amber-100 text-amber-700',
                    }
                  : {
                      border: 'border-emerald-200/80',
                      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      barFill: 'bg-emerald-500',
                      iconBg: 'bg-emerald-100 text-emerald-700',
                    }

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-xl border bg-white shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative group ${
                    goal.isCompleted ? 'ring-1 ring-emerald-400/60 bg-emerald-50/20' : ''
                  }`}
                >
                  {/* Top Bar: Type Badge & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${themeColor.iconBg}`}
                        >
                          {typeIcon}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${themeColor.badge}`}
                        >
                          {goal.type === 'checkins'
                            ? 'Check-ins'
                            : goal.type === 'indicacoes'
                              ? 'Indicações'
                              : 'Km Percorridos'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        {goal.isCompleted ? (
                          <Badge className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 shadow-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Meta Batida!
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            {goal.progressPercentage}%
                          </span>
                        )}

                        {/* Coordinator menu: edit/delete */}
                        {canManageGoals && (
                          <div className="flex items-center ml-1">
                            <button
                              type="button"
                              onClick={() => openEditDialog(goal)}
                              title="Editar meta"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(goal.id)}
                              title="Excluir meta"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug break-words">
                      {goal.title}
                    </h4>
                    {goal.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Progress Bar & Value Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-lg font-black text-slate-900">
                          {goal.currentValue.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs text-slate-400 font-medium ml-1">
                          / {goal.target_value.toLocaleString('pt-BR')} {unitLabel}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500">
                        {goal.isCompleted ? (
                          <span className="text-emerald-600 font-bold">100% concluído</span>
                        ) : (
                          <span>Faltam {goal.remainingValue.toLocaleString('pt-BR')}</span>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          goal.isCompleted
                            ? 'bg-emerald-500'
                            : isCheckins
                              ? 'bg-blue-600'
                              : isIndicacoes
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                        }`}
                        style={{ width: `${goal.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Atualizado em tempo real
                      </span>
                      <span>Equipe coletiva</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Goal Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveGoal}>
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                {editingGoal ? 'Editar Meta Semanal' : 'Definir Nova Meta Semanal'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A meta e a barra de progresso ficarão visíveis para toda a equipe na Dashboard e
                painéis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Goal Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Título da Meta *</Label>
                <Input
                  placeholder="Ex: 20 Check-ins nesta semana"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Goal Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipo da Meta *</Label>
                <Select value={formType} onValueChange={(val: WeeklyGoalType) => setFormType(val)}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    <SelectItem value="checkins">
                      📍 Check-ins de Campo (Nº de Atividades)
                    </SelectItem>
                    <SelectItem value="indicacoes">🔥 Eleitores Indicados / Contatados</SelectItem>
                    <SelectItem value="km">🧭 Quilômetros Percorridos (GPS / Trajeto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Value */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Valor Alvo (
                  {formType === 'checkins'
                    ? 'check-ins'
                    : formType === 'indicacoes'
                      ? 'eleitores'
                      : 'km'}
                  ) *
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formTarget}
                  onChange={(e) => setFormTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="text-xs font-bold"
                  required
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Início da Semana</Label>
                  <Input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Fim da Semana</Label>
                  <Input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Descrição / Instruções (Opcional)
                </Label>
                <Textarea
                  placeholder="Ex: Focar em panfletagem no centro e terminais de transporte nos horários de pico..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : editingGoal
                    ? 'Salvar Alterações'
                    : 'Criar Meta Semanal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
