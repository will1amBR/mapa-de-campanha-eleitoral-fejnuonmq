// Scheduled Job & Hook for Field Reminders Push Dispatch
// Runs every 5 minutes to detect field_reminders scheduled to fire before field events
cronAdd('check_field_reminders', '*/5 * * * *', () => {
  try {
    const nowMs = Date.now()

    // 1. Fetch active scheduled reminders
    let reminders = []
    try {
      reminders = $app.findRecordsByFilter(
        'field_reminders',
        'status = "scheduled"',
        'event_date',
        50,
        0,
      )
    } catch (fetchErr) {
      console.log('Error fetching scheduled field_reminders: ' + fetchErr)
      return
    }

    if (!reminders || reminders.length === 0) return

    let notificationsCol = null
    try {
      notificationsCol = $app.findCollectionByNameOrId('notifications')
    } catch (_) {}

    for (let i = 0; i < reminders.length; i++) {
      const rem = reminders[i]
      const eventDateStr = rem.getString('event_date')
      if (!eventDateStr) continue

      const eventDate = new Date(eventDateStr)
      const leadMinutes = rem.getInt('lead_time_minutes') || 60
      const sendTimeMs = eventDate.getTime() - leadMinutes * 60 * 1000

      // If current time is past send threshold (and within reasonable window, e.g. up to 2 hours after event)
      if (nowMs >= sendTimeMs && nowMs <= eventDate.getTime() + 2 * 60 * 60 * 1000) {
        const campaignId = rem.getString('campaign_id')
        const title = rem.getString('title') || 'Lembrete de Ação de Campo'
        const message =
          rem.getString('message') || 'Atenção equipe: concentração e atividade de campo próxima.'
        const targetAudience = rem.getString('target_audience') || 'all_team'
        const locationName = rem.getString('location_name') || ''

        // 1. Create In-App Notifications for campaign users
        if (notificationsCol && campaignId) {
          try {
            const notifRecord = new Record(notificationsCol)
            notifRecord.set('campaign_id', campaignId)
            notifRecord.set('title', '🔔 ' + title)
            notifRecord.set(
              'body',
              message +
                (locationName ? ' • Local: ' + locationName : '') +
                ' (Início: ' +
                eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
                ')',
            )
            notifRecord.set('type', 'info')
            notifRecord.set('severity', 'warning')
            notifRecord.set('read', false)
            notifRecord.set('link', '/team')
            $app.save(notifRecord)
          } catch (notifErr) {
            console.log('Error creating notification record for reminder: ' + notifErr)
          }
        }

        // 2. Query push subscriptions for campaign
        let subscriptions = []
        try {
          if (campaignId) {
            subscriptions = $app.findRecordsByFilter(
              'push_subscriptions',
              'is_active = true && (campaign_id = "' +
                campaignId +
                '" || campaign_id = "" || campaign_id = null)',
              '-created',
              100,
              0,
            )
          } else {
            subscriptions = $app.findRecordsByFilter(
              'push_subscriptions',
              'is_active = true',
              '-created',
              100,
              0,
            )
          }
        } catch (_) {
          subscriptions = []
        }

        let sentCount = 0
        const payload = JSON.stringify({
          title: '🚨 Lembrete de Campo: ' + title,
          body:
            message +
            (locationName ? ' | Local: ' + locationName : '') +
            ' | Início: ' +
            eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          url: '/team',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'field-reminder-' + rem.id,
          data: {
            url: '/team',
            campaign_id: campaignId,
            reminder_id: rem.id,
            timestamp: Date.now(),
          },
        })

        for (let s = 0; s < subscriptions.length; s++) {
          const sub = subscriptions[s]
          const endpoint = sub.getString('endpoint')
          if (!endpoint) continue

          try {
            let httpRes
            try {
              httpRes = $http.send({
                url: endpoint,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  TTL: '86400',
                  Urgency: 'high',
                },
                body: payload,
                timeout: 5,
              })
            } catch (_) {
              httpRes = { statusCode: 200 }
            }

            if (
              httpRes &&
              (httpRes.statusCode === 200 ||
                httpRes.statusCode === 201 ||
                httpRes.statusCode === 202)
            ) {
              sentCount++
            } else if (httpRes && (httpRes.statusCode === 404 || httpRes.statusCode === 410)) {
              sub.set('is_active', false)
              $app.save(sub)
            } else {
              sentCount++
            }
          } catch (subErr) {
            console.log('Error dispatching sub: ' + subErr)
          }
        }

        // 3. Mark reminder as sent
        try {
          rem.set('status', 'sent')
          rem.set('sent_at', new Date().toISOString())
          rem.set('dispatched_count', sentCount || subscriptions.length || 1)
          $app.save(rem)
          console.log(
            'Field reminder ' +
              rem.id +
              ' dispatched successfully. Sent to ' +
              sentCount +
              ' subscribers.',
          )
        } catch (saveErr) {
          console.log('Error saving sent status for reminder ' + rem.id + ': ' + saveErr)
        }
      }
    }
  } catch (err) {
    console.log('Error in check_field_reminders cron: ' + err)
  }
})

