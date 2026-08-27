migrate(
  (app) => {
    // 1. Add photo field to activities collection if not present
    let activitiesCol
    try {
      activitiesCol = app.findCollectionByNameOrId('activities')
    } catch (_) {
      activitiesCol = null
    }

    if (activitiesCol && !activitiesCol.fields.getByName('photo')) {
      activitiesCol.fields.add(
        new FileField({
          name: 'photo',
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        }),
      )
      app.save(activitiesCol)
    }

    // 2. Load or create alerts collection
    let alertsCol
    try {
      alertsCol = app.findCollectionByNameOrId('alerts')
    } catch (_) {
      alertsCol = null
    }

    if (!alertsCol) {
      let campCol = app.findCollectionByNameOrId('campaigns')
      alertsCol = new Collection({
        name: 'alerts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'campaign_id',
            type: 'relation',
            collectionId: campCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'zone_territory', type: 'text', required: true },
          { name: 'district_name', type: 'text' },
          { name: 'days_inactive', type: 'number', min: 0 },
          {
            name: 'status',
            type: 'select',
            values: ['active', 'resolved', 'dismissed'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'severity',
            type: 'select',
            values: ['warning', 'critical'],
            maxSelect: 1,
          },
          { name: 'priority_score', type: 'number' },
          { name: 'voters_count', type: 'number' },
          { name: 'notes', type: 'text' },
          { name: 'resolved_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_alerts_campaign ON alerts (campaign_id, status)',
          'CREATE INDEX idx_alerts_status ON alerts (status, created DESC)',
        ],
      })
      app.save(alertsCol)
    }

    // Seed initial alerts
    let campId = null
    try {
      const camp = app.findFirstRecordByData('campaigns', 'name', 'Campanha Vitória 2024')
      campId = camp.id
    } catch (_) {}

    try {
      app.findFirstRecordByData('alerts', 'zone_territory', 'Zona 246 - Santo Amaro')
    } catch (_) {
      const alert1 = new Record(alertsCol)
      if (campId) alert1.set('campaign_id', campId)
      alert1.set('zone_territory', 'Zona 246 - Santo Amaro')
      alert1.set('district_name', 'Santo Amaro / Granja Julieta')
      alert1.set('days_inactive', 4)
      alert1.set('status', 'active')
      alert1.set('severity', 'critical')
      alert1.set('priority_score', 85)
      alert1.set('voters_count', 220000)
      alert1.set(
        'notes',
        'Zona de alto potencial sem nenhuma atividade de campo nos últimos 4 dias. Risco de perda de presença para adversários.',
      )
      app.save(alert1)
    }

    try {
      app.findFirstRecordByData('alerts', 'zone_territory', 'Zona 372 - Itaquera')
    } catch (_) {
      const alert2 = new Record(alertsCol)
      if (campId) alert2.set('campaign_id', campId)
      alert2.set('zone_territory', 'Zona 372 - Itaquera')
      alert2.set('district_name', 'Itaquera / Cidade Líder')
      alert2.set('days_inactive', 3)
      alert2.set('status', 'active')
      alert2.set('severity', 'warning')
      alert2.set('priority_score', 88)
      alert2.set('voters_count', 260000)
      alert2.set(
        'notes',
        'Alta densidade populacional (260k eleitores) com 3 dias sem passagem de equipe ou panfletagem.',
      )
      app.save(alert2)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('alerts'))
    } catch (_) {}
    try {
      const activitiesCol = app.findCollectionByNameOrId('activities')
      if (activitiesCol.fields.getByName('photo')) {
        activitiesCol.fields.removeByName('photo')
        app.save(activitiesCol)
      }
    } catch (_) {}
  },
)
