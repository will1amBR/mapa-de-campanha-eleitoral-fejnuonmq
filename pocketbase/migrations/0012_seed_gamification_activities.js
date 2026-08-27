migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const activities = app.findCollectionByNameOrId('activities')

    let campaign
    try {
      campaign = app.findFirstRecordByData('campaigns', 'name', 'Campanha Vitória 2024')
    } catch (_) {
      try {
        const list = app.findRecordsByFilter('campaigns', '', '-created', 1, 0)
        if (list.length > 0) {
          campaign = list[0]
        }
      } catch (_) {}
    }

    if (!campaign) return

    // Ensure we have additional field members for a rich leaderboard
    const additionalMembers = [
      {
        email: 'beatriz.moraes@korenambiental.com',
        name: 'Beatriz Moraes (Zona Oeste)',
        role: 'field_team',
      },
      {
        email: 'rodrigo.alves@korenambiental.com',
        name: 'Rodrigo Alves (Centro-Sul)',
        role: 'field_team',
      },
      {
        email: 'juliana.costa@korenambiental.com',
        name: 'Juliana Costa (Zona Norte)',
        role: 'field_team',
      },
    ]

    const seededUserMap = {}
    for (const m of additionalMembers) {
      let uRecord
      try {
        uRecord = app.findAuthRecordByEmail('_pb_users_auth_', m.email)
      } catch (_) {
        uRecord = new Record(users)
        uRecord.setEmail(m.email)
        uRecord.setPassword('Skip@Pass')
        uRecord.setVerified(true)
        uRecord.set('name', m.name)
        uRecord.set('role', m.role)
        uRecord.set('current_campaign', campaign.id)
        app.save(uRecord)
      }
      seededUserMap[m.email] = uRecord.id
    }

    // Get existing users
    let adminUser, agent1, agent2, agent3
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'william@korenambiental.com')
    } catch (_) {}
    try {
      agent1 = app.findAuthRecordByEmail('_pb_users_auth_', 'camila.militante@korenambiental.com')
    } catch (_) {}
    try {
      agent2 = app.findAuthRecordByEmail('_pb_users_auth_', 'marcos.mobilizador@korenambiental.com')
    } catch (_) {}
    try {
      agent3 = app.findAuthRecordByEmail('_pb_users_auth_', 'lucas.leste@korenambiental.com')
    } catch (_) {}

    const now = new Date()
    const getPastDateIso = (daysAgo, hoursAgo = 0) => {
      const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000)
      return d.toISOString().replace('T', ' ')
    }

    // Diverse activities spanning last 1 to 25 days with various types, notes and contacted counts
    const extraActivities = [
      {
        user_id: agent2 ? agent2.id : adminUser ? adminUser.id : '',
        type: 'door-to-door',
        lat: -23.5621,
        lng: -46.6534,
        notes:
          'Corpo a corpo nos condomínios da Alameda Santos. 28 fichas de apoiadores preenchidas.',
        sentiment: 5,
        voters_contacted: 28,
        location_name: 'Alameda Santos - Jardins',
        created_offset: 1,
      },
      {
        user_id: agent1 ? agent1.id : adminUser ? adminUser.id : '',
        type: 'flyering',
        lat: -23.5901,
        lng: -46.6382,
        notes:
          'Distribuição massiva na saída da estação Santa Cruz. Grande procura pelo informativo.',
        sentiment: 4,
        voters_contacted: 110,
        location_name: 'Terminal Santa Cruz',
        created_offset: 2,
      },
      {
        user_id: seededUserMap['beatriz.moraes@korenambiental.com'] || (agent1 ? agent1.id : ''),
        type: 'event',
        lat: -23.5505,
        lng: -46.689,
        notes:
          'Roda de conversa com coletivo universitário na Praça Benedito Calixto. 65 contatos e apoiadores cadastrados.',
        sentiment: 5,
        voters_contacted: 65,
        location_name: 'Praça Benedito Calixto - Pinheiros',
        created_offset: 3,
      },
      {
        user_id: agent3 ? agent3.id : adminUser ? adminUser.id : '',
        type: 'support-point',
        lat: -23.5412,
        lng: -46.581,
        notes:
          'Mutirão de adesivagem no Ponto de Apoio Tatuapé. 42 novos voluntários cadastrados no app.',
        sentiment: 5,
        voters_contacted: 42,
        location_name: 'Ponto de Apoio Tatuapé',
        created_offset: 4,
      },
      {
        user_id: seededUserMap['rodrigo.alves@korenambiental.com'] || (agent2 ? agent2.id : ''),
        type: 'flyering',
        lat: -23.6012,
        lng: -46.6621,
        notes:
          'Ação no semáforo da Av. Ibirapuera x Av. Moema. Entrega de 190 panfletos e 35 conversões diretas.',
        sentiment: 4,
        voters_contacted: 35,
        location_name: 'Av. Ibirapuera x Moema',
        created_offset: 5,
      },
      {
        user_id: seededUserMap['juliana.costa@korenambiental.com'] || (agent3 ? agent3.id : ''),
        type: 'door-to-door',
        lat: -23.5012,
        lng: -46.6251,
        notes:
          'Visita ao comércio da Rua Voluntários da Pátria em Santana. 52 apoiadores cadastrados.',
        sentiment: 4,
        voters_contacted: 52,
        location_name: 'Rua Voluntários da Pátria - Santana',
        created_offset: 6,
      },
      {
        user_id: agent2 ? agent2.id : adminUser ? adminUser.id : '',
        type: 'event',
        lat: -23.5689,
        lng: -46.6482,
        notes: 'Encontro com grupo de terceira idade no bairro Paraíso. 40 contatos coletados.',
        sentiment: 5,
        voters_contacted: 40,
        location_name: 'Centro Comunitário Paraíso',
        created_offset: 7,
      },
      {
        user_id: seededUserMap['beatriz.moraes@korenambiental.com'] || (agent1 ? agent1.id : ''),
        type: 'door-to-door',
        lat: -23.558,
        lng: -46.678,
        notes: 'Porta a porta na Vila Madalena com apresentação da cartilha municipal.',
        sentiment: 4,
        voters_contacted: 38,
        location_name: 'Rua Fradique Coutinho',
        created_offset: 9,
      },
      {
        user_id: agent1 ? agent1.id : adminUser ? adminUser.id : '',
        type: 'door-to-door',
        lat: -23.579,
        lng: -46.641,
        notes: 'Ação de rua próxima à ESPM e Belas Artes. 75 cadastros de jovens eleitores.',
        sentiment: 5,
        voters_contacted: 75,
        location_name: 'Vila Mariana Universitária',
        created_offset: 12,
      },
      {
        user_id: seededUserMap['rodrigo.alves@korenambiental.com'] || (agent2 ? agent2.id : ''),
        type: 'support-point',
        lat: -23.5614,
        lng: -46.6558,
        notes:
          'Treinamento e cadastramento de 30 novos cabos eleitorais no Comitê Central Paulista.',
        sentiment: 5,
        voters_contacted: 30,
        location_name: 'Comitê Central Paulista',
        created_offset: 15,
      },
      {
        user_id: seededUserMap['juliana.costa@korenambiental.com'] || (agent3 ? agent3.id : ''),
        type: 'flyering',
        lat: -23.498,
        lng: -46.619,
        notes: 'Panfletagem na Feira Livre de Santana. 90 conversas e fichas preenchidas.',
        sentiment: 5,
        voters_contacted: 90,
        location_name: 'Feira Livre Santana',
        created_offset: 18,
      },
    ]

    for (const act of extraActivities) {
      if (!act.user_id) continue
      try {
        app.findFirstRecordByData('activities', 'notes', act.notes)
      } catch (_) {
        const actRec = new Record(activities)
        actRec.set('campaign_id', campaign.id)
        actRec.set('user_id', act.user_id)
        actRec.set('type', act.type)
        actRec.set('lat', act.lat)
        actRec.set('lng', act.lng)
        actRec.set('notes', act.notes)
        actRec.set('sentiment', act.sentiment)
        actRec.set('voters_contacted', act.voters_contacted)
        actRec.set('location_name', act.location_name)
        app.save(actRec)
      }
    }
  },
  (app) => {},
)
