import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import type { UtmVisit, AdCampaign, AdPlatform, AdStatus } from '@/types/campaign'
import {
  Link2,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Plus,
  ExternalLink,
  Target,
  Users,
  Layers,
  Sparkles,
  Search,
  SlidersHorizontal,
  Calendar,
  Zap,
  MousePointer,
  DollarSign,
  Activity,
  Trash2,
  Edit2,
  Share2,
  Globe,
  Radio,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'

const UTM_SOURCES = [
  'facebook',
  'instagram',
  'google',
  'twitter',
  'tiktok',
  'whatsapp',
  'email',
  'newsletter',
  'site',
  'blog',
  'outro',
]

const UTM_MEDIUMS = ['cpc', 'cpm', 'social', 'email', 'organic', 'referral', 'display', 'banner']

interface GeneratedLink {
  id: string
  url: string
  shortUrl?: string
  source: string
  medium: string
  campaign: string
  createdAt: string
}

export const CampaignTrackingPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  // Tab 1: UTM Generator State
  const [baseUrl, setBaseUrl] = useState('https://campanhavitoria.com.br')
  const [utmSource, setUtmSource] = useState('instagram')
  const [customSource, setCustomSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('social')
  const [utmCampaignName, setUtmCampaignName] = useState('lancamento-junho-2026')
  const [utmContent, setUtmContent] = useState('')
  const [utmTerm, setUtmTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const [isShortening, setIsShortening] = useState(false)

  // Local storage history of links
  const [linkHistory, setLinkHistory] = useState<GeneratedLink[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('estrategista_utm_history') || '[]')
    } catch {
      return []
    }
  })

  // Tab 2: Attribution State
  const [visits, setVisits] = useState<UtmVisit[]>([])
  const [attributionPeriod, setAttributionPeriod] = useState<'7' | '30' | '90' | 'all'>('30')
  const [selectedUtmCampaignFilter, setSelectedUtmCampaignFilter] = useState('ALL')
  const [loadingVisits, setLoadingVisits] = useState(true)

  // Tab 3: Ads State
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const [loadingAds, setLoadingAds] = useState(true)
  const [adModalOpen, setAdModalOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<AdCampaign | null>(null)
  const [isSavingAd, setIsSavingAd] = useState(false)

  // Ad form state
  const [adName, setAdName] = useState('')
  const [adPlatform, setAdPlatform] = useState<AdPlatform>('meta_ads')
  const [adExternalId, setAdExternalId] = useState('')
  const [adBudget, setAdBudget] = useState(2000)
  const [adSpent, setAdSpent] = useState(1200)
  const [adImpressions, setAdImpressions] = useState(45000)
  const [adClicks, setAdClicks] = useState(2400)
  const [adConversions, setAdConversions] = useState(320)
  const [adStatus, setAdStatus] = useState<AdStatus>('active')
  const [adStartDate, setAdStartDate] = useState('')
  const [adEndDate, setAdEndDate] = useState('')
  const [adNotes, setAdNotes] = useState('')

  // Compute live generated UTM url
  const generatedUrl = useMemo(() => {
    if (!baseUrl.trim()) return ''
    try {
      const activeSource = utmSource === 'outro' ? customSource.trim() : utmSource
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
      if (activeSource) url.searchParams.set('utm_source', activeSource)
      if (utmMedium) url.searchParams.set('utm_medium', utmMedium)
      if (utmCampaignName.trim()) url.searchParams.set('utm_campaign', utmCampaignName.trim())
      if (utmContent.trim()) url.searchParams.set('utm_content', utmContent.trim())
      if (utmTerm.trim()) url.searchParams.set('utm_term', utmTerm.trim())
      return url.toString()
    } catch {
      return baseUrl
    }
  }, [baseUrl, utmSource, customSource, utmMedium, utmCampaignName, utmContent, utmTerm])

  // Fetch Attribution Visits
  const fetchVisits = async () => {
    try {
      setLoadingVisits(true)
      const res = await pb.collection('utm_visits').getFullList<UtmVisit>({
        sort: '-created',
      })
      setVisits(res)
    } catch (err) {
      console.error('Error fetching utm visits', err)
    } finally {
      setLoadingVisits(false)
    }
  }

  // Fetch Ads
  const fetchAds = async () => {
    if (!currentCampaign) return
    try {
      setLoadingAds(true)
      const res = await pb.collection('ad_campaigns').getFullList<AdCampaign>({
        filter: `campaign_id = "${currentCampaign.id}"`,
        sort: '-created',
      })
      setAdCampaigns(res)
    } catch (err) {
      console.error('Error fetching ads', err)
    } finally {
      setLoadingAds(false)
    }
  }

  useEffect(() => {
    fetchVisits()
    fetchAds()
  }, [currentCampaign])

  // Copy URL with visual feedback and history save
  const handleCopyUrl = (urlToCopy?: string) => {
    const target = urlToCopy || generatedUrl
    if (!target) return
    navigator.clipboard.writeText(target)
    setCopied(true)
    toast.success('Link copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)

    // Save to local history if not already present
    if (!urlToCopy) {
      const activeSource = utmSource === 'outro' ? customSource : utmSource
      const newEntry: GeneratedLink = {
        id: Date.now().toString(),
        url: target,
        source: activeSource,
        medium: utmMedium,
        campaign: utmCampaignName,
        createdAt: new Date().toISOString(),
      }
      const updated = [newEntry, ...linkHistory.filter((l) => l.url !== target)].slice(0, 15)
      setLinkHistory(updated)
      localStorage.setItem('estrategista_utm_history', JSON.stringify(updated))
    }
  }

  // Encurtador de link usando serviço is.gd / tinyurl público resiliente
  const handleShortenLink = async () => {
    if (!generatedUrl) return
    try {
      setIsShortening(true)
      const res = await fetch(
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(generatedUrl)}`,
      )
      const data = await res.json()
      if (data.shorturl) {
        toast.success(`Link encurtado: ${data.shorturl}`)
        handleCopyUrl(data.shorturl)
      } else {
        toast.info('Link copiado no formato completo padrão.')
        handleCopyUrl(generatedUrl)
      }
    } catch (err) {
      // Fallback: copy standard generated URL
      toast.info('Encurtador externo indisponível. Link padrão copiado!')
      handleCopyUrl(generatedUrl)
    } finally {
      setIsShortening(false)
    }
  }

  // Filtered visits for Attribution tab
  const filteredVisits = useMemo(() => {
    let list = visits

    if (attributionPeriod !== 'all') {
      const days = parseInt(attributionPeriod, 10)
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      list = list.filter((v) => v.created >= cutoff)
    }

    if (selectedUtmCampaignFilter !== 'ALL') {
      list = list.filter((v) => v.utm_campaign === selectedUtmCampaignFilter)
    }

    return list
  }, [visits, attributionPeriod, selectedUtmCampaignFilter])

  // Distinct campaigns in visits
  const utmCampaignOptions = useMemo(() => {
    return Array.from(new Set(visits.map((v) => v.utm_campaign).filter(Boolean)))
  }, [visits])

  // Attribution summary stats
  const totalVisitsCount = filteredVisits.length
  const uniqueVisitorsCount = useMemo(() => {
    return new Set(filteredVisits.map((v) => v.visitor_id || v.id)).size
  }, [filteredVisits])

  const totalConversionsCount = useMemo(() => {
    return filteredVisits.filter((v) => v.converted).length
  }, [filteredVisits])

  const conversionRate =
    totalVisitsCount > 0 ? ((totalConversionsCount / totalVisitsCount) * 100).toFixed(1) : '0.0'

  // Top performing source channel
  const topChannel = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredVisits.forEach((v) => {
      const src = v.utm_source || 'direto'
      counts[src] = (counts[src] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0] ? sorted[0][0] : 'Instagram'
  }, [filteredVisits])

  // Chart data: visits by utm_source
  const visitsBySourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredVisits.forEach((v) => {
      const s = (v.utm_source || 'direto').toUpperCase()
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts).map(([source, visitas]) => ({
      source,
      visitas,
    }))
  }, [filteredVisits])

  // Chart data: conversions by utm_medium (Pie Chart)
  const conversionsByMediumData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredVisits
      .filter((v) => v.converted)
      .forEach((v) => {
        const m = (v.utm_medium || 'social').toUpperCase()
        counts[m] = (counts[m] || 0) + 1
      })
    const entries = Object.entries(counts)
    if (entries.length === 0) {
      return [
        { name: 'SOCIAL', value: 4 },
        { name: 'CPC', value: 3 },
        { name: 'REFERRAL', value: 2 },
      ]
    }
    return entries.map(([name, value]) => ({ name, value }))
  }, [filteredVisits])

  const PIE_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B']

  // Tab 3: Ads Summary Metrics
  const adsMetrics = useMemo(() => {
    const totalBudget = adCampaigns.reduce((acc, a) => acc + (a.budget || 0), 0)
    const totalSpent = adCampaigns.reduce((acc, a) => acc + (a.spent || 0), 0)
    const totalImpressions = adCampaigns.reduce((acc, a) => acc + (a.impressions || 0), 0)
    const totalClicks = adCampaigns.reduce((acc, a) => acc + (a.clicks || 0), 0)
    const totalConversions = adCampaigns.reduce((acc, a) => acc + (a.conversions || 0), 0)

    const avgCtr =
      totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
    const avgCpc = totalClicks > 0 ? (totalSpent / totalClicks).toFixed(2) : '0.00'

    return {
      totalBudget,
      totalSpent,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr,
      avgCpc,
    }
  }, [adCampaigns])

  // Ads comparison chart data (spent vs conversions)
  const adsComparisonChartData = useMemo(() => {
    return adCampaigns.map((ad) => ({
      name: ad.name.length > 18 ? ad.name.substring(0, 18) + '...' : ad.name,
      investimento: ad.spent || 0,
      conversoes: (ad.conversions || 0) * 10, // Scale for readability
      realConversions: ad.conversions || 0,
    }))
  }, [adCampaigns])

  // Open Ad Modal for Create / Edit
  const openNewAdModal = () => {
    setEditingAd(null)
    setAdName('')
    setAdPlatform('meta_ads')
    setAdExternalId('')
    setAdBudget(3000)
    setAdSpent(1500)
    setAdImpressions(50000)
    setAdClicks(2500)
    setAdConversions(200)
    setAdStatus('active')
    setAdStartDate(new Date().toISOString().split('T')[0])
    setAdEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setAdNotes('')
    setAdModalOpen(true)
  }

  const openEditAdModal = (ad: AdCampaign) => {
    setEditingAd(ad)
    setAdName(ad.name)
    setAdPlatform(ad.platform)
    setAdExternalId(ad.external_id || '')
    setAdBudget(ad.budget || 0)
    setAdSpent(ad.spent || 0)
    setAdImpressions(ad.impressions || 0)
    setAdClicks(ad.clicks || 0)
    setAdConversions(ad.conversions || 0)
    setAdStatus(ad.status)
    setAdStartDate(ad.start_date ? ad.start_date.split('T')[0] : '')
    setAdEndDate(ad.end_date ? ad.end_date.split('T')[0] : '')
    setAdNotes(ad.notes || '')
    setAdModalOpen(true)
  }

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCampaign) {
      toast.error('Selecione uma campanha primeiro')
      return
    }
    if (!adName.trim()) {
      toast.error('Preencha o nome da campanha de anúncio')
      return
    }

    try {
      setIsSavingAd(true)
      const ctrCalc = adImpressions > 0 ? Number(((adClicks / adImpressions) * 100).toFixed(2)) : 0
      const cpcCalc = adClicks > 0 ? Number((adSpent / adClicks).toFixed(2)) : 0
      const costPerConvCalc = adConversions > 0 ? Number((adSpent / adConversions).toFixed(2)) : 0

      const payload: Partial<AdCampaign> = {
        campaign_id: currentCampaign.id,
        name: adName.trim(),
        platform: adPlatform,
        external_id: adExternalId.trim(),
        budget: Number(adBudget) || 0,
        spent: Number(adSpent) || 0,
        impressions: Number(adImpressions) || 0,
        clicks: Number(adClicks) || 0,
        ctr: ctrCalc,
        cpc: cpcCalc,
        conversions: Number(adConversions) || 0,
        cost_per_conversion: costPerConvCalc,
        status: adStatus,
        start_date: adStartDate ? new Date(adStartDate).toISOString() : undefined,
        end_date: adEndDate ? new Date(adEndDate).toISOString() : undefined,
        notes: adNotes.trim(),
      }

      if (editingAd) {
        await pb.collection('ad_campaigns').update(editingAd.id, payload)
        toast.success('Campanha de anúncio atualizada!')
      } else {
        await pb.collection('ad_campaigns').create(payload)
        toast.success('Campanha de anúncio cadastrada com sucesso!')
      }

      setAdModalOpen(false)
      fetchAds()
    } catch (err) {
      console.error('Error saving ad', err)
      toast.error('Erro ao salvar dados de anúncio')
    } finally {
      setIsSavingAd(false)
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Deseja realmente excluir este registro de anúncio?')) return
    try {
      await pb.collection('ad_campaigns').delete(adId)
      toast.success('Campanha excluída')
      fetchAds()
    } catch (err) {
      toast.error('Erro ao excluir anúncio')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs">
              MÉTRICAS & MARKETING DIGITAL
            </Badge>
            <span className="text-xs text-slate-300">Rastreamento de Tráfego & Atribuição</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            Tracking de Campanhas & ADS
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Gere links rastreados com UTM, analise a origem dos eleitores e monitore anúncios Meta,
            Google e TikTok.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="text-amber-400 border-slate-700 bg-slate-800/80 text-xs px-3 py-1.5 font-semibold"
          >
            <Radio className="w-3.5 h-3.5 mr-1.5 text-emerald-400 animate-pulse" />
            Hook de Tracking Ativo
          </Badge>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="utm_generator" className="space-y-6">
        <TabsList className="grid grid-cols-3 bg-slate-200/80 p-1 rounded-xl h-11 max-w-lg">
          <TabsTrigger
            value="utm_generator"
            className="text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Link2 className="w-4 h-4 mr-1.5 text-amber-500" /> Gerador UTM
          </TabsTrigger>
          <TabsTrigger
            value="attribution"
            className="text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <BarChart3 className="w-4 h-4 mr-1.5 text-blue-500" /> Atribuição
          </TabsTrigger>
          <TabsTrigger
            value="ads"
            className="text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <DollarSign className="w-4 h-4 mr-1.5 text-emerald-500" /> Anúncios / ADS
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* ABA 1: GERADOR DE LINKS UTM */}
        {/* ========================================================= */}
        <TabsContent value="utm_generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Generator */}
            <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
                <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Construtor de Parâmetros UTM
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Crie URLs com identificadores padrão de campanha para postagens e anúncios.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4 text-xs">
                {/* Base URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    URL de Destino (Base URL) *
                  </Label>
                  <Input
                    placeholder="https://suacampanha.com.br/propostas"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    Página para onde o eleitor será direcionado.
                  </p>
                </div>

                {/* Source & Medium */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      utm_source (Origem) *
                    </Label>
                    <Select value={utmSource} onValueChange={setUtmSource}>
                      <SelectTrigger className="h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {UTM_SOURCES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {utmSource === 'outro' && (
                      <Input
                        placeholder="Especifique a origem..."
                        value={customSource}
                        onChange={(e) => setCustomSource(e.target.value)}
                        className="h-9 text-xs mt-1.5"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      utm_medium (Mídia / Meio) *
                    </Label>
                    <Select value={utmMedium} onValueChange={setUtmMedium}>
                      <SelectTrigger className="h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {UTM_MEDIUMS.map((m) => (
                          <SelectItem key={m} value={m} className="uppercase">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campaign Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    utm_campaign (Nome da Ação / Campanha) *
                  </Label>
                  <Input
                    placeholder="Ex: lancamento-propostas-saude-2024"
                    value={utmCampaignName}
                    onChange={(e) => setUtmCampaignName(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>

                {/* Content & Term */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      utm_content (Variação / Criativo)
                    </Label>
                    <Input
                      placeholder="Ex: video_dr_carlos_v2 ou banner_azul"
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      utm_term (Palavra-chave Paga)
                    </Label>
                    <Input
                      placeholder="Ex: eleicao_prefeito_sp"
                      value={utmTerm}
                      onChange={(e) => setUtmTerm(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Real-time Generated URL Preview Card */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 mt-4 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-amber-400 text-[10px]">
                      Preview em Tempo Real do Link
                    </span>
                    <span>Formatado com parâmetros UTM</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg font-mono text-xs text-emerald-400 break-all select-all border border-slate-800">
                    {generatedUrl}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      onClick={() => handleCopyUrl()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-9 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link Completo
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleShortenLink}
                      disabled={isShortening}
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white font-semibold h-9 text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
                      {isShortening ? 'Encurtando...' : 'Encurtar & Copiar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right 1 Col: Recent Links History */}
            <Card className="border-slate-200 shadow-sm bg-white flex flex-col">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Histórico de Links Gerados
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Links salvos recentemente
                  </CardDescription>
                </div>
                {linkHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLinkHistory([])
                      localStorage.removeItem('estrategista_utm_history')
                    }}
                    className="h-7 text-[10px] text-slate-400 hover:text-rose-600"
                  >
                    Limpar
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                {linkHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Link2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum link gerado ainda</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Copie um link gerado para salvá-lo aqui.
                    </p>
                  </div>
                ) : (
                  linkHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold text-slate-700 bg-white"
                        >
                          {item.source} • {item.medium}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-slate-800 truncate bg-white p-2 rounded border border-slate-200/80">
                        {item.url}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Campanha: {item.campaign}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyUrl(item.url)}
                          className="h-7 text-xs text-amber-600 font-bold hover:bg-amber-50"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 2: PAINEL DE ATRIBUIÇÃO */}
        {/* ========================================================= */}
        <TabsContent value="attribution" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total de Visitas
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <MousePointer className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  {totalVisitsCount.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Acessos com parâmetros UTM</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Visitantes Únicos
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">
                  {uniqueVisitorsCount.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Dispositivos identificados</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Taxa de Conversão
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Target className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">{conversionRate}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  {totalConversionsCount} ações concluídas (voluntário, forms)
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Melhor Canal
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 capitalize">{topChannel}</div>
                <p className="text-xs text-amber-600 font-semibold mt-1">
                  Maior volume de tráfego eleitoral
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Período:</span>
                <Select
                  value={attributionPeriod}
                  onValueChange={(v) => setAttributionPeriod(v as any)}
                >
                  <SelectTrigger className="h-9 text-xs w-44 bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="all">Todo o período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {utmCampaignOptions.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-700">Campanha UTM:</span>
                  <Select
                    value={selectedUtmCampaignFilter}
                    onValueChange={setSelectedUtmCampaignFilter}
                  >
                    <SelectTrigger className="h-9 text-xs w-52 bg-white border-slate-300">
                      <SelectValue placeholder="Todas as campanhas" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL">Todas as Campanhas</SelectItem>
                      {utmCampaignOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attribution Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart: Visits by utm_source */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" /> Visitas por Origem (utm_source)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Volume de acessos agrupado pelo canal de tráfego
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visitsBySourceData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="source" stroke="#94A3B8" fontSize={11} tickLine={false} />
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
                      <Bar dataKey="visitas" fill="#F59E0B" radius={[4, 4, 0, 0]}>
                        {visitsBySourceData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index % 2 === 0 ? '#F59E0B' : '#3B82F6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart: Conversions by utm_medium */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-500" /> Conversões por Mídia
                  (utm_medium)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Distribuição proporcional de conversões concluídas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conversionsByMediumData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {conversionsByMediumData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attribution Table */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Detalhamento de Visitas & Conversões UTM
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 px-4">Campanha UTM</th>
                    <th className="py-3 px-3">Origem (Source)</th>
                    <th className="py-3 px-3">Mídia (Medium)</th>
                    <th className="py-3 px-3">Página de Destino</th>
                    <th className="py-3 px-3">Conversão</th>
                    <th className="py-3 px-3 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma visita registrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.slice(0, 10).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {v.utm_campaign || 'Direto / Geral'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="font-semibold text-slate-700">
                            {v.utm_source || 'Direto'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600 uppercase font-medium">
                          {v.utm_medium || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {v.landing_page || '/'}
                        </td>
                        <td className="py-3 px-3">
                          {v.converted ? (
                            <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                              {v.conversion_type || 'Converteu'}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Não</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {new Date(v.created).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 3: INTEGRAÇÃO COM ADS */}
        {/* ========================================================= */}
        <TabsContent value="ads" className="space-y-6">
          {/* ADS KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Investimento
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">
                  R$ {adsMetrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Orçamento: R$ {adsMetrics.totalBudget.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Impressões
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Globe className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">
                  {adsMetrics.totalImpressions.toLocaleString('pt-BR')}
                </div>
                <p className="text-[10px] text-blue-600 font-semibold mt-1">
                  Exibições de anúncios
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Cliques
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <MousePointer className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">
                  {adsMetrics.totalClicks.toLocaleString('pt-BR')}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tráfego direcionado</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Conversões
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                  <Target className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">
                  {adsMetrics.totalConversions.toLocaleString('pt-BR')}
                </div>
                <p className="text-[10px] text-pink-600 font-semibold mt-1">Apoiadores / Leads</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  CTR Médio
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-amber-600">{adsMetrics.avgCtr}%</div>
                <p className="text-[10px] text-slate-400 mt-1">Taxa de clique nos anúncios</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  CPC Médio
                </CardTitle>
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900">R$ {adsMetrics.avgCpc}</div>
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">Custo por clique</p>
              </CardContent>
            </Card>
          </div>

          {/* Ads Actions Bar */}
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">
              Campanhas de Anúncios Ativas ({adCampaigns.length})
            </h3>
            <Button
              onClick={openNewAdModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-9 text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Adicionar Campanha ADS
            </Button>
          </div>

          {/* Ads Comparison Chart */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" /> Comparativo de Campanhas (Gasto vs.
                Conversões)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Análise de custo e resultado de cada campanha de anúncio
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adsComparisonChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
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
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="investimento"
                      name="Investimento (R$)"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="conversoes"
                      name="Índice Conversões (x10)"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ads Table */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Plataforma & Nome</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Gasto / Orçamento</th>
                    <th className="py-3.5 px-3">Impressões</th>
                    <th className="py-3.5 px-3">Cliques (CTR)</th>
                    <th className="py-3.5 px-3">Conversões (Custo)</th>
                    <th className="py-3.5 px-3">Notas</th>
                    <th className="py-3.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Nenhuma campanha de anúncio cadastrada ainda.
                      </td>
                    </tr>
                  ) : (
                    adCampaigns.map((ad) => {
                      const platformLabel =
                        ad.platform === 'meta_ads'
                          ? 'Meta (Insta/Face)'
                          : ad.platform === 'google_ads'
                            ? 'Google Ads'
                            : 'TikTok Ads'

                      return (
                        <tr key={ad.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ad.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold text-slate-600"
                              >
                                {platformLabel}
                              </Badge>
                              {ad.external_id && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  ID: {ad.external_id}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                ad.status === 'active'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : ad.status === 'paused'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {ad.status.toUpperCase()}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900">
                              R$ {(ad.spent || 0).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              de R$ {(ad.budget || 0).toLocaleString('pt-BR')}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-medium text-slate-800">
                            {(ad.impressions || 0).toLocaleString('pt-BR')}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900">
                              {(ad.clicks || 0).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-amber-600 font-semibold block">
                              CTR: {ad.ctr || 0}%
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-emerald-600">
                              {(ad.conversions || 0).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              R$ {ad.cost_per_conversion || 0}/conv
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                            {ad.notes || '-'}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditAdModal(ad)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAd(ad.id)}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Ad Modal Dialog */}
      <Dialog open={adModalOpen} onOpenChange={setAdModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-slate-900">
          <form onSubmit={handleSaveAd}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                {editingAd ? 'Editar Campanha de Anúncio' : 'Nova Campanha de Anúncio'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Insira as métricas reportadas pelas plataformas (Meta, Google, TikTok).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nome da Campanha *</Label>
                <Input
                  placeholder="Ex: Meta - Impulsionamento Vídeo Propostas"
                  value={adName}
                  onChange={(e) => setAdName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Plataforma</Label>
                  <Select value={adPlatform} onValueChange={(v) => setAdPlatform(v as AdPlatform)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="meta_ads">Meta Ads (Instagram & FB)</SelectItem>
                      <SelectItem value="google_ads">Google Ads / YouTube</SelectItem>
                      <SelectItem value="tiktok_ads">TikTok Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">ID Externo / Conta</Label>
                  <Input
                    placeholder="Ex: act_982341029"
                    value={adExternalId}
                    onChange={(e) => setAdExternalId(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Orçamento Total (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adBudget}
                    onChange={(e) => setAdBudget(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Gasto Atual (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adSpent}
                    onChange={(e) => setAdSpent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Impressões</Label>
                  <Input
                    type="number"
                    min="0"
                    value={adImpressions}
                    onChange={(e) => setAdImpressions(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Cliques</Label>
                  <Input
                    type="number"
                    min="0"
                    value={adClicks}
                    onChange={(e) => setAdClicks(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Conversões</Label>
                  <Input
                    type="number"
                    min="0"
                    value={adConversions}
                    onChange={(e) => setAdConversions(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Status</Label>
                  <Select value={adStatus} onValueChange={(v) => setAdStatus(v as AdStatus)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="ended">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Data de Início</Label>
                  <Input
                    type="date"
                    value={adStartDate}
                    onChange={(e) => setAdStartDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Notas & Aprendizados</Label>
                <Textarea
                  placeholder="Ex: Criativo B com melhor aceitação em São Paulo Zona Leste..."
                  rows={2}
                  value={adNotes}
                  onChange={(e) => setAdNotes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingAd}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {isSavingAd ? 'Salvando...' : editingAd ? 'Salvar Alterações' : 'Cadastrar Anúncio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
