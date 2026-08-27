// Cron job to automatically check inactive high-potential territory zones daily
// Runs once every day at midnight (or on demand)
cronAdd('check_inactive_zones', '0 0 * * *', () => {
  try {
    let defaultInactiveThresholdDays = 3

    // 1. Fetch campaigns
    let campaigns = []
    try {
      campaigns = $app.findRecordsByFilter('campaigns', '', 'created', 50, 0)
    } catch (_) {
      return
    }

    // 2. Fetch territories
    let territories = []
    try {
      territories = $app.findRecordsByFilter('territory_data', '', '-priority_score', 100, 0)
    } catch (_) {
      return
    }

    if (campaigns.length === 0 || territories.length === 0) return

    let alertsCol
    try {
      alertsCol = $app.findCollectionByNameOrId('alerts')
    } catch (_) {
      try {
        alertsCol = $app.findCollectionByNameOrId('Alerts')
      } catch (_) {
        return
      }
    }

    const now = new Date()

    for (let i = 0; i < campaigns.length; i++) {
      const camp = campaigns[i]
      const campId = camp.id

      for (let j = 0; j < territories.length; j++) {
        const terr = territories[j]
        const zoneName = terr.getString('zone') || ''
        const districtName = terr.getString('district_name') || ''
        const priorityScore = terr.getInt('priority_score') || 0
        const votersCount = terr.getInt('voters_count') || 0

        // Check only relevant / high potential zones (priority >= 70 or voters >= 100k)
        if (priorityScore < 70 && votersCount < 100000) continue

        // Check recent activities for this campaign in this territory/zone
        let latestActivityTime = null
        try {
          // Search activities with matching location
          const recentActs = $app.findRecordsByFilter(
            'activities',
            `campaign_id = "${campId}"`,
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
          daysInactive = 5 // No recorded activity
        } else {
          const diffMs = now.getTime() - latestActivityTime.getTime()
          daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }

        if (daysInactive >= defaultInactiveThresholdDays) {
          // Check if active alert already exists
          let existing = []
          try {
            existing = $app.findRecordsByFilter(
              'alerts',
              `campaign_id = "${campId}" && zone_territory = "${zoneName}" && status = "active"`,
              '-created',
              1,
              0,
            )
          } catch (_) {}

          const severity = daysInactive >= 4 || priorityScore >= 90 ? 'critical' : 'warning'
          const notes = `Zona de alto potencial (${votersCount ? votersCount.toLocaleString() : 'N/A'} eleitores, Score ${priorityScore}) sem atividade recente de campo há ${daysInactive} dias.`

          if (existing.length > 0) {
            const existingAlert = existing[0]
            existingAlert.set('days_inactive', daysInactive)
            existingAlert.set('severity', severity)
            existingAlert.set('priority_score', priorityScore)
            existingAlert.set('voters_count', votersCount)
            $app.save(existingAlert)
          } else {
            const newAlert = new Record(alertsCol)
            newAlert.set('campaign_id', campId)
            newAlert.set('zone_territory', zoneName)
            newAlert.set('district_name', districtName)
            newAlert.set('days_inactive', daysInactive)
            newAlert.set('status', 'active')
            newAlert.set('severity', severity)
            newAlert.set('priority_score', priorityScore)
            newAlert.set('voters_count', votersCount)
            newAlert.set('notes', notes)
            $app.save(newAlert)
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in check_inactive_zones cron:', err)
  }
})
