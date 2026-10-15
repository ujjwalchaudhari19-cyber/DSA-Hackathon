import axios from 'axios'
import type {
  BusinessSuggestion,
  FeasibilityReport,
  MarketAnalysis,
  Investment,
  FundingGap,
  Scheme,
  Repayment,
  CreditReadiness,
  DocumentItem,
  Supplier,
  BusinessIdea,
  Profile,
} from '@/types'
import type { paths } from '@/types/api'
import { auth } from './firebase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 60000,
})

// UI notification helper for rate limit / auth redirection
export type ApiToastHandler = (msg: string, type: 'info' | 'warning' | 'error') => void
let toastListener: ApiToastHandler | null = null

export const setApiToastListener = (handler: ApiToastHandler | null) => {
  toastListener = handler
}

// Request interceptor: get fresh token with getIdToken() (Firebase SDK refreshes it automatically)
api.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      const token = await currentUser.getIdToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      // Fallback check from localStorage for initial guest token if auth state is hydrating
      const authStorage = localStorage.getItem('gramudyam-auth')
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        const fallbackToken = parsed.state?.accessToken || parsed.state?.guestToken || null
        if (fallbackToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${fallbackToken}`
        }
      }
    }
  } catch {
    // Continue without token on retrieval error
  }

  return config
})

// Response interceptor: on 401 force-refresh once and retry, otherwise sign out
let isRefreshing = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 429 Too Many Requests -> extract Retry-After and notify
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'] || '5'
      const msg = `Please wait ${retryAfter} seconds before trying again.`
      if (toastListener) {
        toastListener(msg, 'warning')
      }
      return Promise.reject(error)
    }

    // 401 Unauthorized
    if (error.response?.status === 401) {
      if (!originalRequest?._retry) {
        originalRequest._retry = true

        if (!isRefreshing && auth.currentUser) {
          isRefreshing = true
          try {
            // Force-refresh token with getIdToken(true)
            const refreshedToken = await auth.currentUser.getIdToken(true)
            isRefreshing = false

            if (refreshedToken) {
              originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
              return api(originalRequest)
            }
          } catch {
            isRefreshing = false
          }
        }
      }

      // If cannot refresh, sign out and notify
      if (toastListener) {
        toastListener('Your session has expired. Please log in again to continue.', 'info')
      }

      try {
        await auth.signOut()
      } catch {}

      // Clear tokens and redirect to /login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        }, 300)
      }
    }

    return Promise.reject(error)
  }
)

// --- Discovery ---
export interface DiscoverRequest {
  lang: string
  interests: string[]
  budget_range: [number, number]
  time_commitment: string
  space: string
  skills: string[]
  location_type: string
  electricity: boolean
  water: boolean
}

export const discoverSuggest = (payload: DiscoverRequest) =>
  api.post<BusinessSuggestion[]>('/discover/suggest', payload).then((r) => r.data)

export interface CatalogueBusiness {
  id: string
  name: string
  sector: string
  min_investment: number
  max_investment: number
  space_needed: string
  skills: string[]
  time: string
  required_docs_key: string
}

export const getCatalogue = () =>
  api.get<CatalogueBusiness[]>('/catalogue').then((r) => r.data)

export const filterCatalogue = (answers: {
  interests?: string[]
  budget_range?: [number, number]
  space?: string
  skills?: string[]
  time?: string
  location_type?: string
}) => api.post<CatalogueBusiness[]>('/catalogue/filter', answers).then((r) => r.data)


// --- Idea ---

/**
 * Response of `POST /idea/normalize` — mirrors `NormalizedIdea` in
 * api/app/schemas/models.py. It deliberately carries no `details` field:
 * callers keep the original free text themselves.
 */
export interface NormalizedIdea {
  business_type: string
  scale: 'small' | 'medium' | 'large'
  products: string[]
  target_customer: string
  ambiguities: string[]
  clarifying_questions: string[]
  confidence: number
}

/**
 * Turn a free-text description into a structured idea.
 *
 * `IdeaNormalizeRequest` (api/app/schemas/models.py) expects the field
 * `raw_input`; posting `raw` answered 422, which is why nothing called this and
 * `IdeaInputPage` derived the business type from the first word instead.
 */
export const normalizeIdea = (rawInput: string, lang: string) =>
  api
    .post<NormalizedIdea>('/idea/normalize', { raw_input: rawInput, lang })
    .then((r) => r.data)

// --- Analysis ---
export const getLocalAnalysis = (
  location: { state: string; district: string; village?: string },
  business_type: string,
  lang: string
) =>
  api
    .post<MarketAnalysis>('/analysis/local', { ...location, business_type, lang })
    .then((r) => r.data)

// --- Finance ---
export const getInvestment = (idea: BusinessIdea, lang: string) =>
  api.post<Investment>('/finance/investment', { idea, lang }).then((r) => r.data)

export const getFundingGap = (investment: number, capital: number) =>
  api
    .post<FundingGap>('/finance/gap', { total_investment: investment, capital })
    .then((r) => r.data)

export const getEmi = (amount: number, rate: number, tenure: number) =>
  api
    .post<Repayment>('/finance/emi', { amount, rate, tenure })
    .then((r) => r.data)

/**
 * Fetch investment line-items for a business type directly from the backend
 * JSON data store. Replaces all hardcoded BUSINESS_ITEMS in the frontend.
 */
export interface BusinessItemsResponse {
  business_id: string
  business_name: string
  scale: string
  district: string
  items: Array<{
    key: string
    name: string
    qty: number
    unit_cost: number
    total: number
    category: 'fixed' | 'working_capital' | 'contingency'
  }>
  fixed_cost: number
  working_capital: number
  contingency: number
  total_investment: number
  local_price_factor: number
  monthly_net_profit_estimate: number
  warnings: string[]
}

export const getBusinessItems = (
  businessId: string,
  scale = 'small',
  district = 'fallback',
) =>
  api
    .get<BusinessItemsResponse>('/finance/business-items', {
      params: { business_id: businessId, scale, district },
    })
    .then((r) => r.data)

/**
 * Fetch expected monthly net profit for a business type.
 * Replaces MONTHLY_PROFIT_BY_BUSINESS hardcoded table.
 */
export interface MonthlyProfitResponse {
  business_id: string
  business_name: string
  scale: string
  district: string
  monthly_net_profit: number
  annual_net_profit: number
  monthly_breakdown: Array<{ month: number; net_profit: number; revenue: number }>
}

export const getMonthlyProfit = (
  businessId: string,
  scale = 'small',
  district = 'fallback',
) =>
  api
    .get<MonthlyProfitResponse>(`/finance/monthly-profit/${encodeURIComponent(businessId)}`, {
      params: { scale, district },
    })
    .then((r) => r.data)

// --- Schemes ---
export const matchSchemes = (profile: Profile, gap: number, business_type: string, lang: string) =>
  api
    .post<Scheme[]>('/schemes/match', { profile, gap, business_type, lang })
    .then((r) => r.data)

/**
 * Fetch all schemes from the backend data store.
 * Replaces hardcoded scheme objects in localizedContent.ts and FinancePage.
 */
export interface AllSchemesResponse {
  source: string
  last_verified: string
  total: number
  schemes: Array<{
    id: string
    name: string
    sectors: string[]
    min_age: number
    max_age: number
    min_gap: number
    max_gap: number
    requires_woman: boolean
    requires_collateral: boolean
    categories: string[]
    location_types: string[]
    subsidy_pct: number
    benefits: string
    interest_note: string
    collateral_note: string
    how_to_apply: string[]
    documents: string[]
    source_url: string
  }>
}

export const getAllSchemes = (params?: {
  sector?: string
  min_gap?: number
  max_gap?: number
}) =>
  api
    .get<AllSchemesResponse>('/schemes/all', { params })
    .then((r) => r.data)

// --- Credit ---
export interface CreditQuiz {
  existing_loans: boolean
  missed_emi: boolean
  credit_card: boolean
  first_time: boolean
  income_proof: boolean
}

export const getCreditReadiness = (quiz: CreditQuiz, lang: string) =>
  api
    .post<CreditReadiness>('/credit/readiness', { ...quiz, lang })
    .then((r) => r.data)

// --- Report ---
export interface ReportRequest {
  lang: string
  profile: Profile
  idea: BusinessIdea
  loan_preferences?: { tenure_months: number }
}

export const generateReport = (payload: ReportRequest) =>
  api.post<FeasibilityReport>('/report/generate', payload).then((r) => r.data)

export const getReportPdf = (id: string) =>
  api.get(`/report/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data)

