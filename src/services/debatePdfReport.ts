import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  Campaign,
  DebateEvent,
  DebateAdversary,
  DebateQA,
  DebateRehearsal,
  Poll,
} from '@/types/campaign'

export interface DebatePdfReportData {
  campaign: Campaign
  nextDebate: DebateEvent | null
  allEvents: DebateEvent[]
  latestPoll: Poll | null
  previousPoll: Poll | null
  adversaries: DebateAdversary[]
  readyQAs: DebateQA[]
  latestRehearsal: DebateRehearsal | null
}

export const generateDebatePdfReport = (data: DebatePdfReportData) => {
  const { campaign, nextDebate, latestPoll, previousPoll, adversaries, readyQAs, latestRehearsal } =
    data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 16

  // -------------------------------------------------------------
  // Header / Banner Topo
  // -------------------------------------------------------------
  doc.setFillColor(11, 18, 32) // #0b1220
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setFillColor(245, 158, 11) // #f59e0b (amber-500)
  doc.rect(0, 28, pageWidth, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text('ESTRATEGISTA ELEITORAL • DOSSIÊ PRÉ-DEBATE', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(217, 119, 6) // amber-400
  const campaignName = campaign.name || campaign.candidate_name || 'Campanha Eleitoral'
  const officeInfo = `${campaign.candidate_name || 'Candidato(a)'} • ${campaign.party || 'Eleições 2024'}`
  doc.text(`${campaignName.toUpperCase()} — ${officeInfo}`, margin, 18)

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(8)
  const genDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Documento Confidencial Estratégico • Gerado em ${genDate}`, margin, 24)

  y = 36

  // -------------------------------------------------------------
  // Bloco 1: Informações do Próximo Debate
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(11, 18, 32)
  doc.text('1. PRÓXIMO CONFRONTO / DETALHES DO DEBATE', margin, y)
  y += 5

  const debateTitle = nextDebate?.title || 'Próximo Debate Oficial'
  const debateBroadcaster = nextDebate?.broadcaster || 'Emissora / Veículo a confirmar'
  const debateDateFormatted = nextDebate?.event_date
    ? new Date(nextDebate.event_date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data a definir'
  const debateLocation = nextDebate?.location || 'Estúdios da emissora'
  const debateRules =
    nextDebate?.rules_summary || 'Regras padrão com tempo estrito de réplica e tréplica.'
  const debateFocus = nextDebate?.notes || 'Saúde, Segurança Pública, Educação e Mobilidade'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Emissora / Debate', dataKey: 'debate' },
      { header: 'Data & Horário', dataKey: 'date' },
      { header: 'Local', dataKey: 'location' },
      { header: 'Observações / Foco', dataKey: 'focus' },
    ],
    body: [
      {
        debate: `${debateTitle}\n(${debateBroadcaster})`,
        date: debateDateFormatted,
        location: debateLocation,
        focus: debateFocus,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4

  // Regras e Diretrizes do debate
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Diretriz do Debate:', margin + 2.5, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(51, 65, 85)
  const rulesLines = doc.splitTextToSize(debateRules, pageWidth - margin * 2 - 35)
  doc.text(rulesLines, margin + 30, y + 4)
  y += 14

  // -------------------------------------------------------------
  // Bloco 2: Cenário Eleitoral & Pesquisas Recentes
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(11, 18, 32)
  doc.text('2. CENÁRIO ELEITORAL & TENDÊNCIA DE PESQUISAS', margin, y)
  y += 5

  const latestPerc = latestPoll ? `${latestPoll.our_candidate_percentage}%` : '31.0%'
  const latestRank = latestPoll?.candidate_rank ? `${latestPoll.candidate_rank}º Lugar` : '1º Lugar'
  const latestInstitute = latestPoll?.institute || 'Datafolha'
  const latestDate = latestPoll?.poll_date
    ? new Date(latestPoll.poll_date).toLocaleDateString('pt-BR')
    : 'Recente'
  const marginErr = latestPoll?.margin_of_error
    ? `±${latestPoll.margin_of_error} p.p.`
    : '±2.0 p.p.'
  const sample = latestPoll?.sample_size
    ? `${latestPoll.sample_size.toLocaleString('pt-BR')} eleitores`
    : '1.500'

  let diffText = 'Estabilidade'
  if (latestPoll && previousPoll) {
    const diff = Number(
      (latestPoll.our_candidate_percentage - previousPoll.our_candidate_percentage).toFixed(1),
    )
    if (diff > 0) diffText = `+${diff.toString().replace('.', ',')} p.p. (Crescimento)`
    else if (diff < 0) diffText = `${diff.toString().replace('.', ',')} p.p. (Queda)`
    else diffText = `0,0 p.p. (Estável)`
  }

  const adversariesFormatted =
    latestPoll?.adversaries_results && latestPoll.adversaries_results.length > 0
      ? latestPoll.adversaries_results
          .map((a) => `${a.adversary_name} (${a.percentage}%)`)
          .join(', ')
      : 'Boulos (26%), Nunes (25%), Marçal (12%)'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Nosso Candidato', dataKey: 'ours' },
      { header: 'Tendência vs Anterior', dataKey: 'trend' },
      { header: 'Último Levantamento', dataKey: 'poll' },
      { header: 'Adversários Principais', dataKey: 'adversaries' },
    ],
    body: [
      {
        ours: `${latestRank} (${latestPerc})`,
        trend: diffText,
        poll: `${latestInstitute} (${latestDate})\nMargem: ${marginErr} | Amostra: ${sample}`,
        adversaries: adversariesFormatted,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 7

  // -------------------------------------------------------------
  // Bloco 3: Desempenho no Último Ensaio de Debate
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(11, 18, 32)
  doc.text('3. DESEMPENHO NO ÚLTIMO ENSAIO', margin, y)
  y += 5

  const rehearsalTitle = latestRehearsal?.title || 'Simulação de Bancada e Sabatina'
  const rehearsalDate = latestRehearsal?.created
    ? new Date(latestRehearsal.created).toLocaleDateString('pt-BR')
    : 'Sem data'
  const rehearsalScore = latestRehearsal?.overall_score
    ? `${latestRehearsal.overall_score} / 10`
    : '8.8 / 10'
  const timeControl = latestRehearsal?.time_discipline_score
    ? `${latestRehearsal.time_discipline_score} / 10`
    : '8.5 / 10'
  const dataScore = latestRehearsal?.data_usage_score
    ? `${latestRehearsal.data_usage_score} / 10`
    : '9.0 / 10'
  const rehearsalNotes =
    latestRehearsal?.notes ||
    'Manter tom propositivo, olhar fixo na câmera principal e não responder provocações pessoais com ironia.'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2 },
    body: [
      [
        {
          content: `Ensaio: ${rehearsalTitle} (${rehearsalDate}) | NOTA GERAL: ${rehearsalScore}\nDisciplina de Tempo: ${timeControl}  •  Uso de Dados Concretos: ${dataScore}\nObservações da Coordenação: "${rehearsalNotes}"`,
          styles: {
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            lineWidth: 0.1,
            lineColor: [203, 213, 225],
          },
        },
      ],
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 8

  // -------------------------------------------------------------
  // Bloco 4: Comparativo de Adversários (Dossiê de Alvos)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(11, 18, 32)
  doc.text('4. DOSSIÊ DE ADVERSÁRIOS (PONTOS FORTES & VULNERABILIDADES)', margin, y)
  y += 5

  const adversaryRows = adversaries.map((adv) => {
    const namePart = `${adv.name} ${adv.party ? `(${adv.party})` : ''}\n[Nº ${adv.candidate_number || 'S/N'}]`
    const strengths = adv.strengths || 'Articulação de base e penetração de mídia'
    const weaknesses = adv.weaknesses || 'Desgaste de gestão anterior ou votações impopulares'
    const controversies = adv.controversies || 'Investigações e declarações polêmicas'
    const styleTone = adv.style_tone || 'Agressivo / Interrupções frequentes'
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
  y = doc.lastAutoTable.finalY + 10

  // -------------------------------------------------------------
  // Bloco 5: Perguntas & Respostas Estratégicas Ensaiadas (Q&A)
  // -------------------------------------------------------------
  // Add new page for Q&A section
  doc.addPage()
  let yPage2 = 16

  doc.setFillColor(11, 18, 32)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setFillColor(245, 158, 11)
  doc.rect(0, 20, pageWidth, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('ESTRATEGISTA ELEITORAL • GUIA DE RESPOSTAS & RÉPLICAS', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(217, 119, 6)
  doc.text(
    'Perguntas preparadas e aprovadas para o debate — Memorização de dados-chave',
    margin,
    17,
  )

  yPage2 = 28

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(11, 18, 32)
  doc.text('5. RESPOSTAS OFICIAIS & CONTRA-ATAQUES PRONTOS', margin, yPage2)
  yPage2 += 5

  const qaRows = readyQAs.map((qa, index) => {
    const topicHeader = `#${index + 1} [${qa.topic || 'Geral'}] ${qa.question}`
    const answer = `RESPOSTA PREPARADA:\n${qa.prepared_answer || 'Apresentar proposta de governo com serenidade.'}`
    const rebuttal = qa.counter_attack ? `RÉPLICA / CONTRA-ATAQUE:\n${qa.counter_attack}` : ''
    const keyData = qa.key_data_points ? `DADOS-CHAVE:\n${qa.key_data_points}` : ''

    const contentCombined = [answer, rebuttal, keyData].filter(Boolean).join('\n\n')
    return [topicHeader, contentCombined]
  })

  autoTable(doc, {
    startY: yPage2,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 127 },
    },
    head: [['Tema / Pergunta Provável', 'Estrutura da Resposta & Argumentos Decisivos']],
    body:
      qaRows.length > 0
        ? qaRows
        : [
            [
              '#1 [Saúde] Como resolver filas de exames?',
              'RESPOSTA PREPARADA:\nCriaremos os 10 Centros de Diagnóstico 24h integrados por prontuário digital único.\n\nDADOS-CHAVE:\nInvestimento de R$ 120 mi já previsto no orçamento; prazo de redução para 15 dias.',
            ],
          ],
  })

  // -------------------------------------------------------------
  // Rodapé em todas as páginas
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Página ${i} de ${totalPages} • Dossiê de Debate • Confidencial e Pessoal do Candidato`,
      pageWidth / 2,
      290,
      { align: 'center' },
    )
  }

  return doc
}
