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

// --- Idea ---
export const normalizeIdea = (raw: string, lang: string) =>
  api.post<BusinessIdea>('/idea/normalize', { raw, lang }).then((r) => r.data)

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

// --- Schemes ---
export const matchSchemes = (profile: Profile, gap: number, business_type: string, lang: string) =>
  api
    .post<Scheme[]>('/schemes/match', { profile, gap, business_type, lang })
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
