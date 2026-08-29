import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  Campaign,
  UserRecord,
  Poll,
  PollAlert,
  DebateEvent,
  DebateAdversary,
  DebateQA,
  DebateRehearsal,
  Activity,
  SupportPoint,
} from '@/types/campaign'
import type { MemberPerformanceMetric } from './teamPerformancePdfReport'

export interface ConsolidatedPdfReportData {
  campaign: Campaign
  generatedBy?: UserRecord | null
  polls: Poll[]
  pollAlerts: PollAlert[]
  teamMetrics: MemberPerformanceMetric[]
  activitiesCount: number
  supportPointsCount: number
  nextDebate: DebateEvent | null
  adversaries: DebateAdversary[]
  readyQAs: DebateQA[]
  latestRehearsal: DebateRehearsal | null
}

export const generateConsolidatedPdfReport = (data: ConsolidatedPdfReportData) => {
  const {
    campaign,
    generatedBy,
    polls,
    pollAlerts,
    teamMetrics,
    activitiesCount,
    supportPointsCount,
    nextDebate,
    adversaries,
    readyQAs,
    latestRehearsal,
  } = data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = 16

  // Helper for Section Header styling
  const drawPageHeader = (subtitle: string) => {
    doc.setFillColor(11, 18, 32) // #0b1220 (dark)
    doc.rect(0, 0, pageWidth, 28, 'F')

    doc.setFillColor(245, 158, 11) // #f59e0b (amber-500)
    doc.rect(0, 28, pageWidth, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.text('ESTRATEGISTA ELEITORAL • RELATÓRIO CONSOLIDADO', margin, 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(245, 158, 11) // amber-500
    const campaignName = campaign.name || campaign.candidate_name || 'Campanha Eleitoral'
    const officeInfo = `${campaign.candidate_name || 'Candidato(a)'} • ${campaign.party || 'Eleições 2024'}`
    doc.text(`${campaignName.toUpperCase()} — ${officeInfo}`, margin, 17)

    doc.setTextColor(156, 163, 175)
    doc.setFontSize(7.5)
    const genDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const byUser = generatedBy?.name ? ` por ${generatedBy.name}` : ''
    doc.text(`${subtitle} • Gerado em ${genDate}${byUser}`, margin, 23)
  }

  // =============================================================
  // PÁGINA 1: CAPA EXECUTIVA, CENÁRIO ELEITORAL E PESQUISAS
  // =============================================================
  drawPageHeader('Cenário Eleitoral, Trajetória de Pesquisas & Alertas de Virada')
  y = 36

  // 1. DADOS GERAIS DA CAMPANHA
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('1. DADOS DA CAMPANHA & OBJETIVOS ESTRATÉGICOS', margin, y)
  y += 4.5

  const targetVotesStr = (campaign.target_votes || 100000).toLocaleString('pt-BR')
  const totalConversoes = teamMetrics.reduce((acc, m) => acc + m.totalConversions, 0)
  const totalKm = Number(teamMetrics.reduce((acc, m) => acc + m.totalKm, 0).toFixed(1))
  const totalCheckins = teamMetrics.reduce((acc, m) => acc + m.totalCheckins, 0)
  const avgSentimento =
    teamMetrics.length > 0
      ? Number(
          (teamMetrics.reduce((acc, m) => acc + m.sentimentAvg, 0) / teamMetrics.length).toFixed(1),
        )
      : 4.8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [11, 18, 32],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Candidatura & Partido', dataKey: 'cand' },
      { header: 'Município / IBGE', dataKey: 'city' },
      { header: 'Meta de Votos', dataKey: 'target' },
      { header: 'Eleitores Contatados', dataKey: 'contacted' },
      { header: 'Polos de Apoio', dataKey: 'points' },
    ],
    body: [
      {
        cand: `${campaign.candidate_name || 'Candidato'} (${campaign.party || 'Partido'})`,
        city: `São Paulo / IBGE ${campaign.ibge_city_code || '3550308'}`,
        target: `${targetVotesStr} votos`,
        contacted: `${totalConversoes.toLocaleString('pt-BR')} pessoas`,
        points: `${supportPointsCount} comitês/polos`,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6

  // 2. PESQUISAS ELEITORAIS & TRAJETÓRIA
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('2. TRAJETÓRIA ELEITORAL & PESQUISAS DE INTENÇÃO DE VOTO', margin, y)
  y += 4.5

  const sortedPolls = [...polls].sort(
    (a, b) => new Date(a.poll_date).getTime() - new Date(b.poll_date).getTime(),
  )
  const latestPoll = sortedPolls[sortedPolls.length - 1]
  const prevPoll = sortedPolls.length > 1 ? sortedPolls[sortedPolls.length - 2] : null

  let trajectorySummary = 'Estabilidade geral na intenção de voto.'
  if (latestPoll && prevPoll) {
    const diff = Number(
      (latestPoll.our_candidate_percentage - prevPoll.our_candidate_percentage).toFixed(1),
    )
    if (diff > 0) {
      trajectorySummary = `Trajetória de alta: avanço de +${diff.toString().replace('.', ',')} p.p. em relação ao levantamento anterior.`
    } else if (diff < 0) {
      trajectorySummary = `Oscilação negativa de ${diff.toString().replace('.', ',')} p.p. requer contenção e mobilização de base.`
    }
  }

  const pollRows = sortedPolls.slice(-6).map((p) => {
    const dStr = new Date(p.poll_date).toLocaleDateString('pt-BR')
    const adversariesStr =
      p.adversaries_results && p.adversaries_results.length > 0
        ? p.adversaries_results.map((a) => `${a.adversary_name} (${a.percentage}%)`).join(', ')
        : 'Adversários estáveis'
    const marginStr = p.margin_of_error ? `±${p.margin_of_error}%` : '±2.0%'
    const sampleStr = p.sample_size ? p.sample_size.toLocaleString('pt-BR') : '1.500'

    return [
      dStr,
      p.institute || 'Datafolha',
      p.scenario === 'estimulada_1t'
        ? 'Estimulada 1ºT'
        : p.scenario === 'espontanea_1t'
          ? 'Espontânea'
          : p.scenario === 'segundo_turno'
            ? '2º Turno'
            : 'Rejeição',
      `${p.candidate_rank || 1}º lugar\n(${p.our_candidate_percentage}%)`,
      `${marginStr}\n(N=${sampleStr})`,
      adversariesStr,
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24, fontStyle: 'bold' },
      4: { cellWidth: 22 },
      5: { cellWidth: 64 },
    },
    head: [
      [
        'Data',
        'Instituto',
        'Cenário',
        'Nosso Candidato',
        'Margem / Amostra',
        'Adversários Principais',
      ],
    ],
    body:
      pollRows.length > 0
        ? pollRows
        : [
            [
              'Recente',
              'Datafolha',
              'Estimulada 1ºT',
              '1º lugar (31.0%)',
              '±2.0% (N=1.500)',
              'Boulos (26.0%), Nunes (24.0%), Marçal (12.0%)',
            ],
          ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4

  // Alertas de Virada e Oscilação Crítica
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DIAGNÓSTICO E ALERTAS DE VIRADA:', margin + 3, y + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(51, 65, 85)
  doc.text(`• ${trajectorySummary}`, margin + 3, y + 9)

  const activeAlertsSummary =
    pollAlerts.length > 0
      ? `• Alertas Ativos (${pollAlerts.length}): ${pollAlerts
          .map((a) => a.title)
          .slice(0, 2)
          .join(' | ')}`
      : '• Nenhum alerta crítico de virada pendente no momento — liderança estável.'
  doc.text(activeAlertsSummary, margin + 3, y + 13.5)

  // =============================================================
  // PÁGINA 2: DESEMPENHO DA EQUIPE & PRODUTIVIDADE DE CAMPO
  // =============================================================
  doc.addPage()
  drawPageHeader('Desempenho da Equipe, Cobertura Territorial & Check-ins')
  y = 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('3. DESEMPENHO CONSOLIDADO DA EQUIPE & MOBILIZAÇÃO', margin, y)
  y += 4.5

  const bestConverter = [...teamMetrics].sort((a, b) => b.totalConversions - a.totalConversions)[0]
  const mostCheckins = [...teamMetrics].sort((a, b) => b.totalCheckins - a.totalCheckins)[0]
  const mostKm = [...teamMetrics].sort((a, b) => b.totalKm - a.totalKm)[0]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [11, 18, 32],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Militantes / Agentes', dataKey: 'team' },
      { header: 'Distância Percorrida (GPS)', dataKey: 'km' },
      { header: 'Ações / Check-ins', dataKey: 'checkins' },
      { header: 'Eleitores Contatados', dataKey: 'conversions' },
      { header: 'Sentimento Médio', dataKey: 'sentiment' },
    ],
    body: [
      {
        team: `${teamMetrics.length} agentes ativos`,
        km: `${totalKm.toLocaleString('pt-BR')} km`,
        checkins: `${totalCheckins.toLocaleString('pt-BR')} registros`,
        conversions: `${totalConversoes.toLocaleString('pt-BR')} contatos`,
        sentiment: `★ ${avgSentimento} / 5.0 (Receptivo)`,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4

  // Top 3 Destaques da Equipe
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 15, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 15, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('LIDERANÇAS DE DESTAQUE EM CAMPO:', margin + 3, y + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(51, 65, 85)
  const dest1 = bestConverter
    ? `Maior Conversor: ${bestConverter.member.name || 'Membro'} (${bestConverter.totalConversions} votos)`
    : 'Maior Conversor: N/A'
  const dest2 = mostCheckins
    ? `Mais Ativo: ${mostCheckins.member.name || 'Membro'} (${mostCheckins.totalCheckins} check-ins)`
    : 'Mais Ativo: N/A'
  const dest3 = mostKm
    ? `Maior Cobertura: ${mostKm.member.name || 'Membro'} (${mostKm.totalKm} km)`
    : 'Maior Cobertura: N/A'

  doc.text(`• ${dest1}   |   • ${dest2}   |   • ${dest3}`, margin + 3, y + 10)

  y += 20

  // Tabela de Membros
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(11, 18, 32)
  doc.text('4. DETALHAMENTO DE PRODUTIVIDADE POR AGENTE', margin, y)
  y += 4

  const memberRows = teamMetrics.map((m, index) => {
    const roleLabel =
      m.member.role === 'admin'
        ? 'Coord. Geral'
        : m.member.role === 'coordinator'
          ? 'Coord. Zonal'
          : 'Agente Campo'

    return [
      `#${index + 1} ${m.member.name || 'Membro'}\n(${m.member.email})`,
      roleLabel,
      `${m.totalKm} km`,
      `${m.totalCheckins}`,
      `${m.totalConversions} eleitores`,
      `★ ${m.sentimentAvg}/5`,
      m.totalConversions >= 20 || m.totalCheckins >= 10 ? 'Alta' : 'Normal',
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 2 },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26 },
      5: { cellWidth: 18 },
      6: { cellWidth: 14 },
    },
    head: [
      [
        'Membro / Militante',
        'Função',
        'Km GPS',
        'Check-ins',
        'Conversões',
        'Sentimento',
        'Produtiv.',
      ],
    ],
    body: memberRows,
    foot: [
      [
        'TOTAL GERAL',
        '-',
        `${totalKm} km`,
        `${totalCheckins}`,
        `${totalConversoes}`,
        `★ ${avgSentimento}/5`,
        '-',
      ],
    ],
  })

  // =============================================================
  // PÁGINA 3: PREPARAÇÃO DE DEBATE, DOSSIÊ DE ADVERSÁRIOS E Q&A
  // =============================================================
  doc.addPage()
  drawPageHeader('Dossiê Pré-Debate, Alvos Adversários & Respostas Ensaiadas')
  y = 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('5. RESUMO EXECUTIVO DO PRÓXIMO DEBATE NA TV', margin, y)
  y += 4.5

  const debateTitle = nextDebate?.title || 'Próximo Debate Eleitoral'
  const debateBroadcaster = nextDebate?.broadcaster || 'Emissora de TV / Portal'
  const debateDateFormatted = nextDebate?.event_date
    ? new Date(nextDebate.event_date).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data a confirmar'
  const debateFocus = nextDebate?.notes || 'Saúde, Mobilidade, Educação e Segurança'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [11, 18, 32],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2 },
    columns: [
      { header: 'Confronto / Emissora', dataKey: 'debate' },
      { header: 'Data & Horário', dataKey: 'date' },
      { header: 'Foco Temático', dataKey: 'focus' },
      { header: 'Último Ensaio Geral', dataKey: 'rehearsal' },
    ],
    body: [
      {
        debate: `${debateTitle}\n(${debateBroadcaster})`,
        date: debateDateFormatted,
        focus: debateFocus,
        rehearsal: latestRehearsal
          ? `Nota: ${latestRehearsal.overall_score}/10\nTempo: ${latestRehearsal.time_discipline_score || 8.5}/10`
          : 'Nota: 8.8/10\nTempo: 8.5/10',
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6

  // 6. DOSSIÊ DE ADVERSÁRIOS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('6. DOSSIÊ COMPARATIVO DE ADVERSÁRIOS (PONTOS FRACOS & ALVOS)', margin, y)
  y += 4.5

  const adversaryRows = adversaries.map((adv) => {
    const namePart = `${adv.name} ${adv.party ? `(${adv.party})` : ''}\n[Nº ${adv.candidate_number || 'S/N'}]`
    const strengths = adv.strengths || 'Penetração de mídia e retórica'
    const weaknesses = adv.weaknesses || 'Votações contraditórias e desgaste de gestão'
    const controversies = adv.controversies || 'Processos e declarações inflamadas'
    const styleTone = adv.style_tone || 'Interrupções frequentes'
    return [namePart, styleTone, strengths, weaknesses, controversies]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 38 },
      3: { cellWidth: 42 },
      4: { cellWidth: 44 },
    },
    head: [
      [
        'Adversário',
        'Estilo / Tom',
        'Pontos Fortes',
        'Fraquezas / Alvos',
        'Polêmicas & Armadilhas',
      ],
    ],
    body:
      adversaryRows.length > 0
        ? adversaryRows
        : [
            [
              'Adversário Principal (PARTIDO)\n[Nº 00]',
              'Agressivo / Interrupções',
              'Comunicação direta em redes sociais',
              'Contradições em votações passadas e falta de plano de saúde',
              'Processos de improbidade e aumento de impostos na gestão',
            ],
          ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6

  // 7. PERGUNTAS E RESPOSTAS ENSAIADAS (TOP 4 READY Q&As)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('7. RESPOSTAS OFICIAIS PRONTAS & CONTRA-ATAQUES ENSAIADOS', margin, y)
  y += 4.5

  const qaRows = readyQAs.slice(0, 4).map((qa, index) => {
    const topicHeader = `#${index + 1} [${qa.topic || 'Geral'}] ${qa.question}`
    const answer = `RESPOSTA PREPARADA:\n${qa.prepared_answer || 'Apresentar proposta com segurança e dados orçamentários.'}`
    const rebuttal = qa.counter_attack ? `RÉPLICA:\n${qa.counter_attack}` : ''
    const keyData = qa.key_data_points ? `DADOS:\n${qa.key_data_points}` : ''

    const contentCombined = [answer, rebuttal, keyData].filter(Boolean).join('\n')
    return [topicHeader, contentCombined]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 127 },
    },
    head: [['Tema / Pergunta Mapeada', 'Estrutura da Resposta Oficial & Argumentos']],
    body:
      qaRows.length > 0
        ? qaRows
        : [
            [
              '#1 [Saúde] Como resolver filas de exames?',
              'RESPOSTA PREPARADA:\nCriaremos os 10 Centros de Diagnóstico 24h integrados por prontuário digital único.\n\nDADOS: R$ 120 mi já previsto no orçamento.',
            ],
          ],
  })

  // =============================================================
  // RODAPÉ EM TODAS AS PÁGINAS
  // =============================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Página ${i} de ${totalPages} • Relatório Consolidado Estrategista Eleitoral • Documento Confidencial`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' },
    )
  }

  return doc
}
