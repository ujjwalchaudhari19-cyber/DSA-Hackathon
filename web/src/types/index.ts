export interface Profile {
  name?: string
  state: string
  district: string
  village?: string
  capital: number
  category: 'general' | 'obc' | 'sc' | 'st'
  gender: 'f' | 'm' | 'o'
  age: number
  experience: 'none' | 'some' | 'experienced'
  collateral?: boolean
  first_time_borrower?: boolean
}

export interface Discovery {
  interests: string[]
  budgetRange: [number, number]
  timeCommitment: 'full' | 'part'
  space: string
  skills: string[]
  locationType: 'village' | 'town'
  electricity: boolean
  water: boolean
}

export interface BusinessIdea {
  business_type: string
  scale: string
  details: string
  products?: string[]
  product_list?: string[]
  target_customer?: string
}

export interface BusinessSuggestion {
  name: string
  investment_range: [number, number]
  monthly_income_range: [number, number]
  difficulty: 'easy' | 'medium' | 'hard'
  reason: string
  sector: string
}

export interface InvestmentItem {
  name?: string
  item?: string
  qty?: number
  quantity?: number
  unit_cost: number
  total: number
  category?: string
  isCustom?: boolean
}

export interface Investment {
  total: number
  fixed?: number
  fixed_cost?: number
  working_capital: number
  contingency?: number
  items: InvestmentItem[]
}

export interface FundingGap {
  capital?: number
  available_capital?: number
  gap: number
  capital_ratio: number
  total_investment?: number
}

export interface Scheme {
  id?: string
  scheme_id?: string
  name?: string
  scheme_name?: string
  type?: string
  agency?: string
  eligible: 'yes' | 'no' | 'maybe' | any
  reasons: string[]
  benefits?: string
  interest_range?: string
  subsidy?: string
  subsidy_pct?: number | null
  collateral?: string
  collateral_required?: boolean
  how_to_apply?: string[]
  source_url?: string
  last_verified?: string
}

export interface Repayment {
  loan?: number
  loan_amount?: number
  rate?: number
  annual_rate_pct?: number
  tenure?: number
  tenure_months?: number
  emi: number
  total_interest: number
  dscr: number
  affordable: boolean
  schedule: any[]
}

export interface AmortRow {
  month: number
  emi?: number
  payment?: number
  interest: number
  principal: number
  balance?: number
  closing_balance?: number
}

export interface MarketAnalysis {
  score: number
  demand: string
  customers: string[]
  competitors: { count: number; density: string }
  opportunities: string[]
  risks: Risk[]
}

export interface Risk {
  name: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface CreditReadiness {
  bucket: 'strong' | 'fair' | 'thin_file' | 'needs_repair'
  actions: any[]
  alternatives: string[]
}

export interface Projection {
  monthly: any[]
  break_even_months?: number | null
  break_even_month?: number | null
  break_even_note?: string
  annual_revenue?: number
  annual_net_profit?: number
}

export interface Verdict {
  label: 'highly_feasible' | 'feasible_with_conditions' | 'risky' | 'not_recommended'
  score: number
  summary: string
}

export interface SWOTAnalysis {
  strengths: Array<string | { text: string; evidence_key: string }>
  weaknesses: Array<string | { text: string; evidence_key: string }>
  opportunities: Array<string | { text: string; evidence_key: string }>
  threats: Array<string | { text: string; evidence_key: string }>
}

export interface ReportNarrative {
  verdict_summary?: string
  market_summary?: string
  investment_summary?: string
  funding_summary?: string
  scheme_explanations?: Record<string, string>
  repayment_summary?: string
  break_even_summary?: string
  risk_summary?: string
  swot?: SWOTAnalysis
  recommendations?: string[]
  next_steps?: string[]
  slide_titles?: Record<string, string>
  disclaimer?: string
}

export interface FeasibilityReport {
  id?: string
  report_id?: string
  verdict?: Verdict
  score?: any
  market?: MarketAnalysis
  local_data?: any
  investment?: Investment
  funding?: FundingGap
  gap?: FundingGap
  schemes?: Scheme[]
  repayment?: Repayment
  projection?: Projection
  credit?: CreditReadiness
  recommendations?: string[]
  next_steps?: string[]
  disclaimer?: string
  narrative?: ReportNarrative
  narrative_source?: 'llm' | 'fallback'
  warnings?: Array<{ code?: string; section?: string; message?: string }>
  data_confidence?: 'high' | 'medium' | 'approximate' | string
  rate_source?: string | null
  fallback_options?: string[]
  saved?: boolean
  created_at?: string | null
  profile?: Profile
  idea?: any
}

export interface DocumentItem {
  name: string
  why: string
  where_to_get: string
  time: string
  cost: string
  checked: boolean
}

export interface Supplier {
  id: string
  name: string
  category: string
  district: string
  products: string[]
  contact: string
  price_band: string
  moq: string | number
  rating?: number
  distance_km?: number
  is_demo?: boolean
}

export type Lang = 'en' | 'hi' | 'mr'

