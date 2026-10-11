import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './useAuthStore'
import { api } from '@/services/api'
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  linkWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  linkWithCredential: vi.fn(),
  linkWithPopup: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn().mockReturnValue({ providerId: 'password' }),
  },
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn().mockReturnValue({ currentUser: null }),
}))

vi.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  app: {},
}))

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('useAuthStore - Firebase Modular Auth Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'loading',
      user: null,
      accessToken: null,
      guestToken: null,
      isBannerDismissed: false,
    })
  })

  it('signs in anonymously on first visit when onAuthStateChanged emits null', async () => {
    let authCallback: any = null
    vi.mocked(onAuthStateChanged).mockImplementationOnce((_auth, callback: any) => {
      authCallback = callback
      return vi.fn()
    })

    vi.mocked(signInAnonymously).mockResolvedValueOnce({
      user: {
        uid: 'anon_guest_uid_1',
        isAnonymous: true,
        getIdToken: vi.fn().mockResolvedValue('anon_token_123'),
      },
    } as any)

    useAuthStore.getState().initialize()

    // Trigger onAuthStateChanged with null (no user yet)
    await authCallback(null)

    const state = useAuthStore.getState()
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
    expect(state.status).toBe('guest')
    expect(state.user?.id).toBe('anon_guest_uid_1')
    expect(state.user?.is_guest).toBe(true)
  })

  it('upgrades anonymous guest using account linking (linkWithCredential) preserving UID', async () => {
    const mockAnonUser = {
      uid: 'guest_uid_preserved',
      isAnonymous: true,
      getIdToken: vi.fn().mockResolvedValue('new_linked_token'),
    }

    const { auth } = await import('@/services/firebase')
    auth.currentUser = mockAnonUser as any

    vi.mocked(linkWithCredential).mockResolvedValueOnce({
      user: {
        uid: 'guest_uid_preserved',
        email: 'upgraded@gramudyam.in',
        isAnonymous: false,
        getIdToken: vi.fn().mockResolvedValue('upgraded_token_jwt'),
      },
    } as any)

    const result = await useAuthStore.getState().signupWithEmail('upgraded@gramudyam.in', 'Password123')

    expect(result.error).toBeNull()
    expect(linkWithCredential).toHaveBeenCalledTimes(1)

    const state = useAuthStore.getState()
    expect(state.status).toBe('user')
    expect(state.user?.id).toBe('guest_uid_preserved')
    expect(state.user?.is_guest).toBe(false)
  })

  it('falls back to signing in and calling claimGuestData if linking fails with credential-already-in-use', async () => {
    const mockAnonUser = {
      uid: 'guest_uid_temp',
      isAnonymous: true,
      getIdToken: vi.fn().mockResolvedValue('saved_guest_token'),
    }

    const { auth } = await import('@/services/firebase')
    auth.currentUser = mockAnonUser as any

    const linkingError: any = new Error('Already in use')
    linkingError.code = 'auth/credential-already-in-use'
    vi.mocked(linkWithCredential).mockRejectedValueOnce(linkingError)

    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: {
        uid: 'existing_account_uid',
        email: 'existing@gramudyam.in',
        isAnonymous: false,
        getIdToken: vi.fn().mockResolvedValue('existing_account_jwt'),
      },
    } as any)

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, claimed_reports_count: 2 },
    } as any)

    const result = await useAuthStore.getState().loginWithEmail('existing@gramudyam.in', 'Password123')

    expect(result.error).toBeNull()
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/me/claim-guest-data', {
      guest_token: 'saved_guest_token',
    })

    const state = useAuthStore.getState()
    expect(state.status).toBe('user')
    expect(state.user?.id).toBe('existing_account_uid')
  })

  it('transitions to anonymous on signOut', async () => {
    useAuthStore.setState({
      status: 'user',
      accessToken: 'sample_token',
      user: { id: 'usr_1', email: 'test@example.com', is_guest: false },
    })

    await useAuthStore.getState().signOut()

    expect(firebaseSignOut).toHaveBeenCalledTimes(1)
    const state = useAuthStore.getState()
    expect(state.status).toBe('anonymous')
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })
})
