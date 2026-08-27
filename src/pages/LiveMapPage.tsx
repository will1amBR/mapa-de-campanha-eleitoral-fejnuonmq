import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useCampaign } from '@/hooks/use-campaign'
import { MapView } from '@/components/MapView'
import type { Activity, SupportPoint, TeamLocation, TerritoryData } from '@/types/campaign'
import {
  Users,
  Layers,
  Battery,
  Zap,
  Clock,
  Radio,
  Sparkles,
  Building2,
  Flame,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export const LiveMapPage: React.FC = () => {
  const { currentCampaign } = useCampaign()

  const [activities, setActivities] = useState<Activity[]>([])
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Layer toggles
  const [showTeam, setShowTeam] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showSupportPoints, setShowSupportPoints] = useState(true)
  const [showTerritories, setShowTerritories] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(true)

  const fetchMapData = async () => {
    if (!currentCampaign) return
    try {
      const [actRes, spRes, tlRes, terrRes] = await Promise.all([
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
      ])

      setActivities(actRes)
      setSupportPoints(spRes)
      setTeamLocations(tlRes)
      setTerritories(terrRes)
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

  const selectedMember = teamLocations.find((t) => t.user_id === selectedMemberId)

  return (
    <div className="relative flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Map Control Glassmorphism Bar (Top Overlay) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              Rastreamento Tático de Campo
              <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0 h-4">
                AO VIVO
              </Badge>
            </h2>
            <p className="text-[10px] text-slate-400">
              {teamLocations.length} membros mapeados • {activities.length} pontos de calor
            </p>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <Switch
              id="layer-team"
              checked={showTeam}
              onCheckedChange={setShowTeam}
              className="data-[state=checked]:bg-emerald-500 scale-75"
            />
            <Label
              htmlFor="layer-team"
              className="text-[11px] text-slate-300 font-medium cursor-pointer flex items-center gap-1"
            >
              <Users className="w-3 h-3 text-emerald-400" /> Equipe
            </Label>
          </div>

          <div className="flex items-center space-x-1.5">
            <Switch
              id="layer-heat"
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
              className="data-[state=checked]:bg-amber-500 scale-75"
            />
            <Label
              htmlFor="layer-heat"
              className="text-[11px] text-slate-300 font-medium cursor-pointer flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-amber-400" /> Calor/Atividades
            </Label>
          </div>

          <div className="flex items-center space-x-1.5">
            <Switch
              id="layer-sp"
              checked={showSupportPoints}
              onCheckedChange={setShowSupportPoints}
              className="data-[state=checked]:bg-blue-500 scale-75"
            />
            <Label
              htmlFor="layer-sp"
              className="text-[11px] text-slate-300 font-medium cursor-pointer flex items-center gap-1"
            >
              <Building2 className="w-3 h-3 text-blue-400" /> Comitês
            </Label>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5">
            <Switch
              id="layer-terr"
              checked={showTerritories}
              onCheckedChange={setShowTerritories}
              className="data-[state=checked]:bg-purple-500 scale-75"
            />
            <Label
              htmlFor="layer-terr"
              className="text-[11px] text-slate-300 font-medium cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-purple-400" /> Zonas TSE
            </Label>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="h-7 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 px-2"
          >
            {drawerOpen ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {drawerOpen ? 'Ocultar Painel' : 'Ver Equipe'}
          </Button>
        </div>
      </div>

      {/* Full-Screen Interactive Leaflet Map */}
      <div className="flex-1 w-full h-full relative">
        <MapView
          height="100%"
          activities={activities}
          supportPoints={supportPoints}
          teamLocations={teamLocations}
          territories={territories}
          selectedMemberId={selectedMemberId}
          onSelectMember={(id) => setSelectedMemberId(id)}
          showTeam={showTeam}
          showHeatmap={showHeatmap}
          showSupportPoints={showSupportPoints}
          showTerritoryBoundaries={showTerritories}
        />

        {/* Floating Side Drawer for Active Team Members */}
        {drawerOpen && (
          <div className="absolute top-20 right-4 bottom-4 w-80 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white transition-all animate-fade-in-up">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Membros em Campo ({teamLocations.length})
                </h3>
              </div>
              <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                Live Sync
              </Badge>
            </div>

            {/* List of active members */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {teamLocations.map((loc) => {
                const name = loc.expand?.user_id?.name || 'Militante / Coordenador'
                const isSelected = selectedMemberId === loc.user_id

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedMemberId(isSelected ? null : loc.user_id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/60 shadow-md'
                        : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 border border-emerald-500 text-xs font-bold flex items-center justify-center text-white">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100 truncate max-w-[140px]">
                            {name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Rastreando via PWA
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-amber-400' : ''}`}
                      />
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
                      <div className="mt-2.5 pt-2 border-t border-amber-500/30 text-[11px] text-amber-300 font-medium">
                        📍 Trilha de deslocamento ativada no mapa
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Selected member detail footer */}
            {selectedMember && (
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-xs">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">
                  FOCO SELECIONADO
                </div>
                <div className="font-bold text-amber-300">
                  {selectedMember.expand?.user_id?.name || 'Militante'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Lat: {selectedMember.lat.toFixed(5)}, Lng: {selectedMember.lng.toFixed(5)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
