// Scheduled Job: Run daily gap analysis to detect high-potential inactive zones and create alerts
// Cron syntax: 5 fields - minute hour day-of-month month day-of-week
// Runs every day at 06:00 AM (0 6 * * *)
cronAdd('gap_analysis_alerts_check', '0 6 * * *', () => {
  try {
    const defaultThresholdDays = 3

    // 1. Fetch all territory data
    const territories = $app.findRecordsByFilter('territory_data', '', '-priority_score', 100, 0)
    if (!territories || territories.length === 0) {
      return
    }

    // 2. Fetch all campaigns
    const campaigns = $app.findRecordsByFilter('campaigns', '', '-created', 50, 0)
    const primaryCampaign = campaigns && campaigns.length > 0 ? campaigns[0] : null
    const campaignId = primaryCampaign ? primaryCampaign.id : null

    const now = new Date()

    territories.forEach((terr) => {
      const priorityScore = terr.getFloat('priority_score') || 0
      const votersCount = terr.getInt('voters_count') || 0
      const districtName = terr.getString('district_name') || ''
      const zone = terr.getString('zone') || ''

      // Only evaluate high-potential zones (priority >= 75)
      if (priorityScore < 75) {
        return
      }

      // Check recent activities matching this zone/district
      // Get all activities for this campaign or in general
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

      if (daysInactive >= defaultThresholdDays) {
        // Check if an active alert already exists for this zone
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
          if (campaignId) {
            newAlert.set('campaign_id', campaignId)
          }
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
            'Alerta automático do sistema: ' +
              zone +
              ' (' +
              districtName +
              ') está há ' +
              (daysInactive === 99 ? '7+' : daysInactive) +
              ' dias sem atividades de campo registradas. Potencial eleitoral prioritário (Score ' +
              priorityScore +
              '/100).',
          )
          $app.save(newAlert)
        }
      }
    })
  } catch (err) {
    console.log('Error in gap_analysis_alerts_check cron: ' + err)
  }
})
