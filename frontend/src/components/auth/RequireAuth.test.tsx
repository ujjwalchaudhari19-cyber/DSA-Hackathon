import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { useAuthStore } from '@/store/useAuthStore'

describe('RequireAuth Route Guard', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'loading',
      user: null,
      accessToken: null,
    })
  })

  it('renders loading spinner while auth status is loading', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/history']}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('redirects guest users to /login with redirect param', () => {
    useAuthStore.setState({
      status: 'guest',
      user: { id: 'guest_1', email: 'guest@internal', is_guest: true },
      accessToken: 'token_guest',
    })

    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route
            path="/history"
            element={
              <RequireAuth>
                <div>Protected Content</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page Target')).toBeInTheDocument()
  })

  it('allows authenticated user with real account to view protected content', () => {
    useAuthStore.setState({
      status: 'user',
      user: { id: 'usr_real', email: 'entrepreneur@gramudyam.in', is_guest: false },
      accessToken: 'jwt_valid',
    })

    render(
      <MemoryRouter initialEntries={['/history']}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

