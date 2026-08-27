// POST /backend/v1/alerts/scan
// Scans inactive zones immediately with customizable inactive_threshold_days
routerAdd(
  'POST',
  '/backend/v1/alerts/scan',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const threshold =
        typeof body.inactive_threshold_days === 'number' && body.inactive_threshold_days >= 1
          ? body.inactive_threshold_days
          : 3
      const campId = body.campaign_id || null

      let campaigns = []
      if (campId) {
        try {
          const c = $app.findRecordById('campaigns', campId)
          campaigns = [c]
        } catch (_) {
          return e.badRequestError('Campanha não encontrada')
        }
      } else {
        try {
          campaigns = $app.findRecordsByFilter('campaigns', '', 'created', 50, 0)
        } catch (_) {
          campaigns = []
        }
      }

      let territories = []
      try {
        territories = $app.findRecordsByFilter('territory_data', '', '-priority_score', 100, 0)
      } catch (_) {
        territories = []
      }

      if (campaigns.length === 0 || territories.length === 0) {
        return e.json(200, { message: 'Nenhuma campanha ou território cadastrado', generated: 0 })
      }

      let alertsCol
      try {
        alertsCol = $app.findCollectionByNameOrId('alerts')
      } catch (_) {
        try {
          alertsCol = $app.findCollectionByNameOrId('Alerts')
        } catch (_) {
          return e.json(500, { error: 'Coleção alerts não encontrada' })
        }
      }

      const now = new Date()
      let generatedCount = 0

      for (let i = 0; i < campaigns.length; i++) {
        const camp = campaigns[i]
        const currentCampId = camp.id

        for (let j = 0; j < territories.length; j++) {
          const terr = territories[j]
          const zoneName = terr.getString('zone') || ''
          const districtName = terr.getString('district_name') || ''
          const priorityScore = terr.getInt('priority_score') || 0
          const votersCount = terr.getInt('voters_count') || 0

          if (priorityScore < 70 && votersCount < 100000) continue

          let latestActivityTime = null
          try {
            const recentActs = $app.findRecordsByFilter(
              'activities',
              `campaign_id = "${currentCampId}"`,
              '-created',
              50,
              0,
            )

            for (let k = 0; k < recentActs.length; k++) {
              const act = recentActs[k]
              const loc = (act.getString('location_name') || '').toLowerCase()
              const distFirstWord = districtName.split('/')[0].trim().toLowerCase()
              const zoneNumber = zoneName.split('-')[0].trim().toLowerCase()

              if (
                loc.includes(distFirstWord) ||
                loc.includes(zoneNumber) ||
                (zoneName && loc.includes(zoneName.toLowerCase()))
              ) {
                const actCreated = new Date(act.getString('created'))
                if (!latestActivityTime || actCreated > latestActivityTime) {
                  latestActivityTime = actCreated
                }
              }
            }
          } catch (_) {}

          let daysInactive = 0
          if (!latestActivityTime) {
            daysInactive = 5
          } else {
            const diffMs = now.getTime() - latestActivityTime.getTime()
            daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          }

          if (daysInactive >= threshold) {
            let existing = []
            try {
              existing = $app.findRecordsByFilter(
                'alerts',
                `campaign_id = "${currentCampId}" && zone_territory = "${zoneName}" && status = "active"`,
                '-created',
                1,
                0,
              )
            } catch (_) {}

            const severity =
              daysInactive >= threshold + 1 || priorityScore >= 90 ? 'critical' : 'warning'
            const notes = `Zona prioritária (${votersCount ? votersCount.toLocaleString() : 'N/A'} eleitores, Score ${priorityScore}) sem presença em campo há ${daysInactive} dias.`

            if (existing.length > 0) {
              const existingAlert = existing[0]
              existingAlert.set('days_inactive', daysInactive)
              existingAlert.set('severity', severity)
              existingAlert.set('priority_score', priorityScore)
              existingAlert.set('voters_count', votersCount)
              $app.save(existingAlert)
              generatedCount++
            } else {
              const newAlert = new Record(alertsCol)
              newAlert.set('campaign_id', currentCampId)
              newAlert.set('zone_territory', zoneName)
              newAlert.set('district_name', districtName)
              newAlert.set('days_inactive', daysInactive)
              newAlert.set('status', 'active')
              newAlert.set('severity', severity)
              newAlert.set('priority_score', priorityScore)
              newAlert.set('voters_count', votersCount)
              newAlert.set('notes', notes)
              $app.save(newAlert)
              generatedCount++
            }
          }
        }
      }

      return e.json(200, {
        success: true,
        threshold_days: threshold,
        active_alerts_synced: generatedCount,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao verificar alertas de zonas inativas' })
    }
  },
  $apis.requireAuth(),
)
