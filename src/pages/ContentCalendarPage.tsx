import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import type {
  ScheduledPost,
  PostPlatform,
  PostMediaType,
  PostObjective,
  PostStatus,
} from '@/types/campaign'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Layers,
  FileText,
  Link as LinkIcon,
  Sparkles,
  TrendingUp,
  Eye,
  MousePointer,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const ContentCalendarPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('10:00')
  const [formPlatform, setFormPlatform] = useState<PostPlatform>('instagram')
  const [formMediaType, setFormMediaType] = useState<PostMediaType>('image')
  const [formCaption, setFormCaption] = useState('')
  const [formMediaUrl, setFormMediaUrl] = useState('')
  const [formTargetAudience, setFormTargetAudience] = useState('')
  const [formObjective, setFormObjective] = useState<PostObjective>('engagement')
  const [formStatus, setFormStatus] = useState<PostStatus>('scheduled')
  const [formImpressions, setFormImpressions] = useState(0)
  const [formClicks, setFormClicks] = useState(0)
  const [formShares, setFormShares] = useState(0)
  const [formComments, setFormComments] = useState(0)

  const fetchPosts = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const res = await pb.collection('scheduled_posts').getFullList<ScheduledPost>({
        filter: `campaign_id = "${currentCampaign.id}"`,
        sort: 'scheduled_at',
      })
      setPosts(res)
    } catch (err) {
      console.error('Error fetching scheduled posts', err)
      toast.error('Erro ao carregar postagens programadas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [currentCampaign])

  const openNewPostModal = (defaultDate?: Date) => {
    const d = defaultDate || selectedDate || new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    setEditingPost(null)
    setFormTitle('')
    setFormDate(`${yyyy}-${mm}-${dd}`)
    setFormTime('10:00')
    setFormPlatform('instagram')
    setFormMediaType('image')
    setFormCaption('')
    setFormMediaUrl('')
    setFormTargetAudience('Eleitores do município')
    setFormObjective('engagement')
    setFormStatus('scheduled')
    setFormImpressions(0)
    setFormClicks(0)
    setFormShares(0)
    setFormComments(0)
    setModalOpen(true)
  }

  const openEditPostModal = (post: ScheduledPost) => {
    setEditingPost(post)
    const postDate = new Date(post.scheduled_at)
    const yyyy = postDate.getFullYear()
    const mm = String(postDate.getMonth() + 1).padStart(2, '0')
    const dd = String(postDate.getDate()).padStart(2, '0')
    const hh = String(postDate.getHours()).padStart(2, '0')
    const min = String(postDate.getMinutes()).padStart(2, '0')

    setFormTitle(post.title)
    setFormDate(`${yyyy}-${mm}-${dd}`)
    setFormTime(`${hh}:${min}`)
    setFormPlatform(post.platform)
    setFormMediaType(post.media_type)
    setFormCaption(post.caption || '')
    setFormMediaUrl(post.media_url || '')
    setFormTargetAudience(post.target_audience || '')
    setFormObjective(post.objective)
    setFormStatus(post.status)
    setFormImpressions(post.impressions || 0)
    setFormClicks(post.clicks || 0)
    setFormShares(post.shares || 0)
    setFormComments(post.comments || 0)
    setModalOpen(true)
  }

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Nenhuma campanha selecionada')
      return
    }
    if (!formTitle.trim() || !formDate) {
      toast.error('Preencha o título e a data programada')
      return
    }

    try {
      setIsSaving(true)
      const scheduledDateTime = new Date(`${formDate}T${formTime || '00:00'}:00`).toISOString()

      const payload: Partial<ScheduledPost> = {
        campaign_id: currentCampaign.id,
        title: formTitle.trim(),
        scheduled_at: scheduledDateTime,
        platform: formPlatform,
        media_type: formMediaType,
        caption: formCaption.trim(),
        media_url: formMediaUrl.trim(),
        target_audience: formTargetAudience.trim(),
        objective: formObjective,
        status: formStatus,
        impressions: Number(formImpressions) || 0,
        clicks: Number(formClicks) || 0,
        shares: Number(formShares) || 0,
        comments: Number(formComments) || 0,
      }

      if (formStatus === 'published') {
        payload.published_at = scheduledDateTime
      }

      if (editingPost) {
        await pb.collection('scheduled_posts').update(editingPost.id, payload)
        toast.success('Postagem atualizada com sucesso!')
      } else {
        await pb.collection('scheduled_posts').create(payload)
        toast.success('Postagem programada com sucesso!')
      }

      setModalOpen(false)
      fetchPosts()
    } catch (err) {
      console.error('Error saving post', err)
      toast.error('Erro ao salvar postagem')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta postagem agendada?')) return
    try {
      await pb.collection('scheduled_posts').delete(postId)
      toast.success('Postagem excluída')
      fetchPosts()
    } catch (err) {
      toast.error('Erro ao excluir postagem')
    }
  }

  // Calendar navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Calendar grid calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Generate matrix of 35-42 days
  const calendarCells = useMemo(() => {
    const cells = []
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      cells.push({
        date: new Date(year, month - 1, d),
        isCurrentMonth: false,
        dayNumber: d,
      })
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        dayNumber: i,
      })
    }
    // Next month filler days to complete grid
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        dayNumber: i,
      })
    }
    return cells
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth])

  // Helper to map posts to a given date string YYYY-MM-DD
  const getPostsForDate = (date: Date) => {
    const targetStr = date.toISOString().split('T')[0]
    return posts.filter((p) => p.scheduled_at.startsWith(targetStr))
  }

  // Selected date posts
  const selectedDatePosts = useMemo(() => {
    return getPostsForDate(selectedDate)
  }, [selectedDate, posts])

  const getPlatformIcon = (platform: PostPlatform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-500" />
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5 text-blue-600" />
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-600" />
      case 'twitter':
        return <Twitter className="w-3.5 h-3.5 text-sky-500" />
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5 text-blue-700" />
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
      case 'tiktok':
        return <Share2 className="w-3.5 h-3.5 text-slate-900" />
    }
  }

  const getPlatformBadgeColor = (platform: PostPlatform) => {
    switch (platform) {
      case 'instagram':
        return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'facebook':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'youtube':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'twitter':
        return 'bg-sky-50 text-sky-700 border-sky-200'
      case 'linkedin':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'whatsapp':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'tiktok':
        return 'bg-slate-100 text-slate-800 border-slate-300'
    }
  }

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Publicado
          </Badge>
        )
      case 'scheduled':
        return (
          <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> Programado
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">
            Rascunho
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
            <XCircle className="w-3 h-3 mr-1" /> Cancelado
          </Badge>
        )
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs shrink-0">
              PLANEJAMENTO DIGITAL
            </Badge>
            <span className="text-xs text-slate-300 truncate">
              Calendário de Conteúdo Eleitoral
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
            Calendário de Postagens & Redes
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 break-words">
            Programe e monitore a distribuição de conteúdo em todas as redes sociais da campanha.
          </p>
        </div>

        <Button
          onClick={() => openNewPostModal()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md h-9 sm:h-10 px-4 shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 mr-1.5 shrink-0" /> Nova Postagem
        </Button>
      </div>

      {/* Calendar & Selected Day Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">
                  {MONTH_NAMES[month]} {year}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {posts.length} postagens cadastradas no total
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(new Date())
                  setSelectedDate(new Date())
                }}
                className="h-8 text-xs font-semibold px-2.5"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.date.toDateString() === selectedDate.toDateString()
                const isToday = cell.date.toDateString() === new Date().toDateString()
                const dayPosts = getPostsForDate(cell.date)

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[70px] sm:min-h-[88px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-400/40'
                        : cell.isCurrentMonth
                          ? 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-slate-50/80'
                          : 'border-slate-100 bg-slate-50/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white">
                          {dayPosts.length}
                        </span>
                      )}
                    </div>

                    {/* Posts indicator dots / pills */}
                    <div className="space-y-1 mt-1">
                      {dayPosts.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className="text-[9px] truncate px-1 py-0.5 rounded bg-slate-100 text-slate-800 font-medium flex items-center gap-1 border border-slate-200/60"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              p.status === 'published'
                                ? 'bg-emerald-500'
                                : p.status === 'scheduled'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                            }`}
                          />
                          <span className="truncate">{p.title}</span>
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[8px] text-slate-400 font-semibold px-1">
                          +{dayPosts.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Posts List (1 Col) */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white h-full flex flex-col">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Postagens de {selectedDate.toLocaleDateString('pt-BR')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {selectedDatePosts.length}{' '}
                  {selectedDatePosts.length === 1 ? 'post programado' : 'posts programados'}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => openNewPostModal(selectedDate)}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[620px] space-y-3">
              {selectedDatePosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum post agendado para este dia</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em "+ Adicionar" para planejar uma postagem.
                  </p>
                </div>
              ) : (
                selectedDatePosts.map((post) => {
                  const postTime = new Date(post.scheduled_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold flex items-center gap-1 ${getPlatformBadgeColor(
                              post.platform,
                            )}`}
                          >
                            {getPlatformIcon(post.platform)}
                            {post.platform.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                            {post.media_type}
                          </Badge>
                          {getStatusBadge(post.status)}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPostModal(post)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{postTime}</span> •
                          <span className="capitalize">{post.objective}</span>
                        </div>
                      </div>

                      {post.caption && (
                        <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60 leading-relaxed line-clamp-3">
                          "{post.caption}"
                        </p>
                      )}

                      {post.media_url && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-h-36 relative group">
                          <img
                            src={post.media_url}
                            alt="Mídia"
                            className="w-full h-36 object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Post Metrics (if published) */}
                      {post.status === 'published' && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-600 font-semibold bg-white p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 block font-normal">Impressões</span>
                            <span className="text-slate-900 font-bold">
                              {(post.impressions || 0).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-normal">Cliques</span>
                            <span className="text-slate-900 font-bold">
                              {(post.clicks || 0).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-normal">Shares</span>
                            <span className="text-slate-900 font-bold">
                              {(post.shares || 0).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-normal">Comments</span>
                            <span className="text-slate-900 font-bold">
                              {(post.comments || 0).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / Edit Post Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900">
          <form onSubmit={handleSavePost}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-500" />
                {editingPost ? 'Editar Postagem Programada' : 'Criar Nova Postagem Programada'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os detalhes do conteúdo, plataforma e cronograma de publicação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Título da Postagem *</Label>
                <Input
                  placeholder="Ex: Vídeo de propostas para a saúde nos bairros"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Data Programada *</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Horário Programado</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Platform & Media Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Plataforma *</Label>
                  <Select
                    value={formPlatform}
                    onValueChange={(v) => setFormPlatform(v as PostPlatform)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Tipo de Mídia *</Label>
                  <Select
                    value={formMediaType}
                    onValueChange={(v) => setFormMediaType(v as PostMediaType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                      <SelectItem value="reels">Reels / Shorts</SelectItem>
                      <SelectItem value="stories">Stories</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Legenda / Texto do Post</Label>
                <Textarea
                  placeholder="Escreva a legenda completa que será publicada..."
                  rows={3}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* Media URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  URL da Mídia (Imagem ou Vídeo)
                </Label>
                <Input
                  placeholder="https://..."
                  value={formMediaUrl}
                  onChange={(e) => setFormMediaUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Target Audience & Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Público-Alvo</Label>
                  <Input
                    placeholder="Ex: Jovens 18-29 anos, Zona Sul"
                    value={formTargetAudience}
                    onChange={(e) => setFormTargetAudience(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Objetivo</Label>
                  <Select
                    value={formObjective}
                    onValueChange={(v) => setFormObjective(v as PostObjective)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="engagement">Engajamento</SelectItem>
                      <SelectItem value="conversion">Conversão</SelectItem>
                      <SelectItem value="awareness">Conscientização</SelectItem>
                      <SelectItem value="mobilization">Mobilização</SelectItem>
                      <SelectItem value="event">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Status da Postagem</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as PostStatus)}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Post metrics if Published */}
              {formStatus === 'published' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Métricas Pós-Publicação
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-500 font-semibold">Impressões</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formImpressions}
                        onChange={(e) => setFormImpressions(Number(e.target.value))}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-semibold">Cliques</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formClicks}
                        onChange={(e) => setFormClicks(Number(e.target.value))}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-semibold">Shares</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formShares}
                        onChange={(e) => setFormShares(Number(e.target.value))}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-semibold">
                        Comentários
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formComments}
                        onChange={(e) => setFormComments(Number(e.target.value))}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSaving
                  ? 'Salvando...'
                  : editingPost
                    ? 'Atualizar Postagem'
                    : 'Programar Postagem'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
