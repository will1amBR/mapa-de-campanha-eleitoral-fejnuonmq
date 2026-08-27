migrate(
  (app) => {
    // 1. Create campaigns collection
    const campaigns = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'candidate_name', type: 'text', required: true },
        { name: 'party', type: 'text', required: true },
        { name: 'ibge_city_code', type: 'text', required: true },
        { name: 'target_votes', type: 'number', min: 0 },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(campaigns)

    // 2. Update users auth collection to add role and current_campaign
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const campaignsCol = app.findCollectionByNameOrId('campaigns')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'coordinator', 'field_team'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('current_campaign')) {
      users.fields.add(
        new RelationField({
          name: 'current_campaign',
          collectionId: campaignsCol.id,
          maxSelect: 1,
        }),
      )
    }
    // Allow all authenticated users to read profiles of their team
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    app.save(users)

    // 3. Create activities collection
    const activities = new Collection({
      name: 'activities',
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
          collectionId: campaignsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['door-to-door', 'event', 'flyering', 'support-point'],
          maxSelect: 1,
        },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'sentiment', type: 'number', min: 1, max: 5 },
        { name: 'voters_contacted', type: 'number', min: 0 },
        { name: 'location_name', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_activities_campaign ON activities (campaign_id, created DESC)',
        'CREATE INDEX idx_activities_user ON activities (user_id)',
      ],
    })
    app.save(activities)

    // 4. Create team_locations collection
    const teamLocations = new Collection({
      name: 'team_locations',
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
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'campaign_id',
          type: 'relation',
          collectionId: campaignsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'lat', type: 'number', required: true },
        { name: 'lng', type: 'number', required: true },
        { name: 'battery', type: 'number', min: 0, max: 100 },
        { name: 'speed', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_team_locations_user ON team_locations (user_id, created DESC)'],
    })
    app.save(teamLocations)

    // 5. Create support_points collection
    const supportPoints = new Collection({
      name: 'support_points',
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
          collectionId: campaignsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['office', 'committee', 'partner'],
          maxSelect: 1,
        },
        { name: 'lat', type: 'number', required: true },
        { name: 'lng', type: 'number', required: true },
        { name: 'contact', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_support_points_camp ON support_points (campaign_id)'],
    })
    app.save(supportPoints)

    // 6. Create territory_data collection
    const territoryData = new Collection({
      name: 'territory_data',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'ibge_code', type: 'text', required: true },
        { name: 'zone', type: 'text', required: true },
        { name: 'district_name', type: 'text', required: true },
        { name: 'voters_count', type: 'number', min: 0 },
        { name: 'demographics_json', type: 'json' },
        { name: 'historical_votes_json', type: 'json' },
        { name: 'priority_score', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_territory_zone ON territory_data (zone)',
        'CREATE INDEX idx_territory_ibge ON territory_data (ibge_code)',
      ],
    })
    app.save(territoryData)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('territory_data'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('support_points'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('team_locations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('activities'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('campaigns'))
    } catch (_) {}
  },
)
