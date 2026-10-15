import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Lang,
  Profile,
  Discovery,
  BusinessIdea,
  FeasibilityReport,
} from '@/types'

interface AppState {
  // Language & Theme (Global/device preferences)
  lang: Lang
  setLang: (lang: Lang) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void

  // User/Plan specific slices
  activeUserId: string | null
  setActiveUserId: (id: string | null) => void

  profile: Profile
  setProfile: (profile: Partial<Profile>) => void

  discovery: Discovery
  setDiscovery: (discovery: Partial<Discovery>) => void

  idea: BusinessIdea | null
  setIdea: (idea: BusinessIdea | null) => void

  report: FeasibilityReport | null
  setReport: (report: FeasibilityReport | null) => void

  compareList: BusinessIdea[]
  addToCompare: (idea: BusinessIdea) => void
  removeFromCompare: (businessType: string) => void
  clearCompare: () => void

  // Identity Switch / Reset
  clearUserData: () => void
  reset: () => void
}

const defaultProfile: Profile = {
  state: '',
  district: '',
  village: '',
  capital: 0,
  category: 'general',
  gender: 'm',
  age: 25,
  experience: 'none',
  collateral: false,
}

const defaultDiscovery: Discovery = {
  interests: [],
  budgetRange: [0, 500000],
  timeCommitment: 'full',
  space: '',
  skills: [],
  locationType: 'village',
  electricity: true,
  water: true,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),

      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light'
          if (typeof document !== 'undefined') {
            if (next === 'dark') {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }
          return { theme: next }
        }),

      activeUserId: null,
      setActiveUserId: (newId) => {
        const currentId = get().activeUserId
        // Phase 3 Requirement: If identity changes, clear user-specific data so User B never sees User A's work
        if (currentId && newId && currentId !== newId) {
          get().clearUserData()
        }
        set({ activeUserId: newId })
      },

      profile: { ...defaultProfile },
      setProfile: (partial) =>
        set((state) => ({ profile: { ...state.profile, ...partial } })),

      discovery: { ...defaultDiscovery },
      setDiscovery: (partial) =>
        set((state) => ({ discovery: { ...state.discovery, ...partial } })),

      idea: null,
      setIdea: (idea) => set({ idea }),

      report: null,
      setReport: (report) => {
        // Also persist offline cache copy if needed
        try {
          if (report && typeof localStorage !== 'undefined') {
            localStorage.setItem('gramudyam-last-report', JSON.stringify(report))
          }
        } catch {}
        set({ report })
      },

      compareList: [],
      addToCompare: (idea) =>
        set((state) => {
          if (state.compareList.length >= 3) return state
          if (state.compareList.some((i) => i.business_type === idea.business_type))
            return state
          return { compareList: [...state.compareList, idea] }
        }),
      removeFromCompare: (businessType) =>
        set((state) => ({
          compareList: state.compareList.filter(
            (i) => i.business_type !== businessType
          ),
        })),
      clearCompare: () => set({ compareList: [] }),

      clearUserData: () => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('gramudyam-last-report')
          }
        } catch {}
        set({
          profile: { ...defaultProfile },
          discovery: { ...defaultDiscovery },
          idea: null,
          report: null,
          compareList: [],
        })
      },

      reset: () => {
        get().clearUserData()
        set({ activeUserId: null })
      },
    }),
    {
      name: 'gramudyam-storage',
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        activeUserId: state.activeUserId,
        profile: state.profile,
        idea: state.idea,
        report: state.report,
        compareList: state.compareList,
      }),
    }
  )
)
