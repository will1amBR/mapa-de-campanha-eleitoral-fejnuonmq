migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const campaigns = app.findCollectionByNameOrId('campaigns')
    const supportPoints = app.findCollectionByNameOrId('support_points')
    const activities = app.findCollectionByNameOrId('activities')
    const territoryData = app.findCollectionByNameOrId('territory_data')
    const teamLocations = app.findCollectionByNameOrId('team_locations')

    // 1. Create or ensure Campaign: "Campanha Vitória 2024" (São Paulo)
    let campaignRecord
    try {
      campaignRecord = app.findFirstRecordByData('campaigns', 'name', 'Campanha Vitória 2024')
    } catch (_) {
      campaignRecord = new Record(campaigns)
      campaignRecord.set('name', 'Campanha Vitória 2024')
      campaignRecord.set('candidate_name', 'Luciana Albuquerque')
      campaignRecord.set('party', 'PSD - 55')
      campaignRecord.set('ibge_city_code', '3550308') // São Paulo
      campaignRecord.set('target_votes', 450000)
      campaignRecord.set('color', '#F59E0B')
      app.save(campaignRecord)
    }

    // Also create a second campaign for multi-politician demonstration
    let campaign2Record
    try {
      campaign2Record = app.findFirstRecordByData('campaigns', 'name', 'Frente Renovação São Paulo')
    } catch (_) {
      campaign2Record = new Record(campaigns)
      campaign2Record.set('name', 'Frente Renovação São Paulo')
      campaign2Record.set('candidate_name', 'Gabriel Arantes')
      campaign2Record.set('party', 'REPUBLICANOS - 10')
      campaign2Record.set('ibge_city_code', '3550308')
      campaign2Record.set('target_votes', 280000)
      campaign2Record.set('color', '#3B82F6')
      app.save(campaign2Record)
    }

    // 2. Create Admin User: william@korenambiental.com
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'william@korenambiental.com')
      adminUser.set('role', 'admin')
      adminUser.set('current_campaign', campaignRecord.id)
      app.save(adminUser)
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('william@korenambiental.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'William - Coordenador Geral')
      adminUser.set('role', 'admin')
      adminUser.set('current_campaign', campaignRecord.id)
      app.save(adminUser)
    }

    // Seed Field Agents
    const agent1Email = 'camila.militante@korenambiental.com'
    let agent1
    try {
      agent1 = app.findAuthRecordByEmail('_pb_users_auth_', agent1Email)
    } catch (_) {
      agent1 = new Record(users)
      agent1.setEmail(agent1Email)
      agent1.setPassword('Skip@Pass')
      agent1.setVerified(true)
      agent1.set('name', 'Camila Santos (Zona Sul)')
      agent1.set('role', 'field_team')
      agent1.set('current_campaign', campaignRecord.id)
      app.save(agent1)
    }

    const agent2Email = 'marcos.mobilizador@korenambiental.com'
    let agent2
    try {
      agent2 = app.findAuthRecordByEmail('_pb_users_auth_', agent2Email)
    } catch (_) {
      agent2 = new Record(users)
      agent2.setEmail(agent2Email)
      agent2.setPassword('Skip@Pass')
      agent2.setVerified(true)
      agent2.set('name', 'Marcos Oliveira (Centro/Paulista)')
      agent2.set('role', 'field_team')
      agent2.set('current_campaign', campaignRecord.id)
      app.save(agent2)
    }

    const agent3Email = 'lucas.leste@korenambiental.com'
    let agent3
    try {
      agent3 = app.findAuthRecordByEmail('_pb_users_auth_', agent3Email)
    } catch (_) {
      agent3 = new Record(users)
      agent3.setEmail(agent3Email)
      agent3.setPassword('Skip@Pass')
      agent3.setVerified(true)
      agent3.set('name', 'Lucas Ferreira (Zona Leste)')
      agent3.set('role', 'field_team')
      agent3.set('current_campaign', campaignRecord.id)
      app.save(agent3)
    }

    // 3. Seed Support Points (Comitês e Casas Estratégicas)
    const sp1Name = 'Comitê Central Av. Paulista'
    try {
      app.findFirstRecordByData('support_points', 'name', sp1Name)
    } catch (_) {
      const sp1 = new Record(supportPoints)
      sp1.set('campaign_id', campaignRecord.id)
      sp1.set('name', sp1Name)
      sp1.set('type', 'office')
      sp1.set('lat', -23.5614)
      sp1.set('lng', -46.6558)
      sp1.set('contact', 'Diretoria de Operações')
      sp1.set('phone', '(11) 98765-4321')
      sp1.set('address', 'Av. Paulista, 1500 - Bela Vista, São Paulo')
      app.save(sp1)
    }

    const sp2Name = 'Comitê Regional Pinheiros & Faria Lima'
    try {
      app.findFirstRecordByData('support_points', 'name', sp2Name)
    } catch (_) {
      const sp2 = new Record(supportPoints)
      sp2.set('campaign_id', campaignRecord.id)
      sp2.set('name', sp2Name)
      sp2.set('type', 'committee')
      sp2.set('lat', -23.567)
      sp2.set('lng', -46.693)
      sp2.set('contact', 'Coordenação Z/O')
      sp2.set('phone', '(11) 98123-9988')
      sp2.set('address', 'Rua dos Pinheiros, 820 - Pinheiros, São Paulo')
      app.save(sp2)
    }

    const sp3Name = 'Ponto de Apoio Zona Sul (Vila Mariana)'
    try {
      app.findFirstRecordByData('support_points', 'name', sp3Name)
    } catch (_) {
      const sp3 = new Record(supportPoints)
      sp3.set('campaign_id', campaignRecord.id)
      sp3.set('name', sp3Name)
      sp3.set('type', 'partner')
      sp3.set('lat', -23.589)
      sp3.set('lng', -46.634)
      sp3.set('contact', 'Liderança Comunitária ZS')
      sp3.set('phone', '(11) 97654-3210')
      sp3.set('address', 'Rua Domingos de Morais, 1200 - Vila Mariana, São Paulo')
      app.save(sp3)
    }

    // 4. Seed 5 Manual Check-in Activities in Central/Strategic locations
    const activitiesData = [
      {
        notes:
          'Panfletagem de alta intensidade na saída do Metrô Consolação. Excelente receptividade das propostas de segurança e transporte.',
        type: 'flyering',
        lat: -23.5587,
        lng: -46.6601,
        sentiment: 5,
        voters_contacted: 140,
        location_name: 'Estação Consolação / Linha Verde',
        userId: agent2.id,
      },
      {
        notes:
          'Visita porta a porta nos comércios da Rua Augusta. Lojistas pedem melhorias na iluminação pública e apoio ao comércio noturno.',
        type: 'door-to-door',
        lat: -23.5532,
        lng: -46.6541,
        sentiment: 4,
        voters_contacted: 45,
        location_name: 'Rua Augusta - Centro Comercial',
        userId: agent1.id,
      },
      {
        notes:
          'Reunião e evento público com líderes de bairro no Parque Ibirapuera (Portão 7). Mais de 80 apoiadores engajados na pauta ambiental.',
        type: 'event',
        lat: -23.5874,
        lng: -46.6576,
        sentiment: 5,
        voters_contacted: 95,
        location_name: 'Parque Ibirapuera',
        userId: adminUser.id,
      },
      {
        notes:
          'Distribuição de material informativo e adesivagem de carros no cruzamento Faria Lima x Rebouças. Trânsito receptivo.',
        type: 'flyering',
        lat: -23.5712,
        lng: -46.6914,
        sentiment: 4,
        voters_contacted: 180,
        location_name: 'Largo da Batata / Faria Lima',
        userId: agent2.id,
      },
      {
        notes:
          'Visitas às lideranças comunitárias no Tatuapé. Dúvidas sobre o plano de saúde local esclarecidas.',
        type: 'door-to-door',
        lat: -23.5401,
        lng: -46.5765,
        sentiment: 3,
        voters_contacted: 60,
        location_name: 'Praça Silvio Romero - Tatuapé',
        userId: agent3.id,
      },
    ]

    for (const act of activitiesData) {
      try {
        app.findFirstRecordByData('activities', 'notes', act.notes)
      } catch (_) {
        const actRecord = new Record(activities)
        actRecord.set('campaign_id', campaignRecord.id)
        actRecord.set('user_id', act.userId)
        actRecord.set('type', act.type)
        actRecord.set('lat', act.lat)
        actRecord.set('lng', act.lng)
        actRecord.set('notes', act.notes)
        actRecord.set('sentiment', act.sentiment)
        actRecord.set('voters_contacted', act.voters_contacted)
        actRecord.set('location_name', act.location_name)
        app.save(actRecord)
      }
    }

    // 5. Seed Real-time Team Locations (simulated live coordinates)
    const teamLocationsData = [
      {
        userId: agent1.id,
        lat: -23.555,
        lng: -46.656,
        battery: 88,
        speed: 4.2,
        accuracy: 5,
        isActive: true,
      },
      {
        userId: agent2.id,
        lat: -23.565,
        lng: -46.687,
        battery: 74,
        speed: 1.8,
        accuracy: 4,
        isActive: true,
      },
      {
        userId: agent3.id,
        lat: -23.542,
        lng: -46.578,
        battery: 62,
        speed: 0.0,
        accuracy: 8,
        isActive: true,
      },
      {
        userId: adminUser.id,
        lat: -23.5614,
        lng: -46.6558,
        battery: 95,
        speed: 0.0,
        accuracy: 3,
        isActive: true,
      },
    ]

    for (const loc of teamLocationsData) {
      try {
        app.findFirstRecordByData('team_locations', 'user_id', loc.userId)
      } catch (_) {
        const locRec = new Record(teamLocations)
        locRec.set('user_id', loc.userId)
        locRec.set('campaign_id', campaignRecord.id)
        locRec.set('lat', loc.lat)
        locRec.set('lng', loc.lng)
        locRec.set('battery', loc.battery)
        locRec.set('speed', loc.speed)
        locRec.set('accuracy', loc.accuracy)
        locRec.set('is_active', loc.isActive)
        app.save(locRec)
      }
    }

    // 6. Seed Territory Data (TSE & IBGE official sample datasets)
    const territoryRecords = [
      {
        ibge_code: '355030801',
        zone: 'Zona 001 - Bela Vista',
        district_name: 'Bela Vista / Consolação',
        voters_count: 148500,
        priority_score: 92,
        demographics_json: {
          avg_income_sm: 8.5,
          pop_total: 198000,
          age_distribution: { '18-29': '28%', '30-49': '42%', '50-64': '18%', '65+': '12%' },
          education_higher_perc: 54.2,
          key_demands: ['Mobilidade Urbana', 'Iluminação Noturna', 'Revitalização Cultural'],
        },
        historical_votes_json: {
          election_2022_first_turn: { party_psd: '38.4%', party_rep: '26.1%', others: '35.5%' },
          election_2020_municipal: { turnout_perc: 78.2, winner_perc: 42.1 },
          swing_voters_estimate_perc: 24.5,
        },
      },
      {
        ibge_code: '355030802',
        zone: 'Zona 246 - Santo Amaro',
        district_name: 'Santo Amaro / Granja Julieta',
        voters_count: 220000,
        priority_score: 85,
        demographics_json: {
          avg_income_sm: 6.2,
          pop_total: 260000,
          age_distribution: { '18-29': '24%', '30-49': '40%', '50-64': '22%', '65+': '14%' },
          education_higher_perc: 42.8,
          key_demands: ['Saúde Pública', 'Segurança no Comércio', 'Creches'],
        },
        historical_votes_json: {
          election_2022_first_turn: { party_psd: '32.1%', party_rep: '35.2%', others: '32.7%' },
          election_2020_municipal: { turnout_perc: 74.5, winner_perc: 38.6 },
          swing_voters_estimate_perc: 31.0,
        },
      },
      {
        ibge_code: '355030803',
        zone: 'Zona 258 - Pinheiros',
        district_name: 'Pinheiros / Vila Madalena',
        voters_count: 165000,
        priority_score: 95,
        demographics_json: {
          avg_income_sm: 11.4,
          pop_total: 185000,
          age_distribution: { '18-29': '31%', '30-49': '45%', '50-64': '15%', '65+': '9%' },
          education_higher_perc: 68.7,
          key_demands: ['Sustentabilidade', 'Ciclovias e Parques', 'Economia Criativa'],
        },
        historical_votes_json: {
          election_2022_first_turn: { party_psd: '46.2%', party_rep: '18.5%', others: '35.3%' },
          election_2020_municipal: { turnout_perc: 82.1, winner_perc: 51.3 },
          swing_voters_estimate_perc: 19.8,
        },
      },
      {
        ibge_code: '355030804',
        zone: 'Zona 347 - Tatuapé',
        district_name: 'Tatuapé / Anália Franco',
        voters_count: 195000,
        priority_score: 79,
        demographics_json: {
          avg_income_sm: 7.8,
          pop_total: 230000,
          age_distribution: { '18-29': '22%', '30-49': '41%', '50-64': '23%', '65+': '14%' },
          education_higher_perc: 48.0,
          key_demands: ['Drenagem e Enchentes', 'Segurança Residencial', 'Hospitais Regionais'],
        },
        historical_votes_json: {
          election_2022_first_turn: { party_psd: '34.0%', party_rep: '36.8%', others: '29.2%' },
          election_2020_municipal: { turnout_perc: 76.8, winner_perc: 40.5 },
          swing_voters_estimate_perc: 27.2,
        },
      },
      {
        ibge_code: '355030805',
        zone: 'Zona 372 - Itaquera',
        district_name: 'Itaquera / Cidade Líder',
        voters_count: 260000,
        priority_score: 88,
        demographics_json: {
          avg_income_sm: 3.1,
          pop_total: 310000,
          age_distribution: { '18-29': '32%', '30-49': '38%', '50-64': '20%', '65+': '10%' },
          education_higher_perc: 21.5,
          key_demands: ['Transporte Coletivo', 'Emprego Jovem', 'Saneamento Básico'],
        },
        historical_votes_json: {
          election_2022_first_turn: { party_psd: '29.5%', party_rep: '41.2%', others: '29.3%' },
          election_2020_municipal: { turnout_perc: 72.0, winner_perc: 36.2 },
          swing_voters_estimate_perc: 35.8,
        },
      },
    ]

    for (const terr of territoryRecords) {
      try {
        app.findFirstRecordByData('territory_data', 'zone', terr.zone)
      } catch (_) {
        const terrRec = new Record(territoryData)
        terrRec.set('ibge_code', terr.ibge_code)
        terrRec.set('zone', terr.zone)
        terrRec.set('district_name', terr.district_name)
        terrRec.set('voters_count', terr.voters_count)
        terrRec.set('priority_score', terr.priority_score)
        terrRec.set('demographics_json', terr.demographics_json)
        terrRec.set('historical_votes_json', terr.historical_votes_json)
        app.save(terrRec)
      }
    }
  },
  (app) => {
    // rollback if needed
  },
)
