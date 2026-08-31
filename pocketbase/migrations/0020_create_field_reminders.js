migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const collection = new Collection({
      name: 'field_reminders',
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
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'message',
          type: 'text',
          required: true,
        },
        {
          name: 'event_date',
          type: 'date',
          required: true,
        },
        {
          name: 'location_name',
          type: 'text',
          required: false,
        },
        {
          name: 'lead_time_minutes',
          type: 'number',
          required: false,
        },
        {
          name: 'target_audience',
          type: 'select',
          required: true,
          values: ['all_team', 'coordinators_only', 'field_only', 'custom'],
          maxSelect: 1,
        },
        {
          name: 'target_users',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 50,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['scheduled', 'sent', 'cancelled'],
          maxSelect: 1,
        },
        {
          name: 'sent_at',
          type: 'date',
          required: false,
        },
        {
          name: 'dispatched_count',
          type: 'number',
          required: false,
        },
        {
          name: 'created_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
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
        'CREATE INDEX idx_field_reminders_camp ON field_reminders (campaign_id)',
        'CREATE INDEX idx_field_reminders_status ON field_reminders (status)',
        'CREATE INDEX idx_field_reminders_event_date ON field_reminders (event_date)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('field_reminders')
      app.delete(collection)
    } catch (_) {}
  },
)
