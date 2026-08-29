migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
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
          name: 'body',
          type: 'text',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['poll_alert', 'info', 'achievement', 'debate', 'territory'],
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['critical', 'warning', 'positive', 'info'],
          maxSelect: 1,
        },
        {
          name: 'read',
          type: 'bool',
          required: false,
        },
        {
          name: 'link',
          type: 'text',
          required: false,
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
        'CREATE INDEX idx_notif_camp ON notifications (campaign_id)',
        'CREATE INDEX idx_notif_user ON notifications (user_id)',
        'CREATE INDEX idx_notif_read ON notifications (read)',
        'CREATE INDEX idx_notif_created ON notifications (created DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('notifications')
      app.delete(collection)
    } catch (_) {}
  },
)
