import React, { useState, useEffect, useMemo } from 'react'
import { useCampaign } from '@/hooks/use-campaign'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import type { AdCampaign, Activity } from '@/types/campaign'
import {
  generateAdsRoiPdfReport,
  type PlatformRoiItem,
  type AdsRoiReportData,
} from '@/services/adsRoiPdfReport'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  Target,
  Users,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  ArrowUpRight,
  Calculator,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { toast } from 'sonner'

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#64748B']

export const AdsRoiPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const { user } = useAuth()

  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState<'7' | '30' | '90' | 'all'>('all')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const fetchData = async () => {
    if (!currentCampaign) return
    try {
      setLoading(true)
      const [adsRes, actRes] = await Promise.all([
        pb.collection('ad_campaigns').getFullList<AdCampaign>({
          filter: `campaign_id = "${currentCampaign.id}"`,
          sort: '-created',
        }),
        pb.collection('activities').getFullList<Activity>({
          filter: `campaign_id = "${currentCampaign.id}"`,
          sort: '-created',
        }),
      ])
      setAdCampaigns(adsRes)
      setActivities(actRes)
    } catch (err) {
      console.error('Error fetching Ads & Field ROI data:', err)
      toast.error('Erro ao carregar dados de campanhas e campo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentCampaign])

  // Filtered ADS and Activities by period
  const filteredAds = useMemo(() => {
    if (periodFilter === 'all') return adCampaigns
    const days = parseInt(periodFilter, 10)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    return adCampaigns.filter(
      (a) => a.created >= cutoff || (a.start_date && a.start_date >= cutoff),
    )
  }, [adCampaigns, periodFilter])

  const filteredActivities = useMemo(() => {
    if (periodFilter === 'all') return activities
    const days = parseInt(periodFilter, 10)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    return activities.filter((a) => a.created >= cutoff)
  }, [activities, periodFilter])

  // ==========================================
  // CALCULATED ROI & CROSS-METRICS
  // ==========================================
  const roiMetrics = useMemo(() => {
    const totalBudget = filteredAds.reduce((acc, a) => acc + (a.budget || 0), 0)
    const totalSpent = filteredAds.reduce((acc, a) => acc + (a.spent || 0), 0)
    const totalImpressions = filteredAds.reduce((acc, a) => acc + (a.impressions || 0), 0)
    const totalClicks = filteredAds.reduce((acc, a) => acc + (a.clicks || 0), 0)
    const totalAdConversions = filteredAds.reduce((acc, a) => acc + (a.conversions || 0), 0)

    // Field conversions / voters captured by field activities
    const totalFieldConversions = filteredActivities.reduce(
      (acc, act) => acc + (act.voters_contacted || 1),
      0,
    )

    // Combined voters (Digital Leads + Field Conversions)
    const totalCombinedVotes = totalAdConversions + totalFieldConversions

    const overallCpc = totalClicks > 0 ? totalSpent / totalClicks : 0
    const overallCostPerConversion = totalAdConversions > 0 ? totalSpent / totalAdConversions : 0
    const overallCostPerVote = totalCombinedVotes > 0 ? totalSpent / totalCombinedVotes : 0

    // Estimated ROI multiplier: votes generated per R$ 100 invested
    const estimatedRoiMultiplier = totalSpent > 0 ? (totalCombinedVotes / totalSpent) * 100 : 0

    // Platform Breakdown
    const platformsMap: Record<
      string,
      {
        name: string
        campaigns: AdCampaign[]
        spent: number
        budget: number
        impressions: number
        clicks: number
        conversions: number
      }
    > = {
      meta_ads: {
        name: 'Meta Ads (Instagram / Facebook)',
        campaigns: [],
        spent: 0,
        budget: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
      google_ads: {
        name: 'Google Ads (Search / YouTube)',
        campaigns: [],
        spent: 0,
        budget: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
      tiktok_ads: {
        name: 'TikTok Ads',
        campaigns: [],
        spent: 0,
        budget: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    }

    filteredAds.forEach((ad) => {
      const platKey = ad.platform || 'meta_ads'
      if (!platformsMap[platKey]) {
        platformsMap[platKey] = {
          name: platKey,
          campaigns: [],
          spent: 0,
          budget: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        }
      }
      platformsMap[platKey].campaigns.push(ad)
      platformsMap[platKey].spent += ad.spent || 0
      platformsMap[platKey].budget += ad.budget || 0
      platformsMap[platKey].impressions += ad.impressions || 0
      platformsMap[platKey].clicks += ad.clicks || 0
      platformsMap[platKey].conversions += ad.conversions || 0
    })

    const platformBreakdown: PlatformRoiItem[] = Object.entries(platformsMap).map(([key, data]) => {
      const costPerConv = data.conversions > 0 ? data.spent / data.conversions : 0
      // Proportion of field voters attributed proportionally to platform spend share
      const spendShare = totalSpent > 0 ? data.spent / totalSpent : 1 / 3
      const attributedFieldVoters = Math.round(totalFieldConversions * spendShare)
      const totalVotersPlatform = data.conversions + attributedFieldVoters
      const costPerVoter = totalVotersPlatform > 0 ? data.spent / totalVotersPlatform : 0

      return {
        platformName: data.name,
        campaignsCount: data.campaigns.length,
        spent: data.spent,
        budget: data.budget,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        costPerConversion: costPerConv,
        estimatedVoters: totalVotersPlatform,
        costPerVoter: costPerVoter,
      }
    })

    return {
      totalBudget,
      totalSpent,
      totalImpressions,
      totalClicks,
      totalAdConversions,
      totalFieldConversions,
      totalCombinedVotes,
      overallCpc,
      overallCostPerConversion,
      overallCostPerVote,
      estimatedRoiMultiplier,
      platformBreakdown,
    }
  }, [filteredAds, filteredActivities])

  // Chart data: Platform comparison (Spent vs Cost per Vote)
  const chartPlatformData = useMemo(() => {
    return roiMetrics.platformBreakdown.map((p) => ({
      name: p.platformName.split(' ')[0], // 'Meta', 'Google', 'TikTok'
      fullName: p.platformName,
      investimento: p.spent,
      conversoes: p.conversions,
      eleitores: p.estimatedVoters,
      custoPorVoto: Number(p.costPerVoter.toFixed(2)),
    }))
  }, [roiMetrics])

  // Chart data: Investment distribution
  const chartSpentDistribution = useMemo(() => {
    return roiMetrics.platformBreakdown
      .filter((p) => p.spent > 0)
      .map((p) => ({
        name: p.platformName.split(' ')[0],
        value: p.spent,
      }))
  }, [roiMetrics])

  const handleExportPdf = () => {
    if (!currentCampaign) {
      toast.error('Nenhuma campanha ativa')
      return
    }

    try {
      setIsExportingPdf(true)
      const periodLabel =
        periodFilter === '7'
          ? 'Últimos 7 dias'
          : periodFilter === '30'
            ? 'Últimos 30 dias'
            : periodFilter === '90'
              ? 'Últimos 90 dias'
              : 'Histórico Completo'

      const reportData: AdsRoiReportData = {
        campaign: currentCampaign,
        generatedBy: user,
        periodLabel,
        totalBudget: roiMetrics.totalBudget,
        totalSpent: roiMetrics.totalSpent,
        totalImpressions: roiMetrics.totalImpressions,
        totalClicks: roiMetrics.totalClicks,
        totalAdConversions: roiMetrics.totalAdConversions,
        totalFieldConversions: roiMetrics.totalFieldConversions,
        totalCombinedVotes: roiMetrics.totalCombinedVotes,
        overallCpc: roiMetrics.overallCpc,
        overallCostPerConversion: roiMetrics.overallCostPerConversion,
        overallCostPerVote: roiMetrics.overallCostPerVote,
        estimatedRoiMultiplier: roiMetrics.estimatedRoiMultiplier,
        platformBreakdown: roiMetrics.platformBreakdown,
        adCampaigns: filteredAds,
        recentFieldActivitiesCount: filteredActivities.length,
      }

      const doc = generateAdsRoiPdfReport(reportData)
      const sanitizedName = (currentCampaign.name || 'campanha')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
      doc.save(`relatorio_roi_anuncios_${sanitizedName}_${Date.now()}.pdf`)
      toast.success('Relatório de ROI exportado em PDF com sucesso!')
    } catch (err: any) {
      console.error('Error generating ROI PDF:', err)
      toast.error('Erro ao gerar relatório PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-[10px] sm:text-xs shrink-0">
              INTELIGÊNCIA DE ROI • CUSTO POR VOTO
            </Badge>
            <span className="text-xs text-slate-300 truncate">Cruzamento ADS + Ações de Rua</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Relatório de ROI de Anúncios & Custo por Voto
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Descubra exatamente quanto custa cada voto e eleitor captado cruzando o investimento em
            anúncios (Meta, Google, TikTok) com as conversões de campo da equipe.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <Select value={periodFilter} onValueChange={(v: any) => setPeriodFilter(v)}>
            <SelectTrigger className="w-36 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md h-9 px-3.5"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Card 1: Total Invested */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Investimento ADS</span>
              <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatBRL(roiMetrics.totalSpent)}
            </div>
            <div className="text-[10px] text-slate-400">
              Orçamento: {formatBRL(roiMetrics.totalBudget)}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Conversions */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Conversões Digitais</span>
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400">
              {roiMetrics.totalAdConversions.toLocaleString('pt-BR')} leads
            </div>
            <div className="text-[10px] text-slate-400">
              {roiMetrics.totalClicks.toLocaleString('pt-BR')} cliques no total
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Cost per Conversion */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Custo por Conversão</span>
              <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-300">
              {formatBRL(roiMetrics.overallCostPerConversion)}
            </div>
            <div className="text-[10px] text-slate-400">
              CPC médio: {formatBRL(roiMetrics.overallCpc)}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Cost per Vote (Crossed ADS + Field) */}
        <Card className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 text-white shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
              <span>Custo por Voto/Eleitor</span>
              <div className="w-6 h-6 rounded-md bg-amber-500/30 text-amber-300 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {formatBRL(roiMetrics.overallCostPerVote)}
            </div>
            <div className="text-[10px] text-amber-300/80">
              Cruzando {roiMetrics.totalCombinedVotes.toLocaleString('pt-BR')} eleitores
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Estimated ROI Index */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Retorno Estimado</span>
              <div className="w-6 h-6 rounded-md bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-pink-300">
              {roiMetrics.estimatedRoiMultiplier.toFixed(1)} votos/R$ 100
            </div>
            <div className="text-[10px] text-slate-400">Eficiência de mobilização</div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insight Alert Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            Diagnóstico de Eficiência Eleitoral (ADS + Ações de Rua):
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            O cruzamento soma as conversões digitais ({roiMetrics.totalAdConversions} apoiadores)
            com os contatos cadastrados pelas equipes de campo ({roiMetrics.totalFieldConversions}{' '}
            eleitores abordados). O custo atual por voto é de{' '}
            <strong className="text-amber-400">{formatBRL(roiMetrics.overallCostPerVote)}</strong>,
            o que representa um indicador de alto retorno sobre o capital investido.
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Bar Chart: Investment vs Cost Per Vote by Platform */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 text-white shadow-md">
          <CardHeader className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Comparativo por Plataforma: Investimento vs. Custo por Voto
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Gasto em R$ comparado ao Custo Unitário por Eleitor Captado em cada canal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartPlatformData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    dataKey="investimento"
                    name="Investimento Total (R$)"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="custoPorVoto"
                    name="Custo por Voto (R$)"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart: Share of Spend */}
        <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
          <CardHeader className="p-4 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              Distribuição do Orçamento
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Divisão proporcional do gasto por plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center">
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      chartSpentDistribution.length > 0
                        ? chartSpentDistribution
                        : [
                            { name: 'Meta', value: 60 },
                            { name: 'Google', value: 30 },
                            { name: 'TikTok', value: 10 },
                          ]
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={35}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(chartSpentDistribution.length > 0
                      ? chartSpentDistribution
                      : [{ name: 'Meta' }, { name: 'Google' }, { name: 'TikTok' }]
                    ).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
            <div className="w-full text-center text-xs text-slate-400 mt-2">
              Investimento total analisado:{' '}
              <strong className="text-amber-400">{formatBRL(roiMetrics.totalSpent)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown Detailed Table */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-md overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-800">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Detalhamento de Performance por Canal
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Métricas de tráfego, conversões digitais e votos estimados por plataforma.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <th className="py-3 px-4">Plataforma</th>
                <th className="py-3 px-3">Campanhas</th>
                <th className="py-3 px-3">Gasto Total</th>
                <th className="py-3 px-3">Impressões</th>
                <th className="py-3 px-3">Cliques</th>
                <th className="py-3 px-3">Conversões (Leads)</th>
                <th className="py-3 px-3">Custo / Conv.</th>
                <th className="py-3 px-3">Eleitores Est.</th>
                <th className="py-3 px-4 text-right">Custo / Voto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {roiMetrics.platformBreakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{item.platformName}</td>
                  <td className="py-3.5 px-3 text-slate-300">
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-300 text-[10px]"
                    >
                      {item.campaignsCount} ativas
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-100">
                    {formatBRL(item.spent)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300">
                    {item.impressions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-3 text-slate-300">
                    {item.clicks.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-emerald-400">
                    {item.conversions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-3 text-purple-300 font-mono">
                    {formatBRL(item.costPerConversion)}
                  </td>
                  <td className="py-3.5 px-3 text-amber-300 font-semibold">
                    {item.estimatedVoters.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-amber-400 font-mono">
                    {formatBRL(item.costPerVoter)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950/90 font-bold border-t border-slate-700 text-xs">
                <td className="py-3 px-4 text-white">TOTAL CONSOLIDADO</td>
                <td className="py-3 px-3 text-slate-300">{filteredAds.length} campanhas</td>
                <td className="py-3 px-3 text-amber-400 font-bold">
                  {formatBRL(roiMetrics.totalSpent)}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {roiMetrics.totalImpressions.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {roiMetrics.totalClicks.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">
                  {roiMetrics.totalAdConversions.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-3 text-purple-300 font-mono">
                  {formatBRL(roiMetrics.overallCostPerConversion)}
                </td>
                <td className="py-3 px-3 text-amber-300 font-bold">
                  {roiMetrics.totalCombinedVotes.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-right text-amber-400 font-black text-sm font-mono">
                  {formatBRL(roiMetrics.overallCostPerVote)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
