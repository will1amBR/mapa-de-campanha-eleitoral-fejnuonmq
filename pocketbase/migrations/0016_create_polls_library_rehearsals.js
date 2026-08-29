migrate(
  (app) => {
    const campaignsCol = app.findCollectionByNameOrId('campaigns')
    const campaignsId = campaignsCol.id

    // 1. polls collection (Pesquisas Eleitorais)
    let pollsCol
    try {
      pollsCol = app.findCollectionByNameOrId('polls')
    } catch (_) {
      pollsCol = new Collection({
        name: 'polls',
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
            collectionId: campaignsId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'institute', type: 'text', required: true }, // Datafolha, Quaest, Ipec, Paraná Pesquisas, AtlasIntel, Real Time Big Data, etc.
          { name: 'poll_date', type: 'date', required: true },
          {
            name: 'scenario',
            type: 'select',
            required: true,
            values: ['estimulada_1t', 'espontanea_1t', 'segundo_turno', 'rejeicao'],
            maxSelect: 1,
          },
          { name: 'our_candidate_percentage', type: 'number', min: 0, max: 100 },
          { name: 'adversaries_results', type: 'json' }, // Array of { adversary_name: string, percentage: number, party?: string }
          { name: 'margin_of_error', type: 'number', min: 0, max: 20 }, // ex: 2.5
          { name: 'sample_size', type: 'number', min: 0 }, // ex: 1600 entrevistas
          { name: 'candidate_rank', type: 'number', min: 1, max: 50 }, // 1º, 2º, 3º lugar
          { name: 'tse_registration', type: 'text' }, // ex: SP-01234/2024
          { name: 'analysis_notes', type: 'text' }, // "O que pode mudar", insights qualitativos
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_polls_camp ON polls (campaign_id)',
          'CREATE INDEX idx_polls_date ON polls (poll_date)',
          'CREATE INDEX idx_polls_scenario ON polls (scenario)',
        ],
      })
      app.save(pollsCol)
    }

    // 2. debate_qa_library collection (Biblioteca de Perguntas por Tema)
    let libraryCol
    try {
      libraryCol = app.findCollectionByNameOrId('debate_qa_library')
    } catch (_) {
      libraryCol = new Collection({
        name: 'debate_qa_library',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'topic',
            type: 'select',
            required: true,
            values: [
              'economia',
              'saude',
              'seguranca',
              'educacao',
              'transporte',
              'habitacao',
              'meio_ambiente',
              'corrupcao',
              'zeladoria',
              'social',
              'administracao',
              'geral',
            ],
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'question', type: 'text', required: true },
          { name: 'suggested_answer', type: 'text' },
          { name: 'suggested_counter_attack', type: 'text' },
          { name: 'key_data_points', type: 'text' },
          {
            name: 'difficulty',
            type: 'select',
            values: ['facil', 'medio', 'dificil', 'casca_de_banana'],
            maxSelect: 1,
          },
          { name: 'time_limit_seconds', type: 'number', min: 15, max: 300 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_debate_lib_topic ON debate_qa_library (topic)'],
      })
      app.save(libraryCol)
    }

    // 3. debate_rehearsals collection (Modo Ensaio com gravação/registro)
    let rehearsalsCol
    try {
      rehearsalsCol = app.findCollectionByNameOrId('debate_rehearsals')
    } catch (_) {
      rehearsalsCol = new Collection({
        name: 'debate_rehearsals',
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
            collectionId: campaignsId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'overall_score', type: 'number', min: 0, max: 10 }, // Nota final (0 a 10)
          { name: 'questions_count', type: 'number', min: 0 },
          { name: 'total_duration_seconds', type: 'number', min: 0 },
          { name: 'time_discipline_score', type: 'number', min: 0, max: 10 },
          { name: 'data_usage_score', type: 'number', min: 0, max: 10 },
          { name: 'rehearsal_details', type: 'json' }, // Array of { qa_id?, question: string, topic: string, time_spent_seconds: number, time_limit_seconds: number, cited_data: boolean, self_rating: 'otimo' | 'bom' | 'regular' | 'fraco', feedback?: string }
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_debate_reh_camp ON debate_rehearsals (campaign_id)',
          'CREATE INDEX idx_debate_reh_score ON debate_rehearsals (overall_score)',
        ],
      })
      app.save(rehearsalsCol)
    }

    // 4. Seed initial realistic data for default campaign
    let defaultCamp = null
    try {
      defaultCamp = app.findFirstRecordByData('campaigns', 'party', 'PSD - 55')
    } catch (_) {
      try {
        const records = app.findRecordsByFilter('campaigns', '', '-created', 1, 0)
        if (records && records.length > 0) defaultCamp = records[0]
      } catch (_) {}
    }

    if (!defaultCamp) return
    const campId = defaultCamp.id

    // Seed Polls
    const now = new Date()
    const seedPolls = [
      {
        campaign_id: campId,
        institute: 'Datafolha',
        poll_date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 35).toISOString(),
        scenario: 'estimulada_1t',
        our_candidate_percentage: 24.5,
        adversaries_results: [
          { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 29.0 },
          { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 26.0 },
          { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 11.0 },
          { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 7.0 },
          { adversary_name: 'Brancos/Nulos', party: 'OUTROS', percentage: 2.5 },
        ],
        margin_of_error: 3.0,
        sample_size: 1090,
        candidate_rank: 3,
        tse_registration: 'SP-04891/2024',
        analysis_notes:
          'Campanha em fase inicial. Boa penetração na classe média, mas baixa lembrança espontânea nos bairros periféricos da Zona Sul.',
      },
      {
        campaign_id: campId,
        institute: 'Quaest',
        poll_date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 21).toISOString(),
        scenario: 'estimulada_1t',
        our_candidate_percentage: 27.0,
        adversaries_results: [
          { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 28.0 },
          { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 25.5 },
          { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 14.0 },
          { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 5.5 },
        ],
        margin_of_error: 2.5,
        sample_size: 1400,
        candidate_rank: 2,
        tse_registration: 'SP-06320/2024',
        analysis_notes:
          'Crescimento consistente de 2,5 p.p. pós início das inserções de rádio e propostas para transporte público. Empate técnico triplo na liderança.',
      },
      {
        campaign_id: campId,
        institute: 'Paraná Pesquisas',
        poll_date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        scenario: 'estimulada_1t',
        our_candidate_percentage: 29.5,
        adversaries_results: [
          { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 27.0 },
          { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 26.5 },
          { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 12.0 },
          { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 5.0 },
        ],
        margin_of_error: 2.6,
        sample_size: 1500,
        candidate_rank: 1,
        tse_registration: 'SP-07812/2024',
        analysis_notes:
          'Primeira liderança numérica consolidada. Rejeição caiu para 18%, o menor patamar entre os 4 primeiros colocados.',
      },
      {
        campaign_id: campId,
        institute: 'Datafolha',
        poll_date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        scenario: 'estimulada_1t',
        our_candidate_percentage: 31.0,
        adversaries_results: [
          { adversary_name: 'Ricardo Nunes', party: 'MDB', percentage: 27.5 },
          { adversary_name: 'Guilherme Boulos', party: 'PSOL', percentage: 25.0 },
          { adversary_name: 'Pablo Marçal', party: 'PRTB', percentage: 11.5 },
          { adversary_name: 'Tabata Amaral', party: 'PSB', percentage: 5.0 },
        ],
        margin_of_error: 2.0,
        sample_size: 1800,
        candidate_rank: 1,
        tse_registration: 'SP-09140/2024',
        analysis_notes:
          'Subiu 1,5 p.p. e abriu vantagem fora da margem de erro. Atenção: eleitorado evangélico e comerciantes da Zona Leste migraram positivamente após sabatina.',
      },
    ]

    for (const poll of seedPolls) {
      try {
        app.findFirstRecordByData('polls', 'tse_registration', poll.tse_registration)
      } catch (_) {
        const r = new Record(pollsCol)
        Object.keys(poll).forEach((k) => r.set(k, poll[k]))
        app.save(r)
      }
    }

    // Seed QA Library (Perguntas organizadas por área temática)
    const seedLibrary = [
      {
        topic: 'economia',
        title: 'Atração de Investimentos e Redução do ISS',
        question:
          'Com o término das desonerações e a reforma tributária, como o município manterá a arrecadação sem aumentar tributos sobre pequenas e médias empresas?',
        suggested_answer:
          'Apostar na digitalização e desburocratização de alvarás, manutenção da alíquota competitiva de ISS no setor de tecnologia e fomento ao polo de inovação na Zona Leste com incentivo fiscal amparado por lei.',
        suggested_counter_attack:
          'Cobrar dos adversários se eles planejam aumentar o IPTU progressivo como consta em planos de governo anteriores.',
        key_data_points:
          'SP arrecadou R$ 28 bi de ISS em 2023; microempresas representam 65% dos novos empregos gerados.',
        difficulty: 'medio',
        time_limit_seconds: 60,
      },
      {
        topic: 'saude',
        title: 'Fila do SUS e Tempo de Espera por Especialistas',
        question:
          'A demora para consultas com cardiologistas, neuropediatras e oftalmologistas passa de 180 dias. Qual a meta real e viável para zerar a fila nos primeiros 100 dias?',
        suggested_answer:
          'Implementar a Telemedicina Especializada Integrada nas UBSs em até 48 horas para triagem e contratação emergencial de horas ociosas em hospitais universitários e filantrópicos.',
        suggested_counter_attack:
          'Denunciar que o orçamento de saúde atual perdeu R$ 400 mi em verba não executada por pura ineficiência de gestão.',
        key_data_points:
          'Fila tem 640 mil pacientes ativos; custo unitário da teleconsulta é 60% menor que deslocamento presencial.',
        difficulty: 'casca_de_banana',
        time_limit_seconds: 90,
      },
      {
        topic: 'seguranca',
        title: 'Armamento da Guarda Civil Metropolitana e Cracolândia',
        question:
          'Qual o papel exato da GCM no combate ao crime organizado no Centro e qual sua posição sobre internação involuntária de dependentes químicos?',
        suggested_answer:
          'GCM deve atuar com inteligência, patrulhamento comunitário e videomonitoramento com reconhecimento facial. Na questão da dependência química, tratamento humanizado com internação médica conforme a Lei Federal 13.840, com acolhimento e reinserção social.',
        suggested_counter_attack:
          'Evitar discursos simplistas de quem promete resolver a Cracolândia em 30 dias com força bruta sem apresentar plano de saúde mental.',
        key_data_points:
          'Efetivo da GCM: 7.200 agentes; programa Smart Sampa com 20 mil câmeras integradas.',
        difficulty: 'dificil',
        time_limit_seconds: 90,
      },
      {
        topic: 'educacao',
        title: 'Vagas em Creches e Ensino Integral',
        question:
          'Apesar do convênio com creches privadas, a qualidade pedagógica varia muito entre regiões periféricas e áreas nobres. Como equalizar o padrão pedagógico?',
        suggested_answer:
          'Auditoria contínua da qualidade pedagógica nas conveniadas, piso salarial garantido para as educadoras parceiras e implantação da plataforma curricular unificada com alimentação balanceada com nutricionista.',
        suggested_counter_attack:
          'Destacar que universalizar vagas sem garantia de merenda nutritiva e segurança nas instalações é mascarar estatísticas.',
        key_data_points:
          'Mais de 350 mil crianças na educação infantil; 82% das creches são conveniadas.',
        difficulty: 'medio',
        time_limit_seconds: 60,
      },
      {
        topic: 'transporte',
        title: 'Tarifa Zero vs Subsídio aos Ônibus',
        question:
          'O subsídio aos ônibus ultrapassou R$ 5 bilhões ao ano. O senhor apoia a Tarifa Zero integral ou isso comprometeria os investimentos em saúde e educação?',
        suggested_answer:
          'Defendemos tarifa zero progressiva e responsável (já adotada aos domingos), mas sem aventura fiscal: a prioridade imediata é a renovação da frota por ônibus elétricos, ar-condicionado e cumprimento rigoroso das partidas programadas.',
        suggested_counter_attack:
          'Perguntar ao adversário que promete tarifa zero diária de qual área ele vai cortar os R$ 10 bilhões necessários.',
        key_data_points:
          'Frota atual: 13.500 coletivos; 7,2 milhões de passageiros transportados por dia útil.',
        difficulty: 'casca_de_banana',
        time_limit_seconds: 90,
      },
      {
        topic: 'habitacao',
        title: 'Retrofit no Centro e Favelização',
        question:
          'Existem milhares de prédios abandonados com dívidas milionárias de IPTU no Centro. Como agir sem desrespeitar os proprietários nem despejar famílias vulneráveis?',
        suggested_answer:
          'Aplicação imediata do IPTU Progressivo no Tempo, desapropriação por interesse social dos imóveis com débitos superiores ao valor venal e parceria com a iniciativa privada para locação social e moradia popular.',
        suggested_counter_attack:
          'Ressaltar que deixar prédios abandonados servindo de cortiço degradado e tráfico é omissão da administração municipal.',
        key_data_points:
          '380 mil famílias no déficit habitacional; mais de 1.400 imóveis notificados por abandono no centro expandido.',
        difficulty: 'dificil',
        time_limit_seconds: 90,
      },
      {
        topic: 'meio_ambiente',
        title: 'Enchentes e Mudanças Climáticas',
        question:
          'A cidade sofre a cada verão com alagamentos crônicos e queda de árvores na rede elétrica. O que será feito antes do próximo período de chuvas?',
        suggested_answer:
          'Plano de desassoreamento preventivo dos piscinões em maio e junho (não na véspera das chuvas), contratação de equipes extras de podas e enterramento prioritário de fiação nos corredores estratégicos.',
        suggested_counter_attack:
          'Cobrar a fiscalização frouxa sobre a concessionária de energia que demora mais de 72 horas para restabelecer energia nos hospitais.',
        key_data_points:
          'SP tem 63 piscinões; média de 4.000 árvores caem anualmente durante tempestades.',
        difficulty: 'facil',
        time_limit_seconds: 60,
      },
      {
        topic: 'corrupcao',
        title: 'Contratos Emergenciais e Transparência',
        question:
          'Contratos sem licitação e aditivos em obras públicas sempre geram suspeitas. Qual o mecanismo de controle e auditoria que sua gestão irá impor?',
        suggested_answer:
          'Criação da Controladoria Municipal com auditoria independente, publicação de todos os contratos em blockchain no Portal da Transparência em até 24h e transmissão ao vivo de todas as sessões de licitação.',
        suggested_counter_attack:
          'Lembrar que o candidato adversário possui secretários investigados pelo Ministério Público por cartel de asfalto.',
        key_data_points:
          'Contratos emergenciais somaram mais de R$ 2,5 bilhões na última legislatura.',
        difficulty: 'dificil',
        time_limit_seconds: 60,
      },
    ]

    for (const lib of seedLibrary) {
      try {
        app.findFirstRecordByData('debate_qa_library', 'title', lib.title)
      } catch (_) {
        const r = new Record(libraryCol)
        Object.keys(lib).forEach((k) => r.set(k, lib[k]))
        app.save(r)
      }
    }

    // Seed Rehearsal sample
    try {
      app.findFirstRecordByData(
        'debate_rehearsals',
        'title',
        'Simulado Oficial 01 - Sabatina Econômica',
      )
    } catch (_) {
      const reh = new Record(rehearsalsCol)
      reh.set('campaign_id', campId)
      reh.set('title', 'Simulado Oficial 01 - Sabatina Econômica')
      reh.set('overall_score', 8.8)
      reh.set('questions_count', 4)
      reh.set('total_duration_seconds', 320)
      reh.set('time_discipline_score', 9.0)
      reh.set('data_usage_score', 8.5)
      reh.set('rehearsal_details', [
        {
          question: 'Como manter a arrecadação sem aumentar tributos sobre PMEs?',
          topic: 'economia',
          time_spent_seconds: 56,
          time_limit_seconds: 60,
          cited_data: true,
          self_rating: 'otimo',
          feedback: 'Excelente domínio de tempo e citação exata dos dados do ISS.',
        },
        {
          question: 'Demora na fila do SUS para exames de alta complexidade.',
          topic: 'saude',
          time_spent_seconds: 88,
          time_limit_seconds: 90,
          cited_data: true,
          self_rating: 'bom',
          feedback: 'Argumento sólido; pode ser mais enfático no anúncio da telemedicina 48h.',
        },
      ])
      reh.set('notes', 'Ensaio muito produtivo. Postura corporal firme e tom equilibrado.')
      app.save(reh)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('debate_rehearsals'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('debate_qa_library'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('polls'))
    } catch (_) {}
  },
)