/**
 * Download the current report as a PDF.
 *
 * Strategy:
 * - Always use window.print() — it works in all browsers, all languages
 *   (EN/HI/MR), and needs no server-side WeasyPrint installation.
 * - The print CSS in ReportPage forces a white background with proper
 *   font stacks including Devanagari, so Hindi/Marathi print correctly.
 * - The optional backend blob download is left for future use when a
 *   production server with WeasyPrint is deployed.
 */
export const downloadReportAsPdf = (_reportId: string | undefined, _lang: string): Promise<void> => {
  window.print()
  return Promise.resolve()
}

// --- Compare ---
export const compareBusinesses = (ideas: BusinessIdea[], profile: Profile, lang: string) =>
  api.post('/compare', { ideas, profile, lang }).then((r) => r.data)

// --- Documents ---
export const getDocumentChecklist = (idea: BusinessIdea, profile: Profile, lang: string) =>
  api
    .post<{ registration: DocumentItem[]; loan: DocumentItem[] }>(
      '/documents/checklist',
      { idea, profile, lang }
    )
    .then((r) => r.data)

// --- Suppliers ---
export const getSuppliers = (params: {
  category?: string
  district?: string
  price_band?: string
}) => api.get<Supplier[]>('/suppliers', { params }).then((r) => r.data)

