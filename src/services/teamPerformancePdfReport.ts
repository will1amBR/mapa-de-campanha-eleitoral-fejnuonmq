import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Campaign, UserRecord } from '@/types/campaign'

export interface MemberPerformanceMetric {
  member: UserRecord
  totalCheckins: number
  totalConversions: number
  sentimentAvg: number
  totalKm: number
}

export interface TeamPerformancePdfData {
  campaign: Campaign
  dateFilterLabel: string
  metrics: MemberPerformanceMetric[]
}

export const generateTeamPerformancePdfReport = (data: TeamPerformancePdfData) => {
  const { campaign, dateFilterLabel, metrics } = data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 16

  // -------------------------------------------------------------
  // Header / Banner Topo (#0b1220 com acento âmbar #f59e0b)
  // -------------------------------------------------------------
  doc.setFillColor(11, 18, 32) // #0b1220
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setFillColor(245, 158, 11) // #f59e0b (amber-500)
  doc.rect(0, 28, pageWidth, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text('ESTRATEGISTA ELEITORAL • AUDITORIA & DESEMPENHO DA EQUIPE', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(217, 119, 6) // amber-400
  const campaignName = campaign.name || campaign.candidate_name || 'Campanha Eleitoral'
  const officeInfo = `${campaign.candidate_name || 'Candidato(a)'} • ${campaign.party || 'Eleições'}`
  doc.text(`${campaignName.toUpperCase()} — ${officeInfo}`, margin, 18)

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(7.5)
  const genDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Período Auditado: ${dateFilterLabel} • Gerado em ${genDate}`, margin, 24)

  y = 36

  // -------------------------------------------------------------
  // Cálculos de Totais e Destaques
  // -------------------------------------------------------------
  const totalMilitantes = metrics.length
  const totalKm = Number(metrics.reduce((acc, m) => acc + m.totalKm, 0).toFixed(1))
  const totalCheckins = metrics.reduce((acc, m) => acc + m.totalCheckins, 0)
  const totalConversoes = metrics.reduce((acc, m) => acc + m.totalConversions, 0)
  const avgSentimento =
    metrics.length > 0
      ? Number((metrics.reduce((acc, m) => acc + m.sentimentAvg, 0) / metrics.length).toFixed(1))
      : 5.0

  // Destaques
  const bestConverter = [...metrics].sort((a, b) => b.totalConversions - a.totalConversions)[0]
  const mostCheckins = [...metrics].sort((a, b) => b.totalCheckins - a.totalCheckins)[0]
  const mostKm = [...metrics].sort((a, b) => b.totalKm - a.totalKm)[0]

  // -------------------------------------------------------------
  // Bloco 1: Resumo Executivo / Destaques
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('1. RESUMO EXECUTIVO & DESTAQUES DA EQUIPE', margin, y)
  y += 5

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
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Militantes Ativos', dataKey: 'team' },
      { header: 'Distância Total (GPS)', dataKey: 'km' },
      { header: 'Check-ins em Campo', dataKey: 'checkins' },
      { header: 'Eleitores Contatados', dataKey: 'voters' },
      { header: 'Sentimento Médio', dataKey: 'sentiment' },
    ],
    body: [
      {
        team: `${totalMilitantes} membros`,
        km: `${totalKm.toLocaleString('pt-BR')} km`,
        checkins: `${totalCheckins.toLocaleString('pt-BR')} ações`,
        voters: `${totalConversoes.toLocaleString('pt-BR')} eleitores`,
        sentiment: `★ ${avgSentimento} / 5.0`,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 4

  // Card com os 3 Destaques da Campanha
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DESTAQUES DE DESEMPENHO:', margin + 3, y + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(51, 65, 85)

  const textBestConv = bestConverter
    ? `Melhor Conversor: ${bestConverter.member.name || 'Membro'} (${bestConverter.totalConversions} votos / contatos)`
    : 'Melhor Conversor: N/A'
  const textMostCheck = mostCheckins
    ? `Mais Ativo em Campo: ${mostCheckins.member.name || 'Membro'} (${mostCheckins.totalCheckins} check-ins)`
    : 'Mais Ativo: N/A'
  const textMostKm = mostKm
    ? `Maior Cobertura Territorial: ${mostKm.member.name || 'Membro'} (${mostKm.totalKm} km percorridos)`
    : 'Maior Cobertura: N/A'

  doc.text(`• ${textBestConv}`, margin + 3, y + 9)
  doc.text(`• ${textMostCheck}   |   • ${textMostKm}`, margin + 3, y + 13)

  y += 22

  // -------------------------------------------------------------
  // Bloco 2: Tabela Detalhada com Todos os Membros
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('2. TABELA INDIVIDUAL DE PRODUTIVIDADE', margin, y)
  y += 5

  const memberRows = metrics.map((m, index) => {
    const roleLabel =
      m.member.role === 'admin'
        ? 'Coord. Geral'
        : m.member.role === 'coordinator'
          ? 'Coord. Regional'
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

  // Linha de total no rodapé da tabela
  const totalRow = [
    'TOTAL GERAL DA EQUIPE',
    '-',
    `${totalKm} km`,
    `${totalCheckins}`,
    `${totalConversoes}`,
    `★ ${avgSentimento}/5`,
    '-',
  ]

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
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 2 },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20 },
      6: { cellWidth: 14 },
    },
    head: [
      [
        'Membro / Militante',
        'Função',
        'Km Percorridos',
        'Check-ins',
        'Conversões',
        'Sentimento',
        'Produtiv.',
      ],
    ],
    body: memberRows,
    foot: [totalRow],
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
      `Página ${i} de ${totalPages} • Relatório de Desempenho e Produtividade de Campo • Confidencial`,
      pageWidth / 2,
      290,
      { align: 'center' },
    )
  }

  return doc
}
