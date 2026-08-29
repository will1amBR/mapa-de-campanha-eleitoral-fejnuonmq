import pb from '@/lib/pocketbase/client'
import { notificationsService } from './notifications'
import type {
  Poll,
  PollScenario,
  PollAlert,
  PollAlertType,
  PollAlertSeverity,
  PollAlertStatus,
  PollAdversaryResult,
} from '@/types/campaign'

export interface ParsedCsvPollRow {
  institute: string
  poll_date: string
  scenario: PollScenario
  our_candidate_percentage: number
  candidate_rank: number
  margin_of_error: number
  sample_size: number
  tse_registration?: string
  analysis_notes?: string
  adversaries_results: PollAdversaryResult[]
  isValid: boolean
  errors: string[]
}

export const pollsService = {
  async getPolls(campaignId: string, scenario?: PollScenario): Promise<Poll[]> {
    let filter = `campaign_id = "${campaignId}"`
    if (scenario) {
      filter += ` && scenario = "${scenario}"`
    }
    return pb.collection('polls').getFullList<Poll>({
      filter,
      sort: 'poll_date',
    })
  },

  async getLatestPoll(campaignId: string): Promise<Poll | null> {
    try {
      const records = await pb.collection('polls').getList<Poll>(1, 1, {
        filter: `campaign_id = "${campaignId}"`,
        sort: '-poll_date',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async createPoll(data: Partial<Poll>): Promise<Poll> {
    const created = await pb.collection('polls').create<Poll>(data)
    if (created.campaign_id) {
      // Automatic detection of turnaround / trends upon creating a poll
      try {
        await pollsService.evaluateAlertsForCampaign(created.campaign_id)
      } catch (err) {
        console.warn('Failed evaluating poll alerts after create:', err)
      }
    }
    return created
  },

  async updatePoll(id: string, data: Partial<Poll>): Promise<Poll> {
    const updated = await pb.collection('polls').update<Poll>(id, data)
    if (updated.campaign_id) {
      try {
        await pollsService.evaluateAlertsForCampaign(updated.campaign_id)
      } catch (err) {
        console.warn('Failed evaluating poll alerts after update:', err)
      }
    }
    return updated
  },

  async deletePoll(id: string): Promise<boolean> {
    return pb.collection('polls').delete(id)
  },

  // -------------------------------------------------------------
  // Poll Alerts Management
  // -------------------------------------------------------------
  async getAlerts(campaignId: string, status?: PollAlertStatus): Promise<PollAlert[]> {
    let filter = `campaign_id = "${campaignId}"`
    if (status) {
      filter += ` && status = "${status}"`
    }
    return pb.collection('poll_alerts').getFullList<PollAlert>({
      filter,
      sort: '-detected_at,-created',
      expand: 'poll_id',
    })
  },

  async getActiveAlerts(campaignId: string): Promise<PollAlert[]> {
    return pb.collection('poll_alerts').getFullList<PollAlert>({
      filter: `campaign_id = "${campaignId}" && status = "active"`,
      sort: '-detected_at,-created',
      expand: 'poll_id',
    })
  },

  async resolveAlert(alertId: string): Promise<PollAlert> {
    return pb.collection('poll_alerts').update<PollAlert>(alertId, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
  },

  async dismissAlert(alertId: string): Promise<PollAlert> {
    return pb.collection('poll_alerts').update<PollAlert>(alertId, {
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
    })
  },

  async createAlert(data: Partial<PollAlert>): Promise<PollAlert> {
    return pb.collection('poll_alerts').create<PollAlert>(data)
  },

  /**
   * Evaluates chronological polls in a campaign and creates/updates alerts.
   * Prevents duplicates by checking existing alerts for the same poll_id + alert_type.
   */
  async evaluateAlertsForCampaign(campaignId: string): Promise<PollAlert[]> {
    const allPolls = await pb.collection('polls').getFullList<Poll>({
      filter: `campaign_id = "${campaignId}"`,
      sort: 'poll_date',
    })

    if (allPolls.length === 0) return []

    // Fetch existing alerts to avoid duplicate alerts for the same poll_id & alert_type
    const existingAlerts = await pb.collection('poll_alerts').getFullList<PollAlert>({
      filter: `campaign_id = "${campaignId}"`,
    })

    const hasAlert = (pollId: string, alertType: PollAlertType) => {
      return existingAlerts.some((a) => a.poll_id === pollId && a.alert_type === alertType)
    }

    const createdAlerts: PollAlert[] = []

    // Group polls by scenario for strict comparison
    const scenarios = Array.from(new Set(allPolls.map((p) => p.scenario || 'estimulada_1t')))

    for (const scenario of scenarios) {
      const scenarioPolls = allPolls
        .filter((p) => (p.scenario || 'estimulada_1t') === scenario)
        .sort((a, b) => new Date(a.poll_date).getTime() - new Date(b.poll_date).getTime())

      for (let i = 1; i < scenarioPolls.length; i++) {
        const prev = scenarioPolls[i - 1]
        const curr = scenarioPolls[i]

        const diffPp = Number(
          (curr.our_candidate_percentage - prev.our_candidate_percentage).toFixed(1),
        )
        const prevRank = prev.candidate_rank || 1
        const currRank = curr.candidate_rank || 1

        const prevDateStr = new Date(prev.poll_date).toLocaleDateString('pt-BR')
        const currDateStr = new Date(curr.poll_date).toLocaleDateString('pt-BR')

        // 1. Perdeu a liderança (estava em 1º e caiu para 2º ou inferior)
        if (prevRank === 1 && currRank > 1) {
          if (!hasAlert(curr.id, 'lost_lead')) {
            const alertTitle = 'Alerta Crítico de Virada: Perda de Liderança'
            const alertSummary = `O candidato perdeu a 1ª colocação (caiu para ${currRank}º lugar com ${curr.our_candidate_percentage}%) na pesquisa ${curr.institute} de ${currDateStr}. Na rodada anterior (${prevDateStr}), liderava com ${prev.our_candidate_percentage}%.`
            const alert = await pb.collection('poll_alerts').create<PollAlert>({
              campaign_id: campaignId,
              poll_id: curr.id,
              alert_type: 'lost_lead',
              title: alertTitle,
              summary: alertSummary,
              severity: 'critical',
              status: 'active',
              detected_at: curr.poll_date || new Date().toISOString(),
              diff_pp: diffPp,
              scenario: curr.scenario,
              institute: curr.institute,
              metadata: {
                prevRank,
                currRank,
                prevPercent: prev.our_candidate_percentage,
                currPercent: curr.our_candidate_percentage,
              },
            })
            createdAlerts.push(alert)

            // In-app persistent notification for critical turnaround
            try {
              await notificationsService.createNotification({
                campaign_id: campaignId,
                title: alertTitle,
                body: alertSummary,
                type: 'poll_alert',
                severity: 'critical',
                link: '/polls',
              })
            } catch (notifErr) {
              console.warn('Failed to dispatch notification for lost_lead:', notifErr)
            }
          }
        }

        // 2. Assumiu a liderança (estava em 2º ou inferior e passou para 1º)
        if (prevRank > 1 && currRank === 1) {
          if (!hasAlert(curr.id, 'gain_lead')) {
            const alertTitle = 'Virada Positiva: Assumiu a Liderança!'
            const alertSummary = `O candidato assumiu o 1º lugar com ${curr.our_candidate_percentage}% na pesquisa ${curr.institute} de ${currDateStr} (estava em ${prevRank}º lugar na rodada de ${prevDateStr}).`
            const alert = await pb.collection('poll_alerts').create<PollAlert>({
              campaign_id: campaignId,
              poll_id: curr.id,
              alert_type: 'gain_lead',
              title: alertTitle,
              summary: alertSummary,
              severity: 'positive',
              status: 'active',
              detected_at: curr.poll_date || new Date().toISOString(),
              diff_pp: diffPp,
              scenario: curr.scenario,
              institute: curr.institute,
              metadata: {
                prevRank,
                currRank,
                prevPercent: prev.our_candidate_percentage,
                currPercent: curr.our_candidate_percentage,
              },
            })
            createdAlerts.push(alert)

            // In-app notification for positive lead turnaround
            try {
              await notificationsService.createNotification({
                campaign_id: campaignId,
                title: alertTitle,
                body: alertSummary,
                type: 'poll_alert',
                severity: 'positive',
                link: '/polls',
              })
            } catch (notifErr) {
              console.warn('Failed to dispatch notification for gain_lead:', notifErr)
            }
          }
        }

        // 3. Queda significativa de 3 p.p. ou mais (ou além da margem de erro)
        if (diffPp <= -3.0) {
          if (!hasAlert(curr.id, 'drop_significant')) {
            const isSevere = diffPp <= -5.0 || currRank > prevRank
            const alertSeverity = isSevere ? 'critical' : 'warning'
            const alertTitle = `Alerta de Tendência: Queda de ${Math.abs(diffPp).toString().replace('.', ',')} p.p.`
            const alertSummary = `Recuo acentuado de ${prev.our_candidate_percentage}% para ${curr.our_candidate_percentage}% (${diffPp.toString().replace('.', ',')} p.p.) detectado no levantamento ${curr.institute} (${currDateStr}) em relação a ${prevDateStr}.`
            const alert = await pb.collection('poll_alerts').create<PollAlert>({
              campaign_id: campaignId,
              poll_id: curr.id,
              alert_type: 'drop_significant',
              title: alertTitle,
              summary: alertSummary,
              severity: alertSeverity,
              status: 'active',
              detected_at: curr.poll_date || new Date().toISOString(),
              diff_pp: diffPp,
              scenario: curr.scenario,
              institute: curr.institute,
              metadata: {
                prevPercent: prev.our_candidate_percentage,
                currPercent: curr.our_candidate_percentage,
              },
            })
            createdAlerts.push(alert)

            // In-app notification for warning / critical drop
            try {
              await notificationsService.createNotification({
                campaign_id: campaignId,
                title: alertTitle,
                body: alertSummary,
                type: 'poll_alert',
                severity: alertSeverity,
                link: '/polls',
              })
            } catch (notifErr) {
              console.warn('Failed to dispatch notification for drop_significant:', notifErr)
            }
          }
        }

        // 4. Crescimento significativo de 3 p.p. ou mais
        if (diffPp >= 3.0) {
          if (!hasAlert(curr.id, 'rise_significant')) {
            const alertTitle = `Momento Positivo: Crescimento de +${diffPp.toString().replace('.', ',')} p.p.`
            const alertSummary = `Avanço consistente de ${prev.our_candidate_percentage}% para ${curr.our_candidate_percentage}% (+${diffPp.toString().replace('.', ',')} p.p.) na pesquisa ${curr.institute} de ${currDateStr}.`
            const alert = await pb.collection('poll_alerts').create<PollAlert>({
              campaign_id: campaignId,
              poll_id: curr.id,
              alert_type: 'rise_significant',
              title: alertTitle,
              summary: alertSummary,
              severity: 'positive',
              status: 'active',
              detected_at: curr.poll_date || new Date().toISOString(),
              diff_pp: diffPp,
              scenario: curr.scenario,
              institute: curr.institute,
              metadata: {
                prevPercent: prev.our_candidate_percentage,
                currPercent: curr.our_candidate_percentage,
              },
            })
            createdAlerts.push(alert)

            // In-app notification for significant rise
            try {
              await notificationsService.createNotification({
                campaign_id: campaignId,
                title: alertTitle,
                body: alertSummary,
                type: 'poll_alert',
                severity: 'positive',
                link: '/polls',
              })
            } catch (notifErr) {
              console.warn('Failed to dispatch notification for rise_significant:', notifErr)
            }
          }
        }
      }
    }

    return createdAlerts
  },

  // -------------------------------------------------------------
  // CSV Import & Template Helpers
  // -------------------------------------------------------------
  getTemplateCsv(): string {
    return [
      'instituto,data,cenario,percentual_nosso,posicao,margem_erro,amostra,registro_tse,adversarios,notas',
      'Datafolha,2024-09-15,estimulada_1t,32.5,1,2.0,1500,SP-01234/2024,"Guilherme Boulos (PSOL): 26.0 | Ricardo Nunes (MDB): 24.0 | Pablo Marçal (PRTB): 12.0",Crescimento de 2.5 p.p. na Zona Leste pós sabatina',
      'Quaest,2024-09-22,estimulada_1t,29.0,2,2.5,1200,SP-05678/2024,"Ricardo Nunes (MDB): 31.0 | Guilherme Boulos (PSOL): 25.0",Alerta de queda de 3.5 p.p. após ataques de TV',
      'Ipec,2024-09-28,espontanea_1t,24.0,1,2.0,2000,SP-09876/2024,"Ricardo Nunes (MDB): 22.0 | Guilherme Boulos (PSOL): 20.0",Estabilidade com leve liderança',
    ].join('\n')
  },

  /**
   * Parses CSV string and validates rows with flexible column headers.
   */
  parseCsv(content: string): ParsedCsvPollRow[] {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length <= 1) return []

    // Helper to split CSV row taking into account quotes
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const rawHeaders = parseCsvLine(lines[0]).map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_'),
    )

    // Map common header variations
    const findIdx = (patterns: string[]): number => {
      return rawHeaders.findIndex((h) => patterns.some((p) => h.includes(p)))
    }

    const idxInstitute = findIdx(['instituto', 'institute', 'empresa'])
    const idxDate = findIdx(['data', 'date', 'divulgacao', 'coleta'])
    const idxScenario = findIdx(['cenario', 'scenario', 'tipo'])
    const idxOurPerc = findIdx([
      'percentual_nosso',
      'nosso',
      'candidato_nosso',
      'percentage',
      'votos',
      'percentual',
    ])
    const idxRank = findIdx(['posicao', 'rank', 'lugar', 'colocacao'])
    const idxMargin = findIdx(['margem', 'margin', 'erro'])
    const idxSample = findIdx(['amostra', 'sample', 'entrevistas', 'tamanho'])
    const idxTse = findIdx(['registro', 'tse', 'protocolo'])
    const idxAdversaries = findIdx(['adversarios', 'adversary', 'outros', 'concorrentes'])
    const idxNotes = findIdx(['nota', 'analise', 'observacao', 'notes'])

    const rows: ParsedCsvPollRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = parseCsvLine(line)
      if (cols.length === 0 || cols.every((c) => c === '')) continue

      const errors: string[] = []

      // Institute
      const institute = idxInstitute >= 0 && cols[idxInstitute] ? cols[idxInstitute] : 'Datafolha'
      if (!institute) errors.push('Instituto não informado')

      // Date
      let poll_date = new Date().toISOString().slice(0, 10)
      if (idxDate >= 0 && cols[idxDate]) {
        const rawDate = cols[idxDate]
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/')
          if (parts.length === 3) {
            // dd/mm/yyyy or yyyy/mm/dd
            if (parts[2].length === 4) {
              poll_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
            } else if (parts[0].length === 4) {
              poll_date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
            }
          }
        } else if (rawDate.includes('-')) {
          poll_date = rawDate
        }
      }

      if (isNaN(new Date(poll_date).getTime())) {
        errors.push(`Data inválida: ${cols[idxDate] || 'vazia'}`)
      }

      // Scenario
      let scenario: PollScenario = 'estimulada_1t'
      if (idxScenario >= 0 && cols[idxScenario]) {
        const s = cols[idxScenario].toLowerCase()
        if (s.includes('espontanea')) scenario = 'espontanea_1t'
        else if (s.includes('segundo') || s.includes('2t') || s.includes('2º'))
          scenario = 'segundo_turno'
        else if (s.includes('rejeicao') || s.includes('rejeita')) scenario = 'rejeicao'
        else scenario = 'estimulada_1t'
      }

      // Percentage
      let our_candidate_percentage = 0
      if (idxOurPerc >= 0 && cols[idxOurPerc]) {
        const cleanVal = cols[idxOurPerc].replace('%', '').replace(',', '.')
        our_candidate_percentage = parseFloat(cleanVal) || 0
      }
      if (our_candidate_percentage < 0 || our_candidate_percentage > 100) {
        errors.push(`Percentual fora da faixa (0-100%): ${our_candidate_percentage}%`)
      }

      // Rank
      let candidate_rank = 1
      if (idxRank >= 0 && cols[idxRank]) {
        candidate_rank = parseInt(cols[idxRank].replace(/\D/g, ''), 10) || 1
      }

      // Margin
      let margin_of_error = 2.0
      if (idxMargin >= 0 && cols[idxMargin]) {
        margin_of_error = parseFloat(cols[idxMargin].replace(',', '.')) || 2.0
      }

      // Sample
      let sample_size = 1500
      if (idxSample >= 0 && cols[idxSample]) {
        sample_size = parseInt(cols[idxSample].replace(/\D/g, ''), 10) || 1500
      }

      // TSE
      const tse_registration = idxTse >= 0 ? cols[idxTse] : ''
      const analysis_notes = idxNotes >= 0 ? cols[idxNotes] : ''

      // Adversaries parsing (format: "Nome (Partido): 25.0 | Nome2: 12.0")
      const adversaries_results: PollAdversaryResult[] = []
      if (idxAdversaries >= 0 && cols[idxAdversaries]) {
        const rawAdv = cols[idxAdversaries]
        const items = rawAdv.split('|')
        for (const item of items) {
          const trimmed = item.trim()
          if (!trimmed) continue
          // Parse "Nome (Partido): 25.5" or "Nome: 25.5"
          const match = trimmed.match(/^([^:(]+)(?:\(([^)]+)\))?\s*:\s*([\d,.]+)/)
          if (match) {
            adversaries_results.push({
              adversary_name: match[1].trim(),
              party: match[2]?.trim() || '',
              percentage: parseFloat(match[3].replace(',', '.')) || 0,
            })
          } else {
            // fallback
            const colonIdx = trimmed.lastIndexOf(':')
            if (colonIdx > 0) {
              const namePart = trimmed.slice(0, colonIdx).trim()
              const percPart = trimmed
                .slice(colonIdx + 1)
                .replace('%', '')
                .replace(',', '.')
                .trim()
              adversaries_results.push({
                adversary_name: namePart,
                percentage: parseFloat(percPart) || 0,
              })
            }
          }
        }
      }

      rows.push({
        institute,
        poll_date,
        scenario,
        our_candidate_percentage,
        candidate_rank,
        margin_of_error,
        sample_size,
        tse_registration,
        analysis_notes,
        adversaries_results,
        isValid: errors.length === 0,
        errors,
      })
    }

    return rows
  },

  /**
   * Imports valid parsed rows in batch into the database.
   */
  async importPollsBatch(
    campaignId: string,
    rows: ParsedCsvPollRow[],
  ): Promise<{ imported: number; errors: number }> {
    let imported = 0
    let errorCount = 0

    for (const row of rows) {
      if (!row.isValid) {
        errorCount++
        continue
      }
      try {
        await pb.collection('polls').create<Poll>({
          campaign_id: campaignId,
          institute: row.institute,
          poll_date: new Date(row.poll_date).toISOString(),
          scenario: row.scenario,
          our_candidate_percentage: row.our_candidate_percentage,
          candidate_rank: row.candidate_rank,
          margin_of_error: row.margin_of_error,
          sample_size: row.sample_size,
          tse_registration: row.tse_registration,
          analysis_notes: row.analysis_notes,
          adversaries_results: row.adversaries_results,
        })
        imported++
      } catch (err) {
        console.error('Error importing poll row:', err)
        errorCount++
      }
    }

    // Run alerts evaluation for the campaign after bulk import
    try {
      await pollsService.evaluateAlertsForCampaign(campaignId)
    } catch (err) {
      console.warn('Error running alert evaluation after batch import:', err)
    }

    return { imported, errors: errorCount }
  },
}