export const submitSupplierLead = (
  supplierId: string,
  data: { requester_name: string; phone: string; message: string }
) => api.post<{ lead_id: number | string; status: string }>(`/suppliers/${supplierId}/lead`, data).then((r) => r.data)


// --- Advisor ---
export const advisorChat = (
  message: string,
  context: { profile: Profile; report_summary?: string },
  lang: string
) => api.post('/advisor/chat', { message, context, lang }, { responseType: 'stream' })

// --- New Endpoints (Per-user history, Profile, Account, Chat sessions) ---
export type ReportsListResponse = paths['/reports']['get']['responses']['200']['content']['application/json']
export type SavedReportItem = paths['/reports/{id}']['get']['responses']['200']['content']['application/json']
export type UserProfileData = paths['/me/profile']['get']['responses']['200']['content']['application/json']
export type ChatSessionItem = paths['/chat/sessions']['get']['responses']['200']['content']['application/json'][number]
export type ChatMessageItem = paths['/chat/sessions/{id}/messages']['get']['responses']['200']['content']['application/json'][number]

export const getSavedReports = (page = 1, limit = 10) =>
  api.get<ReportsListResponse>('/reports', { params: { page, limit } }).then((r) => r.data)

export const getSavedReportById = (id: string) =>
  api.get<SavedReportItem>(`/reports/${id}`).then((r) => r.data)

export const deleteSavedReport = (id: string) =>
  api.delete(`/reports/${id}`).then((r) => r.data)

export const getUserProfile = () =>
  api.get<UserProfileData>('/me/profile').then((r) => r.data)

export const updateUserProfile = (profile: UserProfileData) =>
  api.put<UserProfileData>('/me/profile', profile).then((r) => r.data)

export const deleteMyAccount = () =>
  api.delete('/me').then((r) => r.data)

export const getChatSessions = () =>
  api.get<ChatSessionItem[]>('/chat/sessions').then((r) => r.data)

export const getChatSessionMessages = (sessionId: string) =>
  api.get<ChatMessageItem[]>(`/chat/sessions/${sessionId}/messages`).then((r) => r.data)

export const deleteChatSession = (sessionId: string) =>
  api.delete(`/chat/sessions/${sessionId}`).then((r) => r.data)
