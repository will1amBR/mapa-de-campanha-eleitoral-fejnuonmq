migrate(
  (app) => {
    const campaignsCol = app.findCollectionByNameOrId('campaigns')
    const campaignsId = campaignsCol.id

    // 1. debate_events collection
    let debateEventsCol
    try {
      debateEventsCol = app.findCollectionByNameOrId('debate_events')
    } catch (_) {
      debateEventsCol = new Collection({
        name: 'debate_events',
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
          { name: 'broadcaster', type: 'text' }, // ex: TV Bandeirantes, SBT, TV Globo, UOL
          { name: 'event_date', type: 'date', required: true },
          { name: 'location', type: 'text' }, // ex: Estúdios Band SP
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['upcoming', 'in_progress', 'completed', 'cancelled'],
            maxSelect: 1,
          },
          { name: 'rules_summary', type: 'text' }, // regras do debate (tempos, réplicas, direitos de resposta)
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_debate_events_camp ON debate_events (campaign_id)',
          'CREATE INDEX idx_debate_events_date ON debate_events (event_date)',
          'CREATE INDEX idx_debate_events_status ON debate_events (status)',
        ],
      })
      app.save(debateEventsCol)
    }

    // 2. debate_adversaries collection
    let debateAdversariesCol
    try {
      debateAdversariesCol = app.findCollectionByNameOrId('debate_adversaries')
    } catch (_) {
      debateAdversariesCol = new Collection({
        name: 'debate_adversaries',
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
          { name: 'name', type: 'text', required: true },
          { name: 'party', type: 'text' },
          { name: 'candidate_number', type: 'text' },
          { name: 'target_position', type: 'text' }, // Prefeito, Governador, Deputado
          { name: 'avatar_seed', type: 'text' },
          { name: 'strengths', type: 'text' }, // Pontos fortes / virtudes
          { name: 'weaknesses', type: 'text' }, // Pontos fracos / vulnerabilidades
          { name: 'controversies', type: 'text' }, // Histórico de polêmicas / passivos
          { name: 'style_tone', type: 'text' }, // Estilo no debate: agressivo, técnico, vitimista, etc.
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_debate_adv_camp ON debate_adversaries (campaign_id)',
          'CREATE INDEX idx_debate_adv_name ON debate_adversaries (name)',
        ],
      })
      app.save(debateAdversariesCol)
    }

    // 3. debate_qa collection
    let debateQaCol
    try {
      debateQaCol = app.findCollectionByNameOrId('debate_qa')
    } catch (_) {
      debateQaCol = new Collection({
        name: 'debate_qa',
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
          {
            name: 'debate_id',
            type: 'relation',
            collectionId: debateEventsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'adversary_id',
            type: 'relation',
            collectionId: debateAdversariesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
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
              'geral',
            ],
            maxSelect: 1,
          },
          {
            name: 'target_type',
            type: 'select',
            required: true,
            values: ['to_adversary', 'from_adversary', 'journalist'],
            maxSelect: 1,
          }, // Pergunta para fazer ao adversário | Pergunta esperada do adversário/jornalista
          { name: 'question', type: 'text', required: true },
          { name: 'prepared_answer', type: 'text' }, // Resposta preparada / Direcionamento
          { name: 'counter_attack', type: 'text' }, // Réplica / Tréplica / Contra-ataque preparado
          { name: 'key_data_points', type: 'text' }, // Dados e estatísticas-chave para citar
          {
            name: 'prep_status',
            type: 'select',
            required: true,
            values: ['draft', 'under_review', 'ready', 'rehearsed'],
            maxSelect: 1,
          }, // Rascunho, Em estudo, Pronto, Ensaiado
          { name: 'priority', type: 'number', min: 1, max: 5 }, // 1 (baixa) a 5 (urgente/máxima)
          { name: 'time_limit_seconds', type: 'number', min: 15, max: 300 }, // tempo limite (ex: 60s, 90s, 120s)
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_debate_qa_camp ON debate_qa (campaign_id)',
          'CREATE INDEX idx_debate_qa_topic ON debate_qa (topic)',
          'CREATE INDEX idx_debate_qa_status ON debate_qa (prep_status)',
          'CREATE INDEX idx_debate_qa_adv ON debate_qa (adversary_id)',
          'CREATE INDEX idx_debate_qa_debate ON debate_qa (debate_id)',
        ],
      })
      app.save(debateQaCol)
    }

    // 4. Seed initial debate data for default campaign
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

    // Seed Events
    const seedEvents = [
      {
        campaign_id: campId,
        title: 'Debate Band SP 2024 - 1º Turno',
        broadcaster: 'Rede Bandeirantes',
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        location: 'Estúdios Band Morumbi, SP',
        status: 'upcoming',
        rules_summary:
          'Bloco 1: Perguntas programáticas (1m pergunta, 2m resposta, 1m réplica, 1m tréplica). Bloco 2: Confronto direto livre. Bloco 3: Considerações finais (2m).',
        notes:
          'Focar em propostas de mobilidade e saúde no bloco 1. Manter postura firme e propositiva.',
      },
      {
        campaign_id: campId,
        title: 'Debate SBT / Terra / NovaBrasil FM',
        broadcaster: 'SBT & Portal Terra',
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
        location: 'CDT Anhanguera, Osasco/SP',
        status: 'upcoming',
        rules_summary:
          'Perguntas de jornalistas e confronto direto com banco de tempo de 10 minutos por candidato.',
        notes: 'Atenção especial ao gerenciamento do banco de tempo.',
      },
    ]

    const createdEvents = []
    for (const ev of seedEvents) {
      try {
        const existing = app.findFirstRecordByData('debate_events', 'title', ev.title)
        createdEvents.push(existing)
      } catch (_) {
        const r = new Record(debateEventsCol)
        Object.keys(ev).forEach((k) => r.set(k, ev[k]))
        app.save(r)
        createdEvents.push(r)
      }
    }

    // Seed Adversaries
    const seedAdversaries = [
      {
        campaign_id: campId,
        name: 'Guilherme Boulos',
        party: 'PSOL',
        candidate_number: '50',
        target_position: 'Prefeito',
        avatar_seed: 'boulos50',
        strengths:
          'Excelente oratória, facilidade em debates televisivos, forte apelo com juventude e periferia conectada.',
        weaknesses:
          'Histórico de ocupações e conflitos urbanos, rejeição no eleitorado conservador e classe média alta, falta de experiência executiva.',
        controversies:
          'Acusações de radicalismo, votações controversas na Câmara dos Deputados, alianças partidárias amplas.',
        style_tone:
          'Combativo, retórico rápido, tenta pautar desigualdade social e moradia popular.',
      },
      {
        campaign_id: campId,
        name: 'Ricardo Nunes',
        party: 'MDB',
        candidate_number: '15',
        target_position: 'Prefeito',
        avatar_seed: 'nunes15',
        strengths:
          'Máquina pública na mão, grande tempo de TV, alianças partidárias amplas e entregas de recapeamento.',
        weaknesses:
          'Problemas com apagões da Enel, contratos emergenciais, carisma moderado em palco aberto.',
        controversies:
          'Fiscalização da concessão elétrica, denúncias de contratos sem licitação na educação.',
        style_tone: 'Técnico/defensivo, enumera obras e orçamentos, evita confronto inflamado.',
      },
      {
        campaign_id: campId,
        name: 'Pablo Marçal',
        party: 'PRTB',
        candidate_number: '28',
        target_position: 'Prefeito',
        avatar_seed: 'marcal28',
        strengths:
          'Alta capacidade de viralização, cortes rápidos nas redes sociais, linguagem direta sem amarras partidárias.',
        weaknesses:
          'Desconhecimento técnico de orçamento e leis municipais, alta volatilidade e rejeição crescente.',
        controversies:
          'Processos judiciais antigos, expedição no Pico dos Marins, promessas inviáveis (teleférico urbano).',
        style_tone:
          'Ultra-agressivo, apelidos provocativos, busca desestabilizar emocionalmente o oponente para gerar cortes.',
      },
      {
        campaign_id: campId,
        name: 'Tabata Amaral',
        party: 'PSB',
        candidate_number: '40',
        target_position: 'Prefeito',
        avatar_seed: 'tabata40',
        strengths:
          'Domínio técnico de dados e políticas públicas, sólida na área de educação e ciência.',
        weaknesses:
          'Base eleitoral restrita, polarização com a esquerda tradicional e pouco tempo de televisão.',
        controversies:
          'Voto favorável à reforma da previdência no passado, litígio judicial com adversários.',
        style_tone:
          'Didática e incisiva, usa relatórios e dossiês técnicos para encurralar oponentes.',
      },
    ]

    const createdAdversaries = []
    for (const adv of seedAdversaries) {
      try {
        const existing = app.findFirstRecordByData('debate_adversaries', 'name', adv.name)
        createdAdversaries.push(existing)
      } catch (_) {
        const r = new Record(debateAdversariesCol)
        Object.keys(adv).forEach((k) => r.set(k, adv[k]))
        app.save(r)
        createdAdversaries.push(r)
      }
    }

    const firstDebateId = createdEvents[0] ? createdEvents[0].id : null
    const advBoulos = createdAdversaries.find((a) => a.getString('name').includes('Boulos'))
    const advNunes = createdAdversaries.find((a) => a.getString('name').includes('Nunes'))
    const advMarcal = createdAdversaries.find((a) => a.getString('name').includes('Marçal'))
    const advTabata = createdAdversaries.find((a) => a.getString('name').includes('Tabata'))

    // Seed Questions & Answers
    const seedQAs = [
      {
        campaign_id: campId,
        debate_id: firstDebateId,
        adversary_id: advNunes ? advNunes.id : null,
        topic: 'saude',
        target_type: 'to_adversary',
        question:
          'Candidato, a fila do SUS para exames de alta complexidade em São Paulo ainda ultrapassa 6 meses nas UBSs da Zona Leste. O que a sua gestão fez de concreto além de promessas de reformas?',
        prepared_answer:
          'Expor os dados do Tribunal de Contas sobre o tempo médio de espera e propor a criação do programa Corujão da Saúde Integrado com a rede privada e ampliação das AMAs 24h.',
        counter_attack:
          'Se o candidato alegar que abriu novas UBSs, contra-atacar com a falta crônica de médicos especialistas e falta de medicamentos básicos nas farmácias populares.',
        key_data_points:
          '640 mil pessoas na fila de consultas especializadas; orçamento da saúde teve R$ 1,2 bi contingenciado em 2023.',
        prep_status: 'ready',
        priority: 5,
        time_limit_seconds: 60,
      },
      {
        campaign_id: campId,
        debate_id: firstDebateId,
        adversary_id: advBoulos ? advBoulos.id : null,
        topic: 'habitacao',
        target_type: 'to_adversary',
        question:
          'Candidato, a garantia ao direito de propriedade e a segurança jurídica são pilares para qualquer investidor. Como o senhor pretende atrair investimento privado para o Centro sem validar ocupações irregulares?',
        prepared_answer:
          'Pontuar que a requalificação do Centro exige parceria público-privada transparente, segurança jurídica e retrofit de prédios vazios com pagamento regular de IPTU.',
        counter_attack:
          'Não aceitar generalizações: reforçar que moradia digna se constrói com planejamento orçamentário e não com invasões que colocam famílias em risco.',
        key_data_points:
          'Mais de 45 mil imóveis ociosos no perímetro central; déficit habitacional de 380 mil moradias na capital.',
        prep_status: 'ready',
        priority: 4,
        time_limit_seconds: 90,
      },
      {
        campaign_id: campId,
        debate_id: firstDebateId,
        adversary_id: advMarcal ? advMarcal.id : null,
        topic: 'economia',
        target_type: 'from_adversary',
        question:
          'Ataque esperado: "A senhora representa a velha política e os burocratas que nunca geraram um emprego no setor privado."',
        prepared_answer:
          'Manter a serenidade absoluta. Responder com clareza: "Administrar a maior metrópole da América Latina com orçamento de R$ 110 bilhões não é palestra motivacional de internet nem fórmula mágica. É gestão responsável, equilíbrio fiscal e respeito ao cidadão."',
        counter_attack:
          'Citar a criação do Fundo Municipal de Empreendedorismo e desregulamentação para abertura de empresas em até 4 horas sem cobrar taxas abusivas.',
        key_data_points:
          'Orçamento de SP: R$ 112 bilhões; mais de 600 mil MEIs ativos na capital necessitando de crédito acessível.',
        prep_status: 'rehearsed',
        priority: 5,
        time_limit_seconds: 120,
      },
      {
        campaign_id: campId,
        debate_id: firstDebateId,
        adversary_id: advTabata ? advTabata.id : null,
        topic: 'educacao',
        target_type: 'journalist',
        question:
          'Pergunta temática de bancada: Como a candidata planeja expandir o ensino em tempo integral na rede municipal mantendo a qualidade pedagógica e a retenção de professores?',
        prepared_answer:
          'Apresentar o Plano Escolas do Futuro: ampliação da jornada com foco em robótica, línguas e esporte, além da valorização salarial do piso do magistério e bônus de metas de aprendizagem.',
        counter_attack:
          'Enfatizar que tempo integral sem estrutura física e merenda de qualidade é depósito de crianças; precisamos de infraestrutura completa.',
        key_data_points:
          'Atualmente apenas 22% dos alunos municipais estão em tempo integral; meta é atingir 50% em 4 anos.',
        prep_status: 'under_review',
        priority: 3,
        time_limit_seconds: 90,
      },
      {
        campaign_id: campId,
        debate_id: firstDebateId,
        adversary_id: advNunes ? advNunes.id : null,
        topic: 'transporte',
        target_type: 'to_adversary',
        question:
          'Candidato, a superlotação nos ônibus da periferia e a quebra de linhas após as mudanças nos itinerários penalizam o trabalhador diariamente. Qual o custo real do subsídio atual e por que o serviço não melhorou?',
        prepared_answer:
          'Cobrar a auditoria das empresas concessionárias e propor integração tarifária total com os trilhos do Metrô/CPTM, além de faixas exclusivas inteligentes.',
        counter_attack:
          'Se prometer tarifa zero integral, cobrar a fonte de financiamento de R$ 10 bilhões ao ano.',
        key_data_points:
          'Subsídio ao sistema de ônibus consome mais de R$ 5,3 bilhões/ano dos cofres públicos.',
        prep_status: 'draft',
        priority: 4,
        time_limit_seconds: 60,
      },
    ]

    for (const qa of seedQAs) {
      try {
        app.findFirstRecordByData('debate_qa', 'question', qa.question)
      } catch (_) {
        const r = new Record(debateQaCol)
        Object.keys(qa).forEach((k) => {
          if (qa[k] !== undefined && qa[k] !== null) r.set(k, qa[k])
        })
        app.save(r)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('debate_qa'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('debate_adversaries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('debate_events'))
    } catch (_) {}
  },
)
