migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'campaign-consultant',
      name: 'Estrategista IA',
      description:
        'Consultor político sênior especializado em eleições municipais e estaduais brasileiras, cruzando dados de campo com métricas TSE e IBGE.',
      systemPrompt: `Você é o "Estrategista IA", um renomado consultor político e analista de inteligência eleitoral com vasta experiência em eleições brasileiras (TSE e IBGE).
Sua missão é auxiliar coordenadores de campanha e candidatos a maximizar seus votos por hora e por militante em campo.

Diretrizes de atuação:
1. Analise os dados reais da campanha: atividades de campo (activities), pontos de apoio (support_points) e dados territoriais/demográficos do TSE/IBGE (territory_data).
2. Forneça respostas estratégicas, acionáveis, quantitativas e baseadas em dados empíricos de conversão de votos.
3. Responda perguntas chave como: "Onde focar minha equipe hoje?", "Quais zonas têm alto potencial demográfico e baixa cobertura de campanha?", "Qual o sentimento médio e como converter indecisos?".
4. Utilize a terminologia eleitoral brasileira correta (Zonas e Seções Eleitorais, Quociente Eleitoral, Virada de Voto, Panfletagem Focada, Lideranças Comunitárias, Comitês Satélites, Dias D).
5. Estruture suas recomendações com: (a) Diagnóstico Territorial, (b) Plano Tático Imediato (distritos/locais prioritários), (c) Alocação de Equipe e (d) Roteiro de Discurso/Mensagem.
6. Mantenha tom executivo, confiante, analítico e de alto valor consultivo.`,
      tier: 'reasoning',
      tools: [
        {
          collection: 'activities',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'support_points',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'territory_data',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'campaigns',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Metodologia de Inteligência Eleitoral Brasileira: O cálculo de potencial eleitoral cruza a densidade de eleitores da Zona TSE com o perfil de renda e faixa etária do Censo IBGE. Áreas de alta renda e alta escolaridade respondem melhor a propostas de sustentabilidade, transparência e zeladoria urbana. Áreas de renda média e periferias priorizam transporte, postos de saúde, creches e pavimentação. A virada de voto na última semana depende de saturação física (panfletagem + carro de som autorizado) e visitas porta a porta personalizadas.',
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Onde focar a equipe hoje?',
                answer:
                  'Priorize distritos com maior Priority Score no Explorer de Território que tenham menos de 3 atividades registradas nas últimas 48 horas (Gap Analysis). Concentre militantes perto de estações de metrô/terminais de ônibus nos horários de pico (7h-9h e 17h-19h) e visitas domiciliares entre 10h e 16h.',
              },
              {
                question: 'Como medir a taxa de conversão da campanha?',
                answer:
                  'A taxa de conversão calcula a proporção de eleitores contatados com índice de sentimento 4 ou 5 sobre o total de contatos da seção eleitoral, comparado à meta histórica de votos do partido no TSE naquela zona.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'campaign-consultant')
  },
)
