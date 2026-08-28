import React, { useEffect, useRef, useState } from 'react'
import type { Activity, SupportPoint, TeamLocation, TerritoryData } from '@/types/campaign'

// Global type declaration for window.L (Leaflet loaded via CDN script)
declare global {
  interface Window {
    L: any
  }
}

interface MapViewProps {
  center?: [number, number]
  zoom?: number
  activities?: Activity[]
  supportPoints?: SupportPoint[]
  teamLocations?: TeamLocation[]
  territories?: TerritoryData[]
  selectedMemberId?: string | null
  onSelectMember?: (memberId: string | null) => void
  showTeam?: boolean
  showHeatmap?: boolean
  showSupportPoints?: boolean
  showTerritoryBoundaries?: boolean
  interactive?: boolean
  height?: string
  className?: string
}

export const MapView: React.FC<MapViewProps> = ({
  center = [-23.5505, -46.6333], // São Paulo center
  zoom = 13,
  activities = [],
  supportPoints = [],
  teamLocations = [],
  territories = [],
  selectedMemberId,
  onSelectMember,
  showTeam = true,
  showHeatmap = true,
  showSupportPoints = true,
  showTerritoryBoundaries = true,
  height = '100%',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layerGroupRef = useRef<any>(null)

  // Load Leaflet CSS and JS dynamically if not already loaded
  useEffect(() => {
    const ensureLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = () => resolve()
          document.body.appendChild(script)
        })
      }

      initMap()
    }

    ensureLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const initMap = () => {
    if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return

    const L = window.L
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: false,
    })

    // Clean modern tile layer (CartoDB Positron for strategic electoral styling)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup
    mapInstanceRef.current = map

    renderMapLayers()
  }

  const renderMapLayers = () => {
    if (!mapInstanceRef.current || !window.L || !layerGroupRef.current) return

    const L = window.L
    const layerGroup = layerGroupRef.current
    layerGroup.clearLayers()

    // 1. Territory Zones (Circles/Polygons representation)
    if (showTerritoryBoundaries && territories.length > 0) {
      // Mapping simulated zone centroids in SP
      const zoneCoords: Record<string, [number, number]> = {
        'Zona 001 - Bela Vista': [-23.5614, -46.6558],
        'Zona 246 - Santo Amaro': [-23.65, -46.7],
        'Zona 258 - Pinheiros': [-23.567, -46.693],
        'Zona 347 - Tatuapé': [-23.5401, -46.5765],
        'Zona 372 - Itaquera': [-23.535, -46.45],
      }

      territories.forEach((terr) => {
        const coords = zoneCoords[terr.zone] || [
          -23.5505 + (Math.random() - 0.5) * 0.08,
          -46.6333 + (Math.random() - 0.5) * 0.08,
        ]
        const score = terr.priority_score || 80
        const color = score >= 90 ? '#10B981' : score >= 80 ? '#F59E0B' : '#3B82F6'

        const circle = L.circle(coords, {
          color: color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '4, 6',
          radius: 1400,
        })

        const pop = terr.demographics_json?.pop_total?.toLocaleString('pt-BR') || '150.000'
        const renda = terr.demographics_json?.avg_income_sm || '5.5'

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 180px;">
            <div style="font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 4px;">${terr.zone}</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">${terr.district_name} (IBGE ${terr.ibge_code})</div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px; font-size: 11px;">
              <div><strong>Eleitores Aptos:</strong> ${terr.voters_count?.toLocaleString('pt-BR')}</div>
              <div><strong>População Total:</strong> ${pop}</div>
              <div><strong>Renda Média:</strong> ${renda} SM</div>
              <div><strong>Priority Score:</strong> <span style="color: ${color}; font-weight: bold;">${score}/100</span></div>
            </div>
          </div>
        `)
        layerGroup.addLayer(circle)
      })
    }

    // 2. Heatmap & Field Activities Layer
    if (showHeatmap && activities.length > 0) {
      activities.forEach((act) => {
        if (!act.lat || !act.lng) return

        const sentimentColor =
          act.sentiment >= 4 ? '#10B981' : act.sentiment === 3 ? '#F59E0B' : '#EF4444'

        // Outer glow
        const glow = L.circleMarker([act.lat, act.lng], {
          radius: 18,
          fillColor: sentimentColor,
          fillOpacity: 0.25,
          stroke: false,
        })
        layerGroup.addLayer(glow)

        // Core marker
        const core = L.circleMarker([act.lat, act.lng], {
          radius: 7,
          fillColor: sentimentColor,
          fillOpacity: 0.9,
          color: '#ffffff',
          weight: 2,
        })

        const typeLabels: Record<string, string> = {
          'door-to-door': '🚪 Porta a Porta',
          event: '🎤 Evento / Comício',
          flyering: '📄 Panfletagem',
          'support-point': '🏢 Ponto de Apoio',
        }

        const photoHtml = act.photo
          ? `<div style="margin-bottom: 6px; border-radius: 6px; overflow: hidden; max-height: 120px; border: 1px solid #CBD5E1;">
               <img src="/api/files/activities/${act.id}/${act.photo}" alt="Foto da Ação" style="width: 100%; height: 100px; object-fit: cover; display: block;" onerror="this.style.display='none'" />
             </div>`
          : ''

        core.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 210px; max-width: 260px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 700; background: #0F172A; color: #ffffff; padding: 2px 6px; border-radius: 4px;">
                ${typeLabels[act.type] || act.type}
              </span>
              <span style="font-size: 11px; font-weight: 600; color: ${sentimentColor};">
                ★ Sentimento: ${act.sentiment}/5
              </span>
            </div>
            ${photoHtml}
            <div style="font-size: 12px; font-weight: 600; color: #1E293B; margin-bottom: 4px;">
              ${act.location_name || 'Localização de Campo'}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.4;">
              "${act.notes || 'Sem observações adicionais.'}"
            </div>
            <div style="font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px; display: flex; justify-content: space-between;">
              <span>Eleitores: <strong>${act.voters_contacted || 1}</strong></span>
              <span>${act.expand?.user_id?.name ? `👤 ${act.expand.user_id.name.split(' ')[0]}` : ''}</span>
            </div>
          </div>
        `)
        layerGroup.addLayer(core)
      })
    }

    // 3. Support Points (Comitês, Casas Estratégicas)
    if (showSupportPoints && supportPoints.length > 0) {
      supportPoints.forEach((sp) => {
        if (!sp.lat || !sp.lng) return

        const iconHtml = `
          <div style="
            background: #0F172A;
            border: 2px solid #F59E0B;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #F59E0B;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
          ">
            🏢
          </div>
        `

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'support-point-custom-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const marker = L.marker([sp.lat, sp.lng], { icon: customIcon })
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px;">
            <div style="font-size: 10px; font-weight: 700; color: #F59E0B; text-transform: uppercase; letter-spacing: 0.5px;">
              ${sp.type === 'office' ? 'COMITÊ CENTRAL' : sp.type === 'committee' ? 'COMITÊ REGIONAL' : 'PONTO DE APOIO PARCEIRO'}
            </div>
            <div style="font-weight: 700; color: #0F172A; font-size: 13px; margin: 2px 0 6px 0;">
              ${sp.name}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              📍 ${sp.address || 'São Paulo, SP'}
            </div>
            ${sp.contact ? `<div style="font-size: 11px; color: #64748B;">👤 Contato: <strong>${sp.contact}</strong></div>` : ''}
            ${sp.phone ? `<div style="font-size: 11px; color: #64748B;">📞 ${sp.phone}</div>` : ''}
          </div>
        `)
        layerGroup.addLayer(marker)
      })
    }

    // 4. Live Team Locations (GPS markers with ripple)
    if (showTeam && teamLocations.length > 0) {
      teamLocations.forEach((loc) => {
        if (!loc.lat || !loc.lng) return

        const isSelected = selectedMemberId === loc.user_id
        const name = loc.expand?.user_id?.name || 'Militante em Campo'
        const initial = name.charAt(0).toUpperCase()

        const avatarHtml = `
          <div class="team-pin-wrapper" style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.35);
              animation: teamPulse 2s infinite ease-out;
            "></div>
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${isSelected ? '#F59E0B' : '#0F172A'};
              border: 2.5px solid #10B981;
              color: #ffffff;
              font-weight: 700;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              ${initial}
            </div>
            <div style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #10B981;
              border: 2px solid white;
            "></div>
          </div>
        `

        const teamIcon = L.divIcon({
          html: avatarHtml,
          className: 'team-live-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        })

        const marker = L.marker([loc.lat, loc.lng], { icon: teamIcon })

        marker.on('click', () => {
          if (onSelectMember) {
            onSelectMember(loc.user_id)
          }
        })

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 190px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
              <span style="font-weight: 700; font-size: 13px; color: #0F172A;">${name}</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">
              Equipe de Mobilização de Campo
            </div>
            <div style="background: #F1F5F9; border-radius: 6px; padding: 6px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div>🔋 Bateria: <strong>${loc.battery || 85}%</strong></div>
              <div>⚡ Velocidade: <strong>${loc.speed ? `${loc.speed.toFixed(1)} km/h` : 'Parado'}</strong></div>
              <div>🎯 Precisão: <strong>${loc.accuracy ? `±${Math.round(loc.accuracy)}m` : 'Alta'}</strong></div>
              <div>🕒 Sync: <strong>${new Date(loc.updated || loc.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
            </div>
          </div>
        `)

        layerGroup.addLayer(marker)

        // If selected, draw a simulated breadcrumb trail
        if (isSelected) {
          const trailCoords = [
            [loc.lat + 0.003, loc.lng - 0.004],
            [loc.lat + 0.002, loc.lng - 0.002],
            [loc.lat + 0.001, loc.lng - 0.001],
            [loc.lat, loc.lng],
          ]

          const polyline = L.polyline(trailCoords, {
            color: '#F59E0B',
            weight: 4,
            opacity: 0.85,
            dashArray: '6, 6',
          })
          layerGroup.addLayer(polyline)
        }
      })
    }
  }

  useEffect(() => {
    renderMapLayers()
  }, [
    activities,
    supportPoints,
    teamLocations,
    territories,
    selectedMemberId,
    showTeam,
    showHeatmap,
    showSupportPoints,
    showTerritoryBoundaries,
  ])

  // Handle fly to selected member
  useEffect(() => {
    if (selectedMemberId && mapInstanceRef.current) {
      const memberLoc = teamLocations.find((l) => l.user_id === selectedMemberId)
      if (memberLoc && memberLoc.lat && memberLoc.lng) {
        mapInstanceRef.current.flyTo([memberLoc.lat, memberLoc.lng], 16, {
          duration: 1.2,
        })
      }
    }
  }, [selectedMemberId, teamLocations])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ height }}>
      <style>{`
        @keyframes teamPulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>

      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  )
}
