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
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
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
