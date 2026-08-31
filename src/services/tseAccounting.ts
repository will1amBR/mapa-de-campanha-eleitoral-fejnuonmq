import pb from '@/lib/pocketbase/client'
import type {
  TseTransaction,
  TseDelivery,
  TseTransactionType,
  TseCategory,
  TseProofStatus,
  TseDeliveryStatus,
} from '@/types/campaign'

export const TSE_CATEGORY_LABELS: Record<TseCategory, string> = {
  doacao_pf: 'Doação de Pessoa Física',
  recurso_proprio: 'Recurso Próprio do Candidato',
  fundo_partidario: 'Fundo Partidário',
  fundo_especial: 'Fundo Especial (FEFC)',
  outras_receitas: 'Outras Receitas / Eventos',
  material_grafico: 'Material Gráfico / Adesivos',
  impulsionamento_ads: 'Impulsionamento ADS (Meta/Google)',
  transporte_combustivel: 'Transporte e Combustível',
  alimentacao: 'Alimentação e Equipes',
  servicos_advocaticios: 'Serviços Advocatícios',
  servicos_contabeis: 'Serviços Contábeis / SPCE',
  producao_audiovisual: 'Produção de Áudio e Vídeo',
  locacao_imovel: 'Locação de Imóveis / Comitê',
  comicio_eventos: 'Comícios e Montagem de Eventos',
  diversas_despesas: 'Diversas Despesas de Pequeno Porte',
}

export const TSE_PROOF_STATUS_MAP: Record<
  TseProofStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  comprovado: {
    label: 'Comprovado / Regular',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  pendente_doc: {
    label: 'Pendente Comprovante',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  em_analise: {
    label: 'Em Análise Contábil',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  divergente: {
    label: 'Divergente / Alerta TRE',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
}

export const TSE_DELIVERY_STATUS_MAP: Record<
  TseDeliveryStatus,
  { label: string; color: string; bg: string }
> = {
  concluido: {
    label: 'Entregue / Protocolado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  em_andamento: {
    label: 'Em Preparação',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  pendente: {
    label: 'Pendente',
    color: 'text-slate-400',
    bg: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  em_atraso: {
    label: 'Prazo Vencido',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
}

export const tseAccountingService = {
  // 1. Transactions
  async getTransactions(campaignId: string): Promise<TseTransaction[]> {
    return pb.collection('tse_transactions').getFullList<TseTransaction>({
      filter: `campaign_id = "${campaignId}"`,
      sort: '-transaction_date',
    })
  },

  async createTransaction(data: Partial<TseTransaction> | FormData): Promise<TseTransaction> {
    return pb.collection('tse_transactions').create<TseTransaction>(data)
  },

  async updateTransaction(
    id: string,
    data: Partial<TseTransaction> | FormData,
  ): Promise<TseTransaction> {
    return pb.collection('tse_transactions').update<TseTransaction>(id, data)
  },

  async deleteTransaction(id: string): Promise<boolean> {
    return pb.collection('tse_transactions').delete(id)
  },

  // 2. Deliveries / Obligations Checklist
  async getDeliveries(campaignId: string): Promise<TseDelivery[]> {
    return pb.collection('tse_deliveries').getFullList<TseDelivery>({
      filter: `campaign_id = "${campaignId}"`,
      sort: 'legal_deadline',
    })
  },

  async createDelivery(data: Partial<TseDelivery>): Promise<TseDelivery> {
    return pb.collection('tse_deliveries').create<TseDelivery>(data)
  },

  async updateDelivery(id: string, data: Partial<TseDelivery>): Promise<TseDelivery> {
    return pb.collection('tse_deliveries').update<TseDelivery>(id, data)
  },

  async deleteDelivery(id: string): Promise<boolean> {
    return pb.collection('tse_deliveries').delete(id)
  },
}
