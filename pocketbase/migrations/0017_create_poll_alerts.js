migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const polls = app.findCollectionByNameOrId('polls')

    const collection = new Collection({
      name: 'poll_alerts',
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
          required: true,
          collectionId: campaigns.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'poll_id',
          type: 'relation',
          collectionId: polls.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'alert_type',
          type: 'select',
          required: true,
          values: [
            'lost_lead',
            'gain_lead',
            'drop_significant',
            'rise_significant',
            'adversary_surge',
            'margin_tie',
            'general',
          ],
          maxSelect: 1,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'summary',
          type: 'text',
          required: true,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['critical', 'warning', 'positive', 'info'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'resolved', 'dismissed'],
          maxSelect: 1,
        },
        {
          name: 'detected_at',
          type: 'date',
        },
        {
          name: 'diff_pp',
          type: 'number',
        },
        {
          name: 'scenario',
          type: 'text',
        },
        {
          name: 'institute',
          type: 'text',
        },
        {
          name: 'resolved_at',
          type: 'date',
        },
        {
          name: 'metadata',
          type: 'json',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_poll_alerts_camp ON poll_alerts (campaign_id)',
        'CREATE INDEX idx_poll_alerts_status ON poll_alerts (status)',
        'CREATE INDEX idx_poll_alerts_poll ON poll_alerts (poll_id)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('poll_alerts')
      app.delete(collection)
    } catch (_) {}
  },
)
