migrate(
  (app) => {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Create weekly_goals collection
    const weeklyGoals = new Collection({
      name: 'weekly_goals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'coordinator')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'coordinator')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'coordinator')",
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
          name: 'description',
          type: 'text',
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['checkins', 'indicacoes', 'km'],
          maxSelect: 1,
        },
        {
          name: 'target_value',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'week_start',
          type: 'date',
          required: true,
        },
        {
          name: 'week_end',
          type: 'date',
          required: true,
        },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'completed', 'archived'],
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
        'CREATE INDEX idx_weekly_goals_campaign ON weekly_goals (campaign_id)',
        'CREATE INDEX idx_weekly_goals_status ON weekly_goals (status)',
        'CREATE INDEX idx_weekly_goals_type ON weekly_goals (type)',
      ],
    })
    app.save(weeklyGoals)

    // Seed sample initial goals for the default campaign
    let campaign
    try {
      campaign = app.findFirstRecordByData('campaigns', 'name', 'Campanha Vitória 2024')
    } catch (_) {
      try {
        const list = app.findRecordsByFilter('campaigns', '', '-created', 1, 0)
        if (list.length > 0) campaign = list[0]
      } catch (_) {}
    }

    if (!campaign) return

    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'william@korenambiental.com')
    } catch (_) {}

    const now = new Date()
    // Find current Monday and Sunday
    const dayOfWeek = now.getDay()
    const diffToMonday = (dayOfWeek + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const goalsToSeed = [
      {
        title: '20 Check-ins em Campo',
        description: 'Meta semanal de presença georreferenciada da equipe em zonas prioritárias',
        type: 'checkins',
        target_value: 20,
        status: 'active',
      },
      {
        title: '150 Eleitores Indicados / Cadastrados',
        description: 'Coleta de novos contatos e eleitores abordados nas ações de rua',
        type: 'indicacoes',
        target_value: 150,
        status: 'active',
      },
      {
        title: '30 km Percorridos pela Equipe',
        description: 'Cobertura de caminhada e deslocamento nos bairros da cidade',
        type: 'km',
        target_value: 30,
        status: 'active',
      },
    ]

    for (const g of goalsToSeed) {
      try {
        app.findFirstRecordByData('weekly_goals', 'title', g.title)
      } catch (_) {
        const goalRec = new Record(weeklyGoals)
        goalRec.set('campaign_id', campaign.id)
        goalRec.set('title', g.title)
        goalRec.set('description', g.description)
        goalRec.set('type', g.type)
        goalRec.set('target_value', g.target_value)
        goalRec.set('week_start', monday.toISOString())
        goalRec.set('week_end', sunday.toISOString())
        goalRec.set('status', g.status)
        if (adminUser) goalRec.set('created_by', adminUser.id)
        app.save(goalRec)
      }
    }
  },
  (app) => {
    try {
      const weeklyGoals = app.findCollectionByNameOrId('weekly_goals')
      app.delete(weeklyGoals)
    } catch (_) {}
  },
)