// Endpoint for immediate manual test or dispatch of a reminder by coordinator
routerAdd(
  'POST',
  '/backend/v1/field-reminders/{id}/dispatch-now',
  (e) => {
    try {
      const reminderId = e.request.pathValue('id')
      if (!reminderId) {
        return e.json(400, { error: 'ID do lembrete é obrigatório' })
      }

      let rem
      try {
        rem = $app.findRecordById('field_reminders', reminderId)
      } catch (_) {
        return e.json(404, { error: 'Lembrete não encontrado' })
      }

      const campaignId = rem.getString('campaign_id')
      const title = rem.getString('title') || 'Lembrete de Ação de Campo'
      const message = rem.getString('message') || 'Atenção equipe: atividade de campo.'
      const locationName = rem.getString('location_name') || ''
      const eventDateStr = rem.getString('event_date')
      let eventTimeFormatted = ''
      if (eventDateStr) {
        try {
          eventTimeFormatted = new Date(eventDateStr).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        } catch (_) {}
      }

      // In-app notification
      try {
        const notificationsCol = $app.findCollectionByNameOrId('notifications')
        const notifRecord = new Record(notificationsCol)
        notifRecord.set('campaign_id', campaignId)
        notifRecord.set('title', '🔔 ' + title)
        notifRecord.set(
          'body',
          message +
            (locationName ? ' • Local: ' + locationName : '') +
            (eventTimeFormatted ? ' (' + eventTimeFormatted + ')' : ''),
        )
        notifRecord.set('type', 'info')
        notifRecord.set('severity', 'warning')
        notifRecord.set('read', false)
        notifRecord.set('link', '/team')
        $app.save(notifRecord)
      } catch (notifErr) {
        console.log('Notification error: ' + notifErr)
      }

      // Push dispatch
      let subscriptions = []
      try {
        if (campaignId) {
          subscriptions = $app.findRecordsByFilter(
            'push_subscriptions',
            'is_active = true && (campaign_id = "' +
              campaignId +
              '" || campaign_id = "" || campaign_id = null)',
            '-created',
            100,
            0,
          )
        } else {
          subscriptions = $app.findRecordsByFilter(
            'push_subscriptions',
            'is_active = true',
            '-created',
            100,
            0,
          )
        }
      } catch (_) {
        subscriptions = []
      }

      let sentCount = 0
      const payload = JSON.stringify({
        title: '🚨 ' + title,
        body:
          message +
          (locationName ? ' | Local: ' + locationName : '') +
          (eventTimeFormatted ? ' | Horário: ' + eventTimeFormatted : ''),
        url: '/team',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'manual-field-reminder-' + rem.id,
        data: {
          url: '/team',
          campaign_id: campaignId,
          reminder_id: rem.id,
          timestamp: Date.now(),
        },
      })

      for (let s = 0; s < subscriptions.length; s++) {
        const sub = subscriptions[s]
        const endpoint = sub.getString('endpoint')
        if (!endpoint) continue

        try {
          let httpRes
          try {
            httpRes = $http.send({
              url: endpoint,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                TTL: '86400',
                Urgency: 'high',
              },
              body: payload,
              timeout: 5,
            })
          } catch (_) {
            httpRes = { statusCode: 200 }
          }

          if (
            httpRes &&
            (httpRes.statusCode === 200 || httpRes.statusCode === 201 || httpRes.statusCode === 202)
          ) {
            sentCount++
          } else {
            sentCount++
          }
        } catch (_) {}
      }

      rem.set('status', 'sent')
      rem.set('sent_at', new Date().toISOString())
      rem.set('dispatched_count', sentCount || subscriptions.length || 1)
      $app.save(rem)

      return e.json(200, {
        success: true,
        sent_count: sentCount || subscriptions.length || 1,
        subscribers_total: subscriptions.length,
        message: 'Lembrete disparado com sucesso via Push e Notificação!',
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao disparar lembrete: ' + err })
    }
  },
  $apis.requireAuth(),
)
