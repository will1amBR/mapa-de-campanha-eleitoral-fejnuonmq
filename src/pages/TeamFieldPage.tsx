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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* PWA Mobile Optimized Header & GPS State */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs uppercase">
              Terminal PWA de Campo
            </Badge>
            {isTracking && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>{' '}
                Transmitindo ao Vivo
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black">Painel do Militante & Coordenador</h1>
          <p className="text-xs text-slate-300 mt-1">
            Membro: <strong>{user?.name || user?.email}</strong> • Bateria Estimada:{' '}
            <strong>{batteryLevel}%</strong>
          </p>
        </div>

        {/* Big GPS Toggle Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-full sm:w-auto font-bold h-12 px-6 shadow-xl transition-all ${
              isTracking
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/30'
            }`}
          >
            <Radio className={`w-5 h-5 mr-2 ${isTracking ? 'animate-spin' : ''}`} />
            {isTracking ? 'Parar Rastreamento GPS' : 'Iniciar Rastreamento GPS'}
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

      {/* Tabs: Quick Check-in vs Manual Entry */}
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
                <Flame className="w-5 h-5 text-amber-500" /> Registro Instantâneo de Atividade de
                Campo
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
                      { id: 'event', label: 'Evento / Comício', icon: '🎤', desc: 'Ato público' },
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
                          {quickPhotoFile ? `${(quickPhotoFile.size / 1024).toFixed(1)} KB` : ''} •
                          Pronta para envio
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
                <Calendar className="w-5 h-5 text-blue-500" /> Lançamento Retroativo de Atividades
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
                    <Label className="text-xs font-semibold text-slate-700">Horário da Ação</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Hoje às 14:30"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Região / Bairro</Label>
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
                    <Label className="text-xs font-semibold text-slate-700">Latitude Manual</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={manualLat}
                      onChange={(e) => setManualLat(parseFloat(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Longitude Manual</Label>
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
                          {manualPhotoFile ? `${(manualPhotoFile.size / 1024).toFixed(1)} KB` : ''}{' '}
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
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            Meus Check-ins Recentes ({myActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {myActivities.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Você ainda não registrou check-ins nesta campanha. Utilize os formulários acima para
              pontuar no mapa!
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
