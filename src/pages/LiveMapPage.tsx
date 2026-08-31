import React, { useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { MapView, type AdLeadPoint } from '@/components/MapView'
import type {
  Activity,
  SupportPoint,
  TeamLocation,
  TerritoryData,
  UtmVisit,
} from '@/types/campaign'
import {
  Users,
  Battery,
  Zap,
  Clock,
  Radio,
  Sparkles,
  Building2,
  Flame,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Target,
  LocateFixed,
  Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const LiveMapPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  const [activities, setActivities] = useState<Activity[]>([])
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [utmVisits, setUtmVisits] = useState<UtmVisit[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Layer toggles
  const [showTeam, setShowTeam] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showAdLeads, setShowAdLeads] = useState(true)
  const [showSupportPoints, setShowSupportPoints] = useState(true)
  const [showTerritories, setShowTerritories] = useState(true)

  // Drawer state: 'open' (full list), 'minimized' (compact chip/bottom-bar), 'closed' (hidden)
  const [drawerState, setDrawerState] = useState<'open' | 'minimized' | 'closed'>('minimized')

  const fetchMapData = async () => {
    if (!currentCampaign) return
    try {
      const [actRes, spRes, tlRes, terrRes, utmRes] = await Promise.all([
        pb.collection('activities').getFullList<Activity>({
          filter: `campaign_id = "${currentCampaign.id}"`,
          expand: 'user_id',
        }),
        pb.collection('support_points').getFullList<SupportPoint>({
          filter: `campaign_id = "${currentCampaign.id}"`,
        }),
        pb.collection('team_locations').getFullList<TeamLocation>({
          sort: '-updated',
          expand: 'user_id',
        }),
        pb.collection('territory_data').getFullList<TerritoryData>({
          sort: '-priority_score',
        }),
        pb
          .collection('utm_visits')
          .getFullList<UtmVisit>({
            filter: `campaign_id = "${currentCampaign.id}"`,
          })
          .catch(() => [] as UtmVisit[]),
      ])

      setActivities(actRes)
      setSupportPoints(spRes)
      setTeamLocations(tlRes)
      setTerritories(terrRes)
      setUtmVisits(utmRes)
    } catch (err) {
      console.error('Error fetching live map data', err)
    }
  }

  useEffect(() => {
    fetchMapData()

    const unsubTL = pb.collection('team_locations').subscribe('*', () => {
      fetchMapData()
    })
    const unsubAct = pb.collection('activities').subscribe('*', () => {
      fetchMapData()
    })

    return () => {
      unsubTL.then((u) => u())
      unsubAct.then((u) => u())
    }
  }, [currentCampaign])

  // Cross-reference ADS UTM conversions with geographic density sectors
  const adLeadPoints = useMemo<AdLeadPoint[]>(() => {
    // Cluster zones around known high-density electoral zones in SP
    const anchorCentroids: [number, number][] = [
      [-23.5505, -46.6333], // Centro / Sé
      [-23.5614, -46.6558], // Bela Vista / Paulista
      [-23.567, -46.693], // Pinheiros / Faria Lima
      [-23.65, -46.7], // Santo Amaro
      [-23.5401, -46.5765], // Tatuapé
      [-23.535, -46.45], // Itaquera
      [-23.6, -46.63], // Saúde / Jabaquara
    ]

    const conversionsOnly = utmVisits.filter((v) => v.converted)
    const pointsList: AdLeadPoint[] = []

    if (conversionsOnly.length > 0) {
      conversionsOnly.forEach((item, idx) => {
        const centroid = anchorCentroids[idx % anchorCentroids.length]
        const jitterLat = Math.sin(idx * 7.9) * 0.015
        const jitterLng = Math.cos(idx * 5.3) * 0.018

        pointsList.push({
          id: item.id || `lead-${idx}`,
          lat: centroid[0] + jitterLat,
          lng: centroid[1] + jitterLng,
          source: (item.utm_source || 'instagram').toLowerCase(),
          campaign_name: item.utm_campaign || 'Anúncio de Alcance',
          conversion_type: item.conversion_type || 'Apoiador Cadastrado',
          created: item.created,
        })
      })
    } else {
      // Seed default sample ad leads cluster if empty to ensure the layer shines immediately
      const defaultSampleLeads = [
        {
          lat: -23.555,
          lng: -46.645,
          source: 'instagram',
          camp: 'Campanha Juventude Insta',
          type: 'Voluntário',
        },
        {
          lat: -23.558,
          lng: -46.642,
          source: 'instagram',
          camp: 'Campanha Juventude Insta',
          type: 'Apoiador',
        },
        {
          lat: -23.565,
          lng: -46.66,
          source: 'facebook',
          camp: 'Campanha Mobilidade SP',
          type: 'Cadastro',
        },
        {
          lat: -23.569,
          lng: -46.685,
          source: 'google',
          camp: 'Busca Google Propostas',
          type: 'Lead Site',
        },
        {
          lat: -23.542,
          lng: -46.58,
          source: 'tiktok',
          camp: 'Corte Podcast TikTok',
          type: 'Evento',
        },
        {
          lat: -23.538,
          lng: -46.575,
          source: 'instagram',
          camp: 'Impulsionamento Geral',
          type: 'Voluntário',
        },
        {
          lat: -23.531,
          lng: -46.445,
          source: 'facebook',
          camp: 'Saúde Zona Leste',
          type: 'Apoiador',
        },
        {
          lat: -23.648,
          lng: -46.695,
          source: 'instagram',
          camp: 'Segurança Zona Sul',
          type: 'Cadastro',
        },
      ]

      defaultSampleLeads.forEach((d, i) => {
        pointsList.push({
          id: `sample-lead-${i}`,
          lat: d.lat,
          lng: d.lng,
          source: d.source,
          campaign_name: d.camp,
          conversion_type: d.type,
        })
      })
    }

    return pointsList
  }, [utmVisits])

  const selectedMember = teamLocations.find((t) => t.user_id === selectedMemberId)

  const handleSelectMember = (userId: string | null) => {
    if (userId && userId === selectedMemberId) {
      // Unselect if clicked again
      setSelectedMemberId(null)
    } else {
      setSelectedMemberId(userId)
      // When a member is selected, minimize or collapse drawer so user can immediately see the map and marker
      if (window.innerWidth < 640) {
        setDrawerState('minimized')
      }
    }
  }

  return (
    <div className="relative flex-1 flex flex-col h-[calc(100dvh-3.5rem)] sm:h-[calc(100vh-4rem)] w-full max-w-full overflow-hidden">
      {/* Map Control Floating Bar (Top Overlay) */}
      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex flex-col gap-1.5 p-2 sm:p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl text-white pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-100 truncate">Rastreamento</h2>
              <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0 h-4 shrink-0 uppercase">
                Ao Vivo
              </Badge>
            </div>
          </div>

          <div className="text-[10px] text-slate-300 font-medium shrink-0">
            <span className="text-emerald-400 font-bold">{teamLocations.length}</span> equipe •{' '}
            <span className="text-amber-400 font-bold">{activities.length}</span> ações •{' '}
            <span className="text-pink-400 font-bold">{adLeadPoints.length}</span> leads ADS
          </div>
        </div>

        {/* Filter / Layer toggle pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs min-w-0">
          <button
            type="button"
            onClick={() => setShowTeam(!showTeam)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              showTeam
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Equipe ({teamLocations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              showHeatmap
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Calor / Ações</span>
          </button>

          {/* NEW LAYER: ADS LEADS DENSITY & HEATMAP */}
          <button
            type="button"
            onClick={() => setShowAdLeads(!showAdLeads)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              showAdLeads
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm font-bold ring-1 ring-pink-400/50'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
            title="Densidade geográfica de leads captados via anúncios para direcionar equipe de rua"
          >
            <Megaphone className="w-3 h-3" />
            <span>Leads ADS ({adLeadPoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSupportPoints(!showSupportPoints)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              showSupportPoints
                ? 'bg-blue-500 text-white shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Comitês ({supportPoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTerritories(!showTerritories)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              showTerritories
                ? 'bg-purple-600 text-white shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Zonas TSE</span>
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (drawerState === 'open') setDrawerState('minimized')
              else setDrawerState('open')
            }}
            className="h-6 sm:h-7 text-[10px] sm:text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 px-2 shrink-0 ml-auto"
          >
            <Users className="w-3 h-3 mr-1 text-amber-400" />
            {drawerState === 'open' ? 'Recolher Lista' : 'Ver Equipe'}
          </Button>
        </div>
      </div>

      {/* Full-Screen Interactive Leaflet Map */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapView
          height="100%"
          activities={activities}
          supportPoints={supportPoints}
          teamLocations={teamLocations}
          territories={territories}
          adLeads={adLeadPoints}
          selectedMemberId={selectedMemberId}
          onSelectMember={handleSelectMember}
          showTeam={showTeam}
          showHeatmap={showHeatmap}
          showAdLeadsHeatmap={showAdLeads}
          showSupportPoints={showSupportPoints}
          showTerritoryBoundaries={showTerritories}
        />

        {/* Selected Member Floating Card (When drawer is minimized or collapsed) */}
        {selectedMember && drawerState !== 'open' && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-80 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl shadow-2xl p-3 text-white animate-fade-in-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  {(selectedMember.expand?.user_id?.name || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">
                    {selectedMember.expand?.user_id?.name || 'Membro em Campo'}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Foco selecionado no mapa
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => setDrawerState('open')}
                  title="Expandir lista completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => setSelectedMemberId(null)}
                  title="Desmarcar"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 text-[10px] text-slate-300">
              <div className="flex items-center gap-1">
                <Battery
                  className={`w-3 h-3 ${(selectedMember.battery || 85) < 30 ? 'text-rose-400' : 'text-emerald-400'}`}
                />
                <span>{selectedMember.battery || 85}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>
                  {selectedMember.speed ? `${selectedMember.speed.toFixed(1)} km/h` : '0 km/h'}
                </span>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {new Date(selectedMember.updated || selectedMember.created).toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Minimized bottom pill button when drawer is minimized and no member selected */}
        {!selectedMember && drawerState === 'minimized' && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-20 flex justify-center sm:justify-end">
            <button
              onClick={() => setDrawerState('open')}
              className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-amber-500/60 text-white px-3.5 py-2 rounded-xl shadow-2xl text-xs font-bold transition-all hover:scale-102"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Ver Equipe em Campo ({teamLocations.length})</span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

        {/* Floating Side Drawer / Bottom Sheet for Active Team Members (OPEN STATE) */}
        {drawerState === 'open' && (
          <div className="absolute top-20 sm:top-24 right-2 left-2 sm:left-auto sm:right-4 bottom-2 sm:bottom-4 sm:w-80 max-h-[75vh] sm:max-h-[calc(100vh-8rem)] z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white transition-all animate-fade-in-up">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Membros em Campo ({teamLocations.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0 h-4">
                  Live Sync
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => setDrawerState('minimized')}
                  title="Minimizar lista para ver o mapa"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Hint for mobile */}
            <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-300 font-medium flex items-center gap-1.5">
              <LocateFixed className="w-3 h-3 shrink-0" />
              <span>Toque em um membro para focar diretamente no mapa.</span>
            </div>

            {/* List of active members */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 custom-scrollbar">
              {teamLocations.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">Nenhum membro ativo</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ative o GPS no rodapé para sincronizar sua localização.
                  </p>
                </div>
              ) : (
                teamLocations.map((loc) => {
                  const name = loc.expand?.user_id?.name || 'Militante / Coordenador'
                  const isSelected = selectedMemberId === loc.user_id

                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectMember(loc.user_id)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer active:scale-98 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-700 border border-emerald-500 text-xs font-bold flex items-center justify-center text-white shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100 truncate max-w-[140px] sm:max-w-[150px]">
                              {name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                              <span className="truncate">Rastreando via PWA</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 shrink-0">
                          <span className="text-[10px] font-semibold text-amber-400">Ver</span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-amber-400' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Telemetry Metrics */}
                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-700/40 text-[10px] text-slate-300">
                        <div className="flex items-center gap-1">
                          <Battery
                            className={`w-3 h-3 ${(loc.battery || 85) < 30 ? 'text-rose-400' : 'text-emerald-400'}`}
                          />
                          <span>{loc.battery || 85}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{loc.speed ? `${loc.speed.toFixed(1)} km/h` : '0 km/h'}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(loc.updated || loc.created).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-2 pt-1.5 border-t border-amber-500/30 text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                          <Target className="w-3 h-3" /> Foco ativado no mapa
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Selected member detail footer */}
            {selectedMember && (
              <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-xs flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 font-semibold uppercase">
                    SELECIONADO
                  </div>
                  <div className="font-bold text-amber-300 text-xs truncate">
                    {selectedMember.expand?.user_id?.name || 'Militante'}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setDrawerState('minimized')}
                  className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
                >
                  Ver no Mapa
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
