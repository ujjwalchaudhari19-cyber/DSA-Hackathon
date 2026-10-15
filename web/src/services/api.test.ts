import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api, setApiToastListener } from './api'

vi.mock('@/services/firebase', () => ({
  auth: {
    currentUser: null,
    signOut: vi.fn(),
  },
  app: {},
}))

describe('api.ts - Firebase Interceptor and Token Handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setApiToastListener(null)
  })

  it('attaches fresh token from auth.currentUser.getIdToken() to request header', async () => {
    const { auth } = await import('@/services/firebase')
    auth.currentUser = {
      getIdToken: vi.fn().mockResolvedValue('firebase_jwt_fresh_123'),
    } as any

    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled
    const config = await requestInterceptor({ headers: {} })

    expect(config.headers.Authorization).toBe('Bearer firebase_jwt_fresh_123')
  })

  it('handles 429 rate limit with Retry-After header and triggers warning toast', async () => {
    const toastSpy = vi.fn()
    setApiToastListener(toastSpy)

    const responseInterceptor = (api.interceptors.response as any).handlers[0].rejected
    const error429 = {
      response: {
        status: 429,
        headers: { 'retry-after': '6' },
      },
    }

    await expect(responseInterceptor(error429)).rejects.toEqual(error429)
    expect(toastSpy).toHaveBeenCalledWith('Please wait 6 seconds before trying again.', 'warning')
  })

  it('force-refreshes token with getIdToken(true) on 401 and retries once', async () => {
    const { auth } = await import('@/services/firebase')
    const getIdTokenMock = vi.fn().mockResolvedValue('force_refreshed_firebase_jwt')
    auth.currentUser = {
      getIdToken: getIdTokenMock,
    } as any

    const responseInterceptor = (api.interceptors.response as any).handlers[0].rejected
    const originalRequest = {
      _retry: false,
      headers: {},
    }

    const error401 = {
      config: originalRequest,
      response: {
        status: 401,
      },
    }

    try {
      await responseInterceptor(error401)
    } catch {}

    expect(getIdTokenMock).toHaveBeenCalledWith(true)
    expect(originalRequest._retry).toBe(true)
  })
})
