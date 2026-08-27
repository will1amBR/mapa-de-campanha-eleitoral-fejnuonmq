migrate(
  (app) => {
    // 1. Get or create campaigns reference
    const campaignsCol = app.findCollectionByNameOrId('campaigns')
    let defaultCamp = null
    try {
      defaultCamp = app.findFirstRecordByData('campaigns', 'party', 'PSD - 55')
    } catch (_) {
      try {
        const records = app.findRecordsByFilter('campaigns', '', '-created', 1, 0)
        if (records && records.length > 0) defaultCamp = records[0]
      } catch (_) {}
    }

    const defaultCampId = defaultCamp ? defaultCamp.id : null

    // 2. candidates collection
    let candidatesCol
    try {
      candidatesCol = app.findCollectionByNameOrId('candidates')
    } catch (_) {
      candidatesCol = new Collection({
        name: 'candidates',
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
            collectionId: campaignsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'tse_id', type: 'text' },
          { name: 'election_year', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'city_code', type: 'text' },
          { name: 'city_name', type: 'text' },
          { name: 'candidate_number', type: 'text' },
          { name: 'candidate_name', type: 'text' },
          { name: 'social_name', type: 'text' },
          { name: 'cpf', type: 'text' },
          { name: 'position', type: 'text' },
          { name: 'party', type: 'text' },
          { name: 'coalition', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'occupation', type: 'text' },
          { name: 'gender', type: 'text' },
          { name: 'education', type: 'text' },
          { name: 'marital_status', type: 'text' },
          { name: 'age_range', type: 'text' },
          { name: 'is_reelection', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_candidates_tse_id ON candidates (tse_id)',
          'CREATE INDEX idx_candidates_city ON candidates (city_name)',
          'CREATE INDEX idx_candidates_party ON candidates (party)',
          'CREATE INDEX idx_candidates_position ON candidates (position)',
          'CREATE INDEX idx_candidates_campaign ON candidates (campaign_id)',
        ],
      })
      app.save(candidatesCol)
    }

    // 3. scheduled_posts collection
    let scheduledPostsCol
    try {
      scheduledPostsCol = app.findCollectionByNameOrId('scheduled_posts')
    } catch (_) {
      scheduledPostsCol = new Collection({
        name: 'scheduled_posts',
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
          { name: 'title', type: 'text', required: true },
          { name: 'scheduled_at', type: 'date', required: true },
          {
            name: 'platform',
            type: 'select',
            required: true,
            values: [
              'instagram',
              'facebook',
              'tiktok',
              'youtube',
              'twitter',
              'linkedin',
              'whatsapp',
            ],
            maxSelect: 1,
          },
          {
            name: 'media_type',
            type: 'select',
            required: true,
            values: ['image', 'video', 'carousel', 'text', 'link', 'stories', 'reels'],
            maxSelect: 1,
          },
          { name: 'caption', type: 'text' },
          { name: 'media_url', type: 'text' },
          { name: 'target_audience', type: 'text' },
          {
            name: 'objective',
            type: 'select',
            required: true,
            values: ['engagement', 'conversion', 'awareness', 'mobilization', 'event'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['draft', 'scheduled', 'published', 'cancelled'],
            maxSelect: 1,
          },
          { name: 'published_at', type: 'date' },
          { name: 'impressions', type: 'number', min: 0 },
          { name: 'clicks', type: 'number', min: 0 },
          { name: 'shares', type: 'number', min: 0 },
          { name: 'comments', type: 'number', min: 0 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_scheduled_posts_camp ON scheduled_posts (campaign_id, scheduled_at)',
          'CREATE INDEX idx_scheduled_posts_status ON scheduled_posts (status)',
        ],
      })
      app.save(scheduledPostsCol)
    }

    // 4. utm_visits collection
    let utmVisitsCol
    try {
      utmVisitsCol = app.findCollectionByNameOrId('utm_visits')
    } catch (_) {
      utmVisitsCol = new Collection({
        name: 'utm_visits',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'campaign_id',
            type: 'relation',
            collectionId: campaignsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'utm_source', type: 'text' },
          { name: 'utm_medium', type: 'text' },
          { name: 'utm_campaign', type: 'text' },
          { name: 'utm_content', type: 'text' },
          { name: 'utm_term', type: 'text' },
          { name: 'landing_page', type: 'text' },
          { name: 'visitor_id', type: 'text' },
          { name: 'ip_hash', type: 'text' },
          { name: 'user_agent', type: 'text' },
          { name: 'referrer', type: 'text' },
          { name: 'converted', type: 'bool' },
          { name: 'conversion_type', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_utm_visits_camp ON utm_visits (campaign_id)',
          'CREATE INDEX idx_utm_visits_source ON utm_visits (utm_source)',
          'CREATE INDEX idx_utm_visits_visitor ON utm_visits (visitor_id)',
        ],
      })
      app.save(utmVisitsCol)
    }

    // 5. ad_campaigns collection
    let adCampaignsCol
    try {
      adCampaignsCol = app.findCollectionByNameOrId('ad_campaigns')
    } catch (_) {
      adCampaignsCol = new Collection({
        name: 'ad_campaigns',
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
            name: 'platform',
            type: 'select',
            required: true,
            values: ['meta_ads', 'google_ads', 'tiktok_ads'],
            maxSelect: 1,
          },
          { name: 'external_id', type: 'text' },
          { name: 'name', type: 'text', required: true },
          { name: 'budget', type: 'number', min: 0 },
          { name: 'spent', type: 'number', min: 0 },
          { name: 'impressions', type: 'number', min: 0 },
          { name: 'clicks', type: 'number', min: 0 },
          { name: 'ctr', type: 'number' },
          { name: 'cpc', type: 'number' },
          { name: 'conversions', type: 'number', min: 0 },
          { name: 'cost_per_conversion', type: 'number' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['active', 'paused', 'ended'],
            maxSelect: 1,
          },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ad_campaigns_camp ON ad_campaigns (campaign_id)',
          'CREATE INDEX idx_ad_campaigns_status ON ad_campaigns (status)',
        ],
      })
      app.save(adCampaignsCol)
    }

    // 6. Resilient Seed for candidates
    try {
      const candidatesTargetCol = app.findCollectionByNameOrId('candidates')
      const seedCandidates = [
        {
          tse_id: '250001912831',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '15',
          candidate_name: 'RICARDO LUIS REIS NUNES',
          social_name: 'RICARDO NUNES',
          cpf: '***.482.918-**',
          position: 'Prefeito',
          party: 'MDB',
          coalition:
            'MDB / PL / PP / PSD / REPUBLICANOS / PODE / AVANTE / SOLIDARIEDADE / PRD / MOBILIZA / AGIR',
          status: 'Deferido',
          occupation: 'Empresário',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '55 a 59 anos',
          is_reelection: true,
          campaign_id: defaultCampId,
        },
        {
          tse_id: '250001928491',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '50',
          candidate_name: 'GUILHERME CASTRO BOULOS',
          social_name: 'GUILHERME BOULOS',
          cpf: '***.194.888-**',
          position: 'Prefeito',
          party: 'PSOL',
          coalition: 'FEDERAÇÃO PSOL REDE / FEDERAÇÃO BRASIL DA ESPERANÇA (PT/PCdoB/PV) / PDT',
          status: 'Deferido',
          occupation: 'Professor de Ensino Superior',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '40 a 44 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250001934011',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '44',
          candidate_name: 'JOSÉ LUIZ DATENA',
          social_name: 'DATENA',
          cpf: '***.602.118-**',
          position: 'Prefeito',
          party: 'PSDB',
          coalition: 'FEDERAÇÃO PSDB CIDADANIA',
          status: 'Deferido',
          occupation: 'Jornalista e Redator',
          gender: 'MASCULINO',
          education: 'ENSINO MÉDIO COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '65 a 69 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002049112',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '28',
          candidate_name: 'PABLO HENRIQUE COSTA MARÇAL',
          social_name: 'PABLO MARÇAL',
          cpf: '***.341.228-**',
          position: 'Prefeito',
          party: 'PRTB',
          coalition: 'PARTIDO ISOLADO',
          status: 'Deferido',
          occupation: 'Empresário',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '35 a 39 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002051289',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '40',
          candidate_name: 'TABATA CLAUDIA AMARAL DE PONTES',
          social_name: 'TABATA AMARAL',
          cpf: '***.819.678-**',
          position: 'Prefeito',
          party: 'PSB',
          coalition: 'PSB / FEDERAÇÃO PSDB CIDADANIA',
          status: 'Deferido',
          occupation: 'Cientista Político',
          gender: 'FEMININO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'SOLTEIRO(A)',
          age_range: '30 a 34 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250001955001',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '55055',
          candidate_name: 'LUCIANA ALBUQUERQUE CARDOSO',
          social_name: 'LUCIANA ALBUQUERQUE',
          cpf: '***.812.338-**',
          position: 'Prefeito',
          party: 'PSD',
          coalition: 'PSD / MDB / REPUBLICANOS',
          status: 'Deferido',
          occupation: 'Médico',
          gender: 'FEMININO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '45 a 49 anos',
          is_reelection: false,
          campaign_id: defaultCampId,
        },
        {
          tse_id: '250001962344',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '55123',
          candidate_name: 'CARLOS EDUARDO SILVA SANTOS',
          social_name: 'PROFESSOR CARLINHOS',
          cpf: '***.334.908-**',
          position: 'Vereador',
          party: 'PSD',
          coalition: 'PARTIDO ISOLADO',
          status: 'Deferido',
          occupation: 'Professor de Ensino Médio',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '50 a 54 anos',
          is_reelection: true,
          campaign_id: defaultCampId,
        },
        {
          tse_id: '250001978219',
          election_year: '2024',
          uf: 'SP',
          city_code: '3509502',
          city_name: 'CAMPINAS',
          candidate_number: '10',
          candidate_name: 'DÁRIO JORGE GIOLO SAADI',
          social_name: 'DÁRIO SAADI',
          cpf: '***.519.828-**',
          position: 'Prefeito',
          party: 'REPUBLICANOS',
          coalition: 'REPUBLICANOS / MDB / PP / PL / PSD / PSB / SOLIDARIEDADE / PODE',
          status: 'Deferido',
          occupation: 'Médico',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'DIVORCIADO(A)',
          age_range: '60 a 64 anos',
          is_reelection: true,
          campaign_id: null,
        },
        {
          tse_id: '250001984501',
          election_year: '2024',
          uf: 'SP',
          city_code: '3509502',
          city_name: 'CAMPINAS',
          candidate_number: '13',
          candidate_name: 'PEDRO TOURINHO DE SIQUEIRA',
          social_name: 'PEDRO TOURINHO',
          cpf: '***.908.418-**',
          position: 'Prefeito',
          party: 'PT',
          coalition: 'FEDERAÇÃO BRASIL DA ESPERANÇA (PT/PCdoB/PV) / FEDERAÇÃO PSOL REDE',
          status: 'Deferido',
          occupation: 'Médico',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '40 a 44 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250001991200',
          election_year: '2024',
          uf: 'SP',
          city_code: '3548500',
          city_name: 'SANTOS',
          candidate_number: '10',
          candidate_name: 'ROGÉRIO PINTO DOS SANTOS',
          social_name: 'ROGÉRIO SANTOS',
          cpf: '***.123.678-**',
          position: 'Prefeito',
          party: 'REPUBLICANOS',
          coalition: 'REPUBLICANOS / PP / PODE / UNIÃO / PRD / MOBILIZA / SOLIDARIEDADE / NOVO',
          status: 'Deferido',
          occupation: 'Odontólogo',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '55 a 59 anos',
          is_reelection: true,
          campaign_id: null,
        },
        {
          tse_id: '250002001948',
          election_year: '2024',
          uf: 'SP',
          city_code: '3549904',
          city_name: 'SÃO JOSÉ DOS CAMPOS',
          candidate_number: '55',
          candidate_name: 'ANDERSON FARIAS FERREIRA',
          social_name: 'ANDERSON FARIAS',
          cpf: '***.892.118-**',
          position: 'Prefeito',
          party: 'PSD',
          coalition: 'PSD / PP / REPUBLICANOS / MDB / PRD / PODE',
          status: 'Deferido',
          occupation: 'Administrador',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '45 a 49 anos',
          is_reelection: true,
          campaign_id: null,
        },
        {
          tse_id: '250002023190',
          election_year: '2024',
          uf: 'SP',
          city_code: '3547809',
          city_name: 'SANTO ANDRÉ',
          candidate_number: '45',
          candidate_name: 'GILVAN FERREIRA DE SOUZA',
          social_name: 'GILVAN JÚNIOR',
          cpf: '***.234.568-**',
          position: 'Prefeito',
          party: 'PSDB',
          coalition: 'FEDERAÇÃO PSDB CIDADANIA / REPUBLICANOS / MDB / PODE / AVANTE / PRD',
          status: 'Deferido',
          occupation: 'Administrador',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '30 a 34 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002038741',
          election_year: '2024',
          uf: 'SP',
          city_code: '3547809',
          city_name: 'SANTO ANDRÉ',
          candidate_number: '13',
          candidate_name: 'EDSON ROBERTO ALVES DA SILVA',
          social_name: 'BETO ALVES',
          cpf: '***.991.128-**',
          position: 'Vereador',
          party: 'PT',
          coalition: 'FEDERAÇÃO BRASIL DA ESPERANÇA',
          status: 'Indeferido',
          occupation: 'Comerciário',
          gender: 'MASCULINO',
          education: 'ENSINO MÉDIO COMPLETO',
          marital_status: 'SOLTEIRO(A)',
          age_range: '40 a 44 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002062310',
          election_year: '2024',
          uf: 'SP',
          city_code: '3548708',
          city_name: 'SÃO BERNARDO DO CAMPO',
          candidate_number: '23',
          candidate_name: 'MARCELO DE LIMA OLIVEIRA',
          social_name: 'MARCELO LIMA',
          cpf: '***.451.988-**',
          position: 'Prefeito',
          party: 'PODE',
          coalition: 'PODE / PMB / AGIR / AVANTE / PRD',
          status: 'Deferido',
          occupation: 'Empresário',
          gender: 'MASCULINO',
          education: 'SUPERIOR INCOMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '40 a 44 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002095111',
          election_year: '2024',
          uf: 'SP',
          city_code: '3543402',
          city_name: 'RIBEIRÃO PRETO',
          candidate_number: '44',
          candidate_name: 'RICARDO SILVA',
          social_name: 'RICARDO SILVA',
          cpf: '***.901.238-**',
          position: 'Prefeito',
          party: 'PSD',
          coalition: 'PSD / MDB / REPUBLICANOS / PP / PSB / SOLIDARIEDADE / PDT / AVANTE',
          status: 'Deferido',
          occupation: 'Advogado',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '35 a 39 anos',
          is_reelection: false,
          campaign_id: null,
        },
        {
          tse_id: '250002106390',
          election_year: '2024',
          uf: 'SP',
          city_code: '3552205',
          city_name: 'SOROCABA',
          candidate_number: '10',
          candidate_name: 'RODRIGO MANGA',
          social_name: 'RODRIGO MAGANHATO',
          cpf: '***.678.918-**',
          position: 'Prefeito',
          party: 'REPUBLICANOS',
          coalition: 'REPUBLICANOS / PSD / MDB / PP / PL / PODE / UNIÃO / PRTB / MOBILIZA / AGIR',
          status: 'Deferido',
          occupation: 'Missionário',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '40 a 44 anos',
          is_reelection: true,
          campaign_id: null,
        },
        {
          tse_id: '250002117822',
          election_year: '2024',
          uf: 'SP',
          city_code: '3550308',
          city_name: 'SÃO PAULO',
          candidate_number: '16',
          candidate_name: 'ALTINO PRAZERES JUNIOR',
          social_name: 'ALTINO',
          cpf: '***.412.558-**',
          position: 'Prefeito',
          party: 'PSTU',
          coalition: 'PARTIDO ISOLADO',
          status: 'Renúncia',
          occupation: 'Metroviário',
          gender: 'MASCULINO',
          education: 'SUPERIOR COMPLETO',
          marital_status: 'CASADO(A)',
          age_range: '55 a 59 anos',
          is_reelection: false,
          campaign_id: null,
        },
      ]

      for (let i = 0; i < seedCandidates.length; i++) {
        const cand = seedCandidates[i]
        try {
          app.findFirstRecordByData('candidates', 'tse_id', cand.tse_id)
        } catch (_) {
          const r = new Record(candidatesTargetCol)
          Object.keys(cand).forEach((k) => {
            if (cand[k] !== undefined && cand[k] !== null) {
              r.set(k, cand[k])
            }
          })
          app.save(r)
        }
      }
    } catch (err) {
      console.log('Candidates seed error:', err)
    }

    // 7. Resilient Seed for scheduled_posts
    if (defaultCampId) {
      try {
        const postsCol = app.findCollectionByNameOrId('scheduled_posts')
        const samplePosts = [
          {
            campaign_id: defaultCampId,
            title: 'Lançamento do Plano de Mobilidade Urbana',
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
            platform: 'instagram',
            media_type: 'carousel',
            caption:
              'Mais corredores de ônibus e tarifa zero nos fins de semana! Conheça as propostas para o trânsito da nossa capital.',
            media_url: 'https://img.usecurling.com/p/800/800?q=transit&color=amber',
            target_audience: 'Eleitores 25-45 anos, Zona Leste e Sul',
            objective: 'engagement',
            status: 'scheduled',
            impressions: 0,
            clicks: 0,
            shares: 0,
            comments: 0,
          },
          {
            campaign_id: defaultCampId,
            title: 'Vídeo Manifesto: Saúde nos Bairros',
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            platform: 'youtube',
            media_type: 'video',
            caption:
              'Nossa prioridade absoluta é zerar as filas do SUS nos postos de saúde de São Paulo.',
            media_url: 'https://img.usecurling.com/p/1280/720?q=hospital&color=blue',
            target_audience: 'Famílias, idosos e profissionais da saúde',
            objective: 'awareness',
            status: 'scheduled',
            impressions: 0,
            clicks: 0,
            shares: 0,
            comments: 0,
          },
          {
            campaign_id: defaultCampId,
            title: 'Card WhatsApp: Chamada para o Comício de Sábado',
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
            platform: 'whatsapp',
            media_type: 'image',
            caption: 'Venha conversar com a gente neste sábado às 10h na Praça da Sé!',
            media_url: 'https://img.usecurling.com/p/800/800?q=rally&color=amber',
            target_audience: 'Lideranças comunitárias e voluntários',
            objective: 'mobilization',
            status: 'scheduled',
            impressions: 0,
            clicks: 0,
            shares: 0,
            comments: 0,
          },
          {
            campaign_id: defaultCampId,
            title: 'Post Passado: Balanço da Caminhada em Santo Amaro',
            scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            platform: 'instagram',
            media_type: 'reels',
            caption: 'Energia surreal hoje em Santo Amaro! Obrigado pelo carinho de todos.',
            media_url: 'https://img.usecurling.com/p/800/1000?q=crowd&color=emerald',
            target_audience: 'Eleitores Zona Sul',
            objective: 'engagement',
            status: 'published',
            published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            impressions: 48500,
            clicks: 3420,
            shares: 980,
            comments: 412,
          },
        ]

        samplePosts.forEach((post) => {
          try {
            app.findFirstRecordByData('scheduled_posts', 'title', post.title)
          } catch (_) {
            const r = new Record(postsCol)
            Object.keys(post).forEach((k) => {
              if (post[k] !== undefined && post[k] !== null) r.set(k, post[k])
            })
            app.save(r)
          }
        })
      } catch (err) {
        console.log('Posts seed error:', err)
      }

      // 8. Resilient Seed for ad_campaigns
      try {
        const adCol = app.findCollectionByNameOrId('ad_campaigns')
        const sampleAds = [
          {
            campaign_id: defaultCampId,
            platform: 'meta_ads',
            external_id: 'act_982341029',
            name: 'Meta - Impulsionamento Vídeo Propostas Saúde',
            budget: 5000,
            spent: 3450.5,
            impressions: 128400,
            clicks: 6820,
            ctr: 5.31,
            cpc: 0.51,
            conversions: 840,
            cost_per_conversion: 4.11,
            status: 'active',
            start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(),
            notes: 'Excelente performance no público 35-55 anos Zona Leste.',
          },
          {
            campaign_id: defaultCampId,
            platform: 'google_ads',
            external_id: 'goog_5548123',
            name: 'Google Search - Palavras-chave Eleição SP 2024',
            budget: 4000,
            spent: 2890,
            impressions: 45200,
            clicks: 4120,
            ctr: 9.12,
            cpc: 0.7,
            conversions: 620,
            cost_per_conversion: 4.66,
            status: 'active',
            start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
            notes: 'Palavras "propostas prefeitura SP" e "plano de governo" com alto CTR.',
          },
          {
            campaign_id: defaultCampId,
            platform: 'tiktok_ads',
            external_id: 'tt_1029384',
            name: 'TikTok - Juventude & Primeiro Voto',
            budget: 2500,
            spent: 1800,
            impressions: 95400,
            clicks: 3900,
            ctr: 4.09,
            cpc: 0.46,
            conversions: 310,
            cost_per_conversion: 5.81,
            status: 'active',
            start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 23).toISOString(),
            notes: 'Vídeos curtos de bastidores têm maior engajamento.',
          },
        ]

        sampleAds.forEach((ad) => {
          try {
            app.findFirstRecordByData('ad_campaigns', 'name', ad.name)
          } catch (_) {
            const r = new Record(adCol)
            Object.keys(ad).forEach((k) => {
              if (ad[k] !== undefined && ad[k] !== null) r.set(k, ad[k])
            })
            app.save(r)
          }
        })
      } catch (err) {
        console.log('Ad campaigns seed error:', err)
      }

      // 9. Resilient Seed for utm_visits
      try {
        const utmCol = app.findCollectionByNameOrId('utm_visits')
        const sampleVisits = [
          {
            campaign_id: defaultCampId,
            utm_source: 'instagram',
            utm_medium: 'social',
            utm_campaign: 'lancamento-junho-2026',
            utm_content: 'video-saude',
            utm_term: 'prefeito-sp',
            landing_page: '/dashboard',
            visitor_id: 'vis_101',
            ip_hash: 'hash_sp_01',
            user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
            referrer: 'https://l.instagram.com/',
            converted: true,
            conversion_type: 'volunteer',
          },
          {
            campaign_id: defaultCampId,
            utm_source: 'facebook',
            utm_medium: 'cpc',
            utm_campaign: 'lancamento-junho-2026',
            utm_content: 'card-mobilidade',
            utm_term: 'eleicoes2024',
            landing_page: '/dashboard',
            visitor_id: 'vis_102',
            ip_hash: 'hash_sp_02',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            referrer: 'https://m.facebook.com/',
            converted: true,
            conversion_type: 'signup',
          },
          {
            campaign_id: defaultCampId,
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'busca-propostas',
            utm_content: 'ad_link_1',
            utm_term: 'propostas-prefeito',
            landing_page: '/analysis',
            visitor_id: 'vis_103',
            ip_hash: 'hash_sp_03',
            user_agent: 'Mozilla/5.0 (Android 14; Mobile)',
            referrer: 'https://www.google.com/',
            converted: false,
            conversion_type: '',
          },
          {
            campaign_id: defaultCampId,
            utm_source: 'whatsapp',
            utm_medium: 'referral',
            utm_campaign: 'disparo-liderancas',
            utm_content: 'comicio-se',
            utm_term: '',
            landing_page: '/support-points',
            visitor_id: 'vis_104',
            ip_hash: 'hash_sp_04',
            user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1)',
            referrer: 'android-app://com.whatsapp',
            converted: true,
            conversion_type: 'event_rsvp',
          },
          {
            campaign_id: defaultCampId,
            utm_source: 'tiktok',
            utm_medium: 'social',
            utm_campaign: 'juventude-2024',
            utm_content: 'corte-podcast',
            utm_term: '',
            landing_page: '/dashboard',
            visitor_id: 'vis_105',
            ip_hash: 'hash_sp_05',
            user_agent: 'Mozilla/5.0 (Linux; Android 13)',
            referrer: 'https://www.tiktok.com/',
            converted: false,
            conversion_type: '',
          },
        ]

        sampleVisits.forEach((visit) => {
          try {
            app.findFirstRecordByData('utm_visits', 'visitor_id', visit.visitor_id)
          } catch (_) {
            const r = new Record(utmCol)
            Object.keys(visit).forEach((k) => {
              if (visit[k] !== undefined && visit[k] !== null) r.set(k, visit[k])
            })
            app.save(r)
          }
        })
      } catch (err) {
        console.log('UTM visits seed error:', err)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('ad_campaigns'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('utm_visits'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('scheduled_posts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('candidates'))
    } catch (_) {}
  },
)
