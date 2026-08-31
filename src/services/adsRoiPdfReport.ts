import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Campaign, UserRecord, AdCampaign, Activity } from '@/types/campaign'

export interface PlatformRoiItem {
  platformName: string
  campaignsCount: number
  spent: number
  budget: number
  impressions: number
  clicks: number
  conversions: number
  costPerConversion: number
  estimatedVoters: number
  costPerVoter: number
}

export interface AdsRoiReportData {
  campaign: Campaign
  generatedBy?: UserRecord | null
  periodLabel: string
  totalBudget: number
  totalSpent: number
  totalImpressions: number
  totalClicks: number
  totalAdConversions: number
  totalFieldConversions: number
  totalCombinedVotes: number
  overallCpc: number
  overallCostPerConversion: number
  overallCostPerVote: number
  estimatedRoiMultiplier: number
  platformBreakdown: PlatformRoiItem[]
  adCampaigns: AdCampaign[]
  recentFieldActivitiesCount: number
}

export const generateAdsRoiPdfReport = (data: AdsRoiReportData): jsPDF => {
  const {
    campaign,
    generatedBy,
    periodLabel,
    totalBudget,
    totalSpent,
    totalImpressions,
    totalClicks,
    totalAdConversions,
    totalFieldConversions,
    totalCombinedVotes,
    overallCpc,
    overallCostPerConversion,
    overallCostPerVote,
    estimatedRoiMultiplier,
    platformBreakdown,
    adCampaigns,
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

  const drawPageHeader = (subtitle: string) => {
    // Dark header #0b1220
    doc.setFillColor(11, 18, 32)
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Amber accent bar #f59e0b
    doc.setFillColor(245, 158, 11)
    doc.rect(0, 28, pageWidth, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.text('ESTRATEGISTA ELEITORAL • RELATÓRIO DE ROI DE ADS & CUSTO POR VOTO', margin, 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(245, 158, 11)
    const campaignName = campaign.name || campaign.candidate_name || 'Campanha Eleitoral'
    const officeInfo = `${campaign.candidate_name || 'Candidato'} • ${campaign.party || 'Partido'}`
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
    doc.text(`${subtitle} • Período: ${periodLabel} • Gerado em ${genDate}${byUser}`, margin, 23)
  }

  // =============================================================
  // PÁGINA 1: SUMÁRIO EXECUTIVO & CRUZAMENTO ROI
  // =============================================================
  drawPageHeader('Análise de Eficiência de Tráfego Pago cruzada com Atividades de Campo')
  y = 36

  // 1. CARDS DE KPIS EXECUTIVOS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('1. INDICADORES CONSOLIDADOS DE INVESTIMENTO & RETORNO', margin, y)
  y += 4.5

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [11, 18, 32],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 2.5 },
    columns: [
      { header: 'Investimento Total (ADS)', dataKey: 'spent' },
      { header: 'Conversões Digitais', dataKey: 'adConv' },
      { header: 'Eleitores de Campo (Check-in)', dataKey: 'fieldConv' },
      { header: 'Custo Médio por Conversão', dataKey: 'cpcConv' },
      { header: 'Custo por Voto/Eleitor', dataKey: 'cpv' },
      { header: 'Eficiência Estimada', dataKey: 'roi' },
    ],
    body: [
      {
        spent: formatCurrency(totalSpent),
        adConv: `${totalAdConversions.toLocaleString('pt-BR')} leads`,
        fieldConv: `${totalFieldConversions.toLocaleString('pt-BR')} contatos`,
        cpcConv: formatCurrency(overallCostPerConversion),
        cpv: formatCurrency(overallCostPerVote),
        roi: `${estimatedRoiMultiplier.toFixed(1)}x votos/R$`,
      },
    ],
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 5

  // Box de Diagnóstico Estratégico
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('DIAGNÓSTICO DO CUSTO POR VOTO (ADS + CAMPO):', margin + 3, y + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(51, 65, 85)
  const isHealthyCpv = overallCostPerVote > 0 && overallCostPerVote <= 15
  const cpvDiagnosis = isHealthyCpv
    ? `Custo por Voto excelente (${formatCurrency(overallCostPerVote)}), dentro da faixa ideal de campanhas competitivas (< R$ 15,00/voto).`
    : overallCostPerVote === 0
      ? 'Aguardando maior volume de check-ins de campo para refinar a métrica de custo por voto.'
      : `Custo por Voto de ${formatCurrency(overallCostPerVote)} indica necessidade de otimizar criativos e segmentação zonal.`
  doc.text(`• ${cpvDiagnosis}`, margin + 3, y + 9)
  doc.text(
    `• O cruzamento integra o tráfego pago (Meta/Google/TikTok) com os contatos diretos de militância e fichas de apoio.`,
    margin + 3,
    y + 13,
  )

  y += 21

  // 2. DESEMPENHO COMPARATIVO POR PLATAFORMA (META VS GOOGLE VS TIKTOK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('2. COMPARATIVO DE ROI & CUSTO POR VOTO POR PLATAFORMA', margin, y)
  y += 4.5

  const platformRows = platformBreakdown.map((p) => {
    return [
      p.platformName,
      `${p.campaignsCount} campanhas`,
      formatCurrency(p.spent),
      p.impressions.toLocaleString('pt-BR'),
      p.clicks.toLocaleString('pt-BR'),
      p.conversions.toLocaleString('pt-BR'),
      formatCurrency(p.costPerConversion),
      `${p.estimatedVoters.toLocaleString('pt-BR')} eleitores`,
      formatCurrency(p.costPerVoter),
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
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20, fontStyle: 'bold' },
    },
    head: [
      [
        'Plataforma',
        'Campanhas',
        'Gasto Total',
        'Impressões',
        'Cliques',
        'Leads',
        'Custo/Lead',
        'Votos Est.',
        'Custo/Voto',
      ],
    ],
    body: platformRows,
    foot: [
      [
        'TOTAL GERAL',
        `${adCampaigns.length} ativas`,
        formatCurrency(totalSpent),
        totalImpressions.toLocaleString('pt-BR'),
        totalClicks.toLocaleString('pt-BR'),
        totalAdConversions.toLocaleString('pt-BR'),
        formatCurrency(overallCostPerConversion),
        `${totalCombinedVotes.toLocaleString('pt-BR')}`,
        formatCurrency(overallCostPerVote),
      ],
    ],
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
  })

  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6

  // 3. DETALHAMENTO DE CAMPANHAS DE ANÚNCIO
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(11, 18, 32)
  doc.text('3. LISTAGEM INDIVIDUAL DE CAMPANHAS DE TRÁFEGO PAGO', margin, y)
  y += 4.5

  const adRows = adCampaigns.map((ad, idx) => {
    const platLabel =
      ad.platform === 'meta_ads'
        ? 'Meta (Insta/FB)'
        : ad.platform === 'google_ads'
          ? 'Google Search/YT'
          : 'TikTok Ads'
    const statusLabel =
      ad.status === 'active' ? 'Ativa' : ad.status === 'paused' ? 'Pausada' : 'Encerrada'
    const ctrStr = `${ad.ctr || 0}%`
    const cpcStr = formatCurrency(ad.cpc || 0)
    const costConvStr = formatCurrency(ad.cost_per_conversion || 0)

    return [
      `#${idx + 1} ${ad.name}`,
      platLabel,
      statusLabel,
      formatCurrency(ad.budget || 0),
      formatCurrency(ad.spent || 0),
      (ad.clicks || 0).toLocaleString('pt-BR'),
      ctrStr,
      cpcStr,
      (ad.conversions || 0).toLocaleString('pt-BR'),
      costConvStr,
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
      fontSize: 7,
    },
    bodyStyles: { fontSize: 6.5, textColor: [15, 23, 42], cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 14 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 14 },
      6: { cellWidth: 12 },
      7: { cellWidth: 14 },
      8: { cellWidth: 14 },
      9: { cellWidth: 18 },
    },
    head: [
      [
        'Nome da Campanha',
        'Canal',
        'Status',
        'Orçamento',
        'Gasto',
        'Cliques',
        'CTR',
        'CPC',
        'Conv.',
        'Custo/Conv',
      ],
    ],
    body:
      adRows.length > 0
        ? adRows
        : [
            [
              'Campanha Geral de Reconhecimento',
              'Meta Ads',
              'Ativa',
              'R$ 5.000,00',
              'R$ 2.450,00',
              '4.500',
              '3.2%',
              'R$ 0,54',
              '450',
              'R$ 5,44',
            ],
          ],
  })

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Página ${i} de ${totalPages} • Relatório de ROI de Anúncios e Custo por Voto • Estrategista Eleitoral`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' },
    )
  }

  return doc
}
