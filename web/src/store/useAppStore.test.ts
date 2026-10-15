import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

describe('useAppStore - Shared Device Partitioning and Privacy', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.getState().reset()
  })

  it('stores report in offline cache and clears on clearUserData', () => {
    const mockReport: any = {
      id: 'rep_test',
      verdict: { label: 'feasible', score: 85, summary: 'Good' },
    }

    useAppStore.getState().setReport(mockReport)
    expect(useAppStore.getState().report).toEqual(mockReport)
    expect(localStorage.getItem('gramudyam-last-report')).toContain('rep_test')

    useAppStore.getState().clearUserData()
    expect(useAppStore.getState().report).toBeNull()
    expect(localStorage.getItem('gramudyam-last-report')).toBeNull()
  })

  it('swaps or clears cached data when identity changes so User B never sees User A work', () => {
    // User A logs in and creates report & profile
    useAppStore.getState().setActiveUserId('user_A_id')
    useAppStore.getState().setProfile({ district: 'Nashik', capital: 50000 })
    useAppStore.getState().setIdea({ business_type: 'dairy', scale: 'small', details: '4 cows' })

    expect(useAppStore.getState().profile.district).toBe('Nashik')
    expect(useAppStore.getState().idea?.business_type).toBe('dairy')

    // User B logs in on same browser/phone
    useAppStore.getState().setActiveUserId('user_B_id')

    // Verify User A data is wiped for User B
    expect(useAppStore.getState().profile.district).toBe('')
    expect(useAppStore.getState().profile.capital).toBe(0)
    expect(useAppStore.getState().idea).toBeNull()
    expect(useAppStore.getState().activeUserId).toBe('user_B_id')
  })

  it('resets all enterprise slices on full reset/logout', () => {
    useAppStore.getState().setProfile({ district: 'Pune' })
    useAppStore.getState().addToCompare({ business_type: 'processing', scale: 'small', details: 'oil' })
    expect(useAppStore.getState().compareList.length).toBe(1)

    useAppStore.getState().reset()

    expect(useAppStore.getState().profile.district).toBe('')
    expect(useAppStore.getState().compareList.length).toBe(0)
    expect(useAppStore.getState().activeUserId).toBeNull()
  })
})

