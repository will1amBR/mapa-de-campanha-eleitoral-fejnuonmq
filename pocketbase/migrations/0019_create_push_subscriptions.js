migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const collection = new Collection({
      name: 'push_subscriptions',
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
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'campaign_id',
          type: 'relation',
          required: false,
          collectionId: campaigns.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'endpoint',
          type: 'text',
          required: true,
        },
        {
          name: 'p256dh',
          type: 'text',
          required: true,
        },
        {
          name: 'auth_key',
          type: 'text',
          required: true,
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
        },
        {
          name: 'device_type',
          type: 'select',
          required: false,
          values: ['mobile', 'desktop', 'tablet', 'unknown'],
          maxSelect: 1,
        },
        {
          name: 'is_active',
          type: 'bool',
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
        'CREATE UNIQUE INDEX idx_push_sub_endpoint ON push_subscriptions (endpoint)',
        'CREATE INDEX idx_push_sub_user ON push_subscriptions (user_id)',
        'CREATE INDEX idx_push_sub_camp ON push_subscriptions (campaign_id)',
        'CREATE INDEX idx_push_sub_active ON push_subscriptions (is_active)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('push_subscriptions')
      app.delete(collection)
    } catch (_) {}
  },
)
