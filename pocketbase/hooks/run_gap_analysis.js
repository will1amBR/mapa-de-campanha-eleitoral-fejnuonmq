routerAdd(
  'POST',
  '/backend/v1/alerts/run-gap-analysis',
  (e) => {
    try {
      const user = e.auth
      if (!user) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const thresholdDays =
        typeof body.days_inactive_threshold === 'number' ? body.days_inactive_threshold : 3
      const campaignId = body.campaign_id || user.getString('current_campaign') || null

      const territories = $app.findRecordsByFilter('territory_data', '', '-priority_score', 100, 0)
      const now = new Date()
      let createdCount = 0

      territories.forEach((terr) => {
        const priorityScore = terr.getFloat('priority_score') || 0
        const votersCount = terr.getInt('voters_count') || 0
        const districtName = terr.getString('district_name') || ''
        const zone = terr.getString('zone') || ''

        if (priorityScore < 70) return

        const filter = campaignId ? "campaign_id = '" + campaignId + "'" : ''
        const activities = $app.findRecordsByFilter('activities', filter, '-created', 100, 0)

        let mostRecentActDate = null
        const districtPrefix = districtName.split('/')[0].trim().toLowerCase()

        activities.forEach((act) => {
          const locName = (act.getString('location_name') || '').toLowerCase()
          const notes = (act.getString('notes') || '').toLowerCase()
          if (
            (districtPrefix && locName.includes(districtPrefix)) ||
            (zone && locName.includes(zone.toLowerCase())) ||
            (districtPrefix && notes.includes(districtPrefix))
          ) {
            const actCreated = new Date(act.getString('created'))
            if (!mostRecentActDate || actCreated > mostRecentActDate) {
              mostRecentActDate = actCreated
            }
          }
        })

        let daysInactive = 99
        if (mostRecentActDate) {
          const diffMs = now.getTime() - mostRecentActDate.getTime()
          daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }

        if (daysInactive >= thresholdDays) {
          const existingAlerts = $app.findRecordsByFilter(
            'alerts',
            "zone_territory = '" + zone + "' && status = 'active'",
            '-created',
            1,
            0,
          )

          if (existingAlerts.length === 0) {
            const alertsCol = $app.findCollectionByNameOrId('alerts')
            const newAlert = new Record(alertsCol)
            if (campaignId) newAlert.set('campaign_id', campaignId)
            newAlert.set('zone_territory', zone)
            newAlert.set('district_name', districtName)
            newAlert.set('days_inactive', daysInactive === 99 ? 7 : daysInactive)
            newAlert.set('status', 'active')
            newAlert.set(
              'severity',
              priorityScore >= 90 || daysInactive >= 5 ? 'critical' : 'warning',
            )
            newAlert.set('priority_score', priorityScore)
            newAlert.set('voters_count', votersCount)
            newAlert.set(
              'notes',
              'Alerta Gap Analysis: ' +
                zone +
                ' (' +
                districtName +
                ') está há ' +
                (daysInactive === 99 ? '7+' : daysInactive) +
                ' dias sem presença da equipe. Potencial: ' +
                votersCount.toLocaleString('pt-BR') +
                ' eleitores.',
            )
            $app.save(newAlert)
            createdCount++
          }
        }
      })

      return e.json(200, {
        success: true,
        message: 'Gap analysis executado com sucesso.',
        new_alerts_created: createdCount,
        threshold_days_used: thresholdDays,
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao executar gap analysis: ' + err })
    }
  },
  $apis.requireAuth(),
)
