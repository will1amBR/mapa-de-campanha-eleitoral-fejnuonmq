import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import type { Candidate, Campaign } from '@/types/campaign'
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  UserCheck,
  Link2,
  ExternalLink,
  ShieldAlert,
  User,
  Vote,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

export const CandidatesPage: React.FC = () => {
  const { currentCampaign, campaigns } = useCampaign()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('ALL')
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [partyFilter, setPartyFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortField, setSortField] = useState<
    'candidate_name' | 'candidate_number' | 'city_name' | 'party' | 'position'
  >('candidate_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const perPage = 20

  // Selected candidate drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [isUpdatingLink, setIsUpdatingLink] = useState(false)

  // Fetch candidates with server filtering
  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const filterConditions: string[] = []

      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/"/g, '')
        filterConditions.push(
          `(candidate_name ~ "${q}" || candidate_number ~ "${q}" || social_name ~ "${q}")`,
        )
      }
      if (cityFilter !== 'ALL') {
        filterConditions.push(`city_name = "${cityFilter}"`)
      }
      if (positionFilter !== 'ALL') {
        filterConditions.push(`position = "${positionFilter}"`)
      }
      if (partyFilter !== 'ALL') {
        filterConditions.push(`party = "${partyFilter}"`)
      }
      if (statusFilter !== 'ALL') {
        filterConditions.push(`status = "${statusFilter}"`)
      }

      const filter = filterConditions.length > 0 ? filterConditions.join(' && ') : ''
      const sort = `${sortDirection === 'desc' ? '-' : ''}${sortField}`

      const res = await pb.collection('candidates').getList<Candidate>(page, perPage, {
        filter,
        sort,
        expand: 'campaign_id',
      })

      setCandidates(res.items)
      setTotalCount(res.totalItems)
    } catch (err) {
      console.error('Error fetching candidates', err)
      toast.error('Erro ao carregar candidaturas do TSE')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
  }, [page, cityFilter, positionFilter, partyFilter, statusFilter, sortField, sortDirection])

  // Debounced text search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchCandidates()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Extract distinct lists for filter dropdowns
  const [allCities, setAllCities] = useState<string[]>([])
  const [allParties, setAllParties] = useState<string[]>([])

  useEffect(() => {
    pb.collection('candidates')
      .getFullList<Candidate>({ fields: 'city_name,party' })
      .then((records) => {
        const cities = Array.from(new Set(records.map((r) => r.city_name).filter(Boolean))).sort()
        const parties = Array.from(new Set(records.map((r) => r.party).filter(Boolean))).sort()
        setAllCities(cities)
        setAllParties(parties)
      })
      .catch(() => {})
  }, [])

  const handleOpenDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setSelectedCampaignId(candidate.campaign_id || '')
    setDrawerOpen(true)
  }

  const handleSaveCampaignLink = async () => {
    if (!selectedCandidate) return
    try {
      setIsUpdatingLink(true)
      const updated = await pb.collection('candidates').update<Candidate>(
        selectedCandidate.id,
        {
          campaign_id: selectedCampaignId || null,
        },
        {
          expand: 'campaign_id',
        },
      )
      toast.success(
        selectedCampaignId
          ? 'Candidato vinculado com sucesso à campanha!'
          : 'Vínculo com campanha removido.',
      )
      setSelectedCandidate(updated)
      fetchCandidates()
    } catch (err) {
      console.error('Error linking campaign', err)
      toast.error('Falha ao vincular campanha')
    } finally {
      setIsUpdatingLink(false)
    }
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusBadge = (status: string) => {
    const lower = status.toLowerCase()
    if (lower.includes('deferido') && !lower.includes('in')) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold text-[11px] hover:bg-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
          {status}
        </Badge>
      )
    }
    if (lower.includes('indeferido') || lower.includes('cancelado')) {
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold text-[11px] hover:bg-rose-500/20">
          <XCircle className="w-3 h-3 mr-1 text-rose-500" />
          {status}
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold text-[11px] hover:bg-amber-500/20">
        <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
        {status}
      </Badge>
    )
  }

  const totalPages = Math.ceil(totalCount / perPage) || 1

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs">
              BASE TSE OFICIAL SP 2024
            </Badge>
            <span className="text-xs text-slate-300">Consulta de Candidaturas Eleitorais</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            Candidaturas do Estado de São Paulo
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Pesquise, filtre dados declarados à Justiça Eleitoral e vincule candidatos à sua
            campanha.
          </p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl text-center sm:text-right shrink-0">
          <div className="text-2xl font-black text-amber-400">
            {totalCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-slate-400 font-medium">candidaturas encontradas em SP</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Buscar por nome, número ou nome social..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-10 border-slate-200"
              />
            </div>

            {/* City filter */}
            <div>
              <Select
                value={cityFilter}
                onValueChange={(v) => {
                  setCityFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm border-slate-200">
                  <SelectValue placeholder="Município" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-white">
                  <SelectItem value="ALL">Todos os Municípios</SelectItem>
                  {allCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position filter */}
            <div>
              <Select
                value={positionFilter}
                onValueChange={(v) => {
                  setPositionFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm border-slate-200">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">Todos os Cargos</SelectItem>
                  <SelectItem value="Prefeito">Prefeito</SelectItem>
                  <SelectItem value="Vice-prefeito">Vice-prefeito</SelectItem>
                  <SelectItem value="Vereador">Vereador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm border-slate-200">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">Todas as Situações</SelectItem>
                  <SelectItem value="Deferido">Deferido</SelectItem>
                  <SelectItem value="Indeferido">Indeferido</SelectItem>
                  <SelectItem value="Renúncia">Renúncia / Cassado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters pill list */}
          {(cityFilter !== 'ALL' ||
            positionFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            searchQuery) && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Filtros ativos:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  Busca: "{searchQuery}"
                </Badge>
              )}
              {cityFilter !== 'ALL' && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  Cidade: {cityFilter}
                </Badge>
              )}
              {positionFilter !== 'ALL' && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  Cargo: {positionFilter}
                </Badge>
              )}
              {statusFilter !== 'ALL' && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  Situação: {statusFilter}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setCityFilter('ALL')
                  setPositionFilter('ALL')
                  setPartyFilter('ALL')
                  setStatusFilter('ALL')
                  setPage(1)
                }}
                className="h-6 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
              >
                Limpar todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Candidato</th>
                <th
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('candidate_number')}
                >
                  <div className="flex items-center gap-1">
                    Número <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('position')}
                >
                  <div className="flex items-center gap-1">
                    Cargo <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('party')}
                >
                  <div className="flex items-center gap-1">
                    Partido <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('city_name')}
                >
                  <div className="flex items-center gap-1">
                    Município <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-3">Situação</th>
                <th className="py-3.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mb-2" />
                    <div>Carregando candidaturas do TSE...</div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhuma candidatura encontrada</p>
                    <p className="text-[11px] text-slate-400">
                      Tente ajustar seus termos de busca ou filtros.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const hasLink = Boolean(cand.campaign_id)
                  const placeholderPhoto = `https://img.usecurling.com/ppl/128?gender=${
                    cand.gender === 'FEMININO' ? 'female' : 'male'
                  }&seed=${cand.candidate_number || cand.id}`

                  return (
                    <tr
                      key={cand.id}
                      onClick={() => handleOpenDetails(cand)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Candidate Name + Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={placeholderPhoto}
                              alt={cand.candidate_name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                            />
                            {hasLink && (
                              <div
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                                title="Vinculado à campanha"
                              >
                                <Link2 className="w-2 h-2" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                              {cand.social_name || cand.candidate_name}
                              {cand.is_reelection && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1 py-0 h-4">
                                  Reeleição
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {cand.candidate_name}
                            </div>
                            {hasLink && cand.expand?.campaign_id && (
                              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3 h-3" />
                                Vinculado: {cand.expand.campaign_id.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ballot Number */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {cand.candidate_number}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-800">{cand.position}</span>
                      </td>

                      {/* Party */}
                      <td className="py-3.5 px-3">
                        <Badge
                          variant="outline"
                          className="font-bold text-slate-700 border-slate-300"
                        >
                          {cand.party}
                        </Badge>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-3">
                        <span className="text-slate-700 font-medium">{cand.city_name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          IBGE: {cand.city_code}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">{getStatusBadge(cand.status)}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDetails(cand)
                          }}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Mostrando <span className="font-bold text-slate-700">{candidates.length}</span> de{' '}
            <span className="font-bold text-slate-700">{totalCount.toLocaleString('pt-BR')}</span>{' '}
            candidatos (Página {page} de {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
            </Button>
            <span className="px-2 font-bold text-slate-800">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs font-semibold"
            >
              Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Candidate Details Drawer / Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto bg-white p-6 space-y-6 text-slate-900">
          {selectedCandidate && (
            <>
              <SheetHeader className="space-y-3 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <img
                    src={`https://img.usecurling.com/ppl/256?gender=${
                      selectedCandidate.gender === 'FEMININO' ? 'female' : 'male'
                    }&seed=${selectedCandidate.candidate_number || selectedCandidate.id}`}
                    alt={selectedCandidate.candidate_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-md shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-lg bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
                        {selectedCandidate.candidate_number}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-bold text-slate-800 border-slate-300"
                      >
                        {selectedCandidate.party}
                      </Badge>
                      {getStatusBadge(selectedCandidate.status)}
                    </div>

                    <SheetTitle className="text-lg font-black text-slate-900 mt-2 truncate">
                      {selectedCandidate.social_name || selectedCandidate.candidate_name}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500 truncate">
                      {selectedCandidate.position} • {selectedCandidate.city_name} (SP)
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Campaign Link Section */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Vínculo com Campanha na Plataforma
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Vincule este candidato registrado no TSE para sincronizar dados e visualizá-lo na
                  Dashboard Executiva.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Select
                    value={selectedCampaignId || 'NONE'}
                    onValueChange={(v) => setSelectedCampaignId(v === 'NONE' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Selecione uma campanha..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="NONE">Sem vínculo com campanha</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.candidate_name} - {c.party})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleSaveCampaignLink}
                    disabled={isUpdatingLink}
                    className="h-9 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
                  >
                    {isUpdatingLink ? 'Salvando...' : 'Salvar Vínculo'}
                  </Button>
                </div>

                {selectedCandidate.campaign_id && (
                  <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Atualmente vinculado à campanha ativa
                  </div>
                )}
              </div>

              {/* Complete Details Grid */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                  Dados Oficiais Declarados no TSE
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      Nome Completo
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.candidate_name}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      Nome na Urna / Social
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.social_name || selectedCandidate.candidate_name}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      CPF (Mascarado TSE)
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedCandidate.cpf}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      ID Único TSE
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedCandidate.tse_id}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Ocupação
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.occupation || 'Não informada'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> Grau de Instrução
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.education || 'Não informado'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      Gênero / Faixa Etária
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.gender} • {selectedCandidate.age_range || 'N/D'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      Estado Civil
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.marital_status || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Coalition details */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1">
                    <HeartHandshake className="w-3 h-3" /> Composição da Coligação / Federação
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {selectedCandidate.coalition || 'Partido Isolado'}
                  </span>
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full text-xs"
                >
                  Fechar Detalhes
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
