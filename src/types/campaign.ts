export type UserRole = 'admin' | 'coordinator' | 'field_team'

export interface UserRecord {
  id: string
  email: string
  name: string
  role?: UserRole
  current_campaign?: string
  avatar?: string
  created: string
  updated: string
  verified: boolean
}

export interface Campaign {
  id: string
  name: string
  candidate_name: string
  party: string
  ibge_city_code: string
  target_votes: number
  color?: string
  created: string
  updated: string
}

export type ActivityType = 'door-to-door' | 'event' | 'flyering' | 'support-point'

export interface Activity {
  id: string
  campaign_id: string
  user_id: string
  type: ActivityType
  lat: number
  lng: number
  notes: string
  sentiment: number // 1 to 5
  voters_contacted?: number
  location_name?: string
  photo?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
    campaign_id?: Campaign
  }
}

export type AlertStatus = 'active' | 'resolved' | 'dismissed'
export type AlertSeverity = 'warning' | 'critical'

export interface TerritoryAlert {
  id: string
  campaign_id: string
  zone_territory: string
  district_name?: string
  days_inactive: number
  status: AlertStatus
  severity?: AlertSeverity
  priority_score?: number
  voters_count?: number
  notes?: string
  resolved_at?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

export interface TeamLocation {
  id: string
  user_id: string
  campaign_id?: string
  lat: number
  lng: number
  battery: number
  speed?: number
  accuracy?: number
  is_active?: boolean
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export type SupportPointType = 'office' | 'committee' | 'partner'

export interface SupportPoint {
  id: string
  campaign_id: string
  name: string
  type: SupportPointType
  lat: number
  lng: number
  contact?: string
  phone?: string
  address?: string
  created: string
  updated: string
}

export interface DemographicsData {
  avg_income_sm?: number
  pop_total?: number
  age_distribution?: Record<string, string>
  education_higher_perc?: number
  key_demands?: string[]
}

export interface HistoricalVotesData {
  election_2022_first_turn?: Record<string, string>
  election_2020_municipal?: {
    turnout_perc?: number
    winner_perc?: number
  }
  swing_voters_estimate_perc?: number
}

export interface TerritoryData {
  id: string
  ibge_code: string
  zone: string
  district_name: string
  voters_count: number
  priority_score: number
  demographics_json?: DemographicsData
  historical_votes_json?: HistoricalVotesData
  created: string
  updated: string
}

// 1. Candidate Type (TSE)
export interface Candidate {
  id: string
  campaign_id?: string
  tse_id: string
  election_year: string
  uf: string
  city_code: string
  city_name: string
  candidate_number: string
  candidate_name: string
  social_name?: string
  cpf: string
  position: string
  party: string
  coalition?: string
  status: string
  occupation?: string
  gender?: string
  education?: string
  marital_status?: string
  age_range?: string
  is_reelection: boolean
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

// 2. Scheduled Post Type
export type PostPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'whatsapp'

export type PostMediaType = 'image' | 'video' | 'carousel' | 'text' | 'link' | 'stories' | 'reels'

export type PostObjective = 'engagement' | 'conversion' | 'awareness' | 'mobilization' | 'event'

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'cancelled'

export interface ScheduledPost {
  id: string
  campaign_id: string
  title: string
  scheduled_at: string
  platform: PostPlatform
  media_type: PostMediaType
  caption?: string
  media_url?: string
  target_audience?: string
  objective: PostObjective
  status: PostStatus
  published_at?: string
  impressions?: number
  clicks?: number
  shares?: number
  comments?: number
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

// 3. UTM Visit and Attribution
export interface UtmVisit {
  id: string
  campaign_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  landing_page?: string
  visitor_id?: string
  ip_hash?: string
  user_agent?: string
  referrer?: string
  converted: boolean
  conversion_type?: string
  created: string
  updated: string
}

// 4. Ad Campaign
export type AdPlatform = 'meta_ads' | 'google_ads' | 'tiktok_ads'
export type AdStatus = 'active' | 'paused' | 'ended'

export interface AdCampaign {
  id: string
  campaign_id: string
  platform: AdPlatform
  external_id?: string
  name: string
  budget?: number
  spent?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  conversions?: number
  cost_per_conversion?: number
  status: AdStatus
  start_date?: string
  end_date?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

// 5. Weekly Goals
export type WeeklyGoalType = 'checkins' | 'indicacoes' | 'km'
export type WeeklyGoalStatus = 'active' | 'completed' | 'archived'

export interface WeeklyGoal {
  id: string
  campaign_id: string
  title: string
  description?: string
  type: WeeklyGoalType
  target_value: number
  week_start: string
  week_end: string
  created_by?: string
  status?: WeeklyGoalStatus
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
    created_by?: UserRecord
  }
}

// 6. Debate Preparation Types
export type DebateStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled'

export interface DebateEvent {
  id: string
  campaign_id: string
  title: string
  broadcaster?: string
  event_date: string
  location?: string
  status: DebateStatus
  rules_summary?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

export interface DebateAdversary {
  id: string
  campaign_id: string
  name: string
  party?: string
  candidate_number?: string
  target_position?: string
  avatar_seed?: string
  strengths?: string
  weaknesses?: string
  controversies?: string
  style_tone?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

export type DebateTopic =
  | 'economia'
  | 'saude'
  | 'seguranca'
  | 'educacao'
  | 'transporte'
  | 'habitacao'
  | 'meio_ambiente'
  | 'corrupcao'
  | 'zeladoria'
  | 'geral'

export type DebateTargetType = 'to_adversary' | 'from_adversary' | 'journalist'

export type DebatePrepStatus = 'draft' | 'under_review' | 'ready' | 'rehearsed'

export interface DebateQA {
  id: string
  campaign_id: string
  debate_id?: string
  adversary_id?: string
  topic: DebateTopic
  target_type: DebateTargetType
  question: string
  prepared_answer?: string
  counter_attack?: string
  key_data_points?: string
  prep_status: DebatePrepStatus
  priority?: number
  time_limit_seconds?: number
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
    debate_id?: DebateEvent
    adversary_id?: DebateAdversary
  }
}

// 7. Polls / Pesquisas Eleitorais
export type PollScenario = 'estimulada_1t' | 'espontanea_1t' | 'segundo_turno' | 'rejeicao'

export interface PollAdversaryResult {
  adversary_name: string
  party?: string
  percentage: number
}

export interface Poll {
  id: string
  campaign_id: string
  institute: string
  poll_date: string
  scenario: PollScenario
  our_candidate_percentage: number
  adversaries_results?: PollAdversaryResult[]
  margin_of_error?: number
  sample_size?: number
  candidate_rank?: number
  tse_registration?: string
  analysis_notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

// 7.1 Poll Alerts (Alerta de Virada / Tendência)
export type PollAlertType =
  | 'lost_lead'
  | 'gain_lead'
  | 'drop_significant'
  | 'rise_significant'
  | 'adversary_surge'
  | 'margin_tie'
  | 'general'

export type PollAlertSeverity = 'critical' | 'warning' | 'positive' | 'info'
export type PollAlertStatus = 'active' | 'resolved' | 'dismissed'

export interface PollAlert {
  id: string
  campaign_id: string
  poll_id?: string
  alert_type: PollAlertType
  title: string
  summary: string
  severity: PollAlertSeverity
  status: PollAlertStatus
  detected_at: string
  diff_pp?: number
  scenario?: string
  institute?: string
  resolved_at?: string
  metadata?: Record<string, any>
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
    poll_id?: Poll
  }
}

// 8. Debate QA Library (Biblioteca de Perguntas por Área)
export type LibraryDifficulty = 'facil' | 'medio' | 'dificil' | 'casca_de_banana'
export type LibraryTopic =
  | 'economia'
  | 'saude'
  | 'seguranca'
  | 'educacao'
  | 'transporte'
  | 'habitacao'
  | 'meio_ambiente'
  | 'corrupcao'
  | 'zeladoria'
  | 'social'
  | 'administracao'
  | 'geral'

export interface DebateQALibraryItem {
  id: string
  topic: LibraryTopic
  title: string
  question: string
  suggested_answer?: string
  suggested_counter_attack?: string
  key_data_points?: string
  difficulty?: LibraryDifficulty
  time_limit_seconds?: number
  created: string
  updated: string
}

// 9. Debate Rehearsals (Modo Ensaio com Registro e Nota)
export type SelfRating = 'otimo' | 'bom' | 'regular' | 'fraco'

export interface RehearsalQuestionDetail {
  qa_id?: string
  question: string
  topic: string
  time_spent_seconds: number
  time_limit_seconds: number
  cited_data: boolean
  self_rating: SelfRating
  feedback?: string
}

export interface DebateRehearsal {
  id: string
  campaign_id: string
  title: string
  overall_score: number
  questions_count: number
  total_duration_seconds: number
  time_discipline_score?: number
  data_usage_score?: number
  rehearsal_details?: RehearsalQuestionDetail[]
  notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

// 10. In-App Notifications
export type NotificationType = 'poll_alert' | 'info' | 'achievement' | 'debate' | 'territory'
export type NotificationSeverity = 'critical' | 'warning' | 'positive' | 'info'

export interface AppNotification {
  id: string
  user_id?: string
  campaign_id: string
  title: string
  body: string
  type: NotificationType
  severity: NotificationSeverity
  read: boolean
  link?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
    campaign_id?: Campaign
  }
}

// 11. Field Team Reminders (Push Agendado para Equipe)
export type FieldReminderAudience = 'all_team' | 'coordinators_only' | 'field_only' | 'custom'
export type FieldReminderStatus = 'scheduled' | 'sent' | 'cancelled'

export interface FieldReminder {
  id: string
  campaign_id: string
  title: string
  message: string
  event_date: string
  location_name?: string
  lead_time_minutes?: number
  target_audience: FieldReminderAudience
  target_users?: string[]
  status: FieldReminderStatus
  sent_at?: string
  dispatched_count?: number
  created_by?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
    created_by?: UserRecord
    target_users?: UserRecord[]
  }
}

// 12. TSE / TRE Accounting & Invoices (Prestação de Contas Eleitoral)
export type TseTransactionType = 'receita' | 'despesa'

export type TseCategory =
  | 'doacao_pf'
  | 'recurso_proprio'
  | 'fundo_partidario'
  | 'fundo_especial'
  | 'outras_receitas'
  | 'material_grafico'
  | 'impulsionamento_ads'
  | 'transporte_combustivel'
  | 'alimentacao'
  | 'servicos_advocaticios'
  | 'servicos_contabeis'
  | 'producao_audiovisual'
  | 'locacao_imovel'
  | 'comicio_eventos'
  | 'diversas_despesas'

export type TseDocumentType =
  | 'nota_fiscal'
  | 'recibo_eleitoral'
  | 'contrato'
  | 'boleto'
  | 'comprovante_pix'
  | 'outro'

export type TseProofStatus = 'comprovado' | 'pendente_doc' | 'em_analise' | 'divergente'

export interface TseTransaction {
  id: string
  campaign_id: string
  type: TseTransactionType
  category: TseCategory
  description: string
  amount: number
  transaction_date: string
  document_number?: string
  document_type?: TseDocumentType
  party_name: string
  party_document?: string
  proof_status: TseProofStatus
  receipt_file?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}

export type TseDeliveryType =
  | 'parcial'
  | 'relatorio_72h'
  | 'prestacao_final'
  | 'abertura_conta'
  | 'extrato_bancario'
  | 'outro'

export type TseDeliveryStatus = 'pendente' | 'em_andamento' | 'concluido' | 'em_atraso'

export interface TseDelivery {
  id: string
  campaign_id: string
  title: string
  description?: string
  legal_deadline: string
  delivery_type: TseDeliveryType
  status: TseDeliveryStatus
  delivered_at?: string
  protocol_number?: string
  mandatory?: boolean
  notes?: string
  created: string
  updated: string
  expand?: {
    campaign_id?: Campaign
  }
}
