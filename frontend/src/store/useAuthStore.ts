import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '@/services/firebase'
import { api } from '@/services/api'
import type { paths } from '@/types/api'

export type AuthStatus = 'loading' | 'guest' | 'user' | 'anonymous'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
  is_guest?: boolean
}

type ClaimGuestResponse = paths['/me/claim-guest-data']['post']['responses']['200']['content']['application/json']

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  guestToken: string | null
  isBannerDismissed: boolean
  isInitialized: boolean

  // Actions
  initialize: () => () => void
  continueAsGuest: () => Promise<void>
  loginWithGoogle: () => Promise<{ error: Error | null }>
  loginWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signupWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  claimGuestData: (savedGuestToken?: string) => Promise<{ success: boolean; error: Error | null }>
  dismissBanner: () => void
  signOut: () => Promise<void>
  setSession: (user: AuthUser | null, accessToken: string | null, isGuest?: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'loading',
      user: null,
      accessToken: null,
      guestToken: null,
      isBannerDismissed: false,
      isInitialized: false,

      initialize: () => {
        // Listen to Firebase auth state changes via onAuthStateChanged
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken()
            const isAnonymous = firebaseUser.isAnonymous

            if (isAnonymous) {
              set({
                status: 'guest',
                guestToken: token,
                accessToken: token,
                user: {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || `guest_${firebaseUser.uid.slice(0, 6)}@gramudyam.internal`,
                  name: 'Guest Entrepreneur',
                  is_guest: true,
                },
                isInitialized: true,
              })
            } else {
              set({
                status: 'user',
                accessToken: token,
                user: {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Entrepreneur',
                  avatar_url: firebaseUser.photoURL || undefined,
                  is_guest: false,
                },
                isInitialized: true,
              })
            }
          } else {
            // No session active -> on first visit, automatically sign in anonymously
            try {
              set({ status: 'loading' })
              const cred = await signInAnonymously(auth)
              const token = await cred.user.getIdToken()
              set({
                status: 'guest',
                guestToken: token,
                accessToken: token,
                user: {
                  id: cred.user.uid,
                  email: `guest_${cred.user.uid.slice(0, 6)}@gramudyam.internal`,
                  name: 'Guest Entrepreneur',
                  is_guest: true,
                },
                isInitialized: true,
              })
            } catch {
              set({
                status: 'anonymous',
                user: null,
                accessToken: null,
                isInitialized: true,
              })
            }
          }
        })

        return unsubscribe
      },

      continueAsGuest: async () => {
        try {
          set({ status: 'loading' })
          const cred = await signInAnonymously(auth)
          const token = await cred.user.getIdToken()
          set({
            status: 'guest',
            guestToken: token,
            accessToken: token,
            user: {
              id: cred.user.uid,
              email: `guest_${cred.user.uid.slice(0, 6)}@gramudyam.internal`,
              name: 'Guest Entrepreneur',
              is_guest: true,
            },
          })
        } catch {
          const localGuestId = `local_guest_${Date.now()}`
          const localToken = `guest_token_${localGuestId}`
          set({
            status: 'guest',
            guestToken: localToken,
            accessToken: localToken,
            user: {
              id: localGuestId,
              email: `${localGuestId}@gramudyam.internal`,
              name: 'Guest Entrepreneur',
              is_guest: true,
            },
          })
        }
      },

      loginWithGoogle: async () => {
        const currentUser = auth.currentUser
        const provider = new GoogleAuthProvider()

        // If currently in guest mode, attempt account-linking to preserve user ID
        if (currentUser && currentUser.isAnonymous) {
          try {
            const linkedCred = await linkWithPopup(currentUser, provider)
            const token = await linkedCred.user.getIdToken()
            set({
              status: 'user',
              accessToken: token,
              guestToken: null,
              user: {
                id: linkedCred.user.uid,
                email: linkedCred.user.email || '',
                name: linkedCred.user.displayName || 'Entrepreneur',
                avatar_url: linkedCred.user.photoURL || undefined,
                is_guest: false,
              },
            })
            return { error: null }
          } catch (err: any) {
            // If credential already in use by an existing account
            if (err.code === 'auth/credential-already-in-use') {
              try {
                // 1. Save current guest token first
                const savedGuestToken = await currentUser.getIdToken()
                // 2. Sign in to the existing account
                const userCred = await signInWithPopup(auth, provider)
                const token = await userCred.user.getIdToken()

                set({
                  status: 'user',
                  accessToken: token,
                  user: {
                    id: userCred.user.uid,
                    email: userCred.user.email || '',
                    name: userCred.user.displayName || 'Entrepreneur',
                    avatar_url: userCred.user.photoURL || undefined,
                    is_guest: false,
                  },
                })

                // 3. Call POST /me/claim-guest-data with the saved guest token
                if (savedGuestToken) {
                  await get().claimGuestData(savedGuestToken)
                }
                return { error: null }
              } catch (loginErr: any) {
                return { error: loginErr }
              }
            }
            return { error: err }
          }
        }

        // Direct Google Sign In (when not anonymous)
        try {
          const userCred = await signInWithPopup(auth, provider)
          const token = await userCred.user.getIdToken()
          set({
            status: 'user',
            accessToken: token,
            user: {
              id: userCred.user.uid,
              email: userCred.user.email || '',
              name: userCred.user.displayName || 'Entrepreneur',
              avatar_url: userCred.user.photoURL || undefined,
              is_guest: false,
            },
          })
          return { error: null }
        } catch (err: any) {
          return { error: err }
        }
      },

      loginWithEmail: async (email, password) => {
        const currentUser = auth.currentUser

        // If currently in guest mode, attempt linking with EmailAuthProvider credential
        if (currentUser && currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password)
          try {
            const linkedCred = await linkWithCredential(currentUser, credential)
            const token = await linkedCred.user.getIdToken()
            set({
              status: 'user',
              accessToken: token,
              guestToken: null,
              user: {
                id: linkedCred.user.uid,
                email: linkedCred.user.email || email,
                name: email.split('@')[0],
                is_guest: false,
              },
            })
            return { error: null }
          } catch (err: any) {
            // If email already in use, sign into existing account & claim guest data
            if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
              try {
                const savedGuestToken = await currentUser.getIdToken()
                const cred = await signInWithEmailAndPassword(auth, email, password)
                const token = await cred.user.getIdToken()

                set({
                  status: 'user',
                  accessToken: token,
                  user: {
                    id: cred.user.uid,
                    email: cred.user.email || email,
                    name: email.split('@')[0],
                    is_guest: false,
                  },
                })

                if (savedGuestToken) {
                  await get().claimGuestData(savedGuestToken)
                }
                return { error: null }
              } catch (signInErr: any) {
                return { error: signInErr }
              }
            }
            return { error: err }
          }
        }

        // Direct email/password login
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password)
          const token = await cred.user.getIdToken()
          set({
            status: 'user',
            accessToken: token,
            user: {
              id: cred.user.uid,
              email: cred.user.email || email,
              name: email.split('@')[0],
              is_guest: false,
            },
          })
          return { error: null }
        } catch (err: any) {
          return { error: err }
        }
      },

      signupWithEmail: async (email, password) => {
        const currentUser = auth.currentUser

        // If currently in guest mode, upgrade via linkWithCredential to preserve user ID
        if (currentUser && currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password)
          try {
            const linkedCred = await linkWithCredential(currentUser, credential)
            const token = await linkedCred.user.getIdToken()
            set({
              status: 'user',
              accessToken: token,
              guestToken: null,
              user: {
                id: linkedCred.user.uid,
                email: linkedCred.user.email || email,
                name: email.split('@')[0],
                is_guest: false,
              },
            })
            return { error: null }
          } catch (err: any) {
            if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
              try {
                const savedGuestToken = await currentUser.getIdToken()
                const cred = await signInWithEmailAndPassword(auth, email, password)
                const token = await cred.user.getIdToken()

                set({
                  status: 'user',
                  accessToken: token,
                  user: {
                    id: cred.user.uid,
                    email: cred.user.email || email,
                    name: email.split('@')[0],
                    is_guest: false,
                  },
                })

                if (savedGuestToken) {
                  await get().claimGuestData(savedGuestToken)
                }
                return { error: null }
              } catch (loginErr: any) {
                return { error: loginErr }
              }
            }
            return { error: err }
          }
        }

        // Direct user creation
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          const token = await cred.user.getIdToken()
          set({
            status: 'user',
            accessToken: token,
            user: {
              id: cred.user.uid,
              email: cred.user.email || email,
              name: email.split('@')[0],
              is_guest: false,
            },
          })
          return { error: null }
        } catch (err: any) {
          return { error: err }
        }
      },

      claimGuestData: async (savedGuestToken) => {
        const tokenToClaim = savedGuestToken || get().guestToken
        if (!tokenToClaim) return { success: true, error: null }

        try {
          const res = await api.post<ClaimGuestResponse>('/me/claim-guest-data', {
            guest_token: tokenToClaim,
          })
          if (res.data?.success) {
            set({ guestToken: null })
            return { success: true, error: null }
          }
          return { success: false, error: new Error('Claim failed on server') }
        } catch (err: any) {
          // Never lose local data silently: Keep guestToken for retry
          return { success: false, error: err }
        }
      },

      dismissBanner: () => set({ isBannerDismissed: true }),

      signOut: async () => {
        try {
          await firebaseSignOut(auth)
        } catch {
        } finally {
          set({
            status: 'anonymous',
            user: null,
            accessToken: null,
            guestToken: null,
            isBannerDismissed: false,
          })
        }
      },

      setSession: (user, accessToken, isGuest = false) => {
        set({
          status: isGuest ? 'guest' : user ? 'user' : 'anonymous',
          user,
          accessToken,
        })
      },
    }),
    {
      name: 'gramudyam-auth',
      partialize: (state) => ({
        guestToken: state.guestToken,
        isBannerDismissed: state.isBannerDismissed,
      }),
    }
  )
)
