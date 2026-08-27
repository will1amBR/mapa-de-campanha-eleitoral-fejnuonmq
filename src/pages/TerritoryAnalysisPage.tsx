import React, { useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import type { TerritoryData, Activity } from '@/types/campaign'
import {
  PieChart,
  Target,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  Building,
  GraduationCap,
  Wallet,
  Search,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export const TerritoryAnalysisPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [terrRes, actRes] = await Promise.all([
          pb.collection('territory_data').getFullList<TerritoryData>({
            sort: '-priority_score',
          }),
          pb.collection('activities').getFullList<Activity>({
            filter: currentCampaign ? `campaign_id = "${currentCampaign.id}"` : '',
          }),
        ])
        setTerritories(terrRes)
        setActivities(actRes)
        if (terrRes.length > 0) {
          setSelectedTerritory(terrRes[0])
        }
      } catch (err) {
        console.error('Error fetching territory data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentCampaign])

  const filteredTerritories = useMemo(() => {
    return territories.filter(
      (t) =>
        t.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.district_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ibge_code.includes(searchTerm),
    )
  }, [territories, searchTerm])

  // Gap Analysis: Identify high potential areas with low activity coverage
  const gapAnalysisResults = useMemo(() => {
    return territories
      .map((terr) => {
        const matchActs = activities.filter((a) =>
          a.location_name?.toLowerCase().includes(terr.district_name.toLowerCase().slice(0, 5)),
        )
        const activityCount = matchActs.length
        const voters = terr.voters_count
        const score = terr.priority_score || 80

        // Gap is severe if priority score is high (>80) but activity count is low (<2)
        const hasGap = score >= 80 && activityCount <= 1

        return {
          territory: terr,
          activityCount,
          voters,
          score,
          hasGap,
          recommendation: hasGap
            ? 'ALERTA: Zona com alto contingente de eleitores e alta prioridade sem saturação de campo. Enviar equipe de panfletagem imediatamente.'
            : 'Cobertura estável. Manter visitas porta a porta regulares.',
        }
      })
      .sort((a, b) => (b.hasGap ? 1 : 0) - (a.hasGap ? 1 : 0))
  }, [territories, activities])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-indigo-500 text-white font-bold text-xs uppercase">
            Cruzamento Oficial TSE / Censo IBGE
          </Badge>
          <span className="text-xs text-indigo-300">Inteligência Geo-Demográfica de Precisão</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Análise Territorial & Explorer de Zonas Eleitorais
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Cruze dados demográficos de renda, idade e escolaridade do IBGE com o histórico de
          quociente partidário do TSE para direcionar a militância onde cada hora trabalhada rende
          mais votos.
        </p>
      </div>

      {/* Gap Analysis Highlight Alert Box */}
      <Card className="border-amber-200 bg-amber-50/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-amber-200/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Relatório de Gap Analysis (Zonas Críticas Não Cobertas)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Identificação automática de distritos de alta densidade eleitoral com carência de
                mobilização
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-amber-600 text-white text-xs font-bold">
            {gapAnalysisResults.filter((g) => g.hasGap).length} Gaps Identificados
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gapAnalysisResults
              .filter((g) => g.hasGap)
              .map((item) => (
                <div
                  key={item.territory.id}
                  onClick={() => setSelectedTerritory(item.territory)}
                  className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{item.territory.zone}</span>
                    <span className="font-extrabold text-amber-600">Score: {item.score}/100</span>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mb-2">
                    {item.territory.district_name} • {item.voters.toLocaleString('pt-BR')} eleitores
                  </div>
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg font-medium leading-relaxed">
                    ⚠️ Apenas {item.activityCount} atividade registrada. Necessita saturação
                    imediata.
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Zone Explorer on Left, Demographic Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Searchable Zone Explorer */}
        <div className="space-y-4">
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Explorer de Zonas Eleitorais ({filteredTerritories.length})
              </CardTitle>
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filtrar por zona, bairro ou IBGE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-8 h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
              {filteredTerritories.map((terr) => {
                const isSelected = selectedTerritory?.id === terr.id
                return (
                  <div
                    key={terr.id}
                    onClick={() => setSelectedTerritory(terr)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{terr.zone}</span>
                      <Badge
                        className={`text-[10px] h-4 px-1.5 font-bold ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Score {terr.priority_score}
                      </Badge>
                    </div>
                    <div
                      className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}
                    >
                      {terr.district_name} (IBGE: {terr.ibge_code})
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/40">
                      <span>{terr.voters_count.toLocaleString('pt-BR')} eleitores</span>
                      <span>Renda: {terr.demographics_json?.avg_income_sm || '5.0'} SM</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Detailed IBGE Demographics + TSE Historical Breakdown */}
        {selectedTerritory && (
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200/80 shadow-sm bg-white">
              <CardHeader className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-900 text-white font-bold text-xs">
                      {selectedTerritory.zone}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Cód. IBGE: {selectedTerritory.ibge_code}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-black text-slate-900 mt-1">
                    {selectedTerritory.district_name}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-600">
                    {selectedTerritory.voters_count.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-slate-400">Eleitores Aptos a Votar</div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 3 Demographic Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <Wallet className="w-4 h-4 text-emerald-600" /> Renda Média Per Capita
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {selectedTerritory.demographics_json?.avg_income_sm || 6.5}{' '}
                      <span className="text-xs font-medium text-slate-500">Salários Mínimos</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <GraduationCap className="w-4 h-4 text-blue-600" /> Ensino Superior Completo
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {selectedTerritory.demographics_json?.education_higher_perc || 45}%
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                      <Users className="w-4 h-4 text-purple-600" /> População Total Censo
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {(selectedTerritory.demographics_json?.pop_total || 180000).toLocaleString(
                        'pt-BR',
                      )}
                    </div>
                  </div>
                </div>

                {/* Age Distribution Breakdown */}
                {selectedTerritory.demographics_json?.age_distribution && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Distribuição Etária do Eleitorado (IBGE)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(selectedTerritory.demographics_json.age_distribution).map(
                        ([age, pct]) => (
                          <div
                            key={age}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center"
                          >
                            <div className="text-xs text-slate-500 font-medium">{age} anos</div>
                            <div className="text-lg font-bold text-slate-900 mt-0.5">{pct}</div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Key Demands / Topics identified in the territory */}
                {selectedTerritory.demographics_json?.key_demands && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Pautas e Demandas Prioritárias da População Local
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTerritory.demographics_json.key_demands.map((demand, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs py-1 px-3 bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                        >
                          🎯 {demand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historical TSE Elections comparison */}
                {selectedTerritory.historical_votes_json && (
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Histórico de Votação Oficial TSE (Eleições Anteriores)
                      </div>
                      <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">
                        Margem de Indecisos:{' '}
                        {selectedTerritory.historical_votes_json.swing_voters_estimate_perc || 25}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">Comparecimento 2020</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">
                          {selectedTerritory.historical_votes_json.election_2020_municipal
                            ?.turnout_perc || 75}
                          %
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">Voto Vencedor 2020</div>
                        <div className="text-base font-bold text-blue-400 mt-0.5">
                          {selectedTerritory.historical_votes_json.election_2020_municipal
                            ?.winner_perc || 42}
                          %
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-slate-400 text-[11px]">Quociente Estimado</div>
                        <div className="text-base font-bold text-amber-400 mt-0.5">
                          Score {selectedTerritory.priority_score}/100
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
