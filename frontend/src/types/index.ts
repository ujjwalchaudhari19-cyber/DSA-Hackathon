export interface Profile {
  state: string
  district: string
  village?: string
  capital: number
  category: 'general' | 'obc' | 'sc' | 'st'
  gender: 'f' | 'm' | 'o'
  age: number
  experience: 'none' | 'some' | 'experienced'
  collateral?: boolean
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
  name: string
  qty: number
  unit_cost: number
  total: number
}

export interface Investment {
  total: number
  fixed: number
  working_capital: number
  items: InvestmentItem[]
}

export interface FundingGap {
  capital: number
  gap: number
  capital_ratio: number
}

export interface Scheme {
  id: string
  name: string
  type: string
  agency: string
  eligible: 'yes' | 'no' | 'maybe'
  reasons: string[]
  benefits: string
  interest_range: string
  subsidy?: string
  collateral?: string
  how_to_apply: string[]
  source_url: string
  last_verified: string
}

export interface Repayment {
  loan: number
  rate: number
  tenure: number
  emi: number
  total_interest: number
  dscr: number
  affordable: boolean
  schedule: AmortRow[]
}

export interface AmortRow {
  month: number
  emi: number
  interest: number
  principal: number
  balance: number
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
  actions: string[]
  alternatives: string[]
}

export interface Projection {
  monthly: number[]
  break_even_months: number
}

export interface Verdict {
  label: 'highly_feasible' | 'feasible_with_conditions' | 'risky' | 'not_recommended'
  score: number
  summary: string
}

export interface FeasibilityReport {
  id: string
  verdict: Verdict
  market: MarketAnalysis
  investment: Investment
  funding: FundingGap
  schemes: Scheme[]
  repayment: Repayment
  projection: Projection
  credit: CreditReadiness
  recommendations: string[]
  next_steps: string[]
  disclaimer: string
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
  moq: string
  rating?: number
}

export type Lang = 'en' | 'hi' | 'mr'

