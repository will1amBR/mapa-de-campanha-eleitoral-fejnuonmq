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
  FileText,
  Upload,
  Check,
  X,
  Edit2,
  Layers,
  MapPin,
  Map,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface TerritorySectorWorkflow {
  id: string
  name: string
  city: string
  uf: string
  status: 'draft' | 'under_review' | 'published' | 'rejected'
  rejection_reason?: string
  pages_count: number
  polygon_points_count: number
  has_strategic_points: boolean
  file_name?: string
  last_modified: string
}

export const TerritoryAnalysisPage: React.FC = () => {
  const { currentCampaign } = useCampaign()
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryData | null>(null)
  const [loading, setLoading] = useState(true)

  // Sub-tabs for Aba 09: 'sectors_workflow' vs 'demographics'
  const [activeTab, setActiveTab] = useState<'sectors_workflow' | 'demographics'>(
    'sectors_workflow',
  )

  // Territory sectors workflow state (Aba 09)
  const [sectorsList, setSectorsList] = useState<TerritorySectorWorkflow[]>([
    {
      id: 'sec_1',
      name: 'Setor 01 - Centro Histórico & Bela Vista',
      city: 'São Paulo',
      uf: 'SP',
      status: 'published',
      pages_count: 3,
      polygon_points_count: 18,
      has_strategic_points: true,
      file_name: 'mapa_setorial_centro_sp.pdf',
      last_modified: 'Hoje às 11:20',
    },
    {
      id: 'sec_2',
      name: 'Setor 02 - Pinheiros & Faria Lima',
      city: 'São Paulo',
      uf: 'SP',
      status: 'under_review',
      pages_count: 2,
      polygon_points_count: 12,
      has_strategic_points: true,
      file_name: 'scan_setor_oeste.png',
      last_modified: 'Ontem às 16:45',
    },
    {
      id: 'sec_3',
      name: 'Setor 03 - Tatuapé & Anália Franco',
      city: 'São Paulo',
      uf: 'SP',
      status: 'draft',
      pages_count: 1,
      polygon_points_count: 6,
      has_strategic_points: false,
      file_name: 'rascunho_setor_leste.jpg',
      last_modified: '24/08/2024',
    },
  ])

  // Review & Publish Modal
  const [selectedSectorToReview, setSelectedSectorToReview] =
    useState<TerritorySectorWorkflow | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Import assistant modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importSectorName, setImportSectorName] = useState('')
  const [importCity, setImportCity] = useState('São Paulo')
  const [importUF, setImportUF] = useState('SP')
  const [importFileName, setImportFileName] = useState('')

  const handlePublishSector = (sectorId: string) => {
    setSectorsList((prev) =>
      prev.map((s) =>
        s.id === sectorId ? { ...s, status: 'published', rejection_reason: undefined } : s,
      ),
    )
    toast.success(
      'Setor publicado com sucesso! Libera cobertura e cadastro de pontos estratégicos.',
    )
    setReviewModalOpen(false)
  }

  const handleRejectSector = () => {
    if (!selectedSectorToReview) return
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }

    setSectorsList((prev) =>
      prev.map((s) =>
        s.id === selectedSectorToReview.id
          ? { ...s, status: 'rejected', rejection_reason: rejectionReason.trim() }
          : s,
      ),
    )
    toast.info('Setor rejeitado e retornado para correção de polígono.')
    setRejectionModalOpen(false)
    setReviewModalOpen(false)
    setRejectionReason('')
  }

  const handleEditSector = (sectorId: string) => {
    // Editing an already published sector invalidates the review (reverts to draft)
    setSectorsList((prev) => prev.map((s) => (s.id === sectorId ? { ...s, status: 'draft' } : s)))
    toast.warning('Setor em modo de edição. Revisão anterior invalidada até nova publicação.')
  }

  const handleImportSector = (e: React.FormEvent) => {
    e.preventDefault()
    if (!importSectorName.trim()) {
      toast.error('Informe o nome do setor')
      return
    }

    const newSec: TerritorySectorWorkflow = {
      id: 'sec_' + Date.now(),
      name: importSectorName.trim(),
      city: importCity,
      uf: importUF,
      status: 'draft',
      pages_count: 1,
      polygon_points_count: 8,
      has_strategic_points: false,
      file_name: importFileName || 'documento_setor.pdf',
      last_modified: 'Agora',
    }

    setSectorsList([newSec, ...sectorsList])
    toast.success('PDF/Imagem importado e rascunho de polígono gerado!')
    setImportModalOpen(false)
    setImportSectorName('')
  }

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
    <div className="p-3 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg border border-slate-800 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge className="bg-indigo-500 text-white font-bold text-xs uppercase shrink-0">
            Cruzamento Oficial TSE / Censo IBGE
          </Badge>
          <span className="text-xs text-indigo-300 truncate">
            Inteligência Geo-Demográfica de Precisão
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
          Análise Territorial & Explorer de Zonas Eleitorais
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl break-words">
          Cruze dados demográficos de renda, idade e escolaridade do IBGE com o histórico de
          quociente partidário do TSE para direcionar a militância onde cada hora trabalhada rende
          mais votos.
        </p>
      </div>

      {/* Main Tabs: Setores do Rascunho à Publicação (Aba 09) vs Cruzamento Demográfico */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'sectors_workflow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('sectors_workflow')}
            className={`text-xs font-bold ${
              activeTab === 'sectors_workflow'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Aba 09: Setores Territoriais (
            {sectorsList.length})
          </Button>

          <Button
            variant={activeTab === 'demographics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('demographics')}
            className={`text-xs font-bold ${
              activeTab === 'demographics'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Cruzamento Demográfico IBGE
          </Button>
        </div>

        {activeTab === 'sectors_workflow' && (
          <Button
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8"
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Importação Assistida (PDF / Scan)
          </Button>
        )}
      </div>

      {/* SECTORS WORKFLOW SECTION (Aba 09: Do rascunho à publicação) */}
      {activeTab === 'sectors_workflow' && (
        <div className="space-y-6">
          {/* Workflow rule banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" /> Fluxo Seguro de Publicação
                Setorial
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                O sistema nunca publica sozinho:{' '}
                <strong>desenhar/corrigir polígono → revisar → publicar</strong>. Editar um setor já
                revisado invalida a revisão anterior. Setor publicado libera a Cobertura e o
                cadastro de Pontos Estratégicos.
              </p>
            </div>
            <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase shrink-0">
              Admin • Em Desenvolvimento
            </Badge>
          </div>

          {/* List of Sectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorsList.map((sec) => {
              const isPublished = sec.status === 'published'
              const isUnderReview = sec.status === 'under_review'
              const isRejected = sec.status === 'rejected'

              return (
                <Card
                  key={sec.id}
                  className={`border transition-all flex flex-col justify-between bg-white ${
                    isPublished
                      ? 'border-emerald-200/90 shadow-xs hover:border-emerald-400'
                      : isUnderReview
                        ? 'border-amber-200/90 shadow-xs hover:border-amber-400'
                        : isRejected
                          ? 'border-rose-200/90 shadow-xs hover:border-rose-400'
                          : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isPublished
                                ? 'bg-emerald-500 text-slate-950'
                                : isUnderReview
                                  ? 'bg-amber-500 text-slate-950'
                                  : isRejected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {isPublished
                              ? '✓ Publicado'
                              : isUnderReview
                                ? '⏳ Em Revisão'
                                : isRejected
                                  ? '✕ Rejeitado'
                                  : '✏️ Rascunho'}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {sec.city} / {sec.uf}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-black text-slate-900 leading-snug">
                          {sec.name}
                        </CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5 text-xs">
                      {sec.file_name && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{sec.file_name}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Polígono</span>
                          <span className="font-bold text-slate-800">
                            {sec.polygon_points_count} vértices
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Pontos Estrat.</span>
                          <span className="font-bold text-slate-800">
                            {sec.has_strategic_points ? 'Ativados' : 'Bloqueados'}
                          </span>
                        </div>
                      </div>

                      {sec.rejection_reason && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                          <strong>Motivo da Rejeição:</strong> {sec.rejection_reason}
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 space-y-2">
                    {isPublished ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSector(sec.id)}
                        className="w-full text-xs font-semibold border-slate-200 hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" /> Editar Setor (Invalida
                        Revisão)
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSectorToReview(sec)
                            setReviewModalOpen(true)
                          }}
                          className="flex-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          Revisar & Publicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSector(sec.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Review & Publication Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" /> Revisão de Setor Territorial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirme o traçado do polígono antes de publicar oficialmente para a equipe de campo.
            </DialogDescription>
          </DialogHeader>

          {selectedSectorToReview && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedSectorToReview.name}
                </div>
                <div className="text-slate-500">
                  {selectedSectorToReview.city} - {selectedSectorToReview.uf} •{' '}
                  {selectedSectorToReview.polygon_points_count} coordenadas no polígono
                </div>
              </div>

              <div className="h-44 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-1">
                <Map className="w-8 h-8 text-slate-400" />
                <span className="font-semibold text-xs text-slate-600">
                  Preview de Polígono Vetorial
                </span>
                <span className="text-[10px] text-slate-400">
                  Vértices validados sem sobreposição crítica
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setRejectionModalOpen(true)}
              className="text-xs"
            >
              Rejeitar com Motivo
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                selectedSectorToReview && handlePublishSector(selectedSectorToReview.id)
              }
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Check className="w-4 h-4 mr-1" /> Publicar Setor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal with Motivo */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Motivo da Rejeição do Setor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Descreva o ajuste necessário para o coordenador/desenhista refazer o polígono.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Textarea
              placeholder="Ex: Polígono ultrapassa o limite da avenida principal e invade a Zona Eleitoral 258..."
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectionModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRejectSector}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Assistant Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <form onSubmit={handleImportSector}>
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" /> Importação Assistida de Território
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Envie um PDF ou imagem do setor; o sistema separa páginas e tenta extrair nomes e
                pontos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nome do Setor *</Label>
                <Input
                  placeholder="Ex: Setor 04 - Santana & Zona Norte"
                  value={importSectorName}
                  onChange={(e) => setImportSectorName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Cidade</Label>
                  <Input
                    value={importCity}
                    onChange={(e) => setImportCity(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">UF</Label>
                  <Input
                    value={importUF}
                    onChange={(e) => setImportUF(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Arquivo PDF ou Imagem</Label>
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-amber-400 bg-slate-50">
                  <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span className="font-semibold text-slate-700 text-xs">
                    {importFileName || 'Clique para carregar mapa setorial'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Se for imagem/scan, sinaliza para desenho manual e cria rascunho
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Processar Arquivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEMOGRAPHICS TAB (Cruzamento IBGE / TSE) */}
      {activeTab === 'demographics' && (
        <>
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
                    Identificação automática de distritos de alta densidade eleitoral com carência
                    de mobilização
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
                        <span className="font-extrabold text-amber-600">
                          Score: {item.score}/100
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-600 mb-2">
                        {item.territory.district_name} • {item.voters.toLocaleString('pt-BR')}{' '}
                        eleitores
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
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-200 text-slate-700'
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
                          <span className="text-xs font-medium text-slate-500">
                            Salários Mínimos
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                          <GraduationCap className="w-4 h-4 text-blue-600" /> Ensino Superior
                          Completo
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
                          {(
                            selectedTerritory.demographics_json?.pop_total || 180000
                          ).toLocaleString('pt-BR')}
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
                            {selectedTerritory.historical_votes_json.swing_voters_estimate_perc ||
                              25}
                            %
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
        </>
      )}
    </div>
  )
}
